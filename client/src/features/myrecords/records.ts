import { GAME_MODE_REGISTRY, getGameModeConfig } from "@shared/profile/GameModes";
import type { AllGameSlug, ModeScorecard, PlayerScorecardArchive } from "@shared/profile/Scorecard";
import { readModeBest } from "../../lib/modeBests";
import { formatGameMetricValue } from "../../lib/metricFormatters";
import { getGameMetricSchema } from "@shared/profile/MetricRegistry";
import { preserveLegacyRummyModes } from "@shared/profile/recordCompatibility";

const GAME_IDS: AllGameSlug[] = [
  "handcricket", "2048", "nokiasnake", "nokiacricket", "roadrash", "brickblocks", "breakout",
  "ludo", "uno", "chess", "snake", "rummy", "snl", "dotsboxes", "wordbuilding", "rps",
  "tictactoe", "stargame", "bingo", "namesplaceanimal", "spacewar", "blockblast", "sudoku",
  "brainvita", "connect4", "vamanaguntalu",
];

const LABELS: Partial<Record<AllGameSlug, string>> = {
  nokiasnake: "Retro Snake", nokiacricket: "Retro Cricket", roadrash: "Brick Racer",
  brickblocks: "Brick Blocks", breakout: "Brick Breakout", uno: "Color Cards",
  sudoku: "Sudoku", brainvita: "Goli Jump", snake: "Snake 2D",
};

const IMAGES: Partial<Record<AllGameSlug, string>> = {
  handcricket: "HandCricketTile", "2048": "2048 Game Tile", nokiasnake: "Snake Game Tile",
  nokiacricket: "RetroCricket Game Tile", roadrash: "BrickRacer Game Tile",
  brickblocks: "BlockBlast Game Tile", breakout: "BrickBreakout Game Tile", ludo: "LudoTile",
  uno: "ColorCardsTile", chess: "Chess Game Tile", snake: "Snake Game Tile", rummy: "RummyTile",
  snl: "S&LTile", dotsboxes: "Dots&boxes", wordbuilding: "words_building", rps: "RPSTile",
  stargame: "StarTile", bingo: "Bingo Tile", namesplaceanimal: "Name-place-thing-animal",
  spacewar: "SpacewarTile", blockblast: "BlockBlast Game Tile", sudoku: "Sudoku Game Tile",
  brainvita: "GoliJumpTile", tictactoe: "TicTacToeTile", connect4: "Connect4Tile", vamanaguntalu: "VamanaGuntaluTile",
};

export const RECORD_GAMES = GAME_IDS.filter((game) => GAME_MODE_REGISTRY[game]).map((id) => ({
  id, label: LABELS[id] ?? getGameModeConfig(id).displayName,
  image: `/${IMAGES[id]}.png`, config: getGameModeConfig(id),
}));

/** Designed goals, not other players' records or promises of a reward. */
export const RECORD_GOALS: Record<string, Record<string, number>> = {
  breakout: { classic: 2480 },
  "2048": { daily: 3420, battle: 2840, timeattack: 1960, zen: 2950, race: 135 },
  nokiasnake: { classic_walled: 84, borderless_wrap: 96 },
  nokiacricket: { classic_1: 14, classic_2: 44, classic_5: 96, classic_10: 172, chase_1: 16, chase_2: 30, chase_5: 68, chase_10: 130 },
  roadrash: { circuit_rush: 450 }, brickblocks: { classic: 5400, pentix: 3900 },
  snake: { classic_walled: 92, borderless_wrap: 110, speed_rush: 76 },
  handcricket: { international_t20: 184, international_odi: 240, international_test: 312, franchise_t20: 184, franchise_odi: 240, franchise_test: 312, galli_quick: 52, galli_standard: 112, galli_long: 196 },
  ludo: { classic_4token: 34 },
  uno: { single: 0, race_300: 85, race_500: 160, race_1000: 320 },
  chess: { blitz_3m: 28, bullet_1m: 32, rapid_10m: 25 },
  tictactoe: { quantum: 12, classic: 9 }, connect4: { classic: 18 }, vamanaguntalu: { classic: 50 },
};

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function readDeviceData(game: AllGameSlug): unknown {
  if (typeof window === "undefined") return null;
  const key = ({
    "2048": "bhalyam.2048.stats.v1", nokiasnake: "bhalyam_retro_snake_v1",
    nokiacricket: "bhalyam_nokia_cricket_data_v1", roadrash: "bhalyam_brick_racer_v1",
    brickblocks: "bhalyam_brick_tetris_save_v1", breakout: "bhalyam_brick_breakout_v1",
    snake: "mpg.snake.best", blockblast: "bb.best",
  } as Partial<Record<AllGameSlug, string>>)[game];
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`Could not read saved records for ${game}`, error);
    return null;
  }
}

