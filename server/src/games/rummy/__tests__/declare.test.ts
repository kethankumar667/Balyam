import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { validateDeclare } from "../declare.js";

function c(suit: Suit, rank: Rank, copy = 0): Card {
  return { id: `${suit}${rank}_${copy}`, suit, rank };
}

const WILD: Rank = "7";

describe("validateDeclare", () => {
  it("accepts a valid 13-card declaration", () => {
    const melds: Card[][] = [
      [c("H", "4"), c("H", "5"), c("H", "6")],
      [c("S", "9"), c("S", "T"), c("S", "J"), c("S", "Q")],
      [c("D", "K"), c("H", "K"), c("S", "K")],
      [c("C", "A"), c("D", "A"), c("S", "A")],
    ];
    const result = validateDeclare(melds, WILD);
    expect(result.ok).toBe(true);
    expect(result.melds).toHaveLength(4);
  });

  it("rejects fewer than 13 cards", () => {
    const melds: Card[][] = [
      [c("H", "4"), c("H", "5"), c("H", "6")],
      [c("S", "9"), c("S", "T"), c("S", "J")],
    ];
    const result = validateDeclare(melds, WILD);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("13 cards");
  });

  it("rejects when there is no pure sequence", () => {
    const melds: Card[][] = [
      [c("H", "5"), c("S", "5"), c("D", "5")],
      [c("H", "9"), c("S", "9"), c("D", "9"), c("C", "9")],
      [c("H", "K"), c("S", "K"), c("D", "K")],
      [c("H", "A"), c("S", "A"), c("D", "A")],
    ];
    const result = validateDeclare(melds, WILD);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("pure sequence");
  });

  it("rejects when there is fewer than 2 sequences", () => {
    const melds: Card[][] = [
      [c("H", "4"), c("H", "5"), c("H", "6")],
      [c("H", "9"), c("S", "9"), c("D", "9"), c("C", "9")],
      [c("H", "K"), c("S", "K"), c("D", "K")],
      [c("H", "A"), c("S", "A"), c("D", "A")],
    ];
    const result = validateDeclare(melds, WILD);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("two sequences");
  });

  it("rejects a duplicate card across melds", () => {
    const dup = c("H", "5");
    const melds: Card[][] = [
      [c("H", "4"), dup, c("H", "6")],
      [c("S", "9"), c("S", "T"), c("S", "J"), c("S", "Q")],
      [dup, c("S", "5"), c("D", "5")],
      [c("H", "A"), c("S", "A"), c("D", "A")],
    ];
    const result = validateDeclare(melds, WILD);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("more than once");
  });
});
