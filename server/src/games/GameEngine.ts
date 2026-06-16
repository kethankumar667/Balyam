import type { GameKind, Player } from "@shared/types.js";

export interface MoveContext {
  playerId: string;
  type: string;
  data?: unknown;
}

export interface MoveResult {
  ok: boolean;
  error?: string;
  isOver?: boolean;
  winnerId?: string | null;
}

export interface GameEngine {
  readonly kind: GameKind;
  readonly minPlayers: number;
  readonly maxPlayers: number;

  init(players: Player[]): void;
  applyMove(move: MoveContext): MoveResult;
  getStateFor(playerId: string): unknown;
  getPublicState(): unknown;
  isOver(): boolean;
  removePlayer(playerId: string): void;

  /**
   * Bot support (optional). An engine that wires up both methods can host bots.
   *
   *   pendingActors() — who needs to make a move right now? Turn-based games
   *     return [currentPlayer]; simultaneous games (RPS) return everyone
   *     whose pick hasn't landed yet. Empty when nothing is awaitable
   *     (animations, transitions, game over, etc.).
   *
   *   applyAutoMove(playerId) — make one "good enough" move for that player.
   *     RoomManager loops this for each bot until they are no longer in
   *     pendingActors(), so engines may emit multiple sub-moves per turn
   *     (e.g. Ludo: roll, then move).
   *
   * Both default to undefined when an engine doesn't support bots yet.
   */
  pendingActors?(): string[];
  applyAutoMove?(playerId: string): MoveResult;
}
