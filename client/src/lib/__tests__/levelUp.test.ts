import { describe, it, expect } from "vitest";
import { describeLevelUp } from "../levelUp";

describe("describeLevelUp", () => {
  it("shows the real progress into the new level, not a made-up number", () => {
    // 1,340 XP is level 14 with 40 XP into it (100 XP per level).
    const view = describeLevelUp(13, 14, 1_340);

    expect(view.toLevel).toBe(14);
    expect(view.xpIntoLevel).toBe(40);
    expect(view.progressPercent).toBe(40);
    expect(view.xpToNext).toBe(60);
  });

  it("names the next real milestone and how far away it is", () => {
    const view = describeLevelUp(13, 14, 1_340);

    // The next milestone above level 14 is level 15: Table Virtuoso, 1,500 coins.
    expect(view.next).toEqual({ level: 15, coins: 1_500, title: "Table Virtuoso", levelsAway: 1 });
  });

  it("totals the milestone rewards crossed on the way up, including several levels at once", () => {
    // 4 -> 10 crosses level 5 (500), 6 (600), 8 (700) and 10 (1,000).
    const view = describeLevelUp(4, 10, 900);

    expect(view.unlockedCoins).toBe(500 + 600 + 700 + 1_000);
  });

  it("reports no unlocked coins when the new level has no milestone", () => {
    expect(describeLevelUp(6, 7, 600).unlockedCoins).toBe(0);
  });

  it("notices when the player has moved into a new tier", () => {
    // Level 5 is tier 1 and level 6 is tier 2.
    expect(describeLevelUp(5, 6, 500).isNewTier).toBe(true);
    expect(describeLevelUp(6, 7, 600).isNewTier).toBe(false);
  });

  it("says what a win and a played match are really worth", () => {
    const view = describeLevelUp(2, 3, 200);

    expect(view.winXp).toBe(35);
    expect(view.playXp).toBe(15);
  });

  it("has no next milestone past the top of the roadmap", () => {
    expect(describeLevelUp(199, 200, 19_900).next).toBeNull();
  });

  it("never reports a negative or out-of-order range", () => {
    const view = describeLevelUp(0, -3, -50);

    expect(view.fromLevel).toBe(1);
    expect(view.toLevel).toBe(1);
    expect(view.xpToNext).toBeGreaterThanOrEqual(0);
  });
});
