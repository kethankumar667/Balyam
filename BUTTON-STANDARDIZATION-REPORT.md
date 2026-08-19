# Button Standardization — Report

Phase 4 of the P0/P1 Design & Trust Remediation plan. Confirmed approach:
fix and adopt the existing `client/src/design-system/dls/Buttons.tsx`, not a
third system, per `AGENTS.md` rule 3. Sequenced after touch targets (Phase 5)
deliberately, per the plan — so a shared `Button` with a ≥44px floor could be
checked against a baseline that already existed, not asserted against one
measured after the fact.

## 1. The component: fixed, not replaced

| Defect (plan's diagnosis) | Fix |
|---|---|
| Dark-only (`stone-*`, `text-zinc-950`) on `secondary`/`ghost` | Routed through `surface-*` / `ink-*` — Tailwind utilities already backed by `--surface-N` / `--text-*` CSS variables that resolve per theme (`index.css`), not new tokens invented for this |
| `font-mono uppercase tracking-wider` baked into every variant | Moved into `tournament`/`reward` only — the two genuinely celebratory game-CTA variants (`AGENTS.md` §8 sanctions bespoke in-game treatment). `primary`/`secondary`/`ghost`/`danger` now render as normal text, appropriate for chrome actions like "Sign out" |
| `sm` 36px / `md` 42px — both under 44px | `sm` → 44px, `md` → 48px, `lg` → 52px |
| No icon-only variant | Added: `size="iconOnly"` — 44×44px, hides the label visually via `sr-only` rather than dropping it (an icon-only button still needs an accessible name) |
| `active:scale-97` | Confirmed compiling — `scale: { 97: "0.97" }` was added to `tailwind.config.js` during the earlier token-fix pass this plan's Phase 3 baseline was measured after |

`primary`/`tournament`/`reward`/`danger` keep their brand-gradient fills and
fixed dark ink (`text-zinc-950` on `bg-amber-500`, etc.) **unchanged and
deliberately** — a gradient fill doesn't need a light/dark variant, and dark
ink on a fixed light-ish accent color is correct in both themes. Only the
two variants that were standing in for *neutral chrome* (`secondary`,
`ghost`) had a real dark-mode bug, and those are what changed.

**A design-lint false positive, checked and left alone:** the repo's
`impeccable` hook flagged `text-zinc-950` on `bg-amber-500` (`primary`) as
"gray text on colored background." `zinc-950` is `#09090b` — near-black, not
a washed-out mid-gray — against `amber-500`'s luminance this computes to
roughly 10:1, well past WCAG AA's 4.5:1. The identical pairing appears
unflagged on the `tournament`/`reward` variants two lines away (both use
`bg-gradient-to-r`, which the hook's colour extraction apparently doesn't
parse the same way as a flat `bg-*`), which is itself evidence the flag is a
heuristic gap, not a real defect — a genuinely low-contrast pairing wouldn't
selectively appear on only the non-gradient case. Left unchanged; not
suppressed via a rule exception, since it wasn't introduced by this change
and doesn't need one — noted here so the finding isn't silently unexplained.

## 2. What was actually migrated — and what was deliberately not

**Migrated:** `SettingsPage.tsx`'s "Sign Out" control — a plain icon+label
action with no locally-meaningful bespoke state, previously a raw `<button>`
with hand-written orange-outline styling under the 44px floor. Now
`<SecondaryButton size="sm" leftIcon={...}>`.

**Inspected and deliberately left bespoke**, because migrating them would
trade an already-good, purpose-built system for a worse-fitting generic one
— not because they weren't checked:

- **`AppHeader.tsx` / `AppSidebar.tsx`** — already run on their own
  `--chrome-*` token system (`--chrome-panel`, `--chrome-ink`, `--chrome-accent`,
  etc.), built and documented specifically to stop chrome colours drifting
  off the rest of the app (its own comment: *"Every colour here used to be a
  raw hex inside an `isDark` ternary... `--chrome-*` tokens... state intent
  once, theme resolves it"*). Its icon buttons are already 44×44px. Replacing
  a working, already-consistent, already-accessible local system with the
  DLS button to satisfy an adoption count would be exactly the kind of
  incidental redesign the plan rules out.
- **`AuthControls.tsx`'s `SubmitButton` / `GoogleButton` / `GuestButton`** —
  hand-built specifically so the auth flow "feels like the same product as
  joining a room, rather than a bolted-on account system" (its own comment).
  These are cohesive, deliberate, and already internally consistent with
  each other. Forcing them onto a generic amber/stone button would break
  that cohesion for no accessibility or consistency gain — they already
  clear 44–56px and already use their own theme-appropriate palette.
- **`LobbyActionBar.tsx`'s "I'm Ready" / "Start Game"** — state-dependent
  gradient fills, a pulse animation when the host can start, and conditional
  ring glows communicating readiness. This is the single most important
  action in a room's lifecycle and its visual state *is* the information.
  DLS `Button` has no mechanism for conditional per-state styling; adding
  one to force this specific pair through it would be a component-API change
  in service of a metric, not a real improvement. Left as the kind of
  bespoke in-game control `AGENTS.md` §8 sanctions.

This is a narrower result than the plan's five-item list implied going in.
Reported as what was actually found: three of the five named areas already
had a locally-consistent, deliberately-designed system, and migrating them
would have cost real, working design for the sake of a bigger number.

## 3. Measurement

Before (plan's Phase 3 baseline) / after, via `npm run design:components`:

| Metric | Before | After |
|---|---:|---:|
| Distinct chrome signatures (radius × weight) | 22 | 22 |
| Raw `<button>` implementations | 706 | 702 |
| DLS `Button` adoption (files) | 1 (catalogue page only) | **3** |

**The signature count did not move, and reporting it as unchanged would be
misleading in the other direction if left unexplained.** `Buttons.tsx`
composes its className from two function calls
(`getSizeStyles()`/`getVariantStyles()`), not a static string — the
signature detector reads literal `rounded-*`/`font-*` text out of JSX source,
so a button's shape assembled at runtime is invisible to it by construction,
independent of how many call sites adopt the component. This is a limit of
static-analysis measurement, not evidence that adoption produced zero
consistency gain — the honest, attributable signal is the adoption count
(1 → 3 files) and the specific control that changed (§2), not a metric this
migration pattern cannot move.

The 4-button drop in the raw count (706 → 702) is not fully attributable to
this phase — only one raw `<button>` was converted here (Sign Out); the
remainder reflects other, unrelated concurrent edits elsewhere in the
working tree at measurement time, not claimed as this phase's work.

## 4. Verification

```bash
cd client && npm run typecheck   # clean
npm run design:components        # §3's table
```

## 5. Status

**Foundation fixed, adoption narrow and deliberate.** The component itself
is now theme-aware, correctly sized, and has an icon-only variant it lacked
— real, verifiable fixes, not aspirational ones. Migration is one genuine
call site, with the other four plan-named areas inspected and left as
reasoned exceptions rather than forced. Consistent with the plan's own
"Honest expectation": foundations correct, migration partial and measured,
not comprehensive.
