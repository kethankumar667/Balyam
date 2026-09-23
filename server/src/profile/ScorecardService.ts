import type {
  AllGameSlug,
  PlayerScorecardArchive,
  GameScorecard,
  ModeScorecard,
  RecordScorePayload,
  RecordScoreResult,
  GhostPaceStatus,
  FoilTier,
  ScoringDirection,
  QuantumPerformanceRadar,
} from "@shared/profile/Scorecard.js";
import {
  getGameModeConfig,
  determineFoilTier,
  calculateRadarMetrics,
  GAME_MODE_REGISTRY,
} from "@shared/profile/GameModes.js";

export const BOT_PROFILES: Record<string, { displayName: string; avatar: string }> = {
  bot_lounge_champ: { displayName: "Master A.N.N.A", avatar: "aura-gold" },
  bot_retro_master: { displayName: "Retro King", avatar: "retro-crown" },
  bot_gully_legend: { displayName: "Gully Legend", avatar: "bat-gold" },
};

export class ScorecardService {
  private scorecards: Map<string, PlayerScorecardArchive> = new Map();

  constructor() {
    this.seedInitialLeaderboards();
  }

  /**
   * Retrieves or initializes a player's scorecard archive.
   */
  public getScorecards(playerId: string): PlayerScorecardArchive {
    const existing = this.scorecards.get(playerId);
    if (existing) return existing;

    const initial: PlayerScorecardArchive = {
      playerId,
      games: {},
      totalPersonalBestsBeaten: 0,
      updatedAt: Date.now(),
    };
    this.scorecards.set(playerId, initial);
    return initial;
  }

  /**
   * Records a match score for a player in a specific game and mode.
   * Atomically evaluates Personal Best conditions and updates radar/trends.
   */
  public recordScore(playerId: string, payload: RecordScorePayload): RecordScoreResult {
    const archive = this.getScorecards(playerId);
    const gameConfig = getGameModeConfig(payload.game);
    const modeDef =
      gameConfig.modes.find((m) => m.modeId === payload.modeId) ??
      gameConfig.modes[0] ?? {
        modeId: payload.modeId,
        displayName: payload.modeId,
        description: "",
        scoringDirection: "HIGHER_IS_BETTER" as const,
        unit: "pts",
      };

    let gameScorecard = archive.games[payload.game];
    if (!gameScorecard) {
      gameScorecard = {
        game: payload.game,
        gameDisplayName: gameConfig.displayName,
        modes: {},
        lastPlayedAt: Date.now(),
        totalModesPlayed: 0,
      };
      archive.games[payload.game] = gameScorecard;
    }

    const existingMode = gameScorecard.modes[payload.modeId];
    const scoringDirection = modeDef.scoringDirection;
    const now = Date.now();

    let isNewPersonalBest = false;
    let previousBest: number | undefined = undefined;
    let deltaFromPrevious = 0;

    if (!existingMode) {
      // First time playing this mode — automatically a personal best
      isNewPersonalBest = true;
      deltaFromPrevious = payload.score;
    } else {
      previousBest = existingMode.bestScore;
      if (scoringDirection === "HIGHER_IS_BETTER") {
        if (payload.score > existingMode.bestScore) {
          isNewPersonalBest = true;
          deltaFromPrevious = payload.score - existingMode.bestScore;
        } else {
          deltaFromPrevious = payload.score - existingMode.bestScore; // negative or zero
        }
      } else {
        // LOWER_IS_BETTER
        if (payload.score < existingMode.bestScore) {
          isNewPersonalBest = true;
          deltaFromPrevious = existingMode.bestScore - payload.score; // positive improvement
        } else {
          deltaFromPrevious = existingMode.bestScore - payload.score; // negative
        }
      }
    }

    const bestScore = isNewPersonalBest ? payload.score : existingMode!.bestScore;
    const bestScoreAchievedAt = isNewPersonalBest ? now : existingMode!.bestScoreAchievedAt;
    const bestScoreMatchId = isNewPersonalBest ? payload.matchId : existingMode!.bestScoreMatchId;
    const bestContext = isNewPersonalBest ? payload.context : existingMode!.bestContext;

    const timesPlayed = (existingMode?.timesPlayed ?? 0) + 1;
    const totalScoreAccumulated = (existingMode?.totalScoreAccumulated ?? 0) + payload.score;
    const averageScore = Math.round((totalScoreAccumulated / timesPlayed) * 10) / 10;

    const recentScores = [payload.score, ...(existingMode?.recentScores ?? [])].slice(0, 5);

    const mergedSecondaryMetrics: Record<string, number | string> = {
      ...(existingMode?.secondaryMetrics ?? {}),
      ...(payload.secondaryMetrics ?? {}),
    };

    const radar = calculateRadarMetrics(timesPlayed, recentScores, payload.radarMetrics);
    const foilTier = determineFoilTier(timesPlayed, isNewPersonalBest, bestScore);

    const updatedModeScorecard: ModeScorecard = {
      modeId: payload.modeId,
      modeDisplayName: modeDef.displayName,
      bestScore,
      bestScoreAchievedAt,
      bestScoreMatchId,
      scoringDirection,
      timesPlayed,
      totalScoreAccumulated,
      averageScore,
      recentScores,
      bestContext,
      secondaryMetrics: mergedSecondaryMetrics,
      radar,
      foilTier,
    };

    gameScorecard.modes[payload.modeId] = updatedModeScorecard;
    gameScorecard.lastPlayedAt = now;
    gameScorecard.totalModesPlayed = Object.keys(gameScorecard.modes).length;

    if (isNewPersonalBest) {
      archive.totalPersonalBestsBeaten += 1;
    }
    archive.updatedAt = now;

    return {
      game: payload.game,
      scorecard: updatedModeScorecard,
      isNewPersonalBest,
      deltaFromPrevious,
      previousBest,
      totalPersonalBestsBeaten: archive.totalPersonalBestsBeaten,
    };
  }

