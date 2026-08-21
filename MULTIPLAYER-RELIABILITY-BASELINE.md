# Multiplayer Reliability Baseline

**Phase 0 — Discovery & Baseline Audit.** Repository behavior and executable
evidence are the source of truth. No implementation changes were made while
producing this document. Read against: `AGENTS.md` + the 17 docs under
`docs/ai/` (see §0), and the live source under `server/src/` and
`shared/`.

- **Branch**: `main`
- **Baseline commit context**: working tree has an active, unrelated
  concurrent change set in flight (Rummy Smart-Hint, Carrom-perspective
  work, Favourites/Recently-Played feature — see `git status` below). None
  of it touches `server/src/rooms/RoomManager.ts` or any game engine. This
  audit does not touch those files either.
- **Test evidence**: `cd server && npm test` — **96 files / 794 tests,
  100% passing**, fresh run at 2026-08-21T03:58 UTC, 7.80s wall time. No
  server-side game-logic files were modified before this run.

```
 M client/src/components/bhalyam/data.ts
 M client/src/components/reactions/FloatingReactionsLayer.tsx
 M client/src/games/bingo/... (reaction rollout, prior session)
 M client/src/games/carrom/... (concurrent session's own work)
 M client/src/games/chess/...
 M client/src/games/handcricket/...
 M client/src/games/rummy/RummyBoardDesktop.tsx (MM — reaction rollout + concurrent Smart-Hint merge)
 M client/src/games/rummy/RummyBoardMobile.tsx (MM — same)
 M client/src/pages/Room.tsx
?? CARROM-PERSPECTIVE-ANALYSIS.md, CARROM-PLAYER-PERSPECTIVE-FIX.md (concurrent session)
?? client/src/hooks/useFavourites.ts, useRecentlyPlayed.ts (concurrent session)
?? client/src/games/rummy/HintBanner.tsx, hintEngine.ts (concurrent session)
```
None of this is touched by, or blocks, the reliability audit below.

---

## 0. Governance Read (mandatory doc-load, condensed)

Full digest gathered from all 17 `docs/ai/*.md` files plus `AGENTS.md`.
Only what bears on this mission is kept here; see the four parallel
research passes for exhaustive per-file notes if needed later.

**10 Inviolable Platform Laws** (`bhalyam-platform-rules.md`) — the ones
load-bearing for this mission:
- #2 *Never compute game logic locally on the client* — server authority,
  confirmed live (see §2).
- #7 *Never trust unvalidated client broadcasts* — closed-set sanitization
  exists for avatars/reactions; **does not yet cover chat/player-name/
  room-code** (see Gap G11).
- #8 *Never introduce Redis or an external DB in the game loop* — active
  room state is deliberately in-memory-only (ADR 001); this is a
  constraint the reliability work must respect, not remove.
- #9 *Never leak memory from untorn-down timers/listeners* — a real
  `LifecycleRegistry`/`ResourceTracker`/`LeakDetector` triad already
  enforces this platform-wide (§2.7).

**12 Mandatory Game Capabilities** (`bhalyam-game-framework.md`) —
capability #8 *Network Recovery* ("reconnection via `seatToken` within a
90-second grace period without forfeit") and #9 *Rematch Loop* are the two
directly in scope; both are implemented (§2.1, §2.5).

**Relevant ADRs** (`bhalyam-decision-log.md`):
- **ADR 001** — in-memory `RoomManager`, no Redis/external cache;
  reconnection resilience is explicitly delegated to the 90s grace period
  + HMAC `seatToken`, *not* to durable state. This is the architectural
  reason server-restart cannot recover an active match (Edge Case 21) —
  it's a decision, not an oversight.
