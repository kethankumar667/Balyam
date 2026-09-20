# Walkthrough: Connect 4 (`connect4`) Implementation

Connect 4 has been completely implemented and integrated into the BHALYAM platform following the strict engineering governance in `AGENTS.md` and `docs/ai/new-game-checklist.md`.

## Summary of Changes

### 1. Server-Side Engine & AI
- **`server/src/games/connect4/connect4Board.ts`**: Pure bitboard/array grid model for 7-column x 6-row Connect 4 with win detection, tie detection, and gravity drop simulation.
- **`server/src/games/connect4/connect4Ai.ts`**: Deterministic minimax AI with 3 difficulties (`easy`, `medium`, `pro`), seeded PRNG, transposition-table awareness, and depth bounds.
- **`server/src/games/connect4/Connect4Engine.ts`**: Implements the formal `GameEngine<Connect4PublicState, Connect4Move>` contract with turn timeout auto-play, disconnect handling, and winner scoring.
- **`server/src/games/registry.ts`**: Registered `connect4` factory in `ENGINE_FACTORIES`.
- **`server/src/rooms/RoomManager.ts`**: Full room lifecycle integration:
  - Options parsing & validation (`sanitizeConnect4Options`)
  - Whitelisted in `addLocalPlayer` for Pass & Play
  - Seating alternation across rematches using `orderForAlternatingFirstMove`
  - Timeout auto-move delegation to `engine.applyAutoMove`
  - Authoritative match scoring: `clamp(22 - winnerDiscCount, 1, 18)` pts for genuine human-vs-human wins
- **`server/src/sockets/index.ts`**: Handled `connect4Options` in room creation and validation.
- **`server/src/profile/ScorecardService.ts`**: Added benchmark leaderboards for `connect4` (`classic` mode).

### 2. Shared Contracts (`shared/`)
- **`shared/types.ts`**: Added `"connect4"` to `GameKind`, defined `Connect4Options`, `DEFAULT_CONNECT4_OPTIONS`, `sanitizeConnect4Options`, `Connect4PublicState`, and `Connect4Move`.
- **`shared/catalog.ts`**: Added `connect4` to `GAME_LIMITS` (min: 2, max: 2), `GAME_START_REQUIREMENTS`, `GAME_PREFERRED_ORIENTATION` (`portrait`), `GAME_DISPLAY_NAMES`, and rich `BHALYAM_GAME_CATALOGUE` entry.
- **`shared/profile/GameModes.ts`**: Registered mode `"classic"` (`serverScored: true`, `HIGHER_IS_BETTER`, unit `"pts"`).
- **`shared/reactions.ts`**: Added closed set of Connect 4 game reactions.

### 3. Client Board & Responsive Layouts
- **Dual Layout Architecture**:
  - **`Connect4BoardMobile.tsx`**: Mobile-first portrait layout, `h-dvh-safe`, 44x44px touch targets, zero vertical scroll, top HUD, audio mute toggle, theme selector, and animated outcome drawer.
  - **`Connect4BoardDesktop.tsx`**: Dedicated 2-column desktop layout with interactive board on left and integrated chat/match stats rail on right.
  - **`Connect4Board.tsx`**: Responsive switcher choosing between mobile and desktop variants via `useViewport`.
- **`Connect4Grid.tsx`**: Accessible semantic board (`role="grid"`, `role="row"`, `role="gridcell"`) with disc drop animations, keyboard accessibility (`Enter`/`Space`), and winning line highlighting.
- **`connect4Audio.ts`**: Web Audio synthesizer with sound effects (disc drop, chip click, win fanfare, timer pulse, defeat) and safe localStorage persistence (`bhalyam.connect4.muted`).
- **`connect4Themes.ts`**: 3 distinct visual themes (`classic`, `retro`, `arcade`) conforming to WCAG 1.4.1 non-color-only distinction (dots vs rings disc glyphs).
- **`useConnect4Move.ts`**: Safe optimistic move hook guarding against double-taps, network race conditions, and socket error unlocks.
- **`client/src/pages/Room.tsx`**: Rendered in `FULL_BLEED_GAMES`, bypassing `PassPhoneGate` for Pass & Play seats since Connect 4 is an open-information game.

