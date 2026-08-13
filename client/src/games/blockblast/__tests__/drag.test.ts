import { describe, expect, it } from "vitest";
import type { BlockBlastPieceView } from "@shared/types";
import { resolveDrop, type GridRect } from "../useBlockBlastDrag";

/**
 * Drag geometry.
 *
 * This is the only part of the game the player actually operates, and every
 * one of its failure modes is silent — a board that refuses the bottom row,
 * a preview that blinks out at the edges, a piece that lands one square from
 * where it was shown. None of them throw, and none of them show up in a
 * screenshot.
 */

/** A 320px board at the top-left of a 320-wide viewport. One cell = 40px. */
const RECT: GridRect = { left: 0, top: 0, right: 320, bottom: 320, width: 320 };
const CELL = 40;
/** Matches LIFT_CELLS in the hook: the piece floats 1.5 cells above the finger. */
const LIFT = CELL * 1.5;

const DOT: BlockBlastPieceView = { id: "dot", cells: [{ r: 0, c: 0 }], w: 1, h: 1, color: 4 };
const SQ2: BlockBlastPieceView = {
  id: "sq2",
  cells: [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
  ],
  w: 2,
  h: 2,
  color: 7,
};
const H5: BlockBlastPieceView = {
  id: "h5",
  cells: [0, 1, 2, 3, 4].map((c) => ({ r: 0, c })),
  w: 5,
  h: 1,
  color: 5,
};

const EMPTY = new Array<number>(64).fill(0);

/** Pointer position that puts a piece's centre over board cell (r, c). */
function pointerFor(piece: BlockBlastPieceView, r: number, c: number) {
  return {
    piece,
    x: RECT.left + c * CELL + (piece.w * CELL) / 2,
    y: RECT.top + r * CELL + (piece.h * CELL) / 2 + LIFT,
  };
}

describe("where the piece lands", () => {
  it("puts a single cell exactly where it is aimed", () => {
    for (const [r, c] of [
      [0, 0],
      [3, 5],
      [7, 7],
    ]) {
      const target = resolveDrop(RECT, pointerFor(DOT, r, c), EMPTY);
      expect(target, `aimed at ${r},${c}`).not.toBeNull();
      expect([target!.r, target!.c]).toEqual([r, c]);
    }
  });

  it("anchors a multi-cell piece by its top-left, not its centre", () => {
    const target = resolveDrop(RECT, pointerFor(SQ2, 2, 3), EMPTY);
    expect([target!.r, target!.c]).toEqual([2, 3]);
    expect(target!.cells.sort((a, b) => a - b)).toEqual([2 * 8 + 3, 2 * 8 + 4, 3 * 8 + 3, 3 * 8 + 4]);
  });

  it("reaches the bottom row even though the finger ends up below the board", () => {
    /**
     * The one that would have shipped broken.
     *
     * Because the piece rides 1.5 cells ABOVE the pointer, placing on row 7
     * puts the finger past `rect.bottom`. A symmetric "is the pointer near
     * the board" margin would reject it — and the bug would only appear on a
     * nearly-full board, which is precisely when the bottom row matters.
     */
    const p = pointerFor(DOT, 7, 4);
    expect(p.y).toBeGreaterThan(RECT.bottom);
    const target = resolveDrop(RECT, p, EMPTY);
    expect(target).not.toBeNull();
    expect(target!.r).toBe(7);
  });
});

describe("the edges", () => {
  it("clamps rather than refusing when dragged past the left", () => {
    // A preview that blinks out when the player is being careful is worse
    // than one that says "column 0".
    const target = resolveDrop(RECT, { piece: SQ2, x: -30, y: 100 + LIFT }, EMPTY);
    expect(target).not.toBeNull();
    expect(target!.c).toBe(0);
  });

  it("never lets a piece hang off the right edge", () => {
    const target = resolveDrop(RECT, { piece: H5, x: 400, y: 100 + LIFT }, EMPTY);
    expect(target).not.toBeNull();
    // Five wide on an eight-wide board: the furthest right it can start.
    expect(target!.c).toBe(3);
    expect(target!.cells.every((i) => i % 8 <= 7)).toBe(true);
  });

  it("gives up once the gesture is nowhere near the board", () => {
    // Back over the tray, or off to one side. No preview, and releasing
    // there must not place anything.
    expect(resolveDrop(RECT, { piece: DOT, x: 160, y: 600 }, EMPTY)).toBeNull();
    expect(resolveDrop(RECT, { piece: DOT, x: 900, y: 160 }, EMPTY)).toBeNull();
  });
});

describe("legality", () => {
  it("refuses a placement that overlaps a filled cell", () => {
    const grid = EMPTY.slice();
    grid[3 * 8 + 4] = 2;
    const target = resolveDrop(RECT, pointerFor(SQ2, 2, 3), grid);
    expect(target!.valid).toBe(false);
    // Still previewed — the player has to be able to see WHY it is refused.
    expect(target!.cells).toHaveLength(4);
    expect(target!.clearing).toEqual([]);
  });

  it("accepts a placement on empty cells", () => {
    expect(resolveDrop(RECT, pointerFor(SQ2, 2, 3), EMPTY)!.valid).toBe(true);
  });
});

describe("the clear preview", () => {
  it("lights the whole row a placement would complete", () => {
    const grid = EMPTY.slice();
    for (let c = 1; c < 8; c++) grid[c] = 9;
    const target = resolveDrop(RECT, pointerFor(DOT, 0, 0), grid);
    expect(target!.valid).toBe(true);
    expect(new Set(target!.clearing)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
  });

  it("lights both lines when a placement completes a row and a column", () => {
    const grid = EMPTY.slice();
    for (let c = 1; c < 8; c++) grid[c] = 9;
    for (let r = 1; r < 8; r++) grid[r * 8] = 9;
    const target = resolveDrop(RECT, pointerFor(DOT, 0, 0), grid);
    expect(target!.clearing.length).toBe(16); // 8 + 8, sharing the corner
    expect(new Set(target!.clearing).size).toBe(15);
  });

  it("stays quiet when nothing would clear", () => {
    expect(resolveDrop(RECT, pointerFor(SQ2, 2, 3), EMPTY)!.clearing).toEqual([]);
  });
});
