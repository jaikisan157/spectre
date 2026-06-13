export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'stranger' | 'system';
  timestamp: number;
  reactions?: { emoji: string; from: 'user' | 'stranger' }[];
}

export interface InterestStat {
  name: string;
  count: number;
}

export type Gender = 'male' | 'female' | 'any';

export interface AuthUser {
  username: string;
  displayName: string;
  isPremium: boolean;
  premiumExpiry: number | null;
  isBanned: boolean;
  banReason: string | null;
  createdAt: number;
}

export interface ChatState {
  status: 'idle' | 'searching' | 'matched' | 'disconnected' | 'error';
  partnerId: string | null;
  messages: Message[];
  isTyping: boolean;
  errorMessage: string;
  onlineCount: number;
  interestStats: InterestStat[];
}

export type WebSocketMessage =
  | { type: 'connected'; userId: string; onlineCount: number; interests?: InterestStat[] }
  | { type: 'interest_stats'; interests: InterestStat[] }
  | { type: 'waiting'; message: string }
  | { type: 'matched'; partnerId: string; message: string }
  | { type: 'message'; from: 'stranger'; text: string; messageId: string; timestamp: number }
  | { type: 'message_sent'; text: string; messageId: string; timestamp: number }
  | { type: 'partner_disconnected'; message: string }
  | { type: 'chat_ended'; message: string }
  | { type: 'search_cancelled' }
  | { type: 'search_timeout'; message: string }
  | { type: 'typing'; isTyping: boolean }
  | { type: 'online_count'; count: number }
  | { type: 'reaction'; messageId: string; emoji: string }
  | { type: 'reaction_received'; messageId: string; emoji: string }
  | { type: 'duplicate_tab'; message: string }
  | { type: 'game_invite'; game: string; data?: unknown }
  | { type: 'game_accept'; game: string; data?: unknown }
  | { type: 'game_decline'; game: string; data?: unknown }
  | { type: 'game_move'; game: string; data: unknown }
  | { type: 'game_leave'; game: string; data?: unknown }
  | { type: 'report_submitted'; message: string }
  | { type: 'report_error'; message: string }
  | { type: 'banned'; message: string }
  | { type: 'error'; message: string };

export type GameType = 'tictactoe' | 'rps' | 'truthdare' | 'wyr' | 'connect4' | 'snake';

export interface UseWebSocketReturn {
  connected: boolean;
  chatState: ChatState;
  findMatch: (interests?: string[]) => void;
  cancelSearch: () => void;
  sendMessage: (text: string) => void;
  sendTyping: (isTyping: boolean) => void;
  sendReaction: (messageId: string, emoji: string) => void;
  stopChat: () => void;
  newChat: (interests?: string[]) => void;
  sendGameMessage: (type: string, game: string, data?: unknown) => void;
}
