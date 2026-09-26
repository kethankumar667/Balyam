# ADR-003 — In-Memory Room Durability & Snapshot Store

**Status:** Accepted — 2026-09-26  
**Context date:** raised in ROADMAP.md Phase B "In-Memory Room Durability"

## Context

Historically, all BHALYAM multiplayer match and lobby state lived purely in Node.js volatile process memory within `RoomManager.rooms` (`Map<string, Room>`). While this provided ultra-low latency (< 1ms move processing), it presented severe operational risks:

1. **Process Restarts & Deployments Drop Matches:** Any production dyno restart, deployment roll, OOM event, or runtime uncaught exception obliterated all active rooms, dropping players without recovery.
2. **Economy Reconciliation Gap:** Active matches holding committed coin pots could experience process termination mid-match, stranding player stakes until offline manual reconciliation.
3. **No Migration Path to Multi-Node Horizontal Scaling:** Without a durable snapshot abstraction, rooms were trapped on a single server instance.

The objective of Phase B is to introduce a room snapshotting mechanism so active matches and seated players resume seamlessly across process restarts without adding heavy external dependencies to the base developer workflow.

## Decision

**Introduce an extensible `RoomSnapshotRepository` abstraction with multi-driver support (InMemory, File, Redis) and engine serialization contracts (`serializeState()` / `restoreState()`).**

### 1. Storage Repository Abstraction (`RoomSnapshotRepository`)

Three pluggable drivers are implemented with zero new external dependencies:
- **`InMemoryRoomSnapshotRepository`:** Deep-cloned in-memory storage for isolated unit tests.
- **`FileRoomSnapshotRepository`:** Atomic on-disk JSON cache (`.room_snapshots/`) using temp-file write + rename to guarantee crash-consistent state on local restarts.
- **`RedisRoomSnapshotRepository`:** Direct, dependency-free RESP (Redis Serialization Protocol) client over `node:net` with automatic TTL expiration (1 hour match lifetime window).

Selection hierarchy on boot (`initialiseRoomSnapshotStore()`):
1. `ROOM_SNAPSHOT_STORE=memory` (or `NODE_ENV === "test"`) -> `InMemoryRoomSnapshotRepository`
2. `REDIS_URL` or `ROOM_REDIS_URL` configured -> `RedisRoomSnapshotRepository`
3. Default (Dev & Production) -> `FileRoomSnapshotRepository`

### 2. GameEngine Serialization Interface

`GameEngine` is extended additively with two optional lifecycle methods:
```ts
export interface GameEngine {
  // Existing methods ...
  serializeState?(): unknown;
  restoreState?(state: unknown): void;
}
```
Implemented across engines (RPS, Snl, TicTacToe, Ludo, etc.). Engines that implement this method export their complete internal representation; engines that do not simply re-initialize from seated player rosters.

### 3. RoomManager Lifecycle Hooks & Seamless Seat Reclamation

- **Snapshot Ingress:** Every room transition (`broadcastRoomState`, `broadcastGameState`) triggers asynchronous snapshot persistence (`persistRoomSnapshot(room)`).
- **Snapshot Deletion:** Normal completion or room abandonment cleanups trigger `deleteRoomSnapshot(code)`.
- **Boot Hydration:** On process boot, `hydrateSnapshots()` reads all active snapshots from the store, reconstitutes the `Room` objects with `isConnected: false`, and schedules disconnect cleanup timers based on remaining player grace periods.
- **HMAC Seat Reclamation:** Reconnecting clients invoke `room:join` with their existing `playerId` and HMAC `seatToken`. `RoomManager` validates the cryptographic signature, re-attaches the live socket, broadcasts the fresh room and game state, and seamlessly resumes play.

## Consequences

- **Match Resilience:** Active games survive server restarts. Reconnecting players rejoin in-flight rounds with identical scores, turns, and board configurations.
- **Zero Production Degradation:** In-memory speed remains 100% untouched for hot-path gameplay; snapshot writes execute asynchronously without blocking turn event dispatch.
- **Zero NPM Bloat:** Redis support uses raw TCP RESP over Node's native `node:net`, preserving zero new npm dependencies.
- **Observability:** `/health` reports live durability driver status (`{ durable: boolean, driver: "memory" | "file" | "redis" }`).
