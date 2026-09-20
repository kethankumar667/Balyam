import { describe, expect, it } from "vitest";
import { CONNECT4_COLUMNS, CONNECT4_BOT_DIFFICULTIES } from "@shared/types.js";
import { createGrid, legalColumns, withDisc, type Grid } from "../connect4Board.js";
import { BOT_NODE_BUDGET, chooseBotColumn, chooseFallbackColumn, findImmediateWin } from "../connect4Ai.js";
import { gridFrom, mulberry32 } from "./connect4TestUtils.js";

// Red ("R") threatens to complete four in every "threat" position below.
const RED_THREATENS_ROW = [".......", ".......", ".......", ".......", ".......", "RRR...."];
const RED_THREATENS_COLUMN = [".......", ".......", ".......", "R......", "R......", "R......"];
// Red holds (5,0) (4,1) (3,2); column 3 is filled to row 3, so (2,3) is playable NOW and completes the diagonal.
const RED_THREATENS_DIAGONAL = [".......", ".......", ".......", "..RR...", ".RYY...", "RYYR..."];

describe("findImmediateWin", () => {
  it.each([
    ["a row", RED_THREATENS_ROW, 3],
    ["a column", RED_THREATENS_COLUMN, 0],
    ["a diagonal", RED_THREATENS_DIAGONAL, 3],
  ] as const)("finds a win that completes %s", (_name, rows, column) => {
    expect(findImmediateWin(gridFrom(rows), "R")).toBe(column);
  });

  it("returns null when there is no one-move win", () => {
    expect(findImmediateWin(createGrid(), "R")).toBeNull();
    expect(findImmediateWin(gridFrom(RED_THREATENS_ROW), "Y")).toBeNull();
  });

  it("does not offer a winning cell that is not yet reachable (it must be playable NOW)", () => {
    // Red has three in row 4 with (4,3) empty, but (5,3) below it is empty too: dropping in column 3
    // lands on row 5, not row 4, so there is no win available yet.
    const grid = gridFrom([".......", ".......", ".......", ".......", "RRR....", "YYY...."]);
    expect(findImmediateWin(grid, "R")).toBeNull();
  });

  it("ignores a full column", () => {
    const grid = gridFrom(["Y......", "R......", "Y......", "R......", "Y......", "R......"]);
    expect(findImmediateWin(grid, "R")).toBeNull();
  });
});

describe("chooseFallbackColumn (the plain timeout move: win, else block, else most central)", () => {
  it("plays the centre column first, then spreads outwards", () => {
    let grid: Grid = createGrid();
    const played: number[] = [];
    let disc: "R" | "Y" = "R";
    for (let i = 0; i < 6; i++) {
      const column = chooseFallbackColumn(grid, disc);
      expect(column).not.toBeNull();
      played.push(column!);
      grid = withDisc(grid, column!, disc)!.grid;
      disc = disc === "R" ? "Y" : "R";
    }
    expect(played[0]).toBe(3);
    expect(played.every((c) => c >= 0 && c < CONNECT4_COLUMNS)).toBe(true);
  });

  it("takes a win over everything else", () => {
    expect(chooseFallbackColumn(gridFrom(RED_THREATENS_ROW), "R")).toBe(3);
  });

  it("blocks when it cannot win", () => {
    expect(chooseFallbackColumn(gridFrom(RED_THREATENS_ROW), "Y")).toBe(3);
  });

  it("prefers its own win to blocking the opponent's", () => {
    // Yellow can win in column 6; red can win in column 3. Yellow to move must take its own win.
    const grid = gridFrom([".......", ".......", ".......", "......Y", "......Y", "RRR...Y"]);
    expect(chooseFallbackColumn(grid, "Y")).toBe(6);
  });

  it("never returns a full column and returns null when the board is full", () => {
    const fullColumn = gridFrom(["Y......", "R......", "Y......", "R......", "Y......", "R......"]);
    expect(legalColumns(fullColumn)).not.toContain(0);
    expect(chooseFallbackColumn(fullColumn, "R")).not.toBe(0);

    const fullBoard = gridFrom(["RYRYRYR", "RYRYRYR", "YRYRYRY", "YRYRYRY", "RYRYRYR", "RYRYRYR"]);
    expect(chooseFallbackColumn(fullBoard, "R")).toBeNull();
  });
});

