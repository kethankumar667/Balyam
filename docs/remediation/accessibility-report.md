# BHALYAM Accessibility Report

**Generated 2026-08-18** · axe-core 4.10 in real Chromium (Playwright) · production build
**Standard:** WCAG 2.1 A + AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)
**Governance:** `docs/ai/accessibility-standards.md`, platform Rule 6, code-review-checklist §2

Machine evidence: `docs/remediation/evidence/accessibility-AFTER.json`
Runner: `client/scripts/accessibility/runner.mjs` · `npm run check:a11y-rendered`

---

## 1. Result

| Metric | Before | After | Status |
|---|---|---|---|
| axe violations (critical) | **2** | **0** | VERIFIED |
| axe violations (serious) | **24** | **0** | VERIFIED |
| Contrast failures | **13** | **0** | VERIFIED (see `contrast-report.md`) |
| Focus-indicator gaps | **2** | **0** | VERIFIED |
| Pages audited | — | 22 (11 routes × 2 themes) | — |
| Keyboard stops exercised | — | 368 | — |

`npm run check:a11y-rendered` → **exit 0**.

**Coverage:** Home, Games, Leaderboard, Tournaments, Social hub, Settings, Sign in,
Sign up, About, Privacy, Admin (gated) — each in **dark and light**, at 390×844.

---

## 2. What this replaced

`scripts/quality-gates/accessibilityAudit.mjs` greps JSX. It reported
*"Scanned 334 components. Found 0 critical"* and was named **"WCAG Accessibility
Standards (A11y)"** in CI. It never renders, so it cannot resolve a colour
against the background actually painted behind it, cannot follow focus order,
and cannot tell a decorative `<div>` from an operable control.

It has been **renamed** to *"Accessibility Source Scan (not a verdict)"* and
kept — it does find missing `alt` text usefully. The verdict now comes from
Gate 6b, which renders.

**jsdom was considered and rejected**: it implements the DOM but not layout or
paint, so every rect is zero and every colour unresolvable.

---

## 3. Violations found and fixed

### 3.1 `label` — CRITICAL — 2 nodes

| | |
|---|---|
| **Root cause** | A `<label>` existed above the date-of-birth field but had no `htmlFor`, and the `<input>` had no `id`. Visual adjacency is not a programmatic association. |
| **File** | `client/src/pages/auth/SignUpPage.tsx:396` |
| **Impact** | A screen reader announced *"date, edit"* with no indication of which date. Sign-up is unusable non-visually. WCAG 1.3.1, 4.1.2. |
| **Fix applied** | `htmlFor="signup-dob"` + `id="signup-dob"`. |
| **Verification** | axe re-run: 0 `label` violations. |
| **Status** | **VERIFIED** |

### 3.2 `link-name` — SERIOUS — 16 nodes (every route, both themes)

| | |
|---|---|
| **Root cause** | The header logo link wrapped `<BhalyamLogo decorative />` (which sets `aria-hidden`) plus a wordmark that is `hidden sm:flex`. Below 640px the link had **no accessible name at all**. |
| **File** | `client/src/components/layout/AppHeader.tsx:90` |
| **Impact** | The primary "home" affordance announced as an empty link on every page, on phones. WCAG 2.4.4, 4.1.2. |
| **Fix applied** | Unconditional `aria-label="BHALYAM — go to the lounge home"`, so the name cannot depend on a breakpoint. |
| **Verification** | axe re-run: 0 `link-name` violations across all 22 page/theme combos. |
| **Status** | **VERIFIED** |

### 3.3 `list` + `listitem` — SERIOUS — 28 nodes

| | |
|---|---|
| **Root cause** | `RevealOnScroll` was correctly `as="ul"`, but `RevealItem` always rendered a `motion.div`, so the DOM was `ul > div > li`. A `<li>` whose parent is a `div` is an orphan. |
| **Files** | `client/src/components/RevealOnScroll.tsx:62`, `client/src/pages/BhalyamHome.tsx:521` |
| **Impact** | Game tiles announced as list items belonging to no list; the item count that makes a list navigable was lost. WCAG 1.3.1. |
| **Fix applied** | `RevealItem` accepts `as="div" \| "li"`; the home grid passes `as="li"` and the inner `<li>` is gone. The wrapper carries the stagger variants, so it must *be* the item. |
| **Verification** | axe re-run: 0 `list` / `listitem` violations. |
| **Status** | **VERIFIED** |

