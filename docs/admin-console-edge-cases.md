# BHALYAM Admin Console Edge Case & Survivability Catalog

> **Document Classification:** Engineering Intelligence & QA Architecture Standard
> **Target System:** BHALYAM Admin Console (`/admin/*`)
> **Author:** Principal QA Architect & Systems Engineering Team
> **Status:** Draft Verification Catalog — statuses below reflect what has actually been read, run, or reproduced, not what the console is intended to eventually do

---

## 0. How to read this document

Every scenario below carries an evidence-graded **Status**, assigned by an independent audit that read the live source, ran `tsc`/`vitest`/`vite build`, and reproduced behavior in a real browser — not by the intent of whoever wrote the scenario. A scenario describing sensible, desirable behavior is not the same claim as that behavior existing in the shipped code. Four statuses are used, and only these four:

| Status | Meaning |
|---|---|
| **VERIFIED** | Directly confirmed — either a passing automated test asserts this exact behavior, or it was reproduced live in a browser, or the source contains an unambiguous, unconditional implementation of it. |
| **IMPLEMENTED NOT VERIFIED** | Code exists that plausibly produces this behavior, but no test or live reproduction in this pass specifically confirmed it — often because the triggering condition (a given viewport, a given dataset shape) was never actually exercised. |
| **PLANNED** | No implementation exists yet, but the mechanism is a reasonable extension of what's already there (e.g. cross-tab sync is plausible future work, not a currently-open gap in shipped logic). |
| **NOT IMPLEMENTED** | Confirmed absent — either the described code path was read and does not exist, or it was reproduced live and the actual behavior differs from the scenario's claim. |

Two scenarios in the original catalog stated behavior as though it already shipped, when it does not:

- **EC-023** claimed keyboard row-navigation and Enter-to-open worked on the Users table. It does not — the table row is a bare `<tr onClick>` with no `role`, `tabIndex`, or `onKeyDown` (`client/src/components/admin/data-table/index.tsx`), confirmed by direct DOM measurement (`tabIndex: null`, `isFocusable: false`) and by axe-core reporting related `critical` violations elsewhere in the same component family. Corrected to **NOT IMPLEMENTED** below. Tracked as **ADMIN-A11Y-001** (row keyboard access) and **ADMIN-A11Y-003** (pagination button names) — both remain open.
- **EC-026** claimed a network-timeout error toast on match termination. There is no network call on `/admin/matches` to time out — `handleTerminateMatch` only mutates local React state (see `docs/admin-console-edge-cases.md` §Future Real-Data Integration Runbook: the entire console is pre-integration). Corrected to **NOT IMPLEMENTED** below, reworded to describe what would need to be built, not what exists.

The following confirmed-open findings are **not** addressed by this document and must not be read as resolved by any status below: **ADMIN-A11Y-001**, **ADMIN-A11Y-003**, **ADMIN-A11Y-004** (row/pagination keyboard access and drawer focus trapping), **ADMIN-REL-001** (Dashboard reports "healthy" on a failed health check), **ADMIN-REL-002** (feature-flag rollout slider commits without a real save gate), and the `AdminLayout` `min-h-[100dvh]`/`h-screen` dead-declaration issue.

---

## 1. Executive Summary & Survivability Philosophy

The **BHALYAM Admin Console** serves as the central mission control for live multiplayer lounge operations, player safety, system health monitoring, tournament oversight, and feature flag management.

To ensure uninterrupted operations under adverse network environments, erratic backend payloads, high-concurrency tournament traffic, and unexpected client state mutations, this catalog defines **110 rigorous edge cases** spanning **18 distinct categories**. As of this revision, the console is a pre-integration mock UI (see §5) — most CAT-02, CAT-03, and CAT-16 scenarios describe target behavior for a backend that does not exist yet, not current functionality.

### Core Survivability Tenets
1. **Never Crash the Console (Defensive Rendering):** Any malformed, missing, null, or out-of-bounds telemetry payload must gracefully fall back to typed empty/error boundaries without unmounting the parent shell.
2. **Deterministic Layout Integrity:** Viewport transitions (from 320px ultra-compact mobile up to 4K ultra-wide monitors) must preserve data legibility, prevent horizontal overflow clipping, and maintain thumb/mouse tap zones.
3. **Explicit Data Origin Transparency:** All mocked or local preview states must be conspicuously disclosed to prevent operators from mistaking client previews for confirmed server mutations.
4. **Resilient Session & Network Continuity:** Intermittent network disconnections, 401 token expiries, 429 rate limits, and tab sleep cycles must recover cleanly with informative operator notifications and idempotency safeguards.

---

## 2. Edge Case Taxonomy & Categorization

| Category ID | Category Name | Description & Focus |
|---|---|---|
| **CAT-01** | **Empty States** | Zero-row tables, initial clean installs, zero-result search/filter combinations. |
| **CAT-02** | **Large Data** | 10,000+ row tables, large numerical metrics, unbounded arrays, deep pagination. |
| **CAT-03** | **Failed Requests** | Network disconnections, 500 internal server errors, 502 bad gateways, connection timeouts. |
| **CAT-04** | **Partial Data** | Sliced payload deliveries, missing non-mandatory properties, dropped telemetry fields. |
| **CAT-05** | **Invalid Data** | Malformed timestamps, out-of-range status enums, negative latencies, circular object refs. |
| **CAT-06** | **Null / Undefined Values** | Null avatars, unassigned moderators, unranked players, empty email strings. |
| **CAT-07** | **Long Text & Unicode** | 200+ character usernames, Indic script (Telugu, Hindi), emojis, long German compounds. |
| **CAT-08** | **Mobile (320px - 430px)** | Ultra-narrow mobile viewports, touch target sizes, mobile bottom sheets, drawer stacking. |
| **CAT-09** | **Tablet (768px - 1023px)** | Medium tablet breakpoints, 2-column card wrapping, sidebar drawer collapses. |
| **CAT-10** | **Desktop (1024px+)** | Multi-column grid expansions, high-density table views, slide-over drawer layouts. |
| **CAT-11** | **Dark Mode & Contrast** | Theme toggling, token color contrast (WCAG AA), glowing amber accent legibility. |
| **CAT-12** | **Accessibility (WCAG AA)** | Keyboard focus traps, screen reader ARIA landmarks, `:focus-visible` golden rings. |
| **CAT-13** | **Navigation & Deep Linking** | Direct URL routing, breadcrumb history, query parameter preservation. |
| **CAT-14** | **Multiple Tabs** | Concurrent operator sessions, cross-tab broadcast synchronization, state isolation. |
| **CAT-15** | **Refresh & Lifecycle** | In-page browser refresh (F5), component re-mounting, preserve filter states. |
| **CAT-16** | **Session Expiry & Auth** | Expired Supabase session JWT, seatToken revocation, unprivileged guest role denial. |
| **CAT-17** | **Mock Data Disclosures** | Local preview banners, unconfirmed mutation alerts, preview vs live badges. |
| **CAT-18** | **Future Real Data Readiness**| In-memory to PostgreSQL migration safety, date parsing standards, schema validation. |

