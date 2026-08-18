import type { GameKind } from "../types";

export type TournamentType = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS";

export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "CHECK_IN_OPEN"
  | "IN_PROGRESS"
  | "FINISHED"
  | "ARCHIVED";

export interface TournamentConfig {
  minPlayers: number;
  maxPlayers: number;
  allowLateJoin: boolean;
  autoAdvanceByes: boolean;
  checkInRequired: boolean;
  visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
}

export type ParticipantStatus =
  | "REGISTERED"
  | "CHECKED_IN"
  | "ACTIVE"
  | "ELIMINATED"
  | "DISQUALIFIED";

export interface TournamentParticipant {
  playerId: string;
  displayName: string;
  avatar?: string;
  seed: number;
  checkedIn: boolean;
  status: ParticipantStatus;
  finalPlacement?: number;
}

export interface TournamentReward {
  placement: number; // 1 = Champion, 2 = Runner Up, 3 = Semi, etc.
  name: "Champion" | "Runner Up" | "Semi Finalist" | "Participant";
  xp: number;
  badge?: string;
  title?: string;
  achievementId?: string;
}

export interface TournamentHistoryItem {
  tournamentId: string;
  tournamentName: string;
  game: GameKind;
  placement: number;
  participatedAt: number;
  prizeXP: number;
  badge?: string;
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  game: GameKind;
  type: TournamentType;
  status: TournamentStatus;
  config: TournamentConfig;
  seasonId?: string;
  participants: TournamentParticipant[];
  currentRound: number;
  totalRounds: number;
  championId?: string;
  runnerUpId?: string;
  startsAt: number;
  checkInStartsAt?: number;
  endsAt?: number;
  createdAt: number;
  createdBy: string;
  rewards: TournamentReward[];
}

export const DEFAULT_TOURNAMENT_CONFIG: TournamentConfig = {
  minPlayers: 4,
  maxPlayers: 16,
  allowLateJoin: false,
  autoAdvanceByes: true,
  checkInRequired: true,
  visibility: "PUBLIC",
};

export const DEFAULT_TOURNAMENT_REWARDS: TournamentReward[] = [
  { placement: 1, name: "Champion", xp: 500, badge: "👑", title: "Tournament Champion", achievementId: "tournament_champion" },
  { placement: 2, name: "Runner Up", xp: 250, badge: "🥈", title: "Tournament Finalist" },
  { placement: 3, name: "Semi Finalist", xp: 100, badge: "🥉", title: "Semi Finalist" },
  { placement: 4, name: "Participant", xp: 30, badge: "🎖️" },
];
