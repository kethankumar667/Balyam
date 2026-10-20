import type { AllGameSlug, ScoringDirection, FoilTier, QuantumPerformanceRadar } from "./Scorecard.js";
import {
  CONNECT4_SCORE_MAX,
  CONNECT4_SCORE_MIN,
  HC_GALLI_MAX_OVERS,
  HC_GALLI_MIN_OVERS,
  VAMANA_SCORE_MAX,
  VAMANA_SCORE_MIN,
} from "../types.js";

export interface ModeDefinition {
  modeId: string;
  displayName: string;
  description: string;
  scoringDirection: ScoringDirection;
  unit: string;
  isDefault?: boolean;
  /**
   * Bounds for a score the client reports for a solo game. The server cannot
   * re-derive a browser-computed result, but it can refuse values no real play
   * could produce (a 0-second Sudoku, say). Omit for "no opinion".
   */
  minPlausibleScore?: number;
  maxPlausibleScore?: number;
}

export interface GameModeConfig {
  game: AllGameSlug;
  displayName: string;
  category: "board" | "card" | "social" | "retro_arcade";
  defaultModeId: string;
  modes: ModeDefinition[];
  /**
   * True when the SERVER derives this game's scores from the match itself. A
   * client-reported score for it is refused: it would be a way to write a
   * personal best for a game the player never played.
   */
  serverScored?: boolean;
  /**
   * True when only the listed `modes` are valid for a client-reported score.
   * Off by default because several solo titles report ids the registry does not
   * list, and rejecting those would silently stop their scores being recorded.
   */
  strictModes?: boolean;
}

/**
 * Retro Cricket's two match types (the menu's "CLASSIC MATCH" and "CHASE TARGET") crossed with the
 * four over lengths its menu offers. The labels are the ones the menu shows (`StateMachine.overOptions`).
 */
export type NokiaCricketKind = "classic" | "chase";

const NOKIA_CRICKET_OVERS: readonly { overs: number; label: string }[] = [
  { overs: 1, label: "1 Over Quick" },
  { overs: 2, label: "2 Overs Blitz" },
  { overs: 5, label: "5 Overs Match" },
  { overs: 10, label: "10 Overs Pro" },
];

const NOKIA_CRICKET_DEFAULT_OVERS = 5;

/** The mode a finished Retro Cricket run is filed under: the match type AND the overs actually played. */
export function nokiaCricketModeId(kind: NokiaCricketKind, overs: number): string {
  const tier = NOKIA_CRICKET_OVERS.find((t) => t.overs >= overs) ?? NOKIA_CRICKET_OVERS[NOKIA_CRICKET_OVERS.length - 1]!;
  return `${kind}_${tier.overs}`;
}

const NOKIA_CRICKET_MODES: ModeDefinition[] = (["classic", "chase"] as const).flatMap((kind) =>
  NOKIA_CRICKET_OVERS.map(({ overs, label }): ModeDefinition => ({
    modeId: `${kind}_${overs}`,
    displayName: `${kind === "classic" ? "Classic" : "Chase"} · ${label}`,
    description:
      kind === "classic"
        ? `${overs * 6} balls against the AI bowler — score as many runs as you can`
        : `Chase a target inside ${overs * 6} balls — the runs you score count`,
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "runs",
    isDefault: kind === "classic" && overs === NOKIA_CRICKET_DEFAULT_OVERS,
  })),
);

/** Retro Snake's two menu modes ("MODE: CLASSIC" / "MODE: WRAP") as the registry knows them. */
export type NokiaSnakeGameMode = "CLASSIC" | "WRAP_AROUND";

export function nokiaSnakeModeId(gameMode: NokiaSnakeGameMode): string {
  return gameMode === "WRAP_AROUND" ? "borderless_wrap" : "classic_walled";
}

/**
 * THE rule for this file: a mode is listed here only if a game can actually produce it, and every
 * choice a player can make in a lobby resolves to a mode listed here. `gameModeConsistency.test.ts`
 * enforces both directions, so a lobby option added without a mode (or a mode added without a lobby
 * option) fails a test instead of showing as a permanent "Not played" row.
 *
 * Names that stand for the same game under two slugs are aliases (`GAME_ALIASES`), not a second entry.
 */