- **ADR 004** — cryptographic HMAC `seatToken`s, explicitly to close a
  named seat-spoofing attack ("attacker rejoins using a victim's
  `playerId`"). Confirmed implemented (§2.1).
- **ADR 005** — 100% server-authoritative logic; bot takeover
  (`applyAutoMove`) reuses the *same* validation path as human moves —
  this is why bot-takeover-for-a-disconnected-human works uniformly
  across all engines with zero per-engine special-casing (§2.6).
- **No ADR exists** for host migration, rematch, match-result-reason
  taxonomy, or reward/XP persistence semantics. Any reliability work
  touching those areas is unconstrained by prior decision — new work here
  should generate a new ADR, not silently improvise.

**`antigravity.md`** 11-phase framework and 7-persona review (incl. an
explicit **QA & Chaos Reliability Specialist** persona) is the process
this audit followed: phases 1–2 (requirement/impact), 6 (edge case/chaos),
7 (security/boundary), 10–11 (production readiness, adversarial
self-critique) map directly onto this mission's structure.

**`testing-standards.md`** — critical caveat carried into this audit
verbatim: *"100/100 on `release:check`/`enterprise:check` aggregates
typecheck, unit tests, bundle budgets, a11y source-scan and dependency
governance. It does not include persistence durability, rendered
accessibility, mobile layout measurement, or coverage thresholds."*
Nothing in this baseline treats a green `npm test` run as proof of
runtime correctness beyond what that specific test actually asserts.

**Docs skimmed and confirmed not relevant to this mission**:
`bhalyam-design-system.md`, `frontend-standards.md`,
`accessibility-standards.md`, `performance-standards.md`,
`ui-ux-standards.md`, `prompting-guide.md`.

---

## 1. Governance-Doc Staleness — a finding in its own right

`AGENTS.md` (repo root, itself one of the mandatory docs) makes two claims
that are **directly false** against the current tree:

> "Room and game state remain entirely in-memory... the server holds no
> DB connection and needs no `DATABASE_URL`." (line 74)
> "Match history / durable game results — not built." (line 560)

**Both are false as of the current commit.** `server/src/persistence/`
(2,727 lines) is a full Supabase-Postgres-backed progression store —
profiles, XP ledger, achievements, match history, friends, parties,
season/tournament records — wired at the top of `server/src/index.ts`
(`initialiseProgressionStore()` + `hydrateProgression()`, both awaited
**before** `server.listen()`), backed by a real migration
(`supabase/migrations/20260818000000_progression_persistence.sql`) with
DB-unique-index idempotency on most tables.

`git log` shows `AGENTS.md` and `SupabaseProgressionRepository.ts` were
committed **in the same commit** (2026-08-19 01:55) — this is not drift
over time, the governance doc shipped already contradicting the code
sitting next to it.

**What is still true**: *active, in-flight room/match state*
(`RoomManager`'s `Map<code, Room>`, turn state, board state, sockets,
timers) has zero snapshot/rehydrate logic and does **not** survive a
restart — `server/src/index.ts` even documents this explicitly for the
per-boot `bootId`: *"Survives nothing: a redeploy, a crash, or a
free-tier idle spin-down all produce a new one."* So AGENTS.md is right
about **live room state**, wrong about **durable progression data**. Both
halves matter for this mission (Edge Case 21, Edge Case 27) and must be
scoped separately — see §5.

**Action needed** (flagged, not yet done): `AGENTS.md` §2 and §18 need a
correction pass to describe the real persistence boundary. Out of scope
for this audit unless the user asks for it explicitly.

---

## 2. Current Behavior — Core Lifecycle Machinery

All of this lives in `server/src/rooms/RoomManager.ts` (3,090 lines),
`server/src/sockets/index.ts`, `server/src/games/GameEngine.ts`,
`server/src/lib/seatToken.ts`, `shared/lifecycle.ts`.

### 2.1 Disconnect / reconnect

- `socket.on("disconnect")` → `RoomManager.handleDisconnect` (`:2562-2689`).
- Player marked `isConnected=false`, `awaySince`, `awayUntil` set.
- **Grace periods**: `GRACE_PERIOD_MS = 90_000` (lobby) vs.
  `MATCH_GRACE_PERIOD_MS = 10 * 60_000` (mid-match, or the departing
  player was the last human — "solo"). Distinct, deliberate values.
- **Takeover grace**: `TAKEOVER_GRACE_MS = 10_000` — a disconnected seat
  isn't immediately auto-played; only after 10s of continued absence
  (with other humans still present) does `armTakeover` flip
  `isAutoPlaying = true, autoPlayReason: "disconnected"` and start
  driving the seat through the bot pipeline.
- **Solo-human disconnect**: the table is **frozen**
  (`transitionLifecycle(room, "PAUSED")`, timers cleared), not
  auto-played — auto-playing to completion while nobody's watching would
  be worse than pausing (explicit code comment).
- **Idle-but-connected takeover**: `IDLE_STRIKES_BEFORE_TAKEOVER = 2` —
  two consecutive turn-timer lapses while still connected also triggers
  takeover (`autoPlayReason: "idle"`), cleared by *any* inbound socket
  activity (deliberately fail-open, not move-specific).
- **Reconnect identity**: `playerId` **and** a server-signed HMAC
  `seatToken` (`seatToken.ts:60-87`) — a bare `playerId` is insufficient
  by design (ADR 004, closes a documented seat-theft exploit). A failed
  token silently falls through to "new seat" rather than confirming/
  denying the id was real (timing-safe, doesn't leak which ids exist).
- **On reclaim**: cleanup timer cleared, takeover released, turn
  timers/bot scheduling re-armed, and the returning player is told how
  many turns were auto-played on their behalf
  (`greetReturningPlayer`/`room.autoPlayedFor`).
- **Grace-expiry**: seat deleted, `engine.removePlayer` runs, host
  reassigned if needed, table resumed for the rest.

### 2.2 Host / room ownership

- `Room.hostId`; mirrored per-seat as `Player.isHost`.
- Reassignment (`reassignHost`, `:1310-1350`) on explicit host leave
  **or** host disconnect-grace-expiry — same function, same priority:
  1. connected, non-guest member
  2. any connected human (guest included)
  3. any member, even away
  4. whatever's left
  - Candidate pool excludes bots and Pass & Play (local) seats.
- **Exactly one host, always**: the reassignment sweep sets `isHost` on
  *every* seat in one synchronous pass — no window where 0 or 2 hosts
  exist while the room remains in the Map.
- If no human remains, the room is abandoned (deleted), not left
  host-less.
- **Unconfirmed vs. AGENTS.md**: §18 of AGENTS.md claims a guest
  inheriting the host role gets the room sealed "on the way." No
  `sealRoom` call was found inside or near `reassignHost` — this needs a
  targeted read of `guestSealedRoom.test.ts` to confirm whether it's
  implemented elsewhere (e.g. client-driven) or the claim is stale. Not
  resolved in this pass — flagged as an open question, not asserted
  either way.

### 2.3 Idempotency / duplicate commands

- **`game:move`**: client-supplied `actionId`; key
  `` `${playerId}:${actionId}` `` deduped for 15,000ms — a duplicate
  within the window is dropped and the current (not re-mutated) state is
  re-sent to the caller. Cache pruned once it exceeds 200 entries / 30s
  old.
- **`room:join`**: two layers — seat-reclaim (token match, naturally
  idempotent) and same-socket-already-seated short-circuit (explicitly
  there for React StrictMode double-invoke / connect races).
- **`room:create`**: no idempotency — by design, no natural dedup key.
- **Rate limiting**: global token-bucket (15 cap, 10/s refill) on every
  socket event except a small allow-list (`webrtc:signal`,
  `room:setOrientation`, `net:ping`, etc.); silent drop on exceed (no
  ack, no error). Separate, tighter limits for reactions (6/4s) and
  soundboard clips.

### 2.4 Room/match state — **two parallel trackers, not kept in sync**

1. `room.phase: "lobby" | "playing" | "finished"` — the value actually
   consulted by nearly every gameplay branch (dozens of call sites).
2. `room.lifecycleState: RoomLifecycleState` — a 10-value enum
   (`CREATED, WAITING_FOR_PLAYERS, READY_CHECK, STARTING, IN_PROGRESS,
   RECOVERING, PAUSED, COMPLETED, ABANDONED, CLOSED`,
   `shared/lifecycle.ts`) with a transition-validity matrix, enforced
   best-effort (logged, not thrown) by `transitionLifecycle()`.

**These desync.** See Gap G2 below — three of four match-completion code
paths set `room.phase = "finished"` directly and never call
`transitionLifecycle(room, "COMPLETED", ...)`. `STARTING` is defined in
the enum and never assigned anywhere.

- **Sealed rooms**: one-way (`sealRoom`, no `unsealRoom`), checked
  *after* seat-reclaim/idempotency so a sealed room's own members can
  still get back in; reconnect (token reclaim) is never blocked by
  `sealed` — only brand-new joins are.

### 2.5 Rematch state machine

`idle → pending → accepted → (3s countdown) → restart`, or
`idle → pending → declined → (2.5s cosmetic delay) → idle`.
Two timers: `rematchTimer` (30s request window) and `rematchStartTimer`
(3s post-acceptance countdown). **Both are absent from `abandonRoom`'s
cleanup list** (which clears `turnTimer`/`dealGateTimers`/`simTimer`/
`cleanupTimers`/`takeoverTimers` but not these two) — see Gap G8.

### 2.6 Bot takeover / Pass & Play

- A disconnected-or-idle human seat and a real bot are driven through the
  **identical** `applyAutoMove` pipeline (`scheduleBotMoveIfNeeded`
  filters `pendingActors()` by `isBot || isAutoDriven`) — this is ADR
  005's payoff: zero per-engine special-casing needed for takeover.
- Bots disabled entirely for `snake`, `roadrash`, `spacewar`
  (`NO_BOT_GAMES`) — dead/frozen seats would make no sense there.
- Pass & Play (`isLocal` seats) allow-listed to open-information games
  only: `ludo`, `snl`, `wordbuilding`, `dotsboxes`. A local seat's
  auto-play status is **inherited from the host's** `isAutoPlaying` flag
  — if the host disconnects, every local seat at that table freezes/
  auto-plays together, since only the host's socket can act for them.

### 2.7 Spectators

- Fully implemented, structurally isolated: spectator sockets live in a
  **separate** `Map` (`spectatorToRoom`), never folded into
  `socketToPlayer` — every seat-keyed mechanism (takeover, timers,
  rematch, host migration) is naturally blind to spectators by
  construction, not by an extra check.
- A spectate attempt on a room the socket already holds a seat in is
  refused; there is no reverse check needed (structurally impossible).
- **No spectator→player promotion path exists anywhere** — confirmed by
  reading the full spectator code path, not inferred.
- Spectators only ever receive `getPublicState()`, never
  `getStateFor(playerId)` — enforced with a comment calling this "the
  whole security model of this feature."
- Sealed rooms reject new spectate attempts and evict existing spectators
  on seal.

### 2.8 Timers inventory (complete)

| Timer | Purpose | Cleared by |
|---|---|---|
| `turnTimer` | per-turn/phase deadline | `clearTurnTimer` |
| `dealGateWaitTimer` / `dealGateAnimTimer` | Rummy/UNO pre-deal animation gate before the real clock arms | `clearDealGateTimers` |
| `simTimer` | real-time tick loop (Snake/Carrom/SpaceWar) | `stopSimulation` |
| `rematchTimer` | 30s rematch-request window | `clearRematchTimers` — **not called from `abandonRoom`** |
| `rematchStartTimer` | 3s post-accept countdown | same, same gap |
| `takeoverTimers` (per-seat) | 10s blip tolerance before auto-play promotion | `releaseTakeover` |
| `cleanupTimers` (per-seat) | grace-period seat deletion | cleared on reclaim |
| bot sub-move delay | per-sub-move "thinking" pause | self-guards on `room.phase`/`engine` identity, no stored handle |
| declined-rematch cosmetic delay | 2.5s before flipping back to idle | self-guards on `rematch.status`, no stored handle |

Module-level: `rateLimiter.ts` prunes stale buckets every 5 minutes.

Platform-wide leak defense already exists and is wired: `LifecycleRegistry`
binds timer handles to a room code so `cleanupRoom()` guarantees zero
orphans on the paths it's used for; `ResourceTracker` flags any timer
alive past 1 hour; `MemoryMonitor` samples heap growth; `LeakDetector`
synthesizes all three into a scored report exposed at
`/api/operational/leaks`.

### 2.9 Event / staleness validation

**Confirmed absent.** No turn-number, sequence-number, or state-version
field is attached to inbound socket events or checked against a "current"
value anywhere in `RoomManager.ts`. What exists as partial substitutes:
`actionId` dedup (prevents *duplicate*, not *stale*, processing),
per-engine phase/turn-ownership checks inside `applyMove` (not audited
exhaustively across all 17 engines in this pass), and a `server:hello`
`bootId` that lets a client detect a full server restart (coarse,
connection-level, not per-event). **No mechanism rejects a late-arriving
event that belongs to a since-superseded turn, or a stale reconnect that
targets a match the player has since left** — Edge Cases 20, 24, 25 are
not covered by any generic platform mechanism today.

### 2.10 Cleanup / room deletion

Single deletion path: `abandonRoom`, fired synchronously on an explicit
last-human leave or at the end of a per-seat grace timer that finds no
humans remaining. By construction there's no race between reconnect and
deletion for the *same* seat (reclaim clears that seat's specific
cleanup timer before it can fire). The one confirmed gap is the
dangling rematch-timer issue in §2.5/G8 — a resource-leak/dangling-
callback risk, not a reconnect race.

### 2.11 Result / outcome recording

`room.engine.isOver()` is checked from **four independent call sites**:
1. `applyMove` — direct human/bot move. **The only site** that calls
   `profileService.recordMatchFinished`, `recentPlayersService.recordMatch`,
   `rankingService.invalidateCache`.
2. `scheduleBotMoveIfNeeded`'s sub-move closure (bot/takeover-forced finish).
3. `startSimulation`'s tick loop (Snake/Carrom/SpaceWar real-time finish).
4. `afterAutoMove` (turn-timeout-driven finish — Rummy/Ludo/Chess/UNO/
   Bingo/NamesPlaceAnimal/Tambola).

Sites 2–4 set `room.phase = "finished"` and broadcast, but **do not**
record match history, stats, XP, achievements, or advance
`lifecycleState` to `COMPLETED`. This is Gap G1/G2 — the single most
consequential finding of this audit.

No shared cross-game result-reason type exists — only
`shared/profile/MatchHistory.ts`'s `MatchResult = "WIN"|"LOSS"|"DRAW"`,
with no forfeit/timeout/resignation/abandonment/disconnect distinction
reaching the reward layer. Per-engine ad hoc fields exist (Rummy's
`endedByDisconnect`, SNL's `endReason`) but don't unify.

---

## 3. Existing Safeguards (confirmed working, with test evidence)

| Safeguard | Evidence |
|---|---|
| Seat-token reconnect security | `seatToken.ts`; `rooms/__tests__/seatSecurity.test.ts`; chaos test "recovery-token spoofing" |
| 90s / 10min grace periods, solo-freeze vs. multi-takeover split | `RoomManager.ts:96,112`; `rooms/__tests__/disconnectTakeover.test.ts`, `departure.test.ts` |
| Deterministic, atomic host reassignment | `RoomManager.ts:1310-1350`; `hostFailoverAndIdempotency.test.ts` |
| `actionId` move idempotency | `RoomManager.ts:1193-1215`; `hostFailoverAndIdempotency.test.ts` "duplicate submission" case; chaos "duplicate/out-of-order actions" |
| Join dedup (StrictMode/race-safe) | `RoomManager.ts:721-740`; `joinDedup.test.ts` |
| Rate limiting (global + reaction + soundboard) | `lib/rateLimiter.ts`; `rateLimiter.test.ts` |
| Sealed-room one-way seal, reconnect bypass | `RoomManager.ts:478-489,746`; `guestSealedRoom.test.ts` |
| Spectator isolation, no promotion path | `RoomManager.ts:2528-2560,2748-2753`; `spectator.test.ts` |
| Pass & Play allow-list (open-info games only) | `RoomManager.ts:924-929` |
| Uniform bot/takeover pipeline (ADR 005 payoff) | `RoomManager.ts:1382-1487`; `reconnectSoloBots.test.ts` |
| Durable progression store, boot-time hydrate, DB-unique-index idempotency on most tables | `persistence/index.ts,hydrate.ts`; `persistence/__tests__/repositoryContract.test.ts` (parity-tested across in-memory and Supabase implementations, incl. 10-parallel-claim race test) |
| Match-history / XP-ledger idempotency (the one wired completion path) | `ProfileService.ts:78-150`; `profileService.test.ts` |
| Season-tier claim idempotency (DB PK-guarded) | `SeasonRewardsEngine.ts`; `seasonService.test.ts` |
| Operational API fail-closed auth, refuses prod boot if unconfigured | `operationalAuth.ts:301-334`; `operationalAuth.test.ts` (26 tests) |
| Player-scoped REST authorization (real exploit replay) | `auth/identity.ts`; `playerAuthorization.test.ts` (20+ replayed exploit scenarios against real mounted routers) |
| Chaos-tested disconnect/reconnect storms, seat-spoofing, host abandonment, duplicate actions | `chaos/__tests__/chaosScenarios.test.ts`, `chaosVerificationPipeline.test.ts` |
| Load-tested at 500 rooms / 1000 players | `scale/__tests__/scaleValidation.test.ts` |
| Timer/resource leak prevention, wired platform-wide | `reliability/LifecycleRegistry.ts`, `ResourceTracker.ts`, `MemoryMonitor.ts`, `LeakDetector.ts` |

---

## 4. Missing Safeguards / Confirmed Gaps

Severity is my assessment against the mission's Core Principles, not a
formal CVSS score. All are **confirmed by reading the code**, not
inferred — each has a citation. None have been fixed yet (Phase 0 is
audit-only).

| ID | Severity | Finding | Violates |
|---|---|---|---|
| **G1** | **CRITICAL** | Match completion via bot-takeover-forced finish, real-time-tick finish (Snake/Carrom/SpaceWar), and turn-timeout finish (`afterAutoMove`) — 3 of 4 completion paths — never call `profileService.recordMatchFinished`. No match history, stats, XP, or achievements recorded for those matches, winner included. | Core Principle #10 ("every final outcome must have a recorded reason and audit evidence") |
| **G2** | **HIGH** | Same 3 paths never call `transitionLifecycle(room, "COMPLETED")` — `lifecycleState` can remain stuck at `IN_PROGRESS`/`PAUSED`/`RECOVERING` for a room whose `phase` is already `"finished"`. Two state machines desync. | Standard Lifecycle Model (mission spec) |
| **G3** | **HIGH** | `TournamentService.reportMatchResult` / `BracketEngine.advanceWinner` have no guard against re-processing an already-completed final match. A replayed `POST /:id/match` re-grants XP (via `XPEngine.awardChallengeXP`, which bypasses the XP ledger entirely — no `source_id`, no idempotency key) and re-increments season stats unconditionally. **Untested** — no test exercises a duplicate tournament-result report. | Edge Case 26 (Repeated Completion), Edge Case 27 (Rewards and Statistics) |
| **G4** | **HIGH** | No generic event/turn/version staleness validation anywhere (§2.9). Late events, stale reconnects to a superseded match, and wrong-turn submissions rely entirely on unaudited per-engine phase checks. | Edge Case 20, 24, 25 |
| **G5** | **MEDIUM** | No shared cross-game result-reason model — `MatchResult` is `WIN`\|`LOSS`\|`DRAW` only, no forfeit/timeout/resignation/abandonment distinction reaches the reward layer. | Match Result Reasons (mission spec) |
| **G6** | **MEDIUM** | Carrom's engine declares a full proactive shot-clock contract (`setTurnDeadline`/`armDeadline`/`resolveDeadline`) that `RoomManager.scheduleTurnTimer`/`onTurnTimeout` never call — dead code. A connected-but-stalled aiming player is never auto-resolved by timeout, only by an actual socket disconnect. | Game-Specific Policy Matrix (1v1 default: "match continues after reconnect," implicitly requires a working deadline) |
| **G7** | **MEDIUM** | SNL, Chess, Hand Cricket, Carrom are absent from the shared `scheduleTurnTimer`/`onTurnTimeout` dispatch. Chess/HandCricket compensate with bespoke *reactive* engine-internal clocks (checked on next interaction, not proactively enforced); SNL has no replacement at all. | Edge Case 25 (Timer Expiry Races) — a connected-idle player in these 4 games is never proactively resolved |
| **G8** | **MEDIUM** | `rematchTimer`/`rematchStartTimer` are not cleared inside `abandonRoom` — could fire a stray callback against a detached Room object after the room is deleted from the Map. | Edge Case 29 (Room Deletion and Cleanup) |
| **G9** | **LOW** | `RoomLifecycleState.STARTING` is defined in the enum, never assigned anywhere. | Standard Lifecycle Model hygiene |
| **G10** | **LOW / UNCONFIRMED** | AGENTS.md §18 claims a guest inheriting host via `reassignHost` seals the room "on the way" — no `sealRoom` call found inside/near `reassignHost`. Needs a targeted read of `guestSealedRoom.test.ts` before asserting either way. | Edge Case 8 (Room Ownership Transfer) — needs verification, not yet a confirmed defect |
| **G11** | **MEDIUM (security-adjacent)** | `PayloadValidator` (`sanitizeObject`, `validatePlayerName`, `validateChatMessage`, `validateRoomCode`) and `RoomEnumerationGuard` (IP-level brute-force block) are fully built and unit-tested **in isolation**, but grepped zero references anywhere outside their own module + tests. Player names, chat messages, and room codes are not run through them on the live path; room-code lookups have no brute-force protection. | Platform Law #7 ("never trust unvalidated client broadcasts") |
| **G12** | **MEDIUM** | `XPEngine.awardChallengeXP`/`awardAchievementXP` write only a plain-upserted total, no XP-ledger row, no `source_id` — unlike match-XP, which is properly ledgered. This is the mechanism that lets G3's double-grant actually stick durably. | Edge Case 27 |
| **G13** | **LOW (product, not reliability)** | Social (`friendsService.recordMatchTogether`), Season (`recordSeasonMatch` outside tournaments), and Tournament match-reporting are not wired to live room match completion — reachable only via separate REST calls. Noted because it bears on "does every final outcome have recorded evidence," but it's a completeness gap, not a correctness bug. | Core Principle #10 (partial) |

---

## 5. Persisted vs. In-Memory State

| State | Persisted? | Where |
|---|---|---|
| Active room (turn state, board, sockets, timers, seat tokens at runtime) | **No** — in-memory `Map<code, Room>` only | `RoomManager.ts:325` |
| Per-room event timeline (`ServerEventStore`) | **No** — in-memory, capped 10k events/room, cleared on room teardown | `events/ServerEventStore.ts` |
| Metrics / telemetry / performance budgets | **No** — in-memory only | `observability/*` |
| Tournament/bracket working state | **No** — no `hydrate()` method exists for this module | `tournaments/TournamentService.ts` |
| Player profiles, stats, unlocked achievements | **Yes** — write-behind + boot-time hydrate | `persistence/*`, Supabase Postgres |
| XP ledger (match-XP only — see G12) | **Yes**, DB-unique-index guarded | same |
| Match history summaries | **Yes**, deterministic `matchId` dedup | same |
| Challenge claims | **Yes**, DB PK-guarded | same |
| Season stats + tier claims | **Yes** (tier claims PK-guarded; running stats via plain upsert) | same |
| Friends, friend requests, parties, invitations | **Yes** | same |
| Tournament placement records (not live bracket state) | **Yes**, PK-guarded | same |
| Guest/account identity | Cryptographically derived (HMAC), not stored; identity *records* durably upserted when Supabase configured | `auth/*`, `persistence/ProgressionSync.ts` |

**Server-restart conclusion** (Edge Case 21): **CONFIRMED — no recovery
for an active/in-progress match.** This is architecturally deliberate
(ADR 001), not a bug. Progression/account data **does** survive a
restart. Any reliability work must treat these as two separate
guarantees and never conflate them in a report.

---

## 6. Game-by-Game Behavior Matrix

Legend: **1v1** = exactly 2 players, forfeit-to-opponent on leave. **Multi**
= 3+ possible, continues with departed seat skipped, walkover-win if only
one remains. **Race** = simultaneous/real-time, no turn concept. **Solo**
= not actually multiplayer.

| Game | Players | Type | On explicit leave / grace-expiry | In shared `scheduleTurnTimer`? | Dedicated exit test? |
|---|---|---|---|---|---|
| Rummy | 2–6 | Multi | Ends round if `<2` hands remain, records `endedByDisconnect`, finalizes scores | Bespoke (deal-gate + arrange deadline) | No |
| SNL | 2–10 | Multi | Walkover-win if 1 remains | **No** (no branch, no replacement) | Yes (`engine.test.ts`) |
| Ludo | 2–8 | Multi | Drops seat, crowns sole survivor if `<2` | Bespoke (think-delay accounts for client anim) | Yes (`reconnect.test.ts`) + room-level reference game for takeover suite |
| UNO | 2–8 | Multi | Drops seat, returns hand to deck, crowns sole survivor | Standard, but `onTurnTimeout` deliberately doesn't auto-declare UNO for a human | Yes (`engine.test.ts`) |
| Star Game | 2–8 | Multi | Re-splices relay/pass order, crowns leader if below min | Phase-timer (shared contract w/ NamesPlaceAnimal/Tambola) | No (relay tests only) |
| Names/Place/Animal | 2–8 | Multi | Force-finalizes if below min | Phase-timer | No |
| Bingo | 1–8 | Multi (turn-based, not classic caller) | Finishes if seat order empties | Bespoke, shared arranging window, excluded from idle-strike counting | Yes (`marking.test.ts`) + 2 room-level scenarios |
| Tambola | 1–8 | Multi (simultaneous marking) | Discards arrangement, may auto-advance phase | Phase-timer | No |
| Word Building | 2–4 | Multi | Crowns sole survivor if `<2` | Standard (0 = disabled, "player-friendly mode") | No |
| Dots & Boxes | 2–6 | Multi | Crowns sole survivor if `<2` | Standard (0 = disabled) | **No test directory exists at all** |
| RPS | 2 | 1v1 (simultaneous) | Auto-win for remainder | Bespoke shared round-deadline | No |
| Chess | 2 | 1v1 | Auto-win + explicit `resign` move type; time-forfeit via internal wall clock | **No** — reactive internal clock only | Yes (resignation) |
| Carrom | 2 | 1v1 + physics tick | Auto-win for remainder | **No** — declared but dead code (G6) | Yes (`ends when a player leaves`) |
| Hand Cricket | 2 | 1v1 | Auto-win for remainder; bespoke reactive innings-break window | **No** — reactive internal clock only | Yes, + 2 dedicated room-level abandon-vs-forfeit scenarios |
| Snake | 1–4 | Race | Removes that snake, race continues for the rest; `NO_BOT_GAMES` | N/A (tick-driven) | No |
| Block Blast | 1–8 | Race (shared deadline, no turns) | Race continues for the rest | Bespoke single fixed deadline, excluded from idle-strike counting | Yes (both solo-end and multi-continues cases) |
| Space War | **1** | **Solo — not multiplayer** | Ends the (single-player) game | N/A | No (not applicable) |

---

## 7. Current Test Coverage Summary

- **96 test files, 794 tests, 100% passing** (fresh run, this session).
- Real adversarial coverage already exists and passes: disconnect
  mid-move, refresh-reclaim, 50-way reconnect storm, seat-token spoofing,
  host abandonment mid-turn, 100-way room-reclaim storm, duplicate-
  `actionId` replay (`chaos/__tests__/*`).
- Load coverage: 100 rooms/200 players/500 moves in <5s; 500 rooms/1000
  players, p95 move-processing <35ms (`scale/__tests__/scaleValidation.test.ts`).
- Security replay coverage: 20+ documented exploits replayed against real
  mounted routers (`auth/__tests__/playerAuthorization.test.ts`).
- **Coverage is uneven per-game**: Ludo, UNO, SNL, Chess, Carrom, Hand
  Cricket, Block Blast, Bingo have direct engine-level exit/disconnect
  tests. Rummy, Star Game, Names/Place/Animal, Tambola, Word Building,
  Snake, Space War do **not** — they rely entirely on generic
  RoomManager-level coverage, which is itself Ludo/HandCricket/Bingo-
  centric.
- **Dots & Boxes has zero test coverage of any kind** — no `__tests__`
  directory exists for it.
- **Confirmed untested** (not merely "no safeguard" — no test even
  attempts it): tournament-result replay/double-grant (G3), event/turn
  staleness (G4), simultaneous both-sides reconnect in the same room,
  reconnect racing a match that already completed via the timeout/
  bot-takeover path (since that path itself under-records — G1).
- **No client-side reconnect/disconnect UI test evidence gathered in this
  pass** — `client/src/core/recovery/__tests__/ConnectionStateManager.test.ts`
  and `client/src/core/events/__tests__/TimelineRecorder.test.ts` exist
  and pass (527/527 client tests green, confirmed earlier this session)
  but were not read for behavioral correctness in this Phase 0 pass —
  flagged as follow-up, not yet audited.

---

## 8. What Phase 0 Deliberately Did Not Do

Per the mission's explicit instruction, no implementation changes were
made. Not yet produced (require a scoping decision — see the message
accompanying this document): `MULTIPLAYER-LIFECYCLE-ARCHITECTURE.md`,
`GAME-EXIT-POLICY-MATRIX.md`, `RECONNECT-RECOVERY-REPORT.md`,
`CONCURRENCY-IDEMPOTENCY-REPORT.md`, `MULTIPLAYER-EDGE-CASE-VERIFICATION.md`,
`MATCH-RESULT-STANDARDIZATION.md`, `MULTIPLAYER-RELIABILITY-REMAINING-RISKS.md`,
`multiplayer-edge-case-results.json`, any browser/server-restart testing,
and no code was fixed (including G1–G13 above).