describe("chooseBotColumn", () => {
  it("has a finite, modest node budget per difficulty (a bot must never stall the server)", () => {
    expect(BOT_NODE_BUDGET.easy).toBe(0);
    expect(BOT_NODE_BUDGET.medium).toBeGreaterThan(0);
    expect(BOT_NODE_BUDGET.pro).toBeGreaterThan(BOT_NODE_BUDGET.medium);
    expect(BOT_NODE_BUDGET.pro).toBeLessThanOrEqual(150_000);
  });

  it.each([...CONNECT4_BOT_DIFFICULTIES])("%s: returns null when the board is full", (difficulty) => {
    const fullBoard = gridFrom(["RYRYRYR", "RYRYRYR", "YRYRYRY", "YRYRYRY", "RYRYRYR", "RYRYRYR"]);
    expect(chooseBotColumn(fullBoard, "R", difficulty, mulberry32(1))).toBeNull();
  });

  it.each([...CONNECT4_BOT_DIFFICULTIES])("%s: takes an immediate win", (difficulty) => {
    expect(chooseBotColumn(gridFrom(RED_THREATENS_ROW), "R", difficulty, mulberry32(3))).toBe(3);
    expect(chooseBotColumn(gridFrom(RED_THREATENS_COLUMN), "R", difficulty, mulberry32(3))).toBe(0);
  });

  it.each([...CONNECT4_BOT_DIFFICULTIES])("%s: blocks an immediate loss", (difficulty) => {
    expect(chooseBotColumn(gridFrom(RED_THREATENS_ROW), "Y", difficulty, mulberry32(5))).toBe(3);
    expect(chooseBotColumn(gridFrom(RED_THREATENS_COLUMN), "Y", difficulty, mulberry32(5))).toBe(0);
  });

  it.each([...CONNECT4_BOT_DIFFICULTIES])("%s: is deterministic for a given seed", (difficulty) => {
    const grid = gridFrom([".......", ".......", ".......", ".......", "..R....", "..Y.R.."]);
    const a = chooseBotColumn(grid, "Y", difficulty, mulberry32(99));
    const b = chooseBotColumn(grid, "Y", difficulty, mulberry32(99));
    expect(a).toBe(b);
  });

  it.each([...CONNECT4_BOT_DIFFICULTIES])("%s: always returns a legal column on any position (fuzz)", (difficulty) => {
    const random = mulberry32(2024);
    // A pro search is deliberately the expensive one; fewer positions keep the suite quick.
    const positions = difficulty === "pro" ? 6 : 25;
    for (let game = 0; game < positions; game++) {
      let grid: Grid = createGrid();
      let disc: "R" | "Y" = "R";
      const plies = Math.floor(random() * 30);
      for (let ply = 0; ply < plies; ply++) {
        const legal = legalColumns(grid);
        if (legal.length === 0) break;
        const column = legal[Math.floor(random() * legal.length)];
        grid = withDisc(grid, column, disc)!.grid;
        disc = disc === "R" ? "Y" : "R";
      }
      const choice = chooseBotColumn(grid, disc, difficulty, random);
      if (legalColumns(grid).length === 0) {
        expect(choice).toBeNull();
      } else {
        expect(choice).not.toBeNull();
        expect(legalColumns(grid)).toContain(choice);
      }
    }
  });

  describe("searching bots (medium and pro)", () => {
    // Red holds (5,2) and (5,3); columns 1 and 5 are open. Red to move.
    // Column 4 makes an OPEN THREE (R at 2,3,4 with 1 and 5 both playable): unstoppable next move.
    const DOUBLE_THREAT = [".......", ".......", ".......", ".......", ".......", "Y.RR..Y"];

    it.each(["medium", "pro"] as const)("%s finds the move that creates a double threat", (difficulty) => {
      expect(chooseBotColumn(gridFrom(DOUBLE_THREAT), "R", difficulty, mulberry32(11))).toBe(4);
    });

    it.each(["medium", "pro"] as const)("%s does not hand the opponent a win on top of its own disc", (difficulty) => {
      // Yellow holds (4,0),(4,1),(4,2); the cell (4,3) is empty and (5,3) below it is empty.
      // Red must NOT play column 3: that would let Yellow drop onto (4,3) and win.
      const grid = gridFrom([".......", ".......", ".......", ".......", "YYY....", "RYR...."]);
      const choice = chooseBotColumn(grid, "R", difficulty, mulberry32(21));
      expect(choice).not.toBe(3);
    });

    it("pro answers within a sane wall-clock time on the emptiest, most expensive position", () => {
      const started = performance.now();
      const choice = chooseBotColumn(createGrid(), "R", "pro", mulberry32(1));
      const elapsedMs = performance.now() - started;
      expect([2, 3, 4]).toContain(choice); // a centre-ish opening, as any sensible search prefers
      expect(elapsedMs).toBeLessThan(2_000); // generous: the real cost is a few tens of ms
    });
  });
});
