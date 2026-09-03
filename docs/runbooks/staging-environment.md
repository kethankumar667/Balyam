# Runbook — building and validating the BHALYAM staging environment

Companion to `docs/runbooks/supabase.md` (account setup, written for the
existing project) and `docs/runbooks/deployment-rollback.md` /
`docs/runbooks/launch-monitoring.md` (what to do once something is live).
This document is the one in between: how to stand up an **isolated** staging
tier for `main` before it ever reaches production, and the exact evidence a
staging run needs to produce before anyone calls it certified.

**This document does not certify staging.** It gets an operator to the point
where a real certification pass (against real, reachable services) is
possible. See §9 for what certification actually requires.

---

## 1. Architecture

```
Render: bhalyam-staging (static site)
        |  VITE_SERVER_URL
        v
Render: bhalyam-backend-staging (web service)
        |  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_JWT_SECRET
        v
Supabase: isolated staging project (own credentials, own database)
```

Production and staging never share a credential, a database, or a Render
service. The existing `render.yaml` in this repo defines only the
**production** `bhalyam-frontend`/`bhalyam-backend` pair — it is not renamed
or repurposed for staging. Staging services are created as their own Render
services (see §4), using `render.yaml`'s shape as a template for which
variables each side needs, not as a file to edit into a staging config.

## 2. Supabase staging model: separate project (recommended)

**Decision: use a separate Supabase project, not a persistent branch.**

What the repository actually uses Supabase for — confirmed by inspecting the
code, not assumed:

- **Auth only** (`server/src/lib/supabaseAuth.ts`, `client/src/lib/`) — no
  Supabase Realtime channels and no Supabase Storage buckets anywhere in
  either codebase. This app's own Socket.IO server is the entire realtime
  layer; Supabase's job is strictly identity + a Postgres table.
- **Postgres via PostgREST** (`server/src/persistence/postgrest.ts`) for
  progression and Economy V1 durable state.
- **11 migrations**, tracked as plain SQL files in `supabase/migrations/`
  and applied through the Supabase SQL Editor (see `docs/runbooks/supabase.md`
  §2) — there is no `supabase/config.toml` and no local CLI-managed project
  link in this repo, so the established workflow for this project is
  dashboard-driven, not `supabase db push`.
- **RLS policies** exist in 6 of the 11 migrations (`0001_accounts.sql`,
  `20260816000000_security_hardening.sql`, `20260818000000_progression_persistence.sql`,
  `20260826000000_economy_v1.sql`, `20260830000000_economy_settlement_events.sql`,
  `20260901000000_economy_terminal_intents.sql`).

Given no Realtime/Storage parity is needed, the two options are close on
features. A **separate project** wins because:

- It needs no Supabase plan tier assumption — persistent branching is a
  paid-plan capability on Supabase; a second free-tier project is not.
- It reuses the exact, already-proven procedure in `docs/runbooks/supabase.md`
  §1–§2 verbatim (create project → run migrations via SQL Editor) — no new
  workflow to learn or get wrong under time pressure.
- It gives staging its own dashboard, its own pause-after-7-days-idle clock,
  and its own rate limits — fully independent of production's.

If your Supabase plan supports persistent branches and you'd prefer that
instead, the required properties in §3 below apply identically; the only
change is how the isolated instance is created.

## 3. Required properties (either model)

