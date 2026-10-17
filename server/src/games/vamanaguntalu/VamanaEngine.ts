import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  VamanaEndReason,
  VamanaLastMove,
  VamanaOptions,
  VamanaPublicState,
} from "@shared/types.js";
import {
  DEFAULT_VAMANA_OPTIONS,
  VAMANA_PIT_COUNT,
  VAMANA_SCORE_MAX,
  VAMANA_SCORE_MIN,
  sanitizeVamanaOptions,
} from "@shared/types.js";
import { chooseBotPit, chooseFallbackPit } from "./vamanaAi.js";
import {
  createPits,
  isLegalPit,
  isPitNumber,
  ownerSide,
  seedsOnSide,
  simulateSow,
  type Side,
} from "./vamanaBoard.js";

/**
 * The client plays a start ceremony (countdown + reveal) before the board is usable, and it runs
 * while the first turn's clock is already ticking. Only the opening turn gets this back.
 */
export const VAMANA_FIRST_TURN_GRACE_MS = 4_000;

/** A win is scored by the seeds the winner finished with, always within the published bounds. */
export function scoreVamanaWin(seedsWon: number): number {
  if (!Number.isFinite(seedsWon)) return VAMANA_SCORE_MIN;
  return Math.min(VAMANA_SCORE_MAX, Math.max(VAMANA_SCORE_MIN, Math.round(seedsWon)));
}

/** A custom start, so a test (or a future puzzle) can set up an exact position. Never reachable from a client. */
export interface VamanaPosition {
  pits: readonly number[];
  /** Seeds already captured by [first seat, second seat]. */
  captured?: readonly [number, number];
}

export interface VamanaEngineDeps {
  /** Injectable clock, so turn deadlines are testable without fake global timers. */
  now?: () => number;
  /** Injectable randomness (bot choices), so a seeded game is reproducible. */
  random?: () => number;
  position?: VamanaPosition;
}

const fail = (error: string): MoveResult => ({ ok: false, error });

const isSeedCount = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;

function assertValidPosition(position: VamanaPosition): void {
  const pitsOk = position.pits.length === VAMANA_PIT_COUNT && position.pits.every(isSeedCount);
  const capturedOk = position.captured === undefined || (position.captured.length === 2 && position.captured.every(isSeedCount));
  if (!pitsOk || !capturedOk) throw new Error("Vamana Guntalu starting position is invalid");
}

/** The `pit` field of a `{ pit }` payload, left as `unknown` for the board to judge. */
function readPit(data: unknown): unknown {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return undefined;
  return (data as { pit?: unknown }).pit;
}

export class VamanaEngine implements GameEngine {
  readonly kind = "vamanaguntalu" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly now: () => number;
  private readonly random: () => number;
  private readonly position: VamanaPosition | undefined;

  private options: VamanaOptions = { ...DEFAULT_VAMANA_OPTIONS };
  private phase: "playing" | "finished" = "playing";
  private playerOrder: string[] = [];
  /** Seats the ROOM marked as bots. A human whose seat is auto-played on timeout is not in here. */
  private botIds = new Set<string>();
  private turnPlayerId = "";
  private pits: number[] = createPits();
  private captured: Record<string, number> = {};
  private swept: Record<string, number> = {};
  private winnerId: string | null = null;
  private endReason: VamanaEndReason | null = null;
  private moveCount = 0;
  private lastMove: VamanaLastMove | null = null;
  private turnDeadline: number | null = null;

  constructor(deps: VamanaEngineDeps = {}) {
    this.now = deps.now ?? (() => Date.now());
    this.random = deps.random ?? (() => Math.random());
    this.position = deps.position;
  }

  setOptions(options?: Partial<VamanaOptions>): void {
    if (options) {
      // Never trust the shape: this is fed straight from the room-create payload.
      this.options = sanitizeVamanaOptions({ ...this.options, ...options });
    }
  }

  init(players: Player[]): void {
    if (players.length !== 2) {
      throw new Error(`Vamana Guntalu requires exactly 2 players, got ${players.length}`);
    }
    if (this.position) assertValidPosition(this.position);

    const [first, second] = players;
    this.playerOrder = [first.id, second.id];
    this.botIds = new Set(players.filter((p) => p.isBot === true).map((p) => p.id));
    this.turnPlayerId = first.id;
    this.pits = this.position ? [...this.position.pits] : createPits();
    this.captured = {
      [first.id]: this.position?.captured?.[0] ?? 0,
      [second.id]: this.position?.captured?.[1] ?? 0,
    };
    this.swept = { [first.id]: 0, [second.id]: 0 };
    this.winnerId = null;
    this.endReason = null;
    this.moveCount = 0;
    this.lastMove = null;
    this.phase = "playing";

    // A custom position can leave the first seat with nothing to sow; the match is simply decided.
    if (seedsOnSide(this.pits, 0) === 0) this.settle();
    this.refreshTurnDeadline();
  }

