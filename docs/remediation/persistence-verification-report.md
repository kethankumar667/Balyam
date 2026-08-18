# BHALYAM PostgreSQL Persistence Verification Report

**Generated 2026-08-18** · real PostgreSQL 17.5 (`embedded-postgres`, downloaded binaries)
**Governance:** ADR 001/003 (`bhalyam-decision-log.md`), platform Rule 8, `architecture-principles.md` Pillar 3

Receipts: `docs/remediation/persistence-schema-verification.json` (54 checks) ·
`persistence-verification.json` (17 checks)
Runners: `npm run verify:schema` · `npm run verify:durability` · gate: `npm run check:persistence`

---

## 1. Result — P0-3 moves from IMPLEMENTED to VERIFIED

| Area | Status | Evidence |
|---|---|---|
| Database connectivity | **VERIFIED** | PostgreSQL 17.5 reached and queried |
| Migration clean execution | **VERIFIED** | applies to an empty database, 0 errors |
| Migration re-runnable | **VERIFIED** | second apply changes nothing |
| Rollback safety | **VERIFIED** | executes cleanly; 0 tables remain; forward→back→forward cycle succeeds |
| Schema integrity | **VERIFIED** | 19 tables, every one keyed; 22 FKs; 43 indexes; 1 view |
| RLS posture | **VERIFIED** | enabled AND forced on all 19; **0** write policies for client roles; 11 owner-read policies |
| CRUD, every persisted entity | **VERIFIED** | create/read/update on all 19; delete where no dependants |
| Constraint enforcement | **VERIFIED** | 13 violation attempts, all refused with the expected constraint name |
| Idempotency | **VERIFIED** | duplicate XP, challenge claim, season claim, match, reward audit all refused |
| Concurrency | **VERIFIED** | 10 **truly parallel** connections → exactly 1 row, twice over |
| Retention | **VERIFIED** | `prune_expired_records()` deleted expired rows and reported counts |
| Cascade | **VERIFIED** | deleting an identity removed its progression, 0 orphans |
| **Restart durability** | **VERIFIED** | row present in Postgres with **no server running**; new process served it |
| Graceful SIGTERM drain | **NOT VERIFIABLE ON WINDOWS** | SIGTERM is undeliverable on win32 — see §6 |
| Supabase's own PostgREST + RLS behaviour | **NOT VERIFIED** | see §7 |

`npm run check:persistence` → **exit 0**.

---

## 2. How the "no database available" blocker was removed

The previous pass reported P0-3 as *IMPLEMENTED, NOT VERIFIED* because there was
no Docker, no `psql`, no Supabase CLI, and only a publishable key in `.env`.

Three things closed it, **without touching the live Supabase project**:

1. **`embedded-postgres`** — downloads real PostgreSQL 17 binaries. Not `pg-mem`,
   not an emulator. `select version()` → *PostgreSQL 17.5 on x86_64-windows*.
2. **An `auth` schema stub** — the migration references `auth.users` and
   `auth.uid()`, which Supabase provides. Minimal stand-ins are created, exactly
   as `supabase start` does locally. **Declared**, so a green result is not read
   as covering Supabase's auth schema.
3. **A PostgREST shim** (`scripts/persistence/postgrestShim.mjs`) — PostgREST is
   HTTP over SQL. ~200 test-only lines translate the subset the repository
   issues, so the **real server binary** and the **real repository** run
   end-to-end. It **throws** on anything it does not recognise rather than
   answering `[]`, because a shim that silently swallows a query it failed to
   parse turns a broken repository into a passing test.

**I did not apply the migration to the linked production project
(`hjsahhpncmfnrldsfxra`) or write to it.** It is live infrastructure, I hold no
service-role key, and changing it was not mine to do unasked.

---

## 3. Three real defects the verification caught

Every one was invisible to reading and to 792 passing tests.

### 3.1 The migration could not run at all — `placing` is a reserved keyword

```
ERROR 42601: syntax error at or near "placing"
```

`PLACING` is **reserved** in PostgreSQL (it belongs to
`overlay(string placing string from int)`), so an unquoted column of that name is
a syntax error. **The schema shipped in the previous pass would have failed on
Supabase too.**

- **Files:** `supabase/migrations/20260818000000_progression_persistence.sql:313,329`;
  `server/src/persistence/SupabaseProgressionRepository.ts` (6 mapping sites)
- **Fix:** column renamed `placing` → `placement`; the domain field name is
  unchanged, so only the DB boundary moved.
