import { describe, it, expect, beforeEach } from "vitest";
import { rankingService } from "../RankingService.js";
import { profileService } from "../../profile/ProfileService.js";
import { getRankTier } from "@shared/ranking/RankingRules.js";

describe("Competitive Ranking Service", () => {
  beforeEach(() => {
    rankingService.reset();
    profileService.reset();
  });

  it("calculates competitive rating, tier, and percentile accurately", () => {
    profileService.getOrCreateProfile("p1", "Player One");
    profileService.getOrCreateProfile("p2", "Player Two");

    // Record match won by p1
    profileService.recordMatchFinished({
      roomCode: "LUDO01",
      game: "ludo",
      startedAt: 1000,
      finishedAt: 61000,
      durationMs: 60000,
      winnerId: "p1",
      participants: [
        { playerId: "p1", name: "Player One", isWinner: true },
        { playerId: "p2", name: "Player Two", isWinner: false },
      ],
    });

    rankingService.invalidateCache();

    const rankP1 = rankingService.getPlayerRank("p1");
    expect(rankP1.rating).toBeGreaterThan(400);
    const expectedTier = getRankTier(rankP1.rating).tier;
    expect(rankP1.tier).toBe(expectedTier);
    expect(rankP1.globalRank).toBe(1);
    expect(rankP1.percentile).toBe(100);
  });
});
