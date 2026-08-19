# Modal Consolidation — Report

Expands adoption of the existing `client/src/components/Modal.tsx` /
`useFocusTrap.ts`. No new Modal component was created. Verifies the five
required properties — `aria-modal`, focus trap, Escape handling, focus
restoration, keyboard navigation — on both the ten dialogs already migrated
in the prior remediation pass and the five migrated in this one. Gameplay
overlays were not touched — see §4.

## Before / after

| | Before | After | Command |
|---|---:|---:|---|
| Dialogs with a focus trap | 10 | **12** *(files)* / **15** *(dialog instances — see note)* | `npm run design:components` |
| Dialogs with focus restoration | 10 | **12** / **15** | same |
| Dialogs with Escape-to-close | 18 | **19** | same |
| `fixed inset-0` overlays (source count) | 79 | **74** | same |
| `role="dialog"` occurrences (source count) | 33 | **30** | same |

**Files vs. instances**: the detector counts *files*, and `SettingsPage.tsx`
now contains four separate `<Modal>` instances (Avatar, Edit Display Name,
Change Password, Erase Everything) behind one file-level count. 12 files
covers 15 actual dialog instances (10 previous + 4 in `SettingsPage.tsx` +
1 `PartyInvitationModal.tsx`) — reported as both numbers so the file-count
metric doesn't understate real coverage.

**The source-count rows (overlays, `role="dialog"`) go down, and that's
correct, not a bug** — same reasoning as the prior pass: one shared
`<Modal>` now owns markup that used to be duplicated once per dialog, so
consolidating five more dialogs onto it *reduces* the literal text count
even as the number of *working* dialogs increases. `MODAL-SYSTEM-AUDIT.md`
§4 covers this in full; not re-derived here.

**Escape-to-close only moved by 1, not 5** — deliberately.
`SettingsPage.tsx`'s four dialogs previously shared one hand-rolled
cross-modal Escape effect, so it was *already* counted in the "18"
baseline; migrating it changed its detection mechanism, not whether it was
counted. `PartyInvitationModal.tsx` is the one dialog in this pass with
**no** `onClose` passed at all — see §3.

## 1. The five required properties, verified per dialog

Two tiers, same as the prior modal pass, and kept separate rather than
blended into one claim:

### 1a. Live-verified (production build, real Chromium, keyboard-only)

Not re-run in this pass — the mechanism (`useFocusTrap`) is unchanged from
`MODAL-SYSTEM-AUDIT.md` §5a's 34/34-check, 0-axe-violation live run against
`ConsentModal`, `WelcomeModal`, `JoinRoomModal`, and `GameRoomSheet`. Since
none of those four files were touched in this pass, that evidence still
holds and is not re-claimed here as new.

**New in this pass**: the `Button`→`Modal` `initialFocusRef` chain
(`LeaveRoomModal`'s "Stay Here", now going through `SecondaryButton` instead
of a raw `<button ref>`) is verified by a real DOM-rendering test, not just
inspection — `client/src/design-system/__tests__/dlsSystem.test.tsx`,
"forwards a ref through SecondaryButton to the real `<button>`, and Modal's
initialFocusRef focuses it":

```
✓ forwards a ref through SecondaryButton to the real <button>, and
  Modal's initialFocusRef focuses it
```

This is the one property this pass could break silently that the prior
pass's evidence doesn't cover (that pass never routed a button ref through
a DLS `Button` before) — verified rather than assumed.

### 1b. Code-verified (props inspection) — this pass's five new dialogs

| Dialog | `aria-modal`¹ | Focus trap¹ | Escape | Focus restoration¹ | Initial focus target |
|---|:---:|:---:|:---:|:---:|---|
| Avatar Picker (`SettingsPage.tsx`) | ✓ | ✓ | ✓ | ✓ | default (first focusable — no input to prioritize) |
| Edit Display Name (`SettingsPage.tsx`) | ✓ | ✓ | ✓ | ✓ | `editNameInputRef` (the name field) |
| Change Password (`SettingsPage.tsx`) | ✓ | ✓ | ✓ | ✓ | `currentPasswordInputRef` |
| Erase Everything (`SettingsPage.tsx`) | ✓ | ✓ | ✓ | ✓ | `eraseCancelBtnRef` (the safe action, not "Erase Data") |
| Party Invitation (`PartyInvitationModal.tsx`) | ✓ | ✓ | **N/A — no `onClose`, by design** | ✓ (mechanically present; no click ever triggers it) | default (Accept, first focusable) |

¹ Owned unconditionally by `<Modal>`/`useFocusTrap` regardless of props —
"✓" here means the dialog renders `<Modal>` with `open` correctly wired,
which is what makes all three apply. Confirmed by reading each call site's
actual JSX (not assumed from the component existing), file paths above.

