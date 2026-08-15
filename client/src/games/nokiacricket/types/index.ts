export type GameState =
  | "BOOT"
  | "MENU"
  | "SELECT_OVERS"
  | "READY"
  | "BOWLING"
  | "SHOT_PLAYED"
  | "BALL_RESULT"
  | "OVER_COMPLETE"
  | "GAME_OVER"
  | "HIGH_SCORES"
  | "INSTRUCTIONS"
  | "PAUSED";

export type DeliveryType =
  | "FAST"
  | "SLOW"
  | "YORKER"
  | "BOUNCER"
  | "OUTSWING"
  | "OFFBREAK";

export type ShotType = "LEFT" | "STRAIGHT" | "RIGHT";

export type TimingGrade = "PERFECT" | "GOOD" | "EARLY" | "LATE" | "MISS";

export type BallOutcome =
  | "DOT"
  | "RUNS_1"
  | "RUNS_2"
  | "RUNS_3"
  | "FOUR"
  | "SIX"
  | "BOWLED"
  | "CAUGHT"
  | "LBW";

export interface DeliveryProfile {
  type: DeliveryType;
  speedY: number;
  initialX: number;
  pitchY: number;
  postPitchVx: number;
  bounceScale: number;
  label: string;
}

export interface ShotResult {
  grade: TimingGrade;
  runs: number;
  outcome: BallOutcome;
  trajectory: {
    angle: number;
    power: number;
  };
  feedbackText: string;
}

export interface MatchStats {
  score: number;
  wickets: number;
  balls: number;
  overs: string;
  target: number;
  targetOvers: number;
  currentOverDeliveries: Array<{ outcome: BallOutcome; runs: number }>;
  sixes: number;
  fours: number;
  lastOutcome: BallOutcome | null;
  lastFeedback: string;
  strikeRate: number;
}

export interface NokiaCricketSaveData {
  highScore: number;
  bestWickets: number;
  matchesPlayed: number;
  matchesWon: number;
  totalRuns: number;
  totalSixes: number;
  totalFours: number;
  bestStrikeRate: number;
  unlockedAchievements: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badge: string;
}
