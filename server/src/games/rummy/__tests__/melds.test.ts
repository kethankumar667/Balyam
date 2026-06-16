import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { isPureSequence, isImpureSequence, isSet, classifyMeld } from "../melds.js";

function c(suit: Suit, rank: Rank, copy = 0): Card {
  return { id: `${suit}${rank}_${copy}`, suit, rank };
}

const WILD: Rank = "7";

describe("isPureSequence", () => {
  it("accepts 3-card same-suit consecutive run", () => {
    expect(isPureSequence([c("H", "4"), c("H", "5"), c("H", "6")], WILD)).toBe(true);
  });

  it("accepts Q-K-A high run", () => {
    expect(isPureSequence([c("S", "Q"), c("S", "K"), c("S", "A")], WILD)).toBe(true);
  });

  it("accepts A-2-3 low run", () => {
    expect(isPureSequence([c("D", "A"), c("D", "2"), c("D", "3")], WILD)).toBe(true);
  });

  it("rejects different suits", () => {
    expect(isPureSequence([c("H", "4"), c("S", "5"), c("H", "6")], WILD)).toBe(false);
  });

  it("rejects non-consecutive", () => {
    expect(isPureSequence([c("H", "4"), c("H", "6"), c("H", "8")], WILD)).toBe(false);
  });

  it("rejects when it contains the wild joker rank", () => {
    expect(isPureSequence([c("H", "6"), c("H", "7"), c("H", "8")], WILD)).toBe(false);
  });

  it("rejects K-A-2 wrap-around", () => {
    expect(isPureSequence([c("S", "K"), c("S", "A"), c("S", "2")], WILD)).toBe(false);
  });

  it("rejects fewer than 3 cards", () => {
    expect(isPureSequence([c("H", "4"), c("H", "5")], WILD)).toBe(false);
  });
});

describe("isImpureSequence", () => {
  it("accepts 3-card with one wild joker filling a gap", () => {
    expect(
      isImpureSequence([c("H", "4"), c("H", "7"), c("H", "6")], WILD)
    ).toBe(true);
  });

  it("accepts joker at the end", () => {
    expect(
      isImpureSequence([c("S", "9"), c("S", "T"), c("D", "7")], WILD)
    ).toBe(true);
  });

  it("rejects pure sequence (no jokers)", () => {
    expect(isImpureSequence([c("H", "4"), c("H", "5"), c("H", "6")], WILD)).toBe(false);
  });

  it("rejects when natural cards have different suits", () => {
    expect(
      isImpureSequence([c("H", "4"), c("S", "5"), c("D", "7")], WILD)
    ).toBe(false);
  });
});

describe("isSet", () => {
  it("accepts 3-card set of distinct suits", () => {
    expect(isSet([c("H", "5"), c("S", "5"), c("D", "5")], WILD)).toBe(true);
  });

  it("accepts 4-card set of all suits", () => {
    expect(
      isSet([c("H", "9"), c("S", "9"), c("D", "9"), c("C", "9")], WILD)
    ).toBe(true);
  });

  it("accepts set with wild joker substituting", () => {
    expect(isSet([c("H", "Q"), c("S", "Q"), c("D", "7")], WILD)).toBe(true);
  });

  it("rejects duplicate suits across natural cards", () => {
    expect(isSet([c("H", "5"), c("H", "5", 1), c("D", "5")], WILD)).toBe(false);
  });

  it("rejects mixed ranks", () => {
    expect(isSet([c("H", "5"), c("S", "6"), c("D", "5")], WILD)).toBe(false);
  });

  it("rejects 5-card set", () => {
    expect(
      isSet(
        [c("H", "5"), c("S", "5"), c("D", "5"), c("C", "5"), c("H", "5", 1)],
        WILD
      )
    ).toBe(false);
  });
});

describe("classifyMeld", () => {
  it("returns pureSequence for valid pure sequence", () => {
    const m = classifyMeld([c("H", "4"), c("H", "5"), c("H", "6")], WILD);
    expect(m?.kind).toBe("pureSequence");
  });

  it("returns null for invalid combinations", () => {
    expect(classifyMeld([c("H", "4"), c("S", "9"), c("D", "K")], WILD)).toBeNull();
  });
});
