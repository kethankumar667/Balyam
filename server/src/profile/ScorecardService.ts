import type {
  AllGameSlug,
  PlayerScorecardArchive,
  GameScorecard,
  ModeScorecard,
  RecordScorePayload,
  RecordScoreResult,
  GhostPaceStatus,
} from "@shared/profile/Scorecard.js";
import {
  getGameModeConfig,
  determineFoilTier,
  calculateRadarMetrics,
} from "@shared/profile/GameModes.js";

export class ScorecardService {
  private scorecards: Map<string, PlayerScorecardArchive> = new Map();

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
   * Resets or deletes scorecards for a player (e.g. on profile purge).
   */
  public deleteScorecards(playerId: string): boolean {
    return this.scorecards.delete(playerId);
  }
}

export const scorecardService = new ScorecardService();
