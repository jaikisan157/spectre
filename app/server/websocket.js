import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BotService } from './botService.js';
import { AuthService } from './authService.js';
import { PaymentService } from './paymentService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

// Initialize services
const authService = new AuthService();
const paymentService = new PaymentService(process.env.STRIPE_SECRET_KEY, authService);

let botService = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_KEY_HERE') {
  botService = new BotService(process.env.GEMINI_API_KEY, 'gemini');
  console.log('🤖 Bot service enabled (Gemini)');
} else if (process.env.GROQ_API_KEY) {
  botService = new BotService(process.env.GROQ_API_KEY, 'groq');
  console.log('🤖 Bot service enabled (Groq)');
} else {
  console.log('⚠️ Neither GEMINI_API_KEY nor GROQ_API_KEY set — bots disabled');
}

// Create HTTP server (Express will mount on this)
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// ── State Maps ──
const waitingUsers = new Map();   // userId -> { ws, interests, gender, preferredGender, isPremium, timestamp }
const activePairs = new Map();    // userId -> partnerId
const userSockets = new Map();    // userId -> ws
const lastActivity = new Map();   // userId -> timestamp
const browserSockets = new Map(); // browserId -> userId
const userAuthMap = new Map();    // userId -> username (links WS user to auth account)

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes

// ── Interests ──
const AVAILABLE_INTERESTS = [
  'Gaming', 'Music', 'Movies', 'Anime', 'Sports',
  'Tech', 'Memes', 'Art', 'Books', 'Travel',
  'Food', 'Fitness', 'Fashion', 'Science', 'Photography',
  'Crypto', 'Comedy', 'K-Pop', 'Hip-Hop', 'Netflix'
];

const interestCounts = new Map();
const userInterestsMap = new Map(); // userId -> interests[]

function getInterestStats() {
  return AVAILABLE_INTERESTS.map(interest => ({
    name: interest,
    count: interestCounts.get(interest) || 0
  })).sort((a, b) => b.count - a.count);
}

function addUserInterests(interests) {
  for (const interest of interests) {
    interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
  }
}

function removeUserInterests(interests) {
  for (const interest of interests) {
    const count = (interestCounts.get(interest) || 1) - 1;
    if (count <= 0) interestCounts.delete(interest);
    else interestCounts.set(interest, count);
  }
}

function generateUserId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ── Report & Ban System ──
// reportStore: reportedUserId -> [{ reporterId, reason, description, timestamp }]
const reportStore = new Map();

// Rate limiting: reporterId -> [timestamp, ...]
const reportRateLimit = new Map();

function handleReport(reporterUserId, targetUserId, reason, description) {
  // Can't report yourself
  if (reporterUserId === targetUserId) return { success: false, error: 'Cannot report yourself' };

  // Can't report bots
  if (botService && botService.isBot(targetUserId)) return { success: false, error: 'Cannot report this user' };

  // Rate limit: max 3 reports per reporter per 10 minutes
  const now = Date.now();
  const reporterHistory = reportRateLimit.get(reporterUserId) || [];
  const recentReports = reporterHistory.filter(t => now - t < 10 * 60 * 1000);
  if (recentReports.length >= 3) {
    return { success: false, error: 'Too many reports. Please wait before reporting again.' };
  }
  recentReports.push(now);
  reportRateLimit.set(reporterUserId, recentReports);

  // Add report
  const reports = reportStore.get(targetUserId) || [];
  reports.push({
    reporterId: reporterUserId,
    reason,
    description: description || '',
    timestamp: now,
  });
  reportStore.set(targetUserId, reports);

  // Count unique reporters in last 1 hour
  const oneHourAgo = now - 60 * 60 * 1000;
  const recentReporters = new Set(
    reports
      .filter(r => r.timestamp > oneHourAgo)
      .map(r => r.reporterId)
  );

  console.log(`🚩 Report: ${reporterUserId} reported ${targetUserId} (${reason}) — ${recentReporters.size}/5 unique reporters in 1hr`);

  // Auto-ban: 5 unique reporters within 1 hour
  if (recentReporters.size >= 5) {
    const targetUsername = userAuthMap.get(targetUserId);
    if (targetUsername) {
      authService.banUser(targetUsername, `Reported by ${recentReporters.size} users for: ${reason}`);
      
      // Disconnect the banned user
      const targetWs = userSockets.get(targetUserId);
      if (targetWs && targetWs.readyState === 1) {
        targetWs.send(JSON.stringify({
          type: 'banned',
          message: 'Your account has been permanently banned due to multiple reports. You can pay to unban your account.',
        }));
        setTimeout(() => targetWs.close(), 1000);
      }
      
      return { success: true, banned: true };
    }
  }

  return { success: true, banned: false };
}

