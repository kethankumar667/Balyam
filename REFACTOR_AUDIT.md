# BHALYAM — Refactor & Layout Audit

**Scope of this document:** a full review of the client game boards and shared
in-room UI, the plan for giving **every** game a dedicated mobile *and* desktop
layout (per `AGENTS.md` §6), and a flag list of pre-existing bugs / dead code /
pixel-perfection gaps surfaced during the review.

**Hard constraint honoured throughout:** *no functional or server-contract
change.* The split changes **layout**, never **behaviour**. Each board keeps the
exact same `game:move` / socket surface, the same props, and the same set of
actions a player can take. Optimisations are behaviour-preserving (memoisation,
hoisting constant objects out of render, deleting dead intervals/imports). Any
change that would alter behaviour is **flagged below, not silently applied.**

Baseline at start of work (verified):
- `client` `tsc --noEmit` → clean.
- `server` `tsc --noEmit` → clean; `vitest` → **114/114 passing**.

---

## 1. Current state: who has the mandated split?

| Game | Board file(s) | Lines | Mobile/Desktop split? | Responsive strategy today |
|---|---|---:|:--:|---|
| **Rummy** | `RummyBoard` → `…Mobile` / `…Desktop` | 143K + 56K | ✅ **canonical** | runtime picker + 2 DOM trees |
| RPS | `RpsBoard.tsx` | 926 | ❌ single tree | Tailwind `sm:` only |
| Hand Cricket | `HandCricketBoard.tsx` | 2261 | ❌ single tree (monolith) | Tailwind `sm:`/`lg:` + phase switch |
| UNO | `UnoBoard.tsx` | 457 | ❌ single tree | one `lg:grid-cols-3` |
| Ludo | `LudoBoard.tsx` | 1428 | ❌ single tree | one `sm:flex-row` dice tray |
| Snakes & Ladders | `SnlBoard.tsx` | 1038 | ❌ single tree | one `lg:grid-cols-[1fr_220px]` |
| Dots & Boxes | `DotsBoxesBoard.tsx` | 838 | ❌ single tree | **none** (fixed px) |
| Word Building | `WordBuildingBoard.tsx` | 1121 | ❌ single tree | one `md:grid-cols-2` |
| Memory Match | `MemoryMatchBoard.tsx` | 271 | ❌ single tree | **none** (fixed px) |

**Conclusion:** 8 of 9 games violate §6. None (except Rummy) branch on viewport
at runtime — they lean on a thin layer of Tailwind prefixes, so the dedicated
layouts are net-new layout work, not a rework of existing branches.

---

## 2. The split pattern (copied from Rummy)

Each game folder is refactored to:

```
client/src/games/<kind>/
├── <Kind>Board.tsx          # THIN picker — same export name Room.tsx imports
├── <Kind>BoardMobile.tsx    # single-column, touch-first shell
├── <Kind>BoardDesktop.tsx   # multi-column / side-rail shell
├── use<Kind>Board.ts        # ALL state, effects, socket emits+listeners, memos
└── <kind>-shared.tsx (+ sub-components)   # constants, pure fns, dumb components
```

- **Picker gate** is copied verbatim from `RummyBoard.isDesktopRummy()`:
  `innerWidth ≥ 1280 && innerHeight ≥ 720 && matchMedia('(hover:hover) and (pointer:fine)')`,
  re-checked on `resize` + `orientationchange`. This deliberately keeps phone
  *landscape* (≤ 1133px) on the mobile shell. The simpler 768px `useViewport`
  is **not** used for the picker (matches the Rummy precedent).
- **Single source of truth:** every game's stateful logic, socket I/O, timers
  and derived memos move into one `use<Kind>Board` hook that is called **once**
  by whichever shell is mounted. The shells never double-subscribe sockets or
  run two animation engines.
- **Room.tsx is untouched** — pickers keep the same default-export name, so the
  9 board imports in `Room.tsx` keep working with zero edits.
- **`Room.tsx` `MAX_PLAYERS_BY_GAME`** and the server `getGameLimits` stay in
  sync (no change needed).

