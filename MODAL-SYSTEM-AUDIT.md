# Modal System Audit — Sprint B

Phase 3 of the P0/P1 Design & Trust Remediation plan. Scope: fix the modal-audit
contradiction the plan was commissioned to resolve, extract one accessible
`<Modal>` from the four correct existing implementations, and migrate the nine
named dialogs onto it. All figures below are measured, not estimated, and every
figure names the command that produced it.

## 1. The conflict, resolved

Two prior audits of the same codebase disagreed about how many dialogs had a
focus trap. Both are corrected on the record here:

| Audit | Focus traps reported | Why |
|---|---:|---|
| Audit A | 0 | Detector regex matched only named helpers (`useFocusTrap`, `trapFocus`, `FocusTrap`) |
| Audit B | some (unspecified) | Manual spot-check found real traps the regex missed |
| **Ground truth, pre-migration** | **4** | `LeaveRoomModal`, `BotManagementDialog`, and two others each independently hand-rolled the identical ~25-line pattern: `e.key === "Tab"` + a focusable-element query. Verified by reading all four. |

**Root cause:** BHALYAM's four traps were inline, not routed through a shared
helper, so a name-only grep found nothing. `scripts/design-audit/components.mjs`
was fixed to also detect the inline pattern (Tab-key handler **and** a
focusable-element query co-occurring in the same file) — that fix, made during
planning, is what produced the correct "4" baseline this phase started from.

**A second, related contradiction was found and fixed during this phase.**
Once the four traps were extracted into one shared `useFocusTrap` hook behind
`<Modal>`, the *same* detector started reporting **0 traps and 0 restorations
again** — not because the behavior regressed, but because consumers now
express "has a trap" by rendering `<Modal open onClose=...>`, a pattern the
detector had no way to recognize. Two bugs compounded this:

1. **No JSX-usage detection.** The detector only ever looked for the
   substring `useFocusTrap`. None of the nine migrated *consumer* files call
   that hook directly — only `Modal.tsx` does — so every consumer read as
   "no trap," undercounting real coverage by 9.
2. **Line-ending sensitivity.** The first fix attempt used `<Modal[ \t\n]` to
   distinguish real JSX usage (`<Modal\n open=...`) from this script's own
   prose mentions of the component (`<Modal>`, no attributes — a form no
   real call site ever uses, since every one passes at least `open`). That
   regex silently failed on the repo's CRLF files, since `\t\n` doesn't match
   `\r`. Fixed to bare `\s`, which matches either line ending; re-verified
   with a direct multiline search against all nine consumer files before
   trusting the fix (0 false positives, 0 false negatives across the repo).

`scripts/design-audit/components.mjs` now counts a file as having a trap /
restoration if it implements one inline **or** renders `<Modal>` / calls
`useFocusTrap` as real code (not prose). An `Escape closes dialog` row was
added for the same reason — the plan's baseline table has a row for it and
the script previously had no way to reproduce that number at all.

## 2. What was built

- **`client/src/hooks/useFocusTrap.ts`** — the one implementation, extracted
  from the four that already existed (closest reference: `LeaveRoomModal`).
  Owns: initial focus, Tab/Shift+Tab cycling, Escape (only if `onClose` is
  passed), and **focus restoration** — the one piece none of the four
  originals had.
- **`client/src/components/Modal.tsx`** — the dialog shell built on it. Adds
  `role="dialog"`, `aria-modal`, body-scroll lock, backdrop-click-to-close,
  a `mobileSheet` layout (bottom sheet on mobile / centered ≥`md`, the
  pattern `AGENTS.md` §6.1 requires), and one canonical backdrop
  (`bg-black/80 backdrop-blur-md` — already the single most-used opacity and
  blur step in the codebase, made the standard instead of one of fifteen).
  An optional `zIndex` prop was added for the one dialog (`ConsentModal`)
  that must legitimately out-rank every other dialog it could coexist with.

## 3. Migrated: all nine named dialogs, plus the second GameRoomSheet dialog

