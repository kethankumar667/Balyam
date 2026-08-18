# Runbook — Durable progression

What to set, what to run, and how to tell whether it worked.

---

## 1. What is durable, and what is deliberately not

**Durable** (Supabase Postgres, `20260818000000_progression_persistence.sql`):
player identities, profiles, the XP ledger, achievement unlocks, challenge
claims, friendships, friend requests, parties, party invitations, match
summaries, tournament records, season stats, season reward claims, season
snapshots, reward audit.

**Not durable, on purpose:** active room state. Rooms, seats, hands, boards and
turn timers stay in `RoomManager`'s memory. A room is minutes long, is written
many times a second by the realtime loop, and is meant to die with the process.
Only the *summary* of a finished match is persisted.

**Bounded, not unlimited:** `room_timelines` holds a summary with a 30-day
expiry, and `operational_telemetry` a 14-day one. The full per-move event
timeline stays in memory. Retention is enforced by
`public.prune_expired_records()` — see §5.

---

## 2. Environment

| Variable | Required | What it does |
|---|---|---|
| `SUPABASE_URL` | yes | Project URL, e.g. `https://abcd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Service-role (secret) key.** Bypasses RLS; this is what "privileged mutations stay on the server" means. Never in a client bundle. |
| `SESSION_SECRET` | strongly recommended | Signs guest tokens. Without it a restart signs every guest out and orphans what they earned. |
| `OPERATIONAL_SECRET` | yes in production | Unrelated to persistence, but the server also refuses to boot without it. |
| `ALLOW_EPHEMERAL_PROGRESSION` | no | Escape hatch: lets production start with in-memory progression. Logs at ERROR every boot. Only for a smoke test that must not keep anything. |
| `HYDRATE_PROFILE_LIMIT` | no | Profiles preloaded at boot. Default 5000. |
| `HYDRATE_MATCHES_PER_PLAYER` | no | Matches preloaded per player. Default 25. |

A **publishable** key in `SUPABASE_SERVICE_ROLE_KEY` is detected and refused
with an explicit message: it would appear to work for reads and then fail every
write with an RLS error that says nothing about the cause.

---

## 3. Applying the migration

Supabase Dashboard → SQL Editor → paste → Run:

```
supabase/migrations/20260818000000_progression_persistence.sql
```

Or, with the CLI: `supabase db push`.

It is re-runnable — every statement is guarded, so applying it twice changes
nothing.

**Rollback** (destructive; take a backup first):
`supabase/migrations/20260818000000_progression_persistence_rollback.sql`.

---

## 4. Verifying it actually works

This is the only step that establishes durability. Everything before it is
plumbing that can be complete and still wrong.

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role key> \
node scripts/persistence/verifyPersistence.mjs
```

It spawns a real server, writes through the real HTTP API, **SIGTERMs it**,
spawns a second process, and reads back. Five checks:

1. **Create** — writes land.
2. **Restart + read** — the process that wrote them is gone and they remain.
3. **Deploy simulation** — SIGTERM flushes the write queue (`drain()`), which is
   the shape of a redeploy and the case that silently drops queued writes if
   the drain regresses.
4. **Duplicate replay** — the same reward claim twice pays once.
5. **Concurrent mutation** — ten simultaneous identical writes leave one row.

On success it writes `docs/remediation/persistence-verification.json`.

Then:

```bash
npm run check:persistence
```

That gate **fails** unless a passing receipt exists, is under 30 days old, is
for `supabase-postgres`, matches `SUPABASE_URL` when set, contains the four
required checks, and records no `INCONCLUSIVE` result. Until it passes, the
correct statement about this system is that durability is **unverified**.

The contract suite can also be pointed at the real database:

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm --prefix server test -- persistence
```

Without those variables the Supabase half is not registered at all and prints a
warning. It is not a skipped test — the project's anti-skip gate is right to
fail on those — it simply does not run, and `check:persistence` is what refuses
to let that be mistaken for a pass.

---

## 5. Retention

`public.prune_expired_records()` is the thing that actually deletes. Retention
that exists only as an `expires_at` column nobody reads is not retention.

Schedule it with `pg_cron` once the extension is enabled:

```sql
select cron.schedule(
  'bhalyam-prune', '17 3 * * *',
  $$select public.prune_expired_records()$$
);
```

It returns a row per table with the number deleted, so a scheduled run is
verifiable rather than hopeful.

What it removes: expired room timelines (30d), expired operational telemetry
(14d), pending friend requests older than 30 days, pending party invitations
older than 7 days, and disbanded or day-old parties.

---

## 6. Reading the posture at runtime

`GET /health` is public and reports it:

```json
{
  "progression": {
    "kind": "supabase", "durable": true, "reachable": true,
    "detail": "supabase postgres",
    "sync": { "pending": 0, "written": 412, "failed": 0, "lastError": null }
  }
}
```

- `durable: false` in production means the escape hatch is on and everything is
  being lost on restart.
- A rising `failed` count means the store has started refusing writes. That is
  otherwise invisible until a restart throws the data away, which is why it is
  on the health endpoint rather than only in the logs.

---

## 7. How the write path works, and its one honest gap

Progression services are synchronous and some are called from the realtime path
(`RoomManager` records a finished match in the same tick it broadcasts the end
of the game). Making them `async` would ripple into the socket handlers and the
engines, and altering realtime behaviour was out of scope.

So the services keep their in-memory state and hand every durable fact to
`ProgressionSync`, which **writes behind** the caller. Reads come from memory;
the store is what memory is restored from at boot.

**The gap:** a hard crash between acknowledging a reward claim and flushing it
loses that claim record, and the player can claim again after the restart. The
direction is the safe one — a player occasionally getting a second chance at
their own reward rather than being charged twice — but it is real. A graceful
`SIGTERM` (every redeploy) drains the queue first and does not have this
window.

Making the database the arbiter of a single request means awaiting the write
inside the handler. That is a worthwhile change and it is not a P0 one.
