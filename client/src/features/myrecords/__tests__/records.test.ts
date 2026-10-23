import { beforeEach, describe, expect, it } from "vitest";
import { buildRecords, formatRecordScore, goalProgress, readDeviceBest, recordSummary } from "../records";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";

beforeEach(() => localStorage.clear());

describe("personal records data", () => {
  it("formats timed modes as time and includes a score unit only once", () => {
    const games = buildRecords(null);
    const game = games.find((entry) => entry.id === "2048")!;
    expect(formatRecordScore(game, game.modes.find((entry) => entry.modeId === "race")!, 125)).toBe("2m 05s");
    expect(formatRecordScore(game, game.modes[0]!, 1200)).toBe("1,200 pts");
    const cricket = games.find((entry) => entry.id === "handcricket")!;
    expect(formatRecordScore(cricket, cricket.modes[0]!, 184)).toBe("184 runs");
  });
  it("never fabricates games played, matches, dates or results from an empty archive", () => {
    const games = buildRecords(null);
    expect(recordSummary(games)).toMatchObject({ gamesExplored: 0, modesPlayed: 0, matches: 0, personalBests: 0, goalsReached: 0 });
    expect(games.every((game) => game.modes.every((mode) => mode.best === null && mode.achievedAt === undefined && !mode.recentScores.length))).toBe(true);
  });

  it("does not apply a mode's saved best to another mode", () => {
    localStorage.setItem("bhalyam_nokia_cricket_data_v1", JSON.stringify({ modeBestScores: { classic_10: 140 }, highScore: 200 }));
    expect(readDeviceBest("nokiacricket", "classic_10")).toBe(140);
    expect(readDeviceBest("nokiacricket", "classic_1")).toBeNull();
  });

  it("keeps a valid zero-point record and reaches a lower-is-better zero goal", () => {
    const empty = buildRecords(null);
    const game = empty.find((entry) => entry.id === "rummy")!;
    const mode = { ...game.modes[0]!, best: 0, goal: 0, scoringDirection: "LOWER_IS_BETTER" as const };
    expect(goalProgress(mode)).toBe(100);
    expect(goalProgress({ ...mode, best: 10 })).toBeNull();
  });

  it("prefers archive scores, keeps five results oldest-first and never invents device dates", () => {
    localStorage.setItem("bhalyam_retro_snake_v1", JSON.stringify({ modeBestScores: { classic_walled: 999 } }));
    const archive: PlayerScorecardArchive = {
      playerId: "test", totalPersonalBestsBeaten: 0, updatedAt: 1,
      games: { nokiasnake: { game: "nokiasnake", gameDisplayName: "Retro Snake", lastPlayedAt: 1, totalModesPlayed: 1,
        modes: { classic_walled: {
          modeId: "classic_walled", modeDisplayName: "Classic", bestScore: 30, timesPlayed: 8,
          bestScoreAchievedAt: 123, bestScoreMatchId: "m1", recentScores: [30, 20, 10, 9, 8, 7],
          scoringDirection: "HIGHER_IS_BETTER", totalScoreAccumulated: 100, averageScore: 12.5,
          bestContext: "SOLO", secondaryMetrics: {}, foilTier: "carbon",
          radar: { velocity: 0, clutch: 0, efficiency: 0, consistency: 0, aggression: 0 },
        } },
      } },
    };
    const mode = buildRecords(archive).find((entry) => entry.id === "nokiasnake")!.modes.find((entry) => entry.modeId === "classic_walled")!;
    expect(mode.best).toBe(30);
    expect(mode.recentScores).toEqual([8, 9, 10, 20, 30]);
    expect(mode.achievedAt).toBe(123);
    const device = buildRecords(null).find((entry) => entry.id === "nokiasnake")!.modes[0]!;
    expect(device.timesPlayed).toBe(0);
    expect(device.achievedAt).toBeUndefined();
  });
});