// ── Gender-Aware Matchmaking ──
const INTEREST_MATCH_TIMEOUT = 15000; // 15 seconds strict interest matching

function genderCompatible(user1, user2) {
  // If neither is premium, always compatible (no filtering)
  if (!user1.isPremium && !user2.isPremium) return true;

  // Check user1's preference against user2's gender
  if (user1.isPremium && user1.preferredGender && user1.preferredGender !== 'any') {
    if (user2.gender && user2.gender !== 'any' && user2.gender !== user1.preferredGender) {
      return false;
    }
  }

  // Check user2's preference against user1's gender
  if (user2.isPremium && user2.preferredGender && user2.preferredGender !== 'any') {
    if (user1.gender && user1.gender !== 'any' && user1.gender !== user2.preferredGender) {
      return false;
    }
  }

  return true;
}

function findMatch(userId, interests = []) {
  const hasInterests = interests.length > 0;
  const userWaitEntry = waitingUsers.get(userId);
  const userWaitTime = userWaitEntry ? Date.now() - userWaitEntry.timestamp : 0;
  const normalizedInterests = interests.map(i => i.toLowerCase().trim());

  if (hasInterests) {
    // Pass 1: Try to find someone with common interests + gender compatible
    for (const [waitingId, waitingUser] of waitingUsers) {
      if (waitingId === userId) continue;
      if (waitingUser.interests.length === 0) continue;
      if (!genderCompatible(userWaitEntry || {}, waitingUser)) continue;

      const waitingNormalized = waitingUser.interests.map(i => i.toLowerCase().trim());
      const hasCommon = normalizedInterests.some(i => waitingNormalized.includes(i));
      if (hasCommon) return waitingId;
    }

    // If still within 15s, keep waiting for interest match
    if (userWaitTime < INTEREST_MATCH_TIMEOUT) {
      return null;
    }
  }

  // Pass 2: No interests OR timed out — match with anyone available + gender compatible
  for (const [waitingId, waitingUser] of waitingUsers) {
    if (waitingId === userId) continue;
    if (!genderCompatible(userWaitEntry || {}, waitingUser)) continue;

    if (waitingUser.interests.length > 0) {
      const otherWaitTime = Date.now() - waitingUser.timestamp;
      if (otherWaitTime < INTEREST_MATCH_TIMEOUT) continue;
    }

    return waitingId;
  }

  // Pass 3: If we have no interests, match with ANYONE gender-compatible
  if (!hasInterests) {
    for (const [waitingId, waitingUser] of waitingUsers) {
      if (waitingId !== userId) {
        if (genderCompatible(userWaitEntry || {}, waitingUser)) {
          return waitingId;
        }
      }
    }
  }

  return null;
}

// ── Pair Users ──
function pairUsers(user1Id, user2Id) {
  waitingUsers.delete(user1Id);
  waitingUsers.delete(user2Id);

  activePairs.set(user1Id, user2Id);
  activePairs.set(user2Id, user1Id);

  const user1Interests = (userInterestsMap.get(user1Id) || []).map(i => i.toLowerCase().trim());
  const user2Interests = (userInterestsMap.get(user2Id) || []).map(i => i.toLowerCase().trim());
  const commonInterests = (userInterestsMap.get(user1Id) || []).filter(i =>
    user2Interests.includes(i.toLowerCase().trim())
  );

  const matchMsg = commonInterests.length > 0
    ? `Matched on: ${commonInterests.join(', ')} 🎯`
    : "You're chatting with a random stranger. Say hi!";

  const user1Ws = userSockets.get(user1Id);
  const user2Ws = userSockets.get(user2Id);

  if (user1Ws && user1Ws.readyState === 1) {
    user1Ws.send(JSON.stringify({ type: 'matched', partnerId: user2Id, message: matchMsg }));
  }
  if (user2Ws && user2Ws.readyState === 1) {
    user2Ws.send(JSON.stringify({ type: 'matched', partnerId: user1Id, message: matchMsg }));
  }
}