export const GAME_MODE_REGISTRY: Record<string, GameModeConfig> = {
  handcricket: {
    game: "handcricket",
    displayName: "Hand Cricket",
    category: "social",
    defaultModeId: "t20",
    modes: [
      { modeId: "t20", displayName: "T20 Match (10 Overs)", description: "10 overs per innings with powerplay swings", scoringDirection: "HIGHER_IS_BETTER", unit: "runs", isDefault: true },
      { modeId: "odi", displayName: "ODI Match (15 Overs)", description: "15 overs strategic duel with bowler limits", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "test", displayName: "Test Match (30 Overs)", description: "30 overs per innings with bowler quotas", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "galli_quick", displayName: "Galli Quick (2–5 Overs)", description: "Street cricket, a short innings of 2 to 5 overs", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "galli_standard", displayName: "Galli Standard (6–10 Overs)", description: "Street cricket over 6 to 10 overs", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "galli_long", displayName: "Galli Long (11–20 Overs)", description: "Street cricket over 11 to 20 overs", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
    ],
  },
  "2048": {
    game: "2048",
    displayName: "2048 Classic",
    category: "retro_arcade",
    defaultModeId: "daily",
    modes: [
      { modeId: "daily", displayName: "Daily Singularity", description: "Compete globally with today's deterministic seed matrix", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "battle", displayName: "Battle", description: "Garbage shadow tiles escalate as you merge — survive the Crucible", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "race", displayName: "Race", description: "Sprint to 2048 and beat your fastest clear time", scoringDirection: "LOWER_IS_BETTER", unit: "s" },
      { modeId: "timeattack", displayName: "Time Attack", description: "2 minutes on the clock — chase the highest rapid score", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "zen", displayName: "Zen", description: "No clock, no pressure — serene merges with free undos", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  snake: {
    game: "snake",
    displayName: "Snake 2D",
    category: "retro_arcade",
    defaultModeId: "classic_walled",
    // A Snake 2D match is played in a room, so the server records it with the lobby's wall and speed
    // choice. The boards used to post a second score under a hardcoded "classic_walled".
    serverScored: true,
    modes: [
      { modeId: "classic_walled", displayName: "Classic Walled", description: "Solid border boundaries — boundary collision kills", scoringDirection: "HIGHER_IS_BETTER", unit: "apples", isDefault: true },
      { modeId: "borderless_wrap", displayName: "Borderless Wrap", description: "Edges wrap seamlessly through screen boundaries", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
      { modeId: "speed_rush", displayName: "Speed Rush (70ms)", description: "Fast-pace reflex survival at max speed", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
    ],
  },
  nokiasnake: {
    game: "nokiasnake",
    displayName: "Retro Snake",
    category: "retro_arcade",
    defaultModeId: "classic_walled",
    modes: [
      { modeId: "classic_walled", displayName: "Classic Walled", description: "Pixelated nostalgia run with LCD dot matrix — hit a wall and it is over", scoringDirection: "HIGHER_IS_BETTER", unit: "apples", isDefault: true },
      { modeId: "borderless_wrap", displayName: "Wrap Around", description: "No walls: the snake slides out one edge and in the opposite one", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
    ],
  },
  ludo: {
    game: "ludo",
    displayName: "Ludo",
    category: "board",
    defaultModeId: "classic_4token",
    modes: [
      // Every Ludo seat has four tokens (`TOKENS_PER_PLAYER`); there is no shorter variant to list.
      { modeId: "classic_4token", displayName: "Classic 4-Token", description: "All 4 tokens navigated home to center", scoringDirection: "LOWER_IS_BETTER", unit: "turns to win", isDefault: true },
    ],
  },
  rummy: {
    game: "rummy",
    displayName: "Indian Rummy",
    category: "card",
    defaultModeId: "single",
    modes: [
      { modeId: "single", displayName: "Points Rummy (Single Deal)", description: "One deal showdown — lowest penalty points wins", scoringDirection: "LOWER_IS_BETTER", unit: "penalty pts", isDefault: true },
      { modeId: "pool101", displayName: "Pool 101", description: "Multi-deal elimination — survive below 101 penalty points", scoringDirection: "LOWER_IS_BETTER", unit: "penalty pts" },
      { modeId: "pool201", displayName: "Pool 201", description: "Championship elimination — survive below 201 penalty points", scoringDirection: "LOWER_IS_BETTER", unit: "penalty pts" },
    ],
  },
  uno: {
    game: "uno",
    displayName: "Color Cards Showdown",
    category: "card",
    defaultModeId: "single",
    modes: [
      { modeId: "single", displayName: "Single Round", description: "One deal — first to empty hand wins", scoringDirection: "LOWER_IS_BETTER", unit: "card pts", isDefault: true },
      { modeId: "race_300", displayName: "Race to 300", description: "Quick multi-round match to 300 points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
      { modeId: "race_500", displayName: "Race to 500", description: "Championship rules: first to 500 cumulative points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
      { modeId: "race_1000", displayName: "Marathon 1000", description: "Extended high-drama session to 1000 points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
    ],
  },
  snl: {
    game: "snl",
    displayName: "Snakes & Ladders",
    category: "board",
    defaultModeId: "medium",
    modes: [
      { modeId: "medium", displayName: "Classic Balanced", description: "Traditional board with balanced snakes and ladders", scoringDirection: "LOWER_IS_BETTER", unit: "rolls to 100", isDefault: true },
      { modeId: "easy", displayName: "Friendly Ladders", description: "12 ladders, 5 snakes — rapid climb up the board", scoringDirection: "LOWER_IS_BETTER", unit: "rolls to 100" },
      { modeId: "hard", displayName: "Treacherous Slopes", description: "Scarce ladders and punishing long snake descents", scoringDirection: "LOWER_IS_BETTER", unit: "rolls to 100" },
      { modeId: "extreme", displayName: "Extreme (99→1 Snake)", description: "Sudden death slide waiting at square 99", scoringDirection: "LOWER_IS_BETTER", unit: "rolls to 100" },
    ],
  },
  dotsboxes: {
    game: "dotsboxes",
    displayName: "Dots & Boxes",
    category: "board",
    defaultModeId: "grid_7x7",
    modes: [
      { modeId: "grid_7x7", displayName: "Standard 7×7 (36 Boxes)", description: "Balanced territory and chaining battles", scoringDirection: "HIGHER_IS_BETTER", unit: "boxes", isDefault: true },
      { modeId: "grid_5x5", displayName: "Compact 5×5 (16 Boxes)", description: "Quick recess sprint — fast tactical skirmish", scoringDirection: "HIGHER_IS_BETTER", unit: "boxes" },
      { modeId: "grid_9x9", displayName: "Grand 9×9 (64 Boxes)", description: "Marathon notebook match — deep multi-box sacrifices", scoringDirection: "HIGHER_IS_BETTER", unit: "boxes" },
    ],
  },
  wordbuilding: {
    game: "wordbuilding",
    displayName: "Word Building",
    category: "social",
    defaultModeId: "classroom_10x10",
    modes: [
      { modeId: "classroom_10x10", displayName: "Classroom 10×10", description: "Everyday English (~20k words) on standard grid", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "classroom_8x8", displayName: "Classroom 8×8", description: "Quick compact match on 8×8 board", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "tournament_10x10", displayName: "Tournament 10×10", description: "Full 275k lexicon with rare tournament words on the standard grid", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "tournament_8x8", displayName: "Tournament 8×8", description: "Full 275k lexicon with rare tournament words on the compact grid", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  nokiacricket: {
    game: "nokiacricket",
    displayName: "Retro Cricket",
    category: "retro_arcade",
    defaultModeId: `classic_${NOKIA_CRICKET_DEFAULT_OVERS}`,
    modes: NOKIA_CRICKET_MODES,
  },
  rps: {
    game: "rps",
    displayName: "Rock Paper Scissors",
    category: "social",
    defaultModeId: "first_to_10",
    modes: [
      // The engine's one format is a race to `TARGET = 10` round wins; it has no best-of options.
      { modeId: "first_to_10", displayName: "First to 10", description: "Race to 10 round wins", scoringDirection: "HIGHER_IS_BETTER", unit: "rounds won", isDefault: true },
    ],
  },
  stargame: {
    game: "stargame",
    displayName: "Star Game",
    category: "board",
    defaultModeId: "classic_5",
    modes: [
      { modeId: "classic_5", displayName: "Classic (5 Rounds)", description: "Standard 5-round constellation star capture", scoringDirection: "HIGHER_IS_BETTER", unit: "stars", isDefault: true },
      { modeId: "sprint_3", displayName: "Quick Sprint (3 Rounds)", description: "Fast 3-round speed run", scoringDirection: "HIGHER_IS_BETTER", unit: "stars" },
      { modeId: "extended_7", displayName: "Extended (7 Rounds)", description: "Seven rounds — longer than classic, short of a marathon", scoringDirection: "HIGHER_IS_BETTER", unit: "stars" },
      { modeId: "marathon_10", displayName: "Marathon (10 Rounds)", description: "10-round endurance star challenge", scoringDirection: "HIGHER_IS_BETTER", unit: "stars" },
    ],
  },
  bingo: {
    game: "bingo",
    displayName: "Bingo",
    category: "social",
    defaultModeId: "first_win",
    modes: [
      { modeId: "first_win", displayName: "First Claim (Standard 4s)", description: "Round ends the moment first player claims BINGO", scoringDirection: "LOWER_IS_BETTER", unit: "calls to win", isDefault: true },
      { modeId: "all_win", displayName: "Full Table Play-Out", description: "Calling continues until everyone completes ticket", scoringDirection: "LOWER_IS_BETTER", unit: "calls to win" },
      { modeId: "fast_2500", displayName: "Fast Pace (2.5s)", description: "Lightning numbers called every 2.5s", scoringDirection: "LOWER_IS_BETTER", unit: "calls to win" },
    ],
  },
  namesplaceanimal: {
    game: "namesplaceanimal",
    displayName: "Name Place Animal Thing",
    category: "social",
    defaultModeId: "medium_5rds",
    modes: [
      // Points are totalled across the match, so the number of rounds is what sets a mode's scale.
      { modeId: "quick_3rds", displayName: "Quick 3 Rounds", description: "A short vocabulary match of 3 rounds", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "medium_5rds", displayName: "Classic 5 Rounds", description: "The standard vocabulary match of 5 rounds", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "extended_7rds", displayName: "Extended 7 Rounds", description: "A longer vocabulary match of 7 rounds", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "marathon_10rds", displayName: "Marathon 10 Rounds", description: "Extended 10-round vocabulary championship", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  chess: {
    game: "chess",
    displayName: "Grandmaster Chess",
    category: "board",
    defaultModeId: "blitz_3m",
    modes: [
      { modeId: "blitz_3m", displayName: "Blitz 3m", description: "Fast competitive duel with 3m clock", scoringDirection: "LOWER_IS_BETTER", unit: "moves to mate", isDefault: true },
      { modeId: "bullet_1m", displayName: "Bullet 1m", description: "Lightning 60-second time control", scoringDirection: "LOWER_IS_BETTER", unit: "moves to mate" },
      { modeId: "rapid_10m", displayName: "Rapid 10m", description: "Tactical classical positional play", scoringDirection: "LOWER_IS_BETTER", unit: "moves to mate" },
    ],
  },
  spacewar: {
    game: "spacewar",
    displayName: "Space War",
    category: "retro_arcade",
    defaultModeId: "arcade_survival",
    modes: [
      { modeId: "arcade_survival", displayName: "Arcade Survival", description: "Waves cleared & alien destroy score", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
    ],
  },
  blockblast: {
    game: "blockblast",
    displayName: "Block Blast",
    category: "retro_arcade",
    defaultModeId: "classic_endless",
    modes: [
      { modeId: "classic_endless", displayName: "Classic Endless", description: "Highest combo score", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
    ],
  },
  roadrash: {
    game: "roadrash",
    displayName: "Road Rash 2D",
    category: "retro_arcade",
    defaultModeId: "circuit_rush",
    modes: [
      { modeId: "circuit_rush", displayName: "Circuit Rush", description: "Distance and takedown score", scoringDirection: "HIGHER_IS_BETTER", unit: "meters", isDefault: true },
    ],
  },
  brickblocks: {
    game: "brickblocks",
    displayName: "Brick Tetris",
    category: "retro_arcade",
    defaultModeId: "classic",
    modes: [
      { modeId: "classic", displayName: "Classic Marathon", description: "Standard falling blocks line-clear run", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "pentix", displayName: "Pentix 5-Block", description: "Challenging 5-block polyominoes", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  breakout: {
    game: "breakout",
    displayName: "Brick Breakout",
    category: "retro_arcade",
    defaultModeId: "classic",
    modes: [
      // The game has one way to play; the "Moving Wall", "Time Attack" and "Endless" rows that used to
      // sit here had no counterpart in it.
      { modeId: "classic", displayName: "Classic Wall", description: "Paddle & ball brick clearing", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
    ],
  },
  sudoku: {
    game: "sudoku",
    displayName: "Sudoku Cyber-Matrix",
    category: "retro_arcade",
    defaultModeId: "medium",
    strictModes: true,
    modes: [
      { modeId: "easy", displayName: "Initiate (Easy)", description: "Casual relaxing solve with generous clues", scoringDirection: "LOWER_IS_BETTER", unit: "s", isDefault: false, minPlausibleScore: 25, maxPlausibleScore: 86_400 },
      { modeId: "medium", displayName: "Data Runner (Medium)", description: "Balanced logical deduction challenge", scoringDirection: "LOWER_IS_BETTER", unit: "s", isDefault: true, minPlausibleScore: 35, maxPlausibleScore: 86_400 },
      { modeId: "hard", displayName: "Cyber Architect (Hard)", description: "Advanced patterns, hidden pairs & triples", scoringDirection: "LOWER_IS_BETTER", unit: "s", minPlausibleScore: 50, maxPlausibleScore: 86_400 },
      { modeId: "expert", displayName: "Quantum Singularity (Expert)", description: "Extreme complexity for sudoku masters", scoringDirection: "LOWER_IS_BETTER", unit: "s", minPlausibleScore: 60, maxPlausibleScore: 86_400 },
    ],
  },
  brainvita: {
    game: "brainvita",
    displayName: "Brain Vita",
    category: "retro_arcade",
    defaultModeId: "classic",
    strictModes: true,
    modes: [
      {
        modeId: "classic",
        displayName: "Classic English board",
        description: "33 holes, 32 marbles, centre empty. Fewer marbles left is better; one is a perfect game. Played without hints or undo.",
        scoringDirection: "LOWER_IS_BETTER",
        unit: "marbles",
        isDefault: true,
        minPlausibleScore: 1,
        maxPlausibleScore: 31,
      },
    ],
  },
  tictactoe: {
    game: "tictactoe",
    displayName: "Tic Tac Toe",
    category: "board",
    defaultModeId: "quantum",
    serverScored: true,
    modes: [
      { modeId: "quantum", displayName: "Quantum Flux", description: "3-piece limit rule — 4th piece evaporates oldest mark. No draws. Faster wins score higher (max 8).", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "classic", displayName: "Classic Holo (3x3)", description: "Traditional 3x3 with holographic laser grid and cyber sound. Faster wins score higher (max 8).", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  connect4: {
    game: "connect4",
    displayName: "Four in a Row",
    category: "board",
    defaultModeId: "classic",
    // The server scores the match (only a genuine four-in-a-row win by a human against another
    // human); a client-reported score for this game is refused.
    serverScored: true,
    modes: [
      {
        modeId: "classic",
        displayName: "Classic 7x6",
        description: "Four in a row on the 7-by-6 board, human against human. Faster wins score higher (max 18).",
        scoringDirection: "HIGHER_IS_BETTER",
        unit: "pts",
        isDefault: true,
        minPlausibleScore: CONNECT4_SCORE_MIN,
        maxPlausibleScore: CONNECT4_SCORE_MAX,
      },
    ],
  },
  vamanaguntalu: {
    game: "vamanaguntalu",
    displayName: "Vamana Guntalu",
    category: "board",
    defaultModeId: "classic",
    // The server scores the match (only a genuine win on seeds by a human against another human);
    // a client-reported score for this game is refused.
    serverScored: true,
    modes: [
      {
        modeId: "classic",
        displayName: "Classic 7x2",
        description: "Seven pits a side, five seeds each, human against human. A win is scored by the seeds you finished with (36 to 70).",
        scoringDirection: "HIGHER_IS_BETTER",
        unit: "seeds",
        isDefault: true,
        minPlausibleScore: VAMANA_SCORE_MIN,
        maxPlausibleScore: VAMANA_SCORE_MAX,
      },
    ],
  },
};

/**
 * A slug that names the same scored game as another one. The catalog routes `tetris` to the
 * `brickblocks` page, and that is the slug its scores are recorded under; listing both made the
 * deck show "Brick Tetris" twice.
 */
const GAME_ALIASES: Readonly<Record<string, string>> = { tetris: "brickblocks" };

/**
 * Returns the game config or a safe default for unlisted games.
 */
export function getGameModeConfig(game: string): GameModeConfig {
  const cfg = GAME_MODE_REGISTRY[GAME_ALIASES[game] ?? game];
  if (cfg) return cfg;
  return {
    game: game as AllGameSlug,
    displayName: game.charAt(0).toUpperCase() + game.slice(1),
    category: "social",
    defaultModeId: "standard",
    modes: [
      { modeId: "standard", displayName: "Standard Mode", description: "Default game mode", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
    ],
  };
}

type ModeResolver = (options: Record<string, unknown>) => string | undefined;

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  allowed.find((candidate) => candidate === value);

/**
 * How each game turns the options a host chose in the lobby into one of its registered modes.
 *
 * The field names are the ones on the wire (`shared/types.ts`). That is the part that was wrong:
 * this used to read `rummyMode`, `matchLength` and `dictMode`, which no game sends, so the server
 * filed every Rummy pool, UNO race and tournament dictionary match under the game's default mode.
 * A resolver returns `undefined` to fall back to the game's default mode.
 *
 * Retro Cricket and Retro Snake are absent on purpose: they are recorded by the client from the
 * game's own state, through `nokiaCricketModeId` / `nokiaSnakeModeId`.
 */
const MODE_RESOLVERS: Readonly<Record<string, ModeResolver>> = {
  handcricket: (o) => {
    if (o.mode === "galli") {
      // The engine defaults a missing `galliOvers` to 5 and clamps it to the slider's range.
      const overs = Math.max(HC_GALLI_MIN_OVERS, Math.min(HC_GALLI_MAX_OVERS, Math.floor(finiteNumber(o.galliOvers) ?? 5)));
      return overs <= 5 ? "galli_quick" : overs <= 10 ? "galli_standard" : "galli_long";
    }
    return oneOf(o.format, ["odi", "test"] as const) ?? "t20";
  },
  "2048": (o) => oneOf(o.mode === "time_attack" ? "timeattack" : o.mode, ["daily", "battle", "race", "timeattack", "zen"] as const),
  snl: (o) => oneOf(o.difficulty, ["easy", "medium", "hard", "extreme"] as const),
  rummy: (o) => oneOf(o.mode, ["single", "pool101", "pool201"] as const),
  uno: (o) => {
    // `null` is the lobby's "Single round"; a number is a race to that many points.
    const target = finiteNumber(o.targetScore);
    if (target === undefined || target <= 0) return "single";
    return target <= 300 ? "race_300" : target <= 500 ? "race_500" : "race_1000";
  },
  dotsboxes: (o) => ({ 5: "grid_5x5", 7: "grid_7x7", 9: "grid_9x9" } as Record<number, string>)[finiteNumber(o.boardSize) ?? 0],
  wordbuilding: (o) => `${o.dictionaryMode === "tournament" ? "tournament" : "classroom"}_${o.boardSize === 8 ? "8x8" : "10x10"}`,
  snake: (o) => {
    // Speed is a mode of its own whatever the walls; otherwise the walls decide. A missing
    // `wallMode` is the engine's default, which wraps.
    if ((finiteNumber(o.speedMs) ?? Infinity) <= 70) return "speed_rush";
    return o.wallMode === "solid" ? "classic_walled" : "borderless_wrap";
  },
  stargame: (o) => {
    const rounds = finiteNumber(o.totalRounds);
    if (rounds === undefined) return undefined;
    return rounds <= 3 ? "sprint_3" : rounds <= 5 ? "classic_5" : rounds <= 7 ? "extended_7" : "marathon_10";
  },
  // Calls-to-win does not depend on the pace, but a 2.5s caller is a different test of reflexes.
  bingo: (o) => (o.stopOnFirstWin === false ? "all_win" : (finiteNumber(o.callIntervalMs) ?? Infinity) <= 2500 ? "fast_2500" : "first_win"),
  namesplaceanimal: (o) => {
    const rounds = finiteNumber(o.totalRounds);
    if (rounds === undefined) return undefined;
    return rounds <= 3 ? "quick_3rds" : rounds <= 5 ? "medium_5rds" : rounds <= 7 ? "extended_7rds" : "marathon_10rds";
  },
  chess: (o) => {
    const fixed = { bullet_1_0: "bullet_1m", blitz_3_2: "blitz_3m", rapid_10_0: "rapid_10m" } as Record<string, string>;
    if (typeof o.timeControl === "string" && fixed[o.timeControl]) return fixed[o.timeControl];
    // A custom clock is filed with the standard one it is closest to.
    const seconds = finiteNumber(o.initialSeconds);
    if (seconds === undefined) return undefined;
    return seconds < 180 ? "bullet_1m" : seconds < 600 ? "blitz_3m" : "rapid_10m";
  },
  tictactoe: (o) => (o.mode === "classic" ? "classic" : "quantum"),
};

/**
 * Resolves the modeId a finished match is filed under from the options its room was created with.
 * Always returns a mode that is in the registry, falling back to the game's default.
 */
export function resolveModeId(game: string, options?: Record<string, unknown>): string {
  const cfg = getGameModeConfig(game);
  if (!options) return cfg.defaultModeId;
  const resolved = MODE_RESOLVERS[GAME_ALIASES[game] ?? game]?.(options);
  return resolved !== undefined && cfg.modes.some((m) => m.modeId === resolved) ? resolved : cfg.defaultModeId;
}

/**
 * Determines Foil Tier based on number of times played and score standing.
 */
export function determineFoilTier(timesPlayed: number, isPersonalBest: boolean, score: number): FoilTier {
  if (timesPlayed >= 25 && isPersonalBest) return "obsidian_vanguard";
  if (isPersonalBest && score > 0) return "prismatic_holo";
  if (timesPlayed >= 10) return "neon_cyan";
  return "carbon";
}

/**
 * Calculates synthetic or supplied Quantum Performance Radar metrics.
 */
export function calculateRadarMetrics(
  timesPlayed: number,
  recentScores: number[],
  customMetrics?: Partial<QuantumPerformanceRadar>
): QuantumPerformanceRadar {
  const baseVelocity = Math.min(100, Math.max(20, 50 + timesPlayed * 2));
  const baseConsistency = recentScores.length >= 3 ? 75 : 50;
  return {
    velocity: customMetrics?.velocity ?? baseVelocity,
    clutch: customMetrics?.clutch ?? Math.min(95, 45 + Math.floor(timesPlayed * 2.5)),
    efficiency: customMetrics?.efficiency ?? (recentScores[0] ? Math.min(100, Math.max(30, Math.round(recentScores[0] * 1.2))) : 60),
    consistency: customMetrics?.consistency ?? baseConsistency,
    aggression: customMetrics?.aggression ?? Math.min(90, 55 + (timesPlayed % 30)),
  };
}