/** Device-only bests have no reliable match count or achievement date. */
export function readDeviceBest(game: AllGameSlug, mode: string): number | null {
  return deviceBestForMode(game, mode, readDeviceData(game));
}

function deviceBestForMode(game: AllGameSlug, mode: string, raw: unknown): number | null {
  if (!getGameModeConfig(game).modes.some((entry) => entry.modeId === mode)) return null;
  if (game === "blockblast") return positive(raw);
  const data = object(raw);
  if (game === "2048") {
    if (mode === "race") {
      const ms = positive(data.bestRaceTimeMs);
      return ms === null ? null : Math.round(ms / 1000);
    }
    return positive(mode === "daily" ? data.dailyBestScore : object(data.bestScore)[mode]);
  }
  if (game === "nokiasnake" || game === "nokiacricket") return readModeBest(data.modeBestScores, mode);
  if (game === "brickblocks") {
    const stored = positive(mode === "pentix" ? data.bestPentixScore : data.bestClassicScore);
    const entries: unknown[] = Array.isArray(data.highScores) ? data.highScores : [];
    return positive(entries.reduce<number>((best, entry) => {
      const result = object(entry);
      return result.mode === (mode === "pentix" ? "PENTIX" : "CLASSIC") ? Math.max(best, positive(result.score) ?? 0) : best;
    }, stored ?? 0));
  }
  return positive(data.highScore);
}

/** An overall device best cannot establish which rules were used. */
function readPreviousOverallBest(game: AllGameSlug, raw: unknown): number | null {
  if (game === "snake") return positive(raw);
  if (game !== "nokiasnake" && game !== "nokiacricket") return null;
  const data = object(raw);
  const overall = positive(data.highScore);
  if (overall === null) return null;
  const tracked = getGameModeConfig(game).modes.some(
    (mode) => (readModeBest(data.modeBestScores, mode.modeId) ?? 0) >= overall,
  );
  return tracked ? null : overall;
}

interface PreviousModeRecord extends ModeScorecard {
  deviceOnly?: boolean;
  originalModeId?: string;
}