  /**
   * Calculates live Ghost Pace status comparing active game score to all-time PB.
   */
  public getGhostPace(
    playerId: string,
    game: AllGameSlug,
    modeId: string,
    currentScore: number
  ): GhostPaceStatus {
    const archive = this.getScorecards(playerId);
    const gameConfig = getGameModeConfig(game);
    const modeDef =
      gameConfig.modes.find((m) => m.modeId === modeId) ??
      gameConfig.modes[0] ?? {
        modeId,
        displayName: modeId,
        description: "",
        scoringDirection: "HIGHER_IS_BETTER" as const,
        unit: "pts",
      };

    const modeScorecard = archive.games[game]?.modes[modeId];
    const personalBest = modeScorecard?.bestScore ?? 0;
    const scoringDirection = modeDef.scoringDirection;

    let delta = 0;
    let isAhead = false;
    let isOverdrive = false;

    if (scoringDirection === "HIGHER_IS_BETTER") {
      delta = currentScore - personalBest;
      isAhead = delta >= 0;
      isOverdrive = personalBest > 0 && currentScore > personalBest;
    } else {
      delta = personalBest - currentScore;
      isAhead = delta >= 0;
      isOverdrive = personalBest > 0 && currentScore < personalBest;
    }

    return {
      game,
      modeId,
      personalBest,
      scoringDirection,
      currentScore,
      delta,
      isAhead,
      isOverdrive,
    };
  }

