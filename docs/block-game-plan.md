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

## 8. Open decisions

- **Piece set.** Block Blast uses ~20 polyominoes. Ours should be tuned so a
  bad draw is rare but possible — needs playtesting, not derivation.
- **Race duration.** 3 minutes is a guess. Long enough for a comeback, short
  enough for "again".
- **Does solo score feed a leaderboard?** That needs the database, which is
  still unbuilt. Ship solo as personal-best-in-localStorage first.
