/**
 * Core Type Definitions for Brick Breakout (Block Breaker)
 */

export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 20;
export const PADDLE_ROW = 18;
export const PADDLE_WIDTH = 3;
export const INITIAL_LIVES = 3;

export type GameStatus =
  | "boot"
  | "menu"
  | "ready"
  | "serving"
  | "playing"
  | "paused"
  | "life-lost"
  | "level-complete"
  | "game-over"
  | "instructions"
  | "high-scores";

export type BrickType = "NORMAL" | "STRONG" | "INDESTRUCTIBLE";

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  dx: -1 | 0 | 1;
  dy: -1 | 1;
}

export interface Ball {
  position: Position;
  velocity: Velocity;
  attachedToPaddle: boolean;
}

export interface Paddle {
  centerX: number;
  width: number;
  row: number;
}

export interface Brick {
  id: string;
  position: Position;
  type: BrickType;
  hitPoints: number;
  maxHitPoints: number;
  scoreValue: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  controlSensitivity: "NORMAL" | "FAST";
}

export interface SavedBreakoutData {
  highScore: number;
  maxLevel: number;
  soundEnabled: boolean;
}

export interface GameState {
  status: GameStatus;
  paddle: Paddle;
  ball: Ball;
  bricks: readonly Brick[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  combo: number;
  remainingBricks: number;
  settings: GameSettings;
  tickSpeedMs: number;
  lastPaddleMoveDir: -1 | 0 | 1;
}

export type GameAction =
  | { type: "START_GAME"; level?: number }
  | { type: "SERVE_BALL" }
  | { type: "LAUNCH_BALL" }
  | { type: "TICK" }
  | { type: "MOVE_PADDLE"; direction: -1 | 1 }
  | { type: "PAUSE_TOGGLE" }
  | { type: "RESUME" }
  | { type: "RESTART" }
  | { type: "NEXT_LEVEL" }
  | { type: "OPEN_INSTRUCTIONS" }
  | { type: "OPEN_MENU" }
  | { type: "TOGGLE_SOUND" }
  | { type: "SET_STATUS"; status: GameStatus };
