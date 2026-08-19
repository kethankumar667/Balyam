# P0-3 — Durable persistence foundation

Status: **IMPLEMENTED, NOT VERIFIED.**
The schema, repositories, write path and hydration are complete and the whole
server suite is green. **Durability itself is unproven**, because verifying it
needs a Postgres this environment does not have. No durability claim is made.

---

## 1. Original failure

Progression, social and party systems were process-local `Map`s. A redeploy, a
crash, or a free-tier idle spin-down erased every one — including the record of
which rewards had been claimed, so *"already claimed"* was only true until the
next restart.

Two further defects found while fixing it:

- **`MatchHistoryService.recordMatch` was not idempotent.** Match ids embedded
  `Date.now()`, so a replayed completion (host failover, retried ack) produced a
  *new* id and wrote a second copy of the same match — inflating the stats
  projected from it. Ids are now derived from `(roomCode, startedAt, player)`.
- **`GET /api/profile/:playerId` created rows** (see P0-2).

---

## 2. Files changed

| File | Purpose |
|---|---|
| `supabase/migrations/20260818000000_progression_persistence.sql` | **new** — 19 tables, RLS, retention |
| `…_progression_persistence_rollback.sql` | **new** — destructive, ordered, documented |
| `server/src/persistence/ProgressionRepository.ts` | **new** — the interface |
| `server/src/persistence/InMemoryProgressionRepository.ts` | **new** — tests + dev |
| `server/src/persistence/SupabaseProgressionRepository.ts` | **new** — Postgres |
| `server/src/persistence/postgrest.ts` | **new** — ~80-line PostgREST client |
| `server/src/persistence/index.ts` | **new** — selection, `ping`, startup guard |
| `server/src/persistence/ProgressionSync.ts` | **new** — write-behind queue |
| `server/src/persistence/hydrate.ts` | **new** — boot-time restore |
| `server/src/persistence/__tests__/repositoryContract.test.ts` | **new** — 22 tests, both impls |
| `scripts/persistence/verifyPersistence.mjs` | **new** — the 5 validations |
| `scripts/quality-gates/persistenceVerification.mjs` | **new** — receipt gate |
| `docs/runbooks/persistence.md` | **new** |
| 8 services | `hydrate()` seams + sync calls |
| `server/src/index.ts` | async `boot()`, drain on SIGTERM, `/health` posture |

**No new dependency.** `@supabase/supabase-js` was considered and rejected: the
server already calls Supabase over `fetch` (`lib/supabaseAuth.ts`), and
PostgREST is the same HTTP API that library wraps. Eighty lines beat a
dependency the bundle-budget and dependency-governance gates exist to question.

---

## 3. Persistence model

19 tables with primary keys, foreign keys, uniqueness constraints and indexes:

`player_identities` · `player_profiles` · `xp_ledger` · `player_achievements` ·
`challenge_claims` · `friends` · `friend_requests` · `parties` ·
`party_members` · `party_invitations` · `match_summaries` ·
`match_participants` · `tournament_records` · `season_stats` ·
`season_reward_claims` · `season_snapshots` · `reward_audit` ·
`room_timelines` · `operational_telemetry`

**The identity decision that shapes everything:** not every player is an
`auth.users` row. A guest has a server-minted `guest_<32 hex>` identity and
accumulates real progress, so everything hangs off
`player_identities.player_id text` and `auth.users` joins in *optionally*.
Hanging progression off `auth.users` would have meant either no guest
progression or a second parallel schema for guests.

### Idempotency is the database's job, not the application's

| Guarantee | Enforced by |
|---|---|
| XP awarded once per source | `xp_ledger_source_idx (player_id, source_kind, source_id)` |
| Challenge reward once per period | `PK (player_id, challenge_id, period_key)` |
| Season tier once | `PK (season_id, player_id, tier_id)` |
| Match recorded once | `match_summaries_natural_key_idx (room_code, started_at)` |
| One party per player | `party_members_one_party_idx (player_id)` |
| One pending request per pair | partial unique `where status = 'PENDING'` |
| One granted reward per key | partial unique `where outcome = 'granted'` |

Writes use `Prefer: resolution=ignore-duplicates,return=representation`, so the
response body *is* the set of rows the database actually wrote. `applied:false`
means the constraint refused it — decided under real concurrency, not by a
`select` that raced the `insert`.

### RLS

Every table has RLS **enabled and forced**. The server holds the service-role
key, which bypasses RLS — that is what "privileged mutations stay on the
server" means. The only policies created are SELECT-your-own-rows for
authenticated members; **no INSERT/UPDATE/DELETE policy exists for `anon` or
`authenticated` on any table**. A `leaderboard_public` view exposes exactly the
five columns a board row shows, so `player_profiles.last_seen_at` is not
published.

### Retention

`room_timelines` stores a bounded **summary** with a 30-day expiry, not the raw
per-move log — that would grow without bound and keep move-by-move records of
people's play sessions forever. `operational_telemetry` expires at 14 days.
`public.prune_expired_records()` does the deleting and returns a row per table
so a scheduled run is verifiable.

---

## 4. Controlled migration

Services are synchronous and some are called from the realtime path —
`RoomManager` records a finished match in the same tick it broadcasts the end of
the game. Making them `async` would ripple into socket handlers and engines, and
**altering realtime behaviour was forbidden**.

So: services keep their in-memory state and synchronous signatures, and hand
every durable fact to `ProgressionSync`, which **writes behind** the caller.
Reads come from memory; the store is what memory is restored from at boot
(`hydrateProgression`). All **792 server tests stayed green** through the whole
migration.

