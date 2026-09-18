import type { AllGameSlug, ScoringDirection, FoilTier, QuantumPerformanceRadar } from "./Scorecard.js";

export interface ModeDefinition {
  modeId: string;
  displayName: string;
  description: string;
  scoringDirection: ScoringDirection;
  unit: string;
  isDefault?: boolean;
}

export interface GameModeConfig {
  game: AllGameSlug;
  displayName: string;
  category: "board" | "card" | "social" | "retro_arcade";
  defaultModeId: string;
  modes: ModeDefinition[];
}

export const GAME_MODE_REGISTRY: Record<string, GameModeConfig> = {
  handcricket: {
    game: "handcricket",
    displayName: "Hand Cricket",
    category: "social",
    defaultModeId: "2_overs",
    modes: [
      { modeId: "2_overs", displayName: "2 Overs Classic", description: "Standard match, 12 balls per innings", scoringDirection: "HIGHER_IS_BETTER", unit: "runs", isDefault: true },
      { modeId: "1_over", displayName: "1 Over Blitz", description: "Rapid 6-ball street showdown", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "5_overs", displayName: "5 Overs Championship", description: "Strategic 30-ball duel with bowler quotas", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "t20", displayName: "T20 Match (10 Overs)", description: "10 overs per innings with powerplay swings", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "odi", displayName: "ODI Match (15 Overs)", description: "15 overs strategic duel with bowler limits", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "galli", displayName: "Galli Cricket", description: "Street cricket with custom overs and free play", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
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
    modes: [
      { modeId: "classic_walled", displayName: "Classic Walled", description: "Solid border boundaries — boundary collision kills", scoringDirection: "HIGHER_IS_BETTER", unit: "apples", isDefault: true },
      { modeId: "borderless_wrap", displayName: "Borderless Wrap", description: "Edges wrap seamlessly through screen boundaries", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
      { modeId: "speed_rush", displayName: "Speed Rush (70ms)", description: "Fast-pace reflex survival at max speed", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
    ],
  },
  nokiasnake: {
    game: "nokiasnake",
    displayName: "Nokia Snake",
    category: "retro_arcade",
    defaultModeId: "classic_walled",
    modes: [
      { modeId: "classic_walled", displayName: "Classic 3310 Walled", description: "Pixelated nostalgia run with LCD dot matrix", scoringDirection: "HIGHER_IS_BETTER", unit: "apples", isDefault: true },
      { modeId: "speed_rush", displayName: "Arcade Rush", description: "High-speed reflex challenge", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
    ],
  },
  ludo: {
    game: "ludo",
    displayName: "Ludo",
    category: "board",
    defaultModeId: "classic_4token",
    modes: [
      { modeId: "classic_4token", displayName: "Classic 4-Token", description: "All 4 tokens navigated home to center", scoringDirection: "LOWER_IS_BETTER", unit: "turns to win", isDefault: true },
      { modeId: "quick_2token", displayName: "Quick 2-Token", description: "Fast-paced sprint: first 2 tokens home wins", scoringDirection: "LOWER_IS_BETTER", unit: "turns to win" },
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
      { modeId: "points_rummy", displayName: "Points Classic", description: "Lowest penalty points per deal", scoringDirection: "LOWER_IS_BETTER", unit: "penalty pts" },
    ],
  },
  uno: {
    game: "uno",
    displayName: "UNO Showdown",
    category: "card",
    defaultModeId: "single",
    modes: [
      { modeId: "single", displayName: "Single Round", description: "One deal — first to empty hand wins", scoringDirection: "LOWER_IS_BETTER", unit: "card pts", isDefault: true },
      { modeId: "race_300", displayName: "Race to 300", description: "Quick multi-round match to 300 points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
      { modeId: "race_500", displayName: "Official Race to 500", description: "Mattel championship rules: first to 500 cumulative points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
      { modeId: "race_1000", displayName: "Marathon 1000", description: "Extended high-drama session to 1000 points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
      { modeId: "classic", displayName: "Classic Uno", description: "Fewest rounds and lowest card penalty points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
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
      { modeId: "classic_100", displayName: "Standard 100", description: "Fewest dice rolls to reach square 100", scoringDirection: "LOWER_IS_BETTER", unit: "rolls to 100" },
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
      { modeId: "grid_4x4", displayName: "Classic 4×4", description: "Standard square territory capture", scoringDirection: "HIGHER_IS_BETTER", unit: "boxes" },
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
      { modeId: "tournament_10x10", displayName: "Tournament Scrabble", description: "Full 275k lexicon with rare tournament words", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "timed_sprint", displayName: "Timed Sprint", description: "30s rapid anagram word builder", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  carrom: {
    game: "carrom",
    displayName: "Carrom Lounge",
    category: "board",
    defaultModeId: "classic",
    modes: [
      { modeId: "classic", displayName: "Classic Carrom", description: "Traditional rules with red Queen & mandatory cover", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "discpool", displayName: "Disc Pool", description: "Miniclip speed mode — pocket all color pucks", scoringDirection: "LOWER_IS_BETTER", unit: "shots to clear" },
      { modeId: "freestyle", displayName: "Freestyle Points", description: "Race to target score (Queen 25, White 10, Black 5)", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "points_carrom", displayName: "Points Carrom (29)", description: "29-point race to victory", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  nokiacricket: {
    game: "nokiacricket",
    displayName: "Nokia Cricket",
    category: "retro_arcade",
    defaultModeId: "2_overs",
    modes: [
      { modeId: "2_overs", displayName: "2 Overs Blitz", description: "12 balls against AI bowler", scoringDirection: "HIGHER_IS_BETTER", unit: "runs", isDefault: true },
      { modeId: "5_overs", displayName: "5 Overs Cup", description: "Full innings challenge", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
    ],
  },
  rps: {
    game: "rps",
    displayName: "Rock Paper Scissors",
    category: "social",
    defaultModeId: "best_of_3",
    modes: [
      { modeId: "best_of_3", displayName: "Best of 3", description: "Classic first to 2 round wins", scoringDirection: "HIGHER_IS_BETTER", unit: "rounds won", isDefault: true },
      { modeId: "best_of_5", displayName: "Best of 5", description: "Extended series — first to 3 wins", scoringDirection: "HIGHER_IS_BETTER", unit: "rounds won" },
      { modeId: "sudden_death", displayName: "Sudden Death", description: "Single round high-stakes duel", scoringDirection: "HIGHER_IS_BETTER", unit: "wins" },
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
      { modeId: "marathon_10", displayName: "Marathon (10 Rounds)", description: "10-round endurance star challenge", scoringDirection: "HIGHER_IS_BETTER", unit: "stars" },
      { modeId: "classic", displayName: "Constellation", description: "Capture golden stars", scoringDirection: "HIGHER_IS_BETTER", unit: "stars" },
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
      { modeId: "standard_5x5", displayName: "Standard 5×5", description: "Fewest calls to complete BINGO", scoringDirection: "LOWER_IS_BETTER", unit: "calls to win" },
    ],
  },
  namesplaceanimal: {
    game: "namesplaceanimal",
    displayName: "Name Place Animal Thing",
    category: "social",
    defaultModeId: "medium_5rds",
    modes: [
      { modeId: "medium_5rds", displayName: "Classic 5 Rounds (30s)", description: "Standard 30-second timer across 5 rounds", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "hard_speed", displayName: "Speed Rush 5 Rounds (20s)", description: "20-second rapid vocabulary pressure", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "marathon_10rds", displayName: "Marathon 10 Rounds", description: "Extended 10-round vocabulary championship", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "standard_rounds", displayName: "Standard Rounds", description: "Highest aggregate vocabulary points", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
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
  tetris: {
    game: "tetris",
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
      { modeId: "classic", displayName: "Classic Wall", description: "Paddle & ball brick clearing", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "moving_wall", displayName: "Moving Wall", description: "Bricks move. So must you.", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "time_attack", displayName: "Time Attack", description: "Clear as many as you can in 2 minutes.", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
      { modeId: "endless", displayName: "Endless", description: "Keep going. No limits.", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  sudoku: {
    game: "sudoku",
    displayName: "Sudoku Cyber-Matrix",
    category: "retro_arcade",
    defaultModeId: "medium",
    modes: [
      { modeId: "easy", displayName: "Initiate (Easy)", description: "Casual relaxing solve with generous clues", scoringDirection: "LOWER_IS_BETTER", unit: "s", isDefault: false },
      { modeId: "medium", displayName: "Data Runner (Medium)", description: "Balanced logical deduction challenge", scoringDirection: "LOWER_IS_BETTER", unit: "s", isDefault: true },
      { modeId: "hard", displayName: "Cyber Architect (Hard)", description: "Advanced patterns, hidden pairs & triples", scoringDirection: "LOWER_IS_BETTER", unit: "s" },
      { modeId: "expert", displayName: "Quantum Singularity (Expert)", description: "Extreme complexity for sudoku masters", scoringDirection: "LOWER_IS_BETTER", unit: "s" },
    ],
  },
};

/**
 * Returns the game config or a safe default for unlisted games.
 */
export function getGameModeConfig(game: string): GameModeConfig {
  const cfg = GAME_MODE_REGISTRY[game];
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

/**
 * Resolves the active modeId from game options or fallback.
 */
export function resolveModeId(game: string, options?: Record<string, unknown>): string {
  const cfg = getGameModeConfig(game);
  if (!options) return cfg.defaultModeId;

  // Hand Cricket
  if (game === "handcricket") {
    if (options.mode === "galli") {
      if (options.galliOvers === 1 || options.overs === 1) return "1_over";
      return "galli";
    }
    if (options.format === "t20") return "t20";
    if (options.format === "odi") return "odi";
    if (options.format === "test") return "5_overs";
    if (typeof options.overs === "number") {
      if (options.overs === 1) return "1_over";
      if (options.overs === 5) return "5_overs";
      if (options.overs === 10) return "t20";
      if (options.overs === 15) return "odi";
      return "2_overs";
    }
    return cfg.defaultModeId;
  }

  // SNL
  if (game === "snl" && typeof options.difficulty === "string") {
    if (["easy", "medium", "hard", "extreme"].includes(options.difficulty)) {
      return options.difficulty;
    }
  }

  // Rummy
  if (game === "rummy" && typeof options.rummyMode === "string") {
    if (["single", "pool101", "pool201"].includes(options.rummyMode)) {
      return options.rummyMode;
    }
  }

  // UNO
  if (game === "uno" && typeof options.matchLength === "string") {
    if (options.matchLength === "300") return "race_300";
    if (options.matchLength === "500") return "race_500";
    if (options.matchLength === "1000") return "race_1000";
    return "single";
  }

  // Dots & Boxes
  if (game === "dotsboxes") {
    const size = typeof options.boardSize === "number" ? options.boardSize : typeof options.gridSize === "number" ? options.gridSize : null;
    if (size === 5) return "grid_5x5";
    if (size === 9) return "grid_9x9";
    if (size === 7) return "grid_7x7";
    if (size === 4) return "grid_4x4";
    return "grid_7x7";
  }

  // Ludo
  if (game === "ludo" && typeof options.tokenCount === "number" && options.tokenCount === 2) {
    return "quick_2token";
  }

  // Word Building
  if (game === "wordbuilding") {
    if (options.dictMode === "tournament") return "tournament_10x10";
    if (options.boardSize === 8) return "classroom_8x8";
    if (options.mode === "timed_sprint") return "timed_sprint";
    return "classroom_10x10";
  }

  // Snake
  if (game === "snake" || game === "nokiasnake") {
    if (options.wallMode === "wrap" || options.mode === "borderless") return "borderless_wrap";
    if (options.speed === "70" || options.mode === "speed") return "speed_rush";
    return "classic_walled";
  }

  // 2048
  if (game === "2048") {
    if (typeof options.mode === "string") {
      if (options.mode === "daily") return "daily";
      if (options.mode === "battle") return "battle";
      if (options.mode === "race") return "race";
      if (options.mode === "timeattack" || options.mode === "time_attack") return "timeattack";
      if (options.mode === "zen") return "zen";
    }
    return "daily";
  }

  // Carrom
  if (game === "carrom" && typeof options.carromMode === "string") {
    if (["classic", "discpool", "freestyle"].includes(options.carromMode)) {
      return options.carromMode;
    }
  }

  return cfg.defaultModeId;
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
