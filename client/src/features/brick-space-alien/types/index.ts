/**
 * Strict TypeScript models and Domain definitions for Brick Space Alien (Space Invaders)
 */

export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 20;
export const PLAYER_ROW = 19;
export const INITIAL_LIVES = 3;

export type GameStatus =
  | "boot"
  | "menu"
  | "ready"
  | "playing"
  | "paused"
  | "life-lost"
  | "wave-complete"
  | "game-over"
  | "instructions"
  | "high-scores";

export interface Position {
  x: number;
  y: number;
}

export interface PlayerShip {
  centerX: number;
  lives: number;
  invulnerableUntilMs: number;
}

export type AlienType = "BASIC" | "ARMORED" | "COMMANDER";

export interface Alien {
  id: string;
  position: Position;
  formationRow: number;
  formationColumn: number;
  type: AlienType;
  hitPoints: number;
  scoreValue: number;
}

export interface Projectile {
  id: string;
  owner: "PLAYER" | "ALIEN";
  position: Position;
  previousPosition: Position;
  direction: -1 | 1; // -1 for PLAYER (upward), 1 for ALIEN (downward)
}

export interface AlienFormation {
  direction: -1 | 1;
  movementAccumulatorMs: number;
  stepIntervalMs: number;
}

export interface SpaceAlienSaveData {
  highScore: number;
  totalAlienKills: number;
  highestWave: number;
  gamesPlayed: number;
  soundEnabled: boolean;
}

export interface GameState {
  status: GameStatus;
  player: PlayerShip;
  aliens: Alien[];
  formation: AlienFormation;
  projectiles: Projectile[];
  wave: number;
  score: number;
  highScore: number;
  totalKills: number;
  playerCooldownMs: number;
  alienFireCooldownMs: number;
  overlayTimerMs: number;
  seed: number;
  selectedMenuIndex: number;
  soundEnabled: boolean;
}

export type GameAction =
  | { type: "TICK"; deltaMs: number; nowMs: number }
  | { type: "MOVE_PLAYER"; deltaX: number; nowMs: number }
  | { type: "PLAYER_FIRE"; nowMs: number }
  | { type: "START_GAME"; wave?: number }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESUME_GAME" }
  | { type: "RESTART_GAME" }
  | { type: "NAV_MENU"; direction: "UP" | "DOWN" }
  | { type: "CONFIRM_MENU" }
  | { type: "GO_TO_MENU" }
  | { type: "GO_TO_INSTRUCTIONS" }
  | { type: "GO_TO_HIGH_SCORES" }
  | { type: "TOGGLE_SOUND" };