---

## 3. Comprehensive Edge Case Catalog (110 Scenarios)

### Section 3.1: Command Center Dashboard (`/admin/dashboard` & `/admin`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-001** | Zero active rooms on cold server start | CAT-01 (Empty States) | Live Matches widget renders `EmptyState` ("No live matches currently in progress") with link to match history. | **NOT IMPLEMENTED** — `recentMatches` is a hardcoded 5-item array; the `EmptyState` branch is present in source but unreachable through the UI. | Medium | `/admin/dashboard` |
| **EC-002** | Concurrency spike during tournament finale (10,000+ concurrent players) | CAT-02 (Large Data) | KPI `StatCard` formats number as `10.4k` or `10,420` without numeric wrap or card distortion. | **NOT IMPLEMENTED** — values are static strings (`"18"`, `"142"`); no number-formatting logic exists. | High | `/admin/dashboard` |
| **EC-003** | Server `/health` check timeout (> 10,000ms) | CAT-03 (Failed Requests) | System Health badge transitions to `warning` / `offline` with retry trigger; dashboard remains navigable. | **NOT IMPLEMENTED** — confirmed opposite behavior (ADMIN-REL-001): the `catch` block in `fetchDashboardData` sets `systemStatus` to `"healthy"` on any failure. | High | `/admin/dashboard` |
| **EC-004** | Live match telemetry delivers null host name | CAT-04 (Partial Data) | Table displays `"Unknown Host"` fallback badge without throwing `TypeError`. | **NOT IMPLEMENTED** — no null-guard exists; mock data is always well-formed so this path has never executed. | High | `/admin/dashboard` |
| **EC-005** | Negative average latency reported by server socket (`-14ms`) | CAT-05 (Invalid Data) | Sanitizes metric to `0ms` or displays `ERR_ANOMALY` pill; prevents chart breakdown. | **NOT IMPLEMENTED** — no sanitization code exists for chart inputs. | Medium | `/admin/dashboard` |
| **EC-006** | Operator username is null in auth store | CAT-06 (Null Values) | Page header welcomes `"Admin Operator"` as fallback title. | **NOT IMPLEMENTED** — the header ("Command Center Overview") does not reference an operator name at all. | Low | `/admin/dashboard` |
| **EC-007** | Extreme game title name | CAT-07 (Long Text) | Table game column truncates with ellipsis and renders full title on hover tooltip. | **IMPLEMENTED NOT VERIFIED** — the cell has no explicit truncate class and no tooltip mechanism was found; not exercised since mock game names are short. | Low | `/admin/dashboard` |
| **EC-008** | Dashboard rendered on iPhone SE (320px width) | CAT-08 (Mobile) | 4 KPI cards stack cleanly into single column; charts downscale gracefully with horizontal scroll if needed. | **IMPLEMENTED NOT VERIFIED** — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` is present; not captured at 320px in this pass. | High | `/admin/dashboard` |
| **EC-009** | Dashboard on iPad Mini (768px portrait) | CAT-09 (Tablet) | KPI cards render in balanced 2x2 grid; sidebar collapses to hamburger menu. | **IMPLEMENTED NOT VERIFIED** — matching Tailwind breakpoints exist; not captured at 768px this pass. | Medium | `/admin/dashboard` |
| **EC-010** | High-resolution 4K monitor rendering (3840px) | CAT-10 (Desktop) | Container stays constrained to `max-w-7xl` or scales proportionally. | **VERIFIED** — `AdminLayout`'s `<main>` wraps children in a `max-w-7xl w-full mx-auto` container, confirmed in source. | Low | `/admin/dashboard` |
| **EC-011** | Quick theme toggling (Dark <-> Light in < 200ms) | CAT-11 (Dark Mode) | Chart canvas and CSS tokens update synchronously without inverted invisible text or flashing white boxes. | **IMPLEMENTED NOT VERIFIED** — theme toggle and `--chrome-*` tokens confirmed working at normal cadence (screenshotted); rapid (<200ms) toggling not specifically tested. | Medium | `/admin/dashboard` |

---

### Section 3.2: User Accounts & Player Management (`/admin/users`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-012** | Empty user directory (brand new database) | CAT-01 (Empty States) | `DataTable` displays `EmptyState` ("No user accounts registered") with refresh action. | **IMPLEMENTED NOT VERIFIED** — the `usersList.length === 0` branch and its copy exist in source; unreachable through the UI since the mock array is fixed at 25 rows and there is no delete-all action. | Low | `/admin/users` |
| **EC-013** | Database contains 50,000 player accounts | CAT-02 (Large Data) | Pagination limits render to 10/25/50 per page; search is debounced (250ms) to prevent UI thread lock. | **IMPLEMENTED NOT VERIFIED** — the 250ms debounce is real and verified (`search-bar/index.tsx`); pagination is fixed at 10/page with no 25/50 option, and never tested against more than 25 rows. | High | `/admin/users` |
| **EC-014** | REST API network error when loading user profile | CAT-03 (Failed Requests) | Detail drawer renders retry card ("Failed to load user profile") with error code. | **NOT IMPLEMENTED** — there is no network call anywhere on this page; the drawer only ever reads from local state. | High | `/admin/users` |
| **EC-015** | User record missing `joinedDate` timestamp | CAT-04 (Partial Data) | Displays `"Unknown date"` / `"---"` placeholder without parsing error. | **NOT IMPLEMENTED** — no fallback branch exists; every mock record has a populated `joinedDate`. | Low | `/admin/users` |
| **EC-016** | Win rate percentage string formatted as negative or > 100% | CAT-05 (Invalid Data) | Clamps display to `100%` with an anomaly warning dot. | **NOT IMPLEMENTED** — `winRate` is rendered as a literal string with no clamping or validation. | Medium | `/admin/users` |
| **EC-017** | Player account has no avatar image URL | CAT-06 (Null Values) | Renders circular monogram badge using player's first initial in golden amber token. | **VERIFIED** — this is the *only* avatar path that exists (`row.name.charAt(0).toUpperCase()`); every row uses it, confirmed in source and live screenshots. | Low | `/admin/users` |
| **EC-018** | Ultra-long name: `Venkatasubramanian Ramaswamy Krishnamurthy` | CAT-07 (Long Text) | User name truncates cleanly in table row and wraps in detail drawer header. | **IMPLEMENTED NOT VERIFIED** — the name cell has `truncate`; this exact name is now seeded in mock data (`u-103`), but rendered truncation/wrap was not visually captured this pass. | Medium | `/admin/users` |
| **EC-019** | Unicode name in Indic Telugu script | CAT-07 (Unicode) | Renders correct Telugu font glyphs without box replacement glyphs; initial avatar extracts first grapheme. | **IMPLEMENTED NOT VERIFIED** — seeded in mock data (`u-124`, `సూర్య ప్రకాష్`); font rendering was not visually confirmed, and the avatar-initial code uses `charAt(0)`, which is UTF-16-unit-based, not grapheme-aware — for a Telugu name in a combining-mark script this can slice mid-glyph. Flagged as a real, unverified risk rather than assumed correct. | Medium | `/admin/users` |
| **EC-020** | Name with trailing and leading emojis | CAT-07 (Unicode) | Extracted avatar initial bypasses emoji or renders initial letter correctly. | **NOT IMPLEMENTED** — `charAt(0)` on a name starting with an emoji (e.g. `u-105`, `"राजेश कुमार Sharma 🎯"` — emoji is trailing here, but the same code path applies to any leading-emoji name) has no emoji-detection logic; a leading-emoji name would show half a surrogate pair or the emoji itself, not a letter. | Low | `/admin/users` |
| **EC-021** | Operator toggles "Ban User" in mock mode | CAT-17 (Mock Data) | Toast displays local-preview disclosure language, not a server-confirmed mutation claim. | **VERIFIED** — `handleToggleBan` sets exactly this class of message (`"Preview updated locally — {name} would be banned. No changes were sent to the server."`), confirmed in source and by a passing test. | High | `/admin/users` |
| **EC-022** | Filter by role="Guest" and status="Critical" produces 0 results | CAT-01 (Empty States) | Shows `EmptyState` ("No users meet selected filters") with a working `"Reset Filters"` button. | **VERIFIED** — confirmed via `adminDataInteraction.test.tsx` / `emptyAndLoadingStates.test.tsx` using the real zero-result combination (Guest + Warning), including the Reset Filters recovery path. | Low | `/admin/users` |
| **EC-023** | Keyboard navigation through user table | CAT-12 (Accessibility) | Table rows and action buttons receive visible `:focus-visible` golden focus ring; Enter key opens drawer. | **NOT IMPLEMENTED** — corrected from the original catalog's claim. `DataTable`'s `<tr onClick>` has no `role`, `tabIndex`, or `onKeyDown`; confirmed unfocusable by direct DOM measurement. Tracked as **ADMIN-A11Y-001**, open. | High | `/admin/users` |

---

### Section 3.3: Realtime Game Rooms & Matches (`/admin/matches`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-024** | Zero active match rooms | CAT-01 (Empty States) | Renders `EmptyState` ("No active rooms currently running") with `"Create Test Room"` guide. | **IMPLEMENTED NOT VERIFIED** — the zero-length branch exists via `DataTable`'s dynamic empty props; the "Create Test Room" CTA does not exist (only a generic reset/clear action does). | Low | `/admin/matches` |
| **EC-025** | Match has 1,420 live spectators | CAT-02 (Large Data) | Telemetry card displays `"1,420 spectators"` without UI overflow or badge clipping. | **VERIFIED** — `spectatorsCount: 1420` is seeded on `m-003`; the detail drawer's `InfoCard` renders it as `"1420 spectators"` in a fixed-width field row with no observed clipping. | Medium | `/admin/matches` |
| **EC-026** | Terminate room request fails against a real backend | CAT-03 (Failed Requests) | *(Corrected from the original catalog, which described a network-timeout error toast as though it already existed.)* This is future-state behavior only: once match termination calls a real endpoint, a failed request must reset the action from its loading state and surface an error toast rather than silently updating local state. | **NOT IMPLEMENTED** — there is no network call at all in `handleTerminateMatch`; it is a synchronous local state mutation. This scenario cannot occur until real-data integration (§5) begins, and must be built then, not assumed. | High | `/admin/matches` |
| **EC-027** | Room seats array is empty (`seats: []`) | CAT-04 (Partial Data) | Occupied Seat Allocation card renders `"No players currently seated in room"`. | **NOT IMPLEMENTED** — the seat list renders `selectedMatch.seats.map(...)` directly with no empty-array fallback message; every mock match has at least one seat. | Medium | `/admin/matches` |
| **EC-028** | Match duration timer overflows 24 hours | CAT-05 (Invalid Data) | Highlights room as potential orphan/zombie process with amber warning badge. | **NOT IMPLEMENTED** — `duration` is a display-only string with no threshold logic. | High | `/admin/matches` |
| **EC-029** | Player in seat #2 disconnects unexpectedly | CAT-05 (Invalid Data) | Detail drawer renders seat with `DISCONNECTED (22s)` pill and 0ms ping indicator. | **VERIFIED** — `m-001` seat 1 (Priya Patel) is seeded exactly this way (`ping: 0, isDisconnected: true, reconnectSecondsLeft: 22`) and renders the `DISCONNECTED (22s)` badge, confirmed in source and by test coverage of the equivalent ST4091 case. | High | `/admin/matches` |
| **EC-030** | Out-of-order move sequence in Star Game engine | CAT-05 (Invalid Data) | Diagnostic anomaly banner displays the desync message. | **VERIFIED** — seeded on `m-008` (ST4091) and directly regression-tested (`adminComponentFeatures.test.tsx`) after fixing the build-breaking missing `AlertTriangle` import that previously crashed this exact code path. | Critical | `/admin/matches` |
| **EC-031** | Disconnect reason contains raw XML/HTML injection string | CAT-07 (Security/Text) | Escaped as plain text string; prevents XSS execution. | **VERIFIED** — all match/seat text fields render through plain JSX text interpolation (no `dangerouslySetInnerHTML` anywhere in this file, confirmed by repo-wide grep), so React's default escaping applies unconditionally regardless of content. | Critical | `/admin/matches` |
| **EC-032** | Detail drawer opened on 375px mobile screen | CAT-08 (Mobile) | Drawer slides in at full viewport width with sticky top close button and scrollable body. | **IMPLEMENTED NOT VERIFIED** — `DetailDrawer` uses `w-screen` with a `max-w-*` cap and a fixed header/scrollable body layout; not captured at 375px this pass. | High | `/admin/matches` |
| **EC-033** | Operator switches between match detail drawers rapidly | CAT-15 (Lifecycle) | Previous drawer state unmounts cleanly without overlapping backdrops or stuck body scroll locks. | **VERIFIED** — regression-tested: close-then-reopen of the same drawer (ST4091) is confirmed to unmount and remount content cleanly with no leftover state. Rapid-fire switching between *different* rows specifically was not tested. | Medium | `/admin/matches` |
| **EC-034** | Match history chart rendered with 0 data points | CAT-01 (Empty States) | ChartCard renders `EmptyState` instead of blank canvas. | **NOT IMPLEMENTED** — `MOCK_MATCH_HISTORY_CHART` is a fixed 6-point array with no empty-state branch around the chart at all. | Low | `/admin/matches` |
| **EC-035** | Terminate match clicked in preview environment | CAT-17 (Mock Data) | Dismisses drawer, updates local room list to finished/removed, displays preview disclosure toast. | **VERIFIED** — confirmed in source: `handleTerminateMatch` closes the drawer, sets the match to `"abandoned"` in local state, and shows the corrected disclosure toast. Note: this action fires with no confirmation step (a separate, already-tracked finding, ADMIN-UX-001-class) — not claimed as fixed here. | Medium | `/admin/matches` |

---

### Section 3.4: Feature Flags Management (`/admin/feature-flags`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-036** | Zero feature flags configured | CAT-01 (Empty States) | Displays `EmptyState` with `"Create First Flag"` CTA. | **IMPLEMENTED NOT VERIFIED** — the `flags.length === 0` branch and its `EmptyState` exist in source; unreachable through the UI since there is no delete-flag action and "Create Flag" is itself a disabled placeholder. | Medium | `/admin/feature-flags` |
| **EC-037** | 200+ feature flags across 10 service namespaces | CAT-02 (Large Data) | Categorized into collapsible namespace sections with real-time text filter. | **NOT IMPLEMENTED** — flags render as a flat list; no namespace grouping or collapsing exists. | Medium | `/admin/feature-flags` |
| **EC-038** | WebSocket push fails when updating flag rollout | CAT-03 (Failed Requests) | Reverts UI toggle to previous state; error toast. | **NOT IMPLEMENTED** — there is no WebSocket or network call anywhere on this page; toggling is a synchronous local mutation that cannot fail. | Critical | `/admin/feature-flags` |
| **EC-039** | Flag record missing `environments` object | CAT-04 (Partial Data) | Defaults all unlisted environments to `disabled` with a warning pill. | **NOT IMPLEMENTED** — `FeatureFlag` has a single required `environment` field, not a per-environment map; this scenario describes a data shape the type doesn't have. | High | `/admin/feature-flags` |
| **EC-040** | Rollout percentage slider set to invalid value | CAT-05 (Invalid Data) | Clamps value strictly to `[0, 100]`. | **VERIFIED** — the control is a native `<input type="range" min="0" max="100">`; the browser itself cannot produce an out-of-range value through the UI. | High | `/admin/feature-flags` |
| **EC-041** | Description field left empty | CAT-06 (Null Values) | Displays a muted "no description" fallback. | **NOT IMPLEMENTED** — no fallback branch exists; every mock flag has a populated description. | Low | `/admin/feature-flags` |
| **EC-042** | Extreme flag key name | CAT-07 (Long Text) | Font sizes adjust and key wraps cleanly in a monospace code block. | **IMPLEMENTED NOT VERIFIED** — the key renders in a `font-mono` inline span with no explicit wrap/truncate handling; not tested against an oversized key. | Low | `/admin/feature-flags` |
| **EC-043** | Toggle flag switch on mobile touch device | CAT-08 (Mobile) | Toggle switch touch target is minimum 44x44px; haptic feedback if enabled. | **NOT IMPLEMENTED** — the switch's clickable area (`h-6 w-11`, 24×44px) is below the 44px height minimum this project's own UI standards require; no haptic call exists on this page. | Medium | `/admin/feature-flags` |
| **EC-044** | Screen reader reads toggle state | CAT-12 (Accessibility) | `role="switch"` announces checked state and flag description. | **NOT IMPLEMENTED** — `role="switch"` and `aria-checked` are present (real), but the switch has no `aria-label`/`aria-labelledby` tying it to the flag's name, so a screen reader announces only "switch, checked" with no context of which flag. Tracked as part of the same open accessibility gap as ADMIN-A11Y-001/003. | High | `/admin/feature-flags` |
| **EC-045** | Two operators toggle same flag simultaneously in separate tabs | CAT-14 (Multiple Tabs) | Cross-tab conflict notification. | **NOT IMPLEMENTED** — no `BroadcastChannel`, `storage` event listener, or any cross-tab mechanism exists for flag state. | High | `/admin/feature-flags` |
| **EC-046** | Flag toggle in mock demonstration mode | CAT-17 (Mock Data) | Local-preview disclosure toast, server explicitly stated as unaffected. | **VERIFIED** — `handleToggle` shows exactly this class of message ("…this toggle was not sent to any worker cluster or server."), confirmed in source. | High | `/admin/feature-flags` |

---

### Section 3.5: Broadcast Announcements (`/admin/announcements`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-047** | Zero active or historical announcements | CAT-01 (Empty States) | Displays `EmptyState` with `"Create Broadcast"` action. | **IMPLEMENTED NOT VERIFIED** — the zero-length branch and dynamic empty copy exist via `DataTable`'s props; the seeded array can reach zero only by deleting all four mock rows through the UI, which was not exercised. | Low | `/admin/announcements` |
| **EC-048** | Announcement title exceeds 150 characters | CAT-07 (Long Text) | Banner wraps; character-counter warning near the limit. | **NOT IMPLEMENTED** — the title `<input>` has no `maxLength`, counter, or wrap-specific styling. | Medium | `/admin/announcements` |
| **EC-049** | Broadcast message contains markdown formatting | CAT-05 (Invalid Data) | Sanitizes markdown safely without raw HTML injection. | **NOT IMPLEMENTED** — markdown is not parsed or rendered at all; the message is plain-text-interpolated (safe from injection as a side effect, but literal `**bold**` displays as literal asterisks, not the described markdown rendering). | Critical | `/admin/announcements` |
| **EC-050** | Target audience set to `all` / `guests_only` / `members_only` | CAT-04 (Partial Data) | Distinct badge per audience. | **VERIFIED** — `targetAudience` (`"all" \| "lobby" \| "in-game"`) renders as a badge on every row, confirmed in source. Note: the enum values differ from this scenario's wording (`lobby`/`in-game`, not `guests_only`/`members_only`) — the mechanism is real, the exact value set described is not. | Low | `/admin/announcements` |
| **EC-051** | Scheduled start date is in the past | CAT-05 (Invalid Data) | Rose error border with explanatory text. | **NOT IMPLEMENTED** — the create form has no scheduled-date field at all; every new announcement is created as immediately `"published"`. | Medium | `/admin/announcements` |
| **EC-052** | Emergency shutdown announcement (`type: "critical"`) | CAT-11 (Dark Mode) | Pulsing crimson warning border, high contrast both themes. | **NOT IMPLEMENTED** — `AnnouncementItem["type"]` has no `"critical"` value (only `info`/`warning`/`maintenance`/`event`); this scenario describes a type that doesn't exist. | High | `/admin/announcements` |
| **EC-053** | Mobile view of announcement preview modal | CAT-08 (Mobile) | Bottom sheet or full-screen scrollable view, no cutoff buttons. | **IMPLEMENTED NOT VERIFIED** — the create/detail drawers use the same responsive `DetailDrawer` as the rest of the console; not captured at mobile width this pass. | Medium | `/admin/announcements` |
| **EC-054** | Screen reader announces new broadcast | CAT-12 (Accessibility) | `aria-live="polite"` on creation. | **NOT IMPLEMENTED** — no `aria-live` region exists anywhere on this page; the success toast is a plain `<div>`. | Medium | `/admin/announcements` |
| **EC-055** | Operator attempts to publish broadcast in mock mode | CAT-17 (Mock Data) | Preview banner, local draft confirmation, no socket packets sent. | **VERIFIED** — `handleCreateAnnouncement` shows the corrected local-preview disclosure toast and performs no network/socket call, confirmed in source. | High | `/admin/announcements` |
| **EC-056** | Deleting an active broadcast | CAT-15 (Lifecycle) | Confirmation dialog; removes from local state. | **NOT IMPLEMENTED** — `handleDelete` removes the item immediately with no confirmation step of any kind (same open finding class as ADMIN-UX-001). | Medium | `/admin/announcements` |

---

### Section 3.6: Leaderboards & Player Standings (`/admin/leaderboards`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-057** | Clean leaderboard at start of new season (0 matches played) | CAT-01 (Empty States) | Empty podium silhouettes; `EmptyState` in table. | **IMPLEMENTED NOT VERIFIED** — the table's zero-result `EmptyState` path is real and reachable via search/filter (verified elsewhere); the *podium* has no empty-silhouette variant — `top3[n]?.name` etc. simply render `undefined` as blank text if the array is short, not a designed empty state. | Medium | `/admin/leaderboards` |
| **EC-058** | Two players tied for the exact same rank | CAT-05 (Invalid Data) | Both rows render the same rank badge; next distinct rank skips appropriately. | **VERIFIED** — mock data now seeds a real tie (two `rank: 4` rows, `p-04`/`p-05`), with the next row correctly at `rank: 6` (competition-ranking convention, position 5 skipped), confirmed in source. | Medium | `/admin/leaderboards` |
| **EC-059** | Top Grandmaster with massive ELO value | CAT-02 (Large Data) | Comma-separated formatting; crown badge intact. | **NOT IMPLEMENTED** — `eloRating` renders as a raw number with no `toLocaleString()`/comma formatting anywhere in the column; current top value (3,250) already renders as `3250`, unformatted. | Low | `/admin/leaderboards` |
| **EC-060** | Unranked provisional player (3/5 placement matches) | CAT-06 (Null Values) | `Provisional 🔰` badge with progress fraction. | **NOT IMPLEMENTED** — there is no provisional/placement-match concept in `LeaderboardPlayer` at all; `isVerified: false` (seeded on `p-10`) only suppresses the verified-shield icon, it does not render a provisional badge. | Low | `/admin/leaderboards` |
| **EC-061** | Player on extreme losing slump (rank #2 → #8) | CAT-05 (Invalid Data) | Downward trend pill with rose styling. | **VERIFIED** — the rank-diff column computes `prevRank - rank` and renders a `TrendingDown` rose pill for any negative diff; seeded on `p-06` (`prevRank: 2, rank: 6`), confirmed in source. | Low | `/admin/leaderboards` |
| **EC-062** | Win rate calculation with 0 matches played | CAT-05 (Invalid Data) | Displays `"0.0%"` or `"---"`, never `NaN%`. | **NOT IMPLEMENTED** — `winRate` is a pre-formatted string in mock data, not computed client-side, so this specific failure mode cannot currently occur — but there is also no defensive formatting code that would prevent it once win rate is computed from real win/loss counts. | High | `/admin/leaderboards` |
| **EC-063** | Leaderboard filtered by a non-existent season | CAT-01 (Empty States) | `EmptyState` with reset-filter button. | **VERIFIED (mechanism)** — the underlying zero-result → `EmptyState` → Reset Filters path is confirmed via the real "Season 1 (Archived)" filter option, which has 0 matching rows. The literal free-text season "Season 99" in this scenario isn't reachable — the filter is a fixed dropdown, not free text. | Low | `/admin/leaderboards` |
| **EC-064** | Podium cards on 320px mobile viewport | CAT-08 (Mobile) | 1st/2nd/3rd stack vertically in rank order. | **IMPLEMENTED NOT VERIFIED** — `order-1 md:order-2` etc. classes exist to reflow the podium; not captured at 320px this pass. | High | `/admin/leaderboards` |
| **EC-065** | Leaderboard avatar fails to load | CAT-06 (Null Values) | Falls back to medal emoji or initial letter. | **VERIFIED** — every row's "avatar" is a literal emoji/character string rendered as text (`row.avatar`), not an `<img>` — there is no image-load path to fail in the first place, so this can't break. | Low | `/admin/leaderboards` |
| **EC-066** | Manual ELO adjustment in mock mode | CAT-17 (Mock Data) | Local preview disclosure toast, no global recalculation. | **VERIFIED** — `handleRecalculateElo` shows the corrected "Local demonstration only…" toast and touches no shared/global state. | High | `/admin/leaderboards` |
| **EC-067** | Keyboard navigation across leaderboard table | CAT-12 (Accessibility) | Tab through rows, Space/Enter to inspect. | **NOT IMPLEMENTED** — same root cause as EC-023: `DataTable` rows have no keyboard affordances. Tracked under ADMIN-A11Y-001. | Medium | `/admin/leaderboards` |

---

### Section 3.7: Growth & Telemetry Analytics (`/admin/analytics`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-068** | Zero DAU / zero MAU recorded | CAT-01 (Empty States) | Flat baseline chart with a maintenance marker; no divide-by-zero. | **NOT IMPLEMENTED** — chart data is a fixed 6-point array with no zero-state handling or marker annotation logic. | High | `/admin/analytics` |
| **EC-069** | Massive traffic spike (500% surge) | CAT-02 (Large Data) | Y-axis auto-scales with nice tick intervals. | **IMPLEMENTED NOT VERIFIED** — Recharts' default axis auto-scaling is in effect (no custom domain/ticks override found); not stress-tested against an extreme value range. | High | `/admin/analytics` |
| **EC-070** | Network failure fetching retention cohort matrix | CAT-03 (Failed Requests) | Timeout → `EmptyState` with retry. | **NOT IMPLEMENTED** — there is no network call anywhere on this page; `RETENTION_COHORTS` is a static constant. | Medium | `/admin/analytics` |
| **EC-071** | Incomplete retention cohort (`d30: "—"`) | CAT-04 (Partial Data) | Clean em-dash rendering, not `null`/`undefined%`. | **VERIFIED** — mock data already seeds `"—"` literal strings for incomplete cohort cells (e.g. `d30: "—"` on the newest cohort), and the cell renders them as plain muted text with no `null`/`NaN` path, confirmed in source. | Low | `/admin/analytics` |
| **EC-072** | Anomaly event in cohort retention (patch-bug regression) | CAT-05 (Invalid Data) | Amber warning border with diagnostic tooltip. | **NOT IMPLEMENTED** — a "(Patch Anomaly)" label is now present in the cohort name string itself, but there is no distinct cell styling or tooltip logic tied to anomaly detection. | Medium | `/admin/analytics` |
| **EC-073** | Rapidly switching timeframe filter | CAT-15 (Lifecycle) | Smooth `LoadingState` shimmer, no flicker or race conditions. | **IMPLEMENTED NOT VERIFIED** — a real `loading` state and `LoadingState` skeleton now gate the KPI/chart region on every range click (confirmed reachable and tested for a single click); rapid repeated clicking (race-condition specific) was not tested, and the underlying chart data does not actually change between ranges regardless of which is selected. | Medium | `/admin/analytics` |
| **EC-074** | Pie chart with 0% share for minor games | CAT-05 (Invalid Data) | Handles zero-value slices without deformed SVG paths. | **IMPLEMENTED NOT VERIFIED** — Recharts' `Pie` handles zero values natively; no mock row currently has `value: 0` to exercise this. | Low | `/admin/analytics` |
| **EC-075** | Viewing analytics charts on mobile device (390px) | CAT-08 (Mobile) | Responsive container resize; single-tap tooltips. | **IMPLEMENTED NOT VERIFIED** — `ResponsiveContainer` is used throughout; not captured at 390px this pass. | High | `/admin/analytics` |
| **EC-076** | Dark mode contrast for multi-color chart series | CAT-11 (Dark Mode) | WCAG AA compliant palette against dark panel. | **IMPLEMENTED NOT VERIFIED** — chart colors are hardcoded hex values chosen for a dark background; formal contrast-ratio measurement was not performed. | High | `/admin/analytics` |
| **EC-077** | Screen reader access to chart data | CAT-12 (Accessibility) | Accessible data tables or `aria-label` trend summaries. | **NOT IMPLEMENTED** — no chart on this page has any textual/tabular alternative or `aria-label` summary; Recharts SVGs are opaque to screen readers by default. | High | `/admin/analytics` |
| **EC-078** | Export CSV report in mock preview mode | CAT-17 (Mock Data) | Client-side mock CSV download with disclosure header. | **NOT IMPLEMENTED** — there is no export control of any kind on this page. | Low | `/admin/analytics` |

---

### Section 3.8: System Health & Infrastructure (`/admin/system-health`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-079** | Server process completely offline | CAT-03 (Failed Requests) | Global health badge → `CRITICAL OUTAGE` with diagnostic logs. | **NOT IMPLEMENTED** — this page makes no network call at all; `SUBSYSTEMS`/`API_ENDPOINTS` are static constants hardcoded to `"healthy"` and cannot represent an outage regardless of real server state. | Critical | `/admin/system-health` |
| **EC-080** | Memory leak simulation (heap > 92%) | CAT-02 (Large Data) | Pulsing crimson warning at threshold. | **NOT IMPLEMENTED** — "Node Heap Allocated" is a static `"142 MB"` value with no threshold logic. | High | `/admin/system-health` |
| **EC-081** | WebSocket cluster node heartbeat drops | CAT-04 (Partial Data) | Node marked `DEGRADED / RECONNECTING`. | **NOT IMPLEMENTED** — there is no per-node fleet table; `SUBSYSTEMS` is a flat list of 5 always-healthy entries. | High | `/admin/system-health` |
| **EC-082** | Latency metric arrives as string instead of number | CAT-05 (Invalid Data) | Safe numeric parsing before averaging. | **NOT IMPLEMENTED** — latency values are already display-formatted strings in mock data (`"12ms"`); no parsing/averaging code exists to be defensive about. | Medium | `/admin/system-health` |
| **EC-083** | Unassigned cluster region | CAT-06 (Null Values) | `"GLOBAL_DEFAULT"` fallback tag. | **NOT IMPLEMENTED** — there is no region field anywhere in `Subsystem` or `API_ENDPOINTS`. | Low | `/admin/system-health` |
| **EC-084** | Fast automated polling (every 3s) under load | CAT-15 (Lifecycle) | `AbortController` cancels in-flight requests before the next poll. | **NOT IMPLEMENTED** — there is no polling loop of any kind on this page; "Run Health Sweep" is a single manual `setTimeout`-based click handler. | High | `/admin/system-health` |
| **EC-085** | Operator clicks "Trigger Emergency GC" in mock mode | CAT-17 (Mock Data) | Local-state simulation with an explanatory note. | **NOT IMPLEMENTED** — no such control exists on this page; the only action is "Run Health Sweep", which is a different, already-verified feature (see below). | High | `/admin/system-health` |
| **EC-086** | System health view on tablet (768px) | CAT-09 (Tablet) | 2x2 metric grid; sticky-header node table with swipe scroll. | **IMPLEMENTED NOT VERIFIED** — responsive grid classes exist; the node table itself doesn't exist (see EC-081), so "sticky column headers" on it isn't applicable. | Medium | `/admin/system-health` |
| **EC-087** | High-contrast audit on health status indicators | CAT-11 (Dark Mode) | >4.5:1 contrast for healthy/degraded/critical tokens. | **IMPLEMENTED NOT VERIFIED** — `StatusBadge`'s color tokens are shared and used consistently; formal contrast measurement not performed. | High | `/admin/system-health` |
| **EC-088** | Screen reader announces server state change | CAT-12 (Accessibility) | `aria-live` region scoped to severity. | **NOT IMPLEMENTED** — no `aria-live` region exists on this page, and since state never actually changes (EC-079/080/081), there is nothing to announce regardless. | High | `/admin/system-health` |
| **EC-089** | Deep linking to `/admin/system-health?node=worker-01` | CAT-13 (Navigation) | Auto-highlights the specified node. | **NOT IMPLEMENTED** — no query-parameter handling exists on this page, and there is no per-node detail view to open (see EC-081). | Low | `/admin/system-health` |

*Separately confirmed working on this page:* "Run Health Sweep" is a real, reachable click handler with a genuine `isScanning` loading state (`LoadingState variant="cards"` for 1200ms) and a corrected local-preview disclosure toast — **VERIFIED** — but it always concludes with the same static, always-healthy result regardless of anything, which is exactly what EC-079/080/081/084 above are flagging as not implemented.

---

### Section 3.9: Audit & Security Logs (`/admin/audit-logs`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-090** | Zero audit logs in current retention window | CAT-01 (Empty States) | `EmptyState` with clear-filters CTA. | **IMPLEMENTED NOT VERIFIED** — the zero-length branch exists via `DataTable`'s dynamic props; the base 7-row mock array can't be emptied through the UI (no delete action). | Low | `/admin/audit-logs` |
| **EC-091** | Over 100,000 security audit events in storage | CAT-02 (Large Data) | Server-side pagination and indexed search. | **NOT IMPLEMENTED** — `DataTable` on this page is used with no `pagination` prop at all; every filtered row renders unpaginated, and there is no server to page against. | High | `/admin/audit-logs` |
| **EC-092** | Malformed JSON in `rawPayload` field | CAT-05 (Invalid Data) | Fallback `"Unparseable Raw Payload"` box, no crash. | **NOT IMPLEMENTED** — the payload viewer calls `JSON.stringify(activeLog.rawPayload, null, 2)` directly with no try/catch; a payload containing a circular reference would throw uncaught. Not currently reachable since mock payloads are always well-formed plain objects. | High | `/admin/audit-logs` |
| **EC-093** | Event actor is missing or unauthenticated | CAT-06 (Null Values) | `"Anonymous / System"` actor tag. | **VERIFIED** — seeded directly in mock data (`aud-906`, `actorName: "Anonymous / System"`, `actorRole: "Unauthenticated"`) and renders correctly, confirmed in source. | Medium | `/admin/audit-logs` |
| **EC-094** | Deeply nested raw telemetry JSON (10+ levels) | CAT-07 (Long Text) | Formatted, collapsible JSON viewer. | **IMPLEMENTED NOT VERIFIED** — the viewer is a plain `<pre>{JSON.stringify(...)}</pre>` with indentation but no collapsible-subtree interaction; mock payloads are nested 2-3 levels, not 10+. | Low | `/admin/audit-logs` |
| **EC-095** | Multi-line diagnostic stack trace (2,000+ words) | CAT-07 (Long Text) | Scrollable box with copy-to-clipboard. | **NOT IMPLEMENTED** — the `<pre>` block has `overflow-x-auto` (horizontal only) and no copy-to-clipboard control; a real stack trace is seeded (`aud-907`) but the box does not vertically scroll or offer copy. | Medium | `/admin/audit-logs` |
| **EC-096** | Critical HMAC seat forgery attack event | CAT-11 (Dark Mode) | High-visibility crimson security badge. | **VERIFIED** — `StatusBadge`'s `critical` status maps to rose background/text/border with an animated dot, confirmed in source and seeded on `aud-903`. | Critical | `/admin/audit-logs` |
| **EC-097** | Filter by severity="Critical" and action="USER.BAN" | CAT-01 (Empty States) | Accurate real-time filtering; empty state on 0 matches. | **PARTIALLY covered — VERIFIED for severity alone, NOT IMPLEMENTED for action code as a filter.** Severity filtering and its empty state are confirmed via test; there is no separate "action code" filter control on this page — action code is only reachable via free-text search. | Low | `/admin/audit-logs` |
| **EC-098** | Mobile responsive detail inspection on 375px phone | CAT-08 (Mobile) | JSON viewer scrolls horizontally without breaking drawer layout. | **IMPLEMENTED NOT VERIFIED** — `overflow-x-auto` is present on the payload box; not captured at 375px this pass. | High | `/admin/audit-logs` |
| **EC-099** | Export security logs to JSON | CAT-17 (Mock Data) | Formatted `.json` file with a preview watermark. | **NOT IMPLEMENTED** — the only export control on this page is "Export CSV", and it produces no file at all (confirmed: the toast explicitly states "no file was downloaded"). No JSON export exists. | Low | `/admin/audit-logs` |
| **EC-100** | Screen reader navigation of audit events | CAT-12 (Accessibility) | Accessible label per row summarizing timestamp/severity/actor. | **NOT IMPLEMENTED** — same root cause as EC-023/EC-067: `DataTable` rows carry no accessible name or role beyond the default `<tr>`. | High | `/admin/audit-logs` |

---

### Section 3.10: Global Settings, Component Showcase & Platform Integrity (`/admin/settings` & `/admin/component-library`)

| ID | Scenario | Category | Expected Behavior | Status | Risk Level | Route |
|---|---|---|---|---|---|---|
| **EC-101** | Operator updates global turn grace period to 0ms | CAT-05 (Invalid Data) | Validation prevents 0ms; minimum 5,000ms enforced. | **NOT IMPLEMENTED** — the turn-timer `<input type="number">` has no `min` attribute or validation logic of any kind. | High | `/admin/settings` |
| **EC-102** | Operator changes voice chat codec to experimental mode | CAT-17 (Mock Data) | Local-preview save with disclosure banner. | **NOT IMPLEMENTED** — no "voice chat codec" field exists anywhere in Settings' 8 tabs; this scenario describes a control that was never built. | Medium | `/admin/settings` |
| **EC-103** | Reset settings to factory defaults | CAT-15 (Lifecycle) | Reverts to `DEFAULT_*_OPTIONS` with confirmation. | **NOT IMPLEMENTED** — no reset control or default-values constant exists anywhere on this page. | Medium | `/admin/settings` |
| **EC-104** | Component showcase viewed on 320px ultra-small screen | CAT-08 (Mobile) | All 12 components wrap gracefully with no horizontal overflow. | **IMPLEMENTED NOT VERIFIED** — the page loads and renders correctly at desktop width, confirmed live; 320px specifically was not captured this pass. | High | `/admin/component-library` |
| **EC-105** | Component showcase interactive drawer sandbox testing | CAT-15 (Lifecycle) | Drawer width variants (`sm`/`md`/`lg`/`xl`) resize responsively and close on Escape. | **VERIFIED** — `DetailDrawer` genuinely accepts a `width` prop with all four named variants, and Escape-to-close is backed by a real `keydown` listener, confirmed in source. | Low | `/admin/component-library` |
| **EC-106** | Operator session JWT expires while editing settings (401) | CAT-16 (Session Expiry) | Mutation buttons disabled; re-auth dialog, form state preserved. | **NOT IMPLEMENTED** — no session-expiry detection exists anywhere past the initial `AdminRoute` mount check; a session expiring mid-session would not be caught until the next full navigation. | Critical | `/admin/settings` |
| **EC-107** | Unauthenticated guest navigates directly to `/admin/settings` | CAT-16 (Auth Guard) | `AdminRoute` redirects to home or an access-denied gate. | **VERIFIED** — repeatedly reproduced live across this and prior audit passes: an unauthenticated session hitting any `/admin/*` route is redirected to `/login?redirectTo=...`. | Critical | `/admin/settings` |
| **EC-108** | Browser back/forward navigation between admin routes | CAT-13 (Navigation) | Sidebar indicator updates synchronously; scroll restores. | **IMPLEMENTED NOT VERIFIED** — standard React Router behavior with no custom interception found; not explicitly exercised this pass. | Low | `/admin/*` |
| **EC-109** | Opening admin console in 3 separate browser tabs | CAT-14 (Multiple Tabs) | Auth state and theme synchronize across tabs. | **PLANNED** — the account flag lives in `localStorage`, which a `storage` event listener *could* pick up cross-tab, but no such listener exists in the auth store today; this is plausible future work, not a currently broken feature. | Medium | `/admin/*` |
| **EC-110** | Hard page refresh (Ctrl+F5) on `/admin/users` | CAT-15 (Lifecycle) | SPA routing serves the bundle without a 404; table restores. | **VERIFIED (routing), NOT VERIFIED (the <300ms timing claim)** — confirmed the route re-resolves correctly on a cold load via `AdminRoute`'s own mount-time check (repeatedly reproduced across this engagement); restoration time was not measured. | High | `/admin/users` |

---

## 4. Failure Mode and Effects Analysis (FMEA) Matrix

This section remains a risk-planning tool, not a verification record — it is not re-graded per row here. Two entries are worth flagging against what's now confirmed:

- **"Silent Mutation Assumption"** — its listed prevention strategy (`MockDataBanner` + disclosure toasts) is the single best-verified part of this entire console (§3, CAT-17 rows above are almost uniformly VERIFIED).
- **"Uncaught Null Reference"** — its listed prevention strategy ("comprehensive TypeScript interfaces + null-coalescing + fallback generators") describes a posture the codebase does not currently have; see the many CAT-04/CAT-06 **NOT IMPLEMENTED** rows above. TypeScript interfaces exist, but they describe the always-well-formed mock data, not defensive parsing of untrusted input — there is nothing to enforce them against once real data arrives.

| Failure Mode | Root Cause | Severity | Probability | Prevention / Recovery Strategy |
|---|---|---|---|---|
| **Uncaught Null Reference** | Missing API properties in payload | **High (8/10)** | Medium | Comprehensive TypeScript interfaces + null-coalescing (`??`) + fallback generators. |
| **Silent Mutation Assumption** | Operator confuses mock preview for production change | **Critical (9/10)** | High | Persistent `MockDataBanner` + explicit preview disclosure toasts on every interactive action. |
| **Mobile Drawer Clipping** | Fixed pixel widths on small screens | **Medium (5/10)** | Low | Responsive drawer widths (`w-full sm:max-w-md lg:max-w-xl`) + touch swipe dismissals. |
| **Secret Leak in Telemetry** | Operational keys logged in raw audit JSON | **Critical (10/10)** | Low | Automated `productionHardening` redaction rules (`[REDACTED]`) + CI leak validation scripts. |
| **Memory Leak in Polling** | Uncancelled timers on route change | **High (7/10)** | Medium | `AbortController` in `useEffect` cleanup return functions + singletons in `CleanupRegistry`. |

---

## 5. Future Real-Data Integration Runbook

When transitioning the BHALYAM Admin Console from mock datasets to live database/API services (e.g. Supabase Postgres or dedicated operational backend):

1. **Verify Backend Contract Alignment:** Ensure backend endpoint schemas match the shared interfaces in `@shared/types` and `UserRow` / `MatchItem` / `AuditLogEntry`.
2. **Implement Typed API Client:** Replace `MOCK_*` constants with authenticated calls to `operationalFetch` incorporating cryptographic token headers.
3. **Preserve Empty & Error States:** Ensure that network errors or zero-data queries continue utilizing `EmptyState` and `LoadingState` rather than blank white screens — and build the CAT-03 failure-handling paths this document now marks **NOT IMPLEMENTED** at the same time, since none of them exist to "preserve" yet.
4. **Automate Edge Case Verification:** Run the Vitest test suites (`adminDataInteraction.test.tsx`, `emptyAndLoadingStates.test.tsx`, `adminComponentFeatures.test.tsx`, `componentLibraryShowcase.test.tsx`) against live staging endpoints, and update every **IMPLEMENTED NOT VERIFIED** / **NOT IMPLEMENTED** row in §3 as real coverage lands — do not bulk-flip statuses without re-verifying each one individually.

---

*This document is maintained under BHALYAM AI Engineering Operating System Governance. Statuses above were assigned by an independent audit against the source tree, `tsc`, `vitest`, `vite build`, and live browser reproduction at the time of writing — they will drift out of date as the code changes and must be re-verified, not assumed to still hold.*
