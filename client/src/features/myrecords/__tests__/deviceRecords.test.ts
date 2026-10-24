import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModeScorecard, PlayerScorecardArchive } from "@shared/profile/Scorecard";

const mockApiFetch = vi.fn();
vi.mock("../../../lib/playerIdentity", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { listDeviceBests, importDeviceBests } = await import("../deviceRecords");

const CRICKET_KEY = "bhalyam_nokia_cricket_data_v1";

function mode(modeId: string, bestScore: number): ModeScorecard {
  return {
    modeId, modeDisplayName: modeId, bestScore, timesPlayed: 3, bestScoreAchievedAt: 10, bestScoreMatchId: "m",
    recentScores: [bestScore], scoringDirection: "HIGHER_IS_BETTER", totalScoreAccumulated: bestScore, averageScore: bestScore,
    bestContext: "SOLO", secondaryMetrics: {}, foilTier: "carbon",
    radar: { velocity: 0, clutch: 0, efficiency: 0, consistency: 0, aggression: 0 },
  };
}

const archive = (extra: Partial<PlayerScorecardArchive> = {}): PlayerScorecardArchive => ({
  playerId: "alice", games: {}, totalPersonalBestsBeaten: 0, updatedAt: 1, ...extra,
});

beforeEach(() => {
  localStorage.clear();
  mockApiFetch.mockReset();
});

describe("listDeviceBests", () => {
  it("is empty when the device holds nothing", () => {
    expect(listDeviceBests(archive())).toEqual([]);
    expect(listDeviceBests(null)).toEqual([]);
  });

  it("lists the bests only this device holds, by game and mode", () => {
    localStorage.setItem(CRICKET_KEY, JSON.stringify({ modeBestScores: { classic_10: 140, chase_2: 25 } }));

    expect(listDeviceBests(archive())).toEqual(expect.arrayContaining([
      { game: "nokiacricket", modeId: "classic_10", score: 140 },
      { game: "nokiacricket", modeId: "chase_2", score: 25 },
    ]));
    expect(listDeviceBests(archive())).toHaveLength(2);
  });

  it("leaves out a best the account already holds or beats", () => {
    localStorage.setItem(CRICKET_KEY, JSON.stringify({ modeBestScores: { classic_10: 140, chase_2: 25 } }));
    const held = archive({
      games: { nokiacricket: { game: "nokiacricket", gameDisplayName: "Retro Cricket", lastPlayedAt: 1, totalModesPlayed: 2,
        modes: { classic_10: mode("classic_10", 140), chase_2: mode("chase_2", 90) } } },
    });

    expect(listDeviceBests(held)).toEqual([]);
  });

  it("includes a device best that beats the account's recorded one", () => {
    localStorage.setItem(CRICKET_KEY, JSON.stringify({ modeBestScores: { classic_10: 200 } }));
    const held = archive({
      games: { nokiacricket: { game: "nokiacricket", gameDisplayName: "Retro Cricket", lastPlayedAt: 1, totalModesPlayed: 1,
        modes: { classic_10: mode("classic_10", 140) } } },
    });

    expect(listDeviceBests(held)).toEqual([{ game: "nokiacricket", modeId: "classic_10", score: 200 }]);
  });

  it("leaves out a best the player already brought over", () => {
    localStorage.setItem(CRICKET_KEY, JSON.stringify({ modeBestScores: { classic_10: 140 } }));

    expect(listDeviceBests(archive({ deviceImports: { nokiacricket: { classic_10: { score: 140, importedAt: 1 } } } }))).toEqual([]);
  });
});

describe("importDeviceBests", () => {
  const entries = [{ game: "nokiacricket" as const, modeId: "classic_10", score: 140 }];

  it("sends the bests to the player's own import endpoint and reports what was taken", async () => {
    mockApiFetch.mockResolvedValue({ ok: true, json: async () => ({ accepted: entries, skipped: [{ game: "x", modeId: "y", reason: "not_better" }] }) });

    const result = await importDeviceBests("alice", entries);

    expect(result).toEqual({ accepted: 1, skipped: 1 });
    const [path, init] = mockApiFetch.mock.calls[0]!;
    expect(path).toBe("/api/profile/alice/scorecards/import-device");
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse((init as { body: string }).body)).toEqual({ entries });
  });

  it("says why when the server refuses", async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "Your device records could not be added to your account. Please retry." }) });

    await expect(importDeviceBests("alice", entries)).rejects.toThrow("could not be added");
  });

  it("gives a plain message when the request never got through", async () => {
    mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(importDeviceBests("alice", entries)).rejects.toThrow(/connection/i);
  });

  it("does not call the server when there is nothing to send", async () => {
    await expect(importDeviceBests("alice", [])).resolves.toEqual({ accepted: 0, skipped: 0 });
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