function endChat(userId) {
  const partnerId = activePairs.get(userId);

  if (partnerId) {
    if (botService && botService.isBot(partnerId)) {
      botService.removeBot(partnerId);
      userSockets.delete(partnerId);
    } else {
      const partnerWs = userSockets.get(partnerId);
      if (partnerWs && partnerWs.readyState === 1) {
        partnerWs.send(JSON.stringify({
          type: 'partner_disconnected',
          message: 'Stranger has disconnected.'
        }));
      }
    }
    activePairs.delete(partnerId);
    activePairs.delete(userId);
  }

  waitingUsers.delete(userId);
}

function disconnectUser(userId) {
  endChat(userId);
  const interests = userInterestsMap.get(userId) || [];
  removeUserInterests(interests);
  userInterestsMap.delete(userId);
  userSockets.delete(userId);
  lastActivity.delete(userId);
  userAuthMap.delete(userId);
}

function broadcastOnlineCount() {
  const count = wss.clients.size;
  const message = JSON.stringify({ type: 'online_count', count });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

// ── WebSocket Connection Handler ──
wss.on('connection', (ws, req) => {
  const userId = generateUserId();

  const url = new URL(req.url, 'http://localhost');
  const browserId = url.searchParams.get('browserId');
  const authToken = url.searchParams.get('token');

  // Link auth token to WS user
  if (authToken) {
    const user = authService.verifyToken(authToken);
    if (user) {
      userAuthMap.set(userId, user.username);
      
      // Check if user is banned
      if (user.isBanned) {
        ws.send(JSON.stringify({
          type: 'banned',
          message: 'Your account is banned. Pay to unban.',
        }));
        ws.close();
        return;
      }
    }
  }

  // Kick existing tab if same browser
  if (browserId && browserSockets.has(browserId)) {
    const oldUserId = browserSockets.get(browserId);
    const oldWs = userSockets.get(oldUserId);
    if (oldWs && oldWs.readyState === 1) {
      console.log(`Duplicate tab detected for browserId: ${browserId}, closing old tab`);
      oldWs.send(JSON.stringify({
        type: 'duplicate_tab',
        message: 'You opened ShadowChat in another tab. This tab has been disconnected.'
      }));
      oldWs.close();
    }
    endChat(oldUserId);
    waitingUsers.delete(oldUserId);
    userSockets.delete(oldUserId);
    lastActivity.delete(oldUserId);
  }

  userSockets.set(userId, ws);
  if (browserId) browserSockets.set(browserId, userId);

  console.log(`User connected: ${userId}${userAuthMap.has(userId) ? ` (${userAuthMap.get(userId)})` : ''}, Total: ${wss.clients.size}`);

  ws.send(JSON.stringify({
    type: 'connected',
    userId: userId,
    onlineCount: wss.clients.size,
    interests: getInterestStats()
  }));

  lastActivity.set(userId, Date.now());
  broadcastOnlineCount();

  // ── Message Handler ──
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      lastActivity.set(userId, Date.now());

      switch (message.type) {
        case 'get_interests':
          ws.send(JSON.stringify({ type: 'interest_stats', interests: getInterestStats() }));
          break;

        case 'find_match': {
          waitingUsers.delete(userId);

          const userInterests = (message.interests || []).filter(i => AVAILABLE_INTERESTS.includes(i));
          const oldInterests = userInterestsMap.get(userId) || [];
          removeUserInterests(oldInterests);
          userInterestsMap.set(userId, userInterests);
          addUserInterests(userInterests);

          // Gender preferences
          const gender = message.gender || 'any';
          const preferredGender = message.preferredGender || 'any';
          const isPremium = message.isPremium || false;

          const matchId = findMatch(userId, userInterests);

          if (matchId) {
            waitingUsers.delete(matchId);
            pairUsers(userId, matchId);
          } else {
            waitingUsers.set(userId, {
              ws, interests: message.interests || [], gender, preferredGender, isPremium,
              timestamp: Date.now()
            });
            ws.send(JSON.stringify({ type: 'waiting', message: 'Looking for someone to chat with...' }));
          }
          break;
        }

        case 'cancel_search':
          waitingUsers.delete(userId);
          ws.send(JSON.stringify({ type: 'search_cancelled' }));
          break;

        case 'message': {
          const partnerId = activePairs.get(userId);
          if (partnerId) {
            const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
            const ts = Date.now();
            const partnerWs = userSockets.get(partnerId);
            if (partnerWs && partnerWs.readyState === 1) {
              partnerWs.send(JSON.stringify({
                type: 'message', from: 'stranger', text: message.text, messageId: msgId, timestamp: ts
              }));
            }

            ws.send(JSON.stringify({ type: 'message_sent', text: message.text, messageId: msgId, timestamp: ts }));

            // Bot response handling
            if (botService && botService.isBot(partnerId)) {
              const readDelay = 300 + Math.random() * 700;
              setTimeout(() => {
                if (!activePairs.has(userId) || ws.readyState !== 1) return;
                ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
              }, readDelay);

              botService.getResponse(partnerId, message.text).then(botReply => {
                if (!activePairs.has(userId)) return;

                if (botService.shouldDisconnect(partnerId)) {
                  const dcDelay = botReply ? botService.getTypingDelay(botReply) : 1000;
                  setTimeout(() => {
                    if (!activePairs.has(userId) || ws.readyState !== 1) return;
                    ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
                    if (botReply) {
                      ws.send(JSON.stringify({
                        type: 'message', from: 'stranger', text: botReply,
                        messageId: 'msg-' + Date.now() + '-bot', timestamp: Date.now()
                      }));
                    }
                    setTimeout(() => {
                      if (!activePairs.has(userId) || ws.readyState !== 1) return;
                      ws.send(JSON.stringify({ type: 'partner_disconnected', message: 'Stranger has disconnected.' }));
                      botService.removeBot(partnerId);
                      activePairs.delete(partnerId);
                      activePairs.delete(userId);
                      userSockets.delete(partnerId);
                    }, 1000 + Math.random() * 2000);
                  }, dcDelay);
                  return;
                }

                if (!botReply) return;
                const delay = botService.getTypingDelay(botReply);
                setTimeout(() => {
                  if (!activePairs.has(userId) || ws.readyState !== 1) return;
                  ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
                  ws.send(JSON.stringify({
                    type: 'message', from: 'stranger', text: botReply,
                    messageId: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
                    timestamp: Date.now()
                  }));
                }, delay);
              });
            }
          }
          break;
        }

        case 'typing': {
          const typingPartnerId = activePairs.get(userId);
          if (typingPartnerId) {
            const partnerWs = userSockets.get(typingPartnerId);
            if (partnerWs && partnerWs.readyState === 1) {
              partnerWs.send(JSON.stringify({ type: 'typing', isTyping: message.isTyping }));
            }
          }
          break;
        }

        case 'reaction': {
          const reactionPartnerId = activePairs.get(userId);
          if (reactionPartnerId) {
            const rWs = userSockets.get(reactionPartnerId);
            if (rWs && rWs.readyState === 1) {
              rWs.send(JSON.stringify({ type: 'reaction_received', messageId: message.messageId, emoji: message.emoji }));
            }
          }
          break;
        }

        case 'stop_chat':
          endChat(userId);
          ws.send(JSON.stringify({ type: 'chat_ended', message: 'You ended the chat.' }));
          break;

        case 'new_chat': {
          endChat(userId);

          const gender = message.gender || 'any';
          const preferredGender = message.preferredGender || 'any';
          const isPremium = message.isPremium || false;

          waitingUsers.set(userId, {
            ws, interests: message.interests || [], gender, preferredGender, isPremium,
            timestamp: Date.now()
          });

          ws.send(JSON.stringify({ type: 'waiting', message: 'Looking for someone to chat with...' }));

          const newMatchId = findMatch(userId, message.interests || []);
          if (newMatchId) {
            waitingUsers.delete(newMatchId);
            waitingUsers.delete(userId);
            pairUsers(userId, newMatchId);
          }
          break;
        }

        // ── Report System ──
        case 'report': {
          const targetId = message.targetId || activePairs.get(userId);
          if (!targetId) {
            ws.send(JSON.stringify({ type: 'report_error', message: 'No user to report' }));
            break;
          }

          const result = handleReport(userId, targetId, message.reason || 'Other', message.description);
          if (result.success) {
            ws.send(JSON.stringify({ type: 'report_submitted', message: 'Report submitted. Thank you.' }));
          } else {
            ws.send(JSON.stringify({ type: 'report_error', message: result.error }));
          }
          break;
        }

        // ── Game Messages ──
        case 'game_invite':
        case 'game_accept':
        case 'game_decline':
        case 'game_move':
        case 'game_leave': {
          const gamePartnerId = activePairs.get(userId);
          if (gamePartnerId) {
            const gWs = userSockets.get(gamePartnerId);
            if (gWs && gWs.readyState === 1) {
              gWs.send(JSON.stringify({ type: message.type, game: message.game, data: message.data }));
            }
          }
          break;
        }

        // ── Video signaling (future) ──
        case 'video_offer':
        case 'video_answer':
        case 'video_ice_candidate':
        case 'video_end': {
          const videoPartnerId = activePairs.get(userId);
          if (videoPartnerId) {
            const vWs = userSockets.get(videoPartnerId);
            if (vWs && vWs.readyState === 1) {
              vWs.send(JSON.stringify(message));
            }
          }
          break;
        }

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // ── Disconnect ──
  ws.on('close', () => {
    console.log(`User disconnected: ${userId}`);
    if (browserId && browserSockets.get(browserId) === userId) {
      browserSockets.delete(browserId);
    }
    setTimeout(() => broadcastOnlineCount(), 100);
    disconnectUser(userId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${userId}:`, error);
    disconnectUser(userId);
  });

  // Heartbeat
  let missedPongs = 0;
  ws.on('pong', () => { missedPongs = 0; });

  const pingInterval = setInterval(() => {
    if (ws.readyState !== 1) { clearInterval(pingInterval); return; }
    missedPongs++;
    if (missedPongs > 2) {
      console.log(`Heartbeat failed for user ${userId}, terminating`);
      clearInterval(pingInterval);
      ws.terminate();
      return;
    }
    ws.ping();
  }, 30000);

  ws.on('close', () => clearInterval(pingInterval));
});

// ── Periodic Tasks ──

// Clean up old waiting users (5 min timeout)
setInterval(() => {
  const now = Date.now();
  for (const [userId, userData] of waitingUsers) {
    if (now - userData.timestamp > 5 * 60 * 1000) {
      const ws = userSockets.get(userId);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'search_timeout', message: 'Search timed out. No one is available right now.' }));
      }
      waitingUsers.delete(userId);
    }
  }
}, 60000);

// Clean up idle users (3 min)
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of lastActivity) {
    if (now - timestamp > IDLE_TIMEOUT) {
      const ws = userSockets.get(userId);
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', message: 'Disconnected due to inactivity.' }));
        ws.close();
      }
      console.log(`User ${userId} disconnected due to inactivity`);
      disconnectUser(userId);
    }
  }
}, 30000);

// Periodic matchmaking sweep
setInterval(() => {
  for (const [userId, waitingUser] of waitingUsers) {
    const matchId = findMatch(userId, waitingUser.interests);
    if (matchId) {
      waitingUsers.delete(matchId);
      waitingUsers.delete(userId);
      pairUsers(userId, matchId);
      console.log(`Sweep matched: ${userId} <-> ${matchId}`);
      break;
    }
  }
}, 3000);

// Bot fallback (5s wait)
const BOT_FALLBACK_TIMEOUT = 5000;
setInterval(() => {
  if (!botService) return;

  for (const [userId, waitingUser] of waitingUsers) {
    const waitTime = Date.now() - waitingUser.timestamp;
    if (waitTime >= BOT_FALLBACK_TIMEOUT) {
      const botId = 'bot-' + generateUserId();
      const persona = botService.createBot(botId, waitingUser.interests);

      userSockets.set(botId, { readyState: 0 });
      userInterestsMap.set(botId, persona.interests);

      waitingUsers.delete(userId);
      activePairs.set(userId, botId);
      activePairs.set(botId, userId);

      const userWs = userSockets.get(userId);
      const commonInterests = (waitingUser.interests || []).filter(i =>
        persona.interests.map(p => p.toLowerCase()).includes(i.toLowerCase())
      );
      const matchMsg = commonInterests.length > 0
        ? `Matched on: ${commonInterests.join(', ')} 🎯`
        : "You're chatting with a random stranger. Say hi!";

      if (userWs && userWs.readyState === 1) {
        userWs.send(JSON.stringify({ type: 'matched', partnerId: botId, message: matchMsg }));
      }

      setTimeout(async () => {
        if (!activePairs.has(userId)) return;
        const greeting = await botService.getGreeting(botId);
        if (userWs && userWs.readyState === 1) {
          userWs.send(JSON.stringify({ type: 'typing', isTyping: true }));
        }
        setTimeout(() => {
          if (!activePairs.has(userId) || !userWs || userWs.readyState !== 1) return;
          userWs.send(JSON.stringify({ type: 'typing', isTyping: false }));
          userWs.send(JSON.stringify({
            type: 'message', from: 'stranger', text: greeting,
            messageId: 'msg-' + Date.now() + '-bot', timestamp: Date.now()
          }));
        }, 1000 + Math.random() * 1500);
      }, 1500 + Math.random() * 2000);

      console.log(`🤖 Bot matched: ${userId} <-> ${botId} (${persona.name})`);
      break;
    }
  }
}, 5000);

export { server, wss, authService, paymentService };
