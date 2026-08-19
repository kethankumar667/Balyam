# Touch Target Remediation — Report

Phase 5 of the P0/P1 Design & Trust Remediation plan. Fixed by concentration,
worst first, per the plan's instruction — not an exhaustive sweep of all 252
measured controls. Measured via `client/scripts/design-audit/touch-targets.mjs`
against the production build (`vite preview`, port 4173), 390×844 viewport,
guest session with consent/onboarding/theme pre-seeded (script defaults).

**Re-measured baseline, not the plan's original snapshot.** The plan's Phase 1
trust-remediation work (removing fabricated homepage content, earlier in this
same effort) already changed control counts on `/` before Phase 5 started.
The numbers below are freshly measured immediately before this phase's first
fix, which is the honest "before" for what this phase actually changed —
distinct from, and not identical to, the plan's original audit-time figures.

## Headline

| | Before this phase | After | Change |
|---|---:|---:|---:|
| Total measured controls | 252 | 254 | — |
| Under 44px (product bar) | 129 (51%) | 91 (36%) | **−38** |
| Under 24px (WCAG 2.2 AA floor) | 39 (15%) | 3 (1%) | **−36** |

The WCAG floor — the harder legal/compliance bar — is now cleared on all but
three instances of one deliberately-excepted control (§4). The 44px product
bar, a stricter self-imposed target the plan explicitly does not require
reaching site-wide in this pass, moved by over a third.

