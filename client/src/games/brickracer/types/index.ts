export type GameState =
  | "BOOT"
  | "MENU"
  | "READY"
  | "PLAYING"
  | "PAUSED"
  | "LEVEL_UP"
  | "GAME_OVER"
  | "HIGH_SCORE"
  | "INSTRUCTIONS";

export type LaneIndex = 0 | 1 | 2; // 0 = Left (x=2), 1 = Center (x=5), 2 = Right (x=8)

export type GameInput =
  | "LEFT"
  | "RIGHT"
  | "BOOST_START"
  | "BOOST_END"
  | "SELECT"
  | "PAUSE"
  | "BACK";

export interface Point {
  x: number;
  y: number;
}

export interface EnemyCar {
  id: string;
  lane: LaneIndex;
  y: number; // Top row of enemy car (descends from y=-4 to y=20)
  speedBonus: boolean;
}

export interface MatchStats {
  score: number;
  highScore: number;
  level: number;
  carsDodged: number;
  distanceMeters: number;
  speedKmh: number;
  isBoosting: boolean;
  isNewRecord: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  badge: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface BrickRacerSaveData {
  highScore: number;
  matchesPlayed: number;
  totalCarsDodged: number;
  bestLevel: number;
  longestDistance: number;
  achievements: string[];
}
