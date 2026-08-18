import type { GameKind } from "./types.js";

/**
 * Standardized Analytics & Platform Event Taxonomy for BHALYAM.
 * All event names use SCREAMING_SNAKE_CASE.
 */
export interface EventPayloadMap {
  ROOM_CREATED: {
    code: string;
    game: GameKind;
    hostId: string;
    isCustomName: boolean;
    timestamp: number;
  };
  PLAYER_JOINED: {
    code: string;
    playerId: string;
    name: string;
    isBot: boolean;
    timestamp: number;
  };
  PLAYER_LEFT: {
    code: string;
    playerId: string;
    reason?: string;
    timestamp: number;
  };
  GAME_STARTED: {
    code: string;
    game: GameKind;
    playersCount: number;
    timestamp: number;
  };
  GAME_FINISHED: {
    code: string;
    game: GameKind;
    winnerId: string | null;
    durationMs?: number;
    timestamp: number;
  };
  MOVE_MADE: {
    code: string;
    playerId: string;
    game: GameKind;
    moveType: string;
    timestamp: number;
  };
  CHAT_SENT: {
    code: string;
    playerId: string;
    textLength: number;
    timestamp: number;
  };
  VOICE_JOINED: {
    code: string;
    peerId: string;
    timestamp: number;
  };
  VOICE_LEFT: {
    code: string;
    peerId: string;
    timestamp: number;
  };
  ERROR_OCCURRED: {
    module: string;
    error: string;
    context?: Record<string, unknown>;
    timestamp: number;
  };
  TAB_HIDDEN: {
    timestamp: number;
  };
  TAB_VISIBLE: {
    timestamp: number;
  };
  APP_BACKGROUND: {
    timestamp: number;
  };
  APP_FOREGROUND: {
    timestamp: number;
  };
  RECOVERY_STARTED: {
    roomId: string;
    playerId: string;
    timestamp: number;
  };
  RECOVERY_SUCCEEDED: {
    roomId: string;
    playerId: string;
    timestamp: number;
  };
  RECOVERY_FAILED: {
    roomId: string;
    error: string;
    timestamp: number;
  };
}

export type EventName = keyof EventPayloadMap;
