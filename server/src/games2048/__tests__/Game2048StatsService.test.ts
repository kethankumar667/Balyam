import { describe, it, expect, beforeEach } from "vitest";
import { Game2048StatsService, sanitizeCandidateStats, mergeGame2048Stats } from "../Game2048StatsService.js";
import { scorecardService } from "../../profile/ScorecardService.js";

describe("sanitizeCandidateStats", () => {
  it("passes through a well-formed candidate", () => {
    const result = sanitizeCandidateStats({
      bestScore: { battle: 512, timeattack: 300, zen: 128 },
      bestRaceTimeMs: 45000,
      bestRaceGhost: [{ atMs: 1000, tile: 4 }],
      dailyBestScore: 640,
      dailyDate: "2026-09-17",
    });
    expect(result).toEqual({
      bestScore: { battle: 512, timeattack: 300, zen: 128 },
      bestRaceTimeMs: 45000,
      bestRaceGhost: [{ atMs: 1000, tile: 4 }],
      dailyBestScore: 640,
      dailyDate: "2026-09-17",
    });
  });

  it("decays a malformed/hostile payload to safe defaults instead of throwing", () => {
    const result = sanitizeCandidateStats({
      bestScore: { battle: "9999999; DROP TABLE", timeattack: -50, zen: null },
      bestRaceTimeMs: "not a number",
      bestRaceGhost: "not an array",
      dailyBestScore: 9999,
      dailyDate: "not-a-date",
    });
    expect(result).toEqual({
      bestScore: { battle: 0, timeattack: 0, zen: 0 },
      bestRaceTimeMs: null,
      bestRaceGhost: null,
      dailyBestScore: 0,
      dailyDate: null,
    });
  });

  it("handles a missing/empty body without throwing", () => {
    const expected = {
      bestScore: { battle: 0, timeattack: 0, zen: 0 },
      bestRaceTimeMs: null,
      bestRaceGhost: null,
      dailyBestScore: 0,
      dailyDate: null,
    };
    expect(sanitizeCandidateStats(null)).toEqual(expected);
    expect(sanitizeCandidateStats(undefined)).toEqual(expected);
  });

  it("filters out malformed entries from an otherwise-valid ghost array", () => {
    const result = sanitizeCandidateStats({
      bestRaceGhost: [{ atMs: 1000, tile: 4 }, { atMs: "bad" }, { tile: 8 }, { atMs: 5000, tile: 16 }],
    });
    expect(result.bestRaceGhost).toEqual([
      { atMs: 1000, tile: 4 },
      { atMs: 5000, tile: 16 },
    ]);
  });

  it("discards a daily score that has no valid date to compare it against", () => {
    const result = sanitizeCandidateStats({ dailyBestScore: 5000, dailyDate: null });
    expect(result.dailyBestScore).toBe(0);
    expect(result.dailyDate).toBeNull();
  });
});

describe("mergeGame2048Stats", () => {
  const empty = {
    bestScore: { battle: 0, timeattack: 0, zen: 0 },
    bestRaceTimeMs: null,
    bestRaceGhost: null,
    dailyBestScore: 0,
    dailyDate: null,
  };

  it("takes the max of each score field", () => {
    const merged = mergeGame2048Stats(
      { ...empty, bestScore: { battle: 100, timeattack: 500, zen: 0 } },
      { ...empty, bestScore: { battle: 200, timeattack: 300, zen: 50 } },
    );
    expect(merged.bestScore).toEqual({ battle: 200, timeattack: 500, zen: 50 });
  });

  it("takes the faster (lower) race time and adopts its ghost", () => {
    const ghost = [{ atMs: 2000, tile: 8 }];
    const merged = mergeGame2048Stats(
      { ...empty, bestRaceTimeMs: 60000, bestRaceGhost: [{ atMs: 5000, tile: 4 }] },
      { ...empty, bestRaceTimeMs: 45000, bestRaceGhost: ghost },
    );
    expect(merged.bestRaceTimeMs).toBe(45000);
    expect(merged.bestRaceGhost).toBe(ghost);
  });

  it("never regresses a race time when the candidate is slower", () => {
    const merged = mergeGame2048Stats(
      { ...empty, bestRaceTimeMs: 30000, bestRaceGhost: [{ atMs: 1000, tile: 4 }] },
      { ...empty, bestRaceTimeMs: 90000, bestRaceGhost: [{ atMs: 9000, tile: 4 }] },
    );
    expect(merged.bestRaceTimeMs).toBe(30000);
    expect(merged.bestRaceGhost).toEqual([{ atMs: 1000, tile: 4 }]);
  });

  it("adopts a first-ever race time from a candidate when none exists yet", () => {
    const merged = mergeGame2048Stats(empty, { ...empty, bestRaceTimeMs: 50000, bestRaceGhost: null });
    expect(merged.bestRaceTimeMs).toBe(50000);
  });

  it("adopts a first-ever daily score", () => {
    const merged = mergeGame2048Stats(empty, { ...empty, dailyBestScore: 800, dailyDate: "2026-09-17" });
    expect(merged).toEqual({ ...empty, dailyBestScore: 800, dailyDate: "2026-09-17" });
  });

  it("takes the higher score when both sides report the same day", () => {
    const merged = mergeGame2048Stats(
      { ...empty, dailyBestScore: 600, dailyDate: "2026-09-17" },
      { ...empty, dailyBestScore: 900, dailyDate: "2026-09-17" },
    );
    expect(merged.dailyBestScore).toBe(900);
    expect(merged.dailyDate).toBe("2026-09-17");
  });

  it("a newer day's candidate supersedes the stored day outright, even with a lower score", () => {
    const merged = mergeGame2048Stats(
      { ...empty, dailyBestScore: 5000, dailyDate: "2026-09-16" },
      { ...empty, dailyBestScore: 50, dailyDate: "2026-09-17" },
    );
    expect(merged.dailyBestScore).toBe(50);
    expect(merged.dailyDate).toBe("2026-09-17");
  });

  it("ignores a stale sync from an older day than what's already stored", () => {
    const merged = mergeGame2048Stats(
      { ...empty, dailyBestScore: 300, dailyDate: "2026-09-17" },
      { ...empty, dailyBestScore: 9999, dailyDate: "2026-09-10" },
    );
    expect(merged.dailyBestScore).toBe(300);
    expect(merged.dailyDate).toBe("2026-09-17");
  });
});

