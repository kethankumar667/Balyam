# BHALYAM Application Memory Map

> Last reviewed: 2026-09-16  
> Purpose: durable orientation for future AI agents and engineers before changing this repository.

## Read This First

- `AGENTS.md` requires reading the repository intelligence documents in order under `docs/ai/`.
- `C:/Users/gontl/.codex/RTK.md` adds a local rule: prefix shell commands with `rtk`.
- Core governance themes are server-authoritative gameplay, strict shared contracts, no `any`, closed-set sanitization for broadcast values, DLS-based UI, dedicated mobile and desktop game layouts, and rendered verification for responsive/accessibility work.
- Treat some older docs as directional, then verify against code. The application has grown beyond the original "only `/health` REST endpoint" shape.

## Product Shape

BHALYAM is a zero-install browser multiplayer game lounge. Players enter a lounge, choose a nostalgic board/card/social/retro game, and play in one of several modes: solo against bots, Pass & Play on one device, shared room code multiplayer, or broader product flows such as tournaments, rankings, profile progression, social parties, cosmetics, daily streaks, reviews, and admin/operational tooling.

The multiplayer room model remains the heart of the app: a React client sends intents, a Socket.IO server owns room/game truth, and `shared/` carries the cross-boundary TypeScript contract.

## Main Runtime Entry Points

- Root scripts live in `package.json`.
  - `npm run typecheck` delegates to server and client.
  - `npm test` delegates to server and client Vitest suites.
  - Quality gates include `release:check`, `enterprise:check`, `check:persistence`, `check:mobile-layout`, and `check:a11y-rendered`.
- Client entry:
  - `client/src/main.tsx` mounts the React app.
  - `client/src/App.tsx` owns routing, lazy page loading, route skeletons, consent bootstrap, socket warmup, recovery provider, structured metadata, and global toasts/tooltips.
- Server entry:
  - `server/src/index.ts` loads env, installs security/CORS/JSON/identity middleware, mounts REST routers, creates Socket.IO, initializes economy/reviews/cosmetics/streak services, constructs `RoomManager`, registers socket handlers, starts recovery workers, exposes health/operational/admin routes, and installs the final error handler.
- Shared contract:
  - `shared/types.ts` is the largest single source of wire and game state truth.
  - `shared/catalog.ts` supplies game limits/orientation used by the server registry.
  - `shared/permissions.ts` defines capability gates, but its comments and current values should be checked carefully before changing guest/member behavior.

## Client Map

`client/src/App.tsx` routes the public and authenticated product:

- Lounge/home: `/`, `/home`
- Game catalog family: `/games`, `/favorites`, `/recently-played`
- Room play: `/room/:code` and related room flow through `client/src/pages/Room.tsx`
- Profile family: `/profile`, `/profile/personal`, `/profile/statistics`, `/profile/matches`, `/profile/achievements`, plus aliases
- Competitive/social: `/leaderboard`, `/tournaments`, `/social`
- Account/auth: login, signup, password reset, verification
- Support/legal/content: privacy, terms, safety, about, FAQs, contact, feedback, reviews
- Retro/standalone pages: Nokia cricket, Nokia snake, brick racer, brick tetris, brick breakout
- Admin: `/admin/*` pages gated by `AdminRoute`
- Developer/previews: diagnostics, design system, game tile showcase, preview routes

Important client folders:

- `client/src/pages/` contains route-level screens.
- `client/src/games/<game>/` contains room-board implementations. Complete room games are expected to have `<Game>Board.tsx`, `<Game>BoardMobile.tsx`, and `<Game>BoardDesktop.tsx`.
- `client/src/features/` contains product feature islands: onboarding, profile, rankings, social, tournaments, and standalone brick games.
- `client/src/components/` contains shared UI and domain components, including room, auth, economy, cosmetics, privacy, admin, bhalyam chrome, settings, loading, reactions, and streaks.
- `client/src/design-system/` contains DLS primitives, premium components, and icon sets. Prefer these over ad-hoc styling.
- `client/src/store/roomStore.ts` owns room/game client state, persisted player identity, seat tokens, chat, rematch, and errors.
- `client/src/store/authStore.ts` owns account identity, access token, member/admin checks, and capability helpers.
- `client/src/lib/socket.ts` owns the singleton Socket.IO client. Do not create extra socket instances.
- `client/src/core/recovery/` handles reconnect/rejoin UX.
- `client/src/core/events/` contains event timeline/replay primitives.

