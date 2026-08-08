import { describe, it, expect } from "vitest";
import { generateBoard, generateUniqueBoard, boardFingerprint, shuffleArray } from "../board.js";

describe("generateBoard", () => {
  it("produces 25 cells holding numbers 1 to 25", () => {
    const board = generateBoard(Math.random);
    expect(board).toHaveLength(25);
    const vals = board.map((c) => c.value);
    expect([...vals].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1)
    );
    board.forEach((c, i) => expect(c.index).toBe(i));
  });
});

describe("shuffleArray", () => {
  it("keeps every element, only reordering", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleArray(input, Math.random);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });
});

describe("generateUniqueBoard", () => {
  it("avoids every fingerprint already in the exclusion set", () => {
    const first = generateBoard(Math.random);
    const existing = new Set([boardFingerprint(first)]);
    const second = generateUniqueBoard(existing, Math.random);
    expect(boardFingerprint(second)).not.toBe(boardFingerprint(first));
  });
});
