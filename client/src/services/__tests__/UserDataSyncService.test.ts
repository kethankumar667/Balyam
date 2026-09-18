import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { syncUserDataOnLogin, clearUserDataOnSignOut } from "../UserDataSyncService";
import { useScorecardStore } from "../../store/scorecardStore";
import { useStreakStore } from "../../store/streakStore";
import * as game2048Api from "../../lib/game2048StatsApi";

vi.mock("../../lib/game2048StatsApi", () => ({
  getGame2048Stats: vi.fn(),
  syncGame2048Stats: vi.fn(),
}));

describe("UserDataSyncService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("syncUserDataOnLogin", () => {
    it("skips sync if playerId is empty or falsy", async () => {
      const fetchScorecardsSpy = vi.spyOn(useScorecardStore.getState(), "fetchScorecards");
      const fetchStreakSpy = vi.spyOn(useStreakStore.getState(), "fetchStreak");

      await syncUserDataOnLogin("");

      expect(fetchScorecardsSpy).not.toHaveBeenCalled();
      expect(fetchStreakSpy).not.toHaveBeenCalled();
      expect(game2048Api.getGame2048Stats).not.toHaveBeenCalled();
    });

    it("triggers scorecard fetch, streak fetch, and 2048 sync for valid player", async () => {
      const fetchScorecardsSpy = vi
        .spyOn(useScorecardStore.getState(), "fetchScorecards")
        .mockResolvedValue();
      const fetchStreakSpy = vi
        .spyOn(useStreakStore.getState(), "fetchStreak")
        .mockResolvedValue();

      vi.mocked(game2048Api.getGame2048Stats).mockResolvedValue({
        bestScore: { battle: 1000, timeattack: 800, zen: 1200 },
        bestRaceTimeMs: 45000,
        bestRaceGhost: null,
        dailyBestScore: 500,
        dailyDate: "2026-09-18",
      });

      await syncUserDataOnLogin("player-123");

      expect(fetchScorecardsSpy).toHaveBeenCalledWith("player-123");
      expect(fetchStreakSpy).toHaveBeenCalled();
      expect(game2048Api.getGame2048Stats).toHaveBeenCalled();

      // Verify local storage was updated with cloud stats
      const raw = localStorage.getItem("bhalyam.2048.stats.v1");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.bestScore.battle).toBe(1000);
      expect(parsed.bestRaceTimeMs).toBe(45000);
    });

    it("reconciles local 2048 stats when local has higher scores and pushes upstream", async () => {
      // Seed local storage with higher battle score
      localStorage.setItem(
        "bhalyam.2048.stats.v1",
        JSON.stringify({
          bestScore: { battle: 5000, timeattack: 200, zen: 300 },
          bestRaceTimeMs: 30000,
          bestRaceGhost: null,
          dailyBestScore: 100,
          dailyDate: "2026-09-18",
        }),
      );

      vi.mocked(game2048Api.getGame2048Stats).mockResolvedValue({
        bestScore: { battle: 2000, timeattack: 800, zen: 1200 },
        bestRaceTimeMs: 45000,
        bestRaceGhost: null,
        dailyBestScore: 500,
        dailyDate: "2026-09-18",
      });

      await syncUserDataOnLogin("player-abc");

      // Verify syncGame2048Stats was called because local had higher battle score (5000 vs 2000)
      expect(game2048Api.syncGame2048Stats).toHaveBeenCalledWith({
        bestScore: {
          battle: 5000,
          timeattack: 800,
          zen: 1200,
        },
        bestRaceTimeMs: 30000, // Faster than cloud 45000
        bestRaceGhost: null,
        dailyBestScore: 500,
        dailyDate: "2026-09-18",
      });
    });

    it("syncs local progress for new users when cloud returns null", async () => {
      localStorage.setItem(
        "bhalyam.2048.stats.v1",
        JSON.stringify({
          bestScore: { battle: 1500, timeattack: 400, zen: 600 },
          bestRaceTimeMs: 40000,
          bestRaceGhost: null,
          dailyBestScore: 250,
          dailyDate: "2026-09-18",
        }),
      );

      // Cloud returns null for new user
      vi.mocked(game2048Api.getGame2048Stats).mockResolvedValue(null);

      await syncUserDataOnLogin("new-player-456");

      // Verify syncGame2048Stats was called to seed the new cloud account with local records
      expect(game2048Api.syncGame2048Stats).toHaveBeenCalledWith({
        bestScore: {
          battle: 1500,
          timeattack: 400,
          zen: 600,
        },
        bestRaceTimeMs: 40000,
        bestRaceGhost: null,
        dailyBestScore: 250,
        dailyDate: "2026-09-18",
      });
    });

    it("never throws or rejects even if underlying fetches fail (resilient non-blocking sync)", async () => {
      vi.spyOn(useScorecardStore.getState(), "fetchScorecards").mockRejectedValue(
        new Error("Network offline"),
      );
      vi.spyOn(useStreakStore.getState(), "fetchStreak").mockRejectedValue(
        new Error("Server timeout"),
      );
      vi.mocked(game2048Api.getGame2048Stats).mockRejectedValue(new Error("500 Internal Error"));

      // Should complete cleanly without rejecting
      await expect(syncUserDataOnLogin("player-resilient")).resolves.toBeUndefined();
    });
  });

  describe("clearUserDataOnSignOut", () => {
    it("purges scorecard cache, resets transient streak state, and wipes 2048 local storage", () => {
      localStorage.setItem(
        "bhalyam.2048.stats.v1",
        JSON.stringify({ bestScore: { battle: 9999, timeattack: 0, zen: 0 } }),
      );

      const clearScorecardsSpy = vi.spyOn(useScorecardStore.getState(), "clearScorecards");
      const resetTransientSpy = vi.spyOn(useStreakStore.getState(), "resetTransientState");

      clearUserDataOnSignOut("player-xyz");

      expect(clearScorecardsSpy).toHaveBeenCalledWith("player-xyz");
      expect(resetTransientSpy).toHaveBeenCalled();
      expect(localStorage.getItem("bhalyam.2048.stats.v1")).toBeNull();
    });
  });
});
