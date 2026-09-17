import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryProgressionRepository } from "../InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../index.js";
import { hydrateProgression } from "../hydrate.js";
import { progressionSync } from "../ProgressionSync.js";
import { profileService } from "../../profile/ProfileService.js";
import { matchHistoryService } from "../../profile/MatchHistoryService.js";
import type { ProfileRecord } from "../ProgressionRepository.js";

const profile = (playerId: string, experiencePoints = 750): ProfileRecord => ({
  playerId, displayName: "Returning player", avatar: "fox", level: 8,
  experiencePoints, joinedAt: 1000, lastSeenAt: 2000,
});

describe("progression restart hydration", () => {
  let repo: InMemoryProgressionRepository;

  beforeEach(async () => {
    await progressionSync.drain();
    profileService.reset();
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
  });

  afterEach(async () => {
    await progressionSync.drain();
    profileService.reset();
    setProgressionRepository(null);
    vi.restoreAllMocks();
  });

  it("restores profiles beyond the old preload window before their next write", async () => {
    for (let i = 0; i < 5001; i += 1) {
      await repo.upsertProfile(profile(`guest_${String(i).padStart(5, "0")}`, 5001 - i));
    }
    const report = await hydrateProgression();
    expect(report.profiles).toBe(5001);
    expect(profileService.getProfile("guest_05000")).toMatchObject({
      experiencePoints: 1, joinedAt: 1000, displayName: "Returning player",
    });
    profileService.awardXP("guest_05000", 50);
    await progressionSync.drain();
    expect(await repo.getProfile("guest_05000")).toMatchObject({ experiencePoints: 51, joinedAt: 1000 });
  });

  it("restores every history page and rebuilds chronological career stats without awarding XP", async () => {
    const playerId = "guest_1234";
    await repo.upsertProfile(JSON.parse(JSON.stringify(profile(playerId))) as ProfileRecord);
    for (let i = 0; i < 31; i += 1) {
      await repo.recordMatch({
        id: `match_${i}`, roomCode: "ROOM01", game: "rps", startedAt: i * 60000,
        finishedAt: (i + 1) * 60000, durationMs: 60000,
        winnerId: i === 28 ? "opponent" : playerId,
        participants: [{ playerId, displayName: "Returning player", isWinner: i !== 28, isBot: false }],
      });
    }
    const write = vi.spyOn(repo, "upsertProfile");
    const report = await hydrateProgression();
    expect(report.matches).toBe(31);
    expect(matchHistoryService.getMatches(playerId, { offset: 25 }).matches).toHaveLength(6);
    expect(profileService.getStats(playerId)).toMatchObject({
      totalMatches: 31, wins: 30, losses: 1, currentWinStreak: 2, bestWinStreak: 28,
      totalPlayTimeMinutes: 31,
    });
    expect(profileService.getProfile(playerId)?.experiencePoints).toBe(750);
    expect(write).not.toHaveBeenCalled();
    await hydrateProgression();
    expect(profileService.getStats(playerId).totalMatches).toBe(31);
  });

  it("does not publish partial state when a later history page fails", async () => {
    await repo.upsertProfile(profile("guest_1234"));
    vi.spyOn(repo, "listMatchesForPlayer")
      .mockResolvedValueOnce({ total: 1, matches: [] });
    await expect(hydrateProgression()).rejects.toThrow();
    expect(profileService.getProfile("guest_1234")).toBeUndefined();
  });
});
