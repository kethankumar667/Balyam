# Runbook — launch monitoring checklist

What to actually look at around a BHALYAM deploy (staging validation or a
production launch window), and where each signal actually lives. Organized
by *where you have to go look*, because "check monitoring" is not
actionable if the answer is different dashboards for different facts.

**Honesty note.** This repository does not itself ship an external
alerting integration (no PagerDuty/Slack webhook, no APM agent wired in).
Everything under "Repository observability" below is real, in-process
signal you can query today; everything under "Render dashboard evidence"
and "Supabase dashboard evidence" requires actually having those dashboards
open — this document does not claim an alert exists that nobody configured.

---

## 1. Repository observability (available today, no extra setup)

These are real endpoints and counters already in the codebase
(`server/src/observability/`, `RoomManager`'s operational summaries) — the
fastest signal during a launch window, and the only one this repo can
provide without a dashboard.

| Signal | Where | What to look for |
|---|---|---|
| Overall health | `GET /health` | `status: "healthy"`, `progression` and `economy` present, `economy.voucher.durable: true` in any environment that sets `VOUCHER_HMAC_SECRET` |
| Active rooms / sockets | `GET /health` → `activeRooms`, `socketCount` | A sudden drop to 0 with real traffic expected is itself a signal — check the backend didn't just restart |
| Room-level detail (requires `OPERATIONAL_SECRET`) | Operational endpoints under `/api/operational/*` (see `server/src/security/operationalAuth.ts`) | Per-room lifecycle state, disconnected/rejoin-eligible seats, active takeovers — see `getOperationalRoomSummaries`/`getOperationalRecoverySummary` in `RoomManager.ts` |
| Platform health counters | Same operational surface → `getOperationalDetailedStats` | `onlineHumans`, `activeBots`, `disconnectedUsers`, `rejoinEligibleUsers`, `recoverySuccessRate` (null until at least one grace session has resolved — not a bug, see that method's own doc comment), `hostMigrationCount`, `abandonmentRate` |
| Start-preflight activity | Server logs, `module: "LIFECYCLE"` lines | `WAITING_FOR_PLAYERS`/`READY_CHECK`/`STARTING` transitions; a room stuck oscillating between `STARTING` and `READY_CHECK` repeatedly means preflight or economy commits are failing for that room — see `requestGameStart`'s own transition sites in `RoomManager.ts` |
| Start-preflight timeouts / cancellations | Server logs, `room:startCancelled` broadcasts, or the `cancelActiveStartAttempt` log line's `reason` field | Reasons include `preflight_timeout`, `player_disconnected`, `player_unready`, `orientation_required`, `capability_unsatisfied`, `attempt_expired`, `roster_changed`, `host_migrated` — a spike in `preflight_timeout` specifically suggests the 5-second window (`PREFLIGHT_TIMEOUT_MS`) is too tight for real network conditions, worth revisiting before a wide launch |
| Economy commit failures | Server logs, `module: "ECONOMY_ROOM"`, `commitMatchEntry failed for room ...` | Correlate the error name (`InsufficientFundsError`, `UnsupportedSeatCountError`, `WalletFrozenError`, etc.) against volume — one-off failures are normal (a player with insufficient balance clicking start), a spike is not |
| Compensating refunds | Server logs, `queueCompensatingRefundForOrphanedCommit` / `requestGameStart committed match ... but the room was invalidated before the commit resolved` | Each one means a real debit happened and was refunded because the room state changed mid-commit (see the start-readiness protocol audit's §6) — expected occasionally under real disconnects, a sustained rate suggests something upstream is unstable |
| Terminal-intent recovery | `economySettlementQueueStatus()` (`DurableSettlementWorker.counters()`) and `getRoomTerminalStatus(code)` | Watch for rooms stuck in `terminalStatus: "FAILED"` — these need `retryFailedTerminalPersistence` (manual or via the recovery sweep) and represent money that hasn't settled yet |
| Guest token durability | Boot log (`assertGuestTokenDurabilityConfigured`) | Must show no ephemeral-signing-key warning in any environment that intends session continuity across restarts (i.e. anywhere `SESSION_SECRET` should be set) |

## 2. Render dashboard evidence (requires the dashboard open)

- **Deploy status** — the service's **Events** tab shows deploy start/finish
  and whether the build succeeded. Watch this actively during the deploy
  itself, not just after.
- **Server restart / crash loop** — Render's service overview shows restart
  count; a backend that restarts more than once in a short window during
  otherwise-normal traffic is a crash loop, not a blip — treat per the
  rollback runbook's trigger list.
- **HTTP error rates** — Render's built-in metrics (where available on the
  plan in use) show request counts and response codes at the edge. This is
  the only place to see 5xx rates that never reach application logging
  (e.g. the process being killed mid-request).
- **Memory and process health** — Render's **Metrics** tab (CPU, memory) for
  the backend service. A steady memory climb across a multi-hour session is
  worth flagging even if nothing else is failing yet — this codebase keeps
  all room/economy state in-process (`RoomManager`'s in-memory maps), so a
  room that never gets cleaned up (e.g. a leaked timer reference — see the
  start-readiness protocol audit's timer-cleanup findings) shows up here
  before it shows up anywhere else.
- **Build logs** — confirm the frontend build actually reports **37
  prerendered routes** (`✨ [Prerender] ... 37 public routes`) — fewer than
  37 means a route silently stopped prerendering, which SMOKE-03 would also
  catch, but the build log catches it earlier.

## 3. Supabase dashboard evidence (requires the dashboard open)

- **Connectivity** — Project overview shows the project is not paused (free
  tier pauses after 7 days idle — see `docs/runbooks/supabase.md`). A paused
  project reads, from the backend's point of view, as an auth/persistence
  failure with no obvious client-side cause.
- **Authentication failures** — **Authentication → Logs**. Per
  `docs/runbooks/supabase.md`'s own hard-won lesson: a `200` here on a
  signup/resend call is **not** proof the email arrived — GoTrue's log ends
  at "the mail server accepted the message." Cross-check actual delivery via
  whatever SMTP provider's own delivery dashboard is configured, not this
  log alone.
- **Rate limits** — **Authentication → Rate Limits**. A burst of
  `over_email_send_rate_limit` (429, named explicitly in the log) during a
  launch window means real signups are being silently capped — raise the
  limit ahead of an expected traffic spike, not during one.
- **Database** — **Database → Query Performance** / **Logs** for anything
  reads/writes to `public.profiles`, the economy tables, or progression
  tables are erroring. `SUPABASE_SERVICE_ROLE_KEY` misconfiguration on the
  backend shows up here as permission-denied errors, not as a backend crash.

## 4. Manual operational checks (no dashboard automates these — do them by hand)

- **CORS** — open the deployed frontend, open browser devtools → Network,
  confirm the Socket.IO handshake succeeds on the `websocket` transport
  (not silently falling back to `polling` the whole session, which still
  works but degrades reconnect latency).
- **Cold start** — if the backend plan can idle/sleep, time how long the
  first request after an idle period takes, and confirm the frontend's
  loading state does not read as "broken" during that window.
- **Multi-device readiness** — the six manual scenarios (A–F) in
  `docs/runbooks/staging-environment.md` are, themselves, a monitoring
  activity the first time they're run against a freshly deployed staging
  environment — treat their evidence captures as the pre-launch baseline to
  compare later incidents against.

## 5. What "healthy" looks like at a glance

Before calling a launch window clean, confirm all of:

- [ ] `/health` → `status: "healthy"`, no missing fields
- [ ] Render: 0 restarts in the observation window, memory flat or sawtoothing
      predictably (not climbing unbounded)
- [ ] Supabase: project not paused, no permission-denied spike in database logs
- [ ] No `preflight_timeout` spike in server logs
- [ ] No sustained compensating-refund rate
- [ ] No room stuck in `terminalStatus: "FAILED"`
- [ ] Build log confirms 37/37 prerendered routes
