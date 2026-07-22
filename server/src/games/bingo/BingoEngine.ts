import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  BingoBoard,
  BingoGameOptions,
  BingoPattern,
  BingoPlayerPublic,
  BingoPlayerState,
  BingoPublicState,
  BingoWinner,
  BotDifficulty,
  CalledNumber,
  Player,
} from "@shared/types.js";
import { DEFAULT_BINGO_OPTIONS } from "@shared/types.js";
import { generateUniqueBoard, boardFingerprint } from "./board.js";
import { createCallPool, letterFor } from "./caller.js";
import { validateWin } from "./win.js";

/** How long a false claim locks that player out of claiming again - cheap
 * defense-in-depth against a scripted client spamming `claim` to probe
 * server call timing. The client already disables the button optimistically
 * (see BingoBoardMobile/Desktop), so this only ever bites a hostile client. */
const FALSE_CLAIM_COOLDOWN_MS = 3_000;

interface PlayerBingoState {
  board: BingoBoard;
  hasWon: boolean;
  isBot: boolean;
  isConnected: boolean;
  difficulty: BotDifficulty;
}

/** Server-only. Exported so tests can rig deterministic scenarios by
 * casting `(engine as unknown as { state: InternalBingoState }).state` -
 * same convention as UnoEngine/StarGameEngine. */
export interface InternalBingoState {
  playerOrder: string[];
  players: Map<string, PlayerBingoState>;
  remainingPool: number[];
  calledNumbers: CalledNumber[];
  calledSet: Set<number>;
  currentCall: CalledNumber | null;
  winners: BingoWinner[];
  /** Wall-clock ms for the next call - set by RoomManager (setCallDeadline),
   *  same "engine stores it, RoomManager schedules the timeout" convention
   *  as every other engine's turnDeadline. */
  callDeadline: number | null;
  phase: "playing" | "finished";
  stopOnFirstWin: boolean;
  endReason: "poolExhausted" | null;
  claimCooldowns: Map<string, number>;
}

export class BingoEngine implements GameEngine {
  readonly kind = "bingo" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private state!: InternalBingoState;
  private names: Record<string, string> = {};
  private rng: () => number = Math.random;
  private now: () => number = Date.now;
  /** Persists across rematches - `init()` rebuilds `state` wholesale each
   * round but the round counter itself is a match-lifetime concern. */
  private roundNumber = 0;
  private pendingOptions: BingoGameOptions = { ...DEFAULT_BINGO_OPTIONS };

  /** Test-only: inject a deterministic RNG (returns a value in [0,1)). */
  setRng(rng: () => number): void {
    this.rng = rng;
  }

  /** Test-only: inject a deterministic clock. */
  setClock(now: () => number): void {
    this.now = now;
  }

  setOptions(options: BingoGameOptions): void {
    this.pendingOptions = options;
  }

  setCallDeadline(deadline: number | null): void {
    this.state.callDeadline = deadline;
  }

  clearCallDeadline(): void {
    this.state.callDeadline = null;
  }

  init(players: Player[]): void {
    this.roundNumber += 1;
    const opts = this.pendingOptions;
    const playerOrder = players.map((p) => p.id);
    const boards = new Map<string, PlayerBingoState>();
    const fingerprints = new Set<string>();
    for (const p of players) {
      const board = generateUniqueBoard(fingerprints, this.rng);
      fingerprints.add(boardFingerprint(board));
      boards.set(p.id, {
        board,
        hasWon: false,
        isBot: p.isBot === true,
        isConnected: p.isConnected,
        difficulty: p.bingoDifficulty ?? "medium",
      });
      this.names[p.id] = p.name;
    }
    this.state = {
      playerOrder,
      players: boards,
      remainingPool: createCallPool(this.rng),
      calledNumbers: [],
      calledSet: new Set(),
      currentCall: null,
      callDeadline: null,
      winners: [],
      phase: "playing",
      stopOnFirstWin: opts.stopOnFirstWin,
      endReason: null,
      claimCooldowns: new Map(),
    };
  }

