# BHALYAM Responsive Audit Report

**Generated 2026-08-18** · real Chromium (Playwright) · production build · measured, not inspected
**Governance:** `docs/ai/ui-ux-standards.md` §4, `code-review-checklist.md` §3, platform Rule 3

Evidence: `docs/remediation/evidence/responsive-BEFORE.json` → `responsive-AFTER.json`
Runner: `client/scripts/mobile-layout/runner.mjs` · `npm run check:mobile-layout`

---

## 1. Result

| | Before | After |
|---|---|---|
| **CRITICAL** | 0 | **0** |
| **HIGH** | **67** | **0** |
| MEDIUM | 47 | 40 |
| Pages inspected | 88 | 88 |
| Controls measured | 1,697 | 1,688 |

`npm run check:mobile-layout` → **exit 0**. The gate is now **blocking** in CI
(it was `continue-on-error` while the 67 defects stood).

**Viewports — the full 9-width matrix required by `code-review-checklist.md` §3,
plus two shapes that fail differently from any width:**

320×568 · 360×800 · 375×667 · 390×844 · 412×915 · 430×932 · **768×1024** ·
**1024×1366** · **1440×900** · 667×375 landscape · 390×540 keyboard-open

The last two matter independently: landscape is a viewport with almost no
vertical room, and 390×540 approximates an open software keyboard on a 390×844
phone — the state the chat composer is used in.

---

## 2. Defects found and fixed

### 2.1 Sign-in impossible in landscape — the release blocker

| | |
|---|---|
| **Root cause** | `<main>` used `flex-1 flex items-center justify-center min-h-0`. Centering a flex child **taller than its line** overflows in *both* directions, and the half above the line is unreachable — flexbox provides no scroll back to it. |
| **File** | `client/src/components/auth/AuthShell.tsx:92` |
| **Impact** | At 667×375 the "Sign In", "Continue as Guest" and "Continue with Google" buttons sat at **y = −25** with `document.scrollHeight === innerHeight`. **A user could not sign in at all on a phone held sideways.** Affects `/login` and `/signup`. |
| **Fix applied** | `items-center` on the parent → `my-auto` on the child, plus `overflow-y-auto`. `my-auto` centres while there is room and collapses to zero when there is not, so content stays inside the scrollable box. |
| **Verification** | Direct Playwright probe before: button rect `y:-25`, `scrollHeight 375 === innerHeight`, real click rejected — *"header intercepts pointer events"*. After: 0 unreachable controls at that viewport. |
| **Status** | **VERIFIED** |

### 2.2 Category tabs unreachable at tablet widths

| | |
|---|---|
| **Root cause** | The segmented track was `overflow-x-auto sm:overflow-visible`, assuming the six segments always fit from 640px up. They do not — the labels are `whitespace-nowrap`, giving ~814px of intrinsic width. |
| **File** | `client/src/components/bhalyam/CategoryFilter.tsx:238` |
| **Impact** | Between ~640px and ~1000px the track overflowed with **no way to scroll it**. Measured at 768, 1024 and 667×375: "Classroom" at x=709–814 outside a 768px viewport. Affects Home and Settings. |
| **Fix applied** | `overflow-x-auto` at every width (it shows no scrollbar and changes nothing when content fits), plus `touch-pan-x` per `ui-ux-standards.md` §4.4. |
| **Verification** | `control-clipped` findings: **6 → 0**. |
| **Status** | **VERIFIED** |

### 2.3 Touch targets below the WCAG 2.2 AA floor (24×24) — 60 nodes

| Control | File | Measured | Fix | Status |
|---|---|---|---|---|
| "Back to Lounge" (5 screens) | `pages/{Leaderboard,Profile,SocialHub,Tournaments,DesignSystemCatalog}Page.tsx` | 110.2 × **16** | `min-h-[44px] py-2 pr-3` | VERIFIED |
| "Dismiss starter missions" | `features/onboarding/GettingStartedCard.tsx:58` | **19.4** × 28 | `min-h-[44px] min-w-[44px]` | VERIFIED |
| Quick links (Explore, Play Now, Customize, Social Hub, Tournaments) | `features/onboarding/GettingStartedCard.tsx:120` | ~85 × **24** | `min-h-[44px]` | VERIFIED |
| Footer/quick text links (Rankings, Tournaments & Seasons, View Profile & History, Global Leaderboards) | `pages/{Leaderboard,Profile,SocialHub,Tournaments}Page.tsx` | ~90 × **16** | `min-h-[24px] inline-flex items-center` | VERIFIED |
| "Back to Home" | `components/layout/AppSidebar.tsx:138` | 91.1 × **16.5** | `min-h-[24px]` | VERIFIED |
| Password reveal | `pages/auth/{Login,SignUp}Page.tsx` | **16 × 16** | 44×44 hitbox, icon unmoved | VERIFIED |
| "Forgot password?", "Create an account" | `pages/auth/LoginPage.tsx` | ~110 × **17** | `min-h-[24px]` | VERIFIED |
| Trust badges (Secure, Lightweight, Made for You) | `pages/auth/LoginPage.tsx:274` | ~85 × **16.5** | `min-h-[24px]` | VERIFIED |

### 2.4 Touch targets below the product's 44px thumb bar — partially fixed

