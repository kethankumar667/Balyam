import { describe, it, expect } from "vitest";
import { generateBoard, generateUniqueBoard, boardFingerprint, shuffleArray } from "../board.js";

function rngSeq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("generateBoard", () => {
  it("produces 25 cells with the center FREE and pre-marked", () => {
    const board = generateBoard(Math.random);
    expect(board).toHaveLength(25);
    expect(board[12]).toMatchObject({ index: 12, value: null, free: true, marked: true });
    board.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("keeps every non-free column value within that column's B-I-N-G-O range", () => {
    const RANGES: Record<number, [number, number]> = {
      0: [1, 15], // B
      1: [16, 30], // I
      2: [31, 45], // N
      3: [46, 60], // G
      4: [61, 75], // O
    };
    const board = generateBoard(Math.random);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = board[row * 5 + col];
        if (cell.free) continue;
        const [lo, hi] = RANGES[col];
        expect(cell.value).toBeGreaterThanOrEqual(lo);
        expect(cell.value).toBeLessThanOrEqual(hi);
      }
    }
  });

  it("never repeats a value within a single column", () => {
    const board = generateBoard(Math.random);
    for (let col = 0; col < 5; col++) {
      const values = [0, 1, 2, 3, 4]
        .map((row) => board[row * 5 + col])
        .filter((c) => !c.free)
        .map((c) => c.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("is deterministic for a fixed rng sequence", () => {
    const a = generateBoard(rngSeq(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7));
    const b = generateBoard(rngSeq(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7));
    expect(boardFingerprint(a)).toBe(boardFingerprint(b));
  });
});

describe("shuffleArray", () => {
  it("keeps every element, only reordering", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleArray(input, Math.random);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]); // does not mutate the source
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
