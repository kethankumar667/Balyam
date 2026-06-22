# AGENTS.md — MultiplayerGames (BHALYAM)

Operating manual for AI coding assistants working inside `MultiplayerGames/`. Everything in this document is derived from the actual code in this repository — no aspirational guidance. When in doubt, read the file referenced in the relevant section.

---

## 1. Project Overview

**BHALYAM** is a web-based multiplayer game lounge. Players land on the home page, pick a tile (Hand Cricket, Ludo, Snakes & Ladders, Rummy, RPS, UNO, Word Building, Dots & Boxes, Memory Match), and either create a 6-character room code or join an existing one. Once in a room they can chat, voice-chat (mesh WebRTC), invite bots, run "pass & play" local seats, and play a server-authoritative round of the chosen game with a rematch loop.

**High-level architecture**

- **Client** — Vite + React 18 SPA with React Router. Renders the lobby, room shell, and a per-game `<Board>` component. State held in a single Zustand store and in component-local React state. Talks to the server over one persistent Socket.IO connection.
- **Server** — Node 20+ Express server hosting a Socket.IO endpoint plus a `/health` route. Game logic lives behind a `GameEngine` interface; the `RoomManager` owns all room state, turn timers, bot scheduling, and rematch negotiation. Server is the source of truth — clients never compute valid moves locally.
- **Shared** — A single TypeScript module (`shared/types.ts`) exporting every game state shape, socket payload, default-options constant, and the `ClientToServerEvents` / `ServerToClientEvents` socket contract. Imported by both client and server via the `@shared/*` path alias.
- **Voice** — Optional. Peer-to-peer WebRTC mesh with signalling relayed by the server (`webrtc:signal` events). STUN-only by default; TURN is documented as an opt-in if needed.

---

## 2. Tech Stack

Detected from `package.json`, config files, and source imports.

| Layer | Choice |
|---|---|
| Frontend framework | React 18.3 |
| Build tool (client) | Vite 5 (`@vitejs/plugin-react`) |
| Routing | `react-router-dom` v6 (`Routes` / `Route` / `useLocation` / `useParams`) |
| State management | Zustand 4 (single `useRoomStore`) + React local state |
| Networking (client) | `socket.io-client` 4 |
| Animation | `framer-motion` 12, `gsap` 3 (`GsapSplitHeadline.tsx`), CSS keyframes in Tailwind |
| Audio | `howler` 2 (managed by a singleton `AudioManager`) |
| Drag-drop polyfill | `drag-drop-touch` (Rummy hand re-ordering on touch) |
| Backend framework | Express 4 + `http.createServer` |
| Realtime | `socket.io` 4 |
| Language | TypeScript 5 (strict mode, ESM, `module: "ESNext"`, `moduleResolution: "Bundler"`) |
| Backend runtime | Node 20+ ESM (`"type": "module"` in both `package.json`s) |
| Dev runner (server) | `tsx watch src/index.ts` |
| Build (server) | `tsc && tsc-alias` (rewrites `@shared/*` to relative paths in `dist/`) |
| ID generation | `nanoid` (room code generator) |
| Word lists | `an-array-of-english-words`, `popular-english-words` |
| Styling | TailwindCSS 3 (JIT, `darkMode: ["class", '[data-theme="dark"]']`) + a hand-written design-token layer in `client/src/index.css` |
| Testing | Vitest 1 (server only — no client test setup detected) |
| Linting / formatting | **Not present in the repository.** No ESLint config, no Prettier config. Code style is established by convention. |
| Database | **None.** All room state is in-memory inside `RoomManager`. The top-level README mentions MongoDB as a "Phase 6" idea, but no Mongo client, schema, or connection code exists. |
| Auth | **None.** There is no login flow; player identity is a `playerId` string persisted to `localStorage` (`mpg.playerId`) so a refresh keeps a player's seat. |
| Hosting (per README) | Vercel (client), Render (server) |

---

## 3. Project Structure

