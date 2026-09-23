import { describe, expect, it } from "vitest";
import { CONNECT4_COLUMNS, CONNECT4_ROWS } from "@shared/types.js";
import {
  cloneGrid,
  createGrid,
  findWinningCells,
  isFull,
  landingRow,
  legalColumns,
  withDisc,
} from "../connect4Board.js";
import { gridFrom } from "./connect4TestUtils.js";

const EMPTY: readonly string[] = Array<string>(CONNECT4_ROWS).fill(".".repeat(CONNECT4_COLUMNS));

describe("connect4Board — grid basics", () => {
  it("createGrid is 6 rows x 7 columns, all empty", () => {
    const grid = createGrid();
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
      expect(row.every((cell) => cell === null)).toBe(true);
    }
  });

  it("createGrid returns independent rows (no shared array references)", () => {
    const grid = createGrid();
    grid[0][0] = "R";
    expect(grid[1][0]).toBeNull();
  });

  it("cloneGrid is a deep copy", () => {
    const original = gridFrom(EMPTY);
    const copy = cloneGrid(original);
    copy[5][3] = "Y";
    expect(original[5][3]).toBeNull();
  });
});

describe("connect4Board — landing and legality", () => {
  it("a disc lands in the lowest empty row of its column", () => {
    const grid = createGrid();
    expect(landingRow(grid, 3)).toBe(5);
    const stacked = gridFrom([".......", ".......", ".......", "...Y...", "...R...", "...R..."]);
    expect(landingRow(stacked, 3)).toBe(2);
  });

  it.each([-1, 7, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("landingRow rejects column %s", (column) => {
    expect(landingRow(createGrid(), column)).toBeNull();
  });

  it("a full column has no landing row and is not legal", () => {
    const grid = gridFrom(["R......", "Y......", "R......", "Y......", "R......", "Y......"]);
    expect(landingRow(grid, 0)).toBeNull();
    expect(legalColumns(grid)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("all seven columns are legal on an empty board", () => {
    expect(legalColumns(createGrid())).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("withDisc places immutably and reports the row it landed in", () => {
    const before = createGrid();
    const result = withDisc(before, 2, "R");
    expect(result).not.toBeNull();
    expect(result?.row).toBe(5);
    expect(result?.grid[5][2]).toBe("R");
    expect(before[5][2]).toBeNull();
  });

  it("withDisc refuses a full column", () => {
    const grid = gridFrom(["R......", "Y......", "R......", "Y......", "R......", "Y......"]);
    expect(withDisc(grid, 0, "R")).toBeNull();
  });

  it("isFull is true only when every cell is taken", () => {
    expect(isFull(createGrid())).toBe(false);
    const almost = gridFrom(["RYRYRYR", "RYRYRYR", "YRYRYRY", "YRYRYRY", "RYRYRYR", "RYRYRY."]);
    expect(isFull(almost)).toBe(false);
    const full = gridFrom(["RYRYRYR", "RYRYRYR", "YRYRYRY", "YRYRYRY", "RYRYRYR", "RYRYRYR"]);
    expect(isFull(full)).toBe(true);
  });
});

describe("connect4Board — findWinningCells", () => {
  it("returns null when the last disc makes no four", () => {
    const grid = gridFrom([".......", ".......", ".......", ".......", ".......", "RRR...."]);
    expect(findWinningCells(grid, 5, 2)).toBeNull();
  });

  it("finds a horizontal four at the left edge, right edge and middle", () => {
    const left = gridFrom([".......", ".......", ".......", ".......", ".......", "RRRR..."]);
    expect(findWinningCells(left, 5, 0)).toHaveLength(4);
    const right = gridFrom([".......", ".......", ".......", ".......", ".......", "...RRRR"]);
    expect(findWinningCells(right, 5, 6)).toHaveLength(4);
    const middle = gridFrom([".......", ".......", ".......", ".......", ".......", ".RRRR.."]);
    expect(findWinningCells(middle, 5, 2)).toEqual(
      expect.arrayContaining([
        { row: 5, col: 1 },
        { row: 5, col: 2 },
        { row: 5, col: 3 },
        { row: 5, col: 4 },
      ]),
    );
  });

  it("finds a vertical four including the top row", () => {
    const grid = gridFrom(["Y......", "Y......", "Y......", "Y......", "R......", "R......"]);
    const cells = findWinningCells(grid, 0, 0);
    expect(cells).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
    ]);
  });

  it("finds an ascending diagonal (bottom-left to top-right)", () => {
    const grid = gridFrom([".......", ".......", "...R...", "..RY...", ".RYY...", "RYYR..."]);
    const cells = findWinningCells(grid, 2, 3);
    expect(cells).toEqual(
      expect.arrayContaining([
        { row: 5, col: 0 },
        { row: 4, col: 1 },
        { row: 3, col: 2 },
        { row: 2, col: 3 },
      ]),
    );
    expect(cells).toHaveLength(4);
  });

  it("finds a descending diagonal (top-left to bottom-right)", () => {
    const diag = gridFrom(["R......", "YR.....", "YYR....", "RYYR...", ".......", "......."]);
    const cells = findWinningCells(diag, 3, 3);
    expect(cells).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 1, col: 1 },
        { row: 2, col: 2 },
        { row: 3, col: 3 },
      ]),
    );
    expect(cells).toHaveLength(4);
  });

  it("returns the WHOLE run when it is longer than four (five in a row counts)", () => {
    const grid = gridFrom([".......", ".......", ".......", ".......", ".......", "RRRRRY."]);
    const cells = findWinningCells(grid, 5, 2);
    expect(cells).toHaveLength(5);
    expect(cells?.map((c) => c.col).sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("does not count a run of the other colour, or a run broken by a different disc", () => {
    const broken = gridFrom([".......", ".......", ".......", ".......", ".......", "RRYRR.."]);
    expect(findWinningCells(broken, 5, 4)).toBeNull();
    const other = gridFrom([".......", ".......", ".......", ".......", ".......", "YYYYRRR"]);
    expect(findWinningCells(other, 5, 6)).toBeNull();
  });

  it("reports a win when two lines cross at the last disc (all cells from both lines)", () => {
    // The disc at row 5, column 3 completes BOTH the bottom row (five long) and column 3 (four long).
    const grid = gridFrom([".......", ".......", "...R...", "...R...", "...R...", "RRRRR.."]);
    const cells = findWinningCells(grid, 5, 3);
    expect(cells).toHaveLength(8); // 5 + 4, sharing the disc they cross at
    expect(new Set(cells?.map((c) => `${c.row},${c.col}`)).size).toBe(8);
  });
});