**Keyboard navigation** (Tab/Shift+Tab cycling within the dialog): same
mechanism as focus trap, not independently toggleable — confirmed present
by the same code read, not separately live-driven for these five (§1a
explains why not, and which four dialogs *were* live-driven).

## 2. A real defect found and fixed as a prerequisite

`Button` (`design-system/dls/Buttons.tsx`) was a plain `React.FC` — it did
not forward refs. `LeaveRoomModal.tsx`'s "Stay Here" needed
`initialFocusRef={cancelBtnRef}` to reach the actual DOM button once it
moved from a raw `<button ref={cancelBtnRef}>` to `<SecondaryButton
ref={cancelBtnRef}>`; without forwarding, the ref would have silently
resolved to `null` and `useFocusTrap` would have focused nothing on open —
a regression invisible to anything but a keyboard-only pass, exactly the
class of bug `MODAL-SYSTEM-AUDIT.md` was written to stop recurring. Fixed
(`React.forwardRef` added to `Button` and all five named wrapper exports),
verified by the test in §1a, detailed in `BUTTON-CONSOLIDATION-REPORT.md`
§1-§2 since it's a `Buttons.tsx` change, cross-referenced here since it's
this report's dialogs that depend on it.

## 3. File-level evidence — what changed, and the one deliberate non-default

**`client/src/pages/SettingsPage.tsx`** — four `fixed inset-0` divs (Avatar
Picker, Edit Display Name, Change Password, Erase Everything Confirmation)
replaced with four `<Modal>` instances. The file's own shared cross-modal
Escape/scroll-lock `useEffect` (added in an earlier pass specifically
*because* no shared dialog primitive existed yet — its own comment said so)
is deleted; each `<Modal>` now owns that per-instance.

**`client/src/features/social/PartyInvitationModal.tsx`** — `fixed inset-0`
div replaced with `<Modal open ariaLabelledBy="partyInviteTitle">`, **no
`onClose` passed**. This is deliberate, not an oversight: the component has
never had a way to dismiss itself without calling `onAccept` or `onDecline`
— no such prop exists on `PartyInvitationModalProps` — so Escape or a
backdrop click closing a pending squad invitation with neither call made
would leave the inviter's request answered in the UI but not on the server.
Same precedent as `ConsentModal` (`MODAL-SYSTEM-AUDIT.md` §3): a dialog that
must be answered, not dismissed, and `<Modal>`'s own documented mechanism
for exactly that case (omit `onClose`).

Also in `PartyInvitationModal.tsx`: "Accept & Join" migrated to
`RewardButton` (an exact colour match — the raw button's `bg-gradient-to-r
from-emerald-500 to-teal-400` was already identical to the `reward` variant's
own gradient). "Decline" **not** migrated: this dialog is hardcoded dark
throughout (`SURFACES.modalHero` resolves dark in both its light and dark
branches, and nothing else in the file uses a `dark:` prefix), while DLS's
`secondary` variant is genuinely theme-aware and would turn pale in light
mode, mismatching every other surface in the same dialog. Left as its
original raw dark treatment rather than forced.

## 4. What was not migrated (gameplay overlays)

None were migrated, and none were opened for this pass. The prior modal
pass's own count of what remains — `RummyBoardMobile.tsx` (10 `fixed
inset-0` occurrences), `RummyBoardDesktop.tsx` (3), `uno-stadium.tsx` (3),
`ludo-board-composites.tsx` (2), `rotation-sync.tsx` (2) — is unchanged by
this pass; all are per-game board files. Also unchanged: `CarromBoardDesktop.tsx`,
`CarromBoardMobile.tsx`, `hc-notebook.tsx` — each has its own inline
Escape handler for an in-game overlay, left as-is for the same reason.

## 5. Verification

```bash
cd client && npm run typecheck   # clean
cd client && npm run build       # clean, 15/15 routes prerendered
cd client && npm test            # 64 files / 502 tests passing
npm run design:components        # "Before / after" table above
```

## 6. Status

**Five more dialogs migrated (15 total instances), all five required
properties present on each by construction and confirmed by reading the
actual call site, not assumed.** One real, previously-undetected defect
found (`Button` didn't forward refs) and fixed with a standing regression
test rather than a one-time check. One dialog (`PartyInvitationModal`)
correctly left non-dismissible, matching an existing precedent rather than
introducing a new dismiss path the component was never designed to have.
Gameplay overlays (Rummy, UNO, Ludo, Carrom, Hand Cricket board dialogs)
were not touched, per instruction — named, not silently left unmentioned.