  /**
   * Retrieves the ranked personal best scorecards across all players for a specific game and mode.
   */
  public getModeLeaderboard(
    game: AllGameSlug,
    modeId: string,
    limit = 50,
    resolveProfile?: (playerId: string) => { displayName?: string; avatar?: string } | undefined
  ): {
    rank: number;
    playerId: string;
    displayName: string;
    avatar?: string;
    bestScore: number;
    bestScoreAchievedAt: number;
    foilTier: FoilTier;
    scoringDirection: ScoringDirection;
    timesPlayed: number;
    secondaryMetrics?: Record<string, number | string>;
    radar: QuantumPerformanceRadar;
  }[] {
    const results: {
      rank: number;
      playerId: string;
      displayName: string;
      avatar?: string;
      bestScore: number;
      bestScoreAchievedAt: number;
      foilTier: FoilTier;
      scoringDirection: ScoringDirection;
      timesPlayed: number;
      secondaryMetrics?: Record<string, number | string>;
      radar: QuantumPerformanceRadar;
    }[] = [];

    const gameConfig = getGameModeConfig(game);
    const modeDef = gameConfig.modes.find((m) => m.modeId === modeId) ?? gameConfig.modes[0];
    const scoringDirection = modeDef?.scoringDirection ?? "HIGHER_IS_BETTER";

    for (const [playerId, archive] of this.scorecards.entries()) {
      const modeCard = archive.games[game]?.modes[modeId];
      if (!modeCard || modeCard.timesPlayed === 0) continue;

      const prof = resolveProfile ? resolveProfile(playerId) : undefined;
      const bot = BOT_PROFILES[playerId];
      const displayName = prof?.displayName || bot?.displayName || playerId;
      const avatar = prof?.avatar || bot?.avatar;

      results.push({
        rank: 0,
        playerId,
        displayName,
        avatar,
        bestScore: modeCard.bestScore,
        bestScoreAchievedAt: modeCard.bestScoreAchievedAt,
        foilTier: modeCard.foilTier,
        scoringDirection: modeCard.scoringDirection,
        timesPlayed: modeCard.timesPlayed,
        secondaryMetrics: modeCard.secondaryMetrics,
        radar: modeCard.radar,
      });
    }

    results.sort((a, b) => {
      if (scoringDirection === "HIGHER_IS_BETTER") {
        return b.bestScore - a.bestScore;
      }
      return a.bestScore - b.bestScore;
    });

    for (let i = 0; i < results.length; i++) {
      results[i]!.rank = i + 1;
    }

    return results.slice(0, limit);
  }

  /**
   * Resets or deletes scorecards for a player (e.g. on profile purge).
   */
  public deleteScorecards(playerId: string): boolean {
    return this.scorecards.delete(playerId);
  }

