# BHALYAM Architecture Principles & 10-Year Maintainability Vision

> **System Core:** Server-Authoritative Realtime Lounge Engine  
> **Backend:** Node 20+ ESM + Express + Socket.IO  
> **Frontend:** React 18 SPA + TypeScript Strict + Tailwind CSS  
> **Shared:** `@shared/types.ts` Universal Contracts

---

## 1. Core Architectural Pillars

```
┌────────────────────────────────────────────────────────┐
│               SHARED CONTRACTS (@shared/*)             │
├───────────────────────────┬────────────────────────────┤
│   SERVER AUTHORITY        │   CLIENT PRESENTATION      │
│   (server/src/)           │   (client/src/)            │
├───────────────────────────┼────────────────────────────┤
│ • RoomManager (In-Memory) │ • Zustand State Store      │
│ • GameEngine Interface    │ • Dual-Layout Boards       │
│ • Turn Timers & Rematch   │ • Sound & Haptic Manager   │
│ • Cryptographic Seats     │ • DLS Design Tokens        │
└───────────────────────────┴────────────────────────────┘
```

### Pillar 1: Server Authority
- **The server is the single source of truth.**
- Clients NEVER compute valid moves, scores, dice rolls, card deals, or game standings locally.
- Clients send actions (`room:move`); the server validates legality, mutates state, and broadcasts canonical public state (`room:state`).

### Pillar 2: Feature & Game Isolation
- Every game is completely isolated in its own self-contained module:
  - **Server Engine**: `server/src/games/<game>/<Game>Engine.ts`
  - **Client Board**: `client/src/games/<game>/<Game>Board.tsx` (plus Mobile and Desktop variants).
  - **Tests**: `server/src/games/<game>/__tests__/` and `client/src/games/<game>/__tests__/`.
- A bug or refactor in `LudoEngine` can never destabilize `RummyEngine` or `UnoEngine`.

### Pillar 3: Zero Transient Dependencies
- Zero Redis, zero external database dependencies in the active match loop.
- All live room state is held in `RoomManager`'s high-efficiency in-memory maps.
- Disconnect grace period (90 seconds) and seat tokens ensure instant reconnection without heavy persistence layers.

---

## 2. Universal `GameEngine` Interface Contract

Every new game onboarded to BHALYAM must implement the server-side `GameEngine` interface:

```typescript
export interface GameEngine<TState, TPublicState, TMove> {
  readonly kind: GameKind;
  initialize(players: Player[], options?: unknown): TState;
  getPublicState(state: TState, forPlayerId?: string): TPublicState;
  validateMove(state: TState, playerId: string, move: TMove): boolean | string;
  applyMove(state: TState, playerId: string, move: TMove): GameEngineResult<TState>;
  checkGameOver(state: TState): GameOverResult | null;
  
  // Optional multi-step bot capabilities
  pendingActors?(state: TState): string[];
  applyAutoMove?(state: TState, playerId: string): GameEngineResult<TState>;
}
```

---

## 3. 10-Year Maintainability Directives

1. **Standardized ESM Imports**:
   - All server imports use explicit `.js` extensions (`from "./RoomManager.js"`), adhering to native Node.js ESM runtime standards without relying on custom bundler magic.
2. **Deterministic State Transitions**:
   - Game engines are pure, deterministic finite state machines. Given state $S$ and move $M$, the next state $S'$ is completely reproducible and testable in isolation.
3. **Graceful Disconnect Recovery**:
   - Seats are owned by server-signed HMAC `seatToken`s. If a player drops connection or reloads the browser, the client re-authenticates with their `seatToken` and seamlessly recovers the match without forfeit.
4. **Clean Decoupling of Presentation and Networking**:
   - UI boards only communicate with the network through the Zustand store or typed action dispatchers, never directly invoking raw Socket.IO emitters.