```
MultiplayerGames/
├── AGENTS.md                  # this file
├── README.md                  # human-facing overview, quick start
├── ROADMAP.md                 # long-range plan (not load-bearing for AI)
├── client/                    # React + Vite SPA
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js     # design tokens + bhalyam.* palette + custom keyframes
│   ├── postcss.config.js
│   ├── tsconfig.json          # references ../shared via "@shared/*" path
│   ├── vite.config.ts         # @shared alias, host: true for LAN testing
│   ├── public/                # static assets served as-is
│   ├── scripts/
│   │   └── extractBoardPositions.mjs   # one-off tool to extract Ludo SVG coords
│   └── src/
│       ├── main.tsx           # React root
│       ├── App.tsx            # routes + global ScrollToTopOnRouteChange
│       ├── index.css          # Tailwind layer + CSS custom properties (design tokens)
│       ├── vite-env.d.ts
│       ├── assets/            # images, audio theme manifests
│       ├── components/        # shared (non-game) UI
│       │   ├── bhalyam/       # branded shell: logo, GameRoomSheet, JoinRoomModal, data.ts (game catalog)
│       │   ├── AudioSettings/ # audio panel
│       │   ├── GlobalSettings/# global settings panel (theme, haptics, etc.)
│       │   ├── Chat.tsx       # in-room chat
│       │   ├── ChatMessageToast.tsx
│       │   ├── CoinColorPicker.tsx
│       │   ├── LudoColorPicker.tsx
│       │   ├── CountUp.tsx
│       │   ├── GameArena.tsx
│       │   ├── GsapSplitHeadline.tsx
│       │   ├── InlineRoomRail.tsx
│       │   ├── PassPhoneGate.tsx          # Pass & Play "hand the phone over" intermission
│       │   ├── PlayerList.tsx
│       │   ├── RematchPanel.tsx
│       │   ├── RevealOnScroll.tsx
│       │   ├── RoomCode.tsx               # compact code chip for header
│       │   ├── RoomCodeShare.tsx          # hero share card (copy + Web Share + WhatsApp)
│       │   ├── TurnTimeWarning.tsx        # shared 10-second pulsing-border warning
│       │   └── VoicePanel.tsx
│       ├── constants/
│       │   └── audio.ts                   # audio key + theme constants
│       ├── context/
│       │   └── AudioContext.tsx
│       ├── games/             # one folder per game; each owns its <…Board /> component
│       │   ├── rps/RpsBoard.tsx
│       │   ├── rummy/         # Card, RummyBoard, RummyBoardDesktop, RummyBoardMobile, TutorialModal, autoArrange, meldCheck, sound
│       │   ├── ludo/          # full SVG board, Dice, Token, polygon-board layout, animations
│       │   ├── snl/SnlBoard.tsx
│       │   ├── handcricket/HandCricketBoard.tsx
│       │   ├── uno/UnoBoard.tsx
│       │   ├── wordbuilding/  # WordBuildingBoard, TutorialModal
│       │   └── dotsboxes/DotsBoxesBoard.tsx
│       ├── hooks/
│       │   ├── useAudio.ts
│       │   └── useHaptics.ts              # useSyncExternalStore over HapticsManager
│       ├── lib/                            # framework-agnostic helpers
│       │   ├── socket.ts                   # singleton AppSocket getter
│       │   ├── webrtc.ts                   # VoiceManager (mesh)
│       │   ├── fullscreen.ts
│       │   ├── motion.ts
│       │   ├── useReveal.ts
│       │   ├── useTheme.ts                 # data-theme attribute toggle
│       │   └── useViewport.ts
│       ├── pages/
│       │   ├── BhalyamHome.tsx             # landing — game tiles + GameRoomSheet
│       │   ├── GamesPage.tsx               # catalog including maintenance tiles
│       │   ├── Room.tsx                    # active match (1000-ish lines)
│       │   ├── PreviewLudo.tsx             # dev preview
│       │   └── NotFound.tsx
│       ├── services/                       # framework-agnostic singletons
│       │   ├── AudioManager.ts             # Howler wrapper + theme switching + localStorage prefs
│       │   └── HapticsManager.ts           # navigator.vibrate wrapper + subscribe pattern
│       └── store/
│           └── roomStore.ts                # Zustand store for everything room/game-level
├── server/                    # Node + Express + Socket.IO
│   ├── package.json
│   ├── tsconfig.json          # rootDir: "..", emits dist/server/src + dist/shared
│   ├── vitest.config.ts       # mirrors the @shared alias for tests
│   └── src/
│       ├── index.ts           # http server, CORS, Socket.IO wiring, signal handlers
│       ├── sockets/
│       │   └── index.ts       # registerSocketHandlers — every socket.on lives here
│       ├── rooms/
│       │   ├── RoomManager.ts # single class owning all room state
│       │   └── codeGenerator.ts # 6-char nanoid alphabet
│       ├── types/
│       │   └── popular-english-words.d.ts # local module-typing shim
│       └── games/
│           ├── GameEngine.ts  # interface every engine implements
│           ├── registry.ts    # createEngine(kind) + getGameLimits(kind)
│           ├── rps/RpsEngine.ts
│           ├── rummy/         # RummyEngine + deck/melds/declare/score/botArrange helpers + __tests__
│           ├── ludo/          # LudoEngine + track.ts + __tests__
│           ├── snl/           # SnlEngine + __tests__
│           ├── handcricket/   # HandCricketEngine + __tests__
│           ├── uno/UnoEngine.ts
│           ├── wordbuilding/  # WordBuildingEngine + dictionary.ts
│           ├── dotsboxes/DotsBoxesEngine.ts
│           └── memorymatch/   # MemoryMatchEngine + symbols.ts (server-only; client board not yet implemented)
└── shared/
    ├── types.ts               # GameKind union, all per-game state types, ClientToServerEvents, ServerToClientEvents, DEFAULT_* options
    └── hc-rosters.ts          # Hand Cricket roster constants
```

