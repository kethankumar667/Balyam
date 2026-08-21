# Carrom Player Perspective Fix — Verification Report

> **Status:** IMPLEMENTED WITH LIMITED VERIFICATION (see below for exactly
> which claims have real evidence and which do not — the previous version
> of this document claimed "IMPLEMENTED AND VERIFIED" including a
> responsive-viewport table and live multiplayer scenarios that were never
> actually exercised in a browser; this revision downgrades those per the
> brief's own self-critique instruction rather than repeating them.)

This audit independently re-verified an implementation that already
existed in the repository before this task — it was not built from
scratch in this pass. Every claim below was re-checked by reading the
current source directly and re-running the test suites fresh; nothing here
is carried over from the prior draft without re-confirmation.

---

## 1. Overview

Previously, the host (seat 0) always saw their baseline at the bottom
($Y=82$ world) while the guest (seat 1) received their turn at the top
($Y=18$ world) — confirmed root cause in `CARROM-PERSPECTIVE-ANALYSIS.md`.

**The fix**, confirmed present and correct in the current codebase:
- Seat 0: view unrotated, baseline renders at the bottom.
- Seat 1: the SVG's playfield content renders inside a `<g transform="rotate(180 50 50)">`, so their world baseline ($Y=18$) renders at the bottom of their screen.
- Spectators (`selfSeatIndex === -1`): unrotated, same as host.
- Server physics, coin collisions, pockets, turn logic, and scoring are untouched — the fix lives entirely in the client rendering and input-mapping layer.

## 2. Files Modified

| File | Change |
|---|---|
| `client/src/games/carrom/carrom-shared.tsx` | `pointerToBoard(rect, clientX, clientY, isFlipped)` gained the `isFlipped` parameter (inverts both axes around the board center before returning world coordinates); added `toUiSliderPos`/`toServerSliderPos` for the striker-placement slider; `CarromSvgBoard` wraps the entire playfield (frame, markings, pockets, pieces, trajectory preview) in the conditional rotation `<g>`; `CarromShotControls` uses the UI/server slider helpers at both its interaction points (drag and click-to-place). |
| `client/src/games/carrom/CarromBoardMobile.tsx` | Computes `isFlipped = state.seats.findIndex(s => s.playerId === selfId) === 1`; both `handlePointerDown` and `handlePointerMove` route through one shared `toBoard()` helper that always passes `isFlipped`, so down/move can never disagree on orientation; passes `isFlipped` to `CarromSvgBoard` and `CarromShotControls`. |
| `client/src/games/carrom/CarromBoardDesktop.tsx` | Same pattern as Mobile — identical `isFlipped` derivation and wiring, independently confirmed (not just "mirrors mobile" by assertion — read both files side by side). |

`aim.angle`/`aim.power` (sent to the server via `onMove("shoot", ...)`) are
computed purely from world-space coordinates already produced by
`toBoard()` — the server never receives an `isFlipped` flag or anything
view-dependent. This is the concrete evidence for "physics untouched," not
just an architectural intention.

## 3. Coordinate Transform — Verified Against Real Code, Not Just Math

The rotation is a standard 180°-about-center transform, confirmed by
reading `pointerToBoard`:
```ts
if (isFlipped) {
  x = CARROM_BOARD.size - x;
  y = CARROM_BOARD.size - y;
}
```
Cross-checked against `shared/types.ts`'s `CARROM_BOARD` constants
(`size: 100, cushion: 6, baseline: 18, strikerRadius: 2.6` — all exactly as
cited): a guest's screen-bottom touch at visual $(50, 82)$ maps to world
$(50, 18)$ — their own baseline — and dragging further down-screen (pulling
back) maps to a *smaller* world $Y$, producing a launch angle of $+90°$ in
world space, which the rotated `<g>` renders as "pulling back, shooting
forward" on their actual screen. Verified structurally (the SVG `<g>` that
performs the rotation wraps pockets, pieces, and the trajectory-preview
line — confirmed by reading the full render tree, not assumed) and
verified numerically by the test suite below.

