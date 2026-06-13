# 🌑 Spectre

An anonymous text chat application with a black + neon hacker aesthetic. Talk to strangers in real-time with no accounts, no history — just pure anonymous conversation.

![Spectre](https://your-screenshot-url.com)

## ✨ Features

- **Anonymous Chat** - No registration, no accounts, no data stored
- **Real-time Messaging** - WebSocket-powered instant message delivery
- **Smart Matchmaking** - Queue-based system pairs you with random strangers
- **Typing Indicators** - See when your match is typing
- **Neon Noir Design** - Edgy black + cyan aesthetic with grain overlay and vignette
- **Keyboard Shortcuts**:
  - `Space` - Start chat from landing page
  - `Enter` - Send message
  - `Escape` - Stop current chat
  - `Ctrl/Cmd + N` - Start new chat

## 🎨 Design System

| Element | Color |
|---------|-------|
| Background | `#000000` (Pure black) |
| Chat Area | `#0B0B0B` (Near black) |
| User Messages | `#00F0FF` (Neon cyan) |
| Stranger Messages | `#1A1A1A` (Dark gray) |
| Accent | `#00F0FF` (Electric cyan) |
| Text Primary | `#F6F6F6` (Off-white) |
| Text Secondary | `#B8B8B8` (Muted gray) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/spectre.git
cd spectre
```

2. Install dependencies:
```bash
npm install
```

3. Start the WebSocket server:
```bash
npm run server
```

4. In a new terminal, start the React dev server:
```bash
npm run dev
```

5. Open `http://localhost:5173` in your browser

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_WS_URL=ws://localhost:3001
```

For production, set your WebSocket server URL.

## 📁 Project Structure

```
spectre/
├── server/
│   ├── index.js          # Server entry point
│   └── websocket.js      # WebSocket server & matchmaking logic
├── src/
│   ├── sections/
│   │   ├── HeroSection.tsx   # Landing page
│   │   └── ChatSection.tsx   # Chat interface
│   ├── hooks/
│   │   └── useWebSocket.ts   # WebSocket connection hook
│   ├── types/
│   │   └── chat.ts           # TypeScript types
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── dist/                 # Production build
└── package.json
```

## 🔧 WebSocket Server

The WebSocket server handles:

- **Connection Management** - Maintains active connections with auto-reconnect
- **Matchmaking Queue** - FIFO queue for pairing users
- **Message Routing** - Delivers messages between matched pairs
- **Typing Indicators** - Real-time typing status
- **Disconnection Handling** - Graceful cleanup on disconnect

### API Messages

**Client → Server:**
- `find_match` - Join matchmaking queue
- `cancel_search` - Leave queue
- `message` - Send text message
- `typing` - Send typing indicator
- `stop_chat` - End current chat
- `new_chat` - Start new search

**Server → Client:**
- `connected` - Connection established
- `waiting` - In matchmaking queue
- `matched` - Paired with stranger
- `message` - Received message
- `partner_disconnected` - Stranger left
- `chat_ended` - Chat terminated

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **Animations**: GSAP + ScrollTrigger
- **Backend**: Node.js + WebSocket (ws library)
- **Icons**: Lucide React

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start React dev server |
| `npm run server` | Start WebSocket server |
| `npm run dev:full` | Start both servers concurrently |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 📝 License

MIT License - feel free to use this for your own projects!

---

Built for curiosity, not for keeps. ⚡
