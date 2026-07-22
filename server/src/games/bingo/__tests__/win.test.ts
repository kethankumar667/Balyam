import { describe, it, expect } from "vitest";
import type { BingoBoard } from "@shared/types.js";
import { validateWin } from "../win.js";

/** Build a board where cell `index` holds `value` (1-75, unique enough for
 * the test) for every entry in `values`; every other non-free cell gets an
 * unused filler value that is guaranteed to never be called. */
function makeBoard(values: Record<number, number>): BingoBoard {
  let filler = 1000; // out of the 1-75 call range - never matches calledNumbers
  const cells = [];
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      cells.push({ index: 12, letter: "N" as const, value: null, free: true, marked: true });
      continue;
    }
    const value = values[i] ?? filler++;
    cells.push({ index: i, letter: "B" as const, value, free: false, marked: false });
  }
  return cells;
}

describe("validateWin", () => {
  it("rejects a board with nothing called", () => {
    const board = makeBoard({});
    expect(validateWin(board, new Set()).valid).toBe(false);
  });

  it("accepts a completed row (top row, uses the FREE-less indices 0-4)", () => {
    const board = makeBoard({ 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 });
    const result = validateWin(board, new Set([1, 2, 3, 4, 5]));
    expect(result).toEqual({ valid: true, pattern: "row0" });
  });

  it("accepts a completed column that passes through the FREE center", () => {
    // col2 = indices 2,7,12,17,22 - index 12 is FREE, so only 4 real calls needed.
    const board = makeBoard({ 2: 31, 7: 32, 17: 33, 22: 34 });
    const result = validateWin(board, new Set([31, 32, 33, 34]));
    expect(result).toEqual({ valid: true, pattern: "col2" });
  });

  it("accepts a completed diagonal", () => {
    const board = makeBoard({ 0: 1, 6: 2, 18: 3, 24: 4 }); // 12 is FREE
    const result = validateWin(board, new Set([1, 2, 3, 4]));
    expect(result).toEqual({ valid: true, pattern: "diagTL" });
  });

  it("accepts four corners without needing a full line", () => {
    const board = makeBoard({ 0: 1, 4: 2, 20: 3, 24: 4 });
    const result = validateWin(board, new Set([1, 2, 3, 4]));
    expect(result).toEqual({ valid: true, pattern: "fourCorners" });
  });

  it("reports full house over any lesser pattern when all 25 are marked", () => {
    const values: Record<number, number> = {};
    for (let i = 0; i < 25; i++) if (i !== 12) values[i] = i + 1;
    const board = makeBoard(values);
    const called = new Set(Object.values(values));
    const result = validateWin(board, called);
    expect(result).toEqual({ valid: true, pattern: "fullHouse" });
  });

  it("rejects a near-miss line (4 of 5 called)", () => {
    const board = makeBoard({ 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 });
    const result = validateWin(board, new Set([1, 2, 3, 4])); // missing 5
    expect(result.valid).toBe(false);
  });
});
