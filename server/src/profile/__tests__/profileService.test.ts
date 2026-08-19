import { describe, it, expect, beforeEach } from "vitest";
import { ProfileService } from "../ProfileService.js";

describe("Profile & Career Service", () => {
  let profileService: ProfileService;

  beforeEach(() => {
    profileService = new ProfileService();
  });

  it("creates, updates, and persists player profiles with level calculations", () => {
    const p = profileService.getOrCreateProfile("player_123", "Alice", "🦊");
    expect(p.displayName).toBe("Alice");
    expect(p.avatar).toBe("🦊");
    expect(p.level).toBe(1);
    expect(p.experiencePoints).toBe(0);

    profileService.updateProfile("player_123", { displayName: "Alice Pro" });
    const updated = profileService.getOrCreateProfile("player_123");
    expect(updated.displayName).toBe("Alice Pro");
  });

  it("records match completion, awards XP, and updates stats and achievements", () => {
    profileService.getOrCreateProfile("p1", "Bob");

    profileService.recordMatchFinished({
      roomCode: "RPS001",
      game: "rps",
      startedAt: 1000,
      finishedAt: 61000,
      durationMs: 60000,
      winnerId: "p1",
      participants: [
        { playerId: "p1", name: "Bob", isWinner: true },
        { playerId: "p2", name: "Charlie", isWinner: false },
      ],
    });

    const profile = profileService.getOrCreateProfile("p1");
    expect(profile.experiencePoints).toBe(50); // 50 XP for win

    const stats = profileService.getStats("p1");
    expect(stats.totalMatches).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.winRate).toBe(100);

    const achs = profileService.getAchievements("p1");
    expect(achs.find((a) => a.id === "first_match")?.unlocked).toBe(true);
    expect(achs.find((a) => a.id === "first_win")?.unlocked).toBe(true);
  });
});
