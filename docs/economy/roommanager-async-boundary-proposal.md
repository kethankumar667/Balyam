# RoomManager / Economy V1 Async Boundary — Design Proposal

> **Status:** DESIGN PROPOSAL ONLY — NOT IMPLEMENTED. `RoomManager.ts` has not been modified by
> this document or by any part of the Economy V1 remediation pass. This resolves audit finding
> B6 (Phase 11 of the remediation instructions) by evaluating the problem, not by shipping code.
> **Companion document:** `docs/economy/roommanager-integration-map.md`, which identifies the
> exact hook points this proposal reasons about.

---

## 1. The Problem

`RoomManager.ts` is BHALYAM's in-memory, synchronous, single-threaded real-time coordinator. Its lifecycle-critical methods are synchronous by construction:

```typescript
startGame(socketId: string): void                    // line 1138
private finalizeMatch(room: Room): void               // line 1349
abandonRoom(room: Room): void                          // line ~1791
```

Every Economy V1 mutation (`commit_match_entry`, `settle_match_economy`, `refund_match_entry`) is a network round-trip to PostgreSQL and is necessarily asynchronous. A synchronous function cannot `await` an asynchronous call without itself becoming `async` — and `startGame`/`finalizeMatch` are called synchronously, in-line, from socket event handlers and internal game-loop code that assumes they complete (and that the room's state is fully updated) before the next line executes. Naively inserting `await economyService.commitMatchEntry(...)` into `startGame` — which is what the pre-remediation draft of `roommanager-integration-map.md` proposed — does not compile, and even if the surrounding functions were mechanically marked `async`, it would silently change the timing contract every existing caller of `startGame`/`finalizeMatch` relies on, without any of those callers having been audited for the change.

This document evaluates the boundary problem for the three hook points. It does not implement a solution.

---

## 2. Hard Requirement That Constrains Every Option

**Game start must be prohibited until the debit is confirmed.** There is no acceptable design in which gameplay begins optimistically before `commit_match_entry` has actually succeeded — a host who cannot afford the match must never be allowed to play it "for free" while the debit resolves in the background. This requirement rules out any option for the `startGame` hook that lets the game loop begin before the RPC result is known.

Settlement and refund do not carry the same constraint: by the time `finalizeMatch` or `abandonRoom` runs, the match has already been played to conclusion (or abandoned). Nothing is waiting on the settlement RPC to *permit* an action — the room can be marked finished/closed in memory immediately, with the financial settlement following asynchronously, as long as the eventual result (wallet credit, voucher issuance, refund) is guaranteed to happen and is observable once it does.

This asymmetry is the key design lever: **entry commitment needs a synchronous-feeling gate before an action; settlement and refund do not.**

---

## 3. Option Evaluation — `startGame` (Entry Commitment)

### Option A: Pre-start asynchronous orchestration, `startGame` stays synchronous
Introduce a new state, e.g. `lifecycleState = "COMMITTING_ENTRY"`, entered when all players are ready. A new async orchestration step — triggered from the same socket handler that currently calls `startGame` directly, *before* calling it — awaits `commit_match_entry`, and only calls the existing synchronous `startGame(socketId)` once the debit has succeeded. `startGame` itself is untouched: it still assumes the room is fully fundable at the moment it runs, because by the time it runs, funding has already happened.

- **Pros:** `startGame`'s internal logic, and every one of its existing internal callers (e.g. `startRematchRound`'s analogous pattern), remains untouched. The asynchronous piece is a new, isolated function with a narrow contract: "resolve commit-or-reject before touching `startGame`." Failure handling is naturally localized — if the RPC rejects (insufficient funds, `WALLET_FROZEN`), the room simply never leaves the pre-game state, and the existing `"room:error"` socket-emission pattern already used elsewhere in RoomManager applies without changes to `startGame`'s own error paths.
- **Cons:** Requires a new transitional lifecycle state and a place to park "we're waiting on the debit" room/UI state (a brief loading affordance on the client between "all ready" and "game actually starts"). Introduces a window where two ready-check completions could both trigger a commit attempt if not guarded — must reuse the same idempotency-key discipline the RPC already provides (`match-entry:<matchId>`), plus an in-memory guard flag on the `Room` object to avoid firing the call twice from within the same process.
- **Caller-impact:** Every call site that currently invokes `startGame` directly (the "all players ready" socket handler, and any admin/dev force-start path, if one exists) must be re-pointed at the new pre-commit orchestration function instead. `startGame`'s own signature and behavior do not change, which minimizes the audit surface for `finalizeMatch`-adjacent code that already assumes `startGame`'s synchronous contract.

### Option B: Make `startGame` itself `async`
Mark `startGame` `async`, `await commitMatchEntry(...)` as its first line, and let every existing caller either `await` it or fire-and-forget it.

- **Pros:** No new lifecycle state; the commit and the start are one function, one call site.
- **Cons:** Changes the type signature of a 3,181-line file's central entry point. Every caller must be located and individually evaluated for whether it already `await`s appropriately, whether it currently relies on `startGame` having *fully completed synchronously* before the next statement runs (a common pattern in event-driven code that was written assuming synchronicity), and whether making it `async` reorders any interleaving with the Node.js event loop in a way that lets another socket event for the same room run in between the (now-yielded) call and its resolution — a category of bug that is easy to introduce and hard to catch in a single-threaded-feeling codebase that has never had to think about that interleaving at this call site before.
- **Caller-impact:** Unknown without a complete caller audit — which is precisely the audit this remediation's constraints (Phase 11) prohibit performing as an implementation task right now. This is the option flagged as **not to be taken without that complete caller-impact analysis**, per the remediation instructions.

