import type { GameKind } from "../types.js";

export type MatchResult = "WIN" | "LOSS" | "DRAW";

export interface MatchParticipant {
  playerId: string;
  name: string;
  avatar?: string;
  isWinner: boolean;
  score?: number;
  isBot?: boolean;
}

export interface MatchHistoryItem {
  matchId: string;
  roomCode: string;
  game: GameKind;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  result: MatchResult;
  participants: MatchParticipant[];
  replayAvailable: boolean;
}

export interface MatchDetailRecord extends MatchHistoryItem {
  movesCount: number;
  recoveryCount: number;
  winnerName?: string;
  timelineEventsCount: number;
  timelineExportUrl?: string;
}
