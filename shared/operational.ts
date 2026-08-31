import type { GameKind } from "./types.js";
import type { RoomLifecycleState } from "./lifecycle.js";

/**
 * Operational seat status values.
 */
export type OperationalSeatStatus =
  | "active"
  | "disconnected_grace"
  | "auto_playing"
  | "idle"
  | "quit";

/**
 * Diagnostic summary for an individual player seat inside a live room.
 * Note: durable account identifiers, tokens, and private secrets are strictly omitted.
 */
export interface OperationalPlayerSummary {
  id: string; // Ephemeral room-scoped seat ID
  name: string;
  playerType: "human" | "bot";
  accountType: "guest" | "member" | "bot";
  isHost: boolean;
  isConnected: boolean;
  isEligibleForRejoin: boolean;
  awaySince: number | null;
  awayUntil: number | null;
  remainingGraceMs: number | null;
  isAutoPlaying: boolean;
  autoPlayReason: "disconnected" | "idle" | null;
  autoTurnsPlayed: number;
  autoTurnCap: number | null;
  idleStrikes: number;
  seatStatus: OperationalSeatStatus;
}

/**
 * Match diagnostics derived only from certified engine and room state.
 */
export interface OperationalMatchDiagnostics {
  currentTurnPlayerName: string | null;
  isOver: boolean;
  matchDurationMs: number;
  matchStatus: string;
}

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
    id: string; // Internal room-scoped host id
    name: string;
    isGuest: boolean;
    isConnected: boolean;
    isAway: boolean;
    inGrace: boolean;
  };
  playerCount: number;
  humanCount: number;
  botCount: number;
  spectatorCount: number;
  hasTakeover: boolean;
  sealed: boolean;
  disconnectedCount: number;
  players: OperationalPlayerSummary[];
  diagnostics?: OperationalMatchDiagnostics;
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
  isHost: boolean;
  awaySince: number;
  awayUntil: number;
  awayDurationMs: number;
  gracePeriodMs: number;
  remainingGraceMs: number;
  isEligibleForRejoin: boolean;
  isAutoPlaying: boolean;
  autoPlayReason: "disconnected" | "idle" | null;
  idleStrikes: number;
  autoTurnsPlayed: number;
  autoTurnCap: number;
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

/**
 * Deterministic recovery status taxonomy.
 */
export type RecoveryStatus =
  | "EXPIRED"
  | "EXPIRING_SOON"
  | "NEAR_EXPIRY"
  | "AUTO_PLAYING"
  | "REJOIN_ELIGIBLE";

/**
 * Deterministic recovery status precedence.
 * - remainingGraceMs <= 0 -> "EXPIRED"
 * - remainingGraceMs < 15,000 -> "EXPIRING_SOON"
 * - remainingGraceMs < 30,000 -> "NEAR_EXPIRY"
 * - isAutoPlaying (when >= 30,000) -> "AUTO_PLAYING"
 * - otherwise (when >= 30,000 and not auto-playing) -> "REJOIN_ELIGIBLE"
 */
export function deriveRecoveryStatus(seat: {
  remainingGraceMs: number;
  isAutoPlaying: boolean;
  isEligibleForRejoin?: boolean;
}): RecoveryStatus {
  if (seat.remainingGraceMs <= 0) return "EXPIRED";
  if (seat.remainingGraceMs < 15000) return "EXPIRING_SOON";
  if (seat.remainingGraceMs < 30000) return "NEAR_EXPIRY";
  if (seat.isAutoPlaying) return "AUTO_PLAYING";
  return "REJOIN_ELIGIBLE";
}

/**
 * Deterministic seat status helper.
 */
export function deriveSeatStatus(player: {
  isConnected: boolean;
  isAutoPlaying?: boolean;
  idleStrikes?: number;
  hasQuit?: boolean;
}): OperationalSeatStatus {
  if (player.hasQuit) return "quit";
  if (!player.isConnected) return "disconnected_grace";
  if (player.isAutoPlaying) return "auto_playing";
  if ((player.idleStrikes ?? 0) > 0) return "idle";
  return "active";
}
