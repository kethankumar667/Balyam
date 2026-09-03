# Runbook — deployment rollback

What to do when a BHALYAM deploy (staging or production) needs to be undone.
Written so the on-call person can follow it without having to reconstruct
context under pressure.

**Scope.** This runbook covers the two Render services (`bhalyam-frontend`/
`bhalyam-backend` in production; `bhalyam-staging`/`bhalyam-backend-staging`
in staging — see `docs/runbooks/staging-environment.md` for how the staging
pair is provisioned) and their Supabase project. It does not cover DNS or
domain-registrar changes.

---

## 1. Trigger conditions

Any one of these is sufficient to open an incident and consider rollback —
do not wait for all of them:

- Frontend unavailable (Render shows the static site down, or `/` returns a
  non-200 from every region you can check).
- Backend unhealthy (`/health` times out, returns non-200, or `status` is not
  `"healthy"`).
- Authentication unavailable (sign-in/sign-up fails for every user, not an
  isolated account — check `/health`'s `auth` field first, since a paused
  Supabase project reads as `auth-api` failing, not the server being down).
- CORS blocks the staging or production frontend from reaching its own
  backend (a wrong `CLIENT_ORIGIN` — see `docs/runbooks/supabase.md`'s own
  warning that this fails silently on WebSocket and only surfaces once a
  player's network degrades to long-polling).
- WebSocket or polling transport unavailable (Socket.IO handshake fails on
  both transports — see SMOKE-04/SMOKE-05 in `client/e2e/staging-smoke.spec.ts`).
- Room create or join broken for real users (not a single flaky report — a
  reproducible failure).
- Match state divergence between clients in the same room (a correctness bug
  in a live engine, not a display glitch).
- Incorrect wallet mutation — a debit, refund, or settlement that does not
  match what `EconomyService`'s own contract says it should (see
  `server/src/economy/`). This is the highest-severity trigger on this list:
  freeze new match starts before doing anything else (see §3).
- Missing migration — the backend boots against a schema that does not yet
  have a column/table/function a just-deployed code path expects.
- Client secret exposure — any of `SUPABASE_SERVICE_ROLE_KEY`,
  `SESSION_SECRET`, `OPERATIONAL_SECRET`, or `VOUCHER_HMAC_SECRET` observed
  in a client bundle, log line, or error message. Treat as a security
  incident, not just a deploy problem — see §9.
- Server crash loop (Render shows repeated restarts, not a single blip).
- Voucher durability misconfiguration — `/health`'s `economy.voucher.durable`
  reads `false` in an environment that should have `VOUCHER_HMAC_SECRET` set.
- Guest-token durability misconfiguration (session durability) — `/health`
  (or the boot log) shows the ephemeral-signing-key warning from
  `assertGuestTokenDurabilityConfigured` (`server/src/auth/guestToken.ts`)
  in an environment that should have `SESSION_SECRET` set.

## 2. Decision authority

Whoever is on call may **freeze** (see §3) unilaterally the moment any
trigger above is confirmed — that action is cheap and reversible, so it
should never wait for approval. A **full rollback** (redeploying an older
build, or reverting environment variables) should be confirmed by whoever
owns the affected service (frontend/backend/Supabase) if they are reachable
within a few minutes; if they are not, the on-call person rolls back anyway
and documents the decision in the incident summary (§10) — an unreachable
owner is not a reason to leave a broken deploy live.

## 3. Freeze first, roll back second

Before touching any deploy, if the trigger involves the economy (wallet
mutation, voucher, or settlement) or match correctness:

1. In Render, note the current `bhalyam-backend`/`bhalyam-backend-staging`
   deploy id — you will need it to confirm what you're rolling back *from*.
2. There is no maintenance-mode flag in this codebase today. The fastest
   real freeze is rolling the backend back immediately (§5) — `requestGameStart`
   is the single choke point for every new match start (see the
   start-readiness protocol audit), so an old, known-good backend build stops
   new bad matches the moment it's live. Do not attempt to patch forward
   under incident pressure.

## 4. Frontend rollback

