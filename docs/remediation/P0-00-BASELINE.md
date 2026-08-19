# P0 Remediation — Phase 0 Safety Baseline

Recorded **2026-08-18**, before any remediation edit.
Branch `refactor/modernization-architecture`, HEAD `acb5764` ("Enterprise level changes").

This file is evidence, not narrative. Everything below was executed, not assumed.

---

## 1. Working tree at baseline

Uncommitted work that must survive remediation — 17 modified, 14 untracked paths:

```
 M ENTERPRISE_READINESS_REPORT.json
 M RELEASE_READINESS_REPORT.json
 M client/src/App.tsx
 M client/src/__tests__/mobileCertification.test.ts
 M client/src/features/profile/AchievementsPanel.tsx
 M client/src/features/profile/ProfileHeader.tsx
 M client/src/features/rankings/LeaderboardTable.tsx
 M client/src/features/rankings/PlayerRankCard.tsx
 M client/src/features/rankings/RecentPlayersHub.tsx
 M client/src/features/tournaments/TournamentBracket.tsx
 M client/src/features/tournaments/TournamentCard.tsx
 M client/src/index.css
 M client/src/navigation/navigationConfig.tsx
 M client/src/pages/BhalyamHome.tsx
 M client/src/pages/LeaderboardPage.tsx
 M client/src/pages/ProfilePage.tsx
 M client/src/pages/TournamentsPage.tsx
 M server/src/index.ts
?? client/src/design-system/
?? client/src/features/onboarding/
?? client/src/features/profile/AchievementCard.tsx
?? client/src/features/profile/AchievementRevealModal.tsx
?? client/src/features/rankings/RankShowcaseCard.tsx
?? client/src/features/social/
?? client/src/features/tournaments/TournamentHeroBanner.tsx
?? client/src/pages/DesignSystemCatalogPage.tsx
?? client/src/pages/SocialHubPage.tsx
?? server/src/party/
?? server/src/social/
?? shared/onboarding/
?? shared/party/
?? shared/social/
```

**Constraint accepted:** none of this is reverted, stashed, or overwritten. Remediation
edits are additive, or surgical within these files.

---

## 2. Baseline gates — all green before remediation

| Gate | Command | Result |
|---|---|---|
| Typecheck (server + client) | `npm run typecheck` | **exit 0** |
| Server tests | `npm --prefix server test` | **92 files, 707 tests passed** (exit 0) |
| Client tests | `npm --prefix client test` | **57 files, 460 tests passed** (exit 0) |

Any red in these after remediation is a regression introduced by remediation, not
pre-existing.

---

## 3. Dependency & API impact map

### Express surface (`server/src/index.ts`)

```
app.use(securityHeaders)
app.use(cors)
app.use(express.json())
├── /api/profile      → profileRouter        (ProfileController)
├── /api/ranking      → rankingRouter        (RankingController)
├── /api/tournaments  → tournamentRouter     (TournamentController)
├── /api/seasons      → seasonRouter         (TournamentController)
├── /api/social       → socialRouter         (SocialController)
├── /api/parties      → partyRouter          (PartyController)
├── /api/operational  → requireOperationalAuth  (SecurityMiddleware)  ← FAIL-OPEN
├── /health           → inline, public by design
└── 8 × /api/operational/* handlers declared inline AFTER the middleware
```

### Services behind the routers — all process-local `Map`

| Router | Services | Storage |
|---|---|---|
| profile | ProfileService, MatchHistoryService, AchievementsEngine, StatsProjection | in-memory Map |
| ranking | RankingService, LeaderboardService, ChallengeEngine, XPEngine, RecentPlayersService | in-memory Map |
| tournaments | TournamentService, BracketEngine, TournamentEngine | in-memory Map |
| seasons | SeasonService, SeasonRewardsEngine | in-memory Map |
| social | FriendsService, FriendRequestsService, PresenceService | in-memory Map |
| parties | PartyService, PartyEngine | in-memory Map |

### Client callers — 5 pages, ~45 `fetch` sites, zero `Authorization` headers

| Page | Endpoints hit |
|---|---|
| `client/src/pages/ProfilePage.tsx` | `/api/profile/*` (6) |
| `client/src/pages/LeaderboardPage.tsx` | `/api/ranking/*` (9) |
| `client/src/pages/TournamentsPage.tsx` | `/api/tournaments/*`, `/api/seasons/*` (10) |
| `client/src/pages/SocialHubPage.tsx` | `/api/social/*`, `/api/parties/*` (19) |
| `client/src/pages/AdminDashboardPage.tsx` | `/api/operational/*` (5) |

All five derive identity the same way, and it is **not** a credential:

```ts
const effectivePlayerId = userId || localStorage.getItem("mpg.playerId") || "guest_player_1";
```

`mpg.playerId` is a client-generated `p_<epoch>_<random>` string in localStorage (already
flagged in `client/src/lib/privacy/dataInventory.ts`). Every API call puts it in the URL
path, and every router treats it as proof of identity.

