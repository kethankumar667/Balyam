import type {
  AllGameSlug,
  ScoringDirection,
  QuantumPerformanceRadar,
  ModeScorecard,
} from "./Scorecard.js";

export type MetricDisplayFormat =
  | "raw_number"
  | "runs"
  | "turns"
  | "duration_seconds"
  | "percentage"
  | "penalty_pts"
  | "apples"
  | "tiles"
  | "discs"
  | "lines"
  | "boxes"
  | "coins";

export interface GameMetricField {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  format: MetricDisplayFormat;
  direction: ScoringDirection;
  importance: "PRIMARY" | "SECONDARY" | "HIGHLIGHT";
  icon: string; // Identifier for Lucide icons or emoji
}

export interface GameMetricSchema {
  game: AllGameSlug;
  primaryRankMetric: GameMetricField;
  secondaryMetrics: GameMetricField[];
  highlightBadgeMetrics?: GameMetricField[];
}

export const GAME_METRIC_SCHEMAS: Record<string, GameMetricSchema> = {
  handcricket: {
    game: "handcricket",
    primaryRankMetric: {
      key: "bestScore",
      label: "Highest Innings Runs",
      shortLabel: "Runs",
      description: "Highest runs scored in a single match innings",
      format: "runs",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "strikeRate",
        label: "Career Strike Rate",
        shortLabel: "Strike Rate",
        description: "Runs per 100 balls delivered",
        format: "percentage",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
      {
        key: "fours",
        label: "Total Boundaries (4s)",
        shortLabel: "Fours",
        description: "Total 4-run shots played",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
      {
        key: "sixes",
        label: "Total Maximums (6s)",
        shortLabel: "Sixes",
        description: "Total 6-run shots hit over the ropes",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "balls",
        label: "Balls Faced",
        shortLabel: "Balls",
        description: "Total deliveries faced at crease",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Clock",
      },
    ],
  },
  ludo: {
    game: "ludo",
    primaryRankMetric: {
      key: "bestScore",
      label: "Fewest Turns to Win",
      shortLabel: "Min Turns",
      description: "Lowest number of dice turns needed to navigate all tokens home",
      format: "turns",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Zap",
    },
    secondaryMetrics: [
      {
        key: "tokensCaptured",
        label: "Tokens Captured",
        shortLabel: "Captures",
        description: "Total opponent tokens sent back to their home yard",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Target",
      },
      {
        key: "safeOccupancyRate",
        label: "Safe Cell Control",
        shortLabel: "Safe Zone %",
        description: "Percentage of turns spent on star / safe squares",
        format: "percentage",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
      {
        key: "sixesRolled",
        label: "Sixes Rolled",
        shortLabel: "Lucky 6s",
        description: "Total number of 6s rolled on the dice",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "tokensLost",
        label: "Tokens Lost",
        shortLabel: "Captured",
        description: "Tokens sent back by opponents",
        format: "raw_number",
        direction: "LOWER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
    ],
  },
  rummy: {
    game: "rummy",
    primaryRankMetric: {
      key: "bestScore",
      label: "Lowest Penalty Points",
      shortLabel: "Penalty Pts",
      description: "Fewest penalty points conceded across valid deals (0 = Pure Show)",
      format: "penalty_pts",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Award",
    },
    secondaryMetrics: [
      {
        key: "pureShowRate",
        label: "Pure Show Rate",
        shortLabel: "Pure Show %",
        description: "Percentage of winning deals closed with valid pure sequences",
        format: "percentage",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "dealsWon",
        label: "Deals Won",
        shortLabel: "Deals Won",
        description: "Total deals successfully declared and validated",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Trophy",
      },
      {
        key: "firstDropDiscipline",
        label: "First Drop Saves",
        shortLabel: "Drops",
        description: "Tactical first drops to minimize penalty points",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
    ],
  },
  uno: {
    game: "uno",
    primaryRankMetric: {
      key: "bestScore",
      label: "Lowest Hand Points",
      shortLabel: "Hand Pts",
      description: "Fewest card penalty points left in hand upon round conclusion",
      format: "penalty_pts",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Award",
    },
    secondaryMetrics: [
      {
        key: "wildCardsPlayed",
        label: "Wild & Action Cards Played",
        shortLabel: "Wild Plays",
        description: "Tactical Wild and Wild Draw Four cards deployed",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
      {
        key: "drawFoursDeflected",
        label: "Draw Fours Deflected",
        shortLabel: "Deflections",
        description: "Opponent draw attacks stacked or neutralized",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
      {
        key: "roundsWon",
        label: "Rounds Won",
        shortLabel: "Rounds Won",
        description: "Total rounds where hand reached zero cards first",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Trophy",
      },
    ],
  },
  "2048": {
    game: "2048",
    primaryRankMetric: {
      key: "bestScore",
      label: "Peak Singularity Score",
      shortLabel: "Score",
      description: "Highest cumulative merge score achieved on the board",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "peakTile",
        label: "Highest Tile Achieved",
        shortLabel: "Max Tile",
        description: "Largest numerical tile forged (e.g. 2048, 4096)",
        format: "tiles",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "totalMerges",
        label: "Total Merges",
        shortLabel: "Merges",
        description: "Total tile collision merges executed",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
      {
        key: "movesCount",
        label: "Total Swipes",
        shortLabel: "Swipes",
        description: "Number of board swipe movements",
        format: "turns",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Clock",
      },
    ],
  },
  sudoku: {
    game: "sudoku",
    primaryRankMetric: {
      key: "bestScore",
      label: "Fastest Clear Time",
      shortLabel: "Clear Time",
      description: "Fastest completion time for a fully solved matrix",
      format: "duration_seconds",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Clock",
    },
    secondaryMetrics: [
      {
        key: "mistakesCount",
        label: "Mistakes / Errors",
        shortLabel: "Mistakes",
        description: "Incorrect digit placements before solving",
        format: "raw_number",
        direction: "LOWER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
      {
        key: "hintsUsed",
        label: "Hints Utilized",
        shortLabel: "Hints",
        description: "Assistance hints requested during the solve",
        format: "raw_number",
        direction: "LOWER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
      {
        key: "perfectSolves",
        label: "Flawless Solves (0 Errors)",
        shortLabel: "Flawless",
        description: "Puzzles solved without a single mistake",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
    ],
  },
  snl: {
    game: "snl",
    primaryRankMetric: {
      key: "bestScore",
      label: "Fewest Rolls to 100",
      shortLabel: "Min Rolls",
      description: "Lowest number of dice rolls taken to reach tile 100",
      format: "turns",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Zap",
    },
    secondaryMetrics: [
      {
        key: "laddersClimbed",
        label: "Ladders Climbed",
        shortLabel: "Ladders",
        description: "Total ladders mounted for rapid elevation",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "snakeBitesEvaded",
        label: "Snake Bites Evaded",
        shortLabel: "Bites Evaded",
        description: "Turns where snake head tiles were safely bypassed",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
      {
        key: "snakeBitesTaken",
        label: "Snake Bites Taken",
        shortLabel: "Bitten",
        description: "Total times swallowed by snakes",
        format: "raw_number",
        direction: "LOWER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
    ],
  },
  dotsboxes: {
    game: "dotsboxes",
    primaryRankMetric: {
      key: "bestScore",
      label: "Most Boxes Captured",
      shortLabel: "Boxes",
      description: "Highest number of completed boxes claimed in a match",
      format: "boxes",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "territoryPercentage",
        label: "Territory Dominance",
        shortLabel: "Territory %",
        description: "Percentage of the total grid squares owned",
        format: "percentage",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
      {
        key: "longestChain",
        label: "Longest Chain Run",
        shortLabel: "Max Chain",
        description: "Most boxes captured consecutively in a single turn chain",
        format: "boxes",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "doubleCrosses",
        label: "Double-Cross Traps",
        shortLabel: "Traps",
        description: "Strategic box sacrifices to regain long-chain initiative",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
    ],
  },
  connect4: {
    game: "connect4",
    primaryRankMetric: {
      key: "bestScore",
      label: "Fewest Discs to Connect Four",
      shortLabel: "Min Discs",
      description: "Fewest of your own discs needed to complete a winning line of four",
      format: "discs",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Zap",
    },
    secondaryMetrics: [
      {
        key: "centerControlRate",
        label: "Center Column Control",
        shortLabel: "Center %",
        description: "Percentage of central column slots occupied",
        format: "percentage",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
      {
        key: "threatsBlocked",
        label: "Opponent Threats Blocked",
        shortLabel: "Blocks",
        description: "Critical 3-in-a-row setups intercepted and stopped",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Target",
      },
      {
        key: "diagonalWins",
        label: "Diagonal Wins",
        shortLabel: "Diagonals",
        description: "Victories forged through hard-to-spot diagonal lines",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
    ],
  },
  tictactoe: {
    game: "tictactoe",
    primaryRankMetric: {
      key: "bestScore",
      label: "Quickest Three-In-A-Row",
      shortLabel: "Min Moves",
      description: "Fewest moves taken to form an unbroken winning line",
      format: "turns",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Zap",
    },
    secondaryMetrics: [
      {
        key: "centerClaimed",
        label: "Center Cell Control",
        shortLabel: "Center Claim",
        description: "First-turn claims on the high-leverage central cell",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Target",
      },
      {
        key: "quantumWins",
        label: "Quantum Flux Wins",
        shortLabel: "Quantum Wins",
        description: "Victories under vanishing-mark mechanics",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "drawCount",
        label: "Tough Stalewards / Draws",
        shortLabel: "Draws",
        description: "High-defense games played to an unyielding draw",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "ShieldCheck",
      },
    ],
  },
  nokiasnake: {
    game: "nokiasnake",
    primaryRankMetric: {
      key: "bestScore",
      label: "Most Apples Eaten",
      shortLabel: "Apples",
      description: "Highest count of dot-matrix apples consumed in a single retro run",
      format: "apples",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "snakeLength",
        label: "Peak Snake Length",
        shortLabel: "Max Length",
        description: "Maximum body segment length achieved",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "survivalSeconds",
        label: "Survival Duration",
        shortLabel: "Survival",
        description: "Time elapsed before wall or self-collision",
        format: "duration_seconds",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Clock",
      },
    ],
  },
  snake: {
    game: "snake",
    primaryRankMetric: {
      key: "bestScore",
      label: "Most Apples Eaten",
      shortLabel: "Apples",
      description: "Highest count of apples devoured in 2D arena",
      format: "apples",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "snakeLength",
        label: "Peak Length",
        shortLabel: "Length",
        description: "Maximum snake segments",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "speedRushRuns",
        label: "High Speed Runs",
        shortLabel: "Rush Runs",
        description: "Runs completed at max 70ms tick rate",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
    ],
  },
  brickblocks: {
    game: "brickblocks",
    primaryRankMetric: {
      key: "bestScore",
      label: "Highest Tetris Score",
      shortLabel: "Score",
      description: "Highest line clear and survival score",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "linesCleared",
        label: "Total Lines Cleared",
        shortLabel: "Lines",
        description: "Cumulative horizontal lines cleared",
        format: "lines",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "tetrisClears",
        label: "Tetris 4-Line Clears",
        shortLabel: "Tetris 4x",
        description: "Pure 4-line simultaneous clears",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
    ],
  },
  tetris: {
    game: "tetris",
    primaryRankMetric: {
      key: "bestScore",
      label: "Highest Tetris Score",
      shortLabel: "Score",
      description: "Highest line clear and survival score",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "linesCleared",
        label: "Total Lines Cleared",
        shortLabel: "Lines",
        description: "Cumulative horizontal lines cleared",
        format: "lines",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
    ],
  },
  breakout: {
    game: "breakout",
    primaryRankMetric: {
      key: "bestScore",
      label: "Highest Arcade Score",
      shortLabel: "Score",
      description: "Peak brick smashing score",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "bricksSmashed",
        label: "Bricks Smashed",
        shortLabel: "Bricks",
        description: "Total colored bricks destroyed",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
      {
        key: "highestCombo",
        label: "Highest Paddle Combo",
        shortLabel: "Combo",
        description: "Continuous brick hits without paddle recovery",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
    ],
  },
  carrom: {
    game: "carrom",
    primaryRankMetric: {
      key: "bestScore",
      label: "Most Coins Pocketed",
      shortLabel: "Coins",
      description: "Total carrom coins cleanly pocketed in match",
      format: "coins",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "queenCovered",
        label: "Queen & Cover Clears",
        shortLabel: "Queen Clears",
        description: "Red Queen pocketed with immediate cover coin",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "foulCount",
        label: "Striker Fouls",
        shortLabel: "Fouls",
        description: "Direct striker pocketings or penalty returns",
        format: "raw_number",
        direction: "LOWER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
    ],
  },
  wordbuilding: {
    game: "wordbuilding",
    primaryRankMetric: {
      key: "bestScore",
      label: "Highest Word Score",
      shortLabel: "Score",
      description: "Cumulative points scored for validated dictionary words",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "longestWordLength",
        label: "Longest Word Formed",
        shortLabel: "Longest Word",
        description: "Letter length of the largest word constructed",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
      {
        key: "wordsBuilt",
        label: "Total Words Built",
        shortLabel: "Words",
        description: "Valid dictionary words submitted",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
    ],
  },
  roadrash: {
    game: "roadrash",
    primaryRankMetric: {
      key: "bestScore",
      label: "Highway Distance Record",
      shortLabel: "Distance",
      description: "Distance traveled weaving through retro highway traffic",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "carsPassed",
        label: "Vehicles Overtaken",
        shortLabel: "Overtakes",
        description: "Traffic obstacles cleanly navigated without collision",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
    ],
  },
  nokiacricket: {
    game: "nokiacricket",
    primaryRankMetric: {
      key: "bestScore",
      label: "High Score Runs",
      shortLabel: "Runs",
      description: "Highest runs scored in retro Nokia cricket innings",
      format: "runs",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "fours",
        label: "Boundaries (4s)",
        shortLabel: "Fours",
        description: "Boundary drives hit past fielders",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
      {
        key: "sixes",
        label: "Sixes (6s)",
        shortLabel: "Sixes",
        description: "Massive lofted shots cleared over the boundary",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
    ],
  },
  rps: {
    game: "rps",
    primaryRankMetric: {
      key: "bestScore",
      label: "Rounds Won",
      shortLabel: "Rounds Won",
      description: "Most rounds claimed in Rock Paper Scissors duel",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "cleanSweeps",
        label: "Clean Sweeps",
        shortLabel: "Sweeps",
        description: "Matches won without conceding a single round",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
    ],
  },
  stargame: {
    game: "stargame",
    primaryRankMetric: {
      key: "bestScore",
      label: "Stars Gathered",
      shortLabel: "Stars",
      description: "Total celestial stars claimed on the board",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Crown",
    },
    secondaryMetrics: [
      {
        key: "matchesWon",
        label: "Star Matches Won",
        shortLabel: "Wins",
        description: "Total victories in Star Game showdowns",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Trophy",
      },
    ],
  },
  bingo: {
    game: "bingo",
    primaryRankMetric: {
      key: "bestScore",
      label: "Fewest Calls to Bingo",
      shortLabel: "Min Calls",
      description: "Fewest number calls needed to complete a winning 5-line Bingo",
      format: "turns",
      direction: "LOWER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Zap",
    },
    secondaryMetrics: [
      {
        key: "linesCompleted",
        label: "Lines Completed",
        shortLabel: "Lines",
        description: "Rows, columns, or diagonal lines completed",
        format: "lines",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
    ],
  },
  namesplaceanimal: {
    game: "namesplaceanimal",
    primaryRankMetric: {
      key: "bestScore",
      label: "Highest Round Score",
      shortLabel: "Score",
      description: "Peak points from valid letter vocabulary entries",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "allCategoriesFilled",
        label: "Full Board Submissions",
        shortLabel: "All Categories",
        description: "Rounds where all Name, Place, Animal, Thing were filled",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Crown",
      },
    ],
  },
  spacewar: {
    game: "spacewar",
    primaryRankMetric: {
      key: "bestScore",
      label: "Arcade Score",
      shortLabel: "Score",
      description: "Total destruction score defending deep space",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "shipsDestroyed",
        label: "Enemy Ships Destroyed",
        shortLabel: "Ships",
        description: "Alien warships intercepted and blasted",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Flame",
      },
    ],
  },
  blockblast: {
    game: "blockblast",
    primaryRankMetric: {
      key: "bestScore",
      label: "Block Blast High Score",
      shortLabel: "Score",
      description: "Highest puzzle score clearing rows and columns",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "combos",
        label: "Combo Explosions",
        shortLabel: "Combos",
        description: "Multi-line clear chain reactions",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Zap",
      },
    ],
  },
};

/**
 * Returns the schema definition for a given game, falling back to a safe default.
 */
export function getGameMetricSchema(game: AllGameSlug): GameMetricSchema {
  const schema = GAME_METRIC_SCHEMAS[game];
  if (schema) return schema;

  return {
    game,
    primaryRankMetric: {
      key: "bestScore",
      label: "High Score",
      shortLabel: "Score",
      description: "All-time personal record",
      format: "raw_number",
      direction: "HIGHER_IS_BETTER",
      importance: "PRIMARY",
      icon: "Trophy",
    },
    secondaryMetrics: [
      {
        key: "matchesPlayed",
        label: "Matches Played",
        shortLabel: "Matches",
        description: "Total games entered in this arena",
        format: "raw_number",
        direction: "HIGHER_IS_BETTER",
        importance: "SECONDARY",
        icon: "Clock",
      },
    ],
  };
}

/**
 * Shared metric display formatter across client & server.
 */
export function formatGameMetricDisplay(
  value: number | string | undefined | null,
  format: MetricDisplayFormat
): string {
  if (value === undefined || value === null) return "-";

  const numeric = typeof value === "number" ? value : Number(value);
  const isNum = !isNaN(numeric);

  switch (format) {
    case "runs":
      return isNum ? `${numeric} runs` : String(value);

    case "turns":
      return isNum ? `${numeric} turns` : String(value);

    case "penalty_pts":
      if (isNum && numeric === 0) return "0 pts (Pure Show)";
      return isNum ? `${numeric} pts` : `${value} pts`;

    case "apples":
      return isNum ? `${numeric} 🍎` : String(value);

    case "boxes":
      return isNum ? `${numeric} boxes` : String(value);

    case "tiles":
      return isNum ? `${numeric} tiles` : String(value);

    case "discs":
      return isNum ? `${numeric} discs` : String(value);

    case "lines":
      return isNum ? `${numeric} lines` : String(value);

    case "coins":
      return isNum ? `${numeric} coins` : String(value);

    case "duration_seconds": {
      if (!isNum) return String(value);
      const mins = Math.floor(numeric / 60);
      const secs = numeric % 60;
      if (mins === 0) return `${secs}s`;
      return `${mins}m ${secs}s`;
    }

    case "percentage":
      return isNum ? `${Math.round(numeric)}%` : `${value}%`;

    case "raw_number":
    default:
      return String(value);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Performance Ranking & Gamification Engine
 * ────────────────────────────────────────────────────────────────────────── */

export type PerformanceRankTier = "S_RANK" | "A_RANK" | "B_RANK" | "C_RANK";

export interface PerformanceRankInfo {
  tier: PerformanceRankTier;
  grade: "S" | "A" | "B" | "C";
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

/**
 * Calculates arcade performance tier (S/A/B/C) based on game-specific standards.
 */
export function calculatePerformanceRank(
  game: AllGameSlug,
  _modeId: string,
  score: number | undefined | null,
  direction: ScoringDirection
): PerformanceRankInfo {
  if (score === undefined || score === null) {
    return {
      tier: "C_RANK",
      grade: "C",
      label: "Unranked",
      badgeBg: "bg-slate-900",
      badgeText: "text-slate-400",
      badgeBorder: "border-slate-800",
      description: "Play matches to establish your official rank grade.",
    };
  }

  // Ludo Lounge (Lowest turns wins)
  if (game === "ludo") {
    if (score <= 20) {
      return {
        tier: "S_RANK",
        grade: "S",
        label: "Lounge Legend",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        description: "Elite sub-20 speedrun! Top 5% of lounge circuiteers.",
      };
    }
    if (score <= 28) {
      return {
        tier: "A_RANK",
        grade: "A",
        label: "Dice Tactician",
        badgeBg: "bg-cyan-500/20",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/40",
        description: "Swift navigation with strong board control.",
      };
    }
    if (score <= 38) {
      return {
        tier: "B_RANK",
        grade: "B",
        label: "Board Traveler",
        badgeBg: "bg-emerald-500/20",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        description: "Solid, dependable lap finish across four quadrants.",
      };
    }
    return {
      tier: "C_RANK",
      grade: "C",
      label: "Contender",
      badgeBg: "bg-slate-800",
      badgeText: "text-slate-300",
      badgeBorder: "border-slate-700",
      description: "Circuit completed. Shave turns to reach higher ranks.",
    };
  }

  // Classic Rummy (0 points is Pure Show, lower is better)
  if (game === "rummy") {
    if (score === 0) {
      return {
        tier: "S_RANK",
        grade: "S",
        label: "Pure Show Master",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        description: "Flawless zero-penalty declaration. Grandmaster echelon.",
      };
    }
    if (score <= 25) {
      return {
        tier: "A_RANK",
        grade: "A",
        label: "Card Tactician",
        badgeBg: "bg-cyan-500/20",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/40",
        description: "Extremely tight melds and disciplined drop management.",
      };
    }
    if (score <= 50) {
      return {
        tier: "B_RANK",
        grade: "B",
        label: "Meld Seeker",
        badgeBg: "bg-emerald-500/20",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        description: "Formed primary sequences under heavy defense.",
      };
    }
    return {
      tier: "C_RANK",
      grade: "C",
      label: "Deck Strategist",
      badgeBg: "bg-slate-800",
      badgeText: "text-slate-300",
      badgeBorder: "border-slate-700",
      description: "Hand recorded. Reduce deadwood to climb the ranks.",
    };
  }

  // Hand Cricket (Highest runs wins)
  if (game === "handcricket") {
    if (score >= 100) {
      return {
        tier: "S_RANK",
        grade: "S",
        label: "Century Legend",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        description: "Triple-digit stadium heroics! Dominant strike mastery.",
      };
    }
    if (score >= 50) {
      return {
        tier: "A_RANK",
        grade: "A",
        label: "Half-Century Hero",
        badgeBg: "bg-cyan-500/20",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/40",
        description: "Explosive batting knock with commanding boundaries.",
      };
    }
    if (score >= 25) {
      return {
        tier: "B_RANK",
        grade: "B",
        label: "Power Hitter",
        badgeBg: "bg-emerald-500/20",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        description: "Reliable run generator with sharp finger reflexes.",
      };
    }
    return {
      tier: "C_RANK",
      grade: "C",
      label: "Opening Striker",
      badgeBg: "bg-slate-800",
      badgeText: "text-slate-300",
      badgeBorder: "border-slate-700",
      description: "Innings logged. Time your calls to reach your first 50.",
    };
  }

  // Generic scoring fallback based on direction
  if (direction === "HIGHER_IS_BETTER") {
    if (score >= 80) {
      return {
        tier: "S_RANK",
        grade: "S",
        label: "Grandmaster Record",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        description: "Extraordinary personal record in this arena.",
      };
    }
    if (score >= 40) {
      return {
        tier: "A_RANK",
        grade: "A",
        label: "Master Run",
        badgeBg: "bg-cyan-500/20",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/40",
        description: "Impressive tally surpassing standard benchmarks.",
      };
    }
    if (score >= 15) {
      return {
        tier: "B_RANK",
        grade: "B",
        label: "Competitor",
        badgeBg: "bg-emerald-500/20",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        description: "Solid, proven competitive score.",
      };
    }
    return {
      tier: "C_RANK",
      grade: "C",
      label: "Contender",
      badgeBg: "bg-slate-800",
      badgeText: "text-slate-300",
      badgeBorder: "border-slate-700",
      description: "First scores recorded. Keep aiming higher!",
    };
  } else {
    // LOWER_IS_BETTER
    if (score <= 15) {
      return {
        tier: "S_RANK",
        grade: "S",
        label: "Flawless Minimalist",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        description: "Peak efficiency with razor precision.",
      };
    }
    if (score <= 30) {
      return {
        tier: "A_RANK",
        grade: "A",
        label: "Pacing Expert",
        badgeBg: "bg-cyan-500/20",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/40",
        description: "Tight turn/penalty economy throughout the match.",
      };
    }
    if (score <= 50) {
      return {
        tier: "B_RANK",
        grade: "B",
        label: "Competitor",
        badgeBg: "bg-emerald-500/20",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        description: "Solid control over score inflation.",
      };
    }
    return {
      tier: "C_RANK",
      grade: "C",
      label: "Contender",
      badgeBg: "bg-slate-800",
      badgeText: "text-slate-300",
      badgeBorder: "border-slate-700",
      description: "Completed challenge. Strive for lower turns/points.",
    };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Next Milestone / Target Engine ("Beat Your Past Self")
 * ────────────────────────────────────────────────────────────────────────── */

export interface NextMilestoneTarget {
  targetScore: number;
  title: string;
  progressPercent: number; // 0..100
  rewardXp: number;
  remainingText: string;
}

/**
 * Derives the next achievable benchmark quest from a player's current record.
 */
export function getNextMilestoneTarget(
  game: AllGameSlug,
  _modeId: string,
  bestScore: number | undefined | null,
  direction: ScoringDirection
): NextMilestoneTarget {
  const current = bestScore ?? 0;

  if (game === "handcricket") {
    if (current < 25) {
      return {
        targetScore: 25,
        title: "25-Run Breakthrough",
        progressPercent: Math.min(100, Math.round((current / 25) * 100)),
        rewardXp: 100,
        remainingText: `${25 - current} runs away`,
      };
    }
    if (current < 50) {
      return {
        targetScore: 50,
        title: "Half-Century Hero (50 Runs)",
        progressPercent: Math.min(100, Math.round((current / 50) * 100)),
        rewardXp: 250,
        remainingText: `${50 - current} runs away`,
      };
    }
    if (current < 100) {
      return {
        targetScore: 100,
        title: "Century Club (100 Runs)",
        progressPercent: Math.min(100, Math.round((current / 100) * 100)),
        rewardXp: 500,
        remainingText: `${100 - current} runs away`,
      };
    }
    const nextTarget = Math.ceil((current + 1) / 25) * 25;
    return {
      targetScore: nextTarget,
      title: `Power Innings (${nextTarget} Runs)`,
      progressPercent: Math.min(95, Math.round((current / nextTarget) * 100)),
      rewardXp: 750,
      remainingText: `${nextTarget - current} runs away`,
    };
  }

  if (game === "ludo") {
    if (current <= 0 || current > 35) {
      return {
        targetScore: 35,
        title: "Sub-35 Turns Club",
        progressPercent: current <= 0 ? 0 : Math.max(10, Math.round((35 / current) * 100)),
        rewardXp: 150,
        remainingText: current <= 0 ? "Complete first run" : `Shave ${current - 35} turns`,
      };
    }
    if (current > 25) {
      return {
        targetScore: 25,
        title: "Under 25 Turns Club",
        progressPercent: Math.max(20, Math.round((25 / current) * 100)),
        rewardXp: 300,
        remainingText: `Shave ${current - 25} turns`,
      };
    }
    if (current > 18) {
      return {
        targetScore: 18,
        title: "Sub-20 Speedrun Elite",
        progressPercent: Math.max(40, Math.round((18 / current) * 100)),
        rewardXp: 600,
        remainingText: `Shave ${current - 18} turns`,
      };
    }
    return {
      targetScore: Math.max(12, current - 2),
      title: "Pawn Circuit Pinnacle",
      progressPercent: 95,
      rewardXp: 1000,
      remainingText: "Flawless pace achieved",
    };
  }

  if (game === "rummy") {
    if (current > 25) {
      return {
        targetScore: 25,
        title: "Tight Melds (<25 Pts)",
        progressPercent: Math.max(20, Math.round(((80 - current) / 55) * 100)),
        rewardXp: 200,
        remainingText: `Drop ${current - 25} penalty points`,
      };
    }
    if (current > 0) {
      return {
        targetScore: 0,
        title: "Pure Show Climax (0 Pts)",
        progressPercent: Math.max(50, Math.round(((25 - current) / 25) * 100)),
        rewardXp: 600,
        remainingText: "Zero-point show required",
      };
    }
    return {
      targetScore: 0,
      title: "Mastery: Back-to-Back Shows",
      progressPercent: 100,
      rewardXp: 1000,
      remainingText: "Peak mastery achieved",
    };
  }

  // Fallbacks
  if (direction === "HIGHER_IS_BETTER") {
    const steps = [10, 25, 50, 100, 200, 500];
    const target = steps.find((s) => s > current) ?? (current + 50);
    return {
      targetScore: target,
      title: `Target: ${target} Score`,
      progressPercent: Math.min(100, Math.round((current / target) * 100)),
      rewardXp: 200,
      remainingText: `${target - current} points away`,
    };
  } else {
    const steps = [50, 30, 20, 10, 5];
    const target = steps.reverse().find((s) => s < current) ?? Math.max(1, current - 5);
    return {
      targetScore: target,
      title: `Sub-${target} Benchmark`,
      progressPercent: Math.max(20, Math.min(95, Math.round((target / (current || 1)) * 100))),
      rewardXp: 250,
      remainingText: `Shave ${current - target} points`,
    };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Player Archetype System (from 5-Axis Quantum Radar)
 * ────────────────────────────────────────────────────────────────────────── */

export interface PlayerArchetype {
  title: string;
  motto: string;
  dominantTrait: string;
}

/**
 * Derives a thematic gamer archetype title from their Quantum Performance Radar.
 */
export function derivePlayerArchetype(radar?: QuantumPerformanceRadar): PlayerArchetype {
  if (!radar) {
    return {
      title: "The Lounge Pioneer",
      motto: "Ready to forge your signature competitive style.",
      dominantTrait: "Adaptability",
    };
  }

  const { velocity = 0, clutch = 0, efficiency = 0, consistency = 0, aggression = 0 } = radar;
  const maxVal = Math.max(velocity, clutch, efficiency, consistency, aggression);

  if (maxVal === 0) {
    return {
      title: "The Lounge Pioneer",
      motto: "Ready to forge your signature competitive style.",
      dominantTrait: "Adaptability",
    };
  }

  if (aggression === maxVal) {
    return {
      title: "The Blitz Striker",
      motto: "Direct offense, bold calculated gambits, and unrelenting front-foot pressure.",
      dominantTrait: "Aggression",
    };
  }
  if (efficiency === maxVal) {
    return {
      title: "The Grand Tactician",
      motto: "Maximum output through precise resource conservation and turn economy.",
      dominantTrait: "Efficiency",
    };
  }
  if (clutch === maxVal) {
    return {
      title: "The Comeback King",
      motto: "Unshakeable nerves when the match is on the line and time is ticking.",
      dominantTrait: "Clutch",
    };
  }
  if (velocity === maxVal) {
    return {
      title: "The Speed Demon",
      motto: "Razor intuition and instant reaction times that leave rivals behind.",
      dominantTrait: "Pacing",
    };
  }
  return {
    title: "The Iron Sentinel",
    motto: "Impenetrable defense and steady execution that grinds down opponents.",
    dominantTrait: "Consistency",
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Signature Feat Accolades (Per-Game Mini Accolades)
 * ────────────────────────────────────────────────────────────────────────── */

export interface SignatureFeatBadge {
  id: string;
  name: string;
  description: string;
  icon: string; // Identifier for Lucide (Trophy, Flame, ShieldCheck, Zap, Award, Crown)
  isUnlocked: boolean;
}

/**
 * Returns 3 collectible game-specific signature feats for the card back dossier.
 */
export function getSignatureFeatsForGame(
  game: AllGameSlug,
  scorecard?: ModeScorecard
): SignatureFeatBadge[] {
  const timesPlayed = scorecard?.timesPlayed ?? 0;
  const bestScore = scorecard?.bestScore;
  const secondary = scorecard?.secondaryMetrics ?? {};

  if (game === "ludo") {
    const sixes = Number(secondary["sixesRolled"] ?? 0);
    const captures = Number(secondary["tokensCaptured"] ?? 0);

    return [
      {
        id: "ludo_dice_whisperer",
        name: "Dice Whisperer",
        description: "Rolled 3 or more sixes during match sessions.",
        icon: "Flame",
        isUnlocked: sixes >= 3 || (bestScore != null && bestScore <= 28),
      },
      {
        id: "ludo_board_cleanser",
        name: "Board Cleanser",
        description: "Captured 3+ opponent tokens across lounge matches.",
        icon: "Zap",
        isUnlocked: captures >= 3,
      },
      {
        id: "ludo_speed_circuit",
        name: "Speed Circuit",
        description: "Completed full board home run in under 26 turns.",
        icon: "Trophy",
        isUnlocked: bestScore != null && bestScore <= 26 && bestScore > 0,
      },
    ];
  }

  if (game === "rummy") {
    const isPure = Number(secondary["isPureShow"] ?? 0);

    return [
      {
        id: "rummy_pure_magician",
        name: "Pure Magician",
        description: "Achieved a flawless 0-point Pure Show declaration.",
        icon: "Award",
        isUnlocked: bestScore === 0 || isPure === 1,
      },
      {
        id: "rummy_iron_shield",
        name: "Shield of Iron",
        description: "Capped penalty deficit under 25 in competitive melds.",
        icon: "ShieldCheck",
        isUnlocked: bestScore != null && bestScore <= 25,
      },
      {
        id: "rummy_meld_veteran",
        name: "Meld Veteran",
        description: "Completed 3 or more ranked card lounge showdowns.",
        icon: "Trophy",
        isUnlocked: timesPlayed >= 3,
      },
    ];
  }

  if (game === "handcricket") {
    const fours = Number(secondary["fours"] ?? 0);
    const sixes = Number(secondary["sixes"] ?? 0);
    const boundaries = Number(secondary["boundaries"] ?? 0);

    return [
      {
        id: "hc_boundary_barrage",
        name: "Boundary Barrage",
        description: "Delivered 4 or more power boundaries in an innings.",
        icon: "Zap",
        isUnlocked: boundaries >= 4 || fours + sixes >= 4 || (bestScore != null && bestScore >= 40),
      },
      {
        id: "hc_half_century",
        name: "Half Century",
        description: "Powered through to score 50+ runs in a single innings.",
        icon: "Trophy",
        isUnlocked: bestScore != null && bestScore >= 50,
      },
      {
        id: "hc_century_legend",
        name: "Century Legend",
        description: "Monumental triple-digit innings of 100+ runs.",
        icon: "Crown",
        isUnlocked: bestScore != null && bestScore >= 100,
      },
    ];
  }

  // Universal Fallback Badges
  return [
    {
      id: "universal_first_blood",
      name: "Arena Initiate",
      description: "Recorded first official competitive score in this mode.",
      icon: "Award",
      isUnlocked: timesPlayed >= 1,
    },
    {
      id: "universal_veteran",
      name: "Seasoned Contender",
      description: "Completed 3 or more ranked showdowns in this arena.",
      icon: "Trophy",
      isUnlocked: timesPlayed >= 3,
    },
    {
      id: "universal_clutch_streak",
      name: "Personal Record Forge",
      description: "Established a standout personal best scorecard entry.",
      icon: "Flame",
      isUnlocked: bestScore != null && timesPlayed >= 1,
    },
  ];
}


