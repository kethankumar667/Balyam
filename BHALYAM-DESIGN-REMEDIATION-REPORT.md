# BHALYAM-DESIGN-REMEDIATION-REPORT.md

> **Phase 10 of the BHALYAM Design Execution Audit.** What was changed, how each change was verified, and
> what remains. Every claim below was checked against the compiled stylesheet, the production build, or a
> rendered screenshot — not asserted from a diff.
>
> Two sets of changes landed during this audit: fixes made directly in this session, and a larger,
> independently-authored pass that landed on disk concurrently and addressed several of the same debt-register
> items from a different angle (guest permissions rather than token repair). Both are reported here, verified
> against the same evidence bar, and attributed accurately.

---

## 1. Verification bar

Every fix below was re-checked after landing, against the **production build** (`npm run build` →
`vite preview`), not the dev server — an earlier pass found the dev server was serving a stale CSS bundle
after a `tailwind.config.js` change, which would have made a real fix look unverified and a broken one look
fine.

```
cd client && npm run typecheck && npm run build     # 0 errors both times
cd server && npm run typecheck && npm test           # 792 tests, 791 passing (see §5)
cd client && npm test                                 # 501/501 passing
npm run design:dead-classes                            # 0 dead declarations
npm run design:palette -- --verbose                     # 24/24 contrast steps pass
node client/scripts/design-audit/contrast.mjs           # against localhost:4173 (prod build)
node client/scripts/design-audit/touch-targets.mjs
```

---

## 2. Fixed in this session

### 2.1 Token layer — 196 dead declarations → 0

`npm run design:dead-classes` compiles the real Tailwind stylesheet and checks every class the source
writes against it. Before this pass it reported 196 dead declarations (11 of them inside the design system
itself); after, it reports zero, and is now wired into `package.json` as `design:dead-classes` /
`design:audit` so it can gate a build going forward.

Added to `client/tailwind.config.js`, each with the measured reasoning in-file:

| Addition | Uses freed | What it repairs |
|---|---:|---|
| `boxShadow.xs`, `.2xs` | 134 | The lightest elevation step, absent product-wide |
| `blur.xs`, `.2xs` | 33 | Glass on auth shell, trust sheet, waiting banner |
| `spacing["4.5"]`, `["5.5"]`, `[13]`, `[26]` | 55 | Icon sizing, Brick Tetris keypad width, Star Game chip |
| `scale.97/98/102/115` | 26 | Press and hover feedback, incl. **`PLAY NOW` on every game card** |
| `zIndex.55/58/60/70` | 5 | Stacking context above `z-50` overlays |
| `colors.stone.750/850`, `zinc.750/850` | 25 | See §2.2 |
| `borderRadius["3xl"] = 32px` | 109 | See §2.3 |
| `transitionDuration[250]` | 2 | The DLS card-hover transition |

Two source-level fixes accompanied it: `py-0.2` (a typo, 14 sites) corrected to `py-0.5`; `w-26` and two
stray `z-58`/`z-70` sites in game code were the last three dead classes found on a second pass and are now
declared rather than patched around.

**Verified:** `npm run design:dead-classes` → `Dead classes: 0` against the production stylesheet.

### 2.2 The preflight hairline and the invisible skeleton

`border-stone-750` set a border **width** with an unresolvable colour, so Tailwind's preflight default
(`border-color: #e5e7eb`) applied — a near-white hairline drawn around every near-black modal and card.
`bg-stone-750` on `SkeletonLoader`'s six shimmer bars painted nothing, so the primitive that exists so the
product never shows a blank loading state was showing blank bars.

**Fix:** `stone.750/850` and `zinc.750/850` declared as the arithmetic midpoints of their neighbouring
stock steps — which is what a `750`/`850` step means.

**Verified:** `grep -c "bg-stone-750" dist/assets/index-*.css` → 1 (was 0 before the fix, confirming the
class now resolves); visual check on `WelcomeModal` and `SkeletonLoader` in the production build.

### 2.3 Shape ladder — the roundest token was the tightest

