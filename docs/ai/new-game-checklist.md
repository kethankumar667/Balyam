# New Game Checklist (BHALYAM)

> **Audience:** an AI coding agent implementing a new game. First use: **Connect 4** (`connect4`).
> **Why this exists:** Tic Tac Toe and Sudoku each came back from review with ~19 defects. Almost all of them
> were *not* bad game logic — they were things the game touches that nobody listed. This file lists them.
>
> **Precedence:** read `AGENTS.md` first. Where this file and `docs/ai/implementation-playbook.md` disagree,
> **this file wins** — the playbook is stale (it names engine methods `initialize` / `validateMove` /
> `checkGameOver` and a registry `getGameLimits()` that do not exist; see §3).
>
> **How to work:** tick every box below *against the real diff*, and hand back the report in §16.
> A box you cannot tick gets a written reason, never a silent skip. Unticked + unexplained = not done.

---

## 0. Standing rules (violating any of these means rework)

- [ ] **Never** run `git commit`, `git push`, `git stash`, `git checkout <file>`, `git restore`, `git reset --hard`,
      or delete files you did not create. The user commits. The working tree can be edited by others at the same time:
      run `git diff -- <file>` before you edit a shared file and preserve everything already in it.
- [ ] **TDD:** write the failing test first, run it, watch it fail *for the right reason*, then implement.
      A test that passes before your fix exists is not coverage. Check each new test would fail if the fix were reverted.
- [ ] **Do not weaken, skip, or delete an existing test to get green.** Fix the code.
- [ ] **Nothing may be faked.** No "+50 XP", coins, ranks, streaks, rewards, "zero latency", "100% fair", "unbeatable AI"
      or any claim that the product does not actually deliver. Copy must describe only what exists.
- [ ] No `any`, no `@ts-ignore`, no `console.log`, no `dangerouslySetInnerHTML`, no secrets, no new dependency
      (ask first — `@testing-library/user-event` is deliberately **not** installed; use `fireEvent`).
- [ ] Immutable updates (return new objects; never mutate props/state/shared constants). Files < 800 lines,
      functions < 50 lines, nesting ≤ 4, named constants instead of magic numbers.
- [ ] Only touch files this game needs. Do not reformat, reorder or "clean up" unrelated code.
- [ ] Do not leave scratch files (screenshots, probe scripts, logs, `*.orig`) in the tree.
- [ ] Windows + Git Bash/PowerShell. No Python. Paths with spaces break tooling — **file names must not contain spaces**
      (`Sudoku Game Tile.png` is the cautionary example). Use `Connect4Tile.png`.

---

## 1. Ask the user BEFORE writing code (these are product decisions, not yours)

Write your proposed answer next to each and wait for confirmation. Do not guess and build.

- [ ] **Economy:** may Connect 4 rooms carry an entry stake? (Default for 2-seat games: yes. `NO_ECONOMY_GAMES` in
      `shared/catalog.ts` is for games that must never charge.) Confirm tie ⇒ full refund, forfeit ⇒ winner paid.
- [ ] **Bots:** offered? (`NO_BOT_GAMES` lists games without.) If yes: how many difficulty levels, and are they
      deterministic under a seed?
- [ ] **Pass & Play** (two people, one device): offered? (Default yes for a 2-player board game.)
- [ ] **Options exposed at room creation:** propose the *minimum* (e.g. turn timer seconds). Every option is a new
      attack surface and a new sanitizer + test.
- [ ] **Leaderboard / scorecard modes:** which modes exist, what unit, how the score is computed **on the server**.
- [ ] **Timeout policy:** when the turn clock expires — auto-drop in a random legal column, skip the turn, or forfeit?
- [ ] **Art:** tile image, glyph icon, colours. If the user has not supplied art, say so — do not ship a placeholder
      that looks final.
- [ ] Reaction emoji set (optional; closed set, see §12).

---

## 2. Find every place a game must be wired (do this first and again at the end)

The old playbook lists 6 steps. Tic Tac Toe actually touched **~35 source files + 13 test files**, and *still* missed ~10 tables.
Use the repo, not memory, to find them:

```bash
# 1. Everything a finished multiplayer game already touches (the wiring inventory):
git grep -liE "tictactoe" -- ':!*__tests__*' ':!*.test.*' ':!docs/*' ':!*package-lock*' ':!.kilo/*'

# 2. Everything a MATURE game touches that Tic Tac Toe never got  (= tables that are easy to forget):
EX=(':!*__tests__*' ':!*.test.*' ':!docs/*' ':!*package-lock*' ':!.kilo/*' ':!*/games/dotsboxes/*' ':!*/games/tictactoe/*' ':!client/src/features/academy/*')
git grep -liE "dotsboxes" -- "${EX[@]}" | sort > /tmp/dots.txt
git grep -liE "tictactoe" -- "${EX[@]}" | sort > /tmp/ttt.txt
comm -23 /tmp/dots.txt /tmp/ttt.txt
```

- [ ] Ran both. For **every** file in the output: add a `connect4` entry, **or** write one line in the report saying why
      it does not apply. (Docs, plans and old scripts can be skipped with a reason; per-game tables cannot.)
- [ ] Re-ran the same commands at the end, replacing `tictactoe` with `connect4`. Nothing may appear in the
      "mature game only" list without an explanation.

---

## 3. Facts you must not get wrong (the docs are stale here)

- [ ] The real `GameEngine` interface is in `server/src/games/GameEngine.ts`: `init(players)`, `applyMove(move)`,
      `getStateFor(playerId)`, `getPublicState()`, `isOver()`, `removePlayer(id)`; optional `pendingActors()`,
      `applyAutoMove(id)`, `getBotThinkDelayMs()`, `getBotReactionEmoji(id)`. There is **no** `validateMove` /
      `checkGameOver` / `initialize`. Read the file; do not follow the playbook's method names.
- [ ] Player limits, start requirements, orientation, display names and the two exclusion sets live in
      **`shared/catalog.ts`** (`GAME_LIMITS`, `GAME_START_REQUIREMENTS`, `GAME_PREFERRED_ORIENTATION`,
      `GAME_DISPLAY_NAMES`, `NO_BOT_GAMES`, `NO_ECONOMY_GAMES`) — not in the server registry.
- [ ] `BhalyamGameSlug` in `shared/catalog.ts` **and** a second slug union in `client/src/components/bhalyam/data.ts`
      must both gain `connect4`. They are duplicates that drift.
- [ ] `BHALYAM_GAME_CATALOGUE` (shared/catalog.ts) is a separate, richer list used by `client/src/catalog/gameCatalog.ts`,
      the reviews service and the tile showcase. **Tic Tac Toe and Sudoku are missing from it** — do not copy that omission.
- [ ] Per-game room options are hard-wired through `RoomManager` and the socket layer (see §6). There is no plugin
      system; a game with options is a change to `RoomManager.createRoom`'s **positional** parameters.
- [ ] Economy settlement for 2 seats reads the winner from `engine.getWinner()` (preferred) or
      `getPublicState().winnerId` — see `getWinnerId` in `server/src/rooms/economyPlacements.ts`.
      A `winnerId` of `null` means "no winner" ⇒ **refund**.

---

## 4. Shared contracts (`shared/`)

- [ ] `GameKind` union in `shared/types.ts` gains `"connect4"`.
- [ ] `Connect4Options`, `DEFAULT_CONNECT4_OPTIONS`, `CONNECT4_MIN_*` / `CONNECT4_MAX_*` named constants, and a pure
      **`sanitizeConnect4Options(input: unknown): Connect4Options`** — closed-set validation (`raw.x === "a" || raw.x === "b"`),
      numbers coerced, `Math.round`-ed and **clamped**, unknown keys dropped, garbage ⇒ defaults. Never trust a client blob.
- [ ] `Connect4PublicState` with a literal `kind: "connect4"` discriminator, the board as plain data, whose turn it is,
      the turn deadline, `winnerId: string | null`, and the **winning cells computed on the server** (so the client never
      derives the result). Nothing a player should not see (Connect 4 has no hidden info — keep it that way).
- [ ] `Connect4Move` typed (`{ column: number }`). The payload arrives as `unknown`; it is validated in the engine (§5).
- [ ] The `room:create` payload type in `ClientToServerEvents` gains `connect4Options?: Partial<Connect4Options>`.
- [ ] `shared/catalog.ts`: slug union, `GAME_LIMITS` (`{ min: 2, max: 2 }`), `GAME_START_REQUIREMENTS`,
      `GAME_PREFERRED_ORIENTATION`, `GAME_DISPLAY_NAMES`, `BHALYAM_GAME_CATALOGUE` entry; decide + set
      `NO_BOT_GAMES` / `NO_ECONOMY_GAMES` per §1.
