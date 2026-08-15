# Multiplayer Games Hub

[![CI](https://github.com/kethankumar667/Balyam/actions/workflows/ci.yml/badge.svg)](https://github.com/kethankumar667/Balyam/actions/workflows/ci.yml)

A web-based multiplayer game lounge where friends and family join a room via code and play together with text + voice chat.

You can start playing without an account — a guest gets every game against bots
and can join any room they're invited to. An account is what lets you open a
room of your own and hand out the code. See
[Accounts & guest permissions](#accounts--guest-permissions).

## Games

Eighteen games ship in `GameKind` (`shared/types.ts`); the home catalog
(`client/src/components/bhalyam/data.ts`) additionally carries five
"coming soon" tiles that route nowhere.

| Category | Games |
|---|---|
| **Board & cards** | Ludo, Snakes & Ladders, Rummy, UNO, Carrom, Chess, Dots & Boxes |
| **Party & quiz** | Bingo, Tambola, Star Game, Name-Place-Animal |
| **Arcade & quick** | Rock Paper Scissors, Hand Cricket, Snake, Block Blast, Space War, Road Rash |
| **Classroom** | Word Building |

The Samethalu and Telugu Cinema quizzes were removed — engines, boards,
question banks and wiring are all gone. Their tiles and icons deliberately
remain in the catalog as "coming soon" entries, so the artwork survives and
the slugs stay available if either is rebuilt.

Two allow-lists worth knowing, both enforced server-side:

- **No bots:** Snake, Road Rash, Space War — these are solo/arcade, so there
  is no AI opponent to add.
- **Pass & Play** (several humans, one device): Ludo, Snakes & Ladders, Word
  Building, Dots & Boxes only. Restricted to open-information games on
  purpose — Rummy or UNO would show one player's hand to whoever is holding
  the phone.

## Tech Stack
- **Frontend:** React + Vite + TypeScript + TailwindCSS + Zustand
- **Backend:** Node.js + Express + Socket.IO + TypeScript
- **Database:** none yet. Postgres + Prisma is the chosen stack for durable accounts and profiles; the layer no-ops while `DATABASE_URL` is unset, so local dev needs no database. (An earlier note here said MongoDB; that was never built.)
- **Auth:** seats are authenticated — a server-signed seat token owns the seat (`server/src/lib/seatToken.ts`). On top of that sits a guest/member distinction that is **device-local and unverified**; read [Accounts & guest permissions](#accounts--guest-permissions) before relying on it for anything.
- **Voice:** WebRTC peer-to-peer using the browser's native `RTCPeerConnection` (`client/src/lib/webrtc.ts`), mesh topology, server-relayed signalling. (`simple-peer` was the original plan and is not a dependency.)
- **Hosting:** both the client and the server run on Render's free tier. Note the asymmetry: a static site never sleeps, a free web service spins down after ~15 minutes idle, so the page can load instantly while the first socket connection waits on a cold boot.

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

**As a guest** (the default — no account, nothing to set up):
1. Open http://localhost:5173, pick a game tile.
2. The primary button reads **Play vs Bots**. Click it.
3. Add a bot or two, click **I'm Ready**, then **Start Game**.

There is no room code on that table, because nobody else can join it. To play
with another window you need an account.

**With an account** (still no database required — see the honesty note below):
1. Go to **/signup**, fill in name / email / password, submit. You are now a
   "member" on this device.
2. Pick a game tile → the button now reads **Create Room** → copy the code.
3. In a second window, clear `localStorage` (so it is a guest) and open
   `/room/<CODE>`. It asks the guest to declare a name, then seats them.
4. Both click **Ready** → play. Use the chat panel to message each other.

## Accounts & guest permissions

The product rule is **a guest can play, a guest cannot gather.**

| Can they… | Guest | Member |
|---|---|---|
| Every game vs bots · Pass & Play · solo arcade | ✅ | ✅ |
| Edit display name and avatar | ✅ | ✅ |
| Join a room they were invited to (link or QR) | ✅ | ✅ |
| Text chat · voice chat · reactions | ✅ | ✅ |
| Open a room others can join, and share its code | 🔒 | ✅ |
| Type a room code to go find a table | 🔒 | ✅ |
| Party Mode — put a room on a TV (`/tv/:code`) | 🔒 | ✅ |

`shared/permissions.ts` is the single source of truth; `capabilitiesFor(kind)`
returns the capability set and every gate in the app reads it rather than
testing "is this a guest?" inline.

**How it is enforced.** A room opened by a guest is **sealed** on the server:
`joinRoom` and `spectateRoom` both refuse it. So "a guest can't invite anyone"
is a property of the room rather than a rule re-implemented behind each
button. Sealing is one-way, and it deliberately runs *after* the seat-reclaim
check — a sealed room still lets its own host back in after a refresh, and
still accepts bots and Pass & Play seats, which share the host's socket rather
than arriving through the door.

**A guest joins by invitation, not by search.** Following an invite link or
scanning the host's QR both work; typing a code into a box does not. The two
are mechanically identical, so this buys no security — it keeps the
living-room party working for the friend who has not signed up, while the
"go find a table" affordance stays behind the account. On arriving in someone
else's room a guest declares a name before being seated (once per room; a
refresh mid-match does not re-prompt).

### Accounts

Accounts run on [Supabase](https://supabase.com) — its free tier is a Postgres
database, an auth service and a mailer, which is all an account needs and costs
nothing to run. The client talks to it directly; **the game server never sees a
password and holds no database**.

Set two variables in `client/.env` and sign-in is real:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Then one of these in `server/.env`, so the server can check that a player
claiming to be signed in actually is:

```
SUPABASE_JWT_SECRET=<project JWT secret>     # preferred: verified in-process
# or, for projects on asymmetric signing keys:
SUPABASE_URL=…
SUPABASE_ANON_KEY=…
```

Full setup — migration, redirect URLs, Google sign-in, and the email rate
limit that will catch you out — is in
[`docs/runbooks/supabase.md`](docs/runbooks/supabase.md).

What this buys, beyond a login:

- **`hostKind` is no longer a claim the server takes on faith.** A browser can
  still send `hostKind: "member"`, but with verification configured it is
  checked against the session token and an unverifiable claim is treated as a
  guest. The permission model above becomes enforceable rather than
  cooperative.
- **Your name and avatar follow the account**, not the browser, via a
  `profiles` row.
- **"Erase my data" deletes the account too**, through a `security definer`
  function that removes exactly the calling user — so the app never needs a
  service-role key to honour a DPDP erasure request.

**With the variables unset, nothing above happens and that is a supported
state.** `npm run dev` still needs zero infrastructure: signing in flips a
device-local flag (`bhalyam.account`) that checks no password, every affected
screen says so on the page rather than faking success, and the seat tokens —
which are real cryptography and independent of all of this — keep doing the
only job that ever protected anything.

Apple sign-in remains honestly inert: it needs a paid Apple developer account.

## Current Status
- [x] Express + Socket.IO server with TypeScript
- [x] React client with Vite + TypeScript + Tailwind
- [x] Room create / join via 6-char codes
- [x] Real-time text chat, reactions, soundboard
- [x] Player list with ready state
- [x] Eighteen games, all server-authoritative (see [Games](#games))
- [x] Bots as first-class players; Pass & Play on four open-information games
- [x] Disconnect/reconnect grace period (90 seconds) + game state re-emit on rejoin
- [x] Server takeover of idle/disconnected seats, handed back on return
- [x] WebRTC peer-to-peer voice chat (native API, Google STUN, mesh topology)
- [x] Authenticated seats via server-signed seat tokens
- [x] Guest / member permission model with server-sealed guest rooms
- [x] DPDP surfaces: consent record, data inventory, export and erase
- [x] **581 server tests + 264 client tests** (vitest)

Not done: a verified account backend (see the honesty note above), persistence
of any kind (rooms live in server memory and die with the process), and a TURN
server for players behind symmetric NATs.

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

### Ludo rules implemented
- 2–4 players, colors assigned in join order (red → green → yellow → blue).
- 4 tokens per player. Roll a 6 to bring a token onto the track.
- 52-square track; each color enters at a fixed start (red=0, green=13, yellow=26, blue=39).
- Land on an opponent on a non-safe square → opponent's token returns to yard.
- Safe squares: the 4 starts + 4 mid-track squares (8, 21, 34, 47).
- Roll of 6 grants a bonus turn. Three 6s in a row forfeits the turn.
- Each player has a 6-square home stretch; exact roll required to enter home.
- Win: get all 4 tokens home.

## Tests
```bash
cd server && npm test    # 581 tests
cd client && npm test    # 264 tests
```
Type-check either side with `npm run typecheck`.

Guest permissions are pinned by `server/src/rooms/__tests__/guestSealedRoom.test.ts`
— sealed rooms, the host's own reclaim, bots and Pass & Play still being
admitted, and host migration sealing a room that lands on a guest.

## Roadmap
This project is planned as a long-running effort. See [ROADMAP.md](./ROADMAP.md)
for the full 10-year vision, architecture principles, decision records, risks
and cost projections. Short version of what's next:

- **Phase A (now):** public deploy
- **Phase B:** persistent rooms, CI, monitoring, and **real accounts** — the
  guest/member permission model is built, but sign-in still needs a verified
  backend (`DATABASE_URL` + Google OAuth credentials)
- **Phase C:** mobile-responsive + PWA + i18n + AI bots
- **Phase D:** friends, achievements, ratings, replays, spectator
- **Phase E:** scale-out (Redis, multi-region, SFU)
- **Phase F:** platform / SDK / mobile native

See the original plan for full architectural details.
