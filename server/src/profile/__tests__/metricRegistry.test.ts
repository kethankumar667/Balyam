import { describe, it, expect } from "vitest";
import {
  GAME_METRIC_SCHEMAS,
  getGameMetricSchema,
  formatGameMetricDisplay,
  calculatePerformanceRank,
  getNextMilestoneTarget,
  derivePlayerArchetype,
  getSignatureFeatsForGame,
} from "@shared/profile/MetricRegistry.js";
import { ScorecardService } from "../ScorecardService.js";

describe("MetricRegistry & Polymorphic Telemetry", () => {
  it("provides metric schemas for all registered games", () => {
    const ludoSchema = getGameMetricSchema("ludo");
    expect(ludoSchema.game).toBe("ludo");
    expect(ludoSchema.primaryRankMetric.format).toBe("turns");
    expect(ludoSchema.primaryRankMetric.direction).toBe("LOWER_IS_BETTER");
    expect(ludoSchema.secondaryMetrics.some((m) => m.key === "tokensCaptured")).toBe(true);

    const rummySchema = getGameMetricSchema("rummy");
    expect(rummySchema.primaryRankMetric.format).toBe("penalty_pts");
    expect(rummySchema.primaryRankMetric.direction).toBe("LOWER_IS_BETTER");

    const handcricketSchema = getGameMetricSchema("handcricket");
    expect(handcricketSchema.primaryRankMetric.format).toBe("runs");
    expect(handcricketSchema.primaryRankMetric.direction).toBe("HIGHER_IS_BETTER");
  });

  it("formats metric displays correctly across types", () => {
    expect(formatGameMetricDisplay(45, "runs")).toBe("45 runs");
    expect(formatGameMetricDisplay(18, "turns")).toBe("18 turns");
    expect(formatGameMetricDisplay(0, "penalty_pts")).toBe("0 pts (Pure Show)");
    expect(formatGameMetricDisplay(25, "penalty_pts")).toBe("25 pts");
    expect(formatGameMetricDisplay(32, "apples")).toBe("32 🍎");
    expect(formatGameMetricDisplay(8, "boxes")).toBe("8 boxes");
    expect(formatGameMetricDisplay(12, "discs")).toBe("12 discs");
    expect(formatGameMetricDisplay(65, "duration_seconds")).toBe("1m 5s");
    expect(formatGameMetricDisplay(85, "percentage")).toBe("85%");
  });

  it("ScorecardService projects secondary metrics to mode leaderboard", () => {
    const service = new ScorecardService();
    service.recordScore("player_1", {
      game: "ludo",
      modeId: "classic_ludo",
      score: 22,
      context: "PVP_MULTIPLAYER",
      matchId: "m_1",
      secondaryMetrics: {
        tokensCaptured: 4,
        sixesRolled: 7,
        tokensHome: 4,
      },
    });

    const leaderboard = service.getModeLeaderboard("ludo", "classic_ludo", 10);
    expect(leaderboard.length).toBe(1);
    expect(leaderboard[0]?.bestScore).toBe(22);
    expect(leaderboard[0]?.secondaryMetrics).toBeDefined();
    expect(leaderboard[0]?.secondaryMetrics?.["tokensCaptured"]).toBe(4);
    expect(leaderboard[0]?.secondaryMetrics?.["sixesRolled"]).toBe(7);
  });

  it("calculates accurate S/A/B/C performance ranks for different game dynamics", () => {
    // Ludo: lower turns is better
    const ludoS = calculatePerformanceRank("ludo", "classic_ludo", 18, "LOWER_IS_BETTER");
    expect(ludoS.grade).toBe("S");
    expect(ludoS.tier).toBe("S_RANK");

    const ludoB = calculatePerformanceRank("ludo", "classic_ludo", 34, "LOWER_IS_BETTER");
    expect(ludoB.grade).toBe("B");

    // Rummy: 0 is Pure Show (S-Rank)
    const rummyPure = calculatePerformanceRank("rummy", "points_rummy", 0, "LOWER_IS_BETTER");
    expect(rummyPure.grade).toBe("S");
    expect(rummyPure.label).toBe("Pure Show Master");

    // Hand Cricket: higher runs is better
    const hcCentury = calculatePerformanceRank("handcricket", "2_overs", 112, "HIGHER_IS_BETTER");
    expect(hcCentury.grade).toBe("S");
    expect(hcCentury.label).toBe("Century Legend");

    const hcFifty = calculatePerformanceRank("handcricket", "2_overs", 64, "HIGHER_IS_BETTER");
    expect(hcFifty.grade).toBe("A");
  });

  it("derives the next achievable benchmark quest correctly", () => {
    const hcNext = getNextMilestoneTarget("handcricket", "2_overs", 35, "HIGHER_IS_BETTER");
    expect(hcNext.targetScore).toBe(50);
    expect(hcNext.progressPercent).toBe(70);
    expect(hcNext.remainingText).toContain("15 runs away");

    const ludoNext = getNextMilestoneTarget("ludo", "classic_ludo", 28, "LOWER_IS_BETTER");
    expect(ludoNext.targetScore).toBe(25);
    expect(ludoNext.remainingText).toContain("Shave 3 turns");

    const rummyNext = getNextMilestoneTarget("rummy", "points_rummy", 18, "LOWER_IS_BETTER");
    expect(rummyNext.targetScore).toBe(0);
    expect(rummyNext.title).toContain("Pure Show");
  });

  it("derives player archetype persona from quantum performance radar", () => {
    const tactician = derivePlayerArchetype({
      velocity: 20,
      clutch: 30,
      efficiency: 95,
      consistency: 40,
      aggression: 15,
    });
    expect(tactician.title).toBe("The Grand Tactician");
    expect(tactician.dominantTrait).toBe("Efficiency");

    const speedster = derivePlayerArchetype({
      velocity: 90,
      clutch: 20,
      efficiency: 40,
      consistency: 20,
      aggression: 30,
    });
    expect(speedster.title).toBe("The Speed Demon");
    expect(speedster.dominantTrait).toBe("Pacing");
  });

  it("evaluates collectible signature feats per game", () => {
    const ludoFeats = getSignatureFeatsForGame("ludo", {
      modeId: "classic_ludo",
      modeDisplayName: "Classic Ludo",
      bestScore: 22,
      bestScoreAchievedAt: Date.now(),
      bestScoreMatchId: "m1",
      scoringDirection: "LOWER_IS_BETTER",
      timesPlayed: 5,
      totalScoreAccumulated: 110,
      averageScore: 22,
      recentScores: [22],
      bestContext: "PVP_MULTIPLAYER",
      secondaryMetrics: { tokensCaptured: 4, sixesRolled: 5 },
      radar: { velocity: 50, clutch: 50, efficiency: 50, consistency: 50, aggression: 50 },
      foilTier: "prismatic_holo",
    });

    expect(ludoFeats.length).toBe(3);
    const boardCleanser = ludoFeats.find((f) => f.id === "ludo_board_cleanser");
    expect(boardCleanser?.isUnlocked).toBe(true);

    const speedCircuit = ludoFeats.find((f) => f.id === "ludo_speed_circuit");
    expect(speedCircuit?.isUnlocked).toBe(true);
  });
});

