# BHALYAM P0 Remediation — Verification Report

**2026-08-18** · branch `refactor/modernization-architecture` · baseline `acb5764`

Per-item detail: [P0-00 Baseline](P0-00-BASELINE.md) ·
[P0-1](P0-01-OPERATIONAL-SECURITY.md) · [P0-2](P0-02-PLAYER-AUTHORIZATION.md) ·
[P0-3](P0-03-PERSISTENCE.md) · [P0-4](P0-04-MOBILE-LAYOUT.md) ·
[Phase 5](P0-05-QUALITY-GATES.md)

---

## Status

| Item | Status | Evidence |
|---|---|---|
| **P0-1** Operational surface protection | **CLOSED** | 30 tests + live curl; production boot exits 1 |
| **P0-2** Player-scoped authorization | **CLOSED** | 37 tests + live curl of every baseline exploit |
| **P0-3** Durable persistence | **IMPLEMENTED, NOT VERIFIED** | 22 contract tests; **no Postgres available to prove durability** |
| **P0-4** Remove false certification | **CLOSED** | fake suite deleted; real one runs and fails on 41 real defects |
| **Phase 5** Trustworthy gates | **PARTIAL** | coverage + perf fixed and measured; a11y/contrast open |

## Gates, as of this commit

```
typecheck (server + client)   PASS
server tests                  792 passed (95 files)
client tests                  444 passed (56 files)
server coverage               79.37 / 76.57 / 76.86 / 79.37   PASS
client coverage                9.64 / 57.77 / 35.22 /  9.64   PASS (floor)
check:tests                   exit 0
check:bundle                  exit 0
check:a11y                    exit 0   (renamed: source scan, not a verdict)
check:deps                    exit 0
check:perf                    exit 0   (rewritten; 2 measured, 4 not claimed)
check:persistence             exit 1   ← durability unverified, correctly
check:mobile-layout           exit 1   ← 41 real touch-target defects
```

Baseline was 707 server / 460 client tests. Two failing gates are **the system
working**: each refuses to certify something nobody has proved.

---

## P0-1 — Operational surface protection · CLOSED

**Exploit:** `/api/operational/*` returned 200 to anonymous callers whenever
`OPERATIONAL_SECRET` was unset — including under `NODE_ENV=production`. Room
summaries, socket counts, memory pressure, leak diagnostics and full per-room
event timelines. `/admin` had no route guard.

**Boundary:** absence of configuration is a refusal, never a pass. Production
exits 1 before binding a port. Constant-time comparison (SHA-256 then
`timingSafeEqual`). Admin role from a *verified* JWT claim against
`ADMIN_USER_IDS`. Gate mounted on the router that owns the routes, so no
telemetry is gathered before authorization — asserted by spying on
`healthMonitor.evaluate`. Query-string credentials removed. One indistinguishable
refusal body. `Cache-Control: no-store`. Redacted error handler replacing
Express's stack-trace default.

**Tests:** 25 new, all over real HTTP on an ephemeral port, two spawning the
real server. **Manual:** production-no-secret exits 1; dev-no-secret 401 on all
9 endpoints; armed secret gives 401/401/401/200/200 across no-cred / wrong /
query-string / Bearer / header.

**Residual:** shared bearer key is unattributable (prefer `ADMIN_USER_IDS`);
key in `sessionStorage` is XSS-reachable; no rate limiting on the endpoints;
the React `/admin` guard is UX, the boundary is the server 401.

---

## P0-2 — Player-scoped authorization · CLOSED

**Exploit:** six routers read a player id from the URL or body and believed it.
`PUT /api/profile/victim_user` returned `{"displayName":"PWNED"}` anonymously,
in production. Friend requests sent *as* a victim; parties created under their
name; another player ejected from theirs. `GET /api/profile/:id` **created**
rows. Every guest who had never joined a room shared one identity —
`guest_player_1` — and therefore one profile, friends list and reward ledger.

**Boundary:** credential → verified server-side → identity from verified claims
→ ownership/role check → execute. A path or body `playerId` is now an argument,
never evidence. Guests get a **server-minted** `guest_<128 bits>` identity with
an HMAC token; the endpoint takes no input, which is the mechanism — a caller
that could name its own id would name the victim's.

Every endpoint audited individually: 9 public reads (a leaderboard needing a
credential per row is not a leaderboard), 22 self-only, 5 identity-with-id-from-
session, 5 record-ownership lookups, 1 participant-only, 2 admin.

**Tests:** 37, all real HTTP — missing / invalid / expired / `alg:none` /
garbage tokens; A-acts-on-B across all 22 private routes with the profile
asserted *unchanged after*; tournament actions; forged social and party ids;
reward claims for another account; and eight guest cases proving guests keep
full self-service and cannot be anyone else.

**Manual:** every baseline exploit re-run — all 401/403; Alice-on-Bob 403 ×4;
Alice-on-Alice 200; public reads 200; guest suite verified end-to-end.

**Residual:** what is now protected is still in memory (P0-3); guest progress
does not carry across sign-up; tournament admin reuses the ops credential;
match results remain self-declared inputs; room-path player ids stay separate
from API identity (pre-existing, and realtime was not touched).

---

## P0-3 — Durable persistence · IMPLEMENTED, NOT VERIFIED

**Built:** 19-table schema with PKs, FKs, uniqueness, indexes, forced RLS,
`leaderboard_public` view, and `prune_expired_records()` for retention (30-day
bounded timeline *summaries*, not raw logs; 14-day telemetry). Repository
interface with in-memory and Supabase implementations. Write-behind sync +
boot-time hydration, so **realtime behaviour is untouched** and all 792 tests
stayed green. Production refuses to boot without a durable store (verified:
exit 1). No new dependency — an ~80-line PostgREST client over `fetch`.