### 4. Discovery Surfaces & System Tables Wired
- **`client/src/components/bhalyam/icons.tsx`**: Added SVG `Connect4Glyph`.
- **`client/src/components/bhalyam/GameTile.tsx`**: Added `Connect4Glyph` case in `GameGlyph`.
- **`client/src/components/games/GameCard.tsx`**: Added `connect4` to `GAME_GLYPHS` and `TILE_ART`.
- **`client/src/components/bhalyam/GameRoomSheet.tsx`**: Added Connect 4 options controls (turn timer 10/15/20/30/45s and bot difficulty), Pass & Play configuration, and payload serialization.
- **`client/src/components/RoomCodeShare.tsx`**: Added friendly name `"Connect 4"`.
- **`client/src/features/profile/MatchHistoryList.tsx`**: Added to `GAME_INFO` and filter dropdown.
- **`client/src/pages/GameStatisticsPage.tsx`**: Added `connect4` to `GAME_BREAKDOWNS`.
- **`client/src/pages/LeaderboardPage.tsx`**: Added baselines, global bests, and strategic game tips.
- **`client/src/components/leaderboard/ModeScorecardsLeaderboard.tsx`**: Added `connect4` to `SUPPORTED_GAMES`.
- **`client/src/components/admin/live-monitoring/LiveRoomFilters.tsx` & `RecoverySentinel.tsx`**: Added to admin filters.
- **`client/src/pages/home/GamesSection.tsx` & `gameArt.ts`**: Added to home tiles and art maps.
- **`client/src/seo/metadata.ts` & `structuredData.ts`**: Added social preview metadata and Schema.org game application schema.
- **`client/src/features/academy/data/`**: Created `CONNECT4_ACADEMY` tutorial module.
- **`client/src/lib/privacy/dataInventory.ts`**: Declared keys `bhalyam.connect4.muted` and `bhalyam.connect4.theme`.
- **`scripts/quality-gates/bundleBudgetGuard.mjs`**: Added chunk size budget for `Connect4Board-*.js` (50 KB).

---

## Verification Results

### Automated Test Suites
- **Server Tests**: 175 test files passed, 2229 tests green (including `Connect4Engine.test.ts`, `connect4Ai.test.ts`, `connect4Board.test.ts`, `connect4Options.test.ts`, `connect4Room.test.ts`, `connect4Economy.test.ts`).
- **Client Tests**: 203 test files passed, 1790 tests green (including `Connect4Board.test.tsx`, `useConnect4Move.test.ts`, `connect4Outcome.test.ts`, `RoomFinalizationFlow.test.tsx`, `dataInventoryGames.test.ts`).
- **TypeScript Typecheck**:
  - `npm run typecheck:server` -> 0 errors
  - `npm run typecheck:client` -> 0 errors
- **Production Builds**:
  - `npm run build:server` -> `tsc && tsc-alias` exited with code 0
  - `npm run build:client` -> `vite build` generated `Connect4Board-CgagoZnO.js` (42.79 kB) + prerendered 40 public routes cleanly.

### Quality Gate Audits
- `check:bundle`: PASSED (All 293 bundle chunks within budget, `Connect4Board` 42.79 KB <= 50 KB).
- `check:admin-key-leak`: PASSED (scanned 293 files, no secrets leaked).
- `check:a11y`: PASSED (scanned 649 components, 0 critical issues).
- `check:tests`: PASSED (379 test files audited, 0 focused, 0 skipped).
- `check:deps`: PASSED (dependency governance intact).
- `check:perf`: PASSED (measured operations well within SLA budgets).
- `check:deployment`: PASSED (production configuration contracts verified).