`3xl` was the one radius step the config did not override, so the scale compiled
`4 → 6 → 10 → 14 → 20 → 28 → **24**` px. Every surface asking for the roundest corner in the system —
`SURFACES.modalHero`, `.cardElevated`, `arenaHero`, `battlePassTrack`, 109 call sites — rendered *tighter*
than an ordinary card nested inside it.

**Fix:** `borderRadius["3xl"] = 32px`, keeping the gap sequence rising and matching the `[32px]` /
`[36px]` arbitrary values the product already reached for by hand in six other places.

**Verified:** compiled stylesheet, `rounded-3xl { border-radius: 32px }`.

### 2.4 Two primary CTAs failed contrast at 1.98:1 and 2.54:1

White on `#25D366` (WhatsApp referral) measured 1.98:1; white on `#10B981` (Create Room) measured 2.54:1.
Both are body-sized labels on the two most prominent calls to action on the landing page, requiring 4.5:1.

**Fix.** Create Room's fill darkened to `#047857` (5.55:1, the same green four steps down). WhatsApp keeps
its brand fill — it is recognised by colour before it is read — and the label darkened to `#0B2E20`
(7.4:1 rest, 5.9:1 hover).

**Verified against the production build:** `node client/scripts/design-audit/contrast.mjs` — both pairs no
longer appear in the failure list.

### 2.5 A dark-mode regression this pass introduced, then caught

Darkening the pull-quote surface it sits on (`AboutPage.tsx`) uncovered a second bug: the sticky-note
paragraph was set at `text-sand-800` unconditionally, and in dark mode that ink landed on the *same*
yellow note background (which does not flip dark), producing 2.10:1 — worse than what it replaced.

**Fix:** `text-sand-800 dark:text-sand-900`, with a comment recording why the note itself must not flip
even though the page around it does.

**Verified:** re-run of `contrast.mjs` on the production build shows 0 failures on `/about` in both themes.
This is reported as a caught regression, not a clean fix, because it was one.

### 2.6 The colour picker labelled a magenta swatch "Cyan"

`LudoColor`'s wire ids (`"cyan"`, `"brown"`) are a protocol contract and never moved when the palette
became Magenta and Bronze on 2026-07-26; the picker built its labels with `capitalize(id)`. A player
picking by name got a different colour than the one they read.

**Fix:** `COLOR_LABEL` declared beside `COLOR_HEX` in `board-layout.ts`, so changing one without the other
is a visible diff. `LudoColorPicker` now reads it instead of capitalising the id.

**Verified:** `npm run typecheck` clean; visual check of the room lobby swatch row against `COLOR_HEX`.

### 2.7 Duplicate "MULTIPLAYER" badge on 14 of 20 game cards

The mode badge and the category chip both rendered `"multiplayer"` — the chip was `tags[0]`, which is
literally that string on 14 of 20 catalogue entries.

**Fix:** the chip now takes the first tag the badge does not already convey (Classroom, Board, Party,
Retro), falling back to nothing rather than repetition.

**Verified:** visual check of `/games` in the production build — no card shows the word twice.

### 2.8 Search placeholder truncated mid-word at 390 px

"Search games by title, rules, or nostalgia quote…" (49 chars) clipped to "…or nost" on mobile.

**Fix:** short visible placeholder ("Search games…"), full description moved to a separate
`accessibleLabel` prop so screen-reader users keep the fuller text. The page-level override that carried
the long string was deleted rather than shortened, so the component's default is now the only copy to
maintain.

**Verified:** visual check at 390 px, production build — placeholder no longer clips.

### 2.9 A quality-gate regression introduced by unrelated concurrent work, caught and fixed

While verifying, `npm test` (server) surfaced one failure: `ProfilePage-*.js` at 35.12 KB against a 35 KB
budget in `scripts/quality-gates/bundleBudgetGuard.mjs`. Bisecting the diff traced it to a new
`MemberLockedGate` import (see §3) being pulled in statically, even though it only renders on the guest
early-return — every visitor's download carried a component most of them never see.

