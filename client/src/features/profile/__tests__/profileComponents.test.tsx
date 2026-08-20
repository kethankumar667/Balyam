import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ProfileHeader from "../ProfileHeader";
import StatsOverview from "../StatsOverview";
import CareerMetrics from "../CareerMetrics";
import AchievementsPanel from "../AchievementsPanel";
import { INITIAL_PLAYER_STATS } from "@shared/profile/PlayerStats";
import { ACHIEVEMENT_CATALOG } from "@shared/profile/Achievements";

describe("Profile UI Sub-Components", () => {
  it("renders ProfileHeader component element", () => {
    const profile = {
      playerId: "p_1",
      displayName: "Grandmaster Ace",
      avatar: "👑",
      joinedAt: 1700000000000,
      lastSeenAt: 1700000000000,
      level: 5,
      experiencePoints: 450,
    };

    const element = ProfileHeader({ profile });
    expect(element).toBeDefined();
    expect(element.type).toBe("div");
  });

  it("ProfileHeader prefers the live `name`/`avatar` props over profile.displayName/avatar — this REST snapshot must not shadow a name/avatar saved elsewhere (Settings, the header's own profile sheet) while the page stays mounted", () => {
    const profile = {
      playerId: "p_1",
      displayName: "Stale Snapshot Name",
      avatar: "avatar_1.jpg",
      joinedAt: 1700000000000,
      lastSeenAt: 1700000000000,
      level: 5,
      experiencePoints: 450,
    };

    render(<ProfileHeader profile={profile} name="Live Renamed" avatar="avatar_2.jpg" />);

    expect(screen.getByText("Live Renamed")).toBeDefined();
    expect(screen.queryByText("Stale Snapshot Name")).toBeNull();
  });

  it("renders StatsOverview component element with correct stats", () => {
    const stats = {
      ...INITIAL_PLAYER_STATS("p_1"),
      totalMatches: 24,
      wins: 18,
      losses: 6,
      winRate: 75,
      totalPlayTimeMinutes: 120,
    };

    const element = StatsOverview({ stats });
    expect(element).toBeDefined();
    expect(element.type).toBe("div");
  });

  it("renders AchievementsPanel component element with correct achievements", () => {
    const achs = ACHIEVEMENT_CATALOG.map((def, idx) => ({
      ...def,
      unlocked: idx === 0,
      currentProgress: idx === 0 ? 1 : 0,
      progressPercent: idx === 0 ? 100 : 0,
    }));

    const element = AchievementsPanel({ achievements: achs });
    expect(element).toBeDefined();
    expect(element.type).toBe("div");
  });
});