  /**
   * Seeds realistic initial benchmark records across all games and modes
   * so leaderboards provide engaging lounge records from launch.
   */
  public seedInitialLeaderboards(): void {
    const benchmarks: Record<string, Record<string, [number, number, number]>> = {
      "2048": {
        daily: [3420, 2680, 1940],
        battle: [2840, 2120, 1560],
        timeattack: [1960, 1520, 1140],
        zen: [2450, 1820, 1280],
        race: [135, 168, 205],
      },
      nokiasnake: {
        classic_walled: [84, 56, 38],
        speed_rush: [68, 44, 28],
      },
      snake: {
        classic_walled: [92, 64, 42],
        borderless_wrap: [110, 78, 52],
        speed_rush: [76, 50, 32],
      },
      nokiacricket: {
        "2_overs": [44, 32, 22],
        "5_overs": [96, 74, 52],
      },
      roadrash: {
        circuit_rush: [450, 320, 210],
      },
      brickblocks: {
        classic: [5400, 3800, 2200],
        pentix: [3900, 2700, 1600],
      },
      tetris: {
        classic: [5400, 3800, 2200],
        pentix: [3900, 2700, 1600],
      },
      breakout: {
        classic: [1850, 1320, 840],
      },
      handcricket: {
        "2_overs": [52, 38, 26],
        "1_over": [28, 20, 14],
        "5_overs": [112, 86, 62],
        t20: [184, 142, 98],
        odi: [240, 185, 130],
        galli: [64, 48, 32],
      },
      dotsboxes: {
        grid_7x7: [24, 18, 12],
        grid_5x5: [11, 8, 5],
        grid_9x9: [42, 32, 22],
        grid_4x4: [7, 5, 3],
      },
      wordbuilding: {
        classroom_10x10: [145, 110, 78],
        classroom_8x8: [98, 74, 52],
        tournament_10x10: [185, 140, 95],
        timed_sprint: [72, 54, 38],
      },
      carrom: {
        classic: [24, 18, 12],
        discpool: [7, 10, 14],
        freestyle: [85, 65, 45],
        points_carrom: [29, 21, 15],
      },
      rps: {
        best_of_3: [3, 2, 1],
        best_of_5: [5, 4, 3],
        sudden_death: [1, 1, 1],
      },
      stargame: {
        classic_5: [18, 14, 9],
        sprint_3: [11, 8, 5],
        marathon_10: [34, 26, 17],
        classic: [15, 11, 7],
      },
      bingo: {
        first_win: [18, 23, 29],
        all_win: [32, 38, 45],
        fast_2500: [17, 22, 28],
        standard_5x5: [19, 24, 30],
      },
      namesplaceanimal: {
        medium_5rds: [190, 145, 110],
        hard_speed: [165, 125, 90],
        marathon_10rds: [360, 275, 195],
        standard_rounds: [180, 135, 100],
      },
      ludo: {
        classic_4token: [34, 42, 52],
        quick_2token: [18, 24, 31],
      },
      rummy: {
        single: [0, 12, 24],
        pool101: [25, 45, 68],
        pool201: [55, 85, 120],
        points_rummy: [0, 10, 20],
      },
      uno: {
        single: [0, 18, 35],
        race_300: [85, 145, 210],
        race_500: [160, 240, 350],
        race_1000: [320, 480, 650],
        classic: [0, 15, 30],
      },
      snl: {
        medium: [19, 25, 33],
        easy: [14, 18, 25],
        hard: [26, 35, 48],
        extreme: [32, 44, 58],
        classic_100: [21, 28, 38],
      },
      chess: {
        blitz_3m: [28, 36, 45],
        bullet_1m: [32, 40, 50],
        rapid_10m: [25, 34, 42],
      },
      spacewar: {
        arcade_survival: [3200, 2400, 1500],
      },
      blockblast: {
        classic_endless: [4200, 3100, 1900],
      },
      tictactoe: {
        quantum: [8, 6, 4],
        classic: [6, 4, 3],
      },
      connect4: {
        classic: [18, 14, 10],
      },
    };

    const bots = ["bot_lounge_champ", "bot_retro_master", "bot_gully_legend"];

    for (const [gameSlug, modes] of Object.entries(benchmarks)) {
      for (const [modeId, scores] of Object.entries(modes)) {
        for (let i = 0; i < bots.length; i++) {
          const botId = bots[i]!;
          const score = scores[i]!;
          this.recordScore(botId, {
            game: gameSlug as AllGameSlug,
            modeId,
            score,
            context: "VS_BOTS",
            matchId: `seed_${gameSlug}_${modeId}_${botId}`,
          });
        }
      }
    }

    // Dynamic fallback for any remaining games or modes registered in GAME_MODE_REGISTRY
    for (const [gameSlug, config] of Object.entries(GAME_MODE_REGISTRY)) {
      for (const mode of config.modes) {
        if (!benchmarks[gameSlug]?.[mode.modeId]) {
          const isHigher = mode.scoringDirection !== "LOWER_IS_BETTER";
          const fallbackScores: [number, number, number] = isHigher ? [100, 75, 50] : [20, 30, 40];
          for (let i = 0; i < bots.length; i++) {
            this.recordScore(bots[i]!, {
              game: gameSlug as AllGameSlug,
              modeId: mode.modeId,
              score: fallbackScores[i]!,
              context: "VS_BOTS",
              matchId: `seed_${gameSlug}_${mode.modeId}_${bots[i]}`,
            });
          }
        }
      }
    }
  }
}

export const scorecardService = new ScorecardService();