Render's static-site deploys are immutable builds — the trigger you are
undoing is almost always a *frontend variable* change (see §6) or a bad
build, not application logic (since `VITE_*` variables are inlined at build
time, a variable fix requires a new build regardless of severity — there is
no way to hot-patch a live frontend's env).

1. Render dashboard → the frontend service → **Deploys** tab.
2. Find the last deploy known to be good (cross-reference against the
   incident's start time).
3. Click **Rollback to this deploy** (Render redeploys that exact build
   artifact — it does not rebuild from source, so this is fast and exact).
4. Confirm the rolled-back build is live: reload the site with a
   cache-busting query string and check the page source for the expected
   bundle hash, or check Render's **Events** log for the rollback completion.

## 5. Backend rollback

1. Render dashboard → the backend service → **Deploys** tab.
2. Roll back to the last known-good deploy the same way as §4.
3. Watch **Logs** for the boot sequence to complete cleanly — specifically,
   confirm no `assertOperationalAuthConfigured`/`assertVoucherHmacConfigured`/
   `assertGuestTokenDurabilityConfigured` failure fires (those are fail-closed
   boot gates; a rollback to an OLDER build that predates one of those gates
   will simply not have it, which is fine — the newer build's stricter
   requirement doesn't retroactively apply).
4. Confirm `/health` returns `"status": "healthy"` before declaring the
   backend rollback complete.

## 6. Environment-variable rollback

Variables are the most common rollback target, and the one most likely to be
mis-diagnosed as a code problem:

1. Render dashboard → the affected service → **Environment** tab keeps a
   change history per variable — use it to find the exact prior value
   (Render does not expose secret values after they're saved, so if the
   prior value itself was never recorded outside Render, the owner of that
   credential must reissue it, not "recall" it).
2. Change the variable back.
3. **Backend variable change**: Render restarts the process automatically —
   confirm via `/health` afterward.
4. **Frontend variable change** (any `VITE_*`): a variable change alone does
   nothing until a **new build** runs — trigger a manual deploy from the
   dashboard after reverting the value, then verify per §4 step 4.

## 7. Database migration handling

**Do not automatically reverse a migration.** Whether a migration can be
rolled back safely is decided per-migration, not by a blanket policy — check
`supabase/rollbacks/` first:

| Migration | Rollback script exists? |
|---|---|
| `0001_accounts.sql` | No |
| `20260815180258_expose_profiles_to_authenticated.sql` | No |
| `20260816000000_security_hardening.sql` | Yes — `supabase/rollbacks/20260816000000_security_hardening_rollback.sql` |
| `20260817000000_add_user_details_to_profiles.sql` | No |
| `20260818000000_progression_persistence.sql` | Yes — `supabase/rollbacks/20260818000000_progression_persistence_rollback.sql` |
| `20260820000000_add_bio_region_to_profiles.sql` | No |
| `20260826000000_economy_v1.sql` | Yes — `supabase/rollbacks/20260826000000_economy_v1_rollback.sql` |
| `20260828000000_economy_abandonment_forfeiture.sql` | Yes — `supabase/rollbacks/20260828000000_economy_abandonment_forfeiture_rollback.sql` |
| `20260829000000_economy_seat_capacity_contract.sql` | Yes — `supabase/rollbacks/20260829000000_economy_seat_capacity_contract_rollback.sql` |
| `20260830000000_economy_settlement_events.sql` | Yes — `supabase/rollbacks/20260830000000_economy_settlement_events_rollback.sql` |
| `20260901000000_economy_terminal_intents.sql` | **No** — the newest migration has no rollback script |

Rules:

- A migration **with** a tested rollback script in `supabase/rollbacks/` may
  be reversed by running that script, but only after confirming (reading the
  script) that it matches what actually shipped — a rollback script written
  against an earlier draft of its migration is worse than no rollback at all.
- A migration **without** a rollback script (five of eleven, including the
  most recent one) must **never** be reversed ad hoc under incident pressure.
  Prefer forward remediation: ship a new, narrow migration that corrects the
  problem, rather than attempting to hand-write an undo against a live
  database you don't have a tested down-path for.
- An "unexpected remote-only migration" (one present on the Supabase project
  but not in `supabase/migrations/` in the deployed commit) is drift, not a
  rollback target — stop and reconcile which commit actually produced it
  before touching anything else.
- Never run a rollback script against a database with rows created *after*
  the forward migration that a rollback would silently discard (e.g. don't
  run the economy_v1 rollback if real matches have since settled through
  tables it created) — read what the script actually does first.

## 8. Smoke-test verification after rollback

After any rollback (frontend, backend, or both), re-run the full staging
smoke suite against the now-rolled-back environment before declaring the
incident resolved:

```powershell
$env:E2E_BASE_URL="<the environment's actual frontend URL>"
$env:E2E_API_URL="<the environment's actual backend URL>"
$env:E2E_ALLOW_REMOTE="true"
npm --prefix client run test:e2e:staging
```

All nine checks (SMOKE-01 through SMOKE-09) must pass before the rollback is
considered complete. A rollback that "fixes" the original trigger but leaves
a different smoke check failing is not done.

## 9. Communication checklist

- [ ] Incident opened (timestamp, trigger, who noticed it)
- [ ] On-call has frozen new match starts if the trigger is economy-related (§3)
- [ ] Service owner notified (or absence-and-proceeded documented, per §2)
- [ ] If a secret was exposed (§1's last-but-two trigger): the exposed
      credential is rotated in Render/Supabase **immediately**, independent
      of and before any rollback — a rollback does not un-expose a secret
      that's already been observed.
- [ ] Rollback action taken, logged with exact deploy ids (before → after)
- [ ] Smoke suite re-run and passing (§8)
- [ ] Incident closed, summary written (§10)

## 10. Evidence preservation

Before rolling back, capture (screenshots or copy-paste, timestamped):

- The failing `/health` response, or the specific error the user/monitor saw.
- Render **Logs** for the window covering the failure (Render's log
  retention is limited — pull this before it rolls off, not after).
- The exact Render deploy id that was live when the trigger fired, and the
  one you're rolling back to.
- For an economy-related trigger: the affected `matchId`(s) and the wallet
  balances involved, from `/health` or the operational endpoints — **never**
  paste real player identifiers into a shared channel; reference them by
  `matchId` only.

This evidence is what makes the incident summary (§11) useful instead of a
reconstruction from memory a week later.

## 11. Incident summary

After resolution, write (in the incident's own thread or ticket, not just
this runbook):

- What triggered it, and when it was first observed vs. when it started.
- What was rolled back (frontend build id, backend build id, or which
  variable), and what the environment was rolled back *to*.
- Whether a migration was involved, and whether it was reversed (with the
  rollback script name) or forward-remediated (with the follow-up migration
  name, once written).
- Root cause, if known at the time of writing — otherwise say "root cause
  under investigation" rather than guessing.
- Whether smoke verification (§8) passed cleanly on the first re-run or
  needed a second attempt.
- Any runbook gap this incident exposed — file it as a correction to this
  document, not tribal knowledge.