---

## 4. Coding Standards

These are observations from the existing codebase, not inventions.

### File naming
- React components: `PascalCase.tsx` (e.g. `RpsBoard.tsx`, `RoomCodeShare.tsx`).
- Hooks: `useCamelCase.ts` (e.g. `useHaptics.ts`).
- Non-component modules and helpers: `camelCase.ts` (e.g. `socket.ts`, `webrtc.ts`, `autoArrange.ts`, `meldCheck.ts`).
- Server engines: `<Game>Engine.ts` inside `server/src/games/<game>/`.
- Tests: `*.test.ts` inside a co-located `__tests__/` folder.

### Component & function naming
- React components are `PascalCase` functions, default-exported when the file is named after the component (`export default function Room()`), named-exported when the file groups multiple small pieces (`function Toast(...)` defined inside `Room.tsx`).
- Hooks always start with `use…`.
- Pure helpers are `camelCase` and exported individually.
- Type names are `PascalCase`. State shapes end in `…State` / `…PublicState`. Options end in `…Options`. Defaults are `DEFAULT_<NAME>_OPTIONS`.

### Constant naming
- `SCREAMING_SNAKE_CASE` for module-level constants (`GRACE_PERIOD_MS`, `STORED_NAME_KEY`, `ICE_SERVERS`, `BOT_NAMES_BY_GAME`).
- Local lookup tables can be `camelCase` when scoped inside a function (`friendlyGameName`).

### Folder organisation
- One folder per game on both sides — engine + helpers on the server, board + game-specific helpers on the client. Cross-game code lives in `components/`, `lib/`, `services/`, `hooks/`, or `shared/`.
- Tests live in `__tests__/` next to the engine they cover.

### Imports
- Server source uses **`.js` extension** in import paths (`from "../rooms/RoomManager.js"`) because Node ESM resolution at runtime requires the extension. The TS files are compiled, not the `.js` ones — this is the correct ESM/TS pattern, do not "fix" by removing the `.js`.
- Both sides import shared types as `from "@shared/types"` (client) / `from "@shared/types.js"` (server) via the `paths` alias.
- React-friendly default exports for page/component files; named exports for helpers and types.