- Separate API credentials (own `SUPABASE_URL`, own keys — never production's).
- Separate database — zero shared rows with production.
- **No production customer data.** Do not copy `auth.users`, `profiles`,
  wallets, guest identities, tokens, or vouchers from production into
  staging, under any circumstance.
- Same migration history — all 11 files, in order, nothing skipped.
- Equivalent RLS policies — the same 6 migrations that define them, applied
  identically.
- Equivalent required extensions — whatever the migrations themselves
  declare (inspect each file's own `create extension` statements, if any,
  at apply time — this runbook does not enumerate them separately from the
  migrations, which are the single source of truth).
- Equivalent Auth providers where staging tests require them — Email is
  required (every scenario in §8 needs at least synthetic accounts); Google
  OAuth is only required if a staging scenario specifically exercises it
  (see §6 — classify as pending otherwise, do not fabricate a pass).
- Staging-specific Site URL and redirect URLs — pointing at the staging
  frontend's actual URL, never production's and never localhost alone.

## 4. Migration inventory and application procedure

Exact filenames, in the order they must be applied (confirmed directly from
`supabase/migrations/`, not from a prior report):

```
0001_accounts.sql
20260815180258_expose_profiles_to_authenticated.sql
20260816000000_security_hardening.sql
20260817000000_add_user_details_to_profiles.sql
20260818000000_progression_persistence.sql
20260820000000_add_bio_region_to_profiles.sql
20260826000000_economy_v1.sql
20260828000000_economy_abandonment_forfeiture.sql
20260829000000_economy_seat_capacity_contract.sql
20260830000000_economy_settlement_events.sql
20260901000000_economy_terminal_intents.sql
```

**11 migrations total.** 6 have a paired rollback script in
`supabase/rollbacks/`; 5 do not (see `docs/runbooks/deployment-rollback.md`
§7 for the full table — that distinction matters for incident response, not
for initial staging setup).

### Applying them (dashboard workflow — matches this repo's established practice)

For each file above, **in the listed order**:

1. Staging Supabase project dashboard → **SQL Editor** → **New query**.
2. Paste the full contents of the file.
3. **Run**.
4. Confirm no error before moving to the next file. A migration failing
   partway through (e.g. a table already exists from a prior partial run)
   must be investigated before continuing — do not skip ahead.

### If you use the Supabase CLI instead

The commands below assume `supabase login` has already run and you have the
staging project's ref (from its dashboard URL). This repo has no
`supabase/config.toml`, so `supabase link` will create local linkage state
under `supabase/.temp/` — **do not commit that directory**, and be certain
it points at the staging project's ref, not production's, before running
anything against it.

```bash
# Link to the STAGING project — verify the ref before running this.
supabase link --project-ref <staging-project-ref>

# Compare local migration history against what the staging project has
# already applied. Read the diff before doing anything else.
supabase migration list

# Apply every pending migration, in order.
supabase db push

# Verify the resulting state matches the 11-file inventory above —
# re-run `supabase migration list` and confirm every filename shows
# as applied remotely.
supabase migration list
```

**Failure behavior:**

- **Migration mismatch** (local history and remote history disagree on what
  has already been applied) → stop. Do not force-push migrations over a
  project whose history you don't understand yet.
- **Migration application failure** (a file errors partway) → do not
  continue to smoke testing. Fix or roll back (per the rollback runbook's
  rules — most of these files have no rollback script, so "fix forward with
  a new migration" is usually the real answer) before proceeding.
- **Unexpected remote-only migration** (the staging project has something
  applied that isn't in `supabase/migrations/` at the commit being deployed)
  → investigate drift before proceeding. This usually means someone ran ad
  hoc SQL directly against the project — find out what, and either capture
  it as a real migration file or revert it, before trusting the schema.

Do not execute any of the above against a real project without the staging
project's own credentials and explicit authorization — none of this should
ever be pointed at the production project ref.

## 5. Render staging topology

**Two new Render services**, not a repurposing of the existing production
pair:

| Service | Type | Name |
|---|---|---|
| Frontend | Static site | `bhalyam-staging` |
| Backend | Web service | `bhalyam-backend-staging` |

Prefer creating both inside their own Render **Environment** (Render's
environment-scoped variable groups and network controls) if your Render plan
supports it, so staging variables are structurally incapable of leaking into
the production environment group. If your plan does not support separate
Environments, separate services with entirely distinct variable sets (never
inherited from a shared group that also contains production values) is the
minimum acceptable isolation — do not rely on naming discipline alone.

**Do not use Render-generated placeholder URLs in any document, script, or
`.env.e2e` file until the services actually exist.** Render assigns the real
hostname (typically `<service-name>.onrender.com`, occasionally with a
disambiguating suffix if the name collides with an existing service on the
same account) only once the service is created — record the *actual* URL at
that point, in §8's evidence log, not before.

## 6. Frontend staging variables

Set on `bhalyam-staging` (all `VITE_*` — inlined at build time; changing any
of these requires a new build+deploy, not just a variable edit):

| Variable | Required? | Notes |
|---|---|---|
| `VITE_SERVER_URL` | Required | Must equal `bhalyam-backend-staging`'s actual URL once created |
| `VITE_SUPABASE_URL` | Required | The **staging** Supabase project's URL — never production's |
| `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` | Required (either name) | The staging project's own publishable/anon key (code reads both names — see `docs/runbooks/supabase.md` §3) |
| `VITE_PRIVACY_CONTACT_EMAIL` | **Required** | Correction from an earlier draft of this document, which called this "recommended" — re-checked directly against `client/e2e/staging-smoke.spec.ts`'s SMOKE-07 test: it branches on `config.isLocal`, and only accepts the honest "not configured" fallback when `isLocal` is true. A real staging URL always evaluates `isLocal: false`, so SMOKE-07 unconditionally requires a real `mailto:` link against staging — leaving this unset will fail the smoke suite, not just look incomplete |

**Confirm absence** of the following on the frontend service:

| Variable | Why it must not be set here |
|---|---|
| `VITE_OPERATIONAL_KEY` | Any `VITE_`-prefixed variable is inlined into the public JS bundle. This one is DEV-gated in code (`import.meta.env.DEV` — see `client/src/lib/operationalApi.ts`'s ADMIN-SEC-001 comment) so a production-mode build strips it entirely regardless, but it should never be set on a deployed service's env either, staging included — there is no scenario where a deployed build needs it. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret; must never reach a build the browser downloads. |
| `SESSION_SECRET`, `VOUCHER_HMAC_SECRET`, `OPERATIONAL_SECRET` | Backend-only secrets; have no `VITE_` prefix and are never read by client code — their presence in a frontend service's env is always a mistake. |

## 7. Backend staging variables

Set on `bhalyam-backend-staging`:

| Variable | Required? | Rule |
|---|---|---|
| `NODE_ENV` | Required | `production` — this is what activates the fail-closed boot gates (`assertOperationalAuthConfigured`, `assertVoucherHmacConfigured`, `assertGuestTokenDurabilityConfigured`); staging should run under the same gates production does, or it isn't really validating anything |
| `PORT` | Required | `4000` (or whatever Render assigns — match `render.yaml`'s production pattern) |
| `CLIENT_ORIGIN` | Required | Must exactly equal `bhalyam-staging`'s actual URL. Wrong values fail silently on WebSocket (see the rollback runbook's CORS trigger) |
| `OPERATIONAL_SECRET` | Required | Staging-only value, distinct from production's. Server refuses to boot without one in `NODE_ENV=production` |
| `SESSION_SECRET` | Required | Staging-only, and must stay **stable** across restarts/redeploys — rotating it signs every guest out |
| `VOUCHER_HMAC_SECRET` | Required | Staging-only, and must stay stable for the same reason — rotating it orphans any voucher issued before the rotation |
| `SUPABASE_URL` | Required | The staging Supabase project's URL |
| `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) | Required | The staging project's own service-role/secret key — code accepts either name (`server/src/persistence/postgrest.ts`) |
| `SUPABASE_JWT_SECRET` (or `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_ANON_KEY`) | Required (one path) | Legacy projects: the JWT secret, verified in-process with no network call (preferred). Newer projects on asymmetric keys: the publishable key instead, verified via one cached API call — see `docs/runbooks/supabase.md` §4 |
| `ADMIN_USER_IDS` | **Not applicable** | Searched the current codebase directly — no code reads this variable. It does not need to be set anywhere; do not invent a value for it |
| `TURN_URLS`/`TURN_URL`, `TURN_SECRET` or `TURN_USERNAME`/`TURN_PASSWORD` | Optional | Only relevant if staging needs to validate WebRTC voice chat under a real symmetric-NAT condition. No TURN credentials are currently provisioned anywhere in this project (a known, pre-existing gap) — leave unset unless voice validation is explicitly in scope for this staging pass |

Rules, restated because they're the ones most likely to be violated under
time pressure: `CLIENT_ORIGIN` matches the staging frontend, both secrets
(`SESSION_SECRET`, `VOUCHER_HMAC_SECRET`) are staging-only and stable,
`OPERATIONAL_SECRET` is staging-only, every Supabase credential belongs to
the staging project, and nothing here is copy-pasted from production's
Render environment. Health check path: `/health` (matches `render.yaml`).

## 8. Auth configuration (staging Supabase project)

- **Site URL** → the staging frontend's actual URL (recorded per §5, once known).
- **Redirect URLs** → the staging frontend's actual URL plus `/**`, and
  `http://localhost:5173/**` only if local dev will also point at this
  staging project (usually it should not — keep local dev on its own
  project or the existing dev setup).
- **OAuth callback URLs** (Google, if in scope) → the staging project's own
  `https://<staging-project-ref>.supabase.co/auth/v1/callback`, registered
  as its own, separate OAuth client in Google Cloud Console — **do not**
  reuse production's OAuth client for staging; if a separate OAuth client
  cannot be safely provisioned in this pass, classify Google sign-in as
  **pending, not verified** for this staging cycle rather than assuming it
  works because production's does.
- **SMTP / email confirmation** → per `docs/runbooks/supabase.md` §7, pick
  one deliberately for staging:
  - **Confirm email: off** — simplest, no SMTP needed, and since staging
    identities are synthetic (§ below) there's no real inbox to protect
    anyway. Recommended default for staging unless the specific pass is
    validating the email flow itself.
  - A real transactional SMTP provider, **only if** this staging pass is
    specifically validating sign-up/reset email delivery — and even then,
    use synthetic addresses you control (e.g. a `+staging` alias), never a
    real customer's address.
- **Password reset behavior** — inherits whatever email-confirmation choice
  was made above; if confirmation is off, reset links still require SMTP to
  actually deliver — don't assume "confirm off" also means "reset works with
  no SMTP," they're independent.

## 9. Synthetic test data policy

No production data, ever, in staging — no copied rows, no copied tokens, no
copied wallet balances, no real customer email addresses, no real vouchers.

- **Guest identities** — created the normal way: let the running staging
  app mint them through its own guest-token flow. Never hand-construct a
  guest token, and never copy a `bhalyam.guest.id`/`token`/`expires` triple
  out of a real browser's localStorage.
- **Synthetic member accounts** — sign up fresh through the staging
  frontend against the staging Supabase project, using clearly-labeled
  addresses (e.g. `staging-host@example.test`, `staging-p2@example.test`).
  Never reuse a real person's email.
- **Isolated wallets** — whatever balance the staging Economy V1 starter
  grant gives a fresh synthetic account. If a scenario needs a specific
  balance, seed it through the staging project's own SQL Editor against
  **staging's** wallet tables only — never by copying a number observed in
  production.
- **Private multiplayer rooms** — created through the normal room-create
  flow for each test run; room codes are ephemeral and need no special
  handling.
- **Optional administrative test identity** — only if a staging pass
  specifically needs to exercise an operational endpoint; use a synthetic
  account explicitly, never a real admin's credential.

**Data lifecycle**: staging data is created through the public app flows
(sign-up, guest mint, room create) for each validation run, not pre-seeded
in bulk. Cleanup is an approved operator procedure: rooms self-clean on
abandonment (per `RoomManager.abandonRoom`); synthetic Supabase accounts can
be deleted via the staging project's own `delete_account()` RPC (the same
one production's "Erase my data" uses) or, for bulk cleanup between test
passes, via the staging project's SQL Editor — never scripted against
production credentials, and never as a scheduled job that could someday be
pointed at the wrong project.

## 10. Smoke-suite safety against the proposed staging hostnames

Inspected directly: `client/e2e/support/env.ts`, `client/playwright.config.ts`,
`client/e2e/staging-smoke.spec.ts`.

`env.ts` blocks two things by exact match, plus a regex:

```ts
export const KNOWN_PRODUCTION_HOSTS = new Set([
  "bhalyam.onrender.com",
  "bhalyam-backend.onrender.com",
]);
// ...
/(^|\.)bhalyam(-backend)?\.onrender\.com$/i.test(lower)
```

Checked the proposed staging names against both the set and the regex:

- `bhalyam-staging.onrender.com` — not in the set; the regex requires the
  hostname to end in exactly `bhalyam.onrender.com` or
  `bhalyam-backend.onrender.com` (anchored at a dot or string-start before
  `bhalyam`) — `bhalyam-staging.onrender.com` ends in `-staging.onrender.com`,
  which matches neither. **Not blocked.**
- `bhalyam-backend-staging.onrender.com` — same reasoning; ends in
  `-staging.onrender.com`, not `-backend.onrender.com`. **Not blocked.**

Also confirmed still enforced, unweakened, and correct to keep as-is:

- Both `E2E_BASE_URL` and `E2E_API_URL` must resolve to the same tier
  (`isLocal` must match on both sides) — a staging frontend can't be paired
  with a local backend or vice versa in the same run.
- Any non-localhost target requires `E2E_ALLOW_REMOTE=true` explicitly.
- A credential-bearing URL (`user:pass@host`) is rejected outright.

**No correction to `env.ts` is needed or recommended.** The proposed
`bhalyam-staging` / `bhalyam-backend-staging` names pass through cleanly.
This is a read-only finding — nothing here was edited.

One residual note for whoever actually creates the Render services: if
Render assigns a *different* real hostname than expected (a disambiguating
suffix, or a custom domain gets attached later), re-run this same check
against the actual assigned hostname before assuming it's still unblocked —
don't assume the pattern holds for a name that wasn't verified.

## 11. Operator deployment checklist

Stop at any ✋ if the step fails — do not continue past it.

1. [ ] Create staging Supabase project (§2) — record its project ref and URL
       somewhere the team can find them (not in this repo).
2. [ ] Apply all 11 migrations, in order (§4). ✋ on any failure.
3. [ ] Configure staging Auth: Site URL, redirects, (optional) OAuth, SMTP
       or confirm-off (§8).
4. [ ] Create Render staging backend service (`bhalyam-backend-staging`) (§5).
5. [ ] Set all backend staging variables (§7). ✋ if any required variable
       is missing or accidentally copied from production.
6. [ ] Deploy the backend.
7. [ ] Verify `GET /health` on the real assigned backend URL returns
       `status: "healthy"`. ✋ if not.
8. [ ] Create Render staging frontend service (`bhalyam-staging`) (§5), with
       `VITE_SERVER_URL` pointing at the now-known backend URL.
9. [ ] Set all frontend staging variables (§6). ✋ if `VITE_OPERATIONAL_KEY`
       or any backend secret is present.
10. [ ] Deploy the frontend. Confirm the build log reports **37 prerendered
        routes** (§ launch-monitoring.md). ✋ if fewer.
11. [ ] Record the actual staging URLs (frontend and backend) — these are
        what every command below actually uses; nothing here should be
        guessed or reused from an example.
12. [ ] Run the automated smoke suite (§12). ✋ on any of SMOKE-01–09 failing.
13. [ ] Run the manual multiplayer scenarios (§13). ✋ on any scenario
        producing unexpected behavior.
14. [ ] Review Render + Supabase logs for the whole session per
        `docs/runbooks/launch-monitoring.md`.
15. [ ] Record the verdict (§9 of this document defines what "certified"
        requires) — do not mark staging certified from this checklist alone;
        this checklist gets you to the point of being ABLE to certify.

## 12. Automated smoke execution

```powershell
$env:E2E_BASE_URL="<actual-staging-frontend-url>"
$env:E2E_API_URL="<actual-staging-backend-url>"
$env:E2E_ALLOW_REMOTE="true"

npm --prefix client run test:e2e:staging
```

Required checks, and what each one is actually proving (see
`client/e2e/staging-smoke.spec.ts` for the exact assertions):

| Check | Proves |
|---|---|
| SMOKE-01 | Backend health payload is well-shaped and secret-free |
| SMOKE-02 | Frontend hydrates deterministically; SSR root is never discarded |
| SMOKE-03 | Render's extensionless-route rewrites serve route-specific prerendered HTML, not the homepage shell |
| SMOKE-04 | Socket.IO connects and cleanly disconnects over the `websocket` transport |
| SMOKE-05 | Socket.IO connects over `polling` from the configured frontend origin (CORS) |
| SMOKE-06 | An operational endpoint refuses an unauthenticated request |
| SMOKE-07 | The privacy page renders a real contact mechanism, not a broken or fallback state |
| SMOKE-08 | Two independent browser contexts can create and join the same room and see each other |
| SMOKE-09 | The suite's own environment safety contract (this document's §10) behaves as designed |

**No check is marked passed until it has actually run against the real,
deployed staging URLs above.** A prior local/unit-level pass of this same
file (as already certified in the repository audit) is not evidence for a
deployed environment.

## 13. Manual multiplayer readiness scenarios

Each scenario needs at minimum two separate browser profiles/devices (three
for scenario A) against the real staging frontend URL, using synthetic
accounts per §9.

### A. Three participants, all ready

- **Preconditions**: staging deployed and healthy; 3 synthetic accounts/guests.
- **Arrangement**: 3 separate browser contexts (or devices), one host + two joiners.
- **Actions**: host creates a room; both others join by code; all three mark ready; host clicks Start.
- **Expected UI**: all three transition to the game board exactly once, no duplicate start, no stuck "Starting..." state.
- **Expected server behavior**: exactly one `requestGameStart` → one `executeMatchStart`; `activeStartAttempt` clears to `null`.
- **Expected wallet behavior**: if economy is enabled, exactly one debit for the host, matching the quoted commitment.
- **Evidence to capture**: screenshot of all three on the board; server log excerpt showing the single lifecycle transition to `IN_PROGRESS`.
- **Cleanup**: all three leave the room.
- **Severity if failed**: P0 — this is the core multiplayer path.

### B. One participant backgrounded

- **Preconditions**: as A, but before starting.
- **Arrangement**: 2+ participants; one will background their tab during preflight.
- **Actions**: all mark ready; host clicks Start; the designated participant switches tabs/apps the instant the preflight prompt would appear.
- **Expected UI**: the backgrounded participant's client emits a decline (`PAGE_NOT_VISIBLE`); everyone sees the attempt cancelled with a clear reason, not a silent hang.
- **Expected server behavior**: `cancelActiveStartAttempt` fires with reason `PAGE_NOT_VISIBLE` or `capability_unsatisfied`; match does not start.
- **Expected wallet behavior**: no debit occurs.
- **Evidence to capture**: the cancellation banner/message on the host's screen; server log line naming the reason.
- **Cleanup**: return to foreground, re-ready, leave room.
- **Severity if failed**: P0 if the match starts anyway; P2 if it blocks correctly but the UI message is unclear.

### C. Orientation not satisfied

- **Preconditions**: a game with a landscape requirement (Rummy or UNO).
- **Arrangement**: 2 participants on mobile-sized viewports (real devices or emulated narrow portrait windows); one stays in portrait.
- **Actions**: all mark ready; host clicks Start.
- **Expected UI**: the portrait participant is prompted to rotate or is shown as blocked; attempt cancels with `ORIENTATION_REQUIRED`.
- **Expected server behavior**: `cancelActiveStartAttempt` with reason `orientation_required` or the client-reported equivalent; match does not start.
- **Expected wallet behavior**: no debit occurs.
- **Evidence to capture**: screenshot showing the rotate prompt/blocker; server log line.
- **Cleanup**: rotate, re-ready, leave room.
- **Severity if failed**: P0 if the match starts in the wrong orientation anyway; P2 for an unclear prompt.

### D. Reconnect, fresh readiness attempt succeeds

- **Preconditions**: as A.
- **Arrangement**: 2+ participants.
- **Actions**: one participant disconnects (close tab / kill network) before or during a start attempt, then reconnects (reopen, same room code, same session if guest/member); host initiates a **new** start attempt after the reconnect.
- **Expected UI**: the reconnected participant appears connected again; the fresh start attempt completes normally.
- **Expected server behavior**: the seat is reclaimed via the real seat-token path (not a brand-new player id); the new `requestGameStart` produces a clean `COLLECTING_PREFLIGHT` → all acks → `IN_PROGRESS` sequence.
- **Expected wallet behavior**: no double debit; if economy is enabled, exactly one commit for the successful fresh attempt.
- **Evidence to capture**: server log showing the reclaim (`Seat reclaimed by ...`) followed by a clean start sequence.
- **Cleanup**: all leave the room.
- **Severity if failed**: P1.

### E. Disconnect during readiness (preflight)

- **Preconditions**: as A.
- **Arrangement**: 2+ participants.
- **Actions**: host clicks Start; before all acks arrive, one required participant hard-disconnects (kill network/close tab, not just background).
- **Expected UI**: everyone sees the attempt cancelled, not hung until the 5-second timeout.
- **Expected server behavior**: `handleDisconnect` fires `cancelActiveStartAttempt` with reason `player_disconnected`, immediately (not waiting for `PREFLIGHT_TIMEOUT_MS`).
- **Expected wallet behavior**: no debit occurs (this scenario is pre-commit).
- **Evidence to capture**: server log timestamp of the disconnect vs. the cancellation — should be effectively simultaneous, not ~5s apart.
- **Cleanup**: reconnect or start a fresh room.
- **Severity if failed**: P0.

### F. Disconnect during economy commitment

- **Preconditions**: economy enabled on staging; 2 synthetic member accounts with real (synthetic) wallet balances.
- **Arrangement**: 2 participants.
- **Actions**: host clicks Start; both acknowledge (triggering the economy commit); the instant after acknowledging, one participant hard-disconnects — the goal is to land the disconnect inside the `commitMatchEntry` await window, which is narrow and may take a few attempts to actually hit.
- **Expected UI**: no match starts; the host sees an error/cancellation, not a frozen "Starting..." state.
- **Expected server behavior**: if the disconnect lands inside the commit window, a compensating refund is queued (`queueCompensatingRefundForOrphanedCommit`, reason `attempt_invalidated` or similar) and the room returns to `READY_CHECK`. If the disconnect lands just outside the window, the match may start normally instead — that is also correct (not every timing is expected to hit the race).
- **Expected wallet behavior**: the debited account's balance returns to its pre-commit value once the compensating refund completes — verify by checking the synthetic wallet's balance in the staging Supabase project directly.
- **Evidence to capture**: server log showing `commitMatchEntry` succeeded followed by the compensating-refund log line; before/after wallet balance for the host account.
- **Cleanup**: none needed beyond normal room cleanup — the refund is the cleanup.
- **Severity if failed**: P0 — this is the exact race the repository-level protocol audit already verified in unit tests; a staging failure here would mean real network timing behaves differently than the in-process test simulated, which is precisely what staging exists to catch.

## 14. Staging certification criteria

Staging may be certified **only** when all of the following are true —
this list is the actual bar, not the deployment checklist in §11 (which
gets you to the point of being able to check these, not the certification
itself):

- [ ] The correct commit (`main` @ `89eaa3f`, or a clearly-documented newer
      commit) is what's actually deployed on both staging services.
- [ ] Every staging variable in §6/§7 is confirmed present and correct
      (values not disclosed in any report — presence and correctness only).
- [ ] Staging Supabase migrations match the 11-file inventory exactly, with
      no drift.
- [ ] Both staging services report healthy (`/health` for the backend;
      the frontend serving real content for the root route).
- [ ] All nine smoke checks (§12) pass against the real deployed URLs.
- [ ] All six manual readiness scenarios (§13) behave as expected, with
      evidence captured.
- [ ] Wallet and ledger state in the staging Supabase project remain
      internally consistent after the above (no orphaned debits, no
      duplicate settlements) — spot-check via the staging project's own
      SQL Editor.
- [ ] `docs/runbooks/deployment-rollback.md` has been read by whoever is
      on call for this staging pass.
- [ ] Monitoring access (`docs/runbooks/launch-monitoring.md`'s dashboards)
      is confirmed reachable by the operator before traffic starts.
- [ ] No P0 or P1 finding remains open from this pass.

Only once every box above is genuinely checked — against the real staging
environment, not inferred from repository state — should a staging
certification report use the verdict `STAGING CERTIFIED` or
`STAGING CERTIFIED WITH ACCEPTED RISKS`.