### Recommendation for `startGame`
**Option A.** It satisfies the hard "no game start before debit confirmation" requirement with a strictly smaller, more localized change: a new orchestration function and one new lifecycle state, rather than an async-signature change propagating through every existing caller of a central 1,100-plus-line lifecycle method.

---

## 4. Option Evaluation — `finalizeMatch` (Settlement)

### Option A: Queue settlement work after the synchronous `finalizeMatch` returns
`finalizeMatch` keeps its current synchronous contract in full — it flips `room.phase`, advances `lifecycleState` to `COMPLETED`, and dispatches the existing non-economy side effects (`serverTimelineRecorder`, `profileService`, `recentPlayersService`) exactly as it does today. Immediately after (same tick or via `setImmediate`/a microtask, still inside the code path that calls `finalizeMatch`), a new asynchronous settlement step is enqueued: it extracts the ranked participants, determines `p_is_valid_ranking`, and calls `settle_match_economy`. Its result (wallet credits, voucher issuance) becomes visible to clients via a follow-up broadcast once the RPC resolves, separate from the immediate "match finished" broadcast `finalizeMatch` already sends.

- **Pros:** Zero change to `finalizeMatch`'s signature or its existing synchronous guarantees — nothing that currently depends on `finalizeMatch` completing synchronously breaks. Settlement failure (e.g. a conservation-violation bug, or a transient DB error) does not block the game from being marked finished in the UI; it becomes a distinctly-handled "match finished, settlement pending/failed" state, retriable independently.
- **Cons:** There is a window, between "match shown as finished" and "settlement actually applied," during which a player's wallet balance has not yet updated. The client must show a "processing rewards" affordance rather than assuming an instant credit. Requires a retry/failure-surfacing story for the queued settlement call itself (see §5) — an unbounded silent retry is not acceptable, but neither is silently dropping a failed settlement.
- **Caller-impact:** None to `finalizeMatch`'s own callers, since its signature and synchronous behavior are unchanged.

### Option B: Make `finalizeMatch` `async`
Same category of objection as Option B for `startGame`, and arguably worse here: `finalizeMatch` is the single shared completion path for **all 17 game engines**, called from bot-move-completion code, timeout code, and human-move-completion code — its caller surface is larger and more varied than `startGame`'s single "all ready" trigger.

### Recommendation for `finalizeMatch`
**Option A.** Settlement does not gate any player-visible action the way entry commitment does (§2) — nothing requires it to complete before the match is allowed to be shown as finished — so there is no requirement forcing `finalizeMatch` itself to become asynchronous.

---

## 5. Failure and Retry Behavior (Applies to Both Queued-Settlement and Queued-Refund Work)

- The queued call (`settle_match_economy` or `refund_match_entry`) uses the RPC's existing idempotency key (`match-settlement:<matchId>` / a per-match refund key) as its retry key — a retry is always safe to re-issue, by construction of the RPC contract in `docs/economy/economy-v1.md` §6a.
- A failed attempt (transient DB error, connection loss) should be retried with bounded backoff, not looped indefinitely and not silently dropped. If retries are exhausted, the match settlement remains in `COMMITTED` status in the database — which is exactly the state `list_stale_committed_settlements` (`docs/economy/economy-v1.md` §9) is designed to surface for reconciliation. No new recovery mechanism is invented here; the queued-settlement failure path and the crash-recovery path converge on the same read-only reconciliation surface.
- A **business-logic** rejection from the RPC (e.g. `SETTLEMENT_CONSERVATION_VIOLATION`, meaning the participant data RoomManager computed does not conservation-check against the committed total) is not retried — it indicates a bug in placement extraction, not a transient failure, and must be surfaced to operators distinctly from a transient-error retry.

---

## 6. Option Evaluation — `abandonRoom` (Refund)

The same reasoning as `finalizeMatch` applies directly: `abandonRoom` does not gate any player-visible action on the refund completing (the room is being torn down either way), so **queuing `refund_match_entry` after the existing synchronous abandonment logic, using the same retry/reconciliation story as §5**, is the recommended approach, for the same reasons as §4's recommendation.

---

## 7. Summary of Recommendations

| Hook | Recommended shape | Why |
|---|---|---|
| `startGame` (entry commitment) | New async pre-commit orchestration step, called *before* the existing synchronous `startGame`; `startGame` itself unchanged | Hard requirement: game must not start before the debit is confirmed — this is the one hook where the RPC result must gate a player-visible action |
| `finalizeMatch` (settlement) | Queue `settle_match_economy` after the existing synchronous `finalizeMatch` returns; broadcast reward confirmation separately once resolved | Settlement does not gate anything the player is currently blocked on; forcing `finalizeMatch` async has a much larger, unaudited caller surface for no corresponding requirement |
| `abandonRoom` (refund) | Same queued pattern as settlement | Same reasoning as settlement |

None of these are implemented by this document. Turning this proposal into code requires: (1) a complete caller-impact audit of `startGame`'s existing call sites before introducing the new pre-commit orchestration step, (2) a defined client-side "processing" state for the settlement/refund window, and (3) wiring the retry/reconciliation story in §5 to the already-existing `list_stale_committed_settlements` read path rather than inventing a second mechanism. Each of those is separate implementation work, out of scope for this remediation pass.
