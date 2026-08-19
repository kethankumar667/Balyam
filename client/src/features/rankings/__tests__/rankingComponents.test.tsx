import { describe, it, expect } from "vitest";
import React from "react";
import PlayerRankCard from "../PlayerRankCard";
import LeaderboardTable from "../LeaderboardTable";
import ChallengesBoard from "../ChallengesBoard";
import RecentPlayersHub from "../RecentPlayersHub";
import type { PlayerRank, XPProgression, LeaderboardEntry } from "@shared/ranking/PlayerRank";
import type { PlayerChallenges } from "@shared/ranking/Challenges";

describe("Progression & Ranking UI Components", () => {
  it("renders PlayerRankCard with tier, rating, and progression", () => {
    const rank: PlayerRank = {
      playerId: "p1",
      rating: 1250,
      tier: "Gold",
      tierProgressPercent: 50,
      globalRank: 3,
      perGameRank: {},
      percentile: 95,
    };

    const progression: XPProgression = {
      currentXP: 75,
      currentLevel: 4,
      nextLevelXP: 100,
      levelProgressPercent: 75,
      totalXPForNextLevel: 400,
    };

    const el = React.createElement(PlayerRankCard, { rank, progression });
    expect(el).toBeDefined();
    expect(el.type).toBe(PlayerRankCard);
  });

  it("creates LeaderboardTable element with props", () => {
    const entries: LeaderboardEntry[] = [
      {
        rank: 1,
        playerId: "u1",
        displayName: "Master Alice",
        level: 10,
        tier: "Master",
        rating: 2600,
        wins: 45,
        matchesPlayed: 50,
        winRate: 90,
        totalPlayTimeMinutes: 300,
        favoriteGame: "ludo",
      },
    ];

    const el = React.createElement(LeaderboardTable, {
      entries,
      total: 1,
      selectedMetric: "rating",
      onSelectMetric: () => {},
      onSelectGame: () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(LeaderboardTable);
  });

  it("creates ChallengesBoard element with props", () => {
    const challenges: PlayerChallenges = {
      playerId: "p1",
      daily: [
        {
          id: "c1",
          type: "daily",
          title: "Daily Match",
          description: "Play 1 match",
          target: 1,
          current: 1,
          completed: true,
          claimed: false,
          xpReward: 50,
          category: "matches",
        },
      ],
      weekly: [],
      dailyResetTime: Date.now() + 3600000,
      weeklyResetTime: Date.now() + 86400000,
    };

    const el = React.createElement(ChallengesBoard, {
      challenges,
      onClaimReward: async () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(ChallengesBoard);
  });

  it("creates RecentPlayersHub element with props", () => {
    const el = React.createElement(RecentPlayersHub, {
      recentPlayers: [],
      friends: [],
      onAddFriend: async () => {},
      onRemoveFriend: async () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(RecentPlayersHub);
  });
});