**Wired (write + hydrate):** profiles, XP ledger, achievements, challenge
claims, season stats/claims/snapshots, match summaries, friends, friend
requests, parties, invitations.
**Wired (write only):** tournament records, reward audit.
**Deliberately not migrated:** active room state.

### Startup is fail-closed

```
$ NODE_ENV=production SUPABASE_SERVICE_ROLE_KEY= node .../src/index.ts
real exit code = 1
Refusing to start in production without durable progression. …
```

Verified by a test that spawns the real server. `ALLOW_EPHEMERAL_PROGRESSION=true`
is the escape hatch; it logs at ERROR every boot.

`/health` reports the posture, so `durable:false` in production is visible
without reading logs:

```json
"progression": { "kind": "memory", "durable": false,
  "sync": { "pending": 0, "written": 0, "failed": 0, "lastError": null } }
```

---

## 5. Automated tests added

`repositoryContract.test.ts` — **one suite, run against both implementations.**
The in-memory store deduplicates with `Map.has`; Postgres with a unique index.
Those agree on any test written against one of them and can disagree in
production about what counts as the same claim, so the cases are written against
the *interface*.

**22 tests passing** against the in-memory implementation, covering: idempotent
XP / achievements / challenge claims / season claims / match recording,
per-player ledger isolation, period rollover, lower-case room code as the same
room, 10-way concurrent claims yielding exactly one, audit rows for grants and
duplicates, season boards, snapshots, tournament records, request and party
round-trips.

Isolation is by fresh ids per test rather than `reset()` — Postgres has no
`reset()`, and a suite built on one could only ever run against half the
implementations it exists to compare.

**The Supabase half did not run.** Not registered (a `describe.skip` would trip
the anti-skip gate, correctly); it prints:

```
[persistence] Supabase contract NOT run: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
are not both set. Durability is UNVERIFIED by this run.
```

---

## 6. Restart / persistence verification — NOT PERFORMED

**This is the honest bottom line for P0-3.**

The brief requires create → restart → read, a deploy-compatible restart
simulation, duplicate replay, and a concurrent mutation test. All four are
implemented in `scripts/persistence/verifyPersistence.mjs`, which spawns a real
server, writes through the real HTTP API, **SIGTERMs it**, spawns a second
process and reads back.

**It has not been run**, because this environment has no Postgres:

```
docker          → command not found
psql / pg_ctl   → not found
supabase CLI    → not found
server/.env     → SUPABASE_URL + PUBLISHABLE key only; no service-role key
```

A linked project exists (`hjsahhpncmfnrldsfxra`). **I did not apply the
migration to it or write to it** — that is live infrastructure, it needs a
service-role key I do not hold, and it is not mine to change without being
asked.

So the gate refuses:

```
$ npm run check:persistence
✗ [Persistence] GATE FAILED
  No persistence verification receipt exists.
  … That claim needs a create → restart → read against real Postgres, and no
  such run has been recorded.
GATE EXIT=1
```

**To close P0-3** (two commands, ~2 minutes):

```bash
# 1. Apply the migration: Supabase SQL Editor → paste → Run
#    supabase/migrations/20260818000000_progression_persistence.sql

# 2. Verify
SUPABASE_URL=https://hjsahhpncmfnrldsfxra.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role key> \
node scripts/persistence/verifyPersistence.mjs

npm run check:persistence   # must go green
```

---

## 7. Regression risks

1. **Production will not boot** without `SUPABASE_SERVICE_ROLE_KEY` (or the
   explicit escape hatch). Intended; `render.yaml` needs updating.
2. **Boot is slower** — hydration loads up to 5000 profiles.
3. **Write-behind failure is not surfaced to the player.** A failed write increments
   a counter on `/health`; the request still succeeded.
4. **`match_participants` returns only the caller** in the Supabase read path;
   the profile list shows your own result.
5. **`IN_GAME` → `IN_MATCH`** — the persistence layer initially invented a
   near-synonym for a domain state; aligned to `shared/party/Party.ts`.

---

## 8. Rollback

| To undo | Do |
|---|---|
| Durable writes, keep the code | unset `SUPABASE_SERVICE_ROLE_KEY`; set `ALLOW_EPHEMERAL_PROGRESSION=true` |
| The schema | run `…_progression_persistence_rollback.sql` (**destructive** — back up first) |
| The service wiring | revert the `progressionSync.*` call in each service; each is 1–3 lines |
| Boot changes | restore `server/src/index.ts` from `acb5764` |

---

## 9. Residual limitations

1. **Durability is unverified.** §6. Everything else here is conditional on it.
2. **Write-behind has a crash window.** A hard crash between acknowledging a
   reward claim and flushing it loses the claim record, and the player can claim
   again after restart. Fail-open toward the player — the safer direction — and
   a graceful SIGTERM drains first. Making the database arbiter of a single
   request means awaiting inside the handler; worth doing, not a P0.
3. **Tournament history reads still derive from in-memory tournaments.**
   Records are persisted but not hydrated.
4. **Guest identity dies with the process without `SESSION_SECRET`.** Warned at
   boot; becomes a real data problem now that progression is durable.
5. **Hydration is bounded** at 5000 profiles / 25 matches each.
6. **`prune_expired_records()` is not scheduled** — the function exists,
   `pg_cron` has not been configured.
7. **RLS policies are untested against a live database**, same reason as §6.
