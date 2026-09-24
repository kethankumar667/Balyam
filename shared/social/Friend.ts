import type { FriendshipMilestone } from "./Friendship";

export interface Friend {
  playerId: string;
  friendPlayerId: string;
  displayName: string;
  avatar?: string;
  createdAt: number;
}

export interface SharedHistory {
  playerId: string;
  friendPlayerId: string;
  matchesPlayedTogether: number;
  winsTogether: number;
  tournamentsTogether: number;
  lastPlayedAt: number;
  /** When they first played a match together. Absent if they never have. */
  firstPlayedAt?: number;
  /**
   * Consecutive IST calendar days with at least one match together, as of now.
   * A streak that has lapsed reads as 0. Display only — it earns nothing.
   */
  currentStreakDays?: number;
  bestStreakDays?: number;
  /** The moments worth marking, oldest first. */
  milestones?: FriendshipMilestone[];
}
