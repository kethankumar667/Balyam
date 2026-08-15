export type GameMode = "CLASSIC" | "PENTIX";

export type GameStatus =
  | "boot"
  | "menu"
  | "ready"
  | "playing"
  | "paused"
  | "line-clearing"
  | "level-up"
  | "game-over"
  | "instructions"
  | "high-scores";

export type CellValue = 0 | 1;
export type BoardMatrix = CellValue[][];
export type ReadonlyBoardMatrix = readonly (readonly CellValue[])[];

export interface Position {
  x: number;
  y: number;
}

export type ClassicPieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

export type PentixPieceType =
  | "F"
  | "I5"
  | "L5"
  | "P"
  | "N"
  | "T5"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z5";

export type PieceType = ClassicPieceType | PentixPieceType;

export type PieceMatrix = readonly (readonly CellValue[])[];

export interface ActivePiece {
  type: PieceType;
  rotation: number; // 0: 0deg, 1: 90deg, 2: 180deg, 3: 270deg
  position: Position;
  matrix: PieceMatrix;
}

export interface LineClearEvent {
  lines: number[];
  count: number;
  isBackToBack: boolean;
  combo: number;
  scoreGained: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  ghostPieceEnabled: boolean;
  hardDropEnabled: boolean;
  lockDelayMs: number;
  maxLockResets: number;
  dasMs: number; // Delayed Auto Shift
  arrMs: number; // Auto Repeat Rate
  garbageRowsEnabled: boolean;
}

export interface HighScoreEntry {
  score: number;
  lines: number;
  level: number;
  mode: GameMode;
  date: string;
}

export interface BrickTetrisSaveData {
  highScores: HighScoreEntry[];
  totalMatches: number;
  totalLinesCleared: number;
  bestClassicScore: number;
  bestPentixScore: number;
  achievements: string[];
}

export interface GameState {
  status: GameStatus;
  mode: GameMode;
  board: BoardMatrix;
  activePiece: ActivePiece | null;
  nextQueue: PieceType[];
  heldPiece: PieceType | null;
  canHold: boolean;
  score: number;
  highScore: number;
  linesCleared: number;
  level: number;
  combo: number;
  backToBack: boolean;
  gravityAccumulatorMs: number;
  lockDelayAccumulatorMs: number;
  lockResetsCount: number;
  clearingLines: number[];
  clearingProgress: number; // 0 to 1 for flash animation
  isSoftDropping: boolean;
  settings: GameSettings;
  rngSeed: number;
  bag: PieceType[];
  garbageAccumulatorMs: number;
  selectedMenuItem: number;
}

export type GameAction =
  | { type: "TICK"; payload: { deltaMs: number } }
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "SOFT_DROP_START" }
  | { type: "SOFT_DROP_END" }
  | { type: "HARD_DROP" }
  | { type: "ROTATE_CW" }
  | { type: "ROTATE_CCW" }
  | { type: "HOLD_PIECE" }
  | { type: "PAUSE_TOGGLE" }
  | { type: "START_GAME"; payload?: { mode?: GameMode } }
  | { type: "RESTART_GAME" }
  | { type: "NAVIGATE_MENU"; payload: { direction: "UP" | "DOWN" } }
  | { type: "SELECT_MENU_ITEM" }
  | { type: "OPEN_INSTRUCTIONS" }
  | { type: "OPEN_HIGH_SCORES" }
  | { type: "BACK_TO_MENU" }
  | { type: "TOGGLE_SOUND" }
  | { type: "TOGGLE_GHOST" }
  | { type: "TOGGLE_MODE" };