export function buildRecords(archive: PlayerScorecardArchive | null, useDevice = true, localArchive: PlayerScorecardArchive | null = null) {
  return RECORD_GAMES.map((game) => {
    const current = archive?.games[game.id];
    const older = game.id === "brickblocks" ? archive?.games.tetris : undefined;
    const archivedModes = { ...older?.modes, ...current?.modes };
    const savedModes = game.id === "rummy" ? preserveLegacyRummyModes(archivedModes) : archivedModes;
    const previousModeRecords: PreviousModeRecord[] = Object.entries(savedModes)
      .filter(([id, saved]) => !game.config.modes.some((mode) => mode.modeId === id) && hasRecordedBest(saved))
      .map(([, saved]) => saved);
    const local = useDevice && (!archive || archive.playerId === localArchive?.playerId) ? localArchive : null;
    const localModes = { ...(game.id === "brickblocks" ? local?.games.tetris?.modes : {}), ...local?.games[game.id]?.modes };
    const localSavedModes = game.id === "rummy" ? preserveLegacyRummyModes(localModes) : localModes;
    for (const [id, saved] of Object.entries(localSavedModes)) {
      if (!hasRecordedBest(saved)) continue;
      const account = savedModes[id];
      if (hasRecordedBest(account) && account.scoringDirection === saved.scoringDirection &&
        (saved.scoringDirection === "LOWER_IS_BETTER" ? account.bestScore <= saved.bestScore : account.bestScore >= saved.bestScore)) continue;
      previousModeRecords.push({
        ...saved, modeId: `device_cache_${id}`, originalModeId: id, deviceOnly: true,
        timesPlayed: 0, bestScoreAchievedAt: 0,
      });
    }
    const deviceData = useDevice ? readDeviceData(game.id) : null;
    return {
      ...game,
      lastPlayedAt: current?.lastPlayedAt ?? older?.lastPlayedAt,
      previousOverallBest: readPreviousOverallBest(game.id, deviceData),
      previousModeRecords,
      modes: game.config.modes.map((mode) => {
        const saved = savedModes[mode.modeId];
        const deviceBest = deviceBestForMode(game.id, mode.modeId, deviceData);
        const hasSavedBest = hasRecordedBest(saved);
        return {
          ...mode,
          best: hasSavedBest ? saved.bestScore : deviceBest,
          deviceOnly: !hasSavedBest && deviceBest !== null,
          timesPlayed: saved?.timesPlayed ?? 0,
          achievedAt: hasSavedBest ? saved.bestScoreAchievedAt : undefined,
          recentScores: (saved?.recentScores ?? []).filter(Number.isFinite).slice(0, 5).reverse(),
          average: saved?.averageScore,
          goal: RECORD_GOALS[game.id]?.[mode.modeId],
        };
      }),
    };
  });
}

function hasRecordedBest(saved: ModeScorecard | undefined): saved is ModeScorecard {
  return saved !== undefined && Number.isFinite(saved.bestScore) && saved.timesPlayed > 0;
}

export type RecordGame = ReturnType<typeof buildRecords>[number];
export type RecordMode = RecordGame["modes"][number];

export function formatRecordScore(game: RecordGame, mode: RecordMode, score: number): string {
  const format = mode.unit === "s" ? "duration_seconds" : getGameMetricSchema(game.id).primaryRankMetric.format;
  const value = formatGameMetricValue(score, format);
  return format === "raw_number" || format === "tiles" ? `${value} ${mode.unit}` : value;
}

export function recordValue(game: RecordGame, mode: RecordMode): string {
  return mode.best === null ? "No score yet" : formatRecordScore(game, mode, mode.best);
}

export function recordDate(value?: number): string {
  return value && Number.isFinite(value) ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date not recorded";
}

export function goalProgress(mode: RecordMode): number | null {
  if (mode.best === null || mode.goal === undefined) return null;
  if (mode.scoringDirection === "LOWER_IS_BETTER") {
    if (mode.goal === 0) return mode.best === 0 ? 100 : null;
    return Math.min(100, Math.max(0, Math.round(mode.goal / Math.max(mode.best, 1) * 100)));
  }
  if (mode.goal <= 0) return null;
  return Math.min(100, Math.max(0, Math.round(mode.best / mode.goal * 100)));
}

export function recordSummary(games: RecordGame[]) {
  const modes = games.flatMap((game) => game.modes);
  const previous = games.flatMap((game) => game.previousModeRecords);
  return {
    gamesExplored: games.filter((game) => game.previousOverallBest !== null || game.previousModeRecords.length > 0 || game.modes.some((mode) => mode.best !== null || mode.timesPlayed > 0)).length,
    modesAvailable: modes.length,
    modesPlayed: modes.filter((mode) => mode.best !== null || mode.timesPlayed > 0).length + previous.filter((mode) => !mode.deviceOnly).length,
    personalBests: modes.filter((mode) => mode.best !== null).length + games.filter((game) => game.previousOverallBest !== null).length + previous.length,
    goalsReached: modes.filter((mode) => goalProgress(mode) === 100).length,
    matches: modes.reduce((total, mode) => total + mode.timesPlayed, 0) + previous.reduce((total, mode) => total + mode.timesPlayed, 0),
  };
}
