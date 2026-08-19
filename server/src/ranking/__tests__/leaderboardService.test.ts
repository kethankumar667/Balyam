import { describe, it, expect, beforeEach } from "vitest";
import { leaderboardService } from "../LeaderboardService.js";
import { profileService } from "../../profile/ProfileService.js";

describe("Leaderboard Query Service", () => {
  beforeEach(() => {
    profileService.reset();
  });

  it("sorts and paginates leaderboard entries by requested metric", () => {
    profileService.getOrCreateProfile("u1", "Alice");
    profileService.getOrCreateProfile("u2", "Bob");

    // Alice wins 2 matches
    profileService.recordMatchFinished({
      roomCode: "LUDO01",
      game: "ludo",
      startedAt: 1000,
      finishedAt: 61000,
      durationMs: 60000,
      winnerId: "u1",
      participants: [
        { playerId: "u1", name: "Alice", isWinner: true },
        { playerId: "u2", name: "Bob", isWinner: false },
      ],
    });

    const result = leaderboardService.getLeaderboard({ metric: "wins", limit: 10 });
    expect(result.total).toBe(2);
    expect(result.entries[0]?.playerId).toBe("u1");
    expect(result.entries[0]?.rank).toBe(1);
    expect(result.entries[0]?.wins).toBe(1);
  });

  it("filters leaderboard by specific game", () => {
    profileService.getOrCreateProfile("u1", "Alice");

    profileService.recordMatchFinished({
      roomCode: "UNO01",
      game: "uno",
      startedAt: 1000,
      finishedAt: 61000,
      durationMs: 60000,
      winnerId: "u1",
      participants: [{ playerId: "u1", name: "Alice", isWinner: true }],
    });

    const unoResult = leaderboardService.getLeaderboard({ game: "uno" });
    expect(unoResult.entries.length).toBe(1);

    const ludoResult = leaderboardService.getLeaderboard({ game: "ludo" });
    expect(ludoResult.entries.length).toBe(0);
  });
});