## Server Map

`server/src/index.ts` mounts many HTTP surfaces:

- Public/core: `/health`, `/api/auth`, `/api/profile`, `/api/support`
- Competitive/social: `/api/ranking`, `/api/tournaments`, `/api/seasons`, `/api/social`, `/api/parties`
- Reviews/feedback: `/api/reviews`, `/api/admin/reviews`, `/api/admin/feedback`
- Economy/cosmetics/streaks: `/api/economy`, `/api/cosmetics`, `/api/streak`
- Operational/admin: `/api/operational`, `/api/admin/dashboard`, `/api/admin/users`, `/api/admin/audit`
- Recovery helper: `/api/rooms/:code/alive`

Important server folders:

- `server/src/sockets/index.ts` registers realtime events and delegates behavior to `RoomManager`.
- `server/src/rooms/RoomManager.ts` owns in-memory rooms, socket-to-room indexes, spectators, timers, bots, ready/start preflight, disconnect grace, rematch, reactions, soundboard, chat, cosmetics validation, settlement queueing, recovery, and broadcasts.
- `server/src/games/<game>/` contains server-authoritative game engines.
- `server/src/games/GameEngine.ts` is the engine interface.
- `server/src/games/registry.ts` maps `GameKind` to engine constructors and re-exports catalog limits/orientation.
- `server/src/auth/` resolves request identity and auth routes.
- `server/src/economy/`, `persistence/`, `cosmetics/`, `streak/`, `reviews/`, `ranking/`, `tournaments/`, `social/`, `party/`, `profile/`, and `admin/` are domain modules with REST controllers and services.
- `server/src/observability/`, `reliability/`, `security/`, `scale/`, and `chaos/` support operations and hardening.

## Realtime Contract

Server handlers in `server/src/sockets/index.ts` include:

- Room lifecycle: `room:create`, `room:join`, `room:leave`, `room:setReady`, `room:setOrientation`, `room:setName`, `room:setEntryStake`, `room:startGame`, `room:acknowledgeStart`, `room:declineStart`, `room:reportUnavailable`, `room:awake`, `room:retryTerminalPersistence`
- Seats and bots: `room:addBot`, `room:removeBot`, `room:renameBot`, `room:addLocalPlayer`, `room:removeLocalPlayer`
- Player presentation: `room:chooseColor`, `room:chooseCoinColor`, `room:choosePenColor`, `room:setTokenNicknames`, `room:setCosmetics`
- Play/chat/social table events: `game:move`, `chat:send`, reactions, cursors, soundboard
- Recovery and rematch: rematch request/response events, room close/start-cancel broadcasts
- Voice/spectator: WebRTC signalling and spectator events

Client `client/src/pages/Room.tsx` listens for the core server broadcasts: `room:state`, `game:state`, `chat:message`, `room:error`, `game:error`, `rematch:state`, `room:startCancelled`, `economy:voucherIssued`, and `room:closed`.

Typed event interfaces live at the bottom of `shared/types.ts` as `ServerToClientEvents` and `ClientToServerEvents`.

## Game Map

`shared/types.ts` currently defines:

`rps`, `rummy`, `ludo`, `snl`, `handcricket`, `uno`, `wordbuilding`, `dotsboxes`, `stargame`, `bingo`, `namesplaceanimal`, `tambola`, `snake`, `carrom`, `roadrash`, `chess`, `blockblast`, `spacewar`.

