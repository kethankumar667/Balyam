# Block game — design and build plan

Working name: **Block Blast** clone class. Target: beat Block Blast (Hungry
Studio) on the axis we actually own.

---

## 1. The honest competitive read

Block Blast is a very good **single-player** game. Cloning it means competing
on polish, retention loops and ad spend against a studio that has already won
that fight. We would ship a worse version of a free game people already have.

**We should not clone it. We should make it the thing it cannot be.**

Bhalyam's whole identity is *playing with the people you know* — a room code,
a WhatsApp share, your school gang. Block Blast has no room, no friends, no
shared moment. That is the gap:

> Same puzzle. Same pieces. Same order. Your gang. One winner.

The single-player mode still ships — it has to, it is the on-ramp and it is
what people search for — but the reason to open ours instead of theirs is the
room.

---

## 2. Core rules (the part we do copy, because it is the genre)

- **8×8 grid.**
- **Three pieces offered at a time**, drawn from a polyomino set.
- **No rotation.** This is load-bearing: it is what makes the game a planning
  problem rather than a fiddling problem, and it is why it works one-handed.
- **Placement is free** — no gravity, no timer per move.
- **A full row or column clears.** Multiple lines in one placement is a combo.
- **The next three arrive only when all three are placed.** Never refill early;
  the emptying tray is the tension.
- **Game over when no offered piece fits anywhere.** Not when the grid is full.

Scoring: cells placed + line-clear bonus × lines cleared, with a **streak
multiplier** for consecutive placements that clear. The streak is where the
"one more go" lives — protect it in tuning.

---

## 3. Modes

| Mode | Shape | Why |
|---|---|---|
| **Solo** | Endless, personal best | On-ramp; what people expect |
| **Race** (flagship) | Same seed for everyone, fixed duration (3 min), highest score wins | The differentiator. Identical piece sequence means it is pure skill, and everyone can see it was fair |
| **Relay** (later) | One shared grid, players place in turn | Nostalgic, social, argumentative. Fits the hub's character |

Race is the one that justifies the build. Ship Solo + Race; hold Relay until
Race proves out.

---

## 4. Architecture fit

### Engine — `server/src/games/blockblast/BlockBlastEngine.ts`

Implements `GameEngine`. **Turn-based, not real-time** — do *not* declare
`tickRateHz`. Race needs a match deadline, which is a single timer, not a
simulation loop. (See the Bounce bug: an engine that both declares
`tickRateHz` and accepts client ticks lets clients drive the clock.)

```
kind: "blockblast"
minPlayers: 1
maxPlayers: 8
```

State per player: `grid: boolean[64]`, `tray: PieceId[]`, `score`, `streak`,
`isOver`. Shared: `seed`, `deadline` (race only).

Moves:

- `place { pieceIndex: 0|1|2, row, col }`
- `restart` (solo only)

**The server owns placement validation.** Bounds, overlap, and "is this piece
actually in your tray" all check server-side. A client-trusted placement is a
trivially cheatable leaderboard.

### Determinism — the whole point of Race

Piece sequence comes from a **seeded PRNG**, one seed per match, so every
player gets an identical sequence. `BingoEngine.setRng` is the pattern to
follow, and it is already how Bingo's tests stay deterministic.

Seed goes in the match recap so a result can be replayed and disputed.

### Bots

Implement `pendingActors()` and `applyAutoMove()`. A greedy heuristic
(maximise lines cleared, then minimise fragmentation) is enough and gives the
room a fourth player when only three humans show up. `getBotThinkDelayMs`
keeps it from looking like a machine.

---

## 5. Client

`client/src/games/blockblast/` following the established split:

- `BlockBlastBoard.tsx` — layout gate
- `BlockBlastBoardMobile.tsx` / `...Desktop.tsx`
- `useBlockBlastBoard.ts` — the model hook
- `blockblast-shared.tsx` — grid, tray, piece rendering

### Input is the whole product

This is a **drag game on a phone**. Get this wrong and nothing else matters:

- **Pointer events, not click.** (`onClick` cost Snake real input latency.)
- **Drag with an offset** — the piece must sit *above* the finger, not under
  it, or the player cannot see where it lands.
- **Snap preview** — show the target cells highlighted, and show them
  *invalid* in a distinct state, before release.
- **`touch-none`** on the grid and tray, or the browser claims the drag as a
  scroll. This bit Snake's D-pad already.
- `drag-drop-touch` is already a dependency and may serve; verify it does not
  fight pointer capture before committing to it.

### Anti-pattern to avoid

