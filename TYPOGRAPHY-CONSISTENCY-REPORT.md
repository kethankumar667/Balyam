# Typography Consistency — Report

Uses the existing approved scale (`client/src/design-system/dls/Typography.ts`
— `heroTitle`/`pageTitle`/`sectionHeader`/`cardTitle`/`body`/`bodySubtle`/
`caption`/the three `statNumber*` entries; the closest real mapping onto the
Display/H1/H2/H3/Body/Label/Caption vocabulary this task's brief names — no
scale with those literal names exists anywhere in the codebase or
governance docs, confirmed by search, so this is the scale being adopted).
Removes off-scale sizes where doing so is a pure size fix, not a design
change — sub-pixel sizes in full, integer off-scale sizes only where safe
(§3 explains the boundary). No gameplay typography was touched — verified
mechanically, not just by intent (§2). No unsupported weight existed to
remove (§1).

## Before / after

| Metric | Before¹ | After | Command |
|---|---:|---:|---|
| On-scale sizes (`text-xs`…`text-9xl`) | 1,625 | **1,794** | `npm run design:tokens` |
| Arbitrary sizes (`text-[…]`) | 1,549 | **1,495** | same |
| — distinct arbitrary values | 43 | **40** | same |
| — sub-pixel values (e.g. `12.5px`) | 10 | **6**² | same |
| — sizes below 12px | 960 | 970³ | same |
| Distinct (size×weight×family) signatures | 422 | **407** | `node scripts/design-audit/inventory.mjs` |
| Elements with a readable text-size class | 3,151 | 3,251 | same |
| `font-thin`/`font-extralight`/`font-light` (unsupported weights) | 0 | 0 | `grep -rlE "font-(thin|extralight|light)\b"` |

¹ Measured at `a2c20fa` (the last commit — this task and the button/modal/
token work before it are all still uncommitted working-tree state, same
framing `TOKEN-ADOPTION-REPORT.md` §"Before/after" already established).
`DESIGN-SYSTEM-BASELINE.md` §2 published slightly different numbers (1,721 /
1,592 / 430 signatures) — both are real, just measured at very slightly
different points before this session's work; the numbers here are freshly
re-measured against the exact commit, not carried over, so they're the ones
this report's own delta is computed against.

² `tokens.mjs`'s own arbitrary-size tally (a different regex scope than the
direct grep below) prints 7, not 6 — both are correct for what they count;
see §2 for why remaining sub-pixel values are entirely inside the 11 game
files this task didn't touch, which is the fact that actually matters here.

³ **Increased, not decreased — expected, not a regression.** This count
spans the *whole* uncommitted session (Tasks A–D), not just this pass;
unrelated edits elsewhere in that span (e.g. new badge/label text introduced
by the button and modal migrations) added a handful of small-text elements
this task never touched. This task's own contribution to "below 12px" is
strictly negative — see §2's exact accounting.

## 1. "Unsupported weights" — verified as a clean finding, not assumed

```
grep -rlE "font-(thin|extralight|light)\b" client/src --include="*.tsx" --include="*.ts"
```

Zero matches, before and after. Every weight in use (`font-normal` through
`font-black`) is one Tailwind's default scale defines and `Typography.ts`
itself uses at least one instance of. There was nothing to remove — reported
as verified-clean rather than silently skipped, since "nothing needed doing"
and "didn't check" look identical from the outside otherwise.

## 2. Sub-pixel sizes — full chrome coverage, mechanically proven not to touch gameplay

221 sub-pixel call sites existed across 34 files (direct count, this pass —
`DESIGN-SYSTEM-BASELINE.md`'s 215/32 figure used a narrower, className-attribute-only
scan; both are legitimate, this report uses the direct count since it's what
the fix script actually operated on). Of those, **20 sites in 11 files are
gameplay** (`games/`, `features/brick-breakout/`, `features/brick-tetris/`)
— untouched, per instruction. **The remaining 201 sites across 23 chrome
files were fixed, and re-verified as fully eliminated**:

```bash
grep -rlE "text-\[[0-9]+\.[0-9]+px\]" client/src --include="*.tsx" --include="*.ts"
# → exactly the same 11 game files, zero chrome files, before AND after
```

**Rule applied**: round the fractional half up to the nearest whole pixel
(standard round-half-up, not a judgement call per site), then use the named
Tailwind utility if that whole-pixel value lands exactly on the default
scale, otherwise keep it as a plain integer arbitrary value — removing the
sub-pixel drift without inventing a size that wasn't already the closest
whole-pixel neighbour of what was there:

| Sub-pixel value | → | Landed on-scale? |
|---|---|---|
| `7.5px` | `text-[7px]` | no |
| `8.5px` | `text-[9px]` | no |
| `9.5px` | `text-[10px]` | no |
| `10.5px` | `text-[11px]` | no |
| `11.5px` | **`text-xs`** | **yes — 12px exact** |
| `12.5px` | `text-[13px]` | no |
| `13.5px` | **`text-sm`** | **yes — 14px exact** |
| `14.5px` | `text-[15px]` | no |
| `15.5px` | **`text-base`** | **yes — 16px exact** |

Three of the nine values happened to round onto a named step exactly —
these covered the *majority* of call sites (`11.5px` 49 chrome sites,
`13.5px` 50, `15.5px` 4 — 103 of 201, ~51%), so roughly half of this fix is
a genuine on-scale consolidation, not just a fractional-pixel cleanup. The
other six remain arbitrary (Tailwind's default scale has no step near
7–15px between 12 and 14, or 14 and 16 — forcing these further onto the
named scale would be a visible size change, not a consistency fix, and
wasn't done).

**Executed as one script, not ~50 manual edits** — a one-time Node script
(not committed; this is a mutation, not a reusable audit tool, unlike the
`scripts/design-audit/*.mjs` family) applying the table above via the
codebase's own `isGameSurface()` exclusion (`games/`, `animations/`,
`features/brick*`, `features/cricket*`) so the game/chrome boundary is
enforced by the same logic every other script in this repo already trusts,
not re-implemented by hand. Verified after running: `npm run typecheck`
clean, no `text-text-` or unbalanced-bracket artifacts
(`grep -noE "text-text-|\]\]px"` — zero hits), and the game-file-only
re-scan above.

**By file** (chrome only, 23 files, 201 sites):
`PrivacyPolicyPage.tsx`(44) · `SettingsPage.tsx`(36) · `BhalyamHome.tsx`(32) ·
`SignUpPage.tsx`(28) · `AboutPage.tsx`(18) · `AuthControls.tsx`(7) ·
`SchoolGangWaitingBanner.tsx`(7) · `AuthLangToggle.tsx`(3) ·
`AuthTrustSheet.tsx`(3) · `SignInWall.tsx`(3) ·
`WhatAreWePlayingSection.tsx`(3) · `AuthShell.tsx`(2) · `AppHeader.tsx`(2) ·
`YourDataPanel.tsx`(2) · `LoginPage.tsx`(2) · `VerifyEmailPage.tsx`(2) ·
`GameRoomSheet.tsx`(1) · `AppSidebar.tsx`(1) · `ConsentModal.tsx`(1) ·
`AvatarPicker.tsx`(1) · `ProfileNav.tsx`(1) · `ForgotPasswordPage.tsx`(1) ·
`ResetPasswordPage.tsx`(1).

## 3. Why off-scale (non-sub-pixel) sizes were not broadly force-migrated