`server/src/games/registry.ts` currently implements engines for all of those except `roadrash`. Before wiring a catalog tile or room creation path, verify whether a game kind is playable, maintenance-only, standalone, or missing a server engine.

Client game folders currently include room games and standalone/legacy game surfaces:

`bingo`, `brickracer`, `carrom`, `chess`, `dotsboxes`, `handcricket`, `ludo`, `namesplaceanimal`, `nokiacricket`, `nokiasnake`, `pro`, `rps`, `rummy`, `shared`, `snake`, `snl`, `spacewar`, `stargame`, `tambola`, `uno`, `wordbuilding`.

When adding or repairing a multiplayer room game, work in this order:

1. Update `shared/types.ts` and any shared catalog/options/constants.
2. Implement or adjust the server engine in `server/src/games/<game>/`.
3. Register the engine in `server/src/games/registry.ts`.
4. Wire room/socket options through `RoomManager` and `server/src/sockets/index.ts` if needed.
5. Build both mobile and desktop client layouts under `client/src/games/<game>/`.
6. Wire `client/src/pages/Room.tsx` and `client/src/components/bhalyam/data.ts`.
7. Add or update deterministic server tests and meaningful client tests where behavior warrants it.
8. Verify with typecheck/tests and rendered layout checks for UI changes.

## Persistence And Identity

- Room/game state is still in process memory under `RoomManager`; game loops should not move to Redis or a database.
- Persistent product data is supported through progression/economy/reviews/cosmetics/streak modules, with Supabase/PostgREST-backed or in-memory modes depending on environment.
- Server startup refuses unsafe production configuration for operational auth, voucher HMAC durability, guest token durability, and some store modes.
- Seat ownership is separate from account identity. Room seats use server-signed tokens; account/member/admin identity flows through auth/profile/economy routes and `attachPlayerIdentity`.
- `GET /health` reports active rooms, socket count, TURN/auth/operational/progression/economy/reviews/memory status.

## Design And UX Rules That Matter In Code

- Use Tailwind and existing design-system primitives from `client/src/design-system/`.
- Do not use `Sparkles` from `lucide-react`; use domain-specific icons listed in `AGENTS.md`.
- Games need dedicated mobile and desktop layouts; mobile targets 320-768px and 44x44px touch targets, desktop targets 1024px+ with richer side panels/actions.
- Loading, empty, and error states should use the platform skeleton/empty/error patterns rather than raw text or blank panels.
- Animate transform/opacity, clean up timers/listeners/RAF, and respect reduced motion where the codebase already does.

## Known Drift And Caution Points

- `AGENTS.md` describes a much smaller app and says the only HTTP endpoint is `/health`; the current server mounts many REST APIs.
- `shared/permissions.ts` comments discuss "guest can play, guest cannot gather," but the current `GUEST` capability object grants `hostSharedRoom`, `joinByCode`, and `spectate`. Verify intended product behavior before changing gates.
- `GameKind` includes `roadrash`; the server registry does not currently instantiate a `RoadrashEngine`.
- The root docs emphasize Node 20+, while `client/package.json` and `server/package.json` declare `node >=22 <23`.
- Some generated or audit reports at the repository root are historical evidence, not current source of truth. Prefer live code plus `docs/ai/` and runbooks for implementation decisions.

## Verification Defaults

Use the narrowest meaningful checks for a change, then broaden when the affected surface requires it:

- Shared/server/game engine change: `npm run typecheck:server`, targeted server Vitest, then broader `npm run test:server` if shared behavior changed.
- Client UI/state change: `npm run typecheck:client`, targeted client Vitest if available, and rendered checks for layout/accessibility-sensitive work.
- Cross-boundary socket/shared contract change: root `npm run typecheck`, relevant server and client tests.
- Release-grade validation: `npm run release:check`, `npm run enterprise:check`, plus `npm run check:persistence`, `npm run check:mobile-layout`, and `npm run check:a11y-rendered` when relevant.
