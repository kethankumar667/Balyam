export type GameState =
  | "BOOT"
  | "MENU"
  | "SELECT_OVERS"
  | "CHASE_SELECT_USER_TEAM"
  | "CHASE_SELECT_OPP_TEAM"
  | "CHASE_SELECT_DIFFICULTY"
  | "CHASE_SELECT_OVERS"
  | "CHASE_TARGET_SPLASH"
  | "READY"
  | "BOWLING"
  | "SHOT_PLAYED"
  | "BALL_RESULT"
  | "OVER_COMPLETE"
  | "GAME_OVER"
  | "HIGH_SCORES"
  | "INSTRUCTIONS"
  | "PAUSED";

export type CricketGameMode = "CLASSIC" | "CHASING";

export type CricketDifficulty = "EASY" | "MEDIUM" | "HARD";

export type CricketTeamCode = "IND" | "AUS" | "ENG" | "PAK" | "RSA" | "WI" | "NZ" | "SL";

export interface CricketTeamInfo {
  code: CricketTeamCode;
  name: string;
  flag: string;
}

export const CRICKET_TEAMS: CricketTeamInfo[] = [
  { code: "IND", name: "INDIA", flag: "🇮🇳" },
  { code: "AUS", name: "AUSTRALIA", flag: "🇦🇺" },
  { code: "ENG", name: "ENGLAND", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { code: "PAK", name: "PAKISTAN", flag: "🇵🇰" },
  { code: "RSA", name: "S. AFRICA", flag: "🇿🇦" },
  { code: "WI", name: "W. INDIES", flag: "🌴" },
  { code: "NZ", name: "NEW ZEALAND", flag: "🇳🇿" },
  { code: "SL", name: "SRI LANKA", flag: "🇱🇰" },
];

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
  mode: CricketGameMode;
  difficulty: CricketDifficulty;
  userTeam: CricketTeamCode;
  oppTeam: CricketTeamCode;
  score: number;
  wickets: number;
  balls: number;
  overs: string;
  target: number;
  targetOvers: number;
  runsNeeded: number;
  ballsRemaining: number;
  reqRunRate: number;
  currentOverDeliveries: Array<{ outcome: BallOutcome; runs: number }>;
  sixes: number;
  fours: number;
  lastOutcome: BallOutcome | null;
  lastFeedback: string;
  strikeRate: number;
  isMatchWon?: boolean;
  isRecord?: boolean;
  wonByWickets?: number;
  wonByBalls?: number;
  lostByRuns?: number;
}

export interface NokiaCricketSaveData {
  highScore: number;
  bestWickets: number;
  matchesPlayed: number;
  matchesWon: number;
  chaseMatchesPlayed: number;
  chaseMatchesWon: number;
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