### Why mobile vs desktop differ (per game)

| Game | Mobile shell | Desktop shell |
|---|---|---|
| RPS | compact arena, 3-up choice row, stacked score cards | wide arena, side-by-side score cards, hover affordances |
| Hand Cricket | phase bodies at narrow grid densities, on-screen pickers full-width | wider pick grids, denser scoreboards, side-by-side scorecards |
| UNO | stacked deck/score/hand panels, full-width hand fan | 3-column board, larger hand, persistent side info |
| Ludo | single column: board → dice tray (stacked) → rail sheet | 2-column: board left, dice + controls + rail right |
| SnL | board on top, dice/roster/feed stacked below (sticky dice) | board left, 220px right rail (dice/roster/event feed) |
| Dots & Boxes | compact `cellPx`, score bar wraps on top | enlarged `cellPx` (real scale-up), score bar as side column |
| Word Building | grid `cellPx` derived from viewport, on-screen LetterPad primary | 980px workbook, physical keyboard primary, side-by-side footer |
| Memory Match | card size derived from `min(viewport)/cols`, scores 2-col | larger fixed cards, scores beside grid |

The **SVG/board geometry is viewport-independent** in Ludo (%-based), SnL and
Dots & Boxes (fixed `viewBox`/px), so the board subtree itself is fully
shareable — only its *container sizing/placement* diverges between shells.

---

## 3. ⚠ FLAGGED — pre-existing bugs (NOT auto-fixed; need your call)

These change **behaviour**, so per the "no functionality change" rule they are
flagged here rather than fixed inside the layout split. Say the word and I'll fix
any/all in a focused follow-up.

| # | File | Issue | Impact | Suggested fix |
|---|---|---|---|---|
| B1 | `uno/UnoBoard.tsx` (~L134–150) | `drawCard()`/`passTurn()` set `isSubmitting(true)` then **synchronously** `isSubmitting(false)` | the optimistic double-tap guard is a **no-op** — never actually blocks a double submit | gate on server state transition or drop the dead `setIsSubmitting` calls |
| B2 | `uno/UnoBoard.tsx` (L21–23) | dead imports `canPass`, `isColorChosen` (computed inline instead) | none (lint noise) | remove imports |
| B3 | `uno/helpers/hand.ts` | `findCardById/countRank/countColor/countWilds/getMostCommonColor` not imported by the client board | dead from client's POV (bot/server helper) | leave (server may use) or move out of client bundle |
| B4 | `memorymatch/MemoryMatchBoard.tsx` (L70–74) | `now` 250ms `setInterval` **never read in render** | wasted whole-board re-render **4×/sec** | delete the interval (done during split — pure perf, no behaviour change) |
| B5 | `memorymatch/MemoryMatchBoard.tsx` (L53–67) | `ownedBy` `useMemo` computed but **never referenced** | wasted compute each render | delete (done during split) |
| B6 | `memorymatch/MemoryMatchBoard.tsx` (L61–66) | `cardFaceUp` calls `state.board.find` per cell → **O(n²)/render** | jank on 8×8 | index board by id in a `Map` (done during split — pure perf) |
| B7 | `dotsboxes/DotsBoxesBoard.tsx` | 250ms `setInterval(setNow)` re-renders the **entire** board (static dots + every motion line/box + all tap targets) | perf churn 4×/sec | isolate the clock into the score bar / a `TurnTimer` sibling (done during split) |
| B8 | `dotsboxes/DotsBoxesBoard.tsx` | accepts `messages` + `roomPhase` props but **ignores them**; renders **no chat rail** | only game besides WordBuilding with no in-board chat | see C2 |
| B9 | `wordbuilding/WordBuildingBoard.tsx` | accepts `messages` but renders **no `InlineRoomRail`** | players can't chat from the WordBuilding board | see C2 |
| B10 | `rps/RpsBoard.tsx` (~L245) | `Date.now() < confettiUntil` gate in render won't self-clear when the timer lapses (relies on an unrelated re-render) | confetti can linger a frame longer than intended | drive via state/`setTimeout` (cosmetic; flagged only) |

