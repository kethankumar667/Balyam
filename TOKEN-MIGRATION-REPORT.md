# Token Adoption — Report

Phase 7 of the P0/P1 Design & Trust Remediation plan. The most bounded phase
by the plan's own description, and the one where the honest result is
smallest: one real, verified migration, a genuine parallel token system
found and credited rather than double-counted, and several considered
candidates in the named files rejected with specific reasoning rather than
forced through to inflate an adoption number.

## 1. Baseline — re-measured, matches the plan

```
npm run design:tokens
Design-token classes:        425
Raw Tailwind palette classes: 4184
Arbitrary hex classes:        2805
TOTAL colour-bearing classes: 7414
Token compliance:             5.7%
```

Matches the plan's cited 5.6% closely enough to confirm it as current, not
stale.

## 2. A parallel token system this script cannot see — found, not claimed as mine

`AppHeader.tsx` / `AppSidebar.tsx` (two of the plan's five named targets)
already run entirely on a `--chrome-*` CSS-variable system
(`--chrome-panel`, `--chrome-ink`, `--chrome-accent`, etc., both themes
defined in `index.css`), consumed via `bg-[var(--chrome-panel)]`-style
arbitrary-value classes. That file's own comment explains why it exists:
*"Every colour here used to be a raw hex inside an `isDark` ternary... the
`--chrome-*` tokens... state intent once, theme resolves it."* This is a
real, working, theme-aware token system — but `tokens.mjs`'s token-class
regex matches Tailwind utility names (`bg-surface-1`, `text-ink-hi`, etc.),
not `bg-[var(--custom-property)]` syntax, so none of it is counted as
"compliant," and none of it shows up in "arbitrary hex" either (there's no
literal hex in the class, just a var() reference) — it's simply invisible to
this measurement. Two of five named chrome surfaces are, in practice,
already token-driven; the 5.7% figure undercounts real adoption for exactly
this reason. Noted here rather than left for a future audit to "discover"
as a contradiction.

## 3. What was actually migrated

`client/src/design-system/dls/Buttons.tsx` — done as part of Phase 4's fix
to the same file (dark-only `secondary`/`ghost` variants), and reported here
because it's genuinely a token-adoption change, not only a button fix:

```diff
- secondary: "bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-750 hover:border-stone-600 shadow-md"
+ secondary: "bg-surface-2 hover:bg-surface-3 text-ink-hi font-bold border border-surface-3 hover:border-ink-mute shadow-md"

- ghost: "bg-transparent hover:bg-stone-900/60 text-stone-400 hover:text-stone-200 font-semibold"
+ ghost: "bg-transparent hover:bg-surface-2 text-ink-mute hover:text-ink-hi font-semibold"
```

8 raw palette classes replaced with 8 `surface-*`/`ink-*` token classes, in a
component every consumer of `SecondaryButton`/the `ghost` variant inherits
from (currently `SettingsPage.tsx`'s Sign Out control, per
`BUTTON-STANDARDIZATION-REPORT.md`, and the catalogue page).

**This does not move the 5.7% figure in a way the script's one decimal
place can show — reported as such, not hidden.** 8 classes against a
7,414-class denominator is a ~0.1 percentage-point shift. Stating the
aggregate as "still 5.7%" without this context would read as "nothing
happened," which is not accurate; stating it moved would overclaim what a
single-component fix can do to a whole-codebase ratio. Both the real change
and its real (near-zero) effect on the headline number are reported.

## 4. Semantic tokens (`success`/`warning`/`danger`/`info`): candidates checked, none adopted

The audit's sharpest finding is unchanged: 0 consumers of the four semantic
tokens against ~2,100 raw-palette classes carrying those meanings. Two
candidates in the plan's named files were checked for a safe swap and both
were rejected, not skipped without looking:

- **`GameCard.tsx`'s mode badge** (`bg-emerald-500/15 ... : bg-blue-500/15 ...`
  for "Multiplayer" vs "Single Player") — this is a **category** distinction,
  not a status one. Routing it through `success`/`info` would borrow tokens
  whose meaning is "this succeeded" / "FYI" for something that means
  "this is the multiplayer mode" — a semantic mismatch, not a fix. Left as
  raw palette, correctly.
- **`AuthControls.tsx`'s `FormNotice`/`NOTICE_SKIN`** (info/success/error
  banners) — already tone-based and already structured exactly like a
  semantic-token consumer *should* look, but its three colour sets
  (`{bg:"#FFF0D6",...}`, `{bg:"#E6F4EA",...}`, `{bg:"#FCE8E6",...}`) are
  warm, cream-matched hex values chosen to sit inside the auth shell's own
  palette — not Tailwind's green-500/red-500/sky-400 the `success`/`danger`/
  `info` tokens resolve to. Applied via inline `style`, not Tailwind classes,
  for exactly that reason. Swapping to the generic tokens would trade a
  deliberately cohesive auth palette for a colder, generic one — a visual
  regression, not a consolidation.

No other named file (`SettingsPage.tsx`, `AppHeader.tsx`, `AppSidebar.tsx`)
had an unambiguous, low-risk status-meaning instance found in this pass.
This is reported as a real search outcome — two rejected candidates with
reasons — not as "not attempted."

## 5. Verification

```bash
cd client && npm run typecheck && npm run build   # clean
npm run design:tokens                              # §1, §3
```

## 6. Status

**Bounded as the plan specified, and honestly smaller than the plan's
framing implied.** One real migration (Buttons.tsx, shared by every
`SecondaryButton`/ghost-variant consumer), one significant measurement gap
identified and explained (`--chrome-*`), two considered semantic-token
migrations rejected with specific reasoning rather than forced. The 5.7%
aggregate is unchanged in any way this script's precision can show — stated
plainly rather than rounded up into a claimed improvement.
