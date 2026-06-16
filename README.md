# Multiplayer Games Hub

A web-based multiplayer game lounge where friends and family join a room via code and play together with text + voice chat.

## Planned Games
- Rock Paper Scissors (Phase 1 — implemented)
- Rummy (Phase 3)
- Ludo (Phase 4)
- Snakes & Ladders (Phase 5)
- Hand Cricket (Phase 5)

## Tech Stack
- **Frontend:** React + Vite + TypeScript + TailwindCSS + Zustand
- **Backend:** Node.js + Express + Socket.IO + TypeScript
- **Database:** MongoDB (added in Phase 6 for optional accounts)
- **Voice:** WebRTC peer-to-peer via `simple-peer` (Phase 2)
- **Hosting:** Frontend on Vercel, Backend on Render

## Project Structure
```
MultiplayerGames/
├── client/          # React frontend
├── server/          # Node + Socket.IO backend
└── shared/          # Shared TypeScript types
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### 1. Install dependencies
Open two terminals.

**Terminal 1 — server:**
```bash
cd server
npm install
```

**Terminal 2 — client:**
```bash
cd client
npm install
```

### 2. Run in development
**Terminal 1:**
```bash
cd server
npm run dev
```
Server runs on http://localhost:4000

**Terminal 2:**
```bash
cd client
npm run dev
```
Client runs on http://localhost:5173

### 3. Try it
1. Open http://localhost:5173 in two browser windows (or share via local IP / ngrok).
2. In window 1: enter a name → click **Create Room** → copy the room code.
3. In window 2: enter a name → paste the code → click **Join Room**.
4. Both click **Ready** → play Rock Paper Scissors best-of-3.
5. Use the chat panel to message each other.

## Current Status — Phases 1–4 Complete
- [x] Express + Socket.IO server with TypeScript
- [x] React client with Vite + TypeScript + Tailwind
- [x] Room create / join via 6-char codes
- [x] Real-time text chat
- [x] Player list with ready state
- [x] Rock Paper Scissors (best-of-3, server-authoritative)
- [x] Disconnect/reconnect grace period (90 seconds) + game state re-emit on rejoin
- [x] WebRTC peer-to-peer voice chat (native API, Google STUN, mesh topology)
- [x] Rummy (13-card Indian, points variant, 2–6 players)
- [x] **Ludo** (2–4 players, dice, captures, safe squares, home stretch)
- [x] 31 server engine unit tests (vitest)

### Voice chat notes
- Click **🎙 Connect mic** in the room to join the voice mesh. Browser will prompt for mic permission.
- Mesh works well up to ~6 participants. Beyond that, switch to an SFU (mediasoup) — deferred.
- For users on strict/symmetric NATs, add a TURN server (free tier at metered.ca) to `ICE_SERVERS` in `client/src/lib/webrtc.ts`.
- Microphone access requires either `localhost` or **HTTPS** in production — Render and Vercel provide HTTPS automatically.

### Rummy rules implemented
- 2 standard decks (104 cards) shuffled per game.
- Each player dealt 13 cards; one card from the remaining deck becomes the **wild joker** — any card matching that rank acts as a wild card.
- On your turn: draw from the closed deck or the top of the discard pile, then discard one card or declare.
- Valid declaration: 13 cards arranged into melds with **at least one pure sequence** and **at least two sequences total**.
- Sets: 3–4 cards of the same rank with distinct suits (jokers can substitute).
- Scoring: winner = 0; losers pay the points of their unmatched cards (capped at 80). Invalid declare = 80-point penalty.
- Engine logic lives in `server/src/games/rummy/` with 25 unit tests in `__tests__/`.

## Server tests
```bash
cd server
npm test
```

### Ludo rules implemented
- 2–4 players, colors assigned in join order (red → green → yellow → blue).
- 4 tokens per player. Roll a 6 to bring a token onto the track.
- 52-square track; each color enters at a fixed start (red=0, green=13, yellow=26, blue=39).
- Land on an opponent on a non-safe square → opponent's token returns to yard.
- Safe squares: the 4 starts + 4 mid-track squares (8, 21, 34, 47).
- Roll of 6 grants a bonus turn. Three 6s in a row forfeits the turn.
- Each player has a 6-square home stretch; exact roll required to enter home.
- Win: get all 4 tokens home.

## Roadmap
This project is planned as a long-running effort. See [ROADMAP.md](./ROADMAP.md)
for the full 10-year vision, architecture principles, decision records, risks
and cost projections. Short version of what's next:

- **Phase A (now):** finish Snakes & Ladders + Hand Cricket; public deploy
- **Phase B:** persistent rooms, optional accounts, CI, monitoring
- **Phase C:** mobile-responsive + PWA + i18n + AI bots
- **Phase D:** friends, achievements, ratings, replays, spectator
- **Phase E:** scale-out (Redis, multi-region, SFU)
- **Phase F:** platform / SDK / mobile native

See the original plan for full architectural details.