Idempotency is the database's, not the application's: `ignore-duplicates` +
`return=representation` means the response *is* what was written, decided under
real concurrency rather than by a `select` that raced the `insert`.

**Two latent bugs found and fixed:** `MatchHistoryService.recordMatch` embedded
`Date.now()` in match ids, so a replayed completion wrote a second copy of the
same match; and `GET /api/profile/:id` was a write.

**NOT VERIFIED — and this is the honest bottom line.** No Docker, no psql, no
Supabase CLI, and `server/.env` holds only a publishable key. A linked project
exists; **I did not apply the migration to it or write to it** — live
infrastructure, no service-role key, not mine to change unasked.

```
$ npm run check:persistence
✗ GATE FAILED — No persistence verification receipt exists.
```

**To close (~2 min):** apply
`supabase/migrations/20260818000000_progression_persistence.sql`, then

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/persistence/verifyPersistence.mjs
npm run check:persistence
```

That script does all five required validations — create, SIGTERM restart, read
back, duplicate replay, 10-way concurrent — against a real server pair.

**Residual:** write-behind has a crash window (fail-open toward the player;
SIGTERM drains); tournament history reads still derive from memory; guest
identity needs `SESSION_SECRET`; `pg_cron` not scheduled; RLS untested live.

---

## P0-4 — Remove false certification · CLOSED

**Deleted** `mobileCertification.test.ts` — 98 lines, zero component imports,
asserting that the literal `44` in its own table was `>= 44`. It could not fail
for any product reason and was named a "Certification Suite".

**Replaced** with a Playwright runner over the production build: 8 viewports
(320/360/375/390/412/430 + landscape 667×375 + 390×540 keyboard-open) × 8
routes, measuring blank renders, horizontal overflow, touch targets against
*both* WCAG 2.2 AA 24px and the product's 44px, clipping, and reachability.
jsdom was rejected — it has no layout, so every rect is zero.

**Three false positives were found and removed before reporting** — 149 → 88
findings. Carousel items are swipe-reachable, not clipped;
`document.elementFromPoint` wrongly flagged 14 header controls (replaced with
Playwright's actionability check); and a first-run onboarding modal was making
every page's controls "unreachable" — confirmed by direct probe, then handled.

**It now fails on real defects:** 41 HIGH, 47 MEDIUM. "Back to Lounge" is
110×**16**px. "Dismiss starter missions" is **19.4**×28. Five nav links are 24px
tall. The suite this replaces reported all of it as certified.

**Not claimed:** one engine, no hardware, and **the Room screen and chat
composer were NOT measured** — the runner supports `--server=<port>` but none
was running, and the report says `"NOT RUN — this is not a pass."` That is the
one open item in Phase 4.

---

## Phase 5 — Trustworthy gates · PARTIAL

**Done.** Real V8 coverage in both packages with thresholds set *from* the
measured baseline (server 79.37%; client **9.64%** — recorded as a floor, not a
target, and the clearest single number behind the audit's thesis). Reports as
CI artifacts.

**The performance gate could not fail.** It read
`Math.round(budget.targetP95Ms * 0.5)` whenever no samples existed — which was
always — and printed the invented number as a measurement under "All operations
within target SLA". It now drives 40 real room create/join cycles through
`RoomManager` and reports three distinct states: measured, `NO_DATA` (fails),
and `NOT_EXERCISED` (reported, not claimed). Wiring the old version into CI
would have added a step incapable of failing.

**Gate 3 renamed** to "Accessibility Source Scan (not a verdict)" — it greps
JSX and cannot establish accessibility.

**Open, and not claimed:** the axe-core rendered-accessibility pass, and the
contrast detector. `accessibilityAudit.mjs` is **untouched** — no rule
disabled, no waiver, no allowlist — so the five unmeasured contrast findings
stand exactly as the audit left them.

---

## Constraints honoured

No new product features · no UI redesign · no client-provided identity trusted ·
nothing fail-open · no realtime or game-rule changes · no room state in Postgres ·
no Redis · no broad TS/ESLint suppressions · no fake tests · no accessibility
claimed from regex · no persistence claimed without restart verification ·
guest gameplay preserved via an explicit limited identity model · all 31
uncommitted baseline paths preserved · changes independently reversible.

Two dependencies added, both dev-only and both to *enable measurement* rather
than ship code: `@vitest/coverage-v8` in each package.

---

## Verdict

# NOT READY

**Not because of what is broken — because of what is unproven.**

P0-1, P0-2 and P0-4 are closed with executable evidence, and the two
authorization holes that made this system unshippable are demonstrably shut. If
those were the only criteria, this would read *ready for internal testing*.

Two things prevent it:

1. **Durability is unverified.** Every reward claim, friendship and match record
   is protected by authorization that works and persisted by a write path that
   has never been proved to survive a restart. "Already claimed" is still, as
   far as anyone has *demonstrated*, true only until the next deploy. This is
   one migration and one command away, and until then the correct word is
   unproven, not working.

2. **The mobile layout suite fails on 41 real defects**, including controls at
   16px against a 24px standard. They were always there; the difference is that
   something now measures them.

**The nearest honest next state is READY FOR INTERNAL TESTING**, reachable by:
apply the migration and run `verifyPersistence.mjs` until `check:persistence`
goes green; run `check:mobile-layout -- --server=4000` to cover the Room screen;
fix the touch targets and make Gate 6 blocking.

Closed beta additionally needs the axe-core pass and the contrast detector, and
`SESSION_SECRET` + `pg_cron` provisioned.

One deliberate omission: I did not apply the migration to the live Supabase
project or write to it. It is real infrastructure, I hold no service-role key,
and changing it was not something to do unasked.
