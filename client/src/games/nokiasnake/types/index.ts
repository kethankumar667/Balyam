export type GameState =
  | "BOOT"
  | "MENU"
  | "READY"
  | "PLAYING"
  | "PAUSED"
  | "GAME_OVER"
  | "HIGH_SCORE"
  | "INSTRUCTIONS";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export type GameMode = "CLASSIC" | "WRAP_AROUND";

export interface Point {
  x: number;
  y: number;
}

export type GameInput =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "SELECT"
  | "PAUSE"
  | "BACK";

export interface MatchStats {
  score: number;
  highScore: number;
  level: number;
  foodEaten: number;
  bonusCount: number;
  length: number;
  speedMs: number;
  isNewRecord: boolean;
  gameMode: GameMode;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  badge: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface NokiaSnakeSaveData {
  highScore: number;
  matchesPlayed: number;
  totalFoodCollected: number;
  bestLevel: number;
  longestSnake: number;
  achievements: string[];
}