> **B4/B5/B6/B7** are pure performance dead-weight with **no observable
> behaviour** — these I *do* remove during the split because deleting an unread
> interval / unused memo / swapping a `.find` for a `Map` cannot change what the
> user sees. **B1, B2, B3, B8, B9, B10** are left untouched pending your call.

---

## 4. ⚠ FLAGGED — dead code & stale references (need your call to delete)

Deleting files/code I didn't author is destructive, so these are flagged, **not
removed**, unless you approve.

| # | Item | Finding | Recommendation |
|---|---|---|---|
| D1 | `client/src/components/GameArena.tsx` (594 lines) | **dead/demo** — imported by nobody; self-contained random-dice demo shell | delete, or adopt as the shell template |
| D2 | `client/src/games/ludo/StaticPolygonBoard.tsx` | orphan — not imported by `LudoBoard` | confirm + delete |
| D3 | `client/src/games/ludo/ReactionBar.tsx` | orphan — only named in a comment | confirm + delete |
| D4 | `ludo/LudoBoard.tsx` L25 | dead `import { Avatar }` (never used) | removed during Ludo split (in-file cleanup) |
| D5 | `InlineRoomRail.tsx` (L11/L43), `Room.tsx` (L406/L709) | comments cite **`FloatingRoomRail`**, a component that no longer exists | stale-doc fix (safe; will correct comments) |
| D6 | `snl/SnlBoard.tsx` (~L908) | defines a **local** `PlayerList` shadowing the shared `components/PlayerList` (different purpose: coin colours) | rename local to `SnlPlayerRail` during split to kill the name clash |

---

## 5. ⚠ FLAGGED — pixel-perfection / responsiveness gaps

The core value the split delivers. Today these overflow or fail to use space:

- **P1 — fixed-px boards overflow phones.** `MemoryMatch` (`boardDim = size*80 +
  gaps`, no max-width → 6×6 = 552px) and `WordBuilding` (15×15 @ 28px ≈ 450px+)
  blow past a 320–360px viewport. The mobile shells derive cell/card size from
  the viewport so the board always fits. *(This is the headline fix.)*
- **P2 — `DotsBoxes` claims to "scale up on desktop" but does not.** `cellPx` is
  keyed off **board size**, not viewport — identical px on a phone and a 4K
  monitor. The desktop shell finally enlarges `cellPx`.
- **P3 — comments mislabel layouts as "mobile-first/viewport-derived"** in
  WordBuilding/DotsBoxes when the sizing is actually static. Corrected in the
  rewrite.
- **P4 — tablet tier (768–1023px).** Per §6.3 the picker routes tablets to the
  **mobile** shell (they fail the ≥1280px gate), which is the safer default;
  in-shell `sm:`/`md:` tuning widens spacing where it helps.

---

## 6. Cross-cutting consistency notes

- **C1 — chat rail coverage.** `InlineRoomRail` is used by 6 boards (MemoryMatch,
  HandCricket, Ludo, RPS, SnL, UNO). **WordBuilding & Dots & Boxes have none.**
  Adding it would *add functionality*, so it is **flagged (B8/B9), not added**
  by default — confirm if you want parity and I'll wire it into both mobile
  shells.
- **C2 — countdown timer duplication.** `TurnTimeWarning.useTurnSecondsLeft`
  runs a 250ms interval; several boards *also* run their own `now` interval for a
  turn chip. Where the board's interval is purely for display I consolidate onto
  the shared hook (no behaviour change); where removing it is purely dead (B4) I
  delete it.
- **C3 — shared component reuse is healthy.** `Chat`, `PlayerList`, `VoicePanel`,
  `RematchPanel`, `ChatMessageToast`, `PassPhoneGate`, `TurnTimeWarning` are
  single-source and reused; the split keeps reusing them (no per-game copies).

---

## 7. Execution order (risk-tiered)

1. **Wave 1 (low risk, clean/decomposed):** Memory Match, RPS, UNO, Dots & Boxes.
2. **Wave 2 (medium):** Snakes & Ladders, Word Building.
3. **Wave 3 (high — timer/effect heavy & monolithic):** Ludo, Hand Cricket.