- [ ] `shared/profile/GameModes.ts`: mode definitions with `unit`, `minPlausibleScore` / `maxPlausibleScore`, and
      `serverScored: true` (see §8). Extend the game-mode config type only if genuinely needed.
- [ ] `shared/reactions.ts` (optional): a `GAME_REACTIONS.connect4` entry. It is unioned into the server allow-list
      automatically. **Closed set only.**
- [ ] `npm --prefix server run typecheck` and `npm --prefix client run typecheck` both clean. A union member added in
      one place and forgotten in a `Record<GameKind, …>` elsewhere is a compile error — treat it as a to-do list.

---

## 5. Server engine (`server/src/games/connect4/Connect4Engine.ts`)

- [ ] Pure, deterministic state machine: `(state, move) → state'`. Randomness (first player, timeout auto-move, bots) comes from an
      injectable/seedable source so tests are deterministic. No `Date.now()` scattered through logic — inject a clock like
      the other engines do (see `BingoEngine`'s `now()`).
- [ ] **Validate every move as untrusted input**, in this order, returning `{ ok: false, error }` (never throwing):
      1. game not already over, 2. mover is a seated player, 3. it is that player's turn, 4. `data` is an object,
      5. `column` is an **integer** (`Number.isInteger`; reject `NaN`, `Infinity`, strings, `1.5`, `-0` edge cases),
      6. `0 ≤ column < COLUMNS`, 7. the column is not full. Error text must not leak internals.
- [ ] Gravity: the disc lands in the lowest empty cell. Test all 7 columns, full column, and the top row.
- [ ] Win detection covers **horizontal, vertical, both diagonals**, at every position including board edges, and
      **5+ in a row** counts. Returns the exact winning cells. A win on the very last (42nd) move is a **win, not a draw**.
- [ ] Draw only when the board is full and nobody has four. `winnerId === null` on a draw.
- [ ] Turn order: first player chosen fairly and **alternated on rematch** (mirror `orderForAlternatingFirstMove` in the Tic Tac Toe engine).
- [ ] Turn clock: a first-turn grace (`TICTACTOE_FIRST_TURN_GRACE_MS` pattern), a `restartTurnClock()`-style re-arm that
      `RoomManager` can call after a rematch or restart, and the agreed timeout policy from §1. The clock must never be left
      un-armed after a restart, and must never fire twice for one turn.
- [ ] `getWinner(): string | null` implemented (economy + profile code duck-type on it) **and** `winnerId` in public state,
      and the two always agree.
- [ ] `removePlayer(id)` (leave / disconnect-forfeit): the remaining player wins; `winnerId` set; `isOver()` true;
      settlement seat count stays consistent (see §7). Leaving **after** the game ended must not change the result.
- [ ] Bots (if offered): `pendingActors()`, `applyAutoMove()`, `getBotThinkDelayMs()`. A bot **never** plays an illegal move,
      never plays when it is not its turn, and never blocks the event loop (bounded search depth/time). Deterministic under a seed.
      Do not advertise it as "unbeatable" or "AI-powered" unless it is.
- [ ] `getPublicState()` returns a fresh object (no shared mutable references leaking to callers).
- [ ] Registered in `server/src/games/registry.ts` `createEngine()`.

---

## 6. Room wiring (`server/src/rooms/RoomManager.ts`, `server/src/sockets/index.ts`)

Tic Tac Toe needed changes at **every** one of these. Use `git grep -n "TicTacToe\|ticTacToe" server/src` as your map.

- [ ] Room field for the sanitized options (like `ticTacToeOptions`), set in `createRoom` through **`sanitizeConnect4Options`** —
      never from the raw payload.
- [ ] `createRoom` gains the new **positional** parameter in the same slot pattern as the others. Then update *every* caller and
      test helper that pads `createRoom` arguments (`createRoomAs` in `matchPayoutTiming.test.ts` / `economyIntegration.test.ts`,
      `createMemberRoom` in `RoomInspectorTelemetry.test.ts`, socket handler). Run the whole server suite; positional shifts
      break tests far from your change.
- [ ] `server/src/sockets/index.ts`: forward `payload.connect4Options` into `createRoom`.
- [ ] **Every place an engine is created or restarted** applies the options: the normal start path **and the rematch path**
      (`engine.setOptions(room.connect4Options)` — grep `instanceof TicTacToeEngine`). Forgetting the rematch path silently
      resets options and the turn clock on game 2.
- [ ] Rematch: seating / first-move alternation preserved, turn clock re-armed, `departedThisMatch` cleared, options kept.
- [ ] **Pass & Play:** the `addLocalPlayer` allow-list in `RoomManager` includes `connect4` (Tic Tac Toe was missing from it — the
      option was offered in the UI but rejected by the server).
- [ ] **Guest eligibility:** same-device local seats (`isLocal`) are not "other humans". A guest may host Pass & Play at the
      guest stake. A guest hosting with **remote** humans stays refused (deliberate anti-abuse rule, `checkHostEconomyEligibility`) —
      do not relax it.
- [ ] `BOT_NAMES_BY_GAME` (typed `Record<GameKind, …>`) has a `connect4` entry — required by the compiler even if bots are off.
- [ ] Finalize path (`finalizeMatch`): profile/scorecard recording branch for `connect4` (see §8); the recorded `options`
      metadata is the **sanitized** options, not the payload.
- [ ] Event timeline / telemetry: the match appears in `EventStore`/telemetry like other games.
- [ ] No per-room timer, interval, socket listener or Map entry outlives the room (resource-leak law). Test disposal.

---

## 7. Economy & settlement (real coins — the highest-stakes area)

Read `docs/economy/game-settlement-map.md` first. The ledger is authoritative; **the UI never computes money.**

- [ ] 2-seat ranking works because the engine exposes `getWinner()` / `winnerId`. **Do not** edit `economyPlacements.ts` for a
      2-seat game unless a test proves it is required.
- [ ] Integration test in the style of `server/src/rooms/__tests__/matchPayoutTiming.test.ts` (real `RoomManager` + in-memory
      economy, `rooms.startEconomyRecovery()`), asserting on a 100-coin stake from a 5 000 balance:
      **winner 5 060, loser 4 900** (host wins *and* joiner wins), **draw ⇒ both back to 5 000 (status REFUNDED)**,
      **forfeit ⇒ opponent paid**, credited within ~100 ms of the last move (not on the 5 s sweep), and **exactly once** after
      several sweep intervals (no double payout).
- [ ] A draw must never be treated as a win for the host (the result modal once crowned the host on a tie — see §10).
- [ ] Guest cases: guest + bots and Pass & Play at the guest stake behave per `checkHostEconomyEligibility`.
- [ ] Nothing about money is decided client-side: the client only displays what `GET /api/economy/settlements/:matchId` returns.
- [ ] No new economy endpoint, and no change to `EconomyService`, unless the user asked.

---

## 8. Scores, leaderboards, anti-cheat (`server/src/profile/*`)

Client-submitted scores are forgeable. The pattern that survived review:

- [ ] Mode is **`serverScored: true`** — the server computes the score in `finalizeMatch` (see `scoreTicTacToeWin`) and the
      client `POST /scorecards/record` path **refuses** that mode (`strictModes`). Add a test that a forged client post is rejected.
- [ ] Record **only genuine wins** by four-in-a-row: not draws, not forfeits/walkovers, not Pass & Play (local seat), not
      bot-only practice if the user decides so. Add a test for each exclusion.
- [ ] Score has min/max plausible bounds in `GameModes.ts`; `validateRecordScorePayload` (`server/src/profile/scoreValidation.ts`)
      rejects out-of-range, non-finite, reserved names, malformed ids.
- [ ] Idempotent per `matchId` (no double-record on retry/replay). The controller is rate-limited (`rateLimitByCaller`) — keep it.
- [ ] `ScorecardService` has the per-game entry; `LeaderboardPage.tsx` + `ModeScorecardsLeaderboard.tsx` show it; a new game's
      empty leaderboard renders an honest empty state, not fake rows.

---

## 9. Client board (`client/src/games/connect4/`)

Copy the *structure* of `client/src/games/tictactoe/`, not its bugs.

- [ ] Files: `Connect4Board.tsx` (picks layout with `useViewport` from `client/src/lib/useViewport`), `Connect4BoardMobile.tsx`,
      `Connect4BoardDesktop.tsx`, `Connect4BoardProps.ts`, `Connect4Grid.tsx`, `useConnect4Move.ts`, `connect4Outcome.ts`,
      `connect4Themes.ts`, `connect4Audio.ts`, a tutorial (use the **Game Academy**, §11 — no second tutorial system).
- [ ] **Dual layouts are mandatory** (mobile touch-first *and* desktop). Both tested at 320, 360, 390, 768, 1024, 1440 px.
      No horizontal page scroll; respect safe-area insets.
- [ ] The client **never decides** validity, turn, win, draw or score. It renders `Connect4PublicState` and sends
      `{ column }`. Optimistic UI is allowed only if reconciled with the server state and rolled back on rejection.
- [ ] Move hook (`useConnect4Move`): ignores input when it is not your turn / game over / a move is in flight; a rejected move
      gives clear feedback; **double-click / double-tap cannot send two moves.**
- [ ] Outcome helper is a pure function with tests and handles **win, loss, draw, forfeit, spectator, Pass & Play** — a draw is
      never shown as a win for anyone.
- [ ] Do **not** compute anything from `Date.now()` for gameplay; use the server's turn deadline for the countdown display.
- [ ] Every `useEffect` cleans up (timers, listeners, animation frames). No state updates after unmount. StrictMode-safe
      (effects and state updaters run twice in dev — no side effects inside a `setState` updater).
- [ ] `React.lazy` board import so the game is its own chunk (§13).
- [ ] No hooks after an early `return`. No `key={index}` on reorderable lists.
- [ ] Sound goes through `AudioManager`, haptics through `HapticsManager`. A mute preference is a **declared** storage key (§12).

---

## 10. Room shell & result handling (`client/src/pages/Room.tsx` and friends)

- [ ] `Room.tsx`: lazy import, a `Connect4BoardContainer`, membership in the layout sets that apply (e.g. `FULL_BLEED_GAMES`),
      the friendly-name / label maps, and any header-exclusion list — grep an existing game (`dotsboxes`) in that file and mirror
      every hit.
- [ ] `client/src/store/roomStore.ts`: the per-game public-state map gains `connect4: Connect4PublicState`.
- [ ] **Result/ranking:** `client/src/lib/matchRanking.ts` (`rankMatchPlayers` / `normalizeWinnerId`) and `BhalyamResultModal.tsx`
      must handle a **draw** (no crown) and a forfeit. Add tests. (Bug fixed once already: a tie crowned the host.)
- [ ] `useMatchSettlement` is wired for the terminal match id so the wallet refreshes after a paid match (already generic — verify,
      don't duplicate).
- [ ] Rematch UI works; the opponent leaving mid-game shows the forfeit result, not a frozen board.
- [ ] Reconnect: refreshing the page mid-game restores the board (seat token, 90 s grace) without losing the turn.

---

## 11. Catalog & discovery surfaces (each of these is a separate per-game table)

Tick each, or write "N/A because …". Line numbers drift; **search by the mature-game name** (§2).

**Home / lobby**
- [ ] `client/src/components/bhalyam/data.ts` — slug union + tile metadata (`tileImage`, name, tagline, players, duration).
- [ ] `client/src/pages/home/gameArt.ts`, `client/src/components/games/GameCard.tsx`, `client/src/pages/home/GamesSection.tsx`.
- [ ] `client/src/components/bhalyam/icons.tsx` — a `Connect4Glyph` **stroke icon** (no emoji) and its entries in
      `GameRoomSheet.tsx`, `GameCard.tsx`, `GamesSection.tsx`, and the switch in `components/bhalyam/GameTile.tsx`
      (Tic Tac Toe is missing from this switch — do not copy the omission).
- [ ] `client/src/components/bhalyam/GameRoomSheet.tsx` — the room-creation sheet: glyph map, the game list, the options UI, and
      the `connect4Options` field in the create payload. **Options shown in the UI must equal what the server sanitizes.**
- [ ] `client/src/components/bhalyam/WhatAreWePlayingSection.tsx`.

**Discovery / reporting**
- [ ] `client/src/pages/LeaderboardPage.tsx` (mode config, tips, deep link, filter list) and
      `client/src/components/leaderboard/ModeScorecardsLeaderboard.tsx`.
- [ ] `client/src/features/profile/MatchHistoryList.tsx` (name/icon/mode map **and** the filter `<option>`),
      `client/src/pages/GameStatisticsPage.tsx`, `client/src/components/RoomCodeShare.tsx` (display-name map).
- [ ] `client/src/seo/metadata.ts` (`GAME_SOCIAL_METADATA` + an og image at `client/public/og/connect4.jpg` — Tic Tac Toe and Sudoku
      have none), `client/src/seo/structuredData.ts`.
- [ ] Admin: `client/src/components/admin/live-monitoring/LiveRoomFilters.tsx`, `RecoverySentinel.tsx`, and the hard-coded game list in
      `server/src/observability/TelemetryAggregator.ts` (**a game missing here silently disappears from admin telemetry**).
- [ ] `scripts/quality-gates/bundleBudgetGuard.mjs` — a per-chunk budget for `Connect4Board-*.js`.
- [ ] `client/src/catalog/gameCatalog.ts` reads `BHALYAM_GAME_CATALOGUE` — confirm the game appears in the games page and the tile showcase.

**Learning**
- [ ] Game Academy spec in `client/src/features/academy/data/` (register in `data/index.ts`), with real rules only — see §15 for
      the rules-truth requirement. Add the slug to `ACADEMY_GAMES` in `client/src/lib/privacy/dataInventory.ts`
      (a test fails if you forget).

---

## 12. Privacy (DPDP — strict standing rule) & security

**Storage.** Every `localStorage` / `sessionStorage` / cookie / IndexedDB key the game touches must be declared in
`client/src/lib/privacy/dataInventory.ts` (`key`, `label`, plain-language `description`, `purpose`, `isPersonalData`), with a
test in the style of `client/src/lib/privacy/__tests__/dataInventoryGames.test.ts`. Also:
- [ ] Wrap every storage read/write in `try/catch` (private mode throws); the game must work with storage unavailable.
- [ ] The description says only what is recorded — never claim it changes behaviour if nothing reads it back.
- [ ] Never store other players' names/ids (a past bug: `lastGangs` held other people's names).
- [ ] No network call, external font, image, script or analytics from the game. No third-party asset.
- [ ] Nothing personal in telemetry, event logs or error messages.

**Server-side input handling** (`docs/ai/security-standards.md` in short):
- [ ] Everything a client sends is untrusted: validate type, range and shape **on the server**, drop silently or reject with a
      generic error. Closed sets only (options, reactions, avatars, colours) — set membership, never a permissive pattern.
- [ ] Anything a client sends that the server **re-broadcasts** is an injection point for every other player: sanitize on the way in.
- [ ] Player-controlled strings (display names, chat) are never rendered as HTML.
- [ ] No hidden information in `getPublicState()`; per-player data only via `getStateFor(playerId)`.
- [ ] Seat identity is proven by the signed `seatToken`, never by a `playerId` the client asserts.
- [ ] Rate limits/back-pressure on anything a client can spam (moves, reactions). A flood of moves cannot lag the room.
- [ ] Error messages returned to the client contain no stack traces, file paths, ids of other users, or internal state.
- [ ] No secret, key or token in source, tests or logs.

---

## 13. Build, performance, SSR

- [ ] Board is a lazy chunk; it fits its budget in `bundleBudgetGuard.mjs`. Do not import the board (or big libraries) from shared entry code.
- [ ] Only compositor-friendly animation (`transform`, `opacity`). The disc-drop uses a transform, not `top`/`height`.
- [ ] No `window` / `document` / `localStorage` / `matchMedia` at **module scope or during render** — `entry-server.tsx` prerenders
      pages, and the build's prerender step fails otherwise.
- [ ] **Tailwind cannot see runtime strings.** `shadow-[0_0_20px_${color}]`, `bg-${x}-500`, `w-[${n}px]` **never generate CSS** and log
      invalid-CSS warnings in the build. Use a fixed lookup of complete class names, or an inline `style` for runtime values.
      Tailwind also scans **test files and comments** — never write such a string in either.
- [ ] Any animation/keyframe class you use is actually defined in `client/tailwind.config.js` / `index.css`
      (`animate-scale-in`, `rounded-xs`, `shadow-xs` do not exist in Tailwind 3.4).
- [ ] Assets: provide `.avif` + `.webp` + `.png` fallbacks, sensible size (the PNG tiles are ~1 MB — keep new art smaller), no
      duplicate copies (byte-identical files were found and deleted), no spaces in names.

---

## 14. Accessibility, UX, theming (WCAG 2.1 AA)

- [ ] **Not colour alone.** Red/yellow discs must also differ by a **pattern, shape or label** (WCAG 1.4.1) — players with colour-vision
      deficiency must be able to play. Test in greyscale.
- [ ] Contrast ≥ 4.5:1 for text (3:1 for large/UI) on **every** background, including text on accent-coloured fills — use
      `client/src/features/academy/utils/readableTextColor.ts`. `text-stone-500` on dark panels is ~3.9:1 — too low at small sizes.
- [ ] Keyboard-complete: focus a column with Tab or ←/→, drop with Enter/Space; visible `:focus-visible` ring; nothing is
      mouse-only. **Do not bind bare-letter shortcuts** (WCAG 2.1.4) and do not `preventDefault` Tab. Check the keys do not clash
      with the room shell's own listeners.
- [ ] Column controls are real `<button>`s with names like "Drop in column 3, 2 cells free"; full columns are `aria-disabled`, not just greyed.
- [ ] Turn / win / draw changes are announced via one `role="status"` (`aria-live="polite"`) region — not spammed on every re-render.
- [ ] Every dialog uses the shared `client/src/components/Modal.tsx` (role, `aria-modal`, focus trap, Esc, focus restore, portal); it has an
      accessible name **in every state**. First-run dialogs pass `closeOnBackdropClick={false}`. The backdrop closes on **mousedown**.
      **A stable `onClose`:** callers pass a fresh closure each render, which makes the focus trap steal focus every render — hold the latest
      `onClose` in a ref (see `useGameAcademy` and `HoloDeckOnboardingModal`).
- [ ] Touch targets ≥ 44 × 44 px in both dimensions (a `min-h` without `min-w` on a narrow icon is a fail).
- [ ] Respect reduced motion for every animation (CSS *and* framer-motion — the global CSS rule does not cover JS animation).
- [ ] Dark mode is a **two-part rule**: panels flip dark **and** ink flips light. Test both themes; every bug is one half firing alone.
- [ ] Stroke icons (lucide/`icons.tsx`), no emoji in UI chrome. Copy is plain and truthful.
- [ ] Loading, empty and error states exist (skeleton / `EmptyState`), including "opponent disconnected" and "reconnecting".

---

## 15. Tests (write first; all must pass; none skipped)

Copy the *patterns*: `server/src/games/tictactoe/__tests__/`, `server/src/rooms/__tests__/ticTacToeRoom.test.ts`,
`matchPayoutTiming.test.ts`, `client/src/games/tictactoe/__tests__/`, `client/src/lib/privacy/__tests__/dataInventoryGames.test.ts`,
`client/src/components/games/__tests__/gameCatalog.test.ts`.

**Server**
- [ ] Engine: every move rule in §5 including each invalid-input class; all 4 win directions at edges; win on move 42; draw;
      gravity; turn order + rematch alternation; timeout policy; `removePlayer`; bot legality + determinism.
- [ ] Room: `sanitizeConnect4Options` (garbage/extreme/missing/wrong types ⇒ defaults or clamped); options survive rematch;
      Pass & Play allowed; guest cases; forfeit; departure after game over; disposal leaves no timers.
- [ ] Economy: the §7 scenarios with a real `RoomManager`.
- [ ] Scores: forged client post rejected; draws/forfeits/local seats record nothing; idempotent per `matchId`.

**Client**
- [ ] Board renders both layouts; not-your-turn/game-over/in-flight moves are ignored; double-tap sends one move; outcome helper
      table-tested (win/loss/draw/forfeit/spectator/pass-and-play); keyboard operation; accessible names; a11y assertions.
- [ ] `dataInventory` test pins every key the game writes. `gameCatalog.test.ts` (and any per-game table test) includes `connect4`.
- [ ] Rules-truth test for the academy text: assert the facts it states (7 × 6, connect four, gravity, draw when full, the real keys).

**Test hygiene**
- [ ] `@testing-library/jest-dom` matchers need `import "@testing-library/jest-dom/vitest"` in the file; no `user-event`.
- [ ] `AnimatePresence mode="wait"` keeps the *old* content mounted — use `waitFor` for the new content, or your assertions read stale UI.
- [ ] Use fake timers for clocks; never real `setTimeout` waits. Tests are order-independent and leave no global state.
- [ ] Assertions that can pass with the bug present are worthless — mutate/revert once to confirm the test can fail.

---

## 16. Gates and the hand-back report (this is what the auditor will check)

Run and paste the **tail of each output** (not "it passed"):

```bash
npm run typecheck
npm --prefix server test
npm --prefix client test
npm run build:client && npm run build:server
node scripts/quality-gates/testQualityAudit.mjs
node scripts/quality-gates/accessibilityAudit.mjs
node scripts/quality-gates/dependencyGovernance.mjs
node scripts/quality-gates/performanceBudgetGuard.mjs
node scripts/quality-gates/adminKeySecretLeakGuard.mjs
node scripts/quality-gates/deploymentConfigGuard.mjs
node scripts/quality-gates/bundleBudgetGuard.mjs      # see note
```

- [ ] All green **except** `bundleBudgetGuard`, which already fails on `main` for exactly three chunks (`Game2048Page`, `HandCricketBoard`,
      `WordBuildingBoard`). Your change must not add a fourth. Build output shows **no** CSS/Tailwind warnings.
- [ ] Manual, at least once, on a real dev server (`:4000` / `:5173` belong to the user — start yours on other ports and stop it after):
      two browsers, play a full game, a draw, a forfeit (close a tab), a rematch, a refresh mid-game, Pass & Play, a guest, a signed-in
      paid match with the wallet shown before and after. Say honestly what you did **not** verify.
- [ ] Re-ran §2 with `connect4`; nothing unexplained.

**Hand-back report format** (one section per item; the reviewer reads this before the diff):

1. Files changed / created (from `git status --short -uall`) — and a statement that nothing else changed.
2. The §1 decisions and the user's answers.
3. For each checklist section: ✅ with `file:symbol` evidence, or ❌/N-A with the reason.
4. Test evidence: new test files, counts, and which tests you proved fail-before/pass-after.
5. Every command in this section with its output tail.
6. Known limitations and anything you did not verify.
7. **Do not commit.** Provide a suggested commit message ending with
   `Requested by: Kethan Kumar <kethankumargontla@gmail.com>` (no `Co-Authored-By`).

---

## Appendix A — Defects found in Tic Tac Toe / Sudoku, and the rule that prevents each

| What went wrong | Rule |
|---|---|
| Pass & Play offered in the UI but the server rejected it | §6 `addLocalPlayer` allow-list |
| Game options reset on rematch; turn clock dead on game 2 | §5 clock re-arm, §6 rematch path applies options |
| Options taken from the client without validation | §4 sanitizer; §6 never use the raw payload |
| A tie crowned the host on the result modal | §10 `rankMatchPlayers` handles draws |
| Winner "not credited" — paid on the 5 s sweep, joiner got a 403, wallet never refreshed | §7 tests at ~100 ms; participants may read their settlement |
| Client-recorded scores could be forged; replays double-counted | §8 `serverScored`, `strictModes`, `matchId` idempotency, rate limit |
| Sudoku times faked just inside the plausible floor | Only server-computed results may carry rewards/rank |
| Tailwind class built from a runtime value never rendered; build logged CSS warnings (also from a **comment in a test**) | §13 |
| Undeclared storage keys (33 in the academy alone); other players' names stored | §12 |
| Copy promised "+50 XP", coin-rain sound, "zero latency", "privacy-respecting" voice | §0 nothing faked |
| Focus stolen back to a button on every parent re-render | §14 stable `onClose` via ref |
| Bare-letter shortcuts and `preventDefault` on Tab; duplicate Esc handling | §14 |
| Tutorial text stated rules the engine does not implement | §11/§15 rules-truth test |
| Tutorial demos unrelated to their slide; timers firing after unmount | §9 cleanup; only real demos |
| Duplicate byte-identical image files; file names with spaces | §13 assets |
| Per-game tables missed (history, stats, SEO, admin filters, telemetry, catalogue, bundle budget, tile switch, og image) | §2 discovery command + §11 |
| Tests that passed with the bug present; stale UI read during animation | §15 test hygiene |
| Positional `createRoom` arguments shifted, breaking tests elsewhere | §6 update every caller/helper; run the full suite |

## Appendix B — Connect 4 rule facts to encode in tests and in the academy text

- Board **7 columns × 6 rows**; a move chooses a **column**; the disc falls to the lowest empty cell.
- Win = four (or more) of your discs in a straight line: horizontal, vertical, or either diagonal.
- Draw = all 42 cells filled with no four-in-a-row. A four-in-a-row on the 42nd disc is still a win.
- Two players; red/yellow (or the agreed pair) must be distinguishable **without colour**.
- Do not describe features that do not exist (special discs, power-ups, ranked seasons) unless they are built and tested.