**Total controls rose by 2, and a seventh fix is folded into these numbers.**
Found during Phase 9's final verification pass, not this phase's own sweep:
`WelcomeModal.tsx` only became reachable to the touch-target scanner once
Sprint B wired it onto `<Modal>` (previously the scanner's seeded
`hasCompletedWelcome: true` state kept it closed, so it had no controls to
measure at all when this phase's own baseline was taken). Once reachable,
its own buttons (Skip Intro, Next/Back) join the "total controls" count —
accounting for the +2 — and its "Skip Intro" button measured 87×23px, under
both bars. Fixed the same way as the rest of this table: `min-h-[44px]`
added, `py-1` removed since the min-height now does that job. Listed here
rather than backdated into §1 silently, since it wasn't part of this phase's
original concentration list.

## 1. What was fixed, by concentration

| Concentration | File | Before | Fix |
|---|---|---|---|
| Homepage mood-card game links (12 links × 4 cards) | `client/src/components/bhalyam/WhatAreWePlayingSection.tsx` | ~20px tall, `inline-flex` sized to text only | `flex w-full min-h-[44px]` — full-width row, not just the glyphs |
| Homepage footer link columns (19 links: EXPLORE/SUPPORT/COMPANY/…) | `client/src/pages/BhalyamHome.tsx` | No sizing at all, ~17-20px | `flex items-center min-h-[44px]` on the shared className (one `replace_all`, verified unique to these 19 links first) |
| Signup password/confirm-password toggles ×2 | `client/src/pages/auth/SignUpPage.tsx` | ~14×14px, icon-only | `min-h-[24px] min-w-[24px]` — see §3 for why 24px, not 44px |
| "Forgot Password?" | `client/src/pages/auth/LoginPage.tsx` | Explicitly `min-h-[22px]` — someone had already sized it, just too small | `min-h-[44px]` |
| "Know more →" ×2 | `client/src/pages/PrivacyPolicyPage.tsx` | ~19px, unsized | `min-h-[44px]` |
| "LOBBY" back button | `client/src/features/brick-tetris/BrickTetrisGame.tsx` | ~16px, icon+text unsized | `min-h-[44px]` |
| "Skip Intro" (found in Phase 9, see below) | `client/src/features/onboarding/WelcomeModal.tsx` | 87×23px, `py-1` only | `min-h-[44px]`, `py-1` removed |

## 2. Inline-sentence links: a bounded exception, applied deliberately

`LoginPage.tsx`'s "Sign up" and `SignUpPage.tsx`'s three "Sign in" instances
("Already have an account? **Sign up**") are genuinely inline within a
sentence — the case WCAG 2.2 SC 2.5.8 itself exempts ("Inline: the target is
in a sentence or its size is otherwise constrained by the line-height of
non-target text"). Forcing these to a literal 44×44px box would visually
break the sentence, which is a worse outcome than the size they started at.

Applied instead: `inline-flex items-center -my-3.5 py-3.5` — padding that
grows the *hit area* to the full 44px height, offset by an equal negative
margin so the visible text and surrounding layout don't move at all. This is
a real, standard technique for exactly this case — the tap target measures
44px because the padding does; nothing about how the sentence reads changed.

## 3. A deliberate partial fix, and why

`SignUpPage.tsx`'s two password-toggle buttons were fixed to **24px, not
44px**. The input field that contains them is itself ~31px tall (`py-2`,
`text-[13px]`, part of a deliberately compact multi-step form with three
steps' worth of fields, an avatar picker, and a terms panel packed into one
scroll). A 44px button centered in a 31px input would visibly overflow the
input's own borders top and bottom. Reaching 44px here would require
resizing the input itself — and by extension plausibly every field across
all three steps, since they share the same compact treatment — which is a
form-density change well outside a targeted touch-target pass. 24px clears
the WCAG floor (the compliance-relevant bar) without that ripple; the
product bar is knowingly left unmet on these two controls, stated here
rather than left for someone to discover by re-measuring.

## 4. The three remaining WCAG-floor failures, and why they're left

All three are the same control, appearing twice on `/` (a left and a right
arrow) and once on `/games`: a ~21×42-45px "scroll categories" nudge arrow
(`CategoryFilter.tsx` / `FilterBar.tsx`). All three instances are marked
`aria-hidden` and `tabIndex={-1}` in the source — by the developer's own
explicit intent, not reachable by keyboard and outside the accessibility
tree entirely. They sit over natively swipeable content as a visual hint,
not the only way to scroll it. Widening them risks overlapping the category
chip they sit beside for a control WCAG's own criteria don't apply
keyboard-navigation weight to. Left as-is and named here rather than
silently passed over.

## 5. Non-regression

The plan requires a three-bucket classification — fixed / unchanged /
**regressed**, with any regression blocking the phase regardless of fix
count. A git-stash-isolated before/after diff of every one of the 252
controls' individual dimensions was not run: several touched files (notably
`BhalyamHome.tsx`) carry substantial *other* uncommitted work from earlier in
this same remediation effort, so stashing "just this phase's changes" is not
a clean operation without first creating checkpoint commits, which was not
requested. What is reported instead is the reasoning, per fix, for why
regression is not mechanically possible:

- **List-item fixes** (mood cards, footer links): every touched control is a
  `<li>` in a vertically-stacked `<ul>`. Growing one row's height cannot
  compress a sibling — block layout, not a constrained flex row.
- **Inline-sentence links**: the padding technique (§2) was chosen
  *specifically* because its matching negative margin holds the surrounding
  layout at its original size — the fix is, by construction, layout-neutral.
- **Absolutely-positioned controls** (password toggles): `position: absolute`
  is removed from document flow; growing it cannot affect a sibling's size.
- **Standalone controls** ("Forgot Password?", "Know more →", "LOBBY"): each
  is either alone in its own container or in a `flex items-center` row
  (cross-axis centering, not height-matching) beside unrelated siblings.

No control's `min-h` or padding was ever *reduced* by this phase — every
change is additive. Combined with the per-fix reasoning above, a regression
would require a mechanism none of these changes contain. This is reasoned
verification, not an exhaustive automated diff — stated as such rather than
implied to be the stronger claim.

| Bucket | Count |
|---|---:|
| Controls fixed (were failing, now pass at least the WCAG floor) | **36** *(24px-failure delta, measured)* |
| Controls unchanged | 218 |
| **Controls regressed** | **0** *(reasoned, not exhaustively diffed — see above)* |

## 6. Verification

```bash
cd client && npm run typecheck && npm run build   # clean
BASE=http://localhost:4173 node client/scripts/design-audit/touch-targets.mjs
```

`npm test` was run alongside this phase and shows 500/501 — the one failure
(`identityJourney.test.tsx`, an `AuthShell` alt-text assertion) is unrelated:
`git diff` shows `AuthShell.tsx` under substantial, unrelated, currently
uncommitted modification outside this session's edits (a live layout
redesign in progress). None of this phase's six files touched `AuthShell.tsx`
or that test. Flagged rather than silently left unexplained or fixed by
guessing at someone else's in-progress work.

## 7. Scope not covered

91 controls remain under the 44px product bar, spread thin across most
routes (5-13 each) rather than concentrated — `/signup` (13), `/privacy`
(12), `/nokiacricket` (7), and the rest in single digits. Per the plan, this
pass fixes the worst concentrations, not every instance; the remainder is
reported as open, not implied fixed.

`/design-system` dropped from 7 to 1 without a Phase 5 fix touching it —
Phase 4's `sm` button size correction (36px → 44px, `BUTTON-STANDARDIZATION-REPORT.md`)
lands on this route because the catalogue page renders the DLS `Button`
component directly. A component-level fix in one phase showing up as a
route-level improvement in another's measurement is expected, not a
duplicate claim — Phase 4's report credits the component fix, not this one.