After each wave: `client` typecheck + `vite build`. Final: server `tsc` + vitest
(must stay 114/114) + browser breakpoint verification at **375 / 768 / 1024 /
1440 px** per game (lobby → start with bots → board).

---

## 8. Status log

- [x] Review + audit complete.
- [x] **Wave 1** split — Memory Match, RPS, UNO, Dots & Boxes. Typecheck + production build clean after each.
- [x] **Wave 2** split — Snakes & Ladders, Word Building. Typecheck + build clean.
- [x] **Wave 3** split — Ludo, Hand Cricket (the two hardest extractions). Typecheck + build clean.
- [x] Full verification:
  - `client tsc --noEmit` → clean.
  - `client vite build` → clean (597 modules).
  - `server tsc --noEmit` → clean.
  - `server vitest` → **114/114 passing** (unchanged from baseline — server untouched).
  - **Browser-verified all 9 games** (+ a Rummy spot-check) live against the dev server at 375 / 768 / 1024 / 1440 px: room created, bot added, match started, a real move played through the socket (roll/pick/play/draw/place/flip as applicable), picker confirmed switching shells exactly at the 1280×720+hover+fine gate, **zero console/page errors** across the entire sweep.
  - Memory Match's 8×8 (64-card) board — the most overflow-prone case in the whole audit — now fits a 375px viewport with comfortable margins; before the split this size would have been ~696px wide with no responsive sizing at all.

### What changed vs. the original plan
- The "monolith strategy" for Hand Cricket turned out **not to need a `variant` prop** on any grid: every grid in that file already used pure Tailwind `sm:`/`lg:` responsive prefixes, which adapt correctly to real viewport width regardless of which shell (mobile/desktop) is mounted. Adding a JS-driven variant switch on top would have been an unrequested behaviour change (discrete density tiers instead of the existing continuous one), so it was deliberately skipped. The actual mobile/desktop divergence for Hand Cricket is the room-rail placement (inline on mobile, persistent sticky side column on desktop) — consistent with the Ludo/SnL pattern.
- Hand Cricket has **no `use<Kind>Board` hook** — the original top-level component had zero cross-cutting state (every phase component is already independently stateful), so there was nothing to extract into one. `hc-shared.tsx` holds the (now-exported) phase components + a tiny `HcPhaseBody` router instead.

*Section 8 covers the original 9-game split. Follow-up hardening is in §9.*

---

## 9. Post-split hardening (follow-up session)

Three feature/robustness requests landed after the split, plus one **pre-existing
bug surfaced during their verification**. All four are browser-verified.

### 9.1 Cross-device rotation gate (Rummy)
- **What:** When a Rummy round starts, every mobile player must be in landscape
  before the shuffle/deal animation runs. A portrait player sees a personal
  *"ROTATE YOUR DEVICE"* prompt with a live *"X of Y players ready"* readiness
  line; everyone else sees a *"Waiting for &lt;name&gt; to rotate"* banner. Once all
  non-bot players are landscape (or a 5s grace + settle window elapses), the deal
  plays **synchronized across devices**.
- **Files:** `client/src/games/rummy/rotation-sync.tsx` (new — `useOrientationReport`,
  `useRummyRotationGate`, `RotateDevicePrompt`, `WaitingForPlayersBanner`), wired
  into `RummyBoardMobile.tsx` and `RummyBoardDesktop.tsx`. Server: `Player.needsRotation`
  + a `room:setOrientation` event broadcast through `RoomManager`.
- **Verified:** two tabs (portrait blocker + landscape ready) — blocker saw the
  prompt + "1 of 2 players ready", the other saw "Waiting for Alice to rotate";
  rotating the blocker to landscape resolved the gate → deal → live board, **0 errors**.

### 9.2 `100vh` → dvh fix (ColorOS/Oppo overflow)
- **What:** The Rummy in-play felt used `h-screen` (`100vh`). On Android WebViews
  that over-report `100vh` while the address/gesture bar is visible (notably
  ColorOS/Oppo F19), the felt extended below the visible viewport and pushed the
  DROP/SORT/…/FINISH action row off-screen.