- **Status:** **VERIFIED** — migration now applies cleanly.

### 3.2 The rollback script did not roll back

```
ERROR: cannot drop function owns_player_row(text) because other objects depend on it
```

Functions were dropped **before** the tables whose RLS policies reference them.
The transaction aborted at that line, leaving **every table in place** — a
rollback script that rolled nothing back.

- **File:** `supabase/migrations/20260818000000_progression_persistence_rollback.sql`
- **Fix:** tables first (which removes their policies), functions last.
- **Status:** **VERIFIED** — clean rollback, 0 tables remain, and the migration
  re-applies afterwards.

### 3.3 Half the friendships were never persisted

BHALYAM has **two** friend stores: `FriendsService` behind `/api/social` and
`RecentPlayersService` behind `/api/ranking`. Only the first was wired to
persistence, so **every friendship added from the leaderboard screen was lost on
restart** while the social one survived.

Found because the durability run expected one row and got **zero**.

- **Files:** `server/src/ranking/RecentPlayersService.ts`,
  `server/src/persistence/hydrate.ts`
- **Fix:** wired both write paths and hydrated both stores from the same rows.
- **Second defect underneath it:** `friends` has foreign keys on **both**
  columns, so befriending someone the store had never seen was silently refused
  by the database. `ProgressionSync.friendAdded` now ensures both identity rows
  first.
- **Status:** **VERIFIED** — 13 identical writes → exactly 1 row, surviving restart.
- **Debt recorded:** the duplication itself is a design problem. Two friend
  lists that can disagree is a bug generator; unifying them is not a P0 fix.

### 3.4 The SIGTERM drain was nested where it could not run

`progressionSync.drain()` was inside `server.close()`'s callback, which only
fires once **every** connection has ended. A keep-alive socket from a load
balancer holds that open, so on a real deploy the drain never ran and queued
progression writes were **silently discarded**.

- **File:** `server/src/index.ts` (`shutdown`)
- **Fix:** drain independently of `server.close()`, plus
  `server.closeIdleConnections()`, plus a backstop that logs before exiting.
- **Status:** **PARTIALLY VERIFIED** — the code path is correct and the CI job
  runs on `ubuntu-latest` where SIGTERM is deliverable; it could not be
  exercised on this Windows host (§6).

### 3.5 Portability note — UTF-8

The migration's comments contain `—` and `→`. On a cluster initialised with the
Windows locale (WIN1252) it **fails**:

```
ERROR: character with byte sequence 0xe2 0x86 0x92 in encoding "UTF8" has no equivalent in encoding "WIN1252"
```

Supabase clusters are UTF-8, so this is **not** a production defect. It is a real
constraint on any self-hosted target, and the verifier now forces
`--encoding=UTF8` and says why.

---

## 4. Idempotency and concurrency — the guarantees, and where they live

Not in the application. Every one is a database constraint, so the race between
a check and a write does not exist:

| Guarantee | Enforced by | Verified |
|---|---|---|
| XP once per source | `xp_ledger_source_idx` | 23505 on replay; 10 parallel → 1 row |
| Challenge reward once per period | `challenge_claims_pkey` | 23505 on replay |
| Season tier once | `season_reward_claims_pkey` | 23505; 10 parallel → 1 row |
| Match once per (room, start) | `match_summaries_natural_key_idx` | 23505, incl. lower-case room code |
| One granted reward per key | `reward_audit_idempotency_idx` (partial) | 23505; duplicates still auditable |
| One party per player | `party_members_one_party_idx` | 23505 |
| One pending request per direction | `friend_requests_pending_idx` (partial) | 23505; reverse direction allowed by design |
| No self-friendship | `no_self_friendship` | 23514 |
| Guest id namespace | `guest_id_namespace` | 23514 |
| Member identity needs an auth user | `identity_kind_matches_auth` | 23514 |
| Wins ≤ matches | `wins_not_more_than_matches` | 23514 |
| Match cannot finish before it starts | `match_finishes_after_start` | 23514 |
| FK to a real player | `player_profiles_player_id_fkey` | 23503 |

---

## 5. Restart durability — the actual evidence

