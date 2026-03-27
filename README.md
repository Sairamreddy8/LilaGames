# LilaGames: Multiplayer Tic-Tac-Toe

A production-ready, multiplayer Tic-Tac-Toe game built with a **server-authoritative architecture** using **Nakama** as the backend infrastructure and **React** for the frontend.

## 🚀 Live Demo

- **Game URL**: [https://lila-games-iota.vercel.app](https://lila-games-iota.vercel.app)
- **Backend API**: `https://empathetic-serenity-production.up.railway.app`

---

## 🎮 Features

- **Server-Authoritative Logic**: All game state management and move validation happen on the server to prevent cheating.
- **Matchmaking System**:
  - **Quick Match**: Pair with a random player automatically.
  - **Private Rooms**: Create a room and share a 6-digit code with a friend.
  - **Room Discovery**: Browse and join open game rooms.
- **Real-time Gameplay**: Instant state synchronization via WebSockets.
- **Responsive UI**: Optimized for mobile and desktop devices with a premium dark theme.
- **Session Persistence**: Resumes game sessions using device-linked authentication.

---

## 🏗️ Architecture & Design Decisions

### 1. Server-Authoritative Logic

Traditional multiplayer games often trust the client to report hits or moves. In this implementation, the client only sends the **intent** to move (opcode 1). The Nakama server (written in TypeScript/JavaScript) validates the move against the current board state and turn order before broadcasting the updated state (opcode 2) to all clients.

### 2. Backend (Nakama)

- **Tech Stack**: Nakama Server (Go-based) with JavaScript/TypeScript runtime modules.
- **Match Handler**: Custom match loop handles state transitions (Join -> Play -> Win/Draw -> Rematch).
- **RPCs**: Custom Remote Procedure Calls for room lifecycle management (`create_room`, `list_rooms`, `join_by_code`).
- **Database**: PostgreSQL for storing accounts and session data.

### 3. Frontend (React + Vite)

- **Tech Stack**: React 18, Vite, CSS Modules.
- **Nakama Client**: Uses `@heroiclabs/nakama-js` for real-time socket communication.
- **State Management**: React hooks (`useNakama`, `useCallback`, `useEffect`) for managing complex UI states (Start, Lobby, Waiting, Playing, Over).

---

## 🛠️ Setup & Installation

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Node.js](https://nodejs.org/) (v18+)

### Local Development (Recommended)

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Sairamreddy8/LilaGames.git
   cd LilaGames
   ```

2. **Start the Nakama Backend**:

   ```bash
   docker-compose up -d
   ```

   This starts Nakama (port 7350), PostgreSQL, and the custom Tic-Tac-Toe module.

3. **Install & Start the Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   The game will be available at `http://localhost:5173`.

---

## 🚢 Deployment Documentation

### Backend (Railway)

1. Link your GitHub repository to [Railway](https://railway.app/).
2. Add a **PostgreSQL** service.
3. Railway will detect the `Dockerfile` at the root and deploy the Nakama server.
4. Set the following Environment Variables:
   - `NAKAMA_SERVER_KEY`: `defaultkey` (or your chosen secure key)
   - `DATABASE_URL`: (Automatically provided by Railway)

### Frontend (Vercel)

1. Import the repository to [Vercel](https://vercel.com/).
2. Set the **Root Directory** to `client`.
3. Set the following Environment Variables:
   - `VITE_NAKAMA_HOST`: `your-railway-app.up.railway.app`
   - `VITE_NAKAMA_PORT`: `443`
   - `VITE_NAKAMA_SSL`: `true`
   - `VITE_NAKAMA_SERVER_KEY`: `defaultkey`

---

## 🧪 How to Test Multiplayer

1. Open the **Game URL** in two separate browser tabs or devices.
2. **Scenario A: Quick Match**
   - In both tabs, enter a name and click **"Quick Match"**.
   - The server will pair both players and start the game.
3. **Scenario B: Room Code**
   - Tab 1: Click **"Create Room"**, enter a name, and note the 6-digit code.
   - Tab 2: Click **"Join Room"**, enter the code, and click **"Join"**.
4. **Gameplay Verification**:
   - Try making a move when it's not your turn; notice the server rejects it.
   - Complete a game and test the **"Play Again"** (rematch) flow.
   - Close one tab and verify the other player receives an **"Opponent Left"** notification.

---

## 📡 API Configuration

### OpCodes

| OpCode | Name            | Direction        | Description                                  |
| :----- | :-------------- | :--------------- | :------------------------------------------- |
| 1      | `MOVE`          | Client -> Server | Attempts to place a symbol at a board index. |
| 2      | `STATE_SYNC`    | Server -> Client | Full board state synchronization.            |
| 3      | `SYMBOL`        | Server -> Client | Assigns 'X' or 'O' to the player.            |
| 4      | `REMATCH`       | Client -> Server | Requests a rematch after game over.          |
| 6      | `OPPONENT_LEFT` | Server -> Client | Notifies about opponent disconnection.       |
| 9      | `ERROR`         | Server -> Client | Server-side validation error message.        |

---

### [LilaGames](https://github.com/Sairamreddy8/LilaGames)
