import { afterEach, describe, expect, it } from "vitest";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats.js";
import { calculateMiniclipXPProgression } from "@shared/progression/MiniclipProgression.js";
import { demoProgressionFor, demoStatsFor } from "../demoStats.js";

const real = (id: string, over = {}) => ({ ...INITIAL_PLAYER_STATS(id), ...over });

describe("demo profile stats (temporary)", () => {
  afterEach(() => {
    delete process.env.DEMO_PROFILE_STATS;
  });

  it("changes nothing while the flag is off", () => {
    const stats = real("p1");
    expect(demoStatsFor(stats)).toBe(stats);
    const prog = calculateMiniclipXPProgression(0);
    expect(demoProgressionFor("p1", prog)).toBe(prog);
  });

  it("fills an empty profile, marked as demo, with coherent numbers", () => {
    process.env.DEMO_PROFILE_STATS = "on";
    const s = demoStatsFor(real("p1"));
    expect(s.demo).toBe(true);
    expect(s.wins + s.losses + s.draws).toBe(s.totalMatches);
    expect(s.losses).toBeGreaterThanOrEqual(0);
    expect(s.favoriteGame).not.toBe("none");
    expect(demoProgressionFor("p1", calculateMiniclipXPProgression(0)).demo).toBe(true);
  });

  it("gives the same player the same numbers every time, and different players different ones", () => {
    process.env.DEMO_PROFILE_STATS = "on";
    expect(demoStatsFor(real("p1"))).toEqual(demoStatsFor(real("p1")));
    const totals = new Set(["a", "b", "c", "d", "e"].map((id) => demoStatsFor(real(id)).totalMatches));
    expect(totals.size).toBeGreaterThan(1);
  });

  it("never touches a profile that has real matches or real XP", () => {
    process.env.DEMO_PROFILE_STATS = "on";
    const played = real("p1", { totalMatches: 3, wins: 1, losses: 2 });
    expect(demoStatsFor(played)).toBe(played);
    const prog = calculateMiniclipXPProgression(500);
    expect(demoProgressionFor("p1", prog)).toBe(prog);
  });
});
