import { describe, it, expect } from "vitest";
import type { HcBall, HcInnings } from "@shared/types";
import type { HcPlayerProfile } from "@shared/hc-rosters";
import { generateCricbuzzCommentary } from "../CricbuzzCommentary";

describe("CricbuzzCommentary", () => {
  const battingProfiles = new Map<string, HcPlayerProfile>([
    ["p1", { id: "p1", name: "Virat Kohli", role: "batter" }],
    ["p2", { id: "p2", name: "Rohit Sharma", role: "batter" }],
  ]);

  const bowlingProfiles = new Map<string, HcPlayerProfile>([
    ["b1", { id: "b1", name: "Jasprit Bumrah", role: "bowler" }],
  ]);

  it("generates commentary entries for balls with boundaries and wickets", () => {
    const history: HcBall[] = [
      {
        inningsNumber: 1,
        overNumber: 1,
        ballInOver: 1,
        batterId: "p1",
        bowlerId: "b1",
        runs: 4,
        isBoundary: true,
        wicket: false,
        batterPick: 4,
        bowlerPick: 2,
        isRestrictedBall: false,
        milestone: null,
      },
      {
        inningsNumber: 1,
        overNumber: 1,
        ballInOver: 2,
        batterId: "p1",
        bowlerId: "b1",
        runs: 0,
        isBoundary: false,
        wicket: true,
        batterPick: 3,
        bowlerPick: 3,
        isRestrictedBall: false,
        milestone: null,
      },
    ];

    const innings: HcInnings = {
      number: 1,
      battingPlayerId: "user1",
      bowlingPlayerId: "user2",
      runs: 4,
      wickets: 1,
      balls: 2,
      overs: 5,
      endedReason: null,
      history,
      strikerIdx: 0,
      nonStrikerIdx: 1,
      nextBatterIdx: 2,
      currentBowlerId: "b1",
      lastBowlerId: null,
      batterStats: {},
      bowlerStats: {},
      restrictedBallsByOver: {},
      yorkerUsedByOver: {},
      powerplayOvers: 1,
      needsNextBatterPick: false,
      pendingBatterSlot: null,
    };

    const commentary = generateCricbuzzCommentary(innings, battingProfiles, bowlingProfiles);

    expect(commentary).toHaveLength(2);
    // Newest on top
    expect(commentary[0].isWicket).toBe(true);
    expect(commentary[0].headline).toBe("OUT!");
    expect(commentary[0].batterName).toBe("Virat Kohli");
    expect(commentary[0].bowlerName).toBe("Jasprit Bumrah");

    expect(commentary[1].runs).toBe(4);
    expect(commentary[1].headline).toBe("FOUR");
  });
});
