import { describe, it, expect } from "vitest";
import { StatsProjection } from "../StatsProjection.js";
import type { MatchHistoryItem } from "@shared/profile/MatchHistory.js";

describe("Profile Stats Projection Engine", () => {
  it("projects a sequence of match results into cumulative and per-game stats", () => {
    let stats = undefined;

    const match1: MatchHistoryItem = {
      matchId: "m1",
      roomCode: "LUDO01",
      game: "ludo",
      startedAt: 1000,
      finishedAt: 121000,
      durationMs: 120000, // 2 mins
      result: "WIN",
      participants: [{ playerId: "p1", name: "Alice", isWinner: true }],
      replayAvailable: true,
    };

    stats = StatsProjection.projectMatch(stats, "p1", match1);

    expect(stats.totalMatches).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.winRate).toBe(100);
    expect(stats.totalPlayTimeMinutes).toBe(2);
    expect(stats.favoriteGame).toBe("ludo");
    expect(stats.perGame["ludo"]?.matchesPlayed).toBe(1);
    expect(stats.perGame["ludo"]?.wins).toBe(1);

    const match2: MatchHistoryItem = {
      matchId: "m2",
      roomCode: "UNO002",
      game: "uno",
      startedAt: 2000,
      finishedAt: 182000,
      durationMs: 180000, // 3 mins
      result: "LOSS",
      participants: [{ playerId: "p1", name: "Alice", isWinner: false }],
      replayAvailable: true,
    };

    stats = StatsProjection.projectMatch(stats, "p1", match2);

    expect(stats.totalMatches).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBe(50);
    expect(stats.totalPlayTimeMinutes).toBe(5);
    expect(stats.averageMatchMinutes).toBe(2.5);
    expect(stats.longestMatchMinutes).toBe(3);
    expect(stats.perGame["uno"]?.matchesPlayed).toBe(1);
    expect(stats.perGame["uno"]?.wins).toBe(0);
  });
});
