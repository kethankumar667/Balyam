import { BLOCK_GRID } from "@shared/types.js";
import type { BlockPiece } from "./pieces.js";
import { allFits, clearLines, idx, lineScore, placeInto } from "./grid.js";
import type { Grid } from "./grid.js";

export interface BotPlacement {
  slot: number;
  r: number;
  c: number;
}

/**
 * The opponent.
 *
 * A greedy one-ply search: try every legal placement of every tray piece,
 * score the board it would leave behind, take one of the best. No lookahead
 * into future trays — it does not know them, and neither does the player.
 *
 * It is deliberately not optimal. A bot that never makes a mistake is not a
 * hard opponent, it is a wall, and losing to a wall teaches nothing. The
 * noise below keeps it beatable while still punishing genuinely bad play.
 */
export function chooseBotPlacement(
  grid: Grid,
  tray: (BlockPiece | null)[],
  rng: () => number,
): BotPlacement | null {
  const candidates: { move: BotPlacement; value: number }[] = [];

  for (let slot = 0; slot < tray.length; slot++) {
    const piece = tray[slot];
    if (!piece) continue;
    const others = tray.filter((p, i): p is BlockPiece => p != null && i !== slot);

    for (const spot of allFits(grid, piece)) {
      const next = grid.slice();
      placeInto(next, piece, spot.r, spot.c);
      const clear = clearLines(next);
      candidates.push({
        move: { slot, r: spot.r, c: spot.c },
        value: evaluate(next, clear.lines, clear.perfect, others),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.value - a.value);

  /**
   * Pick from the top few rather than always the best. Weighted so the best
   * move is still much the likeliest — this is a wobble, not a coin flip.
   */
  const shortlist = candidates.slice(0, 3);
  const roll = rng();
  const pickIndex = roll < 0.7 ? 0 : roll < 0.92 ? 1 : 2;
  return (shortlist[pickIndex] ?? shortlist[0]).move;
}

function evaluate(
  grid: Grid,
  lines: number,
  perfect: boolean,
  remaining: BlockPiece[],
): number {
  let value = 0;

  // Clearing is the point, and clearing several at once is the point of the
  // point — reuse the real scoring curve so the bot wants what a good player
  // wants rather than what is merely tidy.
  value += lineScore(lines) * 3;
  if (perfect) value += 500;

  let filled = 0;
  let isolated = 0;
  for (let r = 0; r < BLOCK_GRID; r++) {
    for (let c = 0; c < BLOCK_GRID; c++) {
      if (grid[idx(r, c)] !== 0) {
        filled++;
        continue;
      }
      // An empty cell with no empty neighbour can only ever take a 1x1.
      // These are what actually kill a board, long before it looks full.
      const up = r === 0 || grid[idx(r - 1, c)] !== 0;
      const down = r === BLOCK_GRID - 1 || grid[idx(r + 1, c)] !== 0;
      const left = c === 0 || grid[idx(r, c - 1)] !== 0;
      const right = c === BLOCK_GRID - 1 || grid[idx(r, c + 1)] !== 0;
      if (up && down && left && right) isolated++;
    }
  }

  value -= isolated * 8;
  // A lighter board survives a bad draw. Weak on its own, decisive between
  // two placements that are otherwise identical.
  value -= filled * 0.5;

  // Near-full lines are loaded guns. Reward leaving them one or two cells
  // short rather than scattering the same blocks across eight rows.
  for (let i = 0; i < BLOCK_GRID; i++) {
    let rowFilled = 0;
    let colFilled = 0;
    for (let j = 0; j < BLOCK_GRID; j++) {
      if (grid[idx(i, j)] !== 0) rowFilled++;
      if (grid[idx(j, i)] !== 0) colFilled++;
    }
    value += nearFullBonus(rowFilled) + nearFullBonus(colFilled);
  }

  /**
   * Survival check. A placement that strands a piece still sitting in the
   * tray is usually a blunder no amount of tidiness makes up for — the tray
   * does not refill until all three are gone, so a dead piece is a dead game.
   */
  for (const piece of remaining) {
    if (allFits(grid, piece).length === 0) value -= 60;
  }

  return value;
}

function nearFullBonus(count: number): number {
  if (count === BLOCK_GRID - 1) return 4;
  if (count === BLOCK_GRID - 2) return 2;
  return 0;
}