### Comments
- Heavy use of JSDoc-style `/** … */` block comments at the top of types, interfaces, and non-trivial functions, especially when explaining *why* (Pass-and-Play model, ICE/STUN choices, grace period rationale, ESM `.js` imports, etc.). Match this style when the rationale is non-obvious.
- Inline `// …` comments are reserved for short clarifications.

---

## 5. React Guidelines (observed)

- **React 18** with the `react-jsx` runtime (`tsconfig.json` `"jsx": "react-jsx"`). No need to import `React` for JSX.
- **Functional components only.** No class components in the codebase.
- **Hooks**: `useEffect`, `useMemo`, `useRef`, `useState`, `useSyncExternalStore` (in `useHaptics`).
- **Routing** via `react-router-dom` v6 declarative `<Routes><Route /></Routes>` with `useNavigate` and `useParams`. A single `ScrollToTopOnRouteChange` effect lives in `App.tsx` and disables browser scroll restoration on first run.
- **Global state** is Zustand. Components subscribe via `useRoomStore((s) => …)` selectors. Local UI state stays in `useState`.
- **Side-effect singletons** (`AudioManager`, `HapticsManager`, `VoiceManager`, the Socket.IO connection) live outside React and expose a `subscribe` API; hooks bridge them in via `useSyncExternalStore` or manual effects.
- **Animations** are mostly `framer-motion`'s `motion.*` + `AnimatePresence`. One landing-page headline uses GSAP (`GsapSplitHeadline.tsx`).
- **Pass-and-play** UI uses a `<PassPhoneGate>` wrapper component to gate the visible seat when multiple humans share a device.
- **Per-game boards** are top-level components inside `Room.tsx`'s switch on `state.game`. The Rummy board picks between mobile and desktop variants based on viewport.

---

## 6. Backend Guidelines

- **Single Express + Socket.IO server.** `server/src/index.ts` builds the http server, sets CORS to `CLIENT_ORIGIN` (defaults to `http://localhost:5173`), exposes a `/health` endpoint, and binds to `0.0.0.0` so LAN devices can connect during development.
- **`RoomManager`** is the only stateful class. It holds every room in an in-memory `Map<code, Room>` and a separate `Map<socketId, code>` index. There is no persistence layer — restarting the server drops all rooms.
- **Game logic** is hidden behind the `GameEngine` interface (`server/src/games/GameEngine.ts`). Adding a new game means:
  1. Add the kind to the `GameKind` union and add a `…PublicState` + options types in `shared/types.ts`.
  2. Implement an engine class in `server/src/games/<kind>/<Game>Engine.ts`.
  3. Register it in `server/src/games/registry.ts` (`createEngine` + `getGameLimits`).
  4. Wire any new options through `CreateRoomPayload`, `RoomManager.createRoom`, and `sockets/index.ts`.
- **Turn timers** are managed in `RoomManager` (one `turnTimer` per room). Memory Match additionally has a `memoryMatchRevealTimer` for the flip-back delay — separate so the two never collide.
- **Bots** are first-class players (`isBot: true`). If the engine implements optional `pendingActors()` + `applyAutoMove()`, the RoomManager loops the autoMove for each bot until the bot is no longer pending — allowing engines that need multiple sub-moves per turn (e.g. Ludo: roll, then move).
- **Pass & Play** seats are `isLocal: true` players, owned by the host's socket. The server accepts moves on their behalf only when the host's socket is the caller and the target seat is local to the same room. This is explicitly **not allowed** for games that leak hidden information on a shared device (Rummy, UNO, RPS, Hand Cricket).
- **Disconnect grace** — `GRACE_PERIOD_MS = 90_000`. A disconnected player keeps their seat for 90 seconds; the room emits an `awayUntil` timestamp so the UI can show the countdown.
- **Rematch** is a state machine: `idle → pending → accepted → (countdown) → restart` or `idle → pending → declined → idle`. Host requests, others (humans only — bots auto-accept) respond. Two timers (`rematchTimer`, `rematchStartTimer`) drive expiry and the post-acceptance countdown.
- **Graceful shutdown** — `SIGINT` / `SIGTERM` / `SIGHUP` all call a `shutdown()` that closes Socket.IO and the http server, with a 3-second hard-exit fallback.