  /**
   * Call the next number from the pool. BINGO has no per-player turn, so
   * RoomManager repurposes its single turn-timer slot as this call-interval
   * clock (see RoomManager.scheduleTurnTimer's BingoEngine branch) - this
   * is the equivalent of another engine's `onTurnTimeout`, just invoked on
   * a fixed interval instead of a per-player deadline.
   *
   * Exhaustion is checked BEFORE popping so the final number is called and
   * stays claimable for one full interval before the round auto-finalizes
   * with no winner.
   */
  callNext(): CalledNumber | null {
    if (this.state.phase !== "playing") return null;
    if (this.state.remainingPool.length === 0) {
      this.state.phase = "finished";
      this.state.endReason = "poolExhausted";
      return null;
    }
    const value = this.state.remainingPool.pop() as number;
    const called: CalledNumber = {
      value,
      letter: letterFor(value),
      order: this.state.calledNumbers.length + 1,
      calledAt: this.now(),
    };
    this.state.calledNumbers.push(called);
    this.state.calledSet.add(value);
    this.state.currentCall = called;
    return called;
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.state.phase !== "playing") {
      return { ok: false, error: "Round not active" };
    }
    if (!this.state.players.has(move.playerId)) {
      return { ok: false, error: "Not a player in this round" };
    }
    switch (move.type) {
      case "markCell":
        return this.handleMarkCell(move);
      case "claim":
        return this.handleClaim(move.playerId);
      default:
        return { ok: false, error: `Unknown move type: ${move.type}` };
    }
  }

  /**
   * Marks are always server-derived at serialization time from
   * `calledSet` (see getStateFor) - this move exists purely so the client
   * gets an authoritative ack for its optimistic tap, matching the
   * "manual mark for UX parity/undo-visibility" requirement. No state
   * mutation happens here; a rejection just means the tap was stale
   * (number not called yet) and the client should re-sync.
   */
  private handleMarkCell(move: MoveContext): MoveResult {
    const data = move.data as { cellIndex?: unknown } | undefined;
    const cellIndex = data?.cellIndex;
    if (typeof cellIndex !== "number" || cellIndex < 0 || cellIndex > 24) {
      return { ok: false, error: "Invalid cell" };
    }
    if (cellIndex === 12) return { ok: true }; // FREE - always already marked
    const player = this.state.players.get(move.playerId) as PlayerBingoState;
    const cell = player.board[cellIndex];
    if (cell.value === null || !this.state.calledSet.has(cell.value)) {
      return { ok: false, error: "Not called yet" };
    }
    return { ok: true };
  }

  private handleClaim(playerId: string): MoveResult {
    const player = this.state.players.get(playerId) as PlayerBingoState;
    if (player.hasWon) return { ok: false, error: "You already won" };
    // No separate "round already won" guard here: under stopOnFirstWin,
    // the SAME synchronous call that pushes a winner also flips phase to
    // "finished" (see the tail of this method), so applyMove's own
    // `phase !== "playing"` guard above already catches every subsequent
    // claim in that mode before this method is even entered.
    const cooldownUntil = this.state.claimCooldowns.get(playerId) ?? 0;
    if (this.now() < cooldownUntil) {
      return { ok: false, error: "Wait before claiming again" };
    }
    const check = validateWin(player.board, this.state.calledSet);
    if (!check.valid || !check.pattern) {
      this.state.claimCooldowns.set(playerId, this.now() + FALSE_CLAIM_COOLDOWN_MS);
      return { ok: false, error: "No valid BINGO pattern yet" };
    }
    player.hasWon = true;
    const winner: BingoWinner = {
      playerId,
      playerName: this.names[playerId] ?? "Player",
      pattern: check.pattern as BingoPattern,
      claimedAt: this.now(),
      calledCountAtWin: this.state.calledNumbers.length,
    };
    this.state.winners.push(winner);
    const everyoneResolved = this.state.playerOrder.every(
      (id) => this.state.players.get(id)?.hasWon,
    );
    if (this.state.stopOnFirstWin || everyoneResolved) {
      this.state.phase = "finished";
    }
    return {
      ok: true,
      isOver: this.state.phase === "finished",
      winnerId: this.state.winners[0]?.playerId ?? null,
    };
  }

  private publicPlayers(): BingoPlayerPublic[] {
    return this.state.playerOrder.map((id) => {
      const p = this.state.players.get(id) as PlayerBingoState;
      const markedCount = p.board.reduce(
        (n, c) => n + (c.free || (c.value !== null && this.state.calledSet.has(c.value)) ? 1 : 0),
        0,
      );
      return {
        id,
        markedCount,
        hasWon: p.hasWon,
        isBot: p.isBot,
        isConnected: p.isConnected,
      };
    });
  }

  getPublicState(): BingoPublicState {
    return {
      kind: "bingo",
      phase: this.state.phase,
      players: this.publicPlayers(),
      calledNumbers: this.state.calledNumbers,
      currentCall: this.state.currentCall,
      callDeadline: this.state.callDeadline,
      winners: this.state.winners,
      roundNumber: this.roundNumber,
      stopOnFirstWin: this.state.stopOnFirstWin,
      isOver: this.isOver(),
      endReason: this.state.endReason,
    };
  }

  getStateFor(playerId: string): BingoPlayerState {
    const p = this.state.players.get(playerId);
    const rawBoard = p?.board ?? [];
    // `cell.marked` on the stored board is frozen at generation time
    // (always false for non-free cells) - recompute it fresh from
    // calledSet on every read instead of relying on stale stored state,
    // same "derive at serialization time" rule as markedCount below.
    const board = rawBoard.map((c) => ({
      ...c,
      marked: c.free || (c.value !== null && this.state.calledSet.has(c.value)),
    }));
    const myMarkedCount = board.reduce((n, c) => n + (c.marked ? 1 : 0), 0);
    return {
      ...this.getPublicState(),
      myBoard: board,
      myMarkedCount,
      myPendingClaim: false,
    };
  }

  isOver(): boolean {
    return this.state.phase === "finished";
  }

  removePlayer(playerId: string): void {
    this.state.players.delete(playerId);
    this.state.playerOrder = this.state.playerOrder.filter((id) => id !== playerId);
    if (this.state.playerOrder.length === 0) {
      this.state.phase = "finished";
    }
  }

  pendingActors(): string[] {
    if (this.state.phase !== "playing") return [];
    if (this.state.stopOnFirstWin && this.state.winners.length > 0) return [];
    const ready: string[] = [];
    for (const id of this.state.playerOrder) {
      const p = this.state.players.get(id);
      if (!p || !p.isBot || p.hasWon) continue;
      const cooldownUntil = this.state.claimCooldowns.get(id) ?? 0;
      if (this.now() < cooldownUntil) continue;
      if (validateWin(p.board, this.state.calledSet).valid) ready.push(id);
    }
    return ready;
  }

  applyAutoMove(playerId: string): MoveResult {
    return this.applyMove({ playerId, type: "claim" });
  }

  getBotThinkDelayMs(): number {
    const id = this.pendingActors()[0];
    const difficulty = id ? this.state.players.get(id)?.difficulty ?? "medium" : "medium";
    switch (difficulty) {
      case "easy":
        return 3_000 + this.rng() * 3_000;
      case "hard":
        return 150 + this.rng() * 350;
      default:
        return 1_000 + this.rng() * 1_500;
    }
  }
}
