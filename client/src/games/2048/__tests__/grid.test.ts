import { describe, expect, it } from "vitest";
import {
  emptyCells,
  emptyGrid,
  hasAnyMove,
  highestTile,
  insertGarbage,
  slideAndMerge,
  spawnTile,
  swapCells,
} from "../grid";
import type { Grid } from "../grid";

function grid(values: number[]): Grid {
  expect(values.length).toBe(16);
  return values.map((v) => (v === 0 ? null : { value: v }));
}

describe("2048 grid", () => {
  describe("slideAndMerge", () => {
    it("slides a single row left, closing the gap, without merging", () => {
      const g = grid([0, 2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = slideAndMerge(g, "left");
      expect(result.moved).toBe(true);
      expect(result.mergeCount).toBe(0);
      expect(result.grid.slice(0, 4).map((c) => c?.value ?? 0)).toEqual([2, 4, 0, 0]);
    });

    it("merges exactly once per pair per move — [2,2,2,2] left becomes [4,4,0,0], not [8,0,0,0]", () => {
      const g = grid([2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = slideAndMerge(g, "left");
      expect(result.grid.slice(0, 4).map((c) => c?.value ?? 0)).toEqual([4, 4, 0, 0]);
      expect(result.mergeCount).toBe(2);
      expect(result.scoreGained).toBe(8);
    });

    it("slides right, packing toward the far edge", () => {
      const g = grid([2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = slideAndMerge(g, "right");
      expect(result.grid.slice(0, 4).map((c) => c?.value ?? 0)).toEqual([0, 0, 2, 4]);
    });

    it("slides a column up", () => {
      const g = grid([0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0]);
      const result = slideAndMerge(g, "up");
      const col0 = [0, 4, 8, 12].map((i) => result.grid[i]?.value ?? 0);
      expect(col0).toEqual([4, 0, 0, 0]);
      expect(result.mergeCount).toBe(1);
    });

    it("reports moved: false for a no-op move", () => {
      const g = grid([2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = slideAndMerge(g, "left");
      expect(result.moved).toBe(false);
      expect(result.mergeCount).toBe(0);
    });

    it("strips the isGarbage flag off every tile once it passes through a slide", () => {
      const g: Grid = emptyGrid();
      g[0] = { value: 2, isGarbage: true };
      const result = slideAndMerge(g, "left");
      const survivor = result.grid.find((c) => c?.value === 2);
      expect(survivor?.isGarbage).toBeUndefined();
    });
  });

  describe("hasAnyMove", () => {
    it("is true whenever there is an empty cell", () => {
      const g = emptyGrid();
      g[0] = { value: 2 };
      expect(hasAnyMove(g)).toBe(true);
    });

    it("is false on a full board with no legal merge anywhere", () => {
      const values = [
        2, 4, 2, 4,
        4, 2, 4, 2,
        2, 4, 2, 4,
        4, 2, 4, 2,
      ];
      expect(hasAnyMove(grid(values))).toBe(false);
    });
  });

  describe("highestTile", () => {
    it("returns 0 for an empty grid", () => {
      expect(highestTile(emptyGrid())).toBe(0);
    });

    it("returns the largest value on the board", () => {
      const g = emptyGrid();
      g[3] = { value: 64 };
      g[10] = { value: 128 };
      expect(highestTile(g)).toBe(128);
    });
  });

  describe("spawnTile", () => {
    it("only ever fills an empty cell", () => {
      const g = emptyGrid();
      g[5] = { value: 2 };
      const next = spawnTile(g, () => 0);
      const filled = emptyCells(g).filter((i) => next[i] != null);
      expect(filled.length).toBe(1);
      expect(next[5]?.value).toBe(2);
    });

    it("spawns a 2 when the value roll is below 0.9, a 4 otherwise", () => {
      const low = spawnTile(emptyGrid(), () => 0);
      expect(low.find((c) => c != null)?.value).toBe(2);
      const high = spawnTile(emptyGrid(), () => 0.95);
      expect(high.find((c) => c != null)?.value).toBe(4);
    });

    it("is a no-op on a full board", () => {
      const values = new Array(16).fill(2);
      const g = grid(values);
      const next = spawnTile(g, () => 0);
      expect(next.every((c, i) => c?.value === g[i]?.value)).toBe(true);
    });

    it("marks the spawned tile as garbage with a fixed value when asked", () => {
      const next = spawnTile(emptyGrid(), () => 0, { value: 2, isGarbage: true });
      const spawned = next.find((c) => c != null);
      expect(spawned).toEqual({ value: 2, isGarbage: true });
    });
  });

  describe("insertGarbage", () => {
    it("drops exactly `count` garbage tiles when there's room", () => {
      const next = insertGarbage(emptyGrid(), 3, () => 0);
      const garbageCells = next.filter((c) => c?.isGarbage);
      expect(garbageCells.length).toBe(3);
      expect(garbageCells.every((c) => c?.value === 2)).toBe(true);
    });

    it("stops early once the board is full, never throwing or looping forever", () => {
      const almostFull = grid(new Array(16).fill(2));
      almostFull[0] = null;
      const next = insertGarbage(almostFull, 5, () => 0);
      expect(next.filter((c) => c == null).length).toBe(0);
      expect(next[0]).toEqual({ value: 2, isGarbage: true });
    });

    it("is a no-op when count is 0", () => {
      const g = emptyGrid();
      const next = insertGarbage(g, 0, () => 0);
      expect(next.every((c) => c == null)).toBe(true);
    });
  });

  describe("swapCells", () => {
    it("swaps two adjacent cells horizontally and vertically", () => {
      const g = emptyGrid();
      g[0] = { value: 64 };
      g[1] = { value: 128 };
      const swappedH = swapCells(g, 0, 1);
      expect(swappedH[0]).toEqual({ value: 128 });
      expect(swappedH[1]).toEqual({ value: 64 });

      g[4] = { value: 256 };
      const swappedV = swapCells(g, 0, 4);
      expect(swappedV[0]).toEqual({ value: 256 });
      expect(swappedV[4]).toEqual({ value: 64 });
    });

    it("rejects swapping non-adjacent cells", () => {
      const g = emptyGrid();
      g[0] = { value: 64 };
      g[3] = { value: 128 };
      const swapped = swapCells(g, 0, 3);
      expect(swapped[0]).toEqual({ value: 64 });
      expect(swapped[3]).toEqual({ value: 128 });
    });
  });

  describe("wildcard mechanics", () => {
    it("merges a wildcard with a regular tile to double the regular tile's value", () => {
      const g = emptyGrid();
      g[0] = { value: 32 };
      g[1] = { value: 0, isWildcard: true };
      const res = slideAndMerge(g, "left");
      expect(res.moved).toBe(true);
      expect(res.grid[0]).toEqual({ value: 64 });
      expect(res.scoreGained).toBe(64);
    });

    it("merges two wildcards together to yield 4", () => {
      const g = emptyGrid();
      g[0] = { value: 0, isWildcard: true };
      g[1] = { value: 0, isWildcard: true };
      const res = slideAndMerge(g, "left");
      expect(res.moved).toBe(true);
      expect(res.grid[0]).toEqual({ value: 4 });
      expect(res.scoreGained).toBe(4);
    });
  });
});
