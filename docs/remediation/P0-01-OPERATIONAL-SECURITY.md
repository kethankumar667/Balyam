# P0-1 — Operational surface protection

Status: **CLOSED**, with executable evidence.
Baseline: `docs/remediation/P0-00-BASELINE.md` §4.

---

## 1. Original exploit

`/api/operational/*` answered **anonymous** requests with 200 whenever
`OPERATIONAL_SECRET` was unset, and `NODE_ENV=production` did not change that.
The gate opened when it had nothing to check against:

```ts
// server/src/security/SecurityMiddleware.ts:12-16, before
const secret = process.env.OPERATIONAL_SECRET || process.env.ADMIN_API_KEY || "";
if (!secret) {
  return next();          // fail-OPEN, every environment
}
```

Recorded against a live server, no credential on any request:

```
GET /api/operational/health       -> 200   full health check list
GET /api/operational/metrics      -> 200   rooms, recovery, sockets, memory
GET /api/operational/rooms        -> 200   live room summaries
GET /api/operational/leaks        -> 200   socket/timer/engine resource counts
GET /api/operational/performance  -> 200   p50/p95/p99 per operation
GET /api/operational/games        -> 200   per-game telemetry
GET /api/operational/metrics (NODE_ENV=production, no secret) -> 200
```

Second half of the same finding: `/admin` had no route guard at all
(`client/src/App.tsx:134`), and the dashboard fetched all five endpoints with a
bare `fetch()` and no credential — which worked, because the server was
fail-open.

A credential was also accepted in the query string (`?key=<secret>`), which puts
it into access logs, proxy logs, browser history and `Referer` headers.

---

## 2. Files changed

| File | Change |
|---|---|
| `server/src/security/operationalAuth.ts` | **new** — the gate, the config reader, the startup guard |
| `server/src/security/SecurityMiddleware.ts` | fail-open middleware deleted; re-exports the new module so existing imports keep working |
| `server/src/observability/OperationalController.ts` | **new** — all 9 operational routes, with the gate mounted on the router itself |
| `server/src/index.ts` | startup guard before anything binds; routes moved to the router; redacted error handler; `operational` posture on `/health` |
| `server/src/testing/httpTestServer.ts` | **new** — real-HTTP test harness (no new dependency) |
| `server/src/security/__tests__/operationalAuth.test.ts` | **new** — 25 tests |
| `client/src/lib/operationalApi.ts` | **new** — credentialed operational client |
| `client/src/components/auth/AdminRoute.tsx` | **new** — server-answered gate on `/admin` |
| `client/src/App.tsx` | `/admin` wrapped in `ProtectedRoute` + `AdminRoute` |
| `client/src/pages/AdminDashboardPage.tsx` | every fetch carries a credential; renders an authorization-lost state |

---

## 3. Security boundary introduced

**Absence of configuration is a refusal, never a pass.**

```
production, nothing configured   →  the process exits 1 before binding a port
anywhere,   nothing configured   →  401, and the log says why
credential missing or wrong      →  401, byte-identical body either way
OPERATIONAL_SECRET matches       →  allowed as `ops-key`
verified session ∈ ADMIN_USER_IDS→  allowed as `admin-user`
```

Supporting properties, each with a test:

- **Constant-time comparison.** Both sides are SHA-256'd before
  `crypto.timingSafeEqual`, so equal-length buffers are guaranteed and the
  naive `if (a.length !== b.length) return false` guard — which leaks length
  through timing — is not needed.
- **Role check on a verified identity.** The admin path runs
  token → `verifyAccessToken` (signature, `exp`, `iss`, `aud`) → `sub` claim →
  allowlist. The allowlist is never consulted against a caller-supplied id.
- **No data before authorization.** The gate is `router.use(...)` on the router
  that owns the routes, not a separate `app.use` fifty lines away. A test spies
  on `healthMonitor.evaluate` and `telemetryAggregator.getSnapshot` and asserts
  neither is called on a refused request.
- **Redaction.** One body for every refusal; reasons go to the log. A new
  four-argument error handler replaces Express's default, which prints stack
  traces into the response body outside production.
- **`Cache-Control: no-store`** on every operational answer.
- **Query-string credentials removed.**
- **Weak secrets rejected in production** (minimum 16 characters).

---

## 4. Automated tests added

`server/src/security/__tests__/operationalAuth.test.ts` — **25 tests, all over
real HTTP** on an ephemeral port. Mock `req`/`res` objects were rejected as
insufficient: they prove a function branches, not that it is mounted, ordered
before the handler, or reachable at all — and "the middleware exists" was
exactly the false comfort the audit found.

Covering: all 9 endpoints refused unconfigured; refused unconfigured under
`NODE_ENV=production`; no telemetry gathered on a refusal; missing credential;
five shapes of wrong credential; both accepted headers; `?key=` refused;
identical refusal bodies; `no-store`; length-mismatch does not throw; legacy
`ADMIN_API_KEY`; allowlisted admin session admitted; non-allowlisted verified
session refused; wrong-key signature refused; expired session refused; session
refused with no allowlist; five startup-guard cases; secret never present in
`/health`.

