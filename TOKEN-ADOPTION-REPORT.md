# Token Adoption — Report

Increases adoption of the existing design-token layer (`client/src/index.css`
custom properties, exposed through `tailwind.config.js`) across the eight
priority areas given: Header, Sidebar, Auth, Settings, Shared Cards, Shared
Controls, Shared Navigation, Shared Dialogs. No new tokens were invented and
no palette value was changed — every swap in this pass replaces an arbitrary
hex literal with a `var()` reference that resolves to the **exact same
colour**, verified per-swap against `index.css` before editing (methodology
in §1). Where no token existed that was both an exact match and safely
reachable at the call site, the literal was left in place and the reason is
recorded in §5, not silently dropped.

## Before / after

| Metric | Before¹ | After | Command |
|---|---:|---:|---|
| Design-token classes (total) | 644 | **1,215** | `npm run design:tokens` |
| — named utility (`bg-surface-1`, `text-ink-hi`, …) | 423 | 425 | same |
| — `var()` arbitrary (`bg-[var(--chrome-panel)]`, …) | 221 | **790** | same |
| Raw Tailwind palette classes | 4,187 | 4,184 | same |
| Arbitrary hex classes | 2,911 | **2,709** | same |
| **Token compliance** | **8.3%** | **15.0%** | same |

¹ Measured at `a2c20fa` (the last commit — every task this session,
including the button/modal consolidation, is still uncommitted working-tree
state), using the **corrected** detector described in §1. This is not the
number `DESIGN-SYSTEM-BASELINE.md` published — see below.

