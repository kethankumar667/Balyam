import { describe, it, expect, beforeEach } from "vitest";
import { ScorecardService } from "../ScorecardService.js";

describe("ScorecardService", () => {
  let service: ScorecardService;

  beforeEach(() => {
    service = new ScorecardService();
  });

  it("initializes empty scorecard archive for a player", () => {
    const archive = service.getScorecards("p_123");
    expect(archive.playerId).toBe("p_123");
    expect(archive.totalPersonalBestsBeaten).toBe(0);
    expect(archive.games).toEqual({});
  });

  it("records first score as personal best (higher-is-better: Hand Cricket)", () => {
    const res = service.recordScore("p_123", {
      game: "handcricket",
      modeId: "2_overs",
      score: 36,
      context: "PVP_MULTIPLAYER",
      matchId: "m_1",
      secondaryMetrics: { strikeRate: 300, boundaries: 6 },
    });

    expect(res.isNewPersonalBest).toBe(true);
    expect(res.scorecard.bestScore).toBe(36);
    expect(res.scorecard.timesPlayed).toBe(1);
    expect(res.scorecard.averageScore).toBe(36);
    expect(res.scorecard.recentScores).toEqual([36]);
    expect(res.totalPersonalBestsBeaten).toBe(1);
  });

  it("detects new personal best when player beats their score in Hand Cricket", () => {
    service.recordScore("p_123", {
      game: "handcricket",
      modeId: "2_overs",
      score: 36,
      context: "PVP_MULTIPLAYER",
      matchId: "m_1",
    });

    // Lower score does NOT beat PB
    const res2 = service.recordScore("p_123", {
      game: "handcricket",
      modeId: "2_overs",
      score: 24,
      context: "PVP_MULTIPLAYER",
      matchId: "m_2",
    });
    expect(res2.isNewPersonalBest).toBe(false);
    expect(res2.scorecard.bestScore).toBe(36);
    expect(res2.scorecard.averageScore).toBe(30);
    expect(res2.scorecard.recentScores).toEqual([24, 36]);
    expect(res2.deltaFromPrevious).toBe(-12);

    // Higher score beats PB
    const res3 = service.recordScore("p_123", {
      game: "handcricket",
      modeId: "2_overs",
      score: 52,
      context: "PVP_MULTIPLAYER",
      matchId: "m_3",
    });
    expect(res3.isNewPersonalBest).toBe(true);
    expect(res3.scorecard.bestScore).toBe(52);
    expect(res3.previousBest).toBe(36);
    expect(res3.deltaFromPrevious).toBe(16);
    expect(res3.scorecard.recentScores).toEqual([52, 24, 36]);
    expect(res3.totalPersonalBestsBeaten).toBe(2);
  });

  it("correctly handles lower-is-better games (Ludo / Rummy)", () => {
    // In Ludo, fewer turns to finish is better
    const res1 = service.recordScore("p_ludo", {
      game: "ludo",
      modeId: "classic_4token",
      score: 38,
      context: "PVP_MULTIPLAYER",
      matchId: "m_l1",
    });
    expect(res1.isNewPersonalBest).toBe(true);
    expect(res1.scorecard.bestScore).toBe(38);

    // Taking more turns (e.g. 45 turns) is worse, so NOT a personal best
    const res2 = service.recordScore("p_ludo", {
      game: "ludo",
      modeId: "classic_4token",
      score: 45,
      context: "PVP_MULTIPLAYER",
      matchId: "m_l2",
    });
    expect(res2.isNewPersonalBest).toBe(false);
    expect(res2.scorecard.bestScore).toBe(38);

    // Finishing faster (e.g. 29 turns) IS a personal best!
    const res3 = service.recordScore("p_ludo", {
      game: "ludo",
      modeId: "classic_4token",
      score: 29,
      context: "PVP_MULTIPLAYER",
      matchId: "m_l3",
    });
    expect(res3.isNewPersonalBest).toBe(true);
    expect(res3.scorecard.bestScore).toBe(29);
    expect(res3.previousBest).toBe(38);
    expect(res3.deltaFromPrevious).toBe(9); // 9 turns faster
  });

  it("isolates different modes of the same game", () => {
    service.recordScore("p_multi", {
      game: "handcricket",
      modeId: "1_over",
      score: 18,
      context: "VS_BOTS",
      matchId: "m_h1",
    });

    service.recordScore("p_multi", {
      game: "handcricket",
      modeId: "2_overs",
      score: 44,
      context: "PVP_MULTIPLAYER",
      matchId: "m_h2",
    });

    const archive = service.getScorecards("p_multi");
    const hc = archive.games.handcricket;
    expect(hc).toBeDefined();
    expect(hc?.totalModesPlayed).toBe(2);
    expect(hc?.modes["1_over"]?.bestScore).toBe(18);
    expect(hc?.modes["2_overs"]?.bestScore).toBe(44);
  });

  it("computes live Ghost Pace delta", () => {
    service.recordScore("p_ghost", {
      game: "snake",
      modeId: "classic_walled",
      score: 40,
      context: "SOLO",
      matchId: "m_s1",
    });

    // Score behind PB
    const pace1 = service.getGhostPace("p_ghost", "snake", "classic_walled", 25);
    expect(pace1.personalBest).toBe(40);
    expect(pace1.currentScore).toBe(25);
    expect(pace1.delta).toBe(-15);
    expect(pace1.isAhead).toBe(false);
    expect(pace1.isOverdrive).toBe(false);

    // Score exceeding PB (Overdrive!)
    const pace2 = service.getGhostPace("p_ghost", "snake", "classic_walled", 45);
    expect(pace2.delta).toBe(5);
    expect(pace2.isAhead).toBe(true);
    expect(pace2.isOverdrive).toBe(true);
  });

  it("ranks players correctly on getModeLeaderboard across multiple players", () => {
    service.recordScore("player_a", {
      game: "2048",
      modeId: "grid_4x4",
      score: 1024,
      context: "SOLO",
      matchId: "m_2048_1",
    });

    service.recordScore("player_b", {
      game: "2048",
      modeId: "grid_4x4",
      score: 4096,
      context: "SOLO",
      matchId: "m_2048_2",
    });

    service.recordScore("player_c", {
      game: "2048",
      modeId: "grid_4x4",
      score: 2048,
      context: "SOLO",
      matchId: "m_2048_3",
    });

    const ranks = service.getModeLeaderboard("2048", "grid_4x4", 10, (id) => ({
      displayName: `Name_${id}`,
    }));

    expect(ranks.length).toBe(3);
    expect(ranks[0]?.playerId).toBe("player_b");
    expect(ranks[0]?.bestScore).toBe(4096);
    expect(ranks[0]?.rank).toBe(1);

    expect(ranks[1]?.playerId).toBe("player_c");
    expect(ranks[1]?.bestScore).toBe(2048);
    expect(ranks[1]?.rank).toBe(2);

    expect(ranks[2]?.playerId).toBe("player_a");
    expect(ranks[2]?.bestScore).toBe(1024);
    expect(ranks[2]?.rank).toBe(3);
  });

  it("seeds initial benchmark scores so leaderboards are populated from launch", () => {
    // 2048 Zen mode
    const zenRanks = service.getModeLeaderboard("2048", "zen");
    expect(zenRanks.length).toBeGreaterThanOrEqual(3);
    expect(zenRanks[0]?.displayName).toBe("Master A.N.N.A");
    expect(zenRanks[0]?.bestScore).toBe(2450);

    // 2048 Battle mode
    const battleRanks = service.getModeLeaderboard("2048", "battle");
    expect(battleRanks.length).toBeGreaterThanOrEqual(3);
    expect(battleRanks[0]?.bestScore).toBe(2840);

    // Nokia Snake
    const snakeRanks = service.getModeLeaderboard("nokiasnake", "classic_walled");
    expect(snakeRanks.length).toBeGreaterThanOrEqual(3);
    expect(snakeRanks[0]?.bestScore).toBe(84);

    // Nokia Cricket
    const cricketRanks = service.getModeLeaderboard("nokiacricket", "2_overs");
    expect(cricketRanks.length).toBeGreaterThanOrEqual(3);
    expect(cricketRanks[0]?.bestScore).toBe(44);

    // Brick Racer
    const racerRanks = service.getModeLeaderboard("roadrash", "circuit_rush");
    expect(racerRanks.length).toBeGreaterThanOrEqual(3);
    expect(racerRanks[0]?.bestScore).toBe(450);

    // Brick Tetris
    const tetrisRanks = service.getModeLeaderboard("brickblocks", "classic");
    expect(tetrisRanks.length).toBeGreaterThanOrEqual(3);
    expect(tetrisRanks[0]?.bestScore).toBe(5400);
  });

  it("allows a real player to beat the benchmark and take Rank 1 on the leaderboard", () => {
    // Real player scores 5000 in Zen mode (benchmark was 2450)
    service.recordScore("human_player_pro", {
      game: "2048",
      modeId: "zen",
      score: 5000,
      context: "SOLO",
      matchId: "m_zen_pro",
    });

    const zenRanks = service.getModeLeaderboard("2048", "zen", 10, (id) =>
      id === "human_player_pro" ? { displayName: "ProGamer99", avatar: "pro" } : undefined
    );

    expect(zenRanks[0]?.playerId).toBe("human_player_pro");
    expect(zenRanks[0]?.displayName).toBe("ProGamer99");
    expect(zenRanks[0]?.bestScore).toBe(5000);
    expect(zenRanks[0]?.rank).toBe(1);

    // The former champion drops to Rank 2
    expect(zenRanks[1]?.playerId).toBe("bot_lounge_champ");
    expect(zenRanks[1]?.rank).toBe(2);
  });
});
