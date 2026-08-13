import { describe, expect, it } from "vitest";
import { BLOCK_GRID } from "@shared/types.js";
import {
  anyFit,
  clearLines,
  emptyGrid,
  fits,
  idx,
  lineScore,
  placeInto,
  scorePlacement,
  streakMultiplier,
  PERFECT_CLEAR_BONUS,
} from "../grid.js";
import { PIECE_BY_ID } from "../pieces.js";

function piece(id: string) {
  const p = PIECE_BY_ID.get(id);
  if (!p) throw new Error(`No piece "${id}" — the table changed under this test`);
  return p;
}

/** Fills a whole row except the given columns. */
function fillRowExcept(grid: number[], row: number, gaps: number[]): void {
  for (let c = 0; c < BLOCK_GRID; c++) {
    if (!gaps.includes(c)) grid[idx(row, c)] = 9;
  }
}

describe("fits", () => {
  it("accepts a piece inside the board on empty cells", () => {
    expect(fits(emptyGrid(), piece("sq2"), 0, 0)).toBe(true);
    expect(fits(emptyGrid(), piece("sq2"), 6, 6)).toBe(true);
  });

  it("refuses a piece that would hang off the edge", () => {
    // 2x2 at row 7 needs row 8, which does not exist.
    expect(fits(emptyGrid(), piece("sq2"), 7, 0)).toBe(false);
    expect(fits(emptyGrid(), piece("sq2"), 0, 7)).toBe(false);
    expect(fits(emptyGrid(), piece("h5"), 0, 4)).toBe(false);
    expect(fits(emptyGrid(), piece("h5"), 0, 3)).toBe(true);
  });

  it("refuses negative coordinates", () => {
    // The wire carries whatever a client sends. `-1` must not read off the
    // start of the array and silently succeed.
    expect(fits(emptyGrid(), piece("dot"), -1, 0)).toBe(false);
    expect(fits(emptyGrid(), piece("dot"), 0, -1)).toBe(false);
  });

  it("refuses an overlap even when the bounding box is clear", () => {
    const grid = emptyGrid();
    grid[idx(1, 1)] = 3;
    // The corner piece's own cells are (0,0),(1,0),(1,1) — only the last one
    // collides, so a bounding-box-only check would let this through.
    expect(fits(grid, piece("c3a"), 0, 0)).toBe(false);
    // Same box, different orientation, no collision.
    expect(fits(grid, piece("c3b"), 0, 0)).toBe(true);
  });
});

describe("clearLines", () => {
  it("clears a completed row and nothing else", () => {
    const grid = emptyGrid();
    fillRowExcept(grid, 3, []);
    grid[idx(5, 5)] = 4;

    const result = clearLines(grid);
    expect(result.rows).toEqual([3]);
    expect(result.cols).toEqual([]);
    expect(result.lines).toBe(1);
    expect(grid[idx(3, 0)]).toBe(0);
    expect(grid[idx(5, 5)]).toBe(4);
  });

  it("counts a crossing row and column as two lines", () => {
    /**
     * The bug this pins: clearing rows first empties the shared cell, so the
     * column is no longer full by the time it is measured and the player is
     * paid for one line after visibly taking down two.
     */
    const grid = emptyGrid();
    for (let c = 0; c < BLOCK_GRID; c++) grid[idx(2, c)] = 1;
    for (let r = 0; r < BLOCK_GRID; r++) grid[idx(r, 4)] = 1;

    const result = clearLines(grid);
    expect(result.rows).toEqual([2]);
    expect(result.cols).toEqual([4]);
    expect(result.lines).toBe(2);
    expect(grid.every((v) => v === 0)).toBe(true);
  });

  it("reports a perfect clear only when the board is left empty", () => {
    const full = emptyGrid();
    for (let c = 0; c < BLOCK_GRID; c++) full[idx(0, c)] = 1;
    expect(clearLines(full).perfect).toBe(true);

    const leftovers = emptyGrid();
    for (let c = 0; c < BLOCK_GRID; c++) leftovers[idx(0, c)] = 1;
    leftovers[idx(4, 4)] = 2;
    expect(clearLines(leftovers).perfect).toBe(false);
  });

  it("is a no-op on a board with no full line", () => {
    const grid = emptyGrid();
    fillRowExcept(grid, 0, [7]);
    const before = grid.slice();
    const result = clearLines(grid);
    expect(result.lines).toBe(0);
    expect(result.perfect).toBe(false);
    expect(grid).toEqual(before);
  });
});

describe("anyFit", () => {
  it("finds room on an empty board", () => {
    expect(anyFit(emptyGrid(), piece("sq3"))).toBe(true);
  });

  it("returns false when the board is full", () => {
    const grid = emptyGrid().map(() => 1);
    expect(anyFit(grid, piece("dot"))).toBe(false);
  });

  it("finds the one remaining hole", () => {
    const grid = emptyGrid().map(() => 1);
    grid[idx(6, 2)] = 0;
    expect(anyFit(grid, piece("dot"))).toBe(true);
    expect(anyFit(grid, piece("h2"))).toBe(false);
  });
});

describe("scoring", () => {
  it("pays far more for lines taken together than apart", () => {
    // The entire skill ceiling of the genre. If this ever flattens, there is
    // no reason to set anything up.
    expect(lineScore(1)).toBe(10);
    expect(lineScore(2)).toBe(30);
    expect(lineScore(3)).toBe(60);
    expect(lineScore(4)).toBe(100);
    expect(lineScore(2)).toBeGreaterThan(lineScore(1) * 2);
  });

  it("starts the streak multiplier at 1 and caps it", () => {
    expect(streakMultiplier(1)).toBe(1);
    expect(streakMultiplier(2)).toBe(1.5);
    expect(streakMultiplier(7)).toBe(4);
    // Capped — an unbounded multiplier makes one lucky run worth more than
    // every other score in the room combined.
    expect(streakMultiplier(50)).toBe(4);
  });

  it("pays one point per cell and breaks the streak when nothing clears", () => {
    const scored = scorePlacement(4, { rows: [], cols: [], lines: 0, perfect: false }, 5);
    expect(scored.gained).toBe(4);
    expect(scored.streak).toBe(0);
  });

  it("compounds a clear with the streak it continues", () => {
    const first = scorePlacement(3, { rows: [0], cols: [], lines: 1, perfect: false }, 0);
    expect(first.streak).toBe(1);
    expect(first.gained).toBe(3 + 10);

    const second = scorePlacement(3, { rows: [0], cols: [], lines: 1, perfect: false }, 1);
    expect(second.streak).toBe(2);
    expect(second.gained).toBe(3 + 15);
  });

  it("adds the perfect-clear bonus on top", () => {
    const scored = scorePlacement(2, { rows: [0], cols: [], lines: 1, perfect: true }, 0);
    expect(scored.gained).toBe(2 + 10 + PERFECT_CLEAR_BONUS);
  });
});

describe("placeInto", () => {
  it("writes the piece colour into exactly its own cells", () => {
    const grid = emptyGrid();
    const p = piece("c3a");
    placeInto(grid, p, 2, 3);
    expect(grid[idx(2, 3)]).toBe(p.color);
    expect(grid[idx(3, 3)]).toBe(p.color);
    expect(grid[idx(3, 4)]).toBe(p.color);
    expect(grid[idx(2, 4)]).toBe(0);
    expect(grid.filter((v) => v !== 0)).toHaveLength(3);
  });
});
