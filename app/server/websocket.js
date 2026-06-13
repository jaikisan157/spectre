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
const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_KEY_HERE' ? process.env.GEMINI_API_KEY : null;
const groqKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'YOUR_GROQ_KEY_HERE' ? process.env.GROQ_API_KEY : null;
const openrouterKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_KEY_HERE' ? process.env.OPENROUTER_API_KEY : null;

if (geminiKey || groqKey || openrouterKey) {
  botService = new BotService({ gemini: geminiKey, groq: groqKey, openrouter: openrouterKey });
  console.log(`🤖 Bot service enabled with active fallback chain: [${botService.activeProviders.join(' -> ')}]`);
} else {
  console.log('⚠️ Neither GEMINI_API_KEY, GROQ_API_KEY nor OPENROUTER_API_KEY set — bots disabled');
}

// Create HTTP server (Express will mount on this)
const server = createServer();

// Allowed origins for WebSocket connections
const ALLOWED_ORIGINS = [
  'https://spectre-1.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Create WebSocket server with security limits
const wss = new WebSocketServer({
  server,
  maxPayload: 16 * 1024, // 16 KB max message size
  verifyClient: ({ origin }) => {
    // Allow connections with no origin (non-browser clients like health checks)
    if (!origin) return true;
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
  },
});

// ── State Maps ──
const waitingUsers = new Map();   // userId -> { ws, interests, timestamp }
const activePairs = new Map();    // userId -> partnerId
const userSockets = new Map();    // userId -> ws
const lastActivity = new Map();   // userId -> timestamp
const browserSockets = new Map(); // browserId -> userId
const botDebounce = new Map();    // userId -> { texts: string[], timer, typingTimer }
const botGameSessions = new Map(); // userId -> { game, state }

// ── Security Constants ──
const MAX_CONNECTIONS = 10000;
const MAX_MSG_PER_SEC = 8;        // messages per second per connection
const MAX_MSG_LENGTH = 2000;      // max characters per chat message
const MAX_MAP_SIZE = 50000;       // safety cap for any Map
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

  // Silently succeed for bots
  if (botService && botService.isBot(targetUserId)) {
    console.log(`🚩 Report: ${reporterUserId} reported bot ${targetUserId} — silently accepted`);
    return { success: true, banned: false };
  }

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

// ── Matchmaking ──
const INTEREST_MATCH_TIMEOUT = 15000; // 15 seconds strict interest matching

function findMatch(userId, interests = []) {
  const hasInterests = interests.length > 0;
  const userWaitEntry = waitingUsers.get(userId);
  const userWaitTime = userWaitEntry ? Date.now() - userWaitEntry.timestamp : 0;
  const normalizedInterests = interests.map(i => i.toLowerCase().trim());

  if (hasInterests) {
    // Pass 1: Try to find someone with common interests
    for (const [waitingId, waitingUser] of waitingUsers) {
      if (waitingId === userId) continue;
      if (waitingUser.interests.length === 0) continue;

      const waitingNormalized = waitingUser.interests.map(i => i.toLowerCase().trim());
      const hasCommon = normalizedInterests.some(i => waitingNormalized.includes(i));
      if (hasCommon) return waitingId;
    }

    // If still within 15s, keep waiting for interest match
    if (userWaitTime < INTEREST_MATCH_TIMEOUT) {
      return null;
    }
  }

  // Pass 2: No interests OR timed out — match with anyone available
  for (const [waitingId, waitingUser] of waitingUsers) {
    if (waitingId === userId) continue;

    if (waitingUser.interests.length > 0) {
      const otherWaitTime = Date.now() - waitingUser.timestamp;
      if (otherWaitTime < INTEREST_MATCH_TIMEOUT) continue;
    }

    return waitingId;
  }

  // Pass 3: If we have no interests, match with ANYONE available
  if (!hasInterests) {
    for (const [waitingId] of waitingUsers) {
      if (waitingId !== userId) {
        return waitingId;
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
  botGameSessions.delete(userId);

  if (partnerId) {
    botGameSessions.delete(partnerId);
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
  botGameSessions.delete(userId);
  endChat(userId);
  const interests = userInterestsMap.get(userId) || [];
  removeUserInterests(interests);
  userInterestsMap.delete(userId);
  userSockets.delete(userId);
  lastActivity.delete(userId);
  userAuthMap.delete(userId);

  // Clean up any pending bot debounce timers
  const pending = botDebounce.get(userId);
  if (pending) {
    pending.gen++; // invalidate any in-flight API responses
    if (pending.debounceTimer) clearTimeout(pending.debounceTimer);
    if (pending.typingTimer) clearTimeout(pending.typingTimer);
    if (pending.replyTimer) clearTimeout(pending.replyTimer);
    botDebounce.delete(userId);
  }
}

let currentFakeOnlineCount = (() => {
  const now = new Date();
  const minutesBucket = Math.floor(now.getMinutes() / 10);
  const seed = now.getDate() + now.getHours() * 100 + minutesBucket * 10000;
  const x = Math.sin(seed) * 10000;
  const pseudoRandom = Math.floor((x - Math.floor(x)) * 2600) + 1200; // 1200 to 3800
  return pseudoRandom;
})();

setInterval(() => {
  const step = Math.floor(Math.random() * 7) - 3;
  const next = currentFakeOnlineCount + step;
  currentFakeOnlineCount = Math.min(4000, Math.max(1000, next));
  
  const realCount = wss.clients.size;
  if (realCount < 1000) {
    const message = JSON.stringify({ type: 'online_count', count: currentFakeOnlineCount });
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  }
}, 4000);

function getDisplayOnlineCount() {
  const realCount = wss.clients.size;
  if (realCount >= 1000) return realCount;
  return currentFakeOnlineCount;
}

function broadcastOnlineCount() {
  const count = getDisplayOnlineCount();
  const message = JSON.stringify({ type: 'online_count', count });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

// ── WebSocket Connection Handler ──
wss.on('connection', (ws, req) => {
  // Enforce max connections
  if (wss.clients.size > MAX_CONNECTIONS) {
    ws.close(1013, 'Server full');
    return;
  }

  const userId = generateUserId();

  // Per-connection rate limiter
  const msgTimestamps = [];

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
        message: 'You opened Spectre in another tab. This tab has been disconnected.'
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
    onlineCount: getDisplayOnlineCount(),
    interests: getInterestStats()
  }));

  lastActivity.set(userId, Date.now());
  broadcastOnlineCount();

  // ── Message Handler ──
  ws.on('message', (data) => {
    try {
      // Rate limit: max MAX_MSG_PER_SEC messages per second
      const now = Date.now();
      msgTimestamps.push(now);
      while (msgTimestamps.length && msgTimestamps[0] < now - 1000) msgTimestamps.shift();
      if (msgTimestamps.length > MAX_MSG_PER_SEC) {
        ws.send(JSON.stringify({ type: 'error', message: 'Slow down! Too many messages.' }));
        return;
      }

      const message = JSON.parse(data.toString());
      lastActivity.set(userId, now);

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

          const matchId = findMatch(userId, userInterests);

          if (matchId) {
            waitingUsers.delete(matchId);
            pairUsers(userId, matchId);
          } else {
            waitingUsers.set(userId, {
              ws, interests: message.interests || [],
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
            // Validate and sanitize message text
            const rawText = typeof message.text === 'string' ? message.text.trim() : '';
            if (!rawText) break;
            const text = rawText.substring(0, MAX_MSG_LENGTH);

            const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
            const ts = Date.now();
            const partnerWs = userSockets.get(partnerId);
            if (partnerWs && partnerWs.readyState === 1) {
              partnerWs.send(JSON.stringify({
                type: 'message', from: 'stranger', text, messageId: msgId, timestamp: ts
              }));
            }

            ws.send(JSON.stringify({ type: 'message_sent', text, messageId: msgId, timestamp: ts }));

            // Bot response handling — full human-like debounce with generation cancellation
            // If the user sends another message at ANY point (waiting, API in-flight, bot "typing"),
            // the bot scraps its pending reply, reads the new message, and restarts.
            if (botService && botService.isBot(partnerId)) {
              const pending = botDebounce.get(userId) || {
                texts: [],
                gen: 0,               // generation counter — increments on every reset
                debounceTimer: null,   // waiting for user to stop sending
                typingTimer: null,     // "read" delay before showing typing indicator
                replyTimer: null,      // delay before bot sends its message
              };

              // ── Reset everything: scrap any in-progress reply ──
              pending.gen++;
              if (pending.debounceTimer) clearTimeout(pending.debounceTimer);
              if (pending.typingTimer) clearTimeout(pending.typingTimer);
              if (pending.replyTimer) clearTimeout(pending.replyTimer);

              // Stop the typing indicator if it was showing (bot is "reading" the new msg)
              ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

              // Accumulate message
              pending.texts.push(text);

              // Show typing indicator after a short "read" delay
              pending.typingTimer = setTimeout(() => {
                if (!activePairs.has(userId) || ws.readyState !== 1) return;
                ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
              }, 400 + Math.random() * 600);

              // Capture current generation for this cycle
              const currentGen = pending.gen;

              // Wait 2.5s of user silence before calling the API
              pending.debounceTimer = setTimeout(() => {
                if (pending.gen !== currentGen) return; // stale — user sent another msg
                if (!activePairs.has(userId) || ws.readyState !== 1) return;

                // Combine all accumulated messages into one
                const combinedText = pending.texts.join('\n');

                // Show typing while API call is in progress
                ws.send(JSON.stringify({ type: 'typing', isTyping: true }));

                botService.getResponse(partnerId, combinedText).then(botReply => {
                  // If generation changed, user sent a new message while API was running — discard this reply
                  if (pending.gen !== currentGen) return;
                  if (!activePairs.has(userId)) return;

                  // Clean up — this cycle is done
                  botDebounce.delete(userId);

                  if (botService.shouldDisconnect(partnerId)) {
                    const dcDelay = botReply ? botService.getTypingDelay(botReply) : 1000;
                    pending.replyTimer = setTimeout(() => {
                      if (pending.gen !== currentGen) return;
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
                  pending.replyTimer = setTimeout(() => {
                    if (pending.gen !== currentGen) return; // user interrupted during typing delay
                    if (!activePairs.has(userId) || ws.readyState !== 1) return;
                    ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
                    ws.send(JSON.stringify({
                      type: 'message', from: 'stranger', text: botReply,
                      messageId: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
                      timestamp: Date.now()
                    }));
                  }, delay);
                });
              }, 2500);

              botDebounce.set(userId, pending);
            }
          }
          break;
        }

        case 'typing': {
          const typingPartnerId = activePairs.get(userId);
          if (typingPartnerId) {
            const partnerWs = userSockets.get(typingPartnerId);
            if (partnerWs && partnerWs.readyState === 1) {
              partnerWs.send(JSON.stringify({ type: 'typing', isTyping: !!message.isTyping }));
            }
          }
          break;
        }

        case 'reaction': {
          const reactionPartnerId = activePairs.get(userId);
          if (reactionPartnerId) {
            // Validate emoji (max 8 chars to allow compound emoji)
            const emoji = typeof message.emoji === 'string' ? message.emoji.substring(0, 8) : '';
            const messageId = typeof message.messageId === 'string' ? message.messageId.substring(0, 50) : '';
            if (!emoji || !messageId) break;
            const rWs = userSockets.get(reactionPartnerId);
            if (rWs && rWs.readyState === 1) {
              rWs.send(JSON.stringify({ type: 'reaction_received', messageId, emoji }));
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

          waitingUsers.set(userId, {
            ws, interests: message.interests || [],
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

        // ── Game Messages ── (whitelist fields)
        case 'game_invite': {
          const gamePartnerId = activePairs.get(userId);
          if (gamePartnerId) {
            const gameName = typeof message.game === 'string' ? message.game.substring(0, 30) : '';
            if (botService && botService.isBot(gamePartnerId)) {
              // Roll a 90% chance to accept the game invite
              const acceptRoll = Math.random() < 0.90;

              if (acceptRoll) {
                // 1. Choose acceptance text based on game name
                let acceptText = 'sure, let\'s play!';
                const lowerGame = gameName.toLowerCase();
                if (lowerGame.includes('tictactoe')) {
                  const responses = [
                    "ooo sure let's play tictactoe!",
                    "bet, prepare to lose lol",
                    "hell yeah let's go",
                    "sure, you start"
                  ];
                  acceptText = responses[Math.floor(Math.random() * responses.length)];
                } else if (lowerGame.includes('connect4')) {
                  const responses = [
                    "connect 4? sweet, let's play!",
                    "down, i love connect 4",
                    "bet, let's see who's smarter"
                  ];
                  acceptText = responses[Math.floor(Math.random() * responses.length)];
                } else if (lowerGame.includes('rps')) {
                  const responses = [
                    "rps! i always win lol",
                    "bet",
                    "sure, let's play rock paper scissors"
                  ];
                  acceptText = responses[Math.floor(Math.random() * responses.length)];
                } else if (lowerGame.includes('truthdare')) {
                  const responses = [
                    "truth or dare? down, let's do it!",
                    "bet, but don't ask anything too crazy haha",
                    "sure, ask me first"
                  ];
                  acceptText = responses[Math.floor(Math.random() * responses.length)];
                } else if (lowerGame.includes('wyr')) {
                  const responses = [
                    "ooo would you rather is fun, let's do it",
                    "down, send a question!",
                    "sure"
                  ];
                  acceptText = responses[Math.floor(Math.random() * responses.length)];
                }

                // 2. Short typing delay
                setTimeout(() => {
                  if (activePairs.get(userId) !== gamePartnerId || ws.readyState !== 1) return;
                  ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
                }, 400 + Math.random() * 400);

                setTimeout(() => {
                  if (activePairs.get(userId) !== gamePartnerId || ws.readyState !== 1) return;
                  ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

                  // Accept the invite
                  ws.send(JSON.stringify({ type: 'game_accept', game: gameName }));

                  // Initialize the session state
                  botGameSessions.set(userId, { game: gameName, state: initializeBotGameState(gameName) });

                  // Send positive reply message
                  const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
                  ws.send(JSON.stringify({
                    type: 'message',
                    from: 'stranger',
                    text: acceptText,
                    messageId: msgId,
                    timestamp: Date.now()
                  }));

                  // Log to bot conversation history
                  const bot = botService.activeBots.get(gamePartnerId);
                  if (bot) {
                    bot.messages.push({ role: 'user', content: `[User invited you to play ${gameName}]` });
                    bot.messages.push({ role: 'assistant', content: acceptText });
                  }
                }, 1800 + Math.random() * 800);

              } else {
                // Decline the invite (10% chance)
                const declineMsgText = botService.getGameDeclineMessage(gamePartnerId, gameName);
                
                setTimeout(() => {
                  if (activePairs.get(userId) !== gamePartnerId || ws.readyState !== 1) return;
                  ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
                }, 600 + Math.random() * 400);

                setTimeout(() => {
                  if (activePairs.get(userId) !== gamePartnerId || ws.readyState !== 1) return;
                  ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
                  
                  ws.send(JSON.stringify({ type: 'game_decline', game: gameName }));
                  
                  const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
                  ws.send(JSON.stringify({
                    type: 'message',
                    from: 'stranger',
                    text: declineMsgText,
                    messageId: msgId,
                    timestamp: Date.now()
                  }));

                  botService.addGameDeclineToHistory(gamePartnerId, gameName, declineMsgText);
                }, 2000 + Math.random() * 1000);
              }
            } else {
              // Regular user invite forwarding
              const gWs = userSockets.get(gamePartnerId);
              if (gWs && gWs.readyState === 1) {
                gWs.send(JSON.stringify({ type: message.type, game: gameName, data: message.data }));
              }
            }
          }
          break;
        }

        case 'game_accept':
        case 'game_decline':
        case 'game_move':
        case 'game_leave': {
          const gamePartnerId = activePairs.get(userId);
          if (gamePartnerId) {
            if (botService && botService.isBot(gamePartnerId)) {
              handleBotGameMessage(userId, gamePartnerId, message, ws);
            } else {
              const gameName = typeof message.game === 'string' ? message.game.substring(0, 30) : '';
              const gWs = userSockets.get(gamePartnerId);
              if (gWs && gWs.readyState === 1) {
                gWs.send(JSON.stringify({ type: message.type, game: gameName, data: message.data }));
              }
            }
          }
          break;
        }

        // ── Video signaling (future) ── (whitelist fields only)
        case 'video_offer':
        case 'video_answer':
        case 'video_ice_candidate':
        case 'video_end': {
          const videoPartnerId = activePairs.get(userId);
          if (videoPartnerId) {
            const vWs = userSockets.get(videoPartnerId);
            if (vWs && vWs.readyState === 1) {
              // Only forward safe, expected fields
              const safeMsg = { type: message.type };
              if (message.sdp) safeMsg.sdp = message.sdp;
              if (message.candidate) safeMsg.candidate = message.candidate;
              vWs.send(JSON.stringify(safeMsg));
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

// Periodic safety cleanup — prevent unbounded Map growth (every 5 min)
setInterval(() => {
  // Clean stale entries from report rate limiter (older than 10 min)
  const now = Date.now();
  for (const [reporterId, timestamps] of reportRateLimit) {
    const recent = timestamps.filter(t => now - t < 10 * 60 * 1000);
    if (recent.length === 0) reportRateLimit.delete(reporterId);
    else reportRateLimit.set(reporterId, recent);
  }

  // Clean stale report records (older than 2 hours)
  for (const [targetId, reports] of reportStore) {
    const recent = reports.filter(r => now - r.timestamp < 2 * 60 * 60 * 1000);
    if (recent.length === 0) reportStore.delete(targetId);
    else reportStore.set(targetId, recent);
  }

  // Safety: if any state Map exceeds MAX_MAP_SIZE, log a warning
  const maps = { waitingUsers, activePairs, userSockets, lastActivity, browserSockets, userAuthMap, reportStore, reportRateLimit };
  for (const [name, map] of Object.entries(maps)) {
    if (map.size > MAX_MAP_SIZE) {
      console.warn(`⚠️ Map '${name}' exceeds ${MAX_MAP_SIZE} entries (${map.size}). Possible memory leak.`);
    }
  }
}, 5 * 60 * 1000);

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

      console.log(`🤖 Bot matched: ${userId} <-> ${botId} (${persona.name}) — Active AI Fallback: [${botService.activeProviders.join(' -> ')}]`);
      break;
    }
  }
}, 5000);

// TRUTHS and DARES for Bot Truth or Dare AI
const TRUTHS = [
  "What's your most embarrassing moment?",
  "What's a secret you've never told anyone online?",
  "What's the last lie you told?",
  "What's your biggest fear?",
  "What's the most childish thing you still do?",
  "Have you ever stalked someone on social media?",
  "What's your guilty pleasure?",
  "What's the weirdest dream you've ever had?",
  "What's something you pretend to hate but secretly love?",
  "If you could read minds, whose would you read first?",
  "What's the most embarrassing thing in your search history?",
  "What's your most unpopular opinion?",
  "What's the cringiest thing you've done for a crush?",
  "What's a skill you wish you had?",
  "What's the longest you've gone without showering?"
];

const DARES = [
  "Send the 5th photo in your gallery",
  "Type the next 3 messages with your eyes closed",
  "Use only emojis for the next 2 minutes",
  "Say something nice about a stranger",
  "Share your most used emoji 🔥",
  "Type a message using only your nose",
  "Describe yourself in 3 emojis",
  "Share the last song you listened to",
  "Make up a short poem right now",
  "Send a voice message singing something (if you dare!)",
  "Don't use the letter 'e' in your next 5 messages",
  "Speak in a different language for the next minute",
  "Share your most used emoji",
  "Share your most controversial food take",
  "Describe your outfit right now",
  "Tell a joke that will make the other person laugh"
];

function initializeBotGameState(gameName) {
  if (gameName === 'tictactoe') {
    return {
      board: Array(9).fill(null),
      botSymbol: 'O',
      userSymbol: 'X'
    };
  } else if (gameName === 'connect4') {
    return {
      board: Array.from({ length: 6 }, () => Array(7).fill(null)),
      botColor: 'Y',
      userColor: 'R'
    };
  } else if (gameName === 'rps') {
    return {
      round: 1,
      score: { me: 0, them: 0 },
      userChoice: null,
      botChoice: null
    };
  } else if (gameName === 'wyr') {
    return {
      round: 1,
      question: null,
      userAnswer: null,
      botAnswer: null
    };
  } else if (gameName === 'truthdare') {
    return {
      prompts: []
    };
  }
  return {};
}

// Intercepts and processes game messages when the partner is a bot
function handleBotGameMessage(userId, botUserId, message, ws) {
  const session = botGameSessions.get(userId);
  const gameName = typeof message.game === 'string' ? message.game.substring(0, 30) : '';

  if (message.type === 'game_leave' || message.type === 'game_decline') {
    botGameSessions.delete(userId);
    return;
  }

  if (!session || session.game !== gameName) return;

  const data = message.data || {};

  switch (gameName) {
    case 'tictactoe': {
      if (message.type === 'game_move') {
        const index = data.index;
        const symbol = data.symbol;

        // 1. Update user's move on local board
        session.state.board[index] = symbol;

        // 2. Check if game is over
        const winner = checkTTTWinner(session.state.board);
        if (winner) {
          botGameSessions.delete(userId);
          if (winner === 'X') {
            sendBotComment(userId, botUserId, ['gg u won!', 'wp gg', 'damn you beat me', 'gg, nice moves'], ws);
          } else if (winner === 'draw') {
            sendBotComment(userId, botUserId, ['gg draw!', 'draw lol close one', 'gg close'], ws);
          }
          break;
        }

        // 3. Bot's turn
        ws.send(JSON.stringify({ type: 'typing', isTyping: true }));

        setTimeout(() => {
          if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;
          ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

          const botMove = getBestTTTMove(session.state.board);
          if (botMove !== undefined && botMove !== -1) {
            session.state.board[botMove] = 'O';

            // Send move to client
            ws.send(JSON.stringify({
              type: 'game_move',
              game: 'tictactoe',
              data: { index: botMove, symbol: 'O' }
            }));

            // Check if game is over after bot move
            const nextWinner = checkTTTWinner(session.state.board);
            if (nextWinner) {
              botGameSessions.delete(userId);
              if (nextWinner === 'O') {
                sendBotComment(userId, botUserId, ['ez win haha', 'gg i win!', 'gg ggs', 'nice game gg'], ws);
              } else if (nextWinner === 'draw') {
                sendBotComment(userId, botUserId, ['gg draw!', 'close one gg', 'gg'], ws);
              }
            }
          }
        }, 1200 + Math.random() * 800);
      }
      break;
    }

    case 'connect4': {
      if (message.type === 'game_move') {
        const col = data.col;
        const color = data.color;

        // 1. Update user's move on local board
        simulateDrop(session.state.board, col, color);

        // 2. Check if game is over
        const winner = checkC4Winner(session.state.board);
        if (winner) {
          botGameSessions.delete(userId);
          if (winner === 'R') {
            sendBotComment(userId, botUserId, ['gg u got 4 in a row!', 'wp gg', 'damn you are good at connect 4', 'gg!'], ws);
          } else if (winner === 'draw') {
            sendBotComment(userId, botUserId, ['gg draw!', 'full board lol gg', 'gg close'], ws);
          }
          break;
        }

        // 3. Bot's turn
        ws.send(JSON.stringify({ type: 'typing', isTyping: true }));

        setTimeout(() => {
          if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;
          ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

          const botCol = getBestC4Col(session.state.board);
          if (botCol !== undefined && botCol !== -1) {
            simulateDrop(session.state.board, botCol, 'Y');

            // Send move to client
            ws.send(JSON.stringify({
              type: 'game_move',
              game: 'connect4',
              data: { col: botCol, color: 'Y' }
            }));

            // Check if game is over after bot move
            const nextWinner = checkC4Winner(session.state.board);
            if (nextWinner) {
              botGameSessions.delete(userId);
              if (nextWinner === 'Y') {
                sendBotComment(userId, botUserId, ['gg i won!', 'ez connect 4 haha', 'ggs wp', 'nice game'], ws);
              } else if (nextWinner === 'draw') {
                sendBotComment(userId, botUserId, ['gg draw!', 'board full gg', 'gg'], ws);
              }
            }
          }
        }, 1500 + Math.random() * 1000);
      }
      break;
    }

    case 'rps': {
      if (message.type === 'game_move') {
        const userChoice = data.choice;
        session.state.userChoice = userChoice;

        ws.send(JSON.stringify({ type: 'typing', isTyping: true }));

        setTimeout(() => {
          if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;
          ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

          const choices = ['rock', 'paper', 'scissors'];
          const botChoice = choices[Math.floor(Math.random() * 3)];
          session.state.botChoice = botChoice;

          ws.send(JSON.stringify({
            type: 'game_move',
            game: 'rps',
            data: { choice: botChoice }
          }));

          const res = getRPSResult(userChoice, botChoice);
          if (res === 'win') {
            session.state.score.me++;
          } else if (res === 'lose') {
            session.state.score.them++;
          }

          if (session.state.score.me >= 2) {
            botGameSessions.delete(userId);
            sendBotComment(userId, botUserId, ['gg u beat me at rps!', 'wp gg', 'nooo rps is pure luck anyway lol gg'], ws, 1000);
          } else if (session.state.score.them >= 2) {
            botGameSessions.delete(userId);
            sendBotComment(userId, botUserId, ['ez rps win haha gg', 'i read you like a book lol gg', 'ggs wp'], ws, 1000);
          } else {
            session.state.round++;
            session.state.userChoice = null;
            session.state.botChoice = null;
          }
        }, 1000 + Math.random() * 800);
      }
      break;
    }

    case 'wyr': {
      if (message.type === 'game_move') {
        if (data.question) {
          session.state.question = data.question;
          session.state.userAnswer = null;
          session.state.botAnswer = null;

          setTimeout(() => {
            if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;

            const choice = Math.random() < 0.5 ? 'A' : 'B';
            session.state.botAnswer = choice;

            ws.send(JSON.stringify({
              type: 'game_move',
              game: 'wyr',
              data: { answer: choice }
            }));

            const chosenText = choice === 'A' ? data.question.a : data.question.b;
            const virtualMsg = `[We are playing Would You Rather. The question is: "${data.question.a}" or "${data.question.b}". I chose Option ${choice}: "${chosenText}". Why did I choose this? Explain in one short casual sentence.]`;

            botService.getResponse(botUserId, virtualMsg).then(comment => {
              if (!comment) return;
              if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;

              const delay = botService.getTypingDelay(comment);
              ws.send(JSON.stringify({ type: 'typing', isTyping: true }));

              setTimeout(() => {
                if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;
                ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

                ws.send(JSON.stringify({
                  type: 'message',
                  from: 'stranger',
                  text: comment,
                  messageId: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
                  timestamp: Date.now()
                }));
              }, delay);
            });
          }, 1500 + Math.random() * 1000);
        } else if (data.answer) {
          session.state.userAnswer = data.answer;
        }
      }
      break;
    }

    case 'truthdare': {
      if (message.type === 'game_move' && data.prompt) {
        const prompt = data.prompt;
        const virtualUserMsg = `[We are playing Truth or Dare. You chose to answer: "${prompt}". Answer the truth/dare prompt in character. Keep it to 1-2 short casual sentences.]`;
        
        botService.getResponse(botUserId, virtualUserMsg).then(botReply => {
          if (!botReply) return;
          if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;

          const delay = botService.getTypingDelay(botReply);
          ws.send(JSON.stringify({ type: 'typing', isTyping: true }));

          setTimeout(() => {
            if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;
            ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

            ws.send(JSON.stringify({
              type: 'message',
              from: 'stranger',
              text: botReply,
              messageId: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
              timestamp: Date.now()
            }));

            setTimeout(() => {
              if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;

              const type = Math.random() < 0.5 ? 'truth' : 'dare';
              const list = type === 'truth' ? TRUTHS : DARES;
              const botPrompt = list[Math.floor(Math.random() * list.length)];

              ws.send(JSON.stringify({
                type: 'game_move',
                game: 'truthdare',
                data: { prompt: `${type === 'truth' ? '🔮 Truth' : '🔥 Dare'}: ${botPrompt}` }
              }));

              const bot = botService.activeBots.get(botUserId);
              if (bot) {
                bot.messages.push({ role: 'assistant', content: `[I asked you: ${botPrompt}]` });
              }
            }, 3000 + Math.random() * 1500);

          }, delay);
        });
      }
      break;
    }
  }
}

function checkTTTWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== null)) return 'draw';
  return null;
}

function getBestTTTMove(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (board[a] === 'O' && board[b] === 'O' && board[c] === null) return c;
    if (board[a] === 'O' && board[c] === 'O' && board[b] === null) return b;
    if (board[b] === 'O' && board[c] === 'O' && board[a] === null) return a;
  }

  for (const [a, b, c] of lines) {
    if (board[a] === 'X' && board[b] === 'X' && board[c] === null) return c;
    if (board[a] === 'X' && board[c] === 'X' && board[b] === null) return b;
    if (board[b] === 'X' && board[c] === 'X' && board[a] === null) return a;
  }

  if (board[4] === null) return 4;

  const corners = [0, 2, 6, 8].filter(i => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

  const free = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) free.push(i);
  }
  return free[Math.floor(Math.random() * free.length)];
}

function simulateDrop(board, col, color) {
  for (let r = 5; r >= 0; r--) {
    if (board[r][col] === null) {
      board[r][col] = color;
      return true;
    }
  }
  return false;
}

function checkC4Winner(board) {
  const rows = 6, cols = 7;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr][nc] !== cell) break;
          count++;
        }
        if (count >= 4) return cell;
      }
    }
  }
  if (board[0].every(cell => cell !== null)) return 'draw';
  return null;
}

function getBestC4Col(board) {
  const validCols = [];
  for (let c = 0; c < 7; c++) {
    if (board[0][c] === null) validCols.push(c);
  }
  if (validCols.length === 0) return -1;

  function checkWinScenario(col, color) {
    const tempBoard = board.map(row => [...row]);
    simulateDrop(tempBoard, col, color);
    return checkC4Winner(tempBoard) === color;
  }

  for (const c of validCols) {
    if (checkWinScenario(c, 'Y')) return c;
  }

  for (const c of validCols) {
    if (checkWinScenario(c, 'R')) return c;
  }

  const preferences = [3, 2, 4, 1, 5, 0, 6];
  for (const c of preferences) {
    if (validCols.includes(c)) return c;
  }

  return validCols[Math.floor(Math.random() * validCols.length)];
}

function getRPSResult(mine, theirs) {
  if (mine === theirs) return 'draw';
  if (
    (mine === 'rock' && theirs === 'scissors') ||
    (mine === 'paper' && theirs === 'rock') ||
    (mine === 'scissors' && theirs === 'paper')
  ) return 'win';
  return 'lose';
}

function sendBotComment(userId, botUserId, commentOptions, ws, delay = 1000) {
  setTimeout(() => {
    if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'typing', isTyping: true }));

    setTimeout(() => {
      if (activePairs.get(userId) !== botUserId || ws.readyState !== 1) return;
      ws.send(JSON.stringify({ type: 'typing', isTyping: false }));

      const text = commentOptions[Math.floor(Math.random() * commentOptions.length)];
      ws.send(JSON.stringify({
        type: 'message',
        from: 'stranger',
        text,
        messageId: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
        timestamp: Date.now()
      }));

      const bot = botService.activeBots.get(botUserId);
      if (bot) {
        bot.messages.push({ role: 'assistant', content: text });
      }
    }, 1200 + Math.random() * 600);
  }, delay);
}

export { server, wss, authService, paymentService };