### 3.4 Focus indicator missing — 2 nodes

| | |
|---|---|
| **Root cause** | Two layers. (a) The date input used `focus:outline-none focus:ring-2`, and `outline-none` suppressed the app's global `*:focus-visible { box-shadow: var(--ring) }` while the `ring` replacement did not paint on that control. (b) The **detector** measured one frame too early: Chromium moves focus into a date input's shadow DOM, so the host had not yet matched `:focus`. |
| **Files** | `client/src/pages/auth/SignUpPage.tsx:418`, `client/scripts/accessibility/runner.mjs` |
| **Impact** | A keyboard user could not see where focus was on a required sign-up field. WCAG 2.4.7. |
| **Fix applied** | Explicit `focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#F4C430]` (`:focus`, not `:focus-visible` — Chromium's date host does not match the latter). Detector now waits 60ms for focus to settle. |
| **Verification** | Direct probe: focused, the control computes `outline: rgb(74,37,8) solid 3px`. Full re-run: 0 focus gaps over 368 stops. |
| **Status** | **VERIFIED** |

---

## 4. Keyboard navigation

| Check | Method | Result |
|---|---|---|
| Every control reachable by `Tab` | 368 real `Tab` presses across 22 page/theme combos | **VERIFIED** — no dead stops |
| Visible focus indicator at every stop | computed `outline-style`/`outline-width`/`box-shadow` after focus settles | **VERIFIED** — 0 gaps |
| Roving tabindex on the category filter | source review + audit (one tab stop, arrows move within) | **PARTIALLY VERIFIED** — structure confirmed, arrow behaviour not automated |
| `Shift+Tab` reverse order | — | **NOT VERIFIED** |
| `Escape` dismisses dialogs | — | **NOT VERIFIED** |
| Focus trapped in modals | — | **NOT VERIFIED** |
| Focus restored to trigger on close | — | **NOT VERIFIED** |

The last four are **real gaps against the brief** and against
`accessibility-standards.md` §1.3. They need the modal states driven (open the
welcome dialog, the party invitation, the reward reveal, the shared-history
sheet) rather than only routes visited. The harness can do it; it was not
written. **Not claimed as passing.**

---

## 5. What axe cannot establish, and is therefore not claimed

axe covers a large, well-defined subset of WCAG. It does **not** judge:

- whether a label is **meaningful** (only that one exists);
- whether **focus order** is logical (only that stops are reachable);
- whether an `aria-live` announcement is **useful** or merely present;
- **screen-reader output** — no NVDA/JAWS/VoiceOver pass was run;
- **200% zoom** reflow (`accessibility-standards.md` §3.3) — not verified;
- **`prefers-reduced-motion`** honouring — a global rule exists in
  `index.css:361` but was not exercised;
- **non-colour state signalling** (§3.1) — not verified.

---

## 6. Scope not audited

| Surface | Status | Why |
|---|---|---|
| Room / gameplay screens | **NOT AUDITED** | Needs a live game server and a seated room; the harness supports it (`--server`) but it was not run |
| Chat composer | **NOT AUDITED** | Inside the Room screen |
| Dialogs, drawers, popovers | **NOT AUDITED** | Requires driving interaction states, not just routes |
| DriverJS onboarding flows | **NOT AUDITED** | Same |
| Tablet/desktop breakpoints | **NOT AUDITED** for a11y | The a11y pass runs at 390×844 only; the *layout* pass covers 11 viewports |

These are listed as gaps rather than counted as passes.

---

## 7. Status summary

| Item | Status |
|---|---|
| axe-core WCAG 2.1 AA violations on 11 routes × 2 themes | **VERIFIED** (0) |
| Contrast across both themes | **VERIFIED** (0) — see `contrast-report.md` |
| Keyboard reachability + focus indicators | **VERIFIED** (368 stops, 0 gaps) |
| Focus trapping, Escape, focus restoration | **NOT VERIFIED** |
| Screen-reader semantics quality | **NOT VERIFIED** |
| 200% zoom, reduced motion | **NOT VERIFIED** |
| Room screen, dialogs, DriverJS | **NOT AUDITED** |
