# RoomManager Integration Map for Economy V1

> **Status: IMPLEMENTED (Phase 7, 2026-08-27).** Every hook point this document identifies is now
> live: `requestGameStart`/`requestRematchStart` (new, async, gate `startGame`/`startRematch`),
> `queueMatchSettlement`/`queueMatchRefund` (new, called from `finalizeMatch`/`abandonRoom`). See
> `docs/economy/roommanager-async-boundary-proposal.md`'s Option A recommendation, followed
> exactly as designed. This document is kept as the design record; the "Correction" note below is
> historical (it explains why the ORIGINAL draft's inline-`await` sketch was wrong, before Option
> A resolved it) — the boundary problem it describes is now closed, not merely diagnosed.
>
> **A genuine discovery this phase made that no prior draft anticipated:** `RoomManager.ts` had
> **no durable player identity at all** — every `Player.id` is an ephemeral `p_<random>` seat id,
> unrelated to a Supabase `userId` or a `guest_<random>` id. Closing this (member-only; guests
> cannot resolve one without a client change out of this phase's scope — see
> `rooms/economyIdentity.ts` and the Phase 7 completion report's top production risk) was a
> genuine prerequisite this map's original discovery pass did not surface.
>
> **Correction (remediation pass, 2026-08-26, pre-implementation):** the earlier draft of this
> document proposed inserting `await economyService.commitMatchEntry(...)` and `await
> economyService.settleMatchEconomy(...)` directly inside `startGame(socketId: string): void` and
> `private finalizeMatch(room: Room): void`. Both functions are synchronous by construction and
> remain so — Option A wraps them instead of changing them, exactly as this correction anticipated
> would be necessary.

---

## 1. Executive Integration Summary

RoomManager operates as BHALYAM's in-memory real-time state coordinator. All economy integrations hook into **lifecycle transitions** (Game Start, Match Finished, Room Abandoned, and Host Reassignment). Every one of those lifecycle functions is currently synchronous — the diagram below identifies the hook *points*, not a proposed calling convention.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ROOMMANAGER LIFECYCLE HOOKS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ startGame() / startRematchRound() ]                                      │
│        │                                                                    │
│        ▼ (L1220 / L3145)                                                    │
│  ► Economy Hook: commitMatchEntry(matchId, hostId, seats...)               │
│        │                                                                    │
│        ▼                                                                    │
│  [ Active Gameplay Loop (Moves, Bot Moves, Ticks) ]                         │
│        │                                                                    │
│        ├────────────────────────────────────┐                               │
│        ▼                                    ▼                               │
│  [ finalizeMatch() ]              [ abandonRoom() ]                         │
│  (Normal Completion)              (Match Cancelled / Abandoned)             │
│        │                                    │                               │
│        ▼ (L1354)                            ▼ (L1793)                       │
│  ► Economy Hook:                  ► Economy Hook:                           │
│    settleMatchEconomy(matchId,...)      refundMatchEntry(matchId, reason)   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authoritative Integration Points

### 2.1 Authoritative Game Start

```
FILE:        server/src/rooms/RoomManager.ts
FUNCTION:    startGame(socketId: string): void
LINE RANGE:  1138 – 1235
```

- **Purpose:**
  Validates host authorization, minimum/maximum player limits, and ready flags for all seated players. Instantiates the game engine via `createEngine(room.game)`, applies options, initializes player lists, transitions `lifecycleState` to `IN_PROGRESS`, and starts simulation/turn timers.
- **Rematch Variant:**
  `startRematchRound(room: Room): void` (Lines **3120 – 3180**) performs the equivalent round/game re-initialization when a rematch is accepted.
- **Economy Hook Point (boundary problem, not a solution):**
  The natural hook is immediately prior to line **1222**
  (`this.transitionLifecycle(room, "IN_PROGRESS", "Game started")`), where `commit_match_entry`
  must run and succeed *before* gameplay is allowed to begin. But `startGame` is synchronous and
  is called directly from a socket event handler in the current codebase — it cannot `await` a
  database RPC without becoming `async`, and making it `async` changes the calling contract for
  every caller of `startGame`. Resolving this is the entire subject of
  `docs/economy/roommanager-async-boundary-proposal.md`; no calling convention is prescribed
  here.
- **Hard requirement carried into that proposal:** game start must be prohibited until the debit
  (`commit_match_entry`) is confirmed — there is no acceptable design where gameplay begins
  optimistically before the host's funds are actually committed.

---

### 2.2 Authoritative Game Finish

```
FILE:        server/src/rooms/RoomManager.ts
FUNCTION:    finalizeMatch(room: Room): void
LINE RANGE:  1349 – 1390
```

- **Purpose:**
  The single source of truth for match completion across all 17 game engines. Flips `room.phase` to `"finished"`, advances `lifecycleState` to `COMPLETED`, records completion in `serverTimelineRecorder`, updates metrics, and dispatches match summaries to `profileService` and `recentPlayersService`.
- **Economy Hook Point (boundary problem, not a solution):**
  The natural hook is at line **1354** (alongside `profileService.recordMatchFinished`), but
  `finalizeMatch` is also synchronous (`private finalizeMatch(room: Room): void`) and cannot
  `await` `settle_match_economy` as written. The proposal in
  `docs/economy/roommanager-async-boundary-proposal.md` evaluates queuing settlement work to run
  *after* the synchronous `finalizeMatch` returns, rather than making `finalizeMatch` itself
  asynchronous — because settlement, unlike entry commitment, does not need to block anything the
  player is actively waiting on at that instant.
- **Guarantees the eventual integration must preserve, whatever calling convention is chosen:**
  - Authenticated members receive wallet credit once settlement completes.
  - Guests receive an active bearer voucher escrow record (transient code sent in the final match
    ack, once available).
  - Bot winnings and platform rake are swept to the World Bank Treasury.
  - `settle_match_economy` is called with the actual `p_is_valid_ranking` determination — an
    invalid/ambiguous result is not settled and instead flows through the refund path (see
    `docs/economy/economy-v1.md` §2.5 and `docs/economy/game-settlement-map.md`).

---

### 2.3 Match Cancellation & Abandonment

```
FILE:        server/src/rooms/RoomManager.ts
FUNCTION:    abandonRoom(room: Room): void
LINE RANGE:  1791 – 1808
```

- **Purpose:**
  Triggered when all human players have departed a room mid-match, or when room grace timers expire with no active connections. Transitions `lifecycleState` to `ABANDONED` then `CLOSED`, stops simulation loops, clears turn and takeover timers, and purges room from `this.rooms`.
- **Economy Hook Point (boundary problem, not a solution):**
  The natural hook is at line **1793**, before the room is purged, guarded by
  `room.phase === "playing" && room.currentMatchId`. `abandonRoom` is likewise synchronous;
  the same async-boundary proposal applies here — a queued refund call after the room is marked
  for cleanup is the leading candidate, evaluated alongside the settlement case rather than as a
  separate mechanism.
- **Guarantee the eventual integration must preserve:** the host's committed seat entry fees are
  restored in full via `refund_match_entry`, recorded as an immutable `MATCH_REFUND` ledger entry.

---

### 2.4 Disconnect & Takeover Handling

```
FILE:        server/src/rooms/RoomManager.ts
FUNCTION:    handleDisconnect(socketId: string): void
LINE RANGE:  2644 – 2765
```

- **Purpose:**
  Manages temporary network blips vs permanent departures. Sets player `isConnected = false`, updates `awayUntil` timestamp (`GRACE_PERIOD_MS: 90s` or `MATCH_GRACE_PERIOD_MS: 10m` if mid-match). If multiplayer, transitions lifecycle to `RECOVERING` and arms AI takeover timer (`TAKEOVER_GRACE_MS: 10s`). If solo human, pauses simulation (`PAUSED`).
- **Economy Consideration:**
  - Disconnected players remain eligible for their placement rewards if the AI takeover wins or finishes the game on their behalf.
  - If a player rejoins before grace expiry, `reclaimSeat()` (Lines **830 – 890**) disarms takeover and restores active wallet linkage.

---

### 2.5 Host Reassignment & Migration

```
FILE:        server/src/rooms/RoomManager.ts
FUNCTION:    reassignHost(room: Room, departingPlayerId: string): void
LINE RANGE:  1400 – 1450
```

- **Purpose:**
  When a host leaves, elects the next active connected member or guest player as room host. If a guest is elected, the room is sealed (`room.sealed = true`).
- **Economy Consideration:**
  In Economy V1, the **original host** who funded the match entry is the sole party entitled to refunds if the match later aborts. If a new game is started under a reassigned host, the new host funds the new match entry.

---

## 3. RoomManager Field Extensions for Economy V1

**As actually implemented** — `committedTotalCost` was dropped (redundant with the settlement's
own `totalCollected`, already durable; see the Phase 5 blueprint's identical reasoning for the
same field), and `Player` (not just `Room`) gained a field too:

```typescript
interface Room {
  // ...existing fields, unchanged...
  currentMatchId: string | null;       // set once commitMatchEntry resolves; cleared once settlement/refund is queued
  economyCommitPending: boolean;       // in-memory guard against a double-fire within one process
}

interface Player {
  // ...existing fields, unchanged...
  identityId: string | null;           // durable Supabase userId for a verified member; null for guest/bot/local — see economyIdentity.ts
}
```