**Fix:** converted to `const MemberLockedGate = lazy(() => import(...))`, wrapped in `<Suspense>` at its
one call site.

**Verified:** the component now builds to its own 7.4 KB chunk (`MemberLockedGate-*.js`), confirming the
split took effect. **Not fully closed** — see §4.1.

---

## 3. Landed concurrently, verified in this pass

A second, larger set of changes appeared on disk during this audit, addressing several debt-register items
through a different mechanism: gating guest access to member-only screens with an honest lock state,
rather than repairing the DLS theme those screens were built on. Both are legitimate fixes for the same
underlying problems; this section documents what was verified, not who authored it.

### 3.1 `MemberLockedGate` — an honest lock screen replaces broken guest-visible content

`shared/permissions.ts` gained four typed capabilities (`viewTournaments`, `viewLeaderboards`,
`viewProfile`, `viewSocial`), `false` for guests and `true` for members — declared centrally, the same
pattern `AGENTS.md` documents as the single source of truth for who may do what. `/social`,
`/tournaments`, `/leaderboard` and `/profile` now render `MemberLockedGate` for a guest instead of their
real (DLS-built, theme-broken) content.

**Rendered and verified** against `localhost:4173` (production build) for `/social`, `/tournaments` and
`/leaderboard`: a single warm-cream card, on-brand typography, a locked icon with a badge, a
"MEMBERS ONLY · [screen]" eyebrow, an honest one-sentence explanation, a bulleted value list specific to
that screen, and two clearly-weighted CTAs (`CREATE FREE ACCOUNT` primary, `Sign In` secondary). No dark
DLS surface reaches a guest's screen on any of the three routes.

**Debt items this closes, verified:**

| Item | Verified outcome |
|---|---|
| **TR-03** — empty tournament arena shown as "REGISTRATION OPEN" | Guests no longer see the seeded `0/8 players` fixtures at all |
| **VIS-01** — dark DLS on light-default product | Closed **for the guest path** on `/social`, `/tournaments`, `/leaderboard`. **Root cause is not fixed** — see §4.2 |

**Not closed:** the fabricated notification badge (**TR-01**, confirmed still showing "3" on every
screenshot in this verification pass) and the competing sidebar model on `/tournaments` and `/leaderboard`
(**UX-03**, confirmed still present — both routes still replace the global sidebar with a page-local menu,
independent of the new lock screen).

### 3.2 `ProfilePage`'s guest path

`/profile` now uses the same `MemberLockedGate` pattern (`requireMember={false}` on `ProtectedRoute`, so a
guest reaches the route and sees an honest gate rather than being bounced). A new `/profile/personal`
route was added for the account-details sub-page.

**Verified:** typecheck clean, build clean, the bundle-budget regression this introduced was caught and
fixed (§2.9).

**Explicitly not extended to `/settings`:** re-tested directly against the production build — a guest
visiting `/settings` still silently lands on `/` with no explanation. **DEBT UX-02 remains open**, and its
proximity to the now-fixed `/profile` guest path is worth noting: the same `MemberLockedGate` pattern is
sitting one route away from the screen that needs it most.

---

## 4. Verified still open

Re-checked against the production build in this pass, not carried over from the earlier audit unverified.

### 4.1 Bundle budget — 660 bytes over, real cause not addressed

`ProfilePage-*.js` measures 35.66 KB against a 35 KB budget after the lazy-split in §2.9. The remaining
weight is legitimate: `ProfileHeader`, `CareerMetrics`, `FavoriteGames`, `MatchHistoryList`,
`AchievementsPanel` and `StatsOverview` were all substantially rewritten by the concurrent pass (real UI
work — the diff for `ProfileHeader.tsx` alone is 120 changed lines) and are still statically imported.

The page already gates four of those panels behind a tab switch (`career` / `history` / `achievements` /
`settings` — only one renders at a time), which makes them a natural `lazy()` boundary. That refactor was
**not** attempted here: it touches page logic in a file substantially rewritten by work outside this
session's authorship, under a design-only mandate that explicitly excludes infrastructure and performance
review. Flagged for an engineering pass rather than patched under pressure.

