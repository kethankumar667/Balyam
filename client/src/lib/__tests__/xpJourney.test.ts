import { describe, it, expect } from "vitest";
import { XP_CONFIG } from "@shared/progression/MiniclipProgression";
import { describeXpJourney } from "../xpJourney";

describe("describeXpJourney", () => {
  it("starts a new player at level 1 with an empty bar and the first rewards ahead", () => {
    const j = describeXpJourney(0);

    expect(j.level).toBe(1);
    expect(j.xpIntoLevel).toBe(0);
    expect(j.segments).toEqual({ count: 10, full: 0, partial: 0 });
    expect(j.upcoming.map((m) => m.level)).toEqual([2, 3, 4, 5]);
    expect(j.upcoming[0].isNext).toBe(true);
    expect(j.upcoming.slice(1).every((m) => !m.isNext)).toBe(true);
  });

  it("fills whole segments and a fraction of the next from the XP earned into the level", () => {
    // 100 XP per level, 10 per segment: 65 XP into level 1 is six full segments and half of the seventh.
    const j = describeXpJourney(65);

    expect(j.level).toBe(1);
    expect(j.xpIntoLevel).toBe(65);
    expect(j.percent).toBe(65);
    expect(j.segments).toEqual({ count: 10, full: 6, partial: 0.5 });
    expect(j.xpToNext).toBe(35);
  });

  it("rolls over exactly at a level boundary", () => {
    const j = describeXpJourney(XP_CONFIG.XP_PER_LEVEL);

    expect(j.level).toBe(2);
    expect(j.xpIntoLevel).toBe(0);
    expect(j.nextLevel).toBe(3);
    expect(j.upcoming[0].level).toBe(3);
  });

  it("says how many wins or matches the next level takes, from the real XP values", () => {
    const j = describeXpJourney(65);

    expect(j.winsToLevel).toBe(Math.ceil(35 / XP_CONFIG.MATCH_WIN));
    expect(j.matchesToLevel).toBe(Math.ceil(35 / XP_CONFIG.MATCH_PLAYED));
  });

  it("lists the ways to earn straight from the XP config", () => {
    const earn = describeXpJourney(0).earn;

    expect(earn).toEqual([
      { id: "win", label: "A win", xp: XP_CONFIG.MATCH_WIN },
      { id: "draw", label: "A draw", xp: XP_CONFIG.MATCH_DRAW },
      { id: "played", label: "Any match played", xp: XP_CONFIG.MATCH_PLAYED },
    ]);
  });

  it("has no rewards ahead once every milestone is passed, and never goes negative on bad input", () => {
    const top = describeXpJourney(1_000_000);
    const odd = describeXpJourney(-50);

    expect(top.upcoming).toEqual([]);
    expect(odd.level).toBe(1);
    expect(odd.xpIntoLevel).toBe(0);
  });
});