| Control | File | Before | After | Status |
|---|---|---|---|---|
| Page tab strips (Competitive Leaderboards, Daily & Weekly Quests, Active Tournaments, Season Pass) | `pages/{Leaderboard,Tournaments}Page.tsx` | 32px tall | 44px | VERIFIED |
| Leaderboard metric pills (Rating, Wins, Win Rate, Matches, Level) | `features/rankings/LeaderboardTable.tsx:58` | 28–30px | 44px | VERIFIED |
| Challenge filter pills | `features/rankings/ChallengesBoard.tsx:33` | 28px | 44px | VERIFIED |

---

## 3. A new DLS token, so the rule stops living only in a document

`ui-ux-standards.md` §4.1 has always required 44×44. It was missed 107 times
because the rule lived in prose while the code was written by hand.

`client/src/design-system/dls/Spacing.ts` now carries it:

```ts
touchTarget:       "min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
touchTargetInline: "min-h-[24px] inline-flex items-center"   // text inside a sentence
touchTargetIcon:   "min-h-[44px] min-w-[44px] inline-flex items-center justify-center shrink-0"
```

Per platform Rule 4 (no ad-hoc styling), and enforced by a gate that measures
the **rendered rectangle** rather than trusting the class list.

---

## 4. Three false positives removed before any of this was reported

The first run produced **149** findings. **61 were wrong.** A detector that
cries wolf gets switched off — which is how the deleted `mobileCertification`
suite came to be trusted in the first place.

| False positive | Why it was wrong | Fix to the detector |
|---|---|---|
| 5/page "clipped" carousel items | The game-category strip is a horizontal scroller; items past the edge are reached by swiping | Walk ancestors for a scrolling `overflow-x`; off-screen ≠ unreachable |
| 14 "untappable" header controls | `document.elementFromPoint` reported a sibling backdrop layer that a person taps straight through | Replaced the heuristic with Playwright's own actionability check |
| Every page's controls "unreachable" | A first-run onboarding modal was correctly making the page behind it inert — confirmed by direct probe (`<div class="fixed inset-0 z-50 … bg-black/80">` intercepts) | Detect a full-screen overlay and scope reachability to inside it; seed `bhalyam.onboarding.state` |
| 11 "too small" checkboxes | A native 16×16 checkbox with a 44px `<label htmlFor>` — the label *is* the target | Measure the union of input and associated label; WCAG 2.5.8 sizes the target, not the widget |

**149 → 88.** Every remaining finding traces to a measured rectangle.

---

## 5. Remaining 40 MEDIUM findings — documented, not blocking

All are ≥24px (**WCAG 2.2 AA 2.5.8 pass**) and <44px (product thumb bar miss):

| Control | Size | Occurrences |
|---|---|---|
| Inline text links (Global Leaderboards, Tournaments, Rankings, Forgot password?, Create an account) | 24px | 8 each |
| Language selector "English" | 112 × 32.8 | 8 |
| Game filter chips (All Games, ludo, rummy, uno) | 26px | 7 each |
| Social hub tabs (Friends List, Party Headquarters) | 32px | 7 each |
| "Play UNO Now" | 310 × 42 | 2 |

The 24px inline links are **deliberate** — `touchTargetInline` exists because a
44px box inside a sentence breaks the line box, and WCAG's own inline exception
covers it. The 26–32px chips are genuine thumb-bar misses and are the next
increment of work.

The **1440px desktop viewport is excluded from the 44px bar** by design:
`ui-ux-standards.md` §4.1 scopes it to `<768px`, and a mouse pointer is not a
thumb. WCAG's 24px floor still applies at every width, which is precisely why
the two thresholds are reported separately.

---

## 6. Surfaces NOT audited

| Surface | Status | Why |
|---|---|---|
| Room / gameplay screens | **NOT AUDITED** | The runner supports `--server=<port>` (creates a real room with a bot, navigates to `/room/:code`); no game server was running. Report records `"roomScreenChecked": false, "NOT RUN — this is not a pass."` |
| Chat composer | **NOT AUDITED** | Inside the Room screen |
| Room creation / join flows | **NOT AUDITED** | Modal states, not routes |
| Dialogs, drawers, popovers | **NOT AUDITED** | Requires driving interaction states |
| DriverJS onboarding flows | **NOT AUDITED** | Same |
| Admin dashboard content | **PARTIALLY** | `/admin` is audited, but it renders the gated state — the console behind it needs an operational credential |
| Scroll traps | **NOT VERIFIED** | Horizontal overflow and clipping are measured; a scroll container that captures and never releases is not |
| Mobile keyboard behaviour | **PARTIALLY** | 390×540 approximates keyboard-open geometry; real IME/inset behaviour needs a device |

To close the first two:

```bash
npm --prefix server run dev &
npm run check:mobile-layout -- --server=4000
```

---

## 7. Status summary

| Item | Status |
|---|---|
| 9-width matrix + landscape + keyboard-open, 8 routes | **VERIFIED** |
| Horizontal overflow | **VERIFIED** (0) |
| Clipped controls | **VERIFIED** (0) |
| Unreachable controls | **VERIFIED** (0) |
| Blank renders | **VERIFIED** (0) |
| Touch targets ≥ 24px (WCAG 2.2 AA) | **VERIFIED** (0 failures) |
| Touch targets ≥ 44px (product bar) | **PARTIALLY VERIFIED** — 40 known misses, listed |
| Room screen, chat composer, dialogs, DriverJS | **NOT AUDITED** |
| Scroll traps | **NOT VERIFIED** |