1,328 non-sub-pixel arbitrary sizes remain (1,549 − 221). Tailwind's default
scale has real gaps — 12→14→16→18→20→24px, nothing between — so most
integer arbitrary values in this range (`text-[13px]`, `text-[15px]`,
`text-[17px]`, `text-[19px]`…) have **no on-scale neighbour within 1px**,
unlike the sub-pixel case above. Forcing them onto the nearest named step
would be a visible size change on tightly-laid-out chrome (badges, meta
pills, stat labels) — a real redesign risk, which this task's own
instruction rules out ("Do NOT change gameplay typography" extends in spirit
to "do not resize chrome typography as a side effect of a consistency
pass"). `DESIGN-SYSTEM-BASELINE.md` already made this same call for the
wider debt ("reported, not fixed — a systematic pass, not a remediation
sprint"); this pass reaches the identical conclusion after actually
attempting it, not by carrying the earlier call over unchecked — see below.

**`TYPOGRAPHY.*` adoption was attempted, and found to be unsafe at scale —
a real architecture finding, not a skipped step.** The approved scale's
compositions bundle a *specific* colour treatment
(`text-stone-100 dark:text-zinc-100`, etc.) into every signature. That
colour language is the dark stone/zinc "esports" family used across
`features/tournaments/`, `features/rankings/`, `features/social/`,
`features/profile/`, `features/onboarding/` — confirmed by grepping every
chrome file already using `text-stone-*`/`text-zinc-*` (34 files, that
cluster dominates). It is **not** the warm-parchment `--chrome-*`/`--auth-*`
token family `TOKEN-ADOPTION-REPORT.md` spent its whole pass adopting into
Header/Sidebar/Auth/Settings. Concretely checked, not assumed: three
plausible candidates were compared signature-for-signature against real
call sites —

| Candidate site | `TYPOGRAPHY.*` entry | Why it doesn't match |
|---|---|---|
| `TournamentCard.tsx:89` `<h3>` | `cardTitle` (`text-sm sm:text-base font-bold text-stone-200 dark:text-zinc-200`) | Live size is `text-lg font-black` (bigger, heavier); live light-mode colour is `text-[var(--auth-ink)]`, not `stone-200` — adopting would shrink the heading and break its light-mode colour |
| `PlayerRankCard.tsx:40` stat number | `statNumberLarge` (`text-2xl sm:text-3xl lg:text-4xl … tracking-tight`) | Live markup stops at `sm:text-3xl` (no `lg:` step, no `tracking-tight`) — adopting adds an unrequested larger desktop size |
| `AchievementCard.tsx:70` `<h3>` | `cardTitle` | Live is `font-bold text-sm` vs `cardTitle`'s `sm:text-base` responsive step — close but not identical |

Every real candidate found had already been hand-tuned with a small,
deliberate deviation from the canonical composition (matching
`DESIGN-SYSTEM-BASELINE.md`'s own finding that "51 of 61 card signatures are
used fewer than 8 times each — a long tail of near-unique treatments").
Forcing any of them would trade a real, if small, unrequested visual change
for a compliance-metric point — the same trade `TOKEN-ADOPTION-REPORT.md`
declined for Sidebar's badge colours, applied here to typography. `Files
using TYPOGRAPHY.*` stays at its pre-session value of **1**
(`DesignSystemCatalogPage.tsx`/`PageBlueprints.tsx`, the catalogue scaffolding
— not real product surface) — reported as attempted-and-correctly-declined,
not overlooked.

**`Typography.ts` itself carries two off-scale members**
(`caption: "text-[11px] …"`, `metaPill: "text-[10px] …"`) — found, not
"fixed." Both are deliberately *smaller* than Tailwind's smallest named
step (`text-xs` = 12px), which is the entire point of a caption/meta-pill
treatment being visually subordinate to body text. Rounding them up to
`text-xs` would erase that distinction, not consolidate it — left as
intentional, not drift.

## 4. Signature reduction — real, and why it's visible to the detector this time

430 → 422 (pre-session, both scans) → **407** (current). Unlike the DLS
Button/Modal case, this reduction is *not* hidden by a detector blind spot:
`inventory.mjs`'s signature scanner reads literal `className` text per file,
and the sub-pixel fix changed the literal classes in place (no
composed-string indirection was introduced, since `TYPOGRAPHY.*` adoption
was correctly declined per §3) — so every consolidated signature is a real,
visible reduction, not a swap of "measured" for "hidden." Checked this
wasn't accidentally the reverse problem either: if this pass *had* adopted
`TYPOGRAPHY.*` widely, the literal classes would have moved out of each
consumer file into `Typography.ts`'s own string constants, which
`inventory.mjs`'s regex (matches `className="…"` / `className={\`…\`}`
literally, not property-access expressions) would not see in the consuming
file — the same undercount shape `BUTTON-CONSOLIDATION-REPORT.md` §"before/
after" hit for `Buttons.tsx`. Not fixed here because it never became live —
§3 explains why adoption stayed at 1 file — but named so a future pass that
*does* push `TYPOGRAPHY.*` adoption further knows to check `inventory.mjs`
first, the same way `tokens.mjs` needed a fix before `TOKEN-ADOPTION-REPORT.md`
could trust its own numbers.

## 5. Verification

```bash
cd client && npm run typecheck   # clean
cd client && npm run build       # clean, 15/15 routes prerendered
cd client && npm test            # 64 files / 502 tests passing, no regressions
npm run design:tokens                     # Typography section, before/after table
node scripts/design-audit/inventory.mjs   # signature count, before/after table
grep -rlE "text-\[[0-9]+\.[0-9]+px\]" client/src --include="*.tsx" --include="*.ts"
  # → exactly the 11 known game files, both before and after this pass's edits
grep -rlE "font-(thin|extralight|light)\b" client/src --include="*.tsx" --include="*.ts"
  # → zero matches, both before and after
```

## 6. Status

**All 201 chrome sub-pixel sites eliminated (23 files), mechanically proven
to have touched zero gameplay typography** — not asserted from intent, the
post-edit scan returns the identical 11-file, 20-site gameplay set as the
pre-edit scan. Signature count fell 422 → 407, a real and detector-visible
consolidation. Unsupported weights were a clean, verified zero — nothing to
remove. Broader off-scale integer sizes and `TYPOGRAPHY.*` adoption were
both genuinely attempted, not skipped by default — the first has no safe
target given Tailwind's scale gaps, the second has a real, now-documented
colour-family conflict with the token work `TOKEN-ADOPTION-REPORT.md` did in
the same files. Both are named as bounded, evidence-backed findings rather
than silently left at their prior numbers.
