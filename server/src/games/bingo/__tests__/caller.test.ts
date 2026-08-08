import { describe, it, expect } from "vitest";
import { createCallPool } from "../caller.js";

describe("createCallPool", () => {
  it("contains every value 1-25 exactly once, shuffled", () => {
    const pool = createCallPool(Math.random);
    expect(pool).toHaveLength(25);
    expect([...pool].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
});