---

## 7. Styling Rules

- **TailwindCSS** is the only styling system. Stay inside it.
- **Design tokens** live in two places:
  - `client/src/index.css` defines CSS custom properties (`--color-brand-*`, `--surface-*`, `--text-hi/mid/lo/mute`, `--rim-gold`, `--ring`, etc.) and switches them under `[data-theme="dark"]`.
  - `client/tailwind.config.js` exposes those custom properties as Tailwind colors (`brand.500`, `gold.500`, `surface.0`, `ink.hi`, `player.1`, `success`, `warning`, `danger`, `info`).
- **BHALYAM palette** is namespaced under `bhalyam.*` so in-game UI colors are not affected. Anchors: `bhalyam.gold` (`#E4B128`), `bhalyam.wood` (`#6D4323`), `bhalyam.cream` (`#F7E8C4`), `bhalyam.orange` (`#FF8F00`), `bhalyam.maroon`, `bhalyam.ludo.{red,green,blue,yellow}`. Gradient utilities prefixed `bg-bhalyam-*` (`sunset`, `ember`, `festival`, `mint`, `royal`, `gold-leaf`, `parchment`).
- **Font system** (from `tailwind.config.js`): `font-display` = Righteous, `font-sans` / `font-body` = Poppins, `font-script` = Caveat, `font-mono` = JetBrains Mono. All loaded from Google Fonts via the import at the top of `index.css` (also includes Fredoka, Nunito, Noto Sans Telugu).
- **Dark mode** is class-based via the `data-theme="dark"` attribute on the root; managed by `lib/useTheme.ts`. Do not introduce media-query-only dark styles.
- **Custom keyframes** (`cardFlip`, `diceRoll`, `winBurst`, `shake`, `glowPulse`) and animations (`animate-card-flip`, `animate-dice-roll`, `animate-win-burst`, `animate-shake`, `animate-glow-pulse`) are declared in the Tailwind config — prefer those over re-inventing.
- **Inline styles** are used sparingly and only where Tailwind classes can't reach a runtime value (e.g. dynamic SVG positions, computed gradients). Use the `style` prop, not styled-components — there is no CSS-in-JS library installed.
- **No emoji as decorative icons in product chrome.** Emojis *are* deliberately used inside playful in-game UI (RPS choices, reaction overlays, share buttons in `RoomCodeShare.tsx`); leave those alone. For new neutral UI chrome, prefer SVGs in `components/bhalyam/icons.tsx`.

---

## 8. State Management

- **Server is authoritative** for everything that affects gameplay (turn order, hands, scores, dice rolls, valid moves). Clients only emit intents (`game:move`) and re-render whatever state arrives via `game:state` / `room:state`.
- **Client global state** lives in `useRoomStore` (`client/src/store/roomStore.ts`):
  - `playerId`, `playerName` — persisted to `localStorage` under `mpg.playerId` / `mpg.playerName`.
  - `roomState` — last `RoomPublicState` from the server.
  - `gameState` — last per-player game state (typed `unknown`; components narrow with `as`).
  - `messages` — chat log, capped to the last 200 entries.
  - `rematch` — last `RematchState`.
  - `lastError` — string for the floating toast.
- **Local state** stays inside components (`useState`, `useRef`). Per-game ephemeral UI state (selected card, hovered cell, animation flags) is *not* lifted into the store.
- **Audio + Haptics settings** persist independently:
  - `bhalyam.audio.settings` in `localStorage`, managed by `AudioManager`.
  - Haptics enabled flag via `HapticsManager` (`useHaptics` subscribes via `useSyncExternalStore`).

---

## 9. API Conventions