Striker-placement slider: `toServerSliderPos(uiPos, isFlipped) = isFlipped
? 1 - uiPos : uiPos`, and its inverse `toUiSliderPos`, wired at both the
drag-slider and the click-to-place interaction — confirmed both call sites
route through the helpers, not just the drag path.

## 4. Verification Evidence (re-run fresh for this report)

### 4.1 TypeScript
```
npm run typecheck   →  server: 0 errors, client: 0 errors
```

### 4.2 Carrom-specific tests
```
client: npx vitest run src/games/carrom/__tests__/
  ✓ carromFeed.test.ts (13 tests)
  ✓ carromView.test.ts (17 tests)   ← the perspective-transform suite
  30/30 passing

server: npx vitest run src/games/carrom/__tests__/
  ✓ engine.test.ts (22 tests)       ← physics/rules, unaffected by this change
  22/22 passing
```
`carromView.test.ts` tests the **real exported functions**
(`pointerToBoard`, `toUiSliderPos`, `toServerSliderPos`) imported directly
from `carrom-shared.tsx` — not a re-implementation — so a regression in the
production code would fail this suite directly.

### 4.3 Full repository suites (corrects the prior draft's numbers, which
cited a partial 19-file/288-test server run under the heading "Full Server
Test Suite")
```
cd client && npm test  →  68 files, 538/538 passing
cd server && npm test  →  98 files, 804/804 passing
```
No regressions anywhere in the repository from this change.

## 5. What Is and Isn't Actually Verified

Being explicit here because the prior version of this document claimed
verification it didn't have — per this task's own self-critique
instruction, unsupported claims are downgraded rather than repeated.

**Verified (code read + automated tests, reproducible)**:
- The rotation transform is mathematically correct and wraps every visual
  element that needs it.
- Pointer-to-world mapping is correct for both orientations, including
  corner/offset/symmetry cases (17 tests).
- The slider UI/server round-trip is lossless for both orientations
  (`toServerSliderPos(toUiSliderPos(v)) === v`, tested across 7 sample
  values).
- Spectators and the host both resolve to `isFlipped = false`, guests to
  `true`, purely from `state.seats` + `selfId` — no cached/derived flag
  that could go stale on reconnect (there is nothing to desync: the value
  is recomputed from current props on every render).
- Full repository test suites pass with zero regressions.

**NOT independently verified in this pass** (no browser automation is
available in this environment — this was true for this session's earlier
audits too, and is disclosed the same way here):
- Actual rendered appearance at 320/375/390/768/1024/1440px. The prior
  draft's viewport-by-viewport table describing specific visual outcomes
  at each size was not backed by an actual rendered screenshot or measured
  layout — it has been removed from this revision rather than repeated.
- A real two-client (host + guest) live multiplayer session: host turn,
  guest turn, host pots a coin, guest pots a coin, reconnect mid-match,
  page refresh. The `isFlipped` derivation is provably stateless and
  reconnect-safe by construction (see above), which is real evidence, but
  it is not the same as having watched it happen.
- Real touch input on a physical mobile device (only pointer-event math
  was verified).
- Player card / turn-bar labels ("Your Turn," host/guest names) were
  confirmed present in the surrounding code but their exact on-screen
  wording under a flipped view was not visually re-inspected as part of
  this pass.

## 6. Self-Critique

- Does every player now shoot from the bottom? **Yes, by construction and
  by the pointer-mapping tests — not independently watched in a browser.**
- Is aiming more natural? **Mathematically yes for both orientations; not
  subjectively confirmed by a human tester in this pass.**
- Did physics remain unchanged? **Yes — confirmed the shoot payload
  (`angle`, `power`) is computed entirely in world space before leaving the
  client, and the 22-test server engine suite (physics/rules) is untouched
  and still 22/22.**
- Did synchronization remain unchanged? **Yes — `isFlipped` never crosses
  the wire; the server has no knowledge of it.**
- Could any player still receive a top-side turn? **No code path assigns a
  seat-1 view without rotation — confirmed by reading every `isFlipped`
  call site (10 across the three files).**
- Is mobile play improved? **Plausible and consistent with the math, not
  independently observed on-device.**
- Is the solution maintainable? **Yes — two small, table-driven pure
  helper functions plus one conditional SVG group, not scattered
  per-element special-casing.**
