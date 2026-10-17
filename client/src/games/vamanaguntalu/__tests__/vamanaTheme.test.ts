import { describe, expect, it } from "vitest";
import { boardGeometry } from "../vamanaTheme";

/** One pit cell is the unit: a board is 7 cells long, 2 wide, plus a frame all round and, optionally, carved ends. */
const PITS = 7;
const ROWS = 2;

describe("boardGeometry", () => {
  it("is exactly the transpose of itself between the flat and upright boards", () => {
    for (const hasOrnaments of [true, false]) {
      const flat = boardGeometry("horizontal", hasOrnaments);
      const upright = boardGeometry("vertical", hasOrnaments);
      expect(flat.aspect * upright.aspect).toBeCloseTo(1, 10);
      expect(flat.insetXPercent).toBeCloseTo(upright.insetYPercent, 10);
      expect(flat.insetYPercent).toBeCloseTo(upright.insetXPercent, 10);
    }
  });

  it("leaves the pit area exactly 7 cells by 2 on the flat board, however the ends are dressed", () => {
    for (const hasOrnaments of [true, false]) {
      const { aspect, insetXPercent, insetYPercent } = boardGeometry("horizontal", hasOrnaments);
      // Take the board's height as 1 so its width is the aspect ratio.
      const gridWidth = aspect * (1 - (insetXPercent * 2) / 100);
      const gridHeight = 1 - (insetYPercent * 2) / 100;
      expect(gridWidth / gridHeight).toBeCloseTo(PITS / ROWS, 10);
    }
  });

  it("leaves the pit area exactly 2 cells by 7 on the upright board", () => {
    for (const hasOrnaments of [true, false]) {
      const { aspect, insetXPercent, insetYPercent } = boardGeometry("vertical", hasOrnaments);
      const gridWidth = aspect * (1 - (insetXPercent * 2) / 100);
      const gridHeight = 1 - (insetYPercent * 2) / 100;
      expect(gridWidth / gridHeight).toBeCloseTo(ROWS / PITS, 10);
    }
  });

  it("makes room for the carved ends only when asked, so a short phone gets bigger pits", () => {
    const plain = boardGeometry("vertical", false);
    const carved = boardGeometry("vertical", true);
    expect(carved.aspect).toBeLessThan(plain.aspect);
    expect(carved.insetYPercent).toBeGreaterThan(plain.insetYPercent);
    expect(carved.insetXPercent).toBeCloseTo(plain.insetXPercent, 10);
  });

  it("keeps the board longer than it is wide, whichever way it stands", () => {
    expect(boardGeometry("horizontal", true).aspect).toBeGreaterThan(3);
    expect(boardGeometry("vertical", true).aspect).toBeLessThan(1 / 3);
  });
});