```
✓ server starts against a real Postgres and hydrates
    "Progression is durable (Supabase Postgres)."
✓ health reports durable progression
    {"kind":"supabase","durable":true,"reachable":true}
✓ profile written through the real API                         status 200
✓ the write-behind queue drains on its own                     0 pending after 215ms
✓ no progression write failed                                  43 written, 0 failed
✓ first server terminated
✓ the row is in PostgreSQL with no server running
    SELECT → 1 row: {"display_name":"Durability 3582f0e7"}
✓ 13 identical friend writes stored exactly one row            1 row
✓ both ends of the friendship have durable identity rows       2 rows
✓ second server started and hydrated from the database
    "Progression restored in 465ms: 1 profiles, 1 friendships"
✓ the profile written by the DEAD process is served by the NEW one
✓ the friendship survived the restart
✓ the guest identity still verifies after the restart
```

The **flush-then-kill** ordering is deliberate. Progression is written *behind*
the request, so a process killed mid-queue loses what has not flushed — an
earlier run proved exactly that, with a profile returning 200 to the client and
absent from Postgres a moment later. Conflating that window with "does data
survive a restart" would let one failure hide the other, so the queue is drained
first (and the drain time recorded) and durability tested separately.

---

## 6. Failure scenarios

| Scenario | Method | Result |
|---|---|---|
| Database unavailable at boot | `ping()` before the port binds | **VERIFIED** — process exits 1: *"Progression store unreachable"*, never downgrades to memory |
| No credentials in production | startup guard | **VERIFIED** — exit code **1**, *"Refusing to start in production without durable progression"* |
| Publishable key where a service-role key belongs | `readPostgrestConfig` | **VERIFIED** by inspection — detected and refused with a specific message |
| Slow response | `AbortSignal.timeout(SUPABASE_TIMEOUT_MS ?? 8000)` on every request | **PARTIALLY VERIFIED** — the timeout is wired and typed; no slow-server injection test was run |
| Network interruption mid-write | write-behind queue records the failure; `/health` exposes `sync.failed` and `lastError` | **PARTIALLY VERIFIED** — the surface exists and reported `failed: 0`; a forced mid-write partition was not simulated |
| Invalid records | 13 constraint-violation attempts | **VERIFIED** — all refused |
| Constraint violations surfaced, not swallowed | `PostgrestError` carries status + table; callers return generic failures | **VERIFIED** by inspection |
| Graceful degradation | production refuses to start rather than degrade; `ALLOW_EPHEMERAL_PROGRESSION` is an explicit, ERROR-logged opt-out | **VERIFIED** |
| **Graceful SIGTERM drain** | — | **NOT VERIFIABLE ON WINDOWS** |

On the last: `child.kill("SIGTERM")` on win32 terminates without running signal
handlers — proven directly with a child that logs on SIGTERM and never did. The
consequence is worth stating plainly: **this run was an abrupt kill, so the
durability results above are stronger than a graceful restart would have shown**
— nothing got the chance to flush on the way out. The drain itself needs the
Linux CI job, which is now wired.

---

## 7. What is still NOT verified

1. **Supabase's own PostgREST.** The shim implements the subset the repository
   uses. Real PostgREST may differ in corners — `Prefer` handling, embedded
   resources, error shapes. The repository was also made **more portable** for
   this (the one embedded-resource query became two plain reads), which reduces
   the surface but does not eliminate the gap.
2. **RLS behaviourally.** Structure is verified (forced everywhere, zero client
   write policies). Enforcement under the `authenticated` role is not: the shim
   has no roles, and against Supabase the server runs as service-role, which
   bypasses RLS by design. A client-side read test against the real project is
   the only thing that closes this.
3. **`prune_expired_records()` is not scheduled.** The function works; no
   `pg_cron` entry exists, so retention is currently manual.
4. **Hydration is bounded** at 5,000 profiles / 25 matches each. Correct today,
   a start-up cliff later.
5. **Guest identity needs `SESSION_SECRET`.** Without it, tokens are signed with
   a per-process key and every restart signs guests out — now that progression is
   durable, that orphans real data. Warned at boot; not provisioned.

---

## 8. Status summary

| Item | Status |
|---|---|
| Connectivity, startup, failure handling | **VERIFIED** |
| Migrations: clean, re-runnable, rollback-safe | **VERIFIED** |
| Schema integrity, RLS structure, retention, cascade | **VERIFIED** |
| CRUD for all 19 entities | **VERIFIED** |
| Idempotency + real concurrency | **VERIFIED** |
| Restart durability (abrupt kill) | **VERIFIED** |
| Graceful SIGTERM drain | **NOT VERIFIABLE ON WINDOWS** — Linux CI wired |
| Timeout / network-partition injection | **PARTIALLY VERIFIED** |
| Supabase PostgREST fidelity, RLS behaviour | **NOT VERIFIED** |
| Retention scheduling | **NOT IMPLEMENTED** |
