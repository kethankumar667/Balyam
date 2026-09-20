import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Connect4Cell,
  Connect4Disc,
  Connect4EndReason,
  Connect4Options,
  Connect4PublicState,
  Player,
} from "@shared/types.js";
import {
  CONNECT4_SCORE_MAX,
  CONNECT4_SCORE_MIN,
  DEFAULT_CONNECT4_OPTIONS,
  sanitizeConnect4Options,
} from "@shared/types.js";
import { chooseBotColumn, chooseFallbackColumn } from "./connect4Ai.js";
import { createGrid, findWinningCells, isFull, isValidColumn, landingRow, withDisc, type Grid } from "./connect4Board.js";
import { orderForAlternatingFirstMove } from "../seating.js";

/**
 * The client plays a start ceremony (countdown + reveal) before the board is usable, and it runs
 * while the first turn's clock is already ticking. Only the opening turn gets this back.
 */
export const CONNECT4_FIRST_TURN_GRACE_MS = 4_000;

/** A winner places 4 to 21 of their own discs; each extra disc costs a point, from 18 down to 1. */
const SCORE_BASE = 22;

/** A win is worth more the fewer of your own discs it took. Always within the published bounds. */
export function scoreConnect4Win(discsPlaced: number): number {
  if (!Number.isFinite(discsPlaced)) return CONNECT4_SCORE_MIN;
  return Math.min(CONNECT4_SCORE_MAX, Math.max(CONNECT4_SCORE_MIN, SCORE_BASE - Math.round(discsPlaced)));
}

/** Rematch seating is shared with other two-seat games; re-exported for the room layer. */
export { orderForAlternatingFirstMove };

export interface Connect4EngineDeps {
  /** Injectable clock, so turn deadlines are testable without fake global timers. */
  now?: () => number;
  /** Injectable randomness (bot choices), so a seeded game is reproducible. */
  random?: () => number;
}

const fail = (error: string): MoveResult => ({ ok: false, error });

/** The column a move asks for, or null when the payload is not exactly a `{ column: <0..6 integer> }` object. */
function readColumn(data: unknown): number | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  const column = (data as { column?: unknown }).column;
  return isValidColumn(column) ? column : null;
}

export class Connect4Engine implements GameEngine {
  readonly kind = "connect4" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly now: () => number;
  private readonly random: () => number;

  private options: Connect4Options = { ...DEFAULT_CONNECT4_OPTIONS };
  private phase: "playing" | "finished" = "playing";
  private playerOrder: string[] = [];
  /** Seats the ROOM marked as bots. A human whose seat is auto-played on timeout is not in here. */
  private botIds = new Set<string>();
  private playerDiscs: Record<string, Connect4Disc> = {};
  private turnPlayerId = "";
  private grid: Grid = createGrid();
  private winningCells: Connect4Cell[] | null = null;
  private winnerId: string | null = null;
  private endReason: Connect4EndReason | null = null;
  private moveCount = 0;
  private discsPlaced: Record<string, number> = {};
  private lastMove: { row: number; col: number; playerId: string } | null = null;
  private turnDeadline: number | null = null;

  constructor(deps: Connect4EngineDeps = {}) {
    this.now = deps.now ?? (() => Date.now());
    this.random = deps.random ?? (() => Math.random());
  }

  setOptions(options?: Partial<Connect4Options>): void {
    if (options) {
      // Never trust the shape: this is fed straight from the room-create payload.
      this.options = sanitizeConnect4Options({ ...this.options, ...options });
    }
  }

  init(players: Player[]): void {
    if (players.length !== 2) {
      throw new Error(`Connect 4 requires exactly 2 players, got ${players.length}`);
    }
    const [first, second] = players;
    this.playerOrder = [first.id, second.id];
    this.botIds = new Set(players.filter((p) => p.isBot === true).map((p) => p.id));
    this.playerDiscs = { [first.id]: "R", [second.id]: "Y" };
    this.turnPlayerId = first.id;
    this.grid = createGrid();
    this.winningCells = null;
    this.winnerId = null;
    this.endReason = null;
    this.moveCount = 0;
    this.discsPlaced = { [first.id]: 0, [second.id]: 0 };
    this.lastMove = null;
    this.phase = "playing";
    this.refreshTurnDeadline();
  }

  private refreshTurnDeadline(withOpeningGrace = true): void {
    if (this.phase !== "playing") {
      this.turnDeadline = null;
      return;
    }
    const grace = withOpeningGrace && this.moveCount === 0 ? CONNECT4_FIRST_TURN_GRACE_MS : 0;
    this.turnDeadline = this.now() + this.options.turnTimerSeconds * 1000 + grace;
  }

