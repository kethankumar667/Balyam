# Button Consolidation — Report

Increases adoption of the existing `client/src/design-system/dls/Buttons.tsx`
component across the priority order given: Header, Sidebar, Auth, Settings,
Shared Navigation, Shared Forms, Room Chrome. No new Button component was
created — two new **variants** and one **size-independent capability**
(`ref` forwarding) were added to the existing one, each because a real
migration in this pass needed it; both are explained in §1. Gameplay
controls, board interactions, card actions, and turn controls were not
touched, per instruction — see §5 for what was found in that category and
deliberately left alone.

## Before / after

| Metric | Before | After | Command |
|---|---:|---:|---|
| Distinct button signatures (radius × weight) | 22 | 22 | `npm run design:components` |
| DLS Button consumers (files) | 3 | **8** | same — see note below |
| Raw `<button>` implementations | 706 | **689** | same |

**The signature count not moving is expected, not a null result** — carried
over from the prior button-fix pass: `Buttons.tsx` composes its className
from two function calls, not a static string, so the detector that reads
literal `rounded-*`/`font-*` text out of JSX source cannot see a
DLS-rendered button's shape regardless of how many callers adopt it. The
attributable signal is the consumer count and the raw-tag delta, not this
metric — reported as unmoved and explained, not left to look like nothing
happened.

**The consumer count needed a detector fix mid-pass.** `components.mjs`'s
"Files referencing DLS Buttons" originally matched only the five named
wrapper exports (`PrimaryButton`, `SecondaryButton`, etc.) — `AppHeader.tsx`
and `AuthControls.tsx` both call the base `<Button variant="...">` directly
and were invisible to it, undercounting real adoption the moment this pass
reached for the base component instead of a wrapper. Fixed to also match
real `<Button\s` JSX usage (excluding this script's own prose mentions of
the component by name, same precision already applied to the `<Modal\s`
detector in `MODAL-SYSTEM-AUDIT.md` §1). Before/after above uses the fixed
detector on both sides.

**8 files undercounts real reach.** `AuthControls.tsx`'s `SubmitButton` is
consumed by `LoginPage.tsx`, `SignUpPage.tsx`, `ForgotPasswordPage.tsx`,
`ResetPasswordPage.tsx`, and `VerifyEmailPage.tsx` — one migration, five
screens' primary CTA. The file-count metric, by construction, credits the
one file that changed, not the N that inherit it.

## 1. Component changes — why each was needed, not created speculatively