describe("Game2048StatsService", () => {
  let service: Game2048StatsService;
  const PLAYER_ID = "test_player_2048";

  beforeEach(() => {
    // postgrestConfig: null forces in-memory-only mode — same convention as
    // CosmeticsService's tests — so these run without any Supabase project.
    service = new Game2048StatsService({ postgrestConfig: null });
  });

  it("returns all-zero defaults for a player who has never synced", async () => {
    const stats = await service.getStats(PLAYER_ID);
    expect(stats).toEqual({
      bestScore: { battle: 0, timeattack: 0, zen: 0 },
      bestRaceTimeMs: null,
      bestRaceGhost: null,
      dailyBestScore: 0,
      dailyDate: null,
    });
  });

  it("syncs a Daily Challenge score and carries it across reads", async () => {
    await service.syncStats(PLAYER_ID, {
      bestScore: { battle: 0, timeattack: 0, zen: 0 },
      dailyBestScore: 720,
      dailyDate: "2026-09-17",
    });
    const stats = await service.getStats(PLAYER_ID);
    expect(stats.dailyBestScore).toBe(720);
    expect(stats.dailyDate).toBe("2026-09-17");
  });

  it("persists a synced candidate and returns it on the next read", async () => {
    await service.syncStats(PLAYER_ID, { bestScore: { battle: 256, timeattack: 0, zen: 0 }, bestRaceTimeMs: null });
    const stats = await service.getStats(PLAYER_ID);
    expect(stats.bestScore.battle).toBe(256);
  });

  it("never lets a later, worse sync regress an already-stored best", async () => {
    await service.syncStats(PLAYER_ID, { bestScore: { battle: 1024, timeattack: 0, zen: 0 }, bestRaceTimeMs: null });
    const merged = await service.syncStats(PLAYER_ID, { bestScore: { battle: 64, timeattack: 0, zen: 0 }, bestRaceTimeMs: null });
    expect(merged.bestScore.battle).toBe(1024);
  });

  it("keeps each player's stats isolated", async () => {
    await service.syncStats("player_a", { bestScore: { battle: 500, timeattack: 0, zen: 0 }, bestRaceTimeMs: null });
    await service.syncStats("player_b", { bestScore: { battle: 900, timeattack: 0, zen: 0 }, bestRaceTimeMs: null });
    expect((await service.getStats("player_a")).bestScore.battle).toBe(500);
    expect((await service.getStats("player_b")).bestScore.battle).toBe(900);
  });

  it("projects synced 2048 best scores directly into scorecardService for leaderboards", async () => {
    await service.syncStats("player_2048_champ", {
      bestScore: { battle: 8192, timeattack: 2500, zen: 4096 },
      bestRaceTimeMs: 120000,
      dailyBestScore: 5000,
      dailyDate: "2026-09-18",
    });

    const battleBoard = scorecardService.getModeLeaderboard("2048", "battle");
    const zenBoard = scorecardService.getModeLeaderboard("2048", "zen");

    const playerBattle = battleBoard.find((e) => e.playerId === "player_2048_champ");
    const playerZen = zenBoard.find((e) => e.playerId === "player_2048_champ");

    expect(playerBattle).toBeDefined();
    expect(playerBattle?.bestScore).toBe(8192);
    expect(playerBattle?.rank).toBe(1);

    expect(playerZen).toBeDefined();
    expect(playerZen?.bestScore).toBe(4096);
    expect(playerZen?.rank).toBe(1);
  });
});
