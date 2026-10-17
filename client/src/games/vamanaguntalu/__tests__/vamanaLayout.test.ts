import { describe, expect, it } from "vitest";
import { VAMANA_PIT_COUNT } from "@shared/types.js";
import { gridSize, pitCells, seatOfPit, viewerSeatOf, type VamanaOrientation, type VamanaSeat } from "../vamanaLayout";

const at = (seat: VamanaSeat, orientation: VamanaOrientation, pit: number) => {
  const cell = pitCells(seat, orientation).find((c) => c.pit === pit)!;
  return { row: cell.row, col: cell.col };
};

describe("viewerSeatOf", () => {
  it("draws the board from the second seat for the second player, and from the first for everyone else", () => {
    expect(viewerSeatOf(["a", "b"], "a")).toBe(0);
    expect(viewerSeatOf(["a", "b"], "b")).toBe(1);
    expect(viewerSeatOf(["a", "b"], "someone-watching")).toBe(0);
    expect(viewerSeatOf(["a", "b"], "")).toBe(0);
  });
});

describe("seatOfPit", () => {
  it("gives pits 0..6 to the first seat and 7..13 to the second", () => {
    expect(seatOfPit(0)).toBe(0);
    expect(seatOfPit(6)).toBe(0);
    expect(seatOfPit(7)).toBe(1);
    expect(seatOfPit(13)).toBe(1);
  });
});

describe("pitCells — horizontal board", () => {
  it("draws the first seat's own row along the bottom, left to right", () => {
    for (let pit = 0; pit < 7; pit++) expect(at(0, "horizontal", pit)).toEqual({ row: 1, col: pit });
  });

  it("draws the opponent's row along the top, right to left, so seeds run round counter-clockwise", () => {
    expect(at(0, "horizontal", 7)).toEqual({ row: 0, col: 6 });
    expect(at(0, "horizontal", 13)).toEqual({ row: 0, col: 0 });
  });

  it("turns the board half a turn for the second seat so their own row is at the bottom", () => {
    expect(at(1, "horizontal", 7)).toEqual({ row: 1, col: 0 });
    expect(at(1, "horizontal", 13)).toEqual({ row: 1, col: 6 });
    expect(at(1, "horizontal", 0)).toEqual({ row: 0, col: 6 });
    expect(at(1, "horizontal", 6)).toEqual({ row: 0, col: 0 });
  });

  it("marks exactly the viewer's own seven pits as own", () => {
    expect(pitCells(0, "horizontal").filter((c) => c.isOwn).map((c) => c.pit)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pitCells(1, "horizontal").filter((c) => c.isOwn).map((c) => c.pit)).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });
});

describe("pitCells — vertical board (a phone held upright)", () => {
  it("puts the viewer's row in the right column, running upward", () => {
    expect(at(0, "vertical", 0)).toEqual({ row: 6, col: 1 });
    expect(at(0, "vertical", 6)).toEqual({ row: 0, col: 1 });
  });

  it("puts the opponent's row in the left column, running downward", () => {
    expect(at(0, "vertical", 7)).toEqual({ row: 0, col: 0 });
    expect(at(0, "vertical", 13)).toEqual({ row: 6, col: 0 });
  });
});

describe.each<[VamanaSeat, VamanaOrientation]>([
  [0, "horizontal"],
  [1, "horizontal"],
  [0, "vertical"],
  [1, "vertical"],
])("pitCells(seat %i, %s)", (seat, orientation) => {
  const cells = pitCells(seat, orientation);
  const { rows, cols } = gridSize(orientation);

  it("places all 14 pits once each, exactly filling the grid", () => {
    expect(cells).toHaveLength(VAMANA_PIT_COUNT);
    expect(new Set(cells.map((c) => c.pit)).size).toBe(VAMANA_PIT_COUNT);
    expect(new Set(cells.map((c) => `${c.row},${c.col}`)).size).toBe(rows * cols);
    for (const c of cells) {
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(rows);
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeLessThan(cols);
    }
  });

  it("keeps the circuit unbroken: every pit sits right next to the pit seeds travel to next", () => {
    const byPit = new Map(cells.map((c) => [c.pit, c]));
    for (let pit = 0; pit < VAMANA_PIT_COUNT; pit++) {
      const here = byPit.get(pit)!;
      const next = byPit.get((pit + 1) % VAMANA_PIT_COUNT)!;
      expect(Math.abs(here.row - next.row) + Math.abs(here.col - next.col), `pit ${pit} -> ${(pit + 1) % 14}`).toBe(1);
    }
  });
});
