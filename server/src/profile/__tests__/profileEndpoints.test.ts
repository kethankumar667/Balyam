import { describe, it, expect, beforeEach } from "vitest";
import { profileService } from "../ProfileService.js";
import { matchHistoryService } from "../MatchHistoryService.js";

describe("Profile Controller & Service Integration", () => {
  beforeEach(() => {
    profileService.reset();
  });

  it("handles profile retrieval and initialization", () => {
    const profile = profileService.getOrCreateProfile("test_p1", "Test Player", "🦊");
    expect(profile.playerId).toBe("test_p1");
    expect(profile.displayName).toBe("Test Player");
    expect(profile.avatar).toBe("🦊");
    expect(profile.level).toBe(1);
    expect(profile.experiencePoints).toBe(0);
  });

  it("handles profile updates", () => {
    profileService.getOrCreateProfile("test_p1");
    const updated = profileService.updateProfile("test_p1", { displayName: "Champion", avatar: "🦁" });
    expect(updated.displayName).toBe("Champion");
    expect(updated.avatar).toBe("🦁");
  });

  it("retrieves player career statistics", () => {
    const stats = profileService.getStats("test_p1");
    expect(stats).toBeDefined();
    expect(stats.totalMatches).toBe(0);
    expect(stats.wins).toBe(0);
  });

  it("retrieves achievements list with calculated progress", () => {
    const achs = profileService.getAchievements("test_p1");
    expect(Array.isArray(achs)).toBe(true);
    expect(achs.length).toBeGreaterThan(5);
    expect(achs.every((a) => a.id && a.title)).toBe(true);
  });

  it("retrieves paginated match history and match details", () => {
    profileService.recordMatchFinished({
      roomCode: "LUDO99",
      game: "ludo",
      startedAt: 1000,
      finishedAt: 181000,
      durationMs: 180000,
      winnerId: "test_p1",
      participants: [
        { playerId: "test_p1", name: "Alice", isWinner: true },
        { playerId: "test_p2", name: "Bob", isWinner: false },
      ],
    });

    const history = matchHistoryService.getMatches("test_p1", { limit: 10, offset: 0 });
    expect(history.total).toBe(1);
    expect(history.matches.length).toBe(1);
    expect(history.matches[0]?.result).toBe("WIN");

    const matchId = history.matches[0]!.matchId;
    const detail = matchHistoryService.getMatchDetail("test_p1", matchId);
    expect(detail).toBeDefined();
    expect(detail?.winnerName).toBe("Alice");
    expect(detail?.durationMs).toBe(180000);
  });
});
