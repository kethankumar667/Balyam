import type { GameKind } from "./types.js";
import type { RoomLifecycleState } from "./lifecycle.js";

/**
 * High-density summary of a live multiplayer room on the server.
 */
export interface OperationalRoomSummary {
  code: string;
  game: GameKind;
  lifecycleState: RoomLifecycleState;
  phase: "lobby" | "playing" | "finished";
  createdAt: number;
  matchStartedAt: number | null;
  matchDurationMs: number;
  host: {
    id: string;
    name: string;
    isGuest: boolean;
  };
  playerCount: number;
  humanCount: number;
  botCount: number;
  spectatorCount: number;
  hasTakeover: boolean;
  sealed: boolean;
  disconnectedCount: number;
}

/**
 * Summary of a disconnected player's seat held in grace period.
 */
export interface DisconnectedSeatSummary {
  roomCode: string;
  game: GameKind;
  playerId: string;
  playerName: string;
  isGuest: boolean;
  awaySince: number;
  awayDurationMs: number;
  gracePeriodMs: number;
  remainingGraceMs: number;
  isEligibleForRejoin: boolean;
  isAutoPlaying: boolean;
  autoPlayReason: "disconnected" | "idle" | null;
  idleStrikes: number;
  autoTurnsPlayed: number;
}

/**
 * Aggregated recovery and grace-period health summary.
 */
export interface OperationalRecoverySummary {
  activeGraceCount: number;
  seats: DisconnectedSeatSummary[];
}

/**
 * Core instant platform health counters.
 */
export interface PlatformHealthCounters {
  onlineHumans: number;
  activeBots: number;
  activeRooms: number;
  runningMatches: number;
  disconnectedUsers: number;
  rejoinEligibleUsers: number;
  connectedSockets: number;
  lobbyRooms: number;
  recoveringRooms: number;
  pausedRooms: number;
  /**
   * 0..100, or `null` when zero recovery sessions have resolved (succeeded
   * or expired) since the process started — never a numeric fallback like
   * 100. Process-local and cumulative-since-boot; resets to `null` on
   * restart until at least one recovery session resolves again.
   */
  recoverySuccessRate: number | null;
  /** Cumulative since server process start, not a windowed/live count. */
  hostMigrationCount: number;
  /** Cumulative since server process start, not a windowed/live rate. */
  abandonmentRate: number; // 0..100%
}

/**
 * Server-Sent Events tick payload emitted on `/api/operational/stream`.
 */
export interface PlatformTickPayload {
  timestamp: number;
  platform: PlatformHealthCounters;
  rooms: OperationalRoomSummary[];
  recovery: OperationalRecoverySummary;
}