Do **not** add a `theme`/`skin` setting unless it is read by the renderer on
day one. Four settings in this codebase shipped as pickers wired to nothing
(Ludo themes, Bingo auto-mark, chess `pieceSet`, chess `legalDot`), and each
came back as a *player bug report* for a feature that had "shipped".

---

## 6. What makes ours better, concretely

1. **Same-seed fairness, visible.** Show "everyone gets the same pieces" in
   the lobby. It is the reason a race feels worth winning.
2. **Live rival grids.** Small live thumbnails of opponents' boards, like the
   Bingo all-boards view. Seeing someone else's grid fill up is the tension
   Block Blast cannot manufacture.
3. **Reactions and voice.** Both already exist in this hub. A block game with
   your friends shouting is a different product from a block game alone.
4. **No ads, no lives, no energy timer.** Block Blast's monetisation is its
   weakest point with this audience. Ours is a room you already opened.
5. **Telugu/Hindi/Tamil UI.** `LanguageManager` is built; a block game needs
   almost no copy, so this is nearly free and no competitor bothers.

---

## 7. Build order

1. Engine + rules + seeded RNG + tests (grid, clears, combo, game-over
   detection). Pure logic, fully testable, no UI.
2. Registry wiring, shared types, room options.
3. Solo mobile board with real drag. **Playtest before going further** — if
   the drag is not good, nothing after this matters.
4. Race mode: seed broadcast, deadline, live scores.
5. Bots.
6. Desktop board.
7. Rival thumbnails, reactions, polish.

Steps 1–3 are the risk. Everything after is additive.

---

## 8. Balance — measured, not guessed

Simulated by running the shipped bot over 400 full solo games and 20k tray
draws. The bot is 1-ply greedy with noise, so a good human beats it; treat
survival numbers as a floor.

### The economy

The bag averages **3.66 cells per piece → ~11 cells per tray**. A line clear
removes 8. So **1.37 lines per tray** is break-even; the bot manages **1.04**.
That gap is the difficulty curve, and it is why every run ends.

| | |
|---|---|
| Pieces / total weight | 29 / 120 |
| ≤3 cells (flexible) | 47.5% |
| ≥5 cells (heavy) | 21.7% |
| Trays with a 1×1 rescue | 13.1% |
| Heaviest legal tray | 17 cells (27% of the board) |
| Bot score | p10 159 · median 371 · p90 939 |
| Bot placements survived | p10 23 · median 49 · p90 110 |

### Two things this measurement changed

**Race default 180s → 120s.** At a realistic 2.5s per placement, survival to
the whistle is 51% / 25% / 7% for 120 / 180 / 300s. The old default meant
three players in four spent the back half watching. 180 and 300 are still
offered — they are a real choice — but the default should be the length most
people finish.

**Streak cap 6 steps (4×) → 3 steps (2.5×).** At 6 steps, exactly ONE run in
400 ever reached the ceiling: two thirds of the ramp was content that existed
only in the source. At 3 steps, 15% of runs reach it, and the multiplier has
a real distribution (74.5% at 1×, 20.9% at 1.5×, 3.5% at 2×, ~1% at 2.5×).

### Known, not yet acted on

- **Multi-line clears barely happen.** Best clear across 400 games was 3
  lines. `lineScore(4) = 100` is unreachable content, same failure the streak
  cap had. Wait for human data — a good player sets up more than the bot does.
- **Perfect clear is 300 flat** against a median score of 371, occurring 5
  times in 400 games. One lucky perfect could decide a race on a rare event
  rather than on play. Consider scaling it by cells cleared.
- **A dead racer has nothing to do.** Score freezes, they watch. Shortening
  the race helps; letting them restart with their best kept would fix it.

### The constraint that rules out the obvious fix

Block Blast is widely believed to bias its bag toward pieces that fit when
the board is tight. **We cannot do that in Race.** An adaptive bag depends on
board state, boards diverge between players, so trays would diverge — and
"everyone gets the same pieces" becomes false in exactly the matches where it
is the entire pitch.

Adaptive difficulty and same-seed racing are mutually exclusive. A mercy rule
is possible in solo only, at the cost of solo and race scores no longer
measuring the same game — which is already why race scores are kept out of
the personal best.

## 9. Still open

- **Piece weights.** Sound on paper; unvalidated against a human who clears
  meaningfully above 1.04 lines per tray. If a real player does, the
  difficulty reads completely differently and these weights may already be
  right.
- **Does solo score feed a leaderboard?** That needs the database, which is
  still unbuilt. Ship solo as personal-best-in-localStorage first.