  private sideOf(playerId: string): Side {
    return this.playerOrder.indexOf(playerId) === 0 ? 0 : 1;
  }

  private otherPlayer(playerId: string): string {
    return this.playerOrder.find((id) => id !== playerId) ?? playerId;
  }

  private refreshTurnDeadline(withOpeningGrace = true): void {
    if (this.phase !== "playing") {
      this.turnDeadline = null;
      return;
    }
    const grace = withOpeningGrace && this.moveCount === 0 ? VAMANA_FIRST_TURN_GRACE_MS : 0;
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
    if (this.phase === "finished") return fail("Match over");
    if (!this.playerOrder.includes(move.playerId)) return fail("You are not in this match");
    if (move.playerId !== this.turnPlayerId) return fail("Not your turn");
    if (move.type !== "sow") return fail("Invalid move type");

    const pit = readPit(move.data);
    if (!isPitNumber(pit)) return fail("Invalid pit (must be a whole number from 0 to 13)");
    const side = this.sideOf(move.playerId);
    if (ownerSide(pit) !== side) return fail("That pit is not yours");
    if (!isLegalPit(this.pits, side, pit)) return fail("That pit is empty");

    const turn = simulateSow(this.pits, pit);
    this.pits = turn.pits;
    this.moveCount += 1;
    this.captured = {
      ...this.captured,
      [move.playerId]: this.captured[move.playerId] + (turn.capture?.seeds ?? 0),
    };
    this.lastMove = { playerId: move.playerId, lifts: turn.lifts, capture: turn.capture, truncated: turn.truncated };

    const next = this.otherPlayer(move.playerId);
    if (seedsOnSide(this.pits, this.sideOf(next)) === 0) {
      this.settle();
      return { ok: true, isOver: true, winnerId: this.winnerId };
    }

    this.turnPlayerId = next;
    this.refreshTurnDeadline();
    return { ok: true, isOver: false };
  }

  /**
   * The match ends when the player to move has nothing to sow. Each player keeps the seeds still on
   * their own row, then the larger total wins; equal totals are a draw (no winner, so the stake is
   * refunded).
   */
  private settle(): void {
    const [first, second] = this.playerOrder;
    this.swept = {
      [first]: seedsOnSide(this.pits, 0),
      [second]: seedsOnSide(this.pits, 1),
    };
    this.captured = {
      [first]: this.captured[first] + this.swept[first],
      [second]: this.captured[second] + this.swept[second],
    };
    this.pits = Array.from({ length: VAMANA_PIT_COUNT }, () => 0);

    const diff = this.captured[first] - this.captured[second];
    this.phase = "finished";
    this.winnerId = diff === 0 ? null : diff > 0 ? first : second;
    this.endReason = diff === 0 ? "draw" : "seeds";
    this.turnDeadline = null;
  }

  getStateFor(_playerId: string): VamanaPublicState {
    return this.getPublicState(); // No hidden information in this game.
  }

  getPublicState(): VamanaPublicState {
    return {
      kind: "vamanaguntalu",
      phase: this.phase,
      options: { ...this.options },
      playerOrder: [...this.playerOrder],
      turnPlayerId: this.turnPlayerId,
      pits: [...this.pits],
      captured: { ...this.captured },
      swept: { ...this.swept },
      winnerId: this.winnerId,
      isDraw: this.endReason === "draw",
      endReason: this.endReason,
      moveCount: this.moveCount,
      lastMove: this.lastMove
        ? {
            ...this.lastMove,
            lifts: this.lastMove.lifts.map((lift) => ({ ...lift })),
            capture: this.lastMove.capture ? { ...this.lastMove.capture } : null,
          }
        : null,
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
    this.phase = "finished";
    this.winnerId = this.otherPlayer(playerId);
    this.endReason = "forfeit";
    this.turnDeadline = null;
  }

  pendingActors(): string[] {
    return this.phase === "playing" && this.turnPlayerId ? [this.turnPlayerId] : [];
  }

  /**
   * One move on behalf of a seat, used both by bots and by the room's turn-timeout handling. A seat
   * the room marked as a bot searches at the configured difficulty; a HUMAN who let the clock lapse
   * gets only the modest fallback (the biggest capture available right now), so stalling never pays.
   */
  applyAutoMove(playerId: string): MoveResult {
    if (this.phase !== "playing" || playerId !== this.turnPlayerId) {
      return fail("Not eligible for auto move");
    }
    const side = this.sideOf(playerId);
    const pit = this.botIds.has(playerId)
      ? chooseBotPit(this.pits, side, this.options.botDifficulty, this.random)
      : chooseFallbackPit(this.pits, side);
    if (pit === null) return fail("No legal moves remaining");
    return this.applyMove({ playerId, type: "sow", data: { pit } });
  }
}