- **There is no REST API.** The only HTTP endpoint is `GET /health` which returns `{ ok: true, ts: <epoch> }`. Everything else flows over Socket.IO.
- **Service layer** on the client is the `lib/socket.ts` singleton (`getSocket()` / `disconnectSocket()`). Do not create additional socket instances.
- All wire types live in `shared/types.ts`. If you change a server event, update both `ClientToServerEvents` and `ServerToClientEvents`.

---

## 10. Socket.IO Conventions

### Event naming
- Namespaced with `area:action`, lowercase, e.g. `room:create`, `room:join`, `game:move`, `game:state`, `chat:send`, `chat:message`, `webrtc:signal`, `rematch:request`, `rematch:respond`, `rematch:state`, `rummy:arrangement`.
- Areas observed: `room`, `chat`, `game`, `webrtc`, `rematch`, and one game-specific area (`rummy`).

### Client → Server
- Mutations and intents. Many use Socket.IO **acknowledgement callbacks** with the shape `{ ok: boolean; …; error?: string }` (`room:create`, `room:join`). Others are fire-and-forget (`room:setReady`, `game:move`, `chat:send`).
- Always typed via `ClientToServerEvents`. Do not introduce un-typed `socket.on("foo", ...)`.

### Server → Client
- Broadcasts and per-socket emits. `room:state` goes to the whole room; `game:state` is sent **per-player** (so hidden information stays hidden — see `engine.getStateFor(playerId)`). `room:error` / `game:error` are string-only and shown via the floating Toast in `Room.tsx`.

### Server responsibilities
- Validate the move on the engine, mutate engine state, emit fresh per-player `game:state` to every member of the room, update timers, schedule bot follow-ups.
- All event registration is centralised in `server/src/sockets/index.ts`. Do not register handlers from other files.

### Client responsibilities
- Hold one connection (`getSocket()`), subscribe to events in `Room.tsx`'s top-level effect, push received state into the Zustand store, emit moves on user input.
- Re-attach state on reconnect: on `room:joined` the server sends the full room state, and the engine re-emits per-player game state so a refresh restores the seat without losing the round.

### Error handling
- Server-side: the `room:create` and `room:join` handlers wrap into ack callbacks with `{ ok: false, error }`. Everything else emits `room:error` / `game:error`.
- Client-side: the toast in `Room.tsx` listens for those errors and surfaces them above the felt.

### Reconnection strategy
- Client uses `socket.io-client`'s default reconnection (no overrides in `lib/socket.ts`).
- Server keeps the seat alive for `GRACE_PERIOD_MS` (90 s) after disconnect. If the same `playerId` re-joins inside that window, the seat is reclaimed. After expiry the player is removed and the room may collapse.
- `playerId` is stored in `localStorage` (`mpg.playerId`) so a hard refresh keeps the same identity.

---

## 11. Performance Guidelines

Based on choices already made:

- **`useMemo` / `useSyncExternalStore`** are used to keep manager-backed values reference-stable across renders (see `useHaptics.ts`). Do the same when a singleton's value crosses the React boundary.
- **Message log is capped** at 200 entries in `roomStore.ts` to prevent unbounded growth.
- **WebRTC is mesh** — fine up to ~6 peers, noted in the README; do not assume scale beyond that without switching to an SFU.
- **Sockets use `transports: ["websocket", "polling"]`** in that order — prefer WS, fall back to long-polling.
- **Big files exist** (`shared/types.ts` ≈ 1100 lines, `RoomManager.ts` ≈ 1200 lines, `Room.tsx` ≈ 780 lines, `index.css` ≈ 1000 lines). When touching them, use the `Read` tool with `offset` / `limit` and `Edit` for targeted changes — full rewrites are not necessary and risky.

---

## 12. Accessibility Standards (observed)

- `aria-label` is used on icon-only buttons (copy room code, share, dismiss toast).
- Keyboard focus styles fall back on Tailwind defaults plus the `--ring` token defined in `index.css`.
- The room-code button is wrapped so it can be tapped to copy *and* contains a `<span id="bhalyam-room-code-text">` for select-fallback when the Clipboard API is blocked.
- Color is rarely the only signal — most game UIs pair color with iconography or text labels.
- Reduced-motion preferences are **not** explicitly handled anywhere yet. New animations that are non-trivial should respect `@media (prefers-reduced-motion: reduce)`.
- No automated a11y tests are present.

