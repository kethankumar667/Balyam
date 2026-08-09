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

  /**
   * Optional per-engine override for how long a bot "thinks" before its
   * next auto-move (RoomManager.scheduleBotMoveIfNeeded). Return a fresh
   * randomized ms value each call — RoomManager calls this once per
   * scheduled sub-move, not once per game. Omit to keep the platform
   * default (1200-2000ms, RoomManager.ts).
   */
  getBotThinkDelayMs?(): number;

  /**
   * Real-time support (optional).
   *
   * A turn-based engine advances only when someone moves. An action game has
   * to advance on its own — enemies close in whether or not you press
   * anything — and until now every such game here (snake, bounce, roadrash,
   * the old space shooter) got that by having the CLIENT emit a `tick` move
   * on a setInterval.
   *
   * That breaks the project's second principle. A client that ticks twice as
   * fast plays in slow motion relative to the world and dodges everything; a
   * client that stops ticking freezes the game. Simulation rate was effectively
   * client-supplied, which is the definition of trusting the client.
   *
   * An engine that declares `tickRateHz` opts into a SERVER-owned loop:
   * RoomManager runs the interval and calls `tick()`, and the client's only
   * job is to send intent (move, fire) and render what comes back.
   *
   *   tickRateHz     — simulation steps per second this game wants.
   *   simulateTick() — advance exactly one step. Returns the same shape as
   *                    applyMove so the room can end the game from it.
   *
   * Named `simulateTick` rather than `tick` because three existing engines
   * (snake, bounce, roadrash) already have a PRIVATE `tick()` of their own.
   * Reusing the name would force those three to either widen their internals
   * to public or rename them, for no benefit.
   */
  readonly tickRateHz?: number;
  simulateTick?(): MoveResult;
}

/** Narrowing helper for the optional real-time half of the contract above. */
export interface RealtimeEngine extends GameEngine {
  readonly tickRateHz: number;
  simulateTick(): MoveResult;
}

export function isRealtimeEngine(engine: GameEngine): engine is RealtimeEngine {
  return typeof engine.tickRateHz === "number" && typeof engine.simulateTick === "function";
}
