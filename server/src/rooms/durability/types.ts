import type {
  GameKind,
  Player,
  RematchState,
  RummyRoundRecap,
  UnoRoundRecap,
  BingoRoundRecap,
  LudoMatchRecap,
} from "@shared/types.js";
import type { RoomLifecycleState } from "@shared/lifecycle.js";
import type { RoomTerminalStatus, TerminalRetryPayload } from "../RoomManager.js";

/**
 * Authoritative, serializable snapshot of a room's state at a point in time.
 * Captures room metadata, economy bounds, all seated players, game options,
 * completed round histories, active rematch negotiations, and the game engine's
 * serializable state.
 */
export interface RoomSnapshot {
  code: string;
  game: GameKind;
  phase: "lobby" | "playing" | "finished";
  lifecycleState: RoomLifecycleState;
  roomRevision: number;
  createdAt: number;
  matchStartedAt: number | null;
  hostId: string;
  name: string | null;
  entryStakeCoins: number;
  currentMatchId: string | null;
  lastMatchId: string | null;
  committedCostPerSeat: string | null;
  committedTotalPot: string | null;
  sealed: boolean;
  gameOptions: Record<string, unknown>;
  players: Player[];
  departedThisMatch: Player[];
  rematch: RematchState;
  history: RummyRoundRecap[];
  unoHistory: UnoRoundRecap[];
  bingoHistory: BingoRoundRecap[];
  ludoHistory: LudoMatchRecap[];
  engineState: unknown | null;
  terminalStatus?: RoomTerminalStatus;
  terminalOutcome?: "SETTLEMENT" | "REFUND" | "FORFEITURE" | null;
  terminalPayload?: TerminalRetryPayload | null;
  savedAt: number;
  expiresAt: number;
}

/**
 * Storage repository interface for room state snapshots.
 * Supports in-memory, local file, Redis, and PostgreSQL implementations.
 */
export interface RoomSnapshotRepository {
  readonly kind: "memory" | "file" | "redis" | "postgres";
  saveSnapshot(snapshot: RoomSnapshot): Promise<void>;
  getSnapshot(code: string): Promise<RoomSnapshot | null>;
  deleteSnapshot(code: string): Promise<void>;
  listActiveSnapshots(): Promise<RoomSnapshot[]>;
  purgeExpiredSnapshots(maxAgeMs?: number): Promise<number>;
  close?(): Promise<void>;
}
