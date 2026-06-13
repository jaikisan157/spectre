import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatState, WebSocketMessage } from '@/types/chat';
import { playMatchSound, playMessageSound, playDisconnectSound } from '@/utils/sounds';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// Generate a persistent browser ID for this device
function getBrowserId(): string {
  let id = localStorage.getItem('spectre_browser_id');
  if (!id) {
    id = 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('spectre_browser_id', id);
  }
  return id;
}

// Unique ID generator to avoid duplicate keys
let messageIdCounter = 0;
function generateMessageId(): string {
  messageIdCounter += 1;
  return `${Date.now()}-${messageIdCounter}`;
}

export function useWebSocket(token: string | null = null): {
  connected: boolean;
  chatState: ChatState;
  findMatch: (interests?: string[]) => void;
  cancelSearch: () => void;
  sendMessage: (text: string) => void;
  sendTyping: (isTyping: boolean) => void;
  sendReaction: (messageId: string, emoji: string) => void;
  stopChat: () => void;
  newChat: (interests?: string[]) => void;
  sendReport: (reason: string, description: string, targetId?: string) => void;
  sendGameMessage: (type: string, game: string, data?: unknown) => void;
  setGameHandler: (handler: ((msg: WebSocketMessage) => void) | null) => void;
} {
  const [connected, setConnected] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({
    status: 'idle',
    partnerId: null,
    messages: [],
    isTyping: false,
    errorMessage: '',
    onlineCount: 0,
    interestStats: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMessageRef = useRef<(data: WebSocketMessage) => void>(() => { });
  const isDuplicateTabRef = useRef(false);
  const gameHandlerRef = useRef<((msg: WebSocketMessage) => void) | null>(null);

  const connect = useCallback(() => {
    // Don't reconnect if this tab was kicked as duplicate
    if (isDuplicateTabRef.current) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect loop
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const browserId = getBrowserId();
      let url = `${WS_URL}?browserId=${browserId}`;
      if (token) {
        url += `&token=${encodeURIComponent(token)}`;
      }
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          handleMessageRef.current(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Don't show disconnect or reconnect if kicked as duplicate
        if (isDuplicateTabRef.current) return;

        // If we were in a chat or searching, reset the state
        // because the server has lost our pairing
        setChatState(prev => {
          if (prev.status === 'matched' || prev.status === 'searching') {
            return {
              ...prev,
              status: 'disconnected',
              partnerId: null,
              isTyping: false,
              messages: [
                ...prev.messages,
                {
                  id: generateMessageId(),
                  text: 'Connection lost. Click "New" to reconnect and find a new chat.',
                  sender: 'system',
                  timestamp: Date.now(),
                },
              ],
            };
          }
          return prev;
        });

        // Attempt to reconnect quickly (1.5s)
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 1500);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [token]);

  const handleMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'connected':
        console.log('Connected with userId:', data.userId);
        setChatState(prev => {
          if (prev.status === 'matched' || prev.status === 'searching') {
            return {
              ...prev,
              status: 'disconnected',
              partnerId: null,
              isTyping: false,
              onlineCount: data.onlineCount || prev.onlineCount,
              interestStats: data.interests || prev.interestStats,
              messages: [
                ...prev.messages,
                {
                  id: generateMessageId(),
                  text: 'Reconnected to server. Click "New" to start a new chat.',
                  sender: 'system',
                  timestamp: Date.now(),
                },
              ],
            };
          }
          return {
            ...prev,
            onlineCount: data.onlineCount || prev.onlineCount,
            interestStats: data.interests || prev.interestStats,
          };
        });
        break;

      case 'interest_stats':
        setChatState(prev => ({
          ...prev,
          interestStats: data.interests,
        }));
        break;

      case 'waiting':
        setChatState(prev => {
          // Filter out any previous "Looking for" messages to avoid duplicates
          const filteredMessages = prev.messages.filter(
            m => !(m.sender === 'system' && m.text.includes('Looking for'))
          );
          return {
            ...prev,
            status: 'searching',
            messages: [
              ...filteredMessages,
              {
                id: generateMessageId(),
                text: data.message,
                sender: 'system',
                timestamp: Date.now(),
              },
            ],
          };
        });
        break;

      case 'matched':
        playMatchSound();
        setChatState(prev => ({
          ...prev,
          status: 'matched',
          partnerId: data.partnerId,
          isTyping: false,
          messages: [
            // Remove the "Looking for someone..." waiting message
            ...prev.messages.filter(m => !(m.sender === 'system' && m.text.includes('Looking for'))),
            {
              id: generateMessageId(),
              text: data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'message':
        // If we receive a message, we're definitely in an active chat
        // Restore 'matched' status if it was accidentally changed
        playMessageSound();
        setChatState(prev => ({
          ...prev,
          status: 'matched',
          isTyping: false,
          messages: [
            ...prev.messages,
            {
              id: data.messageId || generateMessageId(),
              text: data.text,
              sender: 'stranger',
              timestamp: data.timestamp,
            },
          ],
        }));
        break;

      case 'message_sent':
        setChatState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: data.messageId || generateMessageId(),
              text: data.text,
              sender: 'user',
              timestamp: data.timestamp,
            },
          ],
        }));
        break;

      case 'partner_disconnected':
        playDisconnectSound();
        setChatState(prev => ({
          ...prev,
          status: 'disconnected',
          partnerId: null,
          isTyping: false,
          messages: [
            ...prev.messages,
            {
              id: generateMessageId(),
              text: data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'chat_ended':
        setChatState(prev => ({
          ...prev,
          status: 'idle',
          partnerId: null,
          isTyping: false,
          messages: [
            ...prev.messages,
            {
              id: generateMessageId(),
              text: data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'search_cancelled':
        setChatState(prev => ({
          ...prev,
          status: 'idle',
          messages: [
            ...prev.messages,
            {
              id: generateMessageId(),
              text: 'Search cancelled.',
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'search_timeout':
        setChatState(prev => ({
          ...prev,
          status: 'idle',
          messages: [
            ...prev.messages,
            {
              id: generateMessageId(),
              text: data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'typing':
        setChatState(prev => ({
          ...prev,
          isTyping: data.isTyping,
        }));
        break;

      case 'online_count':
        setChatState(prev => ({
          ...prev,
          onlineCount: data.count,
        }));
        break;

      case 'reaction_received':
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === data.messageId
              ? {
                ...msg,
                // Replace stranger's previous reaction (only one allowed)
                reactions: [
                  ...(msg.reactions || []).filter(r => r.from !== 'stranger'),
                  { emoji: data.emoji, from: 'stranger' as const },
                ],
              }
              : msg
          ),
        }));
        break;

      case 'duplicate_tab':
        // This tab was replaced by a new tab — stop reconnecting
        isDuplicateTabRef.current = true;
        setChatState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: data.message,
          messages: [
            {
              id: generateMessageId(),
              text: '⚠️ ' + data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'report_submitted':
        setChatState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: generateMessageId(),
              text: '🛡️ ' + data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'report_error':
        setChatState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: generateMessageId(),
              text: '⚠️ ' + data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'banned':
        setChatState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: data.message,
          messages: [
            {
              id: generateMessageId(),
              text: '🚫 ' + data.message,
              sender: 'system',
              timestamp: Date.now(),
            },
          ],
        }));
        break;

      case 'error':
        setChatState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: data.message,
        }));
        break;

      default:
        // Forward game messages to game handler
        if (gameHandlerRef.current && data.type.startsWith('game_')) {
          gameHandlerRef.current(data);
        } else {
          console.log('Unknown message type:', data);
        }
    }
  };

  // Keep ref in sync so WebSocket closure always uses latest handler
  handleMessageRef.current = handleMessage;

  const findMatch = useCallback((interests?: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Clear messages and set searching state
      setChatState(prev => ({
        ...prev,
        status: 'searching',
        partnerId: null,
        messages: [],
        isTyping: false,
        errorMessage: '',
      }));

      wsRef.current.send(JSON.stringify({
        type: 'find_match',
        interests: interests || [],
      }));
    }
  }, []);

  const cancelSearch = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel_search' }));
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        text: text.trim(),
      }));
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        isTyping,
      }));
    }
  }, []);

  const stopChat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_chat' }));
    }
  }, []);

  const newChat = useCallback((interests?: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Clear messages and set searching state
      setChatState(prev => ({
        ...prev,
        status: 'searching',
        partnerId: null,
        messages: [],
        isTyping: false,
        errorMessage: '',
      }));

      wsRef.current.send(JSON.stringify({
        type: 'new_chat',
        interests: interests || [],
      }));
    }
  }, []);

  const sendReport = useCallback((reason: string, description: string, targetId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'report',
        reason,
        description,
        targetId,
      }));
    }
  }, []);

  useEffect(() => {
    connect();

    // Proactively close WebSocket when tab/browser is closed
    const handleUnload = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload); // better mobile support

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction',
        messageId,
        emoji,
      }));
      // Replace user's previous reaction (only one allowed)
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId
            ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []).filter(r => r.from !== 'user'),
                { emoji, from: 'user' as const },
              ],
            }
            : msg
        ),
      }));
    }
  }, []);

  const sendGameMessage = useCallback((type: string, game: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, game, data }));
    }
  }, []);

  const setGameHandler = useCallback((handler: ((msg: WebSocketMessage) => void) | null) => {
    gameHandlerRef.current = handler;
  }, []);

  return {
    connected,
    chatState,
    findMatch,
    cancelSearch,
    sendMessage,
    sendTyping,
    sendReaction,
    stopChat,
    newChat,
    sendReport,
    sendGameMessage,
    setGameHandler,
  };
}