| # | Dialog | File | Notes |
|---|---|---|---|
| 1 | LeaveRoomModal | `client/src/components/room/LeaveRoomModal.tsx` | Reference implementation for the extraction |
| 2 | BotManagementDialog | `client/src/components/room/BotManagementDialog.tsx` | |
| 3 | GameRoomSheet (main) | `client/src/components/bhalyam/GameRoomSheet.tsx` | |
| 4 | GameRoomSheet → UnavailableGameSheet | `client/src/components/bhalyam/GameRoomSheet.tsx` | Second, distinct dialog in the same file — previously had **zero** trap/Escape/aria of any kind |
| 5 | JoinRoomModal | `client/src/components/bhalyam/JoinRoomModal.tsx` | `QrScannerModal` deliberately kept as a DOM **sibling**, not nested inside `<Modal>` — it is its own independent dialog with its own Escape handler; nesting it would have put its focusables inside this dialog's trap query and put two Escape handlers on `window` at once |
| 6 | ConsentModal | `client/src/components/privacy/ConsentModal.tsx` | Deliberately **no `onClose`** — first-run consent must be answered, not dismissed; `Modal`'s documented mechanism for a non-dismissible dialog. `zIndex={60}` preserves its original "must out-rank everything" requirement |
| 7 | WelcomeModal | `client/src/features/onboarding/WelcomeModal.tsx` | Previously had **no** `role`, `aria-modal`, trap, Escape, or restoration at all — the least accessible of the nine before this pass. `onClose` wired to the existing "Skip Intro" handler, so Escape now does what Skip already did |
| 8 | QrCodeModal | `client/src/components/QrCodeModal.tsx` | |
| 9 | GameTutorial | `client/src/components/GameTutorial.tsx` | Shared by every game board that doesn't ship a bespoke tutorial deck — one migration fixes the "how to play" dialog for all of them at once |
| 10 | EditProfileModal | `client/src/features/profile/EditProfileModal.tsx` | |

