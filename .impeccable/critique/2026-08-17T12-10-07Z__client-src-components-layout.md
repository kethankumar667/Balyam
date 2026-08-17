---
target: header and side nav colours
total_score: 18
max_score: 36
na_heuristics: 9
p0_count: 2
p1_count: 3
timestamp: 2026-08-17T12-10-07Z
slug: client-src-components-layout
---
Method: dual-agent (A: a6e2b0561021c3928 · B: a34173c9c95ada174)

Scope: colour of the header and side nav — `AppHeader.tsx`, `AppSidebar.tsx`, hosted by `AppLayout.tsx`. Surface mode: **Operate**.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Active nav fill 1.09:1, ink delta 1.23:1, no `aria-current`; hamburger lacks `aria-expanded` |
| 2 | Match System / Real World | 3 | Kraft note, washi tape, "Relive Childhood" are excellent; dark mode drops the metaphor entirely |
| 3 | User Control and Freedom | 2 | Theme persists correctly; mobile drawer has no Escape, no focus trap, no focus return |
| 4 | Consistency and Standards | 1 | Two brand oranges (#FF8F00 vs #E85D04); dark ramp matches neither tokens nor home page; 6 dead classes |
| 5 | Error Prevention | 1 | 5 of 11 nav items navigate somewhere unrelated to their label |
| 6 | Recognition Rather Than Recall | 3 | Icon + label always paired; rail persistent on desktop |
| 7 | Flexibility and Efficiency | 2 | "Search" is a `<Link>`, not a field; no shortcuts; no rail collapse |
| 8 | Aesthetic and Minimalist Design | 2 | 11 ungrouped items with 5 dead ends; `NavGroup` type declared, never used |
| 9 | Error Recovery | n/a | Nav chrome renders no error state and has no failure path that surfaces a message |
| 10 | Help and Documentation | 3 | "Help Center" → `/about`, a real page — one of the few honest destinations |
| **Total** | | **18/36** | **Acceptable (50%) — significant improvements needed** |

Applicable maximum 36; heuristic 9 scored n/a.

## Design Specificity Verdict

**Light mode is authored for BHALYAM. Dark mode could belong to any admin panel. In both, the value structure is broken.**

**LLM assessment (A).** The light chrome's hexes are literally the home page's hexes — `#FAF2DF`, `#ECD9BA`, `#F2E4CB`, `#7A5B3E`, `#2A221B` all appear in `BhalyamHome.tsx`'s top-25 hex census. Chrome and page read as one sheet of paper rather than a shell bolted around a page. The kraft note with washi tape and dotted paper-plane loop is real authored craft.

Dark mode invents a five-step cold blue-black ramp — `#070B14` / `#0A0F1D` / `#0E1527` / `#101728` / `#121A2D` — matching neither the project's own `--surface-0…3` tokens nor `BhalyamHome`'s `#0E1526` (a one-digit drift, the signature of eyeballed rather than referenced hexes). With `text-zinc-300/400` for ink, dark BHALYAM chrome is indistinguishable from a generic dark app. There is no "school bench at night" — just slate.

The structural flaw spans both modes: the palette is deployed at a single tonal step, so nothing that must be *distinguished* clears 3:1. Parchment is intrinsically low-contrast; the correct compensation is a saturated accent carrying state and structure. That compensation was never made.

**Deterministic scan (B).** `detect.mjs` on `client/src/components/layout` returned `[]`, **exit 0 — zero findings**, confirmed with explicit file paths and `--no-config`. Baseline scan of `client/src/components` + `client/src/pages` returned exit 2 with 10 findings (8 `gray-on-color`, 2 `side-tab`), none in the layout directory. No config waivers touch these files.

The detector and the design review disagree completely, and the detector is not wrong — its rule set simply has no contrast-ratio rule. A clean detector run on these files means "no slop patterns matched", not "the colours are fine".

**Browser evidence (B).** Measured on a dev server against current source at 390×844 and 1280×800, light and dark, with `data-theme` + `localStorage` + `colorScheme` all set. Both assessments independently produced identical ratios for every shared pair.

## Overall Impression

The light palette is genuinely well-judged and the theme plumbing is correct. What is missing is *value* — the palette has hue discipline and no tonal ladder, so the header does not separate from the content beneath it, the buttons do not read as buttons, and the active nav item is effectively invisible. Dark mode then abandons the identity the light mode earned. The single biggest opportunity is not new colours; it is giving the existing ones a working range.

## What's Working

1. **The light palette is the incumbent palette, not an approximation.** Five of the chrome's core hexes appear in the home page's top-25 census. This continuity is harder to achieve than it looks, and it was achieved.
2. **Theme plumbing is correct and deliberate.** `darkMode: ["class", '[data-theme="dark"]']` plus `resolveTheme()` stamping the attribute before React mounts means `dark:` variants fire with no flash of wrong palette. `useTheme.ts` documents its refusal of `prefers-color-scheme` on the grounds that the brand *is* cream paper — exactly right for this product.
3. **The 44px touch floor is honoured without exception.** Every header control carries explicit `min-w-[44px] min-h-[44px]`, which matters on the mid-range Android target.

## Priority Issues

### [P0] The active nav state is imperceptible, with no non-visual fallback
`AppSidebar.tsx:81-86`. Light: pill fill `#FFF2D6` on `#FFFDF7` = **1.09:1**; border **1.29:1**; the only real signal is ink shifting `#7A5B3E` → `#B45309`, a **1.23:1** difference between two label colours. Dark fill = **1.26:1**. No `aria-current` in either file.
**Why it matters:** "Where am I" is the primary job of a persistent rail on an Operate surface. It is currently carried by a hue shift invisible to low-vision users, to most colour-vision deficiencies, and to every screen reader. Fails WCAG 1.4.1 and 1.4.11.
**Fix:** Stop signalling state with fill lightness — unreachable in a parchment palette. Add a 4px left rail bar on the active item (`#E85D04` light, `#F59E0B` dark, both ≥3:1) and `aria-current="page"`. Keep the fill as reinforcement, not signal.
**Suggested command:** `/impeccable colorize`

### [P0] Five of eleven nav destinations are wrong; two badges are fabricated
`AppSidebar.tsx:53-58` — Friends, Adda Feed, Leaderboard, Store and Events all call `navigate("/games")`. The `12` badge is a literal. `AppHeader.tsx:113` hardcodes notification `3` while `AppLayout.tsx:68` holds real `notifications` state never passed down. The search bar looks like an input and is a `<Link>`.
**Why it matters:** Five broken promises in a first session is a trust problem, not a polish problem.
**Fix:** Route them correctly or render unbuilt items disabled with a "Coming soon" affordance. Pass the real unread count into `AppHeader`; hide the badge at zero. Make the search bar a real input or visually a button.
**Suggested command:** `/impeccable clarify`

### [P1] Dark mode is generic slate, off-token, and its surface ladder does not function
Five bespoke near-blacks matching neither `--surface-0…3` nor `BhalyamHome`. The ladder is non-functional: chip vs header **1.05:1**, `border-white/10` vs ground **1.38:1**.
**Why it matters:** Anyone who flips the toggle once gets a product with no identity, in which header controls are invisible until you spot the glyph inside them.
**Fix:** Collapse to the token ladder, push chips to `--surface-2 #192233`, raise borders to `white/18`, warm the ramp toward brown-black so the parchment metaphor survives, replace `zinc-*` with `--text-*`.
**Suggested command:** `/impeccable colorize`

### [P1] Four text/indicator pairs fail AA, including the tagline that explains the product
`#FF8F00` tagline **2.24:1** (AppHeader:73); "Lv 12" **2.50:1** (AppHeader:149); `rose-500` badges **3.67:1** in *all four* combinations (AppHeader:113, AppSidebar:93); `ChevronDown` `zinc-400` **2.30:1**.
**Why it matters:** The tagline is the one line telling a first-timer what BHALYAM is, and it is the least legible text in the header — 10.5px, uppercase, 0.2em tracking, the hardest possible setting at low contrast.
**Fix:** Use `bhalyam.gold.ink #7A5C0E` for the light tagline (**6.11:1**; the token's own comment says "gold-on-cream text"); keep `#FF8F00` behind the `isDark` branch where it scores 8.37:1. `rose-500` → `rose-600` (**4.70:1**). Darken light "Lv 12" and the chevron.
**Suggested command:** `/impeccable audit`

### [P1] The focus ring is off-palette and fails 2.4.11 across all light-mode chrome
`index.css:87` — outer emerald `#34d399` scores **1.88:1** on cream; the white separator scores **1.02:1**, i.e. literally invisible. It is also felt-green, a colour from the in-game world with no business on parchment chrome. `border-radius: inherit` draws a square ring around `rounded-2xl` pills, and `overflow-hidden` on AppHeader:44 clips it at the horizontal extremes.
**Why it matters:** Every keyboard user loses their position across the entire header and rail in the default theme.
**Fix:** Theme-aware ring — `#7B2F0E` (**9.12:1** on cream) or `#E85D04` light, `#F59E0B` dark; separator set to the actual ground colour; move `rounded-2xl` onto the focusable element.
**Suggested command:** `/impeccable audit`

### [P2] Six Tailwind v4 class names in a Tailwind v3.4 project, all silently dead
Verified absent from compiled `dist/assets/index-BTFonIAW.css`: `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs`, `scale-102`, `scale-98`, plus the never-valid `py-0.2`. The profile chip's only press feedback is `hover:scale-102 active:scale-98` — both dead — so on touch it is inert while the three buttons beside it respond.
**Suggested command:** `/impeccable polish`

## Corroboration and Disagreement

**Agreement (independent, identical numbers):** tagline 2.24:1 · "Lv 12" 2.50:1 · rose-500 badges 3.67:1 · active nav label 4.53:1 · every border below 3:1 in all four combinations.

**Detector caught what the review could not:** `client/dist/` is **stale** — it lacks `"Switch to Light Mode"` and `"Search games, rooms, friends..."`, both present in current source. Probing that stale bundle showed light backgrounds with dark-mode ink (wordmark **1.17:1**), a textbook dark-mode-two-part failure that **does not reproduce on current source**. Recorded so nobody re-chases it. Also: `<body>` computes to `rgb(15,23,42)` in *both* themes and never flips; the shell paints over it.

**Review caught what the detector could not:** every issue above. The detector returned zero findings on these files because it has no contrast rule — a clean run here means "no slop patterns matched", not "colours are fine".

**False positive:** the `index.css` dark-mode allowlist is scoped `:root[data-theme="dark"] .bhalyam-home`, and `.bhalyam-home` is applied inside `<main>`. The chrome renders outside it, so the allowlist never applies and is not a risk here. The chrome correctly branches on `isDark` in JS instead.

## Persona Red Flags

**Sam (accessibility-dependent)** — worst served. No `aria-current`, so the rail announces eleven undifferentiated links. Light focus indicator effectively invisible (1.88:1 outer, 1.02:1 separator), square-cornered around rounded pills. Mobile drawer (`AppLayout.tsx:142-164`) has no `role="dialog"`, no `aria-modal`, no focus trap, no Escape, no focus return. Hamburger lacks `aria-expanded`/`aria-controls`. `<nav>` and `<aside>` unlabelled.

**Casey (distracted, one-handed mobile)** — all four primary actions sit top-right, the least reachable zone. Mobile header is ~346px of fixed content; below 360px `overflow-hidden` *clips* the settings gear rather than wrapping. Profile chip gives zero press feedback (dead `scale` classes; touch has no hover). Drawer offers no swipe-to-close. The hardcoded `3` nags permanently. `AppLayout.tsx:147` sizes the drawer `w-72` while `AppSidebar` inside is `w-64` — a 32px transparent strip with the shadow cast from the empty edge.

**Jordan (first-timer)** — taps Leaderboard, Store, Events; lands on the games list all three times. Taps the search bar, cannot type. Sees a "12" that means nothing. The one line meant to explain the product is the hardest thing to read at 2.24:1.

## Minor Observations

- `onOpenSettings` destructured and unused in **both** files; Settings resolves to `<Link to="/settings">` while `AppLayout` still wires `onOpenSettings` to a `MenuSheet`. Two settings destinations; one orphaned.
- `interface NavGroup` declared and never used — grouping was designed for eleven items and dropped.
- `select-none` on the AppLayout root disables selection app-wide, making `index.css`'s theme-aware `::selection` rules unreachable.
- Header chip `#0E1527` vs BhalyamHome `#0E1526`.
- `AppHeader` renders exactly one `bhalyam-*` token class; every other colour is a raw hex, including `#FF8F00`, which *is* the `bhalyam.orange` token written the long way.
- `title="Notifications (3 unread)"` duplicates the hardcoded count into the tooltip.
- Kraft note fill `#FFFDF4` on sidebar `#FFFDF7` is **1.00:1** — the "pinned note" has no fill separation in light mode. Its washi tape is invisible in light (1.25:1) and works only in dark (3.99:1): the decoration exists only in the theme that abandons the metaphor.

## Questions to Consider

1. Your `--surface-0…3` and `--text-*` tokens are slate. Every parchment surface therefore hardcodes hex, and `CategoryFilter.tsx` carries a 30-line comment policing an allowlist that exists only because the tokens are unusable. Why not make the light token ladder *be* the parchment ladder, and delete both?
2. Cream-on-cream cannot reach 3:1 — that is physics. What is your documented rule for signalling state in a low-contrast material? Every surface currently improvises; this rail improvised to 1.09:1.
3. `useTheme.ts` argues eloquently that BHALYAM's identity is warm cream paper. If that is true, why does dark mode look like a Vercel dashboard — is it a supported expression of the brand, or an obligation shipped without being designed?
4. Five nav items point at `/games` and two badges are fabricated. Which of these eleven destinations will exist in ninety days, and what should the others look like until then?
5. Six Tailwind v4 class names compiled to nothing and went unnoticed. What in the build or review process was supposed to catch a style that silently does not exist?