### Existing auth material available for reuse

- `server/src/lib/supabaseAuth.ts` — `verifyAccessToken()` verifies HS256 Supabase JWTs
  server-side (rejects forged `alg`, checks `exp` / `iss` / `aud`). **At baseline it is
  reachable only from the socket path; no HTTP router calls it.**
- `server/src/lib/seatToken.ts` — HMAC-SHA256 + `crypto.timingSafeEqual` pattern to reuse.
- `client/src/store/authStore.ts` — already holds the live Supabase `access_token` outside
  React, for socket payloads.

---

## 4. Recorded HTTP responses — the exploits, reproduced

Server started with `tsx src/index.ts`, **no `OPERATIONAL_SECRET`**, and no auth header on
any request. Full transcript: `scratchpad/baseline/http-baseline.txt`.

### P0-1 — Operational surface, anonymous

```
GET /api/operational/health       -> 200  {"status":"HEALTHY", ... full check list}
GET /api/operational/metrics      -> 200  {rooms, recovery, realtime, memory ...}
GET /api/operational/rooms        -> 200  {"rooms":[]}
GET /api/operational/leaks        -> 200  {resourceCounts, sockets, timers ...}
GET /api/operational/performance  -> 200  {p50/p95/p99 per operation}
GET /api/operational/games        -> 200  {per-game telemetry}
```

Re-run with **`NODE_ENV=production`**:

```
GET /api/operational/metrics (NODE_ENV=production, no secret) -> 200
```

Fail-open is not a development-only affordance. It is unconditional —
`SecurityMiddleware.ts:14`:

```ts
if (!secret) {
  return next();
}
```

### P0-2 — Player-scoped routers, anonymous, forged identity

```
GET  /api/profile/victim_user                      -> 200  reads another player's profile
PUT  /api/profile/victim_user                      -> 200  {"displayName":"PWNED"}   <- WRITE
GET  /api/profile/victim_user/stats                -> 200
GET  /api/ranking/rank/victim_user                 -> 200
POST /api/ranking/friends/victim_user              -> 200  {"success":true}          <- WRITE
GET  /api/seasons/player/victim_user               -> 200
POST /api/seasons/player/victim_user/claim/tier_1  -> 400  (rejected on tier id, NOT on identity)
GET  /api/social/friends/victim_user               -> 200
POST /api/social/requests/send                     -> 200  friend request sent AS victim_user
POST /api/parties/create                           -> 200  party created with leaderId=victim_user
POST /api/parties/player/victim_user/leave         -> 200                            <- WRITE
POST /api/tournaments/t1/register                  -> 400  (rejected on tournament id, NOT on identity)
```

`PUT /api/profile/victim_user` returned the mutated record:

```json
{"profile":{"playerId":"victim_user","displayName":"PWNED","level":1,"experiencePoints":0}}
```

Confirmed under `NODE_ENV=production` too: `PUT /api/profile/other_user -> 200`.

The two `400`s are **not** authorization. They failed on a non-existent tier / tournament
id. With a real id they would have succeeded against another account.

### P0-4 — `/admin`

`client/src/App.tsx:134`

```tsx
<Route path="/admin" element={<AdminDashboardPage />} />
```

No `ProtectedRoute` wrapper — compare `/profile` at `App.tsx:106-113`, which has one. The
page fetches five operational endpoints with bare `fetch()` and no credential, which is
consistent with the server not asking for one.

### P0-4 — `mobileCertification.test.ts`

`client/src/__tests__/mobileCertification.test.ts`, 98 lines, zero imports of any page or
component. Its "device matrix" asserts against its own literal table:

```ts
const DEVICE_MATRIX = [{ name: "iPhone SE", width: 320, height: 568, isMobile: true, touchTargetMinPx: 44 }, ...];
expect(device.touchTargetMinPx).toBeGreaterThanOrEqual(requiredMinPx);   // 44 >= 44
expect(device.width / device.height).toBeGreaterThan(0.35);              // arithmetic on literals
```

Nothing renders. Nothing is measured. The suite cannot fail for any product reason.

Client test infrastructure at baseline: **no `jsdom`, no `happy-dom`, no
`@testing-library/*`** in `client/package.json`. The four `.test.tsx` files call
`React.createElement(...)` and assert `toBeDefined()` — that is construction, not
rendering. `playwright@^1.62.1` **is** already a client devDependency and already drives
`client/scripts/responsive-matrix/runner.mjs` against real Chromium.

---

## 5. Remediation ground rules carried forward

1. The baseline gates in §2 must stay green; a red gate is a regression.
2. No unrelated file is reverted. The 31 uncommitted paths in §1 are preserved.
3. Every P0 claim in the final report cites a command output, not an intention.
4. Realtime room state (`RoomManager`, socket handlers, game engines) is not touched.