  /**
   * Opens a fresh, full window for the player on turn. The room layer calls this when it finds the
   * stored deadline already expired but the timeout was deliberately not applied (for example the
   * opponent is inside a disconnect-grace window) — otherwise no timer would ever be re-armed and
   * the clock would sit at zero forever.
   */
  restartTurnClock(): void {
    this.refreshTurnDeadline(false);
  }

  applyMove(move: MoveContext): MoveResult {
    // Order matters and mirrors the checklist: state, identity, turn, then the untrusted payload.
    if (this.phase === "finished") return fail("Match over — request a rematch to keep playing");
    if (!this.playerOrder.includes(move.playerId)) return fail("You are not in this match");
    if (move.playerId !== this.turnPlayerId) return fail("Not your turn");
    if (move.type !== "drop") return fail("Invalid move type");

    const column = readColumn(move.data);
    if (column === null) return fail("Invalid column (must be a whole number from 0 to 6)");

    const disc = this.playerDiscs[move.playerId];
    const placed = withDisc(this.grid, column, disc);
    if (placed === null) return fail("That column is full");

    this.grid = placed.grid;
    this.moveCount += 1;
    this.discsPlaced = { ...this.discsPlaced, [move.playerId]: (this.discsPlaced[move.playerId] ?? 0) + 1 };
    this.lastMove = { row: placed.row, col: column, playerId: move.playerId };

    const winning = findWinningCells(this.grid, placed.row, column);
    if (winning) {
      // A four completed by the very last disc is still a win: it is checked before "board full".
      return this.finish("connect4", move.playerId, winning);
    }
    if (isFull(this.grid)) {
      return this.finish("draw", null, null);
    }

    this.turnPlayerId = this.otherPlayer(move.playerId);
    this.refreshTurnDeadline();
    return { ok: true, isOver: false };
  }

  private otherPlayer(playerId: string): string {
    return this.playerOrder.find((id) => id !== playerId) ?? playerId;
  }

  private finish(reason: Connect4EndReason, winnerId: string | null, winningCells: Connect4Cell[] | null): MoveResult {
    this.phase = "finished";
    this.endReason = reason;
    this.winnerId = winnerId;
    this.winningCells = winningCells;
    this.turnDeadline = null;
    return { ok: true, isOver: true, winnerId };
  }

  getStateFor(_playerId: string): Connect4PublicState {
    return this.getPublicState(); // No hidden information in this game.
  }

  getPublicState(): Connect4PublicState {
    return {
      kind: "connect4",
      phase: this.phase,
      options: { ...this.options },
      playerOrder: [...this.playerOrder],
      playerDiscs: { ...this.playerDiscs },
      turnPlayerId: this.turnPlayerId,
      grid: this.grid.map((row) => [...row]),
      winningCells: this.winningCells ? this.winningCells.map((cell) => ({ ...cell })) : null,
      winnerId: this.winnerId,
      isDraw: this.endReason === "draw",
      endReason: this.endReason,
      moveCount: this.moveCount,
      discsPlaced: { ...this.discsPlaced },
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      turnDeadline: this.turnDeadline,
    };
  }

  isOver(): boolean {
    return this.phase === "finished";
  }

  /**
   * Profile, economy and timeline code read the winner through `getWinnerId`, which prefers this
   * method. A draw and an unfinished match both read as "no winner" (null), and this always agrees
   * with `winnerId` in the public state.
   */
  getWinner(): string | null {
    return this.winnerId;
  }

  removePlayer(playerId: string): void {
    if (this.phase === "finished") return;
    if (!this.playerOrder.includes(playerId)) return; // someone never seated must not end the match
    this.finish("forfeit", this.otherPlayer(playerId), null);
  }

  pendingActors(): string[] {
    return this.phase === "playing" && this.turnPlayerId ? [this.turnPlayerId] : [];
  }

  /**
   * One move on behalf of a seat, used both by bots and by the room's turn-timeout handling. A seat
   * the room marked as a bot searches at the configured difficulty; a HUMAN who let the clock lapse
   * gets only the modest fallback (win, else block, else most central), so stalling never pays.
   */
  applyAutoMove(playerId: string): MoveResult {
    if (this.phase !== "playing" || playerId !== this.turnPlayerId) {
      return fail("Not eligible for auto move");
    }
    const disc = this.playerDiscs[playerId];
    const column = this.botIds.has(playerId)
      ? chooseBotColumn(this.grid, disc, this.options.botDifficulty, this.random)
      : chooseFallbackColumn(this.grid, disc);
    if (column === null || landingRow(this.grid, column) === null) return fail("No legal moves remaining");
    return this.applyMove({ playerId, type: "drop", data: { column } });
  }
}
