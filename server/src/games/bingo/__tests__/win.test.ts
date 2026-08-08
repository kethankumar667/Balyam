import { describe, it, expect } from "vitest";
import type { BingoBoard } from "@shared/types.js";
import { evaluateBoardLines } from "../win.js";

function makeBoard(values: Record<number, number>): BingoBoard {
  let filler = 100;
  const cells = [];
  for (let i = 0; i < 25; i++) {
    const value = values[i] ?? filler++;
    cells.push({ index: i, value, marked: false });
  }
  return cells;
}

describe("evaluateBoardLines", () => {
  it("reports 0 lines when nothing called", () => {
    const board = makeBoard({});
    const res = evaluateBoardLines(board, new Set());
    expect(res.completedLinesCount).toBe(0);
    expect(res.completedLetters).toEqual([]);
    expect(res.canClaimBingo).toBe(false);
  });

  it("reports 1 line (B) when top row is called", () => {
    const board = makeBoard({ 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 });
    const res = evaluateBoardLines(board, new Set([1, 2, 3, 4, 5]));
    expect(res.completedLinesCount).toBe(1);
    expect(res.completedLetters).toEqual(["B"]);
    expect(res.canClaimBingo).toBe(false);
  });

  it("reports 5 lines (B-I-N-G-O) and allows claim when 5 lines are formed", () => {
    // 5 rows
    const board = makeBoard({
      0: 1, 1: 2, 2: 3, 3: 4, 4: 5,
      5: 6, 6: 7, 7: 8, 8: 9, 9: 10,
      10: 11, 11: 12, 12: 13, 13: 14, 14: 15,
      15: 16, 16: 17, 17: 18, 18: 19, 19: 20,
      20: 21, 21: 22, 22: 23, 23: 24, 24: 25,
    });
    const called = new Set([1,2,3,4,5, 6,7,8,9,10, 11,12,13,14,15, 16,17,18,19,20, 21,22,23,24,25]);
    const res = evaluateBoardLines(board, called);
    expect(res.completedLinesCount).toBe(12);
    expect(res.completedLetters).toEqual(["B", "I", "N", "G", "O"]);
    expect(res.canClaimBingo).toBe(true);
  });
});
