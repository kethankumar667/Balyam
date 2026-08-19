import type { GameKind } from "../types";

export interface RecentPlayer {
  playerId: string;
  displayName: string;
  avatar?: string;
  timesPlayedTogether: number;
  lastPlayedAt: number;
  lastGame: GameKind;
  lastRoomCode: string;
}

export interface FriendSummary {
  playerId: string;
  displayName: string;
  avatar?: string;
  status: "online" | "in_game" | "offline";
  addedAt: number;
}
