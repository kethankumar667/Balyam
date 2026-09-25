import type { GameKind, Player, RoomPublicState } from "@shared/types";

export interface TvPodiumEntry {
  rank: number;
  playerId: string;
  name: string;
  avatar?: string;
  scoreOrStat?: string | number;
  subtitle?: string;
  isHost?: boolean;
  isBot?: boolean;
}

export interface TvActiveTurnInfo {
  playerId: string;
  name: string;
  avatar?: string;
  color?: string;
  actionText?: string;
  deadlineMs: number | null;
  turnTimerSeconds?: number;
}

export type TvViewPhase = "lobby" | "playing" | "podium";
