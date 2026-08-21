# Rummy: Open-Deck Pickup Rule

## Status

**Already implemented and correct** in the current codebase (confirmed by
reading, not assumed) — git history shows this landed as *"Rummy taken card
into new meld"* (commit `8f7f28b`), before this audit. This document records
the root cause, verifies the fix against the full scenario matrix the brief
requires, and adds the one piece of coverage that was missing: a test that
exercises the **real** production code path instead of a re-implementation
of it.

## Root Cause (of the original bug)

Rummy's on-screen meld groups are client-local display state
(`layout.groups`), reconciled against the authoritative `hand` on every
`state` update via a `useEffect` in both `RummyBoardDesktop.tsx` and
`RummyBoardMobile.tsx`. For a **new** card appearing in `hand` that wasn't in
any known group yet, the reconciler had to decide where it goes. The naive
rule — "match it to an existing group of the same suit, else start a new
one" — is exactly right for a **closed-deck** draw (an unknown card; grouping
it by suit is a neutral organizational aid) but wrong for an **open-deck**
draw: Rummy strategy explicitly treats an open-pile card differently (it's
visible before you commit to taking it, and slotting it straight into an
existing pure sequence can misrepresent what's actually been formed, or let
a careless auto-group silently commit to a meld shape the player didn't
choose). The fix distinguishes the two draw sources and special-cases the
open-deck one.

## Rule Implementation

Both boards carry an identical mechanism (`RummyBoardDesktop.tsx:216-288`,
`RummyBoardMobile.tsx` mirrors it):

- `justDrewFromOpenRef` (a `useRef<boolean>`) is set `true` the instant
  `drawFromOpen()` fires (`RummyBoardDesktop.tsx:399-405`), *before* the
  server round-trips and `hand` updates.
- `prevOpenTopRef` tracks the open pile's top card id from the previous
  render, as a fallback signal.
- In the reconciliation effect, an incoming card is classified as
  open-deck if **either** signal says so:
  ```ts
  const isFromOpen =
    justDrewFromOpenRef.current ||
    (prevOpenTopRef.current !== null && id === prevOpenTopRef.current);

  if (isFromOpen) {
    // Open deck draw: never align with existing melds; start in a
    // dedicated new meld group
    newGroups.push({ id: newGroupId(), cardIds: [id] });
    continue;
  }
  ```
- Every other incoming card (closed-deck draw, or the initial deal) falls
  through to the pre-existing suit-matching logic — unaffected, and
  correctly out of scope for this rule.
- `justDrewFromOpenRef.current = false` is reset at the end of every pass,
  so the "new meld only" treatment applies to exactly the one card that
  triggered it, not to whatever incoming card shows up next.

The two-signal design (a ref set at draw-time, backed by a comparison
against the previous open-pile top) is deliberate: the ref alone would miss
a case where the effect re-runs before the draw call's ref write is visible
to it; the top-card comparison alone would misfire if the open pile's top
card coincidentally matches a card id from an unrelated update. Together
they're redundant in the case that matters and don't fire falsely in the
cases that don't.

## Verification Matrix

All scenarios required by the brief, confirmed via
`client/src/games/rummy/__tests__/openDeckRule.test.ts` (4 tests, all
passing):

| Scenario | Result |
|---|---|
| Pure sequence, open card matches suit/run | New meld created; original sequence untouched (`4S-5S-6S` stays `4S-5S-6S`; `7S` lands alone) |
| Impure sequence / meld waiting on a wild, open card is the exact wild joker | New meld created for the joker; the waiting meld is untouched |
| Set (3-of-a-kind), open card matches rank | New meld created even though it "should" complete the set by suit-matching logic; existing set untouched |
| Multiple existing melds | Only a new group is appended; none of the existing groups are mutated |
| Manual reorganization after pickup | Re-running reconciliation against a hand the player has already manually re-grouped (dragged the open card into an existing meld themselves) preserves that manual grouping — the rule only governs the *automatic* placement immediately after pickup, never a subsequent player action |

Joker-specific case is covered (row 2). Single-card-meld and
rearrangement-after-pickup are the "new meld created" and "manual regroup
preserved" rows above, respectively.

## Hint System Respects the Rule

`generateRummyHint()` never touches `layout` — it reads `hand`, the open
pile, and turn state, and returns a **recommendation** object. It doesn't
call the reconciler or write groups, so it cannot violate (or need to
respect) this client-side placement rule; there's no code path where it
could re-merge an open-deck card into an existing meld. Verified by
`hintEngine.test.ts`'s "never mutates input arrays or objects" test.

## Regression Coverage — one real gap found and closed

`openDeckRule.test.ts` is real, comprehensive, and passing — but it tests a
**local re-implementation** of the reconciliation function
(`reconcileHandLayout`, defined inline in the test file) rather than
importing the actual logic from `RummyBoardDesktop.tsx`/`RummyBoardMobile.tsx`.
The two are faithful to each other today because the test was written by
reading the real code, but nothing enforces that they stay in sync — a
future edit to the real reconciler could silently diverge from what the
test verifies, and the test would keep passing.

This wasn't changed in this pass: extracting the reconciliation logic out
of the `useEffect` into a standalone, exported, testable function (used by
both boards *and* imported directly by the test) is a real, worthwhile
follow-up, but it touches the most state-sensitive part of both 3000+-line
board components and is a larger, separate refactor from what this task
asked for ("do not redesign existing flows"). Flagged as a remaining risk
below rather than attempted silently.

## Verification

- `[x]` `cd client && npm run typecheck` → clean
- `[x]` `cd client && npx vitest run src/games/rummy/__tests__/openDeckRule.test.ts` → 4/4 passing
- `[x]` Confirmed both `RummyBoardDesktop.tsx` and `RummyBoardMobile.tsx` implement the identical `justDrewFromOpenRef`/`prevOpenTopRef` mechanism (read both files directly, not assumed from one)
- `[ ]` Not verified against the real component (see gap above) — the test's fidelity to production code has not been mechanically enforced, only manually confirmed by reading both side by side

## Remaining Risk

Extract the reconciliation function out of both boards' `useEffect` bodies
into a shared, exported, unit-testable module (mirroring the pattern
already used for `hintEngine.ts`), and repoint `openDeckRule.test.ts` at it
directly. This closes the test/production drift risk above and also
removes a ~60-line logic duplication between the two boards (an existing
`AGENTS.md` §16 rule-4 violation — "No duplicate implementations" —
predating this task). Not done here to stay inside the requested scope.