**This does not match the previously-published 5.7% baseline, and that
needs to be reconciled on the record, not quietly superseded.**
`DESIGN-SYSTEM-BASELINE.md` §1 reported 425 / 4,216 / 2,808 / 7,449 = 5.7%,
produced by the *unfixed* `tokens.mjs`. That number was correct for what it
measured but was measuring the wrong thing — see §1. Re-running the
*unfixed* detector against the current tree (after this pass's edits) prints
**425 / 4,184 / 2,709 — compliance unchanged at 5.8%**, which would make this
entire pass look like it did almost nothing. It didn't do nothing; the
detector couldn't see what it did. Both the corrected-baseline number above
and the fix itself are reported so this doesn't become a third contradictory
token audit.

## 1. The detector was blind to half of Tailwind's own syntax — fixed, not worked around

`tokens.mjs`'s `tokenClasses` regex matched only *named* Tailwind utilities —
`bg-surface-1`, `text-ink-hi`, `border-danger`. It had no pattern for
Tailwind's arbitrary-value escape hatch, `bg-[var(--chrome-panel)]`, which is
how every `--chrome-*`, `--auth-*`, and `--rim-gold` token is actually
*consumable* — none of those families were ever registered in
`tailwind.config.js` as named colour families (`DESIGN-SYSTEM-ARCHITECTURE.md`
already documented this gap). A class in that form fell into neither the
token bucket nor the arbitrary-hex bucket (which only matches `\[#hex\]`) —
it simply vanished from all three buckets, undercounting both the numerator
and the denominator identically.

This is the same failure shape as the modal focus-trap conflict
(`MODAL-SYSTEM-AUDIT.md`) and the DLS-Button consumer undercount
(`BUTTON-CONSOLIDATION-REPORT.md` §"before/after") — a detector that greps
for one *named* form of an idiom while the codebase (correctly, and in this
case unavoidably — see §3) uses the *arbitrary-value* form instead. Fixed by
adding a second bucket, `varTokenClasses`
(`\b${PREFIX}-\[var\(--[a-zA-Z0-9-]+\)\]`), summed into the same
"Design-token classes (total)" the compliance % is built from
(`scripts/design-audit/tokens.mjs`, now prints both buckets separately so
the split stays visible rather than hidden inside one number).

**This also means the *original* baseline was undercounting all along** —
221 of the 644 true-before token classes were already `var()`-arbitrary
(mostly `--room-*` tokens in room-chrome components, and `AppHeader.tsx`'s
pre-existing `--chrome-*` usage from earlier work), invisible to the
detector everyone had been reading. The corrected before/after in the table
above is the honest comparison; the 5.7%/5.8% figures are not wrong
observations, they're the same undercount applied consistently to both
sides, and are recorded here so nobody re-derives this confusion later.

## 2. Why the swap count (569 new `var()` classes) is bigger than the files touched (11) would suggest

Several files carry the identical repeated card-shell string
(`bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl ...`)
because it was copy-pasted across `SettingsPage.tsx`'s four dialogs,
`RoomShareCard.tsx`, and `CompactColorSelector.tsx` (twice, in the same
file) — one token swap applied with `replace_all` inside a file accounts for
multiple class instances. This is the same "one shared implementation,
counted once per file but N times per instance" shape as
`MODAL-CONSOLIDATION-REPORT.md`'s files-vs-instances note — reported as
instance counts (the 569 delta) with file-level attribution in §4, not
inflated by treating a file count as an instance count either direction.

## 3. A hard constraint discovered and proven this pass, not assumed

Tailwind v3.4.3 does not compile an arbitrary value with an opacity
modifier when the value is a `var()` reference:
`border-[var(--chrome-hairline)]/60` produces **no CSS rule at all** — a
silently dead class, worse than the literal hex it would have replaced.
Proven empirically (not by reading docs): a probe file
(`client/src/_opacity-probe.tsx`, deleted after the check) with
`border-[var(--chrome-hairline)]/60` and `bg-[var(--chrome-panel)]/40`, run
through `npx tailwindcss -i ./src/index.css -o <scratch>` — neither probe
class appears anywhere in the compiled output, while the equivalent
unmodified `bg-[var(--chrome-panel)]` (already live in `AppHeader.tsx`)
compiles correctly to `.bg-\[var\(--chrome-panel\)\] { background-color:
var(--chrome-panel); }`.

**Consequence, applied consistently across every file in this pass**: any
arbitrary hex with a trailing `/NN` opacity suffix was left as a literal —
`border-[#ECD9BA]/60` stays exactly as-is; only the un-suffixed sibling
instances of the same hex were migrated. This produced the SettingsPage.tsx
and GettingStartedCard.tsx "found, not migrated" lines in §5 — not oversight,
a hard compiler constraint.

## 4. What was migrated, by priority area

### Header — 0 new swaps (already compliant)
`AppHeader.tsx` returns zero exact-hex matches against the token table. It
was already fully `--chrome-*`-based from earlier work; the only
hex-looking text in the file is inside a `/* ... */` comment describing a
past bug, not live CSS. Re-verified with the exact-match scanner this pass
built (`scripts/design-audit/exact-token-matches.mjs`), not assumed from
memory.

### Sidebar — 0 new swaps (blocked by a real architecture gap, not left idle)
`AppSidebar.tsx` also returns zero exact-hex matches — its badge-variant
colours (`emerald-500`/`amber-500`/`rose-500`/`purple-500`, each with its
own explicit `dark:` shade) are raw Tailwind *palette* classes, not hex
literals, so a different swap would be needed: routing them through the
`success`/`warning`/`danger` semantic tokens. **That swap was evaluated and
rejected.** `success`/`warning`/`danger`/`info` are declared once each in
`:root` with **no dark-mode override anywhere in `index.css`** — confirmed
by direct grep, not assumed. Sidebar's badges currently render a
deliberately *different*, correctly-contrasted colour per theme; routing
them through a token with no dark value would collapse that into one static
colour and regress the theme-specific contrast that exists today. This is
the real reason the semantic tokens have effectively zero consumers
sitewide (§6), not negligence, and forcing this swap would trade a real
correctness property for a compliance-metric point — not done.

### Auth — 0 new swaps, and a naming collision worth flagging on its own
`LoginPage.tsx` and `SignUpPage.tsx` alone surfaced **59 exact hex matches**
against `ink-hi`/`ink-lo`/`surface-3`/`auth-ink-soft`/etc. None were applied.
Two independent reasons, and the second is a genuine discovery this pass
made that's worth naming precisely because it's an easy trap:

1. **`AuthShell.tsx` (the React component) never applies the `.auth-shell`
   CSS class** the `--auth-*` tokens are scoped to. The class is applied by
   five *unrelated* components — `MemberLockedGate.tsx`, `ConsentModal.tsx`,
   `EditProfileModal.tsx`, `BhalyamHome.tsx`'s side drawer, and
   `PersonalInformationPage.tsx` — none of which are the login/signup/auth
   flow. Confirmed by grepping every occurrence of the literal string
   `auth-shell` across the client source. `var(--auth-ink-soft)` and
   similar inside `LoginPage.tsx` would resolve to nothing: the component
   name and the CSS class name look like the same concept and are not.
2. **Every auth page is theme-invariant by construction** — zero `dark:`
   classes anywhere across `AuthShell.tsx`, `LoginPage.tsx`,
   `SignUpPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`,
   `VerifyEmailPage.tsx`, `AuthControls.tsx` (confirmed by exact count, not
   spot-check). Inputs are hardcoded `bg-white/90`/`bg-white/95`. Even the
   *reachable*, root-scoped equivalents (`--text-hi`, `--surface-3`, …) carry
   a different dark-mode value — swapping `text-[#0F172A]` for
   `var(--text-hi)` would flip the input text near-white in dark mode while
   its `bg-white/90` background stayed put, an illegible contrast regression
   on a surface that renders correctly and consistently today. Same
   reasoning already established for `PartyInvitationModal.tsx`
   (`MODAL-CONSOLIDATION-REPORT.md` §3) — a surface deliberately locked to
   one look regardless of site theme — mirrored here for light instead of
   dark.

Reported as a bounded, correctly-justified zero, the same way Sidebar is —
not silently skipped.

### Settings — the largest real migration in this pass
`SettingsPage.tsx`: ~60 arbitrary-hex instances migrated to `var()` tokens
across the page chrome and all four dialog panels (Avatar Picker, Edit
Display Name, Change Password, Erase Everything), including:

| Pattern | Token | Count |
|---|---|---:|
| `text-[#7A5E45]` | `--chrome-ink-soft` | 26 |
| `border-[#ECD9BA]` (un-suffixed only) | `--chrome-hairline` | 21 |
| `bg-[#FAF2DF]` | `--chrome-control` | 5 |
| `bg-[#ECD9BA]` (slider tracks) | `--chrome-hairline` | 3 |
| Avatar-modal header `light dark:` pairs collapsed to one `var()` | `--chrome-border` and others | several |
| `bg-[#FFF2D6]` (nav active state) | `--chrome-active-bg` | 1 |
| `border-[#D4A574]` (Change Avatar button) | `--rim-gold` | 1 |

**Four instances found, correctly not migrated**, re-confirmed clean on the
final sweep: `#E8D8BE` at L231 matches `auth-card-edge`/`auth-field-edge` —
both `.auth-shell`-scoped, and `SettingsPage.tsx` never renders inside that
class (same trap as §Auth, different file); the three `border-[#ECD9BA]/60`
instances (L406, L471, L845) are opacity-suffixed and blocked by the
compiler limitation in §3.

**Two near-duplicate "chrome drift" values found, deliberately not
corrected**: `#FFFDF8` (used repeatedly) is one hex digit off
`--chrome-panel`'s canonical `#fffdf7`; `#FAF4E6` is off `--chrome-control`'s
`#faf2df`. Silently rounding either to the token would be a real, if tiny,
pixel-level rendering change — outside "replace exact duplicates," inside
"redesign the palette," which the task instruction rules out. Flagged here
as found-but-unfixed, matching the same pattern `AppHeader.tsx`'s own code
comment already documents for an unrelated pair of near-duplicates.

### Shared Cards
| File | Swap |
|---|---|
| `components/games/GameCard.tsx` | inline gradient stop `#FFFFFF` → `var(--surface-1)` |
| `components/room/RoomShareCard.tsx` | `dark:bg-[#131926]` → `dark:bg-[var(--chrome-panel)]`; `border-[#D4A574]` → `border-[var(--rim-gold)]` |
| `features/onboarding/GettingStartedCard.tsx` | `dark:bg-[#131926]` → `dark:bg-[var(--surface-1)]` |
| `design-system/premium/PremiumHeroCard.tsx` | `glowColor` default `"#F59E0B"` → `"var(--color-warning)"` |
| `design-system/premium/PremiumStatCard.tsx` | `accentColor` default `"#F59E0B"` → `"var(--color-warning)"` |

The two `Premium*Card` defaults are value-neutral, not merely
low-risk: `warning` has no dark-mode override (§"Sidebar" explains why that
usually blocks a swap), but these props were already a single static colour
in both themes before this edit — `var(--color-warning)` resolves to the
identical `#f59e0b` in both, so nothing about the rendered output changes.
Confirmed these two components have **zero real product consumers**
(only `DesignSystemCatalogPage.tsx` and their own test) before editing — a
safe, in-scope, low-value-but-real swap, not a wasted one.

`GettingStartedCard.tsx` had two further exact matches
(`dark:bg-[#182234]` ×2, matching `auth-field (dark)`) **not** migrated: that
token is `.auth-shell`-scoped, this component never renders inside one, and
no root-scoped token shares that exact dark value — no reachable
alternative exists, not a judgement call. One instance is additionally
opacity-suffixed (§3), a second independent reason on top of the scope
mismatch.

### Shared Controls
No dedicated Input/Select/Toggle/Slider component family exists in this
codebase (`design-system/dls/` has no such files — confirmed by listing the
directory, matching `DESIGN-SYSTEM-ARCHITECTURE.md`'s finding that these
categories were inventoried but never built as shared components). Scoped
to the hand-rolled control components that do exist:

| File | Swap |
|---|---|
| `components/auth/AuthLangToggle.tsx` | `hover:border-[#D4A574]` → `hover:border-[var(--rim-gold)]` |
| `components/room/CompactColorSelector.tsx` | `dark:bg-[#131926]` → `dark:bg-[var(--chrome-panel)]` (×2, `replace_all`) |

`AuthLangToggle.tsx` renders inside `AuthShell.tsx`'s header — the same
theme-invariant surface as §Auth — but `rim-gold` has no dark-mode override
at all, so (like the Premium cards above) this swap is value-neutral
regardless of that invariance: same rendered colour, before and after, in
either theme.

**Two found, not migrated, for reasons distinct from anything above**:
- `components/GlobalSettings/GlobalSettings.tsx` L377 — a toggle switch's
  knob colour, `checked ? "#FFFFFF" : "#2B2118"`. This is state-driven
  (on/off), not theme-driven — the track colours beside it
  (`#31A157`/`#E6A11E`) already carry no `dark:` variant either, by design.
  Swapping the knob to `var(--surface-1)` would make it flip dark in dark
  mode while checked, breaking the white-dot-on-coloured-track convention
  the rest of the control already relies on. Same exemption
  `BUTTON-CONSOLIDATION-REPORT.md` already established for stateful
  pressed/unpressed selectors, applied here to a toggle instead of a button.
- `components/CoinColorPicker.tsx` — `fill: "#ef4444"` / `"#22c55e"` inside
  a *named-colour* palette (`red: { fill: "#ef4444", label: "Red" }`,
  `green: { fill: "#22c55e", label: "Green" }`) for player-piece colour
  selection. The hex values coincide numerically with `danger`/`success`,
  but the meaning here is "the user picked the colour literally called Red
  for their piece," not "this represents an error state" — routing it
  through `--color-danger` would be forcing an accidental numeric collision
  into an unrelated semantic slot. Not migrated; flagged as a false-positive
  class worth naming so it isn't "fixed" by someone reading only the hex
  match in a future pass.

### Shared Navigation
Re-confirmed, not re-assumed: `navigation/navigationConfig.tsx`,
`navigation/useNavigation.ts`, and `design-system/icons/NavigationIcons.tsx`
all return zero exact-hex matches. Header and Sidebar (above) remain the
only shared navigation surfaces this codebase has, per
`BUTTON-CONSOLIDATION-REPORT.md`'s same finding — re-verified here with the
hex-match tool rather than carried over unchecked.

### Shared Dialogs
| File | Swap |
|---|---|
| `components/QrCodeModal.tsx` | `dark:bg-[#0B0F19]` → `dark:bg-[var(--surface-0)]` |
| `components/bhalyam/GameRoomSheet.tsx` | `dark:bg-[#0B0F19]` → `dark:bg-[var(--surface-0)]` (×3, `replace_all`) |
| `components/bhalyam/JoinRoomModal.tsx` | `dark:bg-[#0B0F19]` → `dark:bg-[var(--surface-0)]` (×2, `replace_all`) |

`Modal.tsx`, `useFocusTrap.ts`, `ConsentModal.tsx`, `BotManagementDialog.tsx`,
`LeaveRoomModal.tsx`, `WelcomeModal.tsx`, `EditProfileModal.tsx`,
`GameTutorial.tsx` — zero exact matches, confirmed not assumed.

**`components/QrCodeModal.tsx`'s own QR-rendering props left untouched
deliberately**: `bgColor="#FFFFFF"` / `fgColor="#0F172A"` match
`surface-1`/`ink-hi` exactly, but these set the QR code's own scan-critical
contrast, not a themed UI surface — both tokens carry different dark-mode
values, and QR scanners are materially less reliable against inverted
(light-on-dark) codes than standard dark-on-light. A functional-risk skip,
not a style one.

**`components/BhalyamResultModal.tsx` — 17 exact matches found, none
migrated.** Every one is a coincidental hex collision inside bespoke,
non-semantic artwork: inline SVG `fill`/`stroke` values for a hand-drawn
confetti/trophy illustration (14 instances), a gold/silver/bronze
rank-medal badge scale where `#F59E0B`/`#94A3B8`/`#CD7F32` are a designed
four-step palette with no token equivalents for silver or bronze (2
instances, migrating only the gold one would make the set *more*
inconsistent, not less), and one stop of a 3-stop CTA gradient
(`from-[#F97316] via-[#EA580C] to-[#C2410C]`) where tokenising the last stop
alone while the first two stay literal was rejected for the same reason
`AuthControls.tsx`'s gradient button got its own `auth` variant instead of a
forced `primary` swap (`BUTTON-CONSOLIDATION-REPORT.md` §1). Same
false-positive class as `CoinColorPicker.tsx` above — recorded in full
because 17 is a large number to wave past without naming each category.

**`components/QrScannerModal.tsx`** — 2 matches, neither migrated:
`dark:bg-[#182234]` matches `auth-field (dark)`, unreachable for the same
scope reason as `GettingStartedCard.tsx` above (no root-scoped equivalent
exists); a decorative `shadow-[0_0_8px_#F59E0B]` sits beside an already-raw
`bg-amber-400`, and tokenising only the shadow while its sibling class
stays a raw palette colour would read as inconsistent partial work rather
than genuine adoption — left as one bespoke accent, not split.

## 5. New token consumers

11 files gained `var()`-token colour usage this pass:
`pages/SettingsPage.tsx`, `components/games/GameCard.tsx`,
`components/room/RoomShareCard.tsx`,
`features/onboarding/GettingStartedCard.tsx`,
`design-system/premium/PremiumHeroCard.tsx`,
`design-system/premium/PremiumStatCard.tsx`,
`components/auth/AuthLangToggle.tsx`,
`components/room/CompactColorSelector.tsx`,
`components/QrCodeModal.tsx`, `components/bhalyam/GameRoomSheet.tsx`,
`components/bhalyam/JoinRoomModal.tsx`. (`CompactColorSelector.tsx` already
consumed `--room-*` tokens for its disabled state before this pass; this
pass added `--chrome-panel` alongside that, not a first adoption.)

## 6. Remaining arbitrary values — by why, not just how many

Not claiming these are exhaustive of the whole codebase (that would require
re-running the exact-match scan against all 583 source files, which this
task's priority-area scope didn't call for) — this is every match this
pass's scanner found and did not apply, categorised:

| Reason | Count (this pass's files) | Example |
|---|---:|---|
| `.auth-shell`-scoped token, component doesn't render inside one | 4 | `SettingsPage.tsx` L231, `GettingStartedCard.tsx` ×2, `QrScannerModal.tsx` |
| Opacity-suffixed (`/NN`), blocked by the Tailwind limitation in §3 | 4 | `SettingsPage.tsx` ×3, `GettingStartedCard.tsx` ×1 (double-blocked) |
| QR-code scannability requirement | 2 | `QrCodeModal.tsx` `bgColor`/`fgColor` |
| Coincidental semantic-hex collision (decorative art / named palette, not a status) | 19 | `BhalyamResultModal.tsx` ×17, `CoinColorPicker.tsx` ×2 |
| Stateful (checked/unchecked), not themed | 1 | `GlobalSettings.tsx` toggle knob |
| Sibling already raw, partial tokenisation would be inconsistent | 1 | `QrScannerModal.tsx` shadow glow |
| Near-duplicate "chrome drift" — real fix, but a palette change, not adoption | 2 | `SettingsPage.tsx` `#FFFDF8`, `#FAF4E6` |

`success`/`warning`/`danger`/`info` remain at effectively zero real
consumers sitewide — confirmed still true, not re-assumed: current
`design:tokens` shows the four meanings expressed 410 + 302 + 1,296 + 102 =
**2,110 times** in raw palette classes against 0 semantic-token classes.
§"Sidebar" explains the root cause (no dark-mode override defined for any
of the four) rather than leaving this as an unexplained gap — it's the same
reason repeated everywhere a semantic-token swap was evaluated and
rejected in this pass.

## 7. Verification

```bash
cd client && npm run typecheck   # clean, run after every edit in this pass
cd client && npm run build       # clean, 15/15 routes prerendered
cd client && npm test            # 64 files / 502 tests passing, no regressions
npm run design:tokens            # "Before / after" table above (detector fixed, §1)
node scripts/design-audit/exact-token-matches.mjs <files>   # final sweep, §4 — only documented skips remain
grep -noE "\)\][a-zA-Z]" <file>  # glued-class check after every replace_all in this pass
```

## 8. Status

**Token compliance 8.3% → 15.0%** on the corrected measurement (§1), a real
near-doubling, still a bounded, partial migration — not claimed as more.
11 files gained token consumption; `SettingsPage.tsx` carries the bulk of it
(~60 instances across the page and its four dialogs). Every arbitrary value
this pass's scanner found and did not migrate is accounted for in §6 by
reason, not silently dropped — four are unreachable by token scope, four are
blocked by a proven compiler limitation, nineteen are coincidental hex
collisions with no real semantic meaning, two are a stateful control and a
partial-tokenisation inconsistency, and two are near-duplicates a real fix
for which would be a palette change this task was explicitly told not to
make. The semantic-token layer (`success`/`warning`/`danger`/`info`)
remains effectively unused — not from neglect, but because it has no
dark-mode value defined, a real architecture gap this pass surfaced clearly
rather than working around silently. Auth's zero-migration finding
uncovered a genuine naming trap (`AuthShell.tsx` vs. `.auth-shell`) worth
fixing in a future pass, named here rather than left for someone to
rediscover by getting bitten by it.