- **Fix:** new `.h-dvh-safe { height: 100vh; height: 100dvh; }` utility in
  `index.css` (cascade fallback — old browsers keep `100vh`, modern apply the
  dynamic `100dvh`), applied to the Rummy wrapper in `Room.tsx`. Only Rummy used
  the hard `h-screen overflow-hidden` clip; the other 8 games use `min-h-screen`
  and can scroll, so they were left untouched.
- **Verified:** at 820×360 (ColorOS-like aspect) the wrapper resolves to exactly
  the visible viewport height with **no overflow**; `CSS.supports('height','100dvh')`
  true.

### 9.3 Round-end scorecard redesign (Rummy)
- **What:** Replaced the flat ranked table with full-width two-tier player rows —
  a compact header line (rank · name · points · chips) over a row of the player's
  hand rendered as real playing-card **meld groups** with per-group point badges,
  plus a Joker/room-code/match-mode footer. Card faces in `Card.tsx` were refined
  (court cards use a framed letter + mirrored pips; numerics keep a single bold pip).
- **Files:** `RummyBoardMobile.tsx` (`RummyScoreCard`/`ScoreGroup`/`MeldGroupsRow`),
  `RummyBoardDesktop.tsx` (`DesktopRummyScorecard`/`DesktopScoreGroup`/`DesktopMeldGroupsRow`),
  `Card.tsx`.
- **Verified:** forced a round end (2-player drop) — both the mobile ("finished 2nd")
  and desktop ("finished 1st") scorecards render the redesigned meld-group rows
  with correct points/chips, **0 errors**.

### 9.4 FLAGGED + FIXED — ghost players from duplicate `room:join`
- **Symptom:** During the rotation-gate verification a fresh 2-player room showed
  **`PLAYERS (4)`** — one real player plus up to three phantom duplicates of the
  other — which also corrupted the rotation gate's readiness count.
- **Root cause (two layers):**
  1. **Client (`Room.tsx`):** the join effect emitted `room:join` more than once
     before the first ack returned — the synchronous `attemptJoin("initial")` is
     buffered while the socket is still connecting, then the async `connect` event
     fires a second `attemptJoin("reconnect")`; React StrictMode double-invokes the
     whole effect on top. Every emit carried the **stale closed-over `playerId`
     (`null` on a fresh load)**, so the server couldn't dedupe them.
  2. **Server (`RoomManager.joinRoom`):** with no `existingPlayerId` to match, each
     call minted a brand-new player and **overwrote `socketToPlayer`**, orphaning the
     previous record — a ghost seat that never disconnects. This was a real
     production bug, not dev-only: the connect-event-vs-initial-join race exists
     without StrictMode too.
- **Fix (both layers):**
  - Client: a `joinInFlightRef` guard drops overlapping emits until the first ack
    settles (a `disconnect` listener clears it so a dropped ack can't strand the
    player), and a `playerIdRef` feeds `attemptJoin` the **live** id so a genuine
    reconnect reclaims the seat instead of joining as a new ghost.
  - Server: an idempotency guard — if a socket is already seated in the room, a
    repeat join returns the existing player instead of creating one.
- **Tests:** `server/src/rooms/__tests__/joinDedup.test.ts` (2 new) — a duplicate
  same-socket join reuses the seat (roster stays 2); distinct sockets still create
  distinct players. Server suite **116/116**.
- **Verified:** the same 2-player flow that produced 4 now shows exactly
  `PLAYERS (2)` with 2 sockets, and the lobby→playing transition still works.

### 9.5 Verification summary (follow-up)
- `client tsc --noEmit` clean · `client vite build` clean (598 modules).
- `server tsc --noEmit` clean · `server vitest` **116/116** (was 114; +2 dedup tests).
- Live two-tab browser sweep against the dev server: rotation gate (both roles +
  resolution), dvh wrapper height at a short landscape, both scorecards, and the
  ghost-player fix — **zero console/page errors** throughout.

*This section is updated as work lands.*