---

## 13. Error Handling

- **Server**: `try/catch` around `room:create` returning `{ ok: false, error }` through the ack; engine `applyMove` returns `MoveResult { ok, error?, isOver?, winnerId? }` rather than throwing; the RoomManager translates non-ok results into `game:error` strings.
- **Client**: `lastError` in the store drives the floating Toast. Async helpers (`navigator.clipboard.writeText`, `navigator.share`) are guarded with `try/catch` and fall back to a manual selection (clipboard) or to WhatsApp `wa.me` (share).
- **Defensive guards** in `App.tsx` wrap `window.history.scrollRestoration` access in `try/catch` so non-DOM environments (tests) don't crash on import.
- **Do not** add error handling at boundaries where the server is already authoritative — clients should not "defensively" validate moves before sending them; that branches truth.

---

## 14. Testing

- **Vitest** is configured on the **server only** (`server/vitest.config.ts`, `npm test` from `server/`).
- Tests live next to engines in `__tests__/` folders. Detected suites:
  - `rummy/__tests__/{declare,drop,melds}.test.ts`
  - `ludo/__tests__/engine.test.ts`
  - `snl/__tests__/engine.test.ts`
  - `handcricket/__tests__/engine.test.ts`
- **No client-side test setup exists.** No Jest / Vitest / Playwright config under `client/`. If you add client tests, you will need to introduce a runner and document it in this file.
- Run server tests with `cd server && npm test` (or `npm run test:watch`).

---

## 15. AI Development Rules

These are **mandatory** for any AI working in this repo.

1. **Analyse before writing.** Open the file you plan to edit (`Read`). Skim its imports, exports, and at least the function you intend to change. Use `Grep` / `Glob` to find usages before renaming or moving anything.
2. **Reuse existing utilities.** Before writing a new helper, check `client/src/lib/`, `client/src/hooks/`, `client/src/services/`, `client/src/components/`, and the relevant `games/<kind>/` folder. The codebase already has `useHaptics`, `useTheme`, `useViewport`, `getSocket`, `AudioManager`, `HapticsManager`, `VoiceManager`, `TurnTimeWarning`, `PassPhoneGate`, `RoomCodeShare`, etc.
3. **Prefer extending an existing component** over creating a new one. Per-game variants (`RummyBoardMobile` / `RummyBoardDesktop` driven by `RummyBoard.tsx`) are the model.
4. **No duplicate implementations.** If two games need the same UX (turn timer warning, score modal close behaviour), extract a single component.
5. **Preserve backward compatibility of `localStorage` keys.** `mpg.playerId`, `mpg.playerName`, `bhalyam.audio.settings` are user-visible and must keep their meaning.
6. **Do not modify unrelated files** in the same change.
7. **Use the `GameEngine` interface** when touching server-side game logic. Do not bypass it with bespoke handlers in `sockets/index.ts`.
8. **Use the `@shared/*` alias** — never `../../shared/types`. The Vite alias, the TS path, the server tsconfig, and the vitest config all converge on `@shared`.
9. **Keep `.js` extensions in server imports.** Compiled ESM relies on them. Don't strip them.
10. **Explain the plan before coding** when the change touches more than a couple of files or crosses the client/server boundary.
11. **Keep commits focused.** One concern per commit message. The user copies commit blocks verbatim — always provide a clean message at the end of a code change.
12. **Match the existing comment voice.** Block JSDoc for "why", inline `//` for short clarifications. Don't narrate "what" the code does — names already do that.

---

## 16. Development Workflow (recommended for AI agents)