**Deliberately not migrated in this pass:** the remaining ~57 `fixed inset-0`
overlays across the codebase (toasts, tooltips, non-dialog scrims, and
dialogs outside the plan's named list). Tracked as remaining debt in §7, not
silently dropped.

## 4. Before / after — measured via `npm run design:components`

| | Before | After | Command |
|---|---:|---:|---|
| `fixed inset-0` overlays | 87 | 79 | `npm run design:components` |
| …across files | 67 | 59 | same |
| `role="dialog"` occurrences | 40 | 33 | same |
| `aria-modal` occurrences | 39 | 31 | same |
| **Dialogs with a focus trap** | **4** | **10** | same |
| **Dialogs with focus restoration** | **0** | **10** | same |
| Dialogs with Escape-to-close | 13 | 18 | same |
| Distinct backdrop opacities | 15 | 15 | same |
| Distinct backdrop blur steps | 5 | 5 | same |

**Read the source-count rows (overlays, `role="dialog"`, `aria-modal`)
carefully — they go *down*, not up, and that is correct.** These count
literal text in source files. Before this phase, every dialog's markup was
its own copy, so ten dialogs meant ten occurrences. After, nine consumer
files render `<Modal>` and the `role="dialog"` text exists **once**, in
`Modal.tsx` — ten working dialogs now produce two-digit-lower source counts.
Consolidation is supposed to shrink this number; a raw grep count is the
wrong instrument for "how many dialogs are accessible now," which is why the
trap/restoration/Escape rows above are counted differently (inline pattern
**or** real `<Modal>`/`useFocusTrap` usage) rather than by raw text count.

**Backdrop opacity/blur variance did not move.** Nine dialogs now share one
backdrop treatment, but "15 distinct opacities" and "5 blur steps" are
codebase-wide totals that include non-dialog uses of `bg-black/N` (scrims,
overlays, loading states) this phase never touched. Full migration of all 87
overlays is explicitly out of scope per the plan — reported here as an
unmoved number rather than a claimed one.

## 5. Ten-point success criteria, per dialog

Per the plan: **a dialog that passes nine criteria and fails one is recorded
as fail, not partial.** Two tiers of evidence below, clearly separated —
live-browser-verified against the production build, and code-verified. They
are not the same claim.

### 5a. Live-verified (4 of 10) — `client/scripts/design-audit/modal-verification.mjs`

Run against `client/dist` (production build, `npm --prefix client run build`)
served on a fixed origin the backend's real `CLIENT_ORIGIN` CORS allowlist
was configured to accept — not the dev server. Real Chromium via Playwright,
axe-core for the accessibility pass, all ten Tab/Shift+Tab presses driven
through the actual keyboard input pipeline. Full output:
`MODAL_VERIFICATION_RESULTS.json` (repo root).

| Criterion | ConsentModal | WelcomeModal | JoinRoomModal | GameRoomSheet |
|---|:---:|:---:|:---:|:---:|
| Initial focus moves into the modal | PASS | PASS | PASS | PASS |
| Tab cycles within the modal (15 presses) | PASS | PASS | PASS | PASS |
| Shift+Tab cycles within the modal (15 presses) | PASS | PASS | PASS | PASS |
| Escape closes dismissible dialogs | N/A¹ | PASS | PASS | PASS |
| **Focus returns to the invoking element** | N/A² | N/A³ | **PASS** | **PASS** |
| Keyboard-only navigation end to end | PASS | PASS | PASS | PASS |
| `role="dialog"` present | PASS | PASS | PASS | PASS |
| `aria-modal="true"` present | PASS | PASS | PASS | PASS |
| axe-core: zero violations (WCAG 2.1 A+AA) | PASS | PASS | PASS | PASS |
| Verified against the production build | PASS | PASS | PASS | PASS |
| **Result** | **PASS** (9/9 applicable) | **PASS** (9/9) | **PASS 10/10** | **PASS 10/10** |

¹ ConsentModal is intentionally non-dismissible — the correct, verified
behavior is that Escape does **nothing** (checked directly: dialog still
open, still trapped, after Escape). Counted as satisfying the criterion's
intent ("Escape closes *dismissible* dialogs") rather than N/A-as-untested.

² Same dialog — no close-on-Escape means no restoration path to test.

³ WelcomeModal auto-opens from a 600ms timer, not a user click — there is no
"invoking element" to restore to. The mechanism (`useFocusTrap`) is identical
to JoinRoomModal's, which **is** verified below, so restoration is
mechanically present; it has no meaningful specific target to assert against
for this one dialog.

**This is the finding the plan flagged as most likely to be quietly
skipped**, so it gets its own paragraph: `focusRestoredToTrigger` failed on
the first run of this script, for both JoinRoomModal and GameRoomSheet.
Investigating rather than reporting that number required isolating a
separate, real, pre-existing bug — see §6 — from an actual regression.
After fixing the test methodology (not the product) to account for that bug,
both pass, confirmed with the exact same DOM element handle captured before
open and re-checked as `document.activeElement` after close, not a
same-selector re-query.

### 5b. Code-verified (6 of 10) — not independently driven through a live browser session in this pass

LeaveRoomModal, BotManagementDialog, QrCodeModal, and UnavailableGameSheet
require an active multiplayer room (a real Socket.IO session); EditProfileModal
requires a signed-in member (Supabase auth); GameTutorial requires a mounted
game board. Standing up all three prerequisites live was judged disproportionate
to what it would add: all six render the *identical* `<Modal>` component
already proven correct in §5a — a mechanism bug would surface identically in
all ten, and no per-dialog logic re-implements any part of the trap,
restoration, or Escape handling. What's per-dialog is only the props passed to
`<Modal>`, and that was checked directly by reading the rendered JSX of all
six call sites:

| Dialog | `open` | `onClose` | `initialFocusRef` | `ariaLabelledBy` → real heading id |
|---|:---:|:---:|:---:|:---:|
| LeaveRoomModal | ✓ | ✓ | ✓ (`cancelBtnRef`, the safe action) | ✓ `leave-modal-title` |
| BotManagementDialog | ✓ | ✓ | ✓ (`inputRef`) | ✓ `bot-dialog-title` |
| QrCodeModal | ✓ | ✓ | ✓ (`copyLinkBtnRef`) | ✓ `qr-modal-title` |
| EditProfileModal | ✓ | ✓ | ✓ (`nameInputRef`) | ✓ `editProfileTitle` |
| GameTutorial | ✓ (always-open while mounted) | ✓ (`done`, same handler Skip/✕/Next-on-last-slide already used) | ✓ (`nextBtnRef`) | ✓ `game-tutorial-title` |
| UnavailableGameSheet | ✓ | ✓ | — (falls back to first-focusable; single-CTA dialog, no meaningful alternative target) | ✓ `game-unavailable-title` |

Each: `role="dialog"`, `aria-modal="true"` present by construction (owned by
`Modal.tsx`, not re-implemented per file — confirmed for all ten in §4's
"10 dialogs with a trap" listing). Typecheck, production build, and the full
test suite (501/501) pass with all six included. **Recorded as code-verified,
not as a live pass** — the distinction is deliberate, not a rounding error.

## 6. A pre-existing bug, re-confirmed and newly explained — not this phase's to fix

`TRUST-REMEDIATION-REPORT.md` §5 (Phase 1, earlier in this same effort)
already found and filed React hydration errors (#418/#422/#425) on the
production build, confirmed there as pre-existing and out of scope. This is
the same bug, not a second one — re-encountered independently while tagging
DOM elements to test focus restoration, with one new piece of information
Phase 1 didn't need: its exact consequence for anything that captures a DOM
reference early. `/` (guest, consent already granted, onboarding already
completed — realistic returning-guest localStorage state) threw React error
#418 then #422 in the browser console within ~150ms of the join-room button
becoming visible. Decoded: **a hydration mismatch, which React recovers from
by discarding the server-prerendered subtree and client-rendering it again
from scratch.**

Confirmed, not guessed — timestamped reproduction:

```
[7761ms] trigger visible
[7913ms] [pageerror] Minified React error #418
[7947ms] [pageerror] Minified React error #422
```

A DOM handle captured *before* this settles goes stale — the element it
pointed to is destroyed and rebuilt — which looks identical to "focus
restoration is broken" from the outside. A handle captured *after* a few
seconds' settle is stable through the rest of the session (confirmed by
polling it every 200ms for 2s with no drop). That is what separated this
from a real Sprint B regression: the same button, tagged 3 seconds later,
survives open → close intact and correctly receives focus back.

**This is not a modal-system defect** — `useFocusTrap` doing nothing when
`document.contains(toRestore)` is false is the hook's own documented,
correct, defensive behavior (see its docstring: "a re-render can have
unmounted it between open and close"). It just means *this specific
unmounting* has a real, separate cause upstream of anything this phase
touched: SSR/prerendering (`vite-plugin-ssr`-style prerender, per the build
output's `[Prerender] Generating static HTML for 15 public routes`) producing
markup that doesn't match first client render, at least under a guest with
this exact localStorage shape. **Filed here, not fixed here** — it is a
prerendering bug, not a dialog bug, and fixing it is outside this phase's
scope. Flagged for separate follow-up.

## 7. Coverage boundary — what this phase did not touch

- **~57 remaining `fixed inset-0` overlays** across ~50 files not on the
  plan's named list (toasts, tooltips, in-game HUD overlays, scrims). Not
  migrated. `npm run design:components` still lists the top concentrations
  (`RummyBoardMobile.tsx` highest at 10).
- **Backdrop opacity/blur variance** (15 / 5) is unchanged codebase-wide, for
  the reason in §4.
- **6 of 10 migrated dialogs** are code-verified, not live-browser-verified,
  per §5b.
- **The hydration-mismatch bug in §6** is discovered and documented, not
  fixed.

## 8. Reproduce these numbers

```bash
cd client && npm run typecheck && npm run build && npm test   # 501/501
npm run design:components                                     # §4's table
node client/scripts/design-audit/modal-verification.mjs       # §5a — needs client/dist and a backend
                                                                # reachable at the CLIENT_ORIGIN it serves from
```
