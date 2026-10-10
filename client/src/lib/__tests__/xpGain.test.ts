import { describe, it, expect } from "vitest";
import { buildMatchXpBreakdown } from "../xpGain";

describe("buildMatchXpBreakdown", () => {
  it("reports the XP the match really paid, with before and after", () => {
    const b = buildMatchXpBreakdown(165, 200);

    expect(b).toMatchObject({ totalXP: 35, previousXP: 165, newXP: 200, previousLevel: 2, newLevel: 3, leveledUp: true });
    expect(b!.items).toEqual([{ id: "match_xp", label: "XP earned from this match", amount: 35, category: "base" }]);
  });

  it("is not a level-up when the level did not change", () => {
    const b = buildMatchXpBreakdown(120, 155);

    expect(b).toMatchObject({ totalXP: 35, previousLevel: 2, newLevel: 2, leveledUp: false });
  });

  it("returns nothing when no XP was gained, and never reports a negative gain", () => {
    expect(buildMatchXpBreakdown(100, 100)).toBeNull();
    expect(buildMatchXpBreakdown(100, 40)).toBeNull();
  });

  it("clamps bad input instead of inventing XP", () => {
    expect(buildMatchXpBreakdown(-50, 15)).toMatchObject({ previousXP: 0, newXP: 15, totalXP: 15 });
  });
});