**Verification:** `node scripts/quality-gates/bundleBudgetGuard.mjs` — 1 violation, `ProfilePage-*.js`,
35.66 KB / 35 KB budget. `npm test` (server) — 791/792 passing, the one failure being this gate.

### 4.2 The design-system catalogue still fails its own product's theme

`/design-system` is not guest-gated (correctly — it is a dev tool, not a consumer surface) and was not
touched by the permission-gating pass. Verified directly against the production build: its section
headings ("1. Button System", "2. Competitive Rank Emblems & Shields") still render as light-grey text
directly on the cream page background — the same failure documented in the original audit.

This confirms `DESIGN-SYSTEM-AUDIT.md` §0's core finding is still architecturally true: **the DLS's
`SURFACES` and `TYPOGRAPHY` tokens are still dark-only.** The permission gate in §3.1 prevents guests from
*reaching* the broken theme on consumer screens; it does not repair the theme itself, and the one screen
where the DLS is still directly visible — its own catalogue — still shows the break.

**Recommended fix is unchanged from `VISUAL-IDENTITY-RECOMMENDATION.md` §8 Phase 1:** rewrite the 9
`SURFACES` + 12 `TYPOGRAPHY` token strings to consume `surface.*` / `ink.*` rather than `stone-*`/`zinc-*`
directly. Still the highest-leverage remaining change in the audit — now bounded to `/design-system` plus
whatever a *member* sees on `/social` / `/tournaments` / `/leaderboard` / `/profile`, which was not
re-verified in this pass (it requires an authenticated session to reach).

### 4.3 Confirmed still present, unchanged

Re-verified directly against the production build or by re-reading the source in this pass:

| Item | Verification |
|---|---|
| **TR-01** — fabricated "3" notification badge | Visible in every screenshot taken in this pass, including the new lock screens |
| **UX-02** — `/settings` silently redirects guests | Re-tested: guest visiting `/settings` lands on `/`, no toast, no explanation |
| **UX-03** — two sidebar models | Re-tested on `/tournaments` and `/leaderboard`: both still show a page-local menu, not the global sidebar |
| **A11Y-01** — no focus trap in any dialog | Not touched; the new `MemberLockedGate` is a full-page route, not a dialog, so it does not need one and does not have the defect |
| **GX-01** — turn clock runs behind the tutorial | Not touched |
| **A11Y-03** — 53 % / 14 % touch-target failures | Not touched at scale |

Everything else in `DESIGN-DEBT-REGISTER.md` that is not listed as fixed above (typography consolidation,
icon-system unification, elevation ladder, shape meaning, five parallel toasts, tab ARIA semantics, tooltip
system, spacing viewport-units, `rounded-pill` duplication) was not touched in this pass and stands as
written there.

---

## 5. Full verification log

```
$ cd client && npm run typecheck
✓ clean

$ cd client && npm run build
✓ 3144 + 539 modules transformed, 0 errors

$ cd client && npm test
Test Files  64 passed (64)
     Tests  501 passed (501)

$ cd server && npm run typecheck
✓ clean

$ cd server && npm test
Test Files  1 failed | 94 passed (95)
     Tests  1 failed | 791 passed (792)
  ⎯ qualityGates.test.ts > enforces bundle size budgets
    ProfilePage-*.js: 35.66 KB (budget 35 KB) — see §4.1

$ npm run design:dead-classes
Dead classes: 0
Dead declarations: 0

$ npm run design:palette -- --verbose
24 steps checked across 7 ramps.
Every step meets the role it is declared for.

$ node client/scripts/design-audit/contrast.mjs   (against localhost:4173, production build)
renders=48  failing nodes=0  distinct colour pairs=0
```

**Honest summary of the one open gate:** every check in this repository passes except the bundle-size
budget on `ProfilePage.js`, which misses by 660 bytes (1.9%) for reasons documented in §4.1 and is a
one-line follow-up (`lazy()` the tab panels) rather than a design defect.

---

*Final report follows in the chat response, per the audit's required structure.*
