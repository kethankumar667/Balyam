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
      { modeId: "1_over", displayName: "1 Over Blitz", description: "6-ball rapid showdown", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "2_overs", displayName: "2 Overs Classic", description: "Standard match", scoringDirection: "HIGHER_IS_BETTER", unit: "runs", isDefault: true },
      { modeId: "5_overs", displayName: "5 Overs Championship", description: "Strategic 30-ball duel", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
      { modeId: "target_chase", displayName: "Target Chase", description: "High-pressure run chase", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
    ],
  },
  snake: {
    game: "snake",
    displayName: "Snake 2D",
    category: "retro_arcade",
    defaultModeId: "classic_walled",
    modes: [
      { modeId: "classic_walled", displayName: "Classic Walled", description: "Nokia 3310 walled grid", scoringDirection: "HIGHER_IS_BETTER", unit: "apples", isDefault: true },
      { modeId: "borderless_wrap", displayName: "Borderless Wrap", description: "Edges wrap seamlessly", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
      { modeId: "speed_rush", displayName: "Speed Rush", description: "Progressive speed throttle", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
    ],
  },
  nokiasnake: {
    game: "nokiasnake",
    displayName: "Nokia Snake",
    category: "retro_arcade",
    defaultModeId: "classic_walled",
    modes: [
      { modeId: "classic_walled", displayName: "Classic Walled", description: "Pixelated nostalgia run", scoringDirection: "HIGHER_IS_BETTER", unit: "apples", isDefault: true },
      { modeId: "speed_rush", displayName: "Speed Rush", description: "High-speed arcade mode", scoringDirection: "HIGHER_IS_BETTER", unit: "apples" },
    ],
  },
  "2048": {
    game: "2048",
    displayName: "2048 Classic",
    category: "retro_arcade",
    defaultModeId: "grid_4x4",
    modes: [
      { modeId: "grid_4x4", displayName: "Classic 4x4", description: "Original numerical puzzle", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "grid_5x5", displayName: "Expanded 5x5", description: "Larger grid for giant merges", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  nokiacricket: {
    game: "nokiacricket",
    displayName: "Nokia Cricket",
    category: "retro_arcade",
    defaultModeId: "2_overs",
    modes: [
      { modeId: "2_overs", displayName: "2 Overs Blitz", description: "12 balls against AI bowler", scoringDirection: "HIGHER_IS_BETTER", unit: "runs", isDefault: true },
      { modeId: "5_overs", displayName: "5 Overs Cup", description: "Full inning challenge", scoringDirection: "HIGHER_IS_BETTER", unit: "runs" },
    ],
  },
  wordbuilding: {
    game: "wordbuilding",
    displayName: "Word Building",
    category: "social",
    defaultModeId: "timed_sprint",
    modes: [
      { modeId: "timed_sprint", displayName: "Timed Sprint", description: "30s rapid anagram builder", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "turn_based", displayName: "Turn-Based Classic", description: "Relaxed vocabulary duel", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  dotsboxes: {
    game: "dotsboxes",
    displayName: "Dots & Boxes",
    category: "board",
    defaultModeId: "grid_4x4",
    modes: [
      { modeId: "grid_3x3", displayName: "Compact 3x3", description: "Quick tactical skirmish", scoringDirection: "HIGHER_IS_BETTER", unit: "boxes" },
      { modeId: "grid_4x4", displayName: "Classic 4x4", description: "Balanced territory capture", scoringDirection: "HIGHER_IS_BETTER", unit: "boxes", isDefault: true },
      { modeId: "grid_5x5", displayName: "Master 5x5", description: "Deep chaining grid", scoringDirection: "HIGHER_IS_BETTER", unit: "boxes" },
    ],
  },
  ludo: {
    game: "ludo",
    displayName: "Ludo",
    category: "board",
    defaultModeId: "classic_4token",
    modes: [
      { modeId: "classic_4token", displayName: "Classic 4-Token", description: "All 4 tokens home", scoringDirection: "LOWER_IS_BETTER", unit: "turns to win", isDefault: true },
      { modeId: "quick_2token", displayName: "Quick 2-Token", description: "First 2 tokens home wins", scoringDirection: "LOWER_IS_BETTER", unit: "turns to win" },
    ],
  },
  snl: {
    game: "snl",
    displayName: "Snakes & Ladders",
    category: "board",
    defaultModeId: "classic_100",
    modes: [
      { modeId: "classic_100", displayName: "Classic 100", description: "Fewest rolls to reach 100", scoringDirection: "LOWER_IS_BETTER", unit: "rolls to finish", isDefault: true },
    ],
  },
  rummy: {
    game: "rummy",
    displayName: "Indian Rummy",
    category: "card",
    defaultModeId: "points_rummy",
    modes: [
      { modeId: "points_rummy", displayName: "Points Rummy", description: "Lowest penalty points per deal", scoringDirection: "LOWER_IS_BETTER", unit: "penalty pts", isDefault: true },
      { modeId: "pool_101", displayName: "101 Pool", description: "Survive under 101 points", scoringDirection: "LOWER_IS_BETTER", unit: "penalty pts" },
      { modeId: "pool_201", displayName: "201 Pool", description: "Deep elimination pool", scoringDirection: "LOWER_IS_BETTER", unit: "penalty pts" },
    ],
  },
  uno: {
    game: "uno",
    displayName: "UNO Showdown",
    category: "card",
    defaultModeId: "classic",
    modes: [
      { modeId: "classic", displayName: "Classic UNO", description: "Fewest rounds / card points", scoringDirection: "LOWER_IS_BETTER", unit: "card pts", isDefault: true },
      { modeId: "draw_to_match", displayName: "Draw-to-Match", description: "Draw until a playable card lands", scoringDirection: "LOWER_IS_BETTER", unit: "card pts" },
    ],
  },
  carrom: {
    game: "carrom",
    displayName: "Carrom Lounge",
    category: "board",
    defaultModeId: "points_carrom",
    modes: [
      { modeId: "points_carrom", displayName: "Points Carrom", description: "29-point race to victory", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
      { modeId: "board_clear", displayName: "Board Clear", description: "Fastest full board pocket", scoringDirection: "HIGHER_IS_BETTER", unit: "pts" },
    ],
  },
  chess: {
    game: "chess",
    displayName: "Grandmaster Chess",
    category: "board",
    defaultModeId: "blitz_3m",
    modes: [
      { modeId: "bullet_1m", displayName: "Bullet 1m", description: "Lightning 60-second time control", scoringDirection: "LOWER_IS_BETTER", unit: "moves to mate" },
      { modeId: "blitz_3m", displayName: "Blitz 3m", description: "Fast competitive duel", scoringDirection: "LOWER_IS_BETTER", unit: "moves to mate", isDefault: true },
      { modeId: "rapid_10m", displayName: "Rapid 10m", description: "Tactical positional play", scoringDirection: "LOWER_IS_BETTER", unit: "moves to mate" },
    ],
  },
  spacewar: {
    game: "spacewar",
    displayName: "Space War",
    category: "retro_arcade",
    defaultModeId: "arcade_survival",
    modes: [
      { modeId: "arcade_survival", displayName: "Arcade Survival", description: "Waves cleared & alien score", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
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
  rps: {
    game: "rps",
    displayName: "Rock Paper Scissors",
    category: "social",
    defaultModeId: "best_of_3",
    modes: [
      { modeId: "best_of_3", displayName: "Best of 3", description: "Classic first to 2 wins", scoringDirection: "HIGHER_IS_BETTER", unit: "rounds won", isDefault: true },
      { modeId: "best_of_5", displayName: "Best of 5", description: "Extended psychological battle", scoringDirection: "HIGHER_IS_BETTER", unit: "rounds won" },
    ],
  },
  stargame: {
    game: "stargame",
    displayName: "Star Game",
    category: "board",
    defaultModeId: "classic",
    modes: [
      { modeId: "classic", displayName: "Classic Constellation", description: "Capture the golden stars", scoringDirection: "HIGHER_IS_BETTER", unit: "stars", isDefault: true },
    ],
  },
  bingo: {
    game: "bingo",
    displayName: "Bingo / Tambola",
    category: "social",
    defaultModeId: "standard_5x5",
    modes: [
      { modeId: "standard_5x5", displayName: "Standard 5x5", description: "Fewest calls to complete BINGO", scoringDirection: "LOWER_IS_BETTER", unit: "calls to win", isDefault: true },
    ],
  },
  namesplaceanimal: {
    game: "namesplaceanimal",
    displayName: "Name Place Animal Thing",
    category: "social",
    defaultModeId: "standard_rounds",
    modes: [
      { modeId: "standard_rounds", displayName: "Standard 5 Rounds", description: "Highest aggregate vocabulary points", scoringDirection: "HIGHER_IS_BETTER", unit: "pts", isDefault: true },
    ],
  },
  roadrash: {
    game: "roadrash",
    displayName: "Road Rash 2D",
    category: "retro_arcade",
    defaultModeId: "circuit_rush",
    modes: [
      { modeId: "circuit_rush", displayName: "Circuit Rush", description: "Distance and takedown score", scoringDirection: "HIGHER_IS_BETTER", unit: "distance (m)", isDefault: true },
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

  // Hand Cricket: overs check
  if (game === "handcricket" && typeof options.overs === "number") {
    if (options.overs === 1) return "1_over";
    if (options.overs === 5) return "5_overs";
    return "2_overs";
  }

  // Dots & Boxes: gridSize check
  if (game === "dotsboxes" && typeof options.gridSize === "number") {
    if (options.gridSize === 3) return "grid_3x3";
    if (options.gridSize === 5) return "grid_5x5";
    return "grid_4x4";
  }

  // Ludo: tokenCount check
  if (game === "ludo" && typeof options.tokenCount === "number" && options.tokenCount === 2) {
    return "quick_2token";
  }

  // Snake: mode check
  if ((game === "snake" || game === "nokiasnake") && typeof options.mode === "string") {
    if (options.mode === "borderless") return "borderless_wrap";
    if (options.mode === "speed") return "speed_rush";
    return "classic_walled";
  }

  // 2048: gridSize check
  if (game === "2048" && typeof options.gridSize === "number" && options.gridSize === 5) {
    return "grid_5x5";
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
