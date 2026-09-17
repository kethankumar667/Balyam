import { describe, it, expect, beforeEach } from "vitest";
import { scorecardService } from "../ScorecardService.js";
import { profileService } from "../ProfileService.js";

describe("Scorecard & Profile Match Integration", () => {
  beforeEach(() => {
    scorecardService.deleteScorecards("p_winner");
    scorecardService.deleteScorecards("p_loser");
  });

  it("automatically projects finished match scores into player scorecards", () => {
    profileService.recordMatchFinished({
      roomCode: "HC2026",
      game: "handcricket",
      startedAt: 1000,
      finishedAt: 120000,
      durationMs: 119000,
      winnerId: "p_winner",
      modeId: "2_overs",
      participants: [
        {
          playerId: "p_winner",
          name: "Virat",
          isWinner: true,
          score: 48,
          secondaryMetrics: { balls: 12, strikeRate: 400, fours: 4, sixes: 4 },
        },
        {
          playerId: "p_loser",
          name: "Rohit",
          isWinner: false,
          score: 32,
          secondaryMetrics: { balls: 12, strikeRate: 266, fours: 3, sixes: 2 },
        },
      ],
    });

    const winnerCards = scorecardService.getScorecards("p_winner");
    expect(winnerCards.games.handcricket).toBeDefined();
    const hcMode = winnerCards.games.handcricket?.modes["2_overs"];
    expect(hcMode?.bestScore).toBe(48);
    expect(hcMode?.foilTier).toBe("prismatic_holo");
    expect(hcMode?.radar.clutch).toBeGreaterThan(0);
    expect(hcMode?.secondaryMetrics.strikeRate).toBe(400);

    const loserCards = scorecardService.getScorecards("p_loser");
    expect(loserCards.games.handcricket?.modes["2_overs"]?.bestScore).toBe(32);
  });
});