1. **Analyse.** Read the relevant files. Run `Grep` for symbols. Check `shared/types.ts` for the wire shape if you're touching multiplayer state.
2. **Search for reusable code.** Skim the folders listed in rule 2 above before writing anything new.
3. **Plan and explain.** State the intent: which files will change, what the new wire shape is (if any), how it propagates client ↔ server.
4. **Implement.**
   - Server engine changes: update the engine class + add/extend tests under `__tests__/`.
   - Shared types: edit `shared/types.ts`. Both sides will see it immediately.
   - Client UI changes: edit the per-game `…Board.tsx` or shared component; reuse design tokens from `tailwind.config.js`.
   - New socket events: declare in `ClientToServerEvents` / `ServerToClientEvents`, register in `server/src/sockets/index.ts`, emit from the client via `getSocket()`.
5. **Validate.**
   - `cd server && npm run typecheck` and `npm test`.
   - `cd client && npm run typecheck` and (for UI changes) `npm run build`.
   - For UI changes, **open the dev server in a browser and exercise the feature.** Type-checks alone are not proof a UI works.
6. **Summarise.** End with a short summary of what changed and the commit-message block. Mention follow-ups if the change is partial (e.g. server is in place but client board is not yet wired — Memory Match's current state).

---

## 17. Repository-Specific Rules

Inferred from the actual code:

- **Game catalog** lives in `client/src/components/bhalyam/data.ts`. Adding a tile requires a `GameKind` entry **and** an entry there. Games marked `maintenance: true` show but route nowhere.
- **`PLAYABLE_SLUGS`** in `GameRoomSheet` is a runtime allow-list for game tiles that actually launch a room; `BhalyamGameSlug` is wider than `GameKind` to include maintenance-only entries.
- **`MAX_PLAYERS_BY_GAME`** in `client/src/pages/Room.tsx` mirrors `getGameLimits` on the server. Keep them in sync.
- **`BOT_NAMES_BY_GAME`** in `RoomManager.ts` is keyed by `GameKind`; add a name pool whenever a new game is added.
- **`friendlyGameName`** in `RoomCodeShare.tsx` is a `Record<GameKind, string>` and will fail to compile if a new game isn't added.
- **Pass & Play allow-list** (in `RoomManager.ts`): only `ludo`, `snl`, `wordbuilding`, `dotsboxes`, `memorymatch`. Adding a game to this list requires confirming it does **not** show hidden information that would leak across local seats on a shared device.
- **WebRTC voice** is opt-in per room. Mesh topology, STUN-only by default. A TURN server can be added by editing `ICE_SERVERS` in `client/src/lib/webrtc.ts`.
- **Room codes** are 6 characters generated by `server/src/rooms/codeGenerator.ts`. The code is the room's primary key and also the URL slug under `/room/:code`.
- **Bot pacing**: bots speak through `pendingActors()` + `applyAutoMove()`. If an engine omits these, it cannot host bots.
- **Hand Cricket rosters** live in `shared/hc-rosters.ts` — both sides import the same data.
- **README claims that the server "boots on Render with Node 24"**; the Word Building dictionary integration uses `createRequire` to import JSON in Node ESM specifically to dodge that environment's import-attribute requirement. Don't switch back to a bare `import "...json"` without retesting that target.
- **Memory Match is half-finished.** Server engine, types, registry, and RoomManager wiring all exist. The client board (`MemoryMatchBoard.tsx`) and lobby integration are **not yet built**. If you're asked to "finish" Memory Match, you are building the client.

---

## What this file does not know

- **Linting / formatting rules** — none are configured. Imitate the surrounding code.
- **Production environment variables** beyond `PORT`, `CLIENT_ORIGIN` (server) and `VITE_SERVER_URL` (client). If others exist on Render/Vercel, they are not declared here.
- **CI configuration** — there is no `.github/workflows` directory inside `MultiplayerGames/` and no other CI manifest. The README mentions CI as a Phase B goal.
- **MongoDB / persistence layer** — referenced in the README as a future phase but not present in code.
- **Analytics / telemetry** — not present.
- **i18n** — not present. Strings are inline English (with a few Telugu-coded names in bot pools and roster data).

When any of those become relevant, update *this* file at the same time you add the capability.