Two of them **spawn the real server**:

```
✓ exits non-zero in production with no operational credential configured
✓ starts in production once a credential is configured
```

Run twice back to back to prove no port leak:

```
Test Files  1 passed (1)     Tests  25 passed (25)   Duration 4.67s
Test Files  1 passed (1)     Tests  25 passed (25)   Duration 4.54s
```

---

## 5. Manual HTTP verification

**A — production, no secret. Must not start.**

```
$ NODE_ENV=production PORT=4971 OPERATIONAL_SECRET= ADMIN_USER_IDS= node .../tsx src/index.ts
EXIT=1
Refusing to start in production: the operational API cannot be secured.
Neither OPERATIONAL_SECRET nor ADMIN_USER_IDS is set, so /api/operational/* has no way to …
```

**B — development, no secret. Must refuse, not open.**

```
GET /api/operational/health       -> 401
GET /api/operational/metrics      -> 401
GET /api/operational/rooms        -> 401
GET /api/operational/leaks        -> 401
GET /api/operational/performance  -> 401
GET /api/operational/games        -> 401
GET /api/operational/recovery     -> 401
GET /api/operational/whoami       -> 401
GET /api/operational/timeline/ABC123 -> 401

{"error":"Unauthorized","message":"Valid operational credentials are required for this endpoint."}
```

`/health` stays public by design and now reports the posture:

```json
{"status":"healthy","auth":"auth-api",
 "operational":{"configured":false,"opsKey":false,"adminUsers":0}, ...}
```

**C — production, secret armed.**

```
no credential                      -> 401
wrong credential                   -> 401
key in query string ?key=          -> 401
valid Bearer                       -> 200
valid x-operational-key            -> 200
whoami                             -> {"principal":{"kind":"ops-key"}}
cache-control on an allowed answer -> Cache-Control: no-store
boot log                           -> "Operational API is protected by a shared operational key"
```

---

## 6. Restart / persistence verification

Not applicable to P0-1 — no state is introduced. The startup guard is itself a
restart test, and it is exercised by spawning the real process twice (§4).

---

## 7. Regression risks

1. **A deployment that relied on fail-open breaks loudly.** That is the fix
   working. `render.yaml` needs `OPERATIONAL_SECRET`; without it a production
   deploy will fail to boot rather than serve telemetry to the internet.
2. **`?key=` callers break.** Any bookmark, uptime probe or script using the
   query-string form must move to `x-operational-key`. No in-repo caller used
   it.
3. **A production secret shorter than 16 characters blocks boot.** Deliberate,
   and stated in the error.
4. **`/admin` now needs a session.** An anonymous visitor is redirected to
   sign-in; a signed-in non-admin sees a locked panel with a key prompt.

Full server suite after the change: **94 files, 769 tests, all passing** (up from
the 92/707 baseline). Client: **57 files, 460 tests, all passing**.

---

## 8. Rollback procedure

Each piece reverses independently.

| To undo | Do |
|---|---|
| Startup guard only | delete the `try { assertOperationalAuthConfigured() }` block in `server/src/index.ts` |
| The whole server gate | `git checkout -- server/src/security/SecurityMiddleware.ts` and restore the inline routes in `index.ts` from `acb5764`; delete `server/src/security/operationalAuth.ts` and `server/src/observability/OperationalController.ts` |
| `/admin` gate only | in `client/src/App.tsx`, replace the wrapped route with `<Route path="/admin" element={<AdminDashboardPage />} />` |
| Operational key in the browser | `sessionStorage.removeItem("bhalyam.ops.key")`, or close the tab |

Nothing here writes to a database or changes a schema, so rollback is a code
revert with no data step.

---

## 9. Residual limitations

1. **The operational key is a shared bearer credential.** It identifies a
   deployment, not a person, so an action taken with it cannot be attributed.
   `ADMIN_USER_IDS` is the path for humans and should be preferred.
2. **The key lives in `sessionStorage` when an operator pastes it.** It dies
   with the tab and is not in `localStorage`, but it is still reachable by any
   script that executes on the origin. Documented in
   `client/src/lib/operationalApi.ts` rather than hidden.
3. **No rate limiting on the operational endpoints.** A wrong credential is
   refused but not throttled, so the key is brute-forceable at network speed.
   16+ characters of entropy makes that impractical, not impossible.
   `roomEnumerationGuard` is the existing pattern to extend; not P0.
4. **`ADMIN_USER_IDS` is environment configuration, not a role table.** Adding
   an admin needs a redeploy. Correct for this size of deployment; it will not
   scale to delegated administration.
5. **The `/admin` React route guard is not itself a boundary.** The bundle is
   public and the component can be executed by anyone. The boundary is the
   server 200/401 that the guard renders. This is stated in the component's own
   header comment so the next reader does not mistake it for security.
