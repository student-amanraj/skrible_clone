# 🎨 Skribbl.io Clone — MERN Stack

A real-time multiplayer drawing and guessing game built with MongoDB, Express, React, and Node.js.

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React + Vite (JavaScript)           |
| Canvas     | HTML5 Canvas API                    |
| Backend    | Node.js + Express                   |
| Real-time  | Socket.IO                           |
| Database   | MongoDB + Mongoose                  |

## Project Structure

```
skribbl-clone/
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas.jsx        # Drawing canvas + toolbar
│   │   │   ├── Chat.jsx          # Chat & guessing input
│   │   │   ├── GameHeader.jsx    # Round info, timer, word mask
│   │   │   ├── GameOver.jsx      # Final leaderboard
│   │   │   ├── Lobby.jsx         # Pre-game lobby
│   │   │   ├── RoundEnd.jsx      # Round summary overlay
│   │   │   ├── Scoreboard.jsx    # Player scores sidebar
│   │   │   └── WordSelection.jsx # Word picker for drawer
│   │   ├── context/
│   │   │   ├── GameContext.jsx   # Game state (useReducer)
│   │   │   └── SocketContext.jsx # Socket.IO instance
│   │   ├── hooks/
│   │   │   ├── useCanvas.js      # Canvas drawing logic
│   │   │   └── useGameSocket.js  # Socket event → state mapping
│   │   └── pages/
│   │       ├── Home.jsx          # Create/join room
│   │       └── Game.jsx          # Main game layout
│   └── index.html
└── server/
    └── src/
        ├── classes/
        │   ├── Game.js           # Rounds, scoring, hints, word logic
        │   ├── GameRoom.js       # Room management, player tracking
        │   └── Player.js         # Player model
        ├── data/
        │   └── words.js          # Word list (150+ words)
        ├── models/
        │   └── Room.js           # Mongoose Room schema
        ├── routes/
        │   └── rooms.js          # REST: GET /api/rooms
        ├── socket/
        │   └── handlers.js       # All Socket.IO event handlers
        └── index.js              # Express + Socket.IO server entry
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)

### 1. Clone and install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment variables

**Server** — copy `.env.example` to `.env`:
```bash
cd server
cp .env.example .env
```
Edit `.env`:
```
PORT=3001
MONGO_URI=mongodb://localhost:27017/skribbl
CLIENT_URL=http://localhost:5173
```

**Client** — copy `.env.example` to `.env`:
```bash
cd client
cp .env.example .env
```
Edit `.env`:
```
VITE_SERVER_URL=http://localhost:3001
```

### 3. Run the app

Open two terminals:

```bash
# Terminal 1 — Server
cd server
npm run dev

# Terminal 2 — Client
cd client
npm run dev
```

Open http://localhost:5173 in two browser windows to test multiplayer.

## Features

- ✅ Create / join rooms with a 6-character code
- ✅ Configurable settings (players, rounds, draw time, hints)
- ✅ Real-time canvas drawing with Socket.IO
- ✅ Word selection (drawer picks from 3 options)
- ✅ Guess detection with score calculation (faster = more points)
- ✅ Hint system (letters revealed over time)
- ✅ Chat + guess messages
- ✅ Round end + game over screens
- ✅ Undo / clear canvas (drawer only)
- ✅ Canvas replay for late joiners
- ✅ OOP server architecture (Game, GameRoom, Player classes)

## Socket.IO Events

### Client → Server
| Event          | Payload                            |
|----------------|------------------------------------|
| `create_room`  | `{ playerName, settings }`         |
| `join_room`    | `{ roomId, playerName }`           |
| `start_game`   | `{ roomId }`                       |
| `word_chosen`  | `{ roomId, word }`                 |
| `draw_start`   | `{ roomId, x, y, color, size }`    |
| `draw_move`    | `{ roomId, x, y }`                 |
| `draw_end`     | `{ roomId }`                       |
| `canvas_clear` | `{ roomId }`                       |
| `draw_undo`    | `{ roomId }`                       |
| `guess`        | `{ roomId, text }`                 |
| `chat`         | `{ roomId, text }`                 |

### Server → Client
| Event            | Description                          |
|------------------|--------------------------------------|
| `room_created`   | Room created confirmation            |
| `room_joined`    | Joined room confirmation             |
| `player_joined`  | New player joined                    |
| `game_started`   | Game begins                          |
| `round_start`    | New round, drawer gets word options  |
| `word_chosen`    | Word chosen, mask sent to guessers   |
| `timer_update`   | Countdown tick                       |
| `draw_data`      | Stroke broadcast to viewers          |
| `draw_undo`      | Replay history after undo            |
| `hint_reveal`    | Letter revealed in word mask         |
| `guess_result`   | Correct/incorrect guess + scores     |
| `chat_message`   | Chat message broadcast               |
| `round_end`      | Round finished, word revealed        |
| `game_over`      | Game finished, final leaderboard     |

## Deployment (Render)

1. Push to GitHub
2. Create a **Web Service** for `server/` on [Render](https://render.com)
   - Build: `npm install`
   - Start: `npm start`
   - Add env vars: `MONGO_URI`, `CLIENT_URL`
3. Create a **Static Site** for `client/` on Render
   - Build: `npm install && npm run build`
   - Publish dir: `dist`
   - Add env var: `VITE_SERVER_URL`

Live URL: **https://your-skribbl-clone.onrender.com**
