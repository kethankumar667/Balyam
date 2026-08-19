# BHALYAM Contrast Report

**Generated 2026-08-18** · ratios **computed by axe-core** from resolved colours in real Chromium
**Requirement:** 4.5:1 normal text · 3:1 large text (≥18pt, or ≥14pt bold) and UI borders
**Governance:** `docs/ai/accessibility-standards.md` §1.1, platform Rule 6, code-review-checklist §2

Machine evidence: `docs/remediation/evidence/accessibility-AFTER.json`

---

## 1. Result

| | Before | After |
|---|---|---|
| Contrast failures (nodes) | **13** | **0** |
| Distinct failing colour pairs | **9** | **0** |
| Themes audited | dark + light | dark + light |
| Routes audited | 11 | 11 |

`npm run check:a11y-rendered` → **exit 0**.

---

## 2. The five "unmeasured" findings are now measured

The prior audit carried five contrast findings it could not measure, and the
remediation brief was explicit that they must **not** be suppressed before
verification. They were unmeasurable from source for a real reason:
`text-stone-400` on `bg-stone-900/80` has **no ratio** until something
composites the 80% alpha over whatever is actually painted behind it. Source
scanning cannot do that. A rendering engine can.

**They were never suppressed.** `scripts/quality-gates/accessibilityAudit.mjs`
was not modified by this work — no rule disabled, no waiver, no allowlist. It
was renamed in CI to stop it *claiming* a verdict it cannot reach, and the
verdict moved to axe-core against the rendered DOM.

All nine measured pairs are below. Every one is now fixed.

---

## 3. Failures found, measured, and fixed

Each replacement was **computed**, not guessed: the same hue, darkened (or
lightened, on dark grounds) by the minimum step that reaches 4.5:1 against the
background axe resolved.

### 3.1 White on brand amber — the worst in the app

| | |
|---|---|
| **Component** | Game-category filter chip, active state |
| **File** | `client/src/components/games/FilterBar.tsx:46` |
| **Measured** | `#ffffff` on `#f59e0b` (amber-500), 12px bold → **2.14:1** |
| **Required** | 4.5:1 |
| **Severity** | **Serious** — the selected category is the least readable text on the page |
| **Root cause** | The DLS pairs amber-500 with `text-zinc-950` in 35 places, including `dls/Buttons.tsx:48`. This chip was the outlier and used `text-white`. |
| **Fix** | `text-white` → `text-zinc-950` → **≈10:1** |
| **Status** | **VERIFIED** |

### 3.2 `--text-mute` token, both themes

| | |
|---|---|
| **Component** | `text-ink-mute` — result counts, meta labels; a shared token |
| **File** | `client/src/index.css:172` (light), `:227` (dark) |
| **Measured** | dark `#64748b` on `#070b14` → **4.14:1**; light `#64748b` on `#faf3e0` → **4.30:1** |
| **Root cause** | One slate value used on both a near-black and a cream ground. It cannot satisfy both. |
| **Fix** | dark → `#7C8BA1` (**5.68:1**, lightened); light → `#5A6779` (**5.19:1**, darkened). Same hue. |
| **Note** | Fixed **at the token**, so every consumer inherits it — the DLS-correct fix under platform Rule 4 rather than patching call sites. |
| **Status** | **VERIFIED** |

### 3.3 Brand orange and amber on cream — six instances

