# ADR-007 — Real-time engines in the `GameEngine` contract

**Status:** Accepted — 2026-08-09
**Context date:** raised 2026-08-07 in ROADMAP.md "Engagement track" #4

## Context

Every engine in this project was written as a turn-based state machine:
`applyMove(move)` takes an action and returns a new state. Nothing advances
unless somebody moves.

Three games already needed the world to advance on its own — snake, bounce and
roadrash — and a fourth (the old space shooter) did too. All four solved it the
same way: the **client** ran a `setInterval` and emitted a `tick` move.

That is a direct violation of the project's second principle, *"Server is the
source of truth. Anti-cheat by default; no client trust."* Simulation rate was
whatever the player's browser said it was. A modified client could:

- tick slowly, so the world crawls and every obstacle is trivially dodged;
- tick quickly, to outrun opponents in a shared arena;
- stop ticking, freezing a losing position indefinitely.

Carrom forced the question because it is unavoidably continuous: one strike
produces several seconds of motion that every client must see identically. But
Carrom was not the first real-time game — it was the fifth. The problem was
already shipped four times before anyone wrote it down.

## Decision

**`GameEngine` grows an optional real-time half. Carrom does not get its own
contract, and no second engine type is introduced.**

```ts
readonly tickRateHz?: number;
simulateTick?(): MoveResult;
```

An engine that declares `tickRateHz` opts into a **server-owned** loop.
`RoomManager.startSimulation` runs the interval, calls `simulateTick()`,
broadcasts, and ends the game when the result says so. The client's only job
is to send intent and render what comes back.

Three consequences follow deliberately:

1. **Additive, not breaking.** Both members are optional, so all fourteen
   turn-based engines are untouched. This satisfies the roadmap's rule that the
   engine contract "must not break without a versioned migration."
2. **`isRealtimeEngine()` is the only branch.** One narrowing helper in
   `GameEngine.ts`; no `instanceof` chains, no per-game special cases in
   `RoomManager`.
3. **Named `simulateTick`, not `tick`.** Snake, bounce and roadrash already
   have private `tick()` methods. Reusing the name would force three unrelated
   engines to widen internals or rename, for no benefit.

## Alternatives considered

**A separate `RealtimeGameEngine` contract with its own room type.**
Rejected: rooms, chat, voice, reactions, rematch, disconnect-takeover and bots
are all shared machinery. A second room type would fork every one of them, and
the two would drift.

**Keep client ticking, add server-side rate validation.**
Rejected: this is trust-then-verify on a signal with no ground truth. The
server cannot distinguish a fast client from a fast network, so any threshold
either lets cheating through or punishes bad connections.

**Fixed-timestep with client-side prediction and rollback.**
Rejected *for now*, not on merit — it is the right answer for twitch play at
scale, and it is a large amount of machinery for a friends-and-family app whose
real-time games are turn-resolution (Carrom) or forgiving arcade play. Revisit
if latency complaints appear; the current contract does not preclude it, since
prediction is a client concern layered over the same broadcasts.

## Consequences

**Good**

- Simulation rate is no longer client-supplied for any engine that opts in.
- Carrom's strike-resolution phase fits without inventing anything new: a shot
  sets velocities, the engine ticks until everything settles, the turn resolves.
- Turn-based and real-time games share one room, one lifecycle, one test
  harness.

**Costs, accepted**

- `RoomManager` now owns an interval per real-time room. It is cleared in
  `stopSimulation`, on phase change, on `abandonRoom`, and on a throwing tick
  (a crashing simulation must not leave a runaway timer). Every one of those
  paths is a leak if it is ever missed.
- Broadcast volume rises with tick rate. Vyoma Yudh runs at 20 Hz, Carrom at
  60 Hz during resolution only. At Phase E scale this becomes a real cost and
  will want delta-encoding or interest management — noted, not built.
- **Snake is migrated** (2026-08-10). It declares `tickRateHz = 20` and banks
  elapsed loop time in `stepAccumulatorMs`, taking one logical step per
  `speedMs`, so pace stays tied to the game's own speed rather than the loop
  rate. It still accepts a client `tick` as a deliberate no-op, so a stale
  cached bundle degrades instead of erroring.

  That migration also revealed a second defect the anti-cheat framing above
  missed: with every client emitting `tick`, N players advanced the shared
  world N times per step. The game literally ran faster the more people
  watched it.

- **Bounce and roadrash are NOT migrated** and still carry the vulnerability.
  Deferred deliberately: both are incomplete games, so migrating them now
  would be reworked as soon as they are finished. Do it as part of completing
  them, using Snake as the template.

## Validation

Shipped and proven by **Vyoma Yudh** (2026-08-09) before Carrom was written, so
the contract was exercised by a real game rather than designed in the abstract.
Its test suite pins the anti-cheat property directly: a client-sent `tick` is
rejected and does not advance the world.
