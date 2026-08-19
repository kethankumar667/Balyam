import type { GameKind } from "../types";

export type ChallengeType = "daily" | "weekly";

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
  game?: GameKind;
  category: "matches" | "wins" | "duration" | "recovery" | "multi_game";
}

export interface PlayerChallenges {
  playerId: string;
  daily: Challenge[];
  weekly: Challenge[];
  dailyResetTime: number;
  weeklyResetTime: number;
}

export interface ChallengeTemplate {
  templateId: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  category: Challenge["category"];
  game?: GameKind;
}

export const DAILY_CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    templateId: "daily_play_3",
    title: "Table Veteran",
    description: "Play 3 matches in any game",
    target: 3,
    xpReward: 75,
    category: "matches",
  },
  {
    templateId: "daily_win_2",
    title: "Double Victory",
    description: "Win 2 matches today",
    target: 2,
    xpReward: 100,
    category: "wins",
  },
  {
    templateId: "daily_play_ludo",
    title: "Ludo Maestro",
    description: "Play 1 match of Ludo",
    target: 1,
    xpReward: 60,
    category: "matches",
    game: "ludo",
  },
  {
    templateId: "daily_play_rummy",
    title: "Card Virtuoso",
    description: "Play 1 match of Rummy",
    target: 1,
    xpReward: 60,
    category: "matches",
    game: "rummy",
  },
  {
    templateId: "daily_play_uno",
    title: "Color Matcher",
    description: "Play 1 match of UNO",
    target: 1,
    xpReward: 60,
    category: "matches",
    game: "uno",
  },
  {
    templateId: "daily_play_handcricket",
    title: "Pitch Master",
    description: "Play 1 match of Hand Cricket",
    target: 1,
    xpReward: 60,
    category: "matches",
    game: "handcricket",
  },
];

export const WEEKLY_CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    templateId: "weekly_play_15",
    title: "Lounge Regular",
    description: "Play 15 total matches this week",
    target: 15,
    xpReward: 250,
    category: "matches",
  },
  {
    templateId: "weekly_win_8",
    title: "Weekly Champion",
    description: "Win 8 matches across any games",
    target: 8,
    xpReward: 300,
    category: "wins",
  },
  {
    templateId: "weekly_play_multi",
    title: "Game Explorer",
    description: "Play matches in at least 3 distinct games",
    target: 3,
    xpReward: 200,
    category: "multi_game",
  },
  {
    templateId: "weekly_time_30m",
    title: "Marathon Session",
    description: "Spend 30 minutes in live multiplayer matches",
    target: 30,
    xpReward: 200,
    category: "duration",
  },
];