| Component | File | Measured | Fix | After |
|---|---|---|---|---|
| Home / Settings status badge | `pages/BhalyamHome.tsx:489` | `#EA5A1F` on `#FFF4E4` → **3.22:1** | `#C04A19` | **4.56:1** |
| Privacy "last updated" date | `pages/PrivacyPolicyPage.tsx:265` | `#E85D04` on `#FFF8E7` → **3.30:1** | `#C14D03` | **4.58:1** |
| About — founder subtitle | `pages/AboutPage.tsx:198` | `#E85D04` on `#FFFBF0` → **3.38:1** | `#C54F03` | **4.52:1** |
| About — section eyebrow | `pages/AboutPage.tsx:210` | `#D97706` (amber-600) on `#FFFDF8` → **3.13:1** | `amber-800` | **≈5.6:1** |
| Games page tagline | `pages/GamesPage.tsx:104` | `#B45309` (amber-700) on `#F9E6C0` → **4.09:1** | `amber-800` | **≈5.4:1** |
| Sign-up field badge | `pages/auth/SignUpPage.tsx:332` | `#8C6D4F` on `#FAF2DF` → **4.26:1** | `#86694C` | **4.55:1** |
| Sign-in muted action | `pages/auth/LoginPage.tsx:77` | `#9C7E63` on `#FFF5E0` → **3.48:1** | `#866C55` | **4.52:1** |

All are **hue-preserving**. None is a redesign: the brand orange stays orange,
one step deeper so the text can be read.

**Two of these were borderline (4.09 and 4.26) and still failed.** That is worth
noting — they are exactly the values a human eye would have approved and a
source scan would have missed.

---

## 4. A regression I introduced, and caught

Fixing the Privacy date, I wrote `text-[#C14D03] dark:text-amber-400`. The next
audit run reported a **new** failure: `#fbbf24` on `#fff8e7` → **1.57:1**.

The Privacy page keeps its cream surface in *both* themes. Flipping the ink to
amber without the panel flipping put light text on a light panel — worse than
the original defect.

Dark mode is a **two-part** change: the panel darkens **and** the ink lightens.
Doing one half alone is the bug. The `dark:` variant was removed and a comment
left at the site so the next person does not repeat it. Re-audit: 0 failures.

This is also the strongest argument for the harness: the defect existed for one
build and was caught by measurement, not review.

---

## 5. States audited

| State | Method | Result |
|---|---|---|
| Default text, light theme | axe on rendered DOM | **VERIFIED** — 0 |
| Default text, dark theme | axe on rendered DOM | **VERIFIED** — 0 |
| Disabled controls | axe (disabled text is exempt under 1.4.3, still inspected) | **VERIFIED** — 0 |
| Focus state | focus ring measured separately (`accessibility-report.md` §3.4) | **VERIFIED** |
| Hover state | **NOT VERIFIED** — hover colours are not applied in a static audit pass |
| Error / success / warning states | **NOT VERIFIED** — requires driving forms into those states |

Hover and validation-state contrast are **not claimed**. Several fixed tokens
have `hover:` pairs (e.g. `hover:text-[#5C3717]`) that were not measured because
the audit never hovered. That is a real remaining gap.

---

## 6. Method, so the numbers are reproducible

1. `npm --prefix client run build` — the **production** bundle, so purged CSS
   and minified values are what gets measured.
2. Served from `dist/`; Chromium at 390×844; `colorScheme` and
   `localStorage["bhalyam.theme"]` both set per theme.
3. `axe.run(document, { runOnly: wcag2a|wcag2aa|wcag21a|wcag21aa })`.
4. Ratios and resolved foreground/background hexes are taken from axe's own
   `failureSummary` — not recomputed from source tokens.
5. Replacement values computed by darkening/lightening the original RGB toward
   the minimum that reaches 4.5:1, then re-audited.

---

## 7. Status summary

| Item | Status |
|---|---|
| Light-theme text contrast, 11 routes | **VERIFIED** (0 failures) |
| Dark-theme text contrast, 11 routes | **VERIFIED** (0 failures) |
| The five previously unmeasured findings | **VERIFIED** — measured, fixed, none suppressed |
| Hover-state contrast | **NOT VERIFIED** |
| Error / success / warning state contrast | **NOT VERIFIED** |
| Room / gameplay surfaces | **NOT AUDITED** |
| Dialogs, drawers, popovers | **NOT AUDITED** |
