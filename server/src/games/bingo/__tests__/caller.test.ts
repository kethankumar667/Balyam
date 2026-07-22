import { describe, it, expect } from "vitest";
import { letterFor, createCallPool } from "../caller.js";

describe("letterFor", () => {
  it("maps every 1-75 value to its B-I-N-G-O column", () => {
    for (let v = 1; v <= 15; v++) expect(letterFor(v)).toBe("B");
    for (let v = 16; v <= 30; v++) expect(letterFor(v)).toBe("I");
    for (let v = 31; v <= 45; v++) expect(letterFor(v)).toBe("N");
    for (let v = 46; v <= 60; v++) expect(letterFor(v)).toBe("G");
    for (let v = 61; v <= 75; v++) expect(letterFor(v)).toBe("O");
  });

  it("throws outside the 1-75 range", () => {
    expect(() => letterFor(0)).toThrow();
    expect(() => letterFor(76)).toThrow();
  });
});

describe("createCallPool", () => {
  it("contains every value 1-75 exactly once, shuffled", () => {
    const pool = createCallPool(Math.random);
    expect(pool).toHaveLength(75);
    expect([...pool].sort((a, b) => a - b)).toEqual(Array.from({ length: 75 }, (_, i) => i + 1));
  });

  it("is deterministic for a fixed rng", () => {
    const rng = (() => {
      let i = 0;
      const seq = [0.9, 0.1, 0.5, 0.3, 0.7];
      return () => seq[i++ % seq.length];
    })();
    const rng2 = (() => {
      let i = 0;
      const seq = [0.9, 0.1, 0.5, 0.3, 0.7];
      return () => seq[i++ % seq.length];
    })();
    expect(createCallPool(rng)).toEqual(createCallPool(rng2));
  });
});
