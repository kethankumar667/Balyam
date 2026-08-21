# Rummy: Auto Button → Hint Button

## Auto Button Analysis (before this change)

**Purpose**: `autoArrange()` (`RummyBoardMobile.tsx`, `RummyBoardDesktop.tsx`) sorted
the player's own hand into suit lanes (`splitBySuit`) and wrote the result into
local component state (`setLayout(...)`). It never built a real meld — Rummy's
on-screen "groups" are client-side scratch space until the player Discards or
Declares — and never touched the server.

**Handlers**: `onClick={autoArrange}` (desktop `ToolButton`, "Auto Group"),
`onClick={onAutoArrange}` → `autoArrange` (mobile `ActionButton`, label
`"AUTO"`). Desktop additionally bound it to the `A` key.

**State dependencies**: `layout.groups`/`byId` (read), `setLayout`,
`setSelected`, `rummySfx.meldFormed()` (write) — plus, on mobile only, a FLIP
animation (`captureRects`/`playFlip`) so the resort didn't snap instantly.

**Visibility**: Always rendered whenever the action bar/tool rail was visible
(mobile: `canAutoArrange={hand.length > 0 && state.phase !== "finished"}`;
desktop: unconditional).

**Verdict**: harmless in isolation (no state mutation reaches the server), but
redundant and confusing once a real strategy assistant exists — a plain suit
sort next to a feature that suggests actual melds and discards.

## What already existed: the Hint feature

A "Smart Hint" system was already built (not by this change) and satisfies
the brief's constraints as-is:

- `client/src/games/rummy/hintEngine.ts` — pure function `generateRummyHint()`.
  Reads `hand`, `wildRank`, turn state, and the open pile; returns a
  recommendation (`draw` from open/closed, `discard` a specific card, or
  `declare`) with a human-readable reason. Confirmed pure by its own test
  (`hintEngine.test.ts`: *"never mutates input arrays or objects"*).
- `requestSmartHint()` (both boards) computes a proposed meld arrangement +
  best discard via `suggestArrangement`/`suggestDiscard` (`autoArrange.ts`)
  and stores it in `pendingHint` state — a **preview**, not an action.
- The preview renders as a banner (inline JSX, both boards) showing the
  proposed groups and discard candidate, with two buttons: **Approve &
  Rearrange** (`approveSmartHint()`) and **Cancel** (`dismissSmartHint()`).
- `approveSmartHint()` only calls `setLayout(...)`/`setSelected(...)` — it
  **pre-selects** the suggested discard card, it does not call
  `discardSelected()`. The player still has to press Discard themselves.
- Neither `requestSmartHint` nor `approveSmartHint` emits a socket move.
  (Layout changes — from dragging, the hint, or anything else — are
  separately synced to the server via a debounced `rummy:arrangement`
  event purely so a reconnect restores your grouping; this is pre-existing,
  uniform for every layout change, and carries no game-rule weight of its
  own.)
- Never reads or reveals opponent hands — `generateRummyHint`'s only inputs
  are the caller's own `hand` and public table state (open pile, wild rank).

Net: the "Hint" half of this task was already correct. The work here is
removing Auto so Hint is the only assistant surface.

## Migration Plan (executed)

1. **Mobile** (`RummyBoardMobile.tsx`): removed the `AUTO` `ActionButton`
   entry, `canAutoArrange`/`onAutoArrange` from `ActionBar`'s props and call
   site, and the now-unreachable `autoArrange()` function body.
2. **Desktop** (`RummyBoardDesktop.tsx`): removed the "Auto Group"
   `ToolButton`, the `A` keyboard shortcut (and its doc comment line), the
   `autoArrange()` function, and the now-unused `AutoGroupIcon` component.
3. **Copy**: `TutorialModal.tsx` referenced the AUTO button twice ("The
   **AUTO** button can find a starting layout for you", "Try the **AUTO**
   button on your first hand") — both rewritten to point at **💡 HINT**.
4. **Dead code**: deleted `HintBanner.tsx` — a fully-built but never-imported
   earlier draft of the hint banner, superseded by the inline JSX in both
   boards (confirmed zero importers repo-wide before deletion).
5. Confirmed no other file references `autoArrange`/`AUTO button`/
   `Auto Group` (grepped `client/src/games/rummy/`, `CoachHintButton.tsx`).

Nothing else in the layout changed — `SORT`/`GROUP`/`DISCARD`/`DROP`/`FINISH`
keep their positions; removing one chip from a `flex-wrap` row reflows the
rest without a layout rewrite. The floating **💡 HINT** pill (top-left,
both layouts) is unchanged — it was already the sole trigger for the
Smart Hint flow before this change and remains so now.

## Files Modified

- `client/src/games/rummy/RummyBoardMobile.tsx`
- `client/src/games/rummy/RummyBoardDesktop.tsx`
- `client/src/games/rummy/TutorialModal.tsx`
- `client/src/games/rummy/HintBanner.tsx` (deleted, dead code)

## Tests

No new tests were needed for the removal itself (deleting a button with no
server-facing behavior has nothing to regress). Existing coverage that
verifies Hint's constraints was already in place and re-run clean:

- `client/src/games/rummy/__tests__/hintEngine.test.ts` — 6/6 passing: open
  vs. closed draw recommendation, wild-joker draw, highest-deadwood discard,
  declare-when-ready, and the explicit non-mutation guarantee.

## Verification Results

- `[x]` `cd client && npm run typecheck` → clean
- `[x]` `cd client && npm test` → 538/538 passing (no regressions from the
  removal; `hintEngine.test.ts` 6/6 green)
- `[x]` Grepped the full `client/src/` tree for `autoArrange`, `AUTO` (as a
  Rummy button label), and `Auto Group` — zero remaining references outside
  the `./autoArrange` **module filename** (still used by both boards' and
  `RummyResultModal.tsx`'s calls to `suggestArrangement`/`splitBySuit`,
  which are unrelated helper functions, not the removed button)
- `[ ]` Not browser-verified in this pass (no browser automation available
  in this environment) — the action bar's flex-wrap layout and the
  hint pill's existing position mean visual risk is low, but this should be
  eyeballed at 375/768/1024/1440px per `AGENTS.md` §6 before calling the UI
  change itself "done," not just typechecked.