| Change | For | Why not achievable with what already existed |
|---|---|---|
| `variant: "chrome"` | `AppHeader.tsx`'s 3 icon buttons | `secondary` resolves through `surface-*`/`ink-*` (cooler, slate-toned) — sitting a `secondary`-styled icon button on the header's warm parchment `--chrome-panel` background would read as a mismatch, not a consolidation. `chrome` uses the exact `--chrome-control`/`--chrome-border`/`--chrome-ink` values `AppHeader.tsx`'s own `CONTROL` constant already defined — same look, now behind the shared component instead of a third copy of it. |
| `variant: "auth"` | `AuthControls.tsx`'s `SubmitButton` | Differs from `primary` on two CSS properties at once (a 3-stop gradient **and** white text, vs `primary`'s flat fill and near-black text). One of those two is safe to override via a caller's `className` (`background-image` doesn't compete with `primary`'s `background-color` — different properties) but the other isn't (`text-white` fighting `text-zinc-950` for the same `color` property is the exact same-specificity Tailwind-ordering gamble this codebase was already burned by once — see `MODAL-SYSTEM-AUDIT.md`'s z-index note). A real, distinct look, not a duplicate. |
| `React.forwardRef` on `Button` and all five named wrappers | `LeaveRoomModal.tsx`'s "Stay Here" | `<Modal initialFocusRef>` needs a real DOM node to call `.focus()` on. `Button` was a plain `React.FC` — a `ref` passed to it was silently dropped, which would have made "Stay Here" the initial-focus target in name only. This was a **latent gap**, not something this migration introduced: any future consumer needing a button ref would have hit the same silent failure. Verified, not assumed — see §2. |

## 2. Verification of the `forwardRef` fix

Added as a permanent test (`client/src/design-system/__tests__/dlsSystem.test.tsx`,
"forwards a ref through SecondaryButton to the real `<button>`, and Modal's
`initialFocusRef` focuses it") rather than a one-off check — this is exactly
the chain the plan's own modal-restoration work already flagged as the
criterion most likely to be silently broken, and it now has a standing
regression test instead of one-time confidence:

```
npx vitest run src/design-system/__tests__/dlsSystem.test.tsx
✓ forwards a ref through SecondaryButton to the real <button>, and
  Modal's initialFocusRef focuses it
Test Files  1 passed (1)  ·  Tests  8 passed (8)
```

## 3. What was migrated, by priority — file-level evidence

### Header
`client/src/components/layout/AppHeader.tsx` — 3 of 4 raw buttons:

| Control | Before | After |
|---|---|---|
| Mobile menu toggle | `<button className={CONTROL}>` | `<Button variant="chrome" size="iconOnly">` |
| Notifications (+ unread badge) | `<button className={\`relative ${CONTROL}\`}>` | `<Button variant="chrome" size="iconOnly" rightIcon={badge}>` |
| Theme toggle | `<button className={CONTROL}>` | `<Button variant="chrome" size="iconOnly">` |

**Not migrated, deliberately: the profile chip** (avatar + name + guest
badge + chevron, responsive `w-11 md:w-auto`). Considered and rejected —
its structure doesn't fit `leftIcon`/`children`/`rightIcon` without either
losing the responsive collapse behavior or adding a variant shaped for
exactly one caller. Left as a raw button; not silently skipped.

**Not migrated: the Settings control.** It's a `<Link to="/settings">`, not
a `<button>` — already outside the raw-button count this task measures, and
converting real navigation into a `<button onClick={navigate}>` would
regress right-click/Cmd-click/middle-click behavior for no consolidation
gain.

### Sidebar
`client/src/components/layout/AppSidebar.tsx` — **inspected, 0 migrated,
and reported as such rather than forced.** Its `<button>` wrapper (the
`item.action`-based branch of `renderItem`) is deliberately near-empty —
`"w-full text-left block rounded-2xl focus:outline-none focus:ring-2..."`
— specifically so the complex `content` div inside it (icon + label + badge
+ active-state rail, full custom padding and radius) renders untouched.
`Button`'s own size/variant classes would apply *in addition to* `content`'s
identical concerns, double-padding and radius-conflicting a treatment that
already works. Both nav-item render paths (`<Link>` for `item.fullHref`,
`<button>` for `item.action`) need to stay visually identical to each
other, which a partial migration of only the button branch would break.

### Auth
`client/src/components/auth/AuthControls.tsx` — `SubmitButton` (1 shared
component; 5 screens inherit it — see above). `GoogleButton` **not
migrated**: third-party OAuth buttons carry their own branding convention
(a recognizable white/logo treatment), and re-skinning it through a generic
variant risks the control reading as something other than "sign in with
Google" — left alone deliberately, not overlooked. `GuestButton` is a
`<Link>`, not applicable to this task for the same reason as Header's
Settings control.

### Settings
`client/src/pages/SettingsPage.tsx` — 8 buttons this pass, plus the "Sign
Out" control already migrated in the prior remediation phase (9 total):

| Control | Variant |
|---|---|
| Edit Display Name — close (✕) | `SecondaryButton size="iconOnly"` |
| Edit Display Name — Save Name | `Button variant="primary"` |
| Change Password — close (✕) | `SecondaryButton size="iconOnly"` |
| Change Password — Update Password | `Button variant="primary"` |
| Erase Everything — close (✕) | `SecondaryButton size="iconOnly"` |
| Erase Everything — Cancel | `SecondaryButton` |
| Erase Everything — Erase Data | `Button variant="danger"` |

All three close (✕) buttons were 32×32px (`w-8 h-8`) before this pass —
under the 44px touch floor. `size="iconOnly"` is 44×44, so this migration
closes a touch-target gap as a side effect, not just a signature one.

**Found, not yet migrated: these three panels are themselves unmigrated
modals** (`fixed inset-0` with no `role="dialog"`, no focus trap, no
Escape handling). Out of a button-consolidation task's scope to fix — see
`MODAL-CONSOLIDATION-REPORT.md` §4 for what was done about it there.

Toggle switches (sound/haptics on-off) and the light/dark mode picker cards
were **not** migrated — they're stateful selectors with their own
pressed/unpressed visual language, not one-shot CTAs, the same reasoning
`BUTTON-STANDARDIZATION-REPORT.md` already applied to `LobbyActionBar`'s
"I'm Ready".

### Shared Navigation
Header and Sidebar (above) are the shared navigation surfaces this
codebase has. No additional distinct "shared navigation" component was
found beyond them and `navigation/navigationConfig.tsx` (pure data, no
buttons of its own).

### Shared Forms
Covered by Auth's `SubmitButton` above — it is BHALYAM's one shared,
cross-screen form-submit component. No other shared (non-per-game) form
button component was found; per-form Save/Cancel pairs inside individual
dialogs are addressed per-dialog under Settings and Room Chrome instead.

### Room Chrome
- `client/src/components/room/LeaveRoomModal.tsx` — "Stay Here"
  (`SecondaryButton`, also the ref-forwarding proof point) / "Leave Room"
  (`DangerButton`).
- `client/src/components/room/BotManagementDialog.tsx` — "Cancel"
  (`SecondaryButton`) / "Add Bot" (`RewardButton`, emerald — matches the
  original gradient's meaning and hue). Suggestion-name pills and the
  Bingo difficulty 3-way selector **not migrated** — chip-selector and
  segmented-control patterns, not CTA buttons; `Button` has no
  pressed/unpressed state concept.
- `client/src/components/InlineRoomRail.tsx` — "Copy code" / "📷 QR Code"
  (`PrimaryButton`). Both were 32-36px tall before this pass (`py-2`, no
  `min-h`) — another incidental touch-target fix. **Scope note**: this
  file's own header comment describes it as also rendering *inside* game
  board chrome (e.g. `LudoBoard`) — included here because "copy the room
  code" and "show a QR code" are unambiguously not gameplay/turn/board
  controls regardless of which layout embeds the component, not because the
  file is exempt from the exclusion list. The reaction-emoji grid and
  soundboard-clip buttons in this same file were **not** touched — genuinely
  bespoke picker UI, not CTA buttons, same reasoning as the Bingo difficulty
  selector.

## 4. What was excluded and why (gameplay/board/card/turn controls)

None were migrated. Confirmed by construction, not by omission: every file
touched in §3 is chrome (header, sidebar, auth, settings, room-level social
utility) — no `*BoardMobile.tsx`, `*BoardDesktop.tsx`, or per-game engine
file was opened for this pass. `LobbyActionBar.tsx`'s "I'm Ready"/"Start
Game" (state-driven gradients, pulse animation on ready-to-start) were
inspected in the prior button-fix pass and are exactly what "turn
controls" names — untouched here for the same reason, now doubly excluded
by this task's own instruction.

## 5. Verification

```bash
cd client && npm run typecheck   # clean
cd client && npm run build       # clean, 15/15 routes prerendered
cd client && npm test            # 64 files / 502 tests passing (501 + the new ref-forwarding test)
npm run design:components        # §"Before / after" table above
```

## 6. Status

**Real, measured, bounded adoption — not exhaustive, and not claimed to
be.** 3 → 8 consumer files (with `AuthControls.tsx` alone reaching 5
screens), 706 → 689 raw buttons, one latent correctness gap
(`forwardRef`) found and fixed with a standing test, two new variants
added only where an existing one would have caused a real visual or
accessibility regression rather than a consolidation. Sidebar was
inspected and correctly left at zero migrations — reported as a finding,
not a gap. Signature count is unchanged and explained, not hidden.
