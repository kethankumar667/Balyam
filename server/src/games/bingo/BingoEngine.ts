import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  BingoBoard,
  BingoGameOptions,
  BingoLetter,
  BingoPhase,
  BingoPlayerPublic,
  BingoPlayerState,
  BingoPublicState,
  BingoWinner,
  CalledNumber,
  Player,
} from "@shared/types.js";
import { DEFAULT_BINGO_OPTIONS } from "@shared/types.js";
import { generateUniqueBoard, boardFingerprint } from "./board.js";
import { evaluateBoardLines } from "./win.js";

/**
 * How long players get to arrange and lock their board before the server
 * locks it for them. Generous: rearranging is the fun part, and the only
 * job of this timer is to stop one absent player stalling the table.
 */
const ARRANGE_TIMER_SECONDS = 45;

const TURN_TIMER_SECONDS = 15;

interface InternalPlayerState {
  id: string;
  name: string;
  board: BingoBoard;
  isReady: boolean;
  isBot: boolean;
  isConnected: boolean;
  hasWon: boolean;
}

export class BingoEngine implements GameEngine {
  readonly kind = "bingo" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 8;

  private opts: BingoGameOptions = { ...DEFAULT_BINGO_OPTIONS };
  private pendingOptions: BingoGameOptions | null = null;

  private seatOrder: string[] = [];
  private players = new Map<string, InternalPlayerState>();
  private phase: BingoPhase = "arranging";
  private turnIndex = 0;
  private calledNumbers: CalledNumber[] = [];
  private calledSet = new Set<number>();
  private lastCalledNumber: CalledNumber | null = null;

  private winners: BingoWinner[] = [];
  private winnerId: string | null = null;
  private isOverFlag = false;

  private turnDeadline: number | null = null;
  private roundNumber = 0;

  private rng: () => number = Math.random;
  private now: () => number = Date.now;

  setRng(rng: () => number): void {
    this.rng = rng;
  }

  setClock(now: () => number): void {
    this.now = now;
  }

  setOptions(options: BingoGameOptions): void {
    this.pendingOptions = options;
  }

  setTurnDeadline(deadline: number | null): void {
    this.turnDeadline = deadline;
  }

  clearTurnDeadline(): void {
    this.turnDeadline = null;
  }

  getTurnTimerSeconds(): number {
    if (this.phase === "playing" && !this.isOverFlag) {
      return TURN_TIMER_SECONDS;
    }
    /**
     * Arranging needs a deadline too.
     *
     * This returned 0 here, so RoomManager armed no timer at all during
     * board lock-in — and because `getTimeoutActor()` and `applyAutoMove()`
     * both already handle the arranging phase, the auto-lock machinery was
     * fully built and simply never triggered.
     *
     * The effect in a real room: one player who never presses "Lock board"
     * held the table forever. Bingo seats eight, so a single person who
     * opened the tab and wandered off blocked seven others with no timeout,
     * no takeover and nothing on screen explaining why.
     */
    if (this.phase === "arranging") {
      return ARRANGE_TIMER_SECONDS;
    }
    return 0;
  }

  getTimeoutActor(): string | null {
    if (this.phase === "arranging") {
      // Find any player not ready
      for (const pid of this.seatOrder) {
        if (!this.players.get(pid)?.isReady) return pid;
      }
      return null;
    }
    if (this.phase === "playing" && !this.isOverFlag) {
      // Check if any player has 5 lines and can claim
      for (const pid of this.seatOrder) {
        const p = this.players.get(pid);
        if (p && !p.hasWon) {
          const check = evaluateBoardLines(p.board, this.calledSet);
          if (check.canClaimBingo) return pid;
        }
      }
      return this.currentTurnPlayerId();
    }
    return null;
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Bingo requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    this.roundNumber += 1;
    this.opts = this.pendingOptions ?? { ...DEFAULT_BINGO_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.players.clear();

    const fingerprints = new Set<string>();
    for (const p of players) {
      const board = generateUniqueBoard(fingerprints, this.rng);
      fingerprints.add(boardFingerprint(board));
      this.players.set(p.id, {
        id: p.id,
        name: p.name,
        board,
        isReady: p.isBot === true, // Bots auto-ready
        isBot: p.isBot === true,
        isConnected: p.isConnected,
        hasWon: false,
      });
    }

    this.phase = "arranging";
    this.turnIndex = 0;
    this.calledNumbers = [];
    this.calledSet.clear();
    this.lastCalledNumber = null;
    this.winners = [];
    this.winnerId = null;
    this.isOverFlag = false;
    this.turnDeadline = null;
  }

  private currentTurnPlayerId(): string | null {
    if (this.phase !== "playing" || this.seatOrder.length === 0) return null;
    return this.seatOrder[this.turnIndex % this.seatOrder.length] ?? null;
  }

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    if (!this.seatOrder.includes(pid)) {
      return { ok: false, error: "Not a player in this match" };
    }
    if (this.isOverFlag) {
      return { ok: false, error: "Match is over" };
    }

    switch (move.type) {
      case "shuffleBoard":
        return this.handleShuffleBoard(pid);
      case "lockBoard":
      case "ready":
        return this.handleLockBoard(pid);
      case "callNumber":
        return this.handleCallNumber(
          pid,
          (move.data as { number?: number })?.number
        );
      case "claimBingo":
      case "claim":
        return this.handleClaimBingo(pid);
      default:
        return { ok: false, error: `Unknown move: ${move.type}` };
    }
  }

  private handleShuffleBoard(pid: string): MoveResult {
    if (this.phase !== "arranging") {
      return { ok: false, error: "Cannot shuffle board after game started" };
    }
    const p = this.players.get(pid);
    if (!p) return { ok: false, error: "Player not found" };
    if (p.isReady) {
      return { ok: false, error: "Board already locked" };
    }

    // Generate a fresh unique 1-25 board
    const fingerprints = new Set<string>();
    for (const [id, other] of this.players.entries()) {
      if (id !== pid) fingerprints.add(boardFingerprint(other.board));
    }
    p.board = generateUniqueBoard(fingerprints, this.rng);
    return this.result();
  }

  private handleLockBoard(pid: string): MoveResult {
    if (this.phase !== "arranging") {
      return { ok: false, error: "Not in arranging phase" };
    }
    const p = this.players.get(pid);
    if (!p) return { ok: false, error: "Player not found" };
    p.isReady = true;

    // Check if all players are ready
    const allReady = this.seatOrder.every(
      (id) => this.players.get(id)?.isReady
    );
    if (allReady) {
      this.startPlayingPhase();
    }
    return this.result();
  }

  private startPlayingPhase(): void {
    this.phase = "playing";
    this.turnIndex = 0;
  }

  private handleCallNumber(pid: string, num?: number): MoveResult {
    if (this.phase !== "playing") {
      return { ok: false, error: "Game is not in playing phase" };
    }
    if (pid !== this.currentTurnPlayerId()) {
      return { ok: false, error: "Not your turn to call a number" };
    }
    if (num == null || num < 1 || num > 25) {
      return { ok: false, error: "Number must be between 1 and 25" };
    }
    if (this.calledSet.has(num)) {
      return { ok: false, error: "Number has already been called" };
    }

    const called: CalledNumber = {
      value: num,
      order: this.calledNumbers.length + 1,
      calledAt: this.now(),
    };
    this.calledNumbers.push(called);
    this.calledSet.add(num);
    this.lastCalledNumber = called;

    // Update marked status on all players' boards
    for (const p of this.players.values()) {
      for (const cell of p.board) {
        if (cell.value === num) {
          cell.marked = true;
        }
      }
    }

    // Check if remaining numbers in 1-25 are exhausted
    if (this.calledSet.size >= 25) {
      // Check if anyone can claim Bingo, else auto-finish
      let anyCanClaim = false;
      for (const p of this.players.values()) {
        const check = evaluateBoardLines(p.board, this.calledSet);
        if (check.canClaimBingo) anyCanClaim = true;
      }
      if (!anyCanClaim) {
        this.phase = "finished";
        this.isOverFlag = true;
      }
    }

    // Advance turn
    this.turnIndex = (this.turnIndex + 1) % this.seatOrder.length;
    return this.result();
  }

  private handleClaimBingo(pid: string): MoveResult {
    if (this.phase !== "playing") {
      return { ok: false, error: "Not in playing phase" };
    }
    const p = this.players.get(pid);
    if (!p) return { ok: false, error: "Player not found" };
    if (p.hasWon) return { ok: false, error: "Already claimed Bingo" };

    const check = evaluateBoardLines(p.board, this.calledSet);
    if (!check.canClaimBingo) {
      return { ok: false, error: "You need 5 completed lines (B-I-N-G-O) to claim Bingo!" };
    }

    p.hasWon = true;
    const winner: BingoWinner = {
      playerId: pid,
      playerName: p.name,
      pattern: "bingo5",
      claimedAt: this.now(),
      calledCountAtWin: this.calledNumbers.length,
    };
    this.winners.push(winner);
    this.winnerId = pid;
    this.phase = "finished";
    this.isOverFlag = true;
    this.turnDeadline = null;

    return this.result();
  }

  private result(): MoveResult {
    return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
  }

  private publicPlayers(): BingoPlayerPublic[] {
    return this.seatOrder.map((id) => {
      const p = this.players.get(id)!;
      const evalRes = evaluateBoardLines(p.board, this.calledSet);
      // Map cell marked state
      const boardWithMarked = p.board.map((c) => ({
        ...c,
        marked: this.calledSet.has(c.value),
      }));

      return {
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        markedCount: boardWithMarked.filter((c) => c.marked).length,
        completedLinesCount: evalRes.completedLinesCount,
        completedLetters: evalRes.completedLetters,
        hasWon: p.hasWon,
        isBot: p.isBot,
        isConnected: p.isConnected,
        board: boardWithMarked,
      };
    });
  }

  getPublicState(): BingoPublicState {
    return {
      kind: "bingo",
      phase: this.phase,
      currentTurnPlayerId: this.currentTurnPlayerId(),
      players: this.publicPlayers(),
      calledNumbers: [...this.calledNumbers],
      lastCalledNumber: this.lastCalledNumber,
      callDeadline: this.turnDeadline,
      winners: [...this.winners],
      roundNumber: this.roundNumber,
      stopOnFirstWin: this.opts.stopOnFirstWin,
      isOver: this.isOverFlag,
      endReason: null,
      winnerId: this.winnerId,
    };
  }

  getStateFor(playerId: string): BingoPlayerState {
    const pub = this.getPublicState();
    const p = this.players.get(playerId);
    const rawBoard = p?.board ?? [];
    const myBoard = rawBoard.map((c) => ({
      ...c,
      marked: this.calledSet.has(c.value),
    }));
    const evalRes = evaluateBoardLines(myBoard, this.calledSet);

    return {
      ...pub,
      myBoard,
      myMarkedCount: myBoard.filter((c) => c.marked).length,
      myCompletedLinesCount: evalRes.completedLinesCount,
      myCompletedLetters: evalRes.completedLetters,
      canClaimBingo: evalRes.canClaimBingo,
      isMyTurn: pub.currentTurnPlayerId === playerId,
    };
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    if (this.seatOrder.length === 0) {
      this.phase = "finished";
      this.isOverFlag = true;
    }
  }

  pendingActors(): string[] {
    if (this.isOverFlag) return [];
    if (this.phase === "arranging") {
      return this.seatOrder.filter((id) => !this.players.get(id)?.isReady);
    }
    if (this.phase === "playing") {
      // Check if any player has 5 lines and can claim
      for (const pid of this.seatOrder) {
        const p = this.players.get(pid);
        if (p && !p.hasWon) {
          const check = evaluateBoardLines(p.board, this.calledSet);
          if (check.canClaimBingo) return [pid];
        }
      }
      const turnId = this.currentTurnPlayerId();
      return turnId ? [turnId] : [];
    }
    return [];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.phase === "arranging") {
      return this.handleLockBoard(playerId);
    }
    if (this.phase === "playing") {
      const p = this.players.get(playerId);
      if (p) {
        const check = evaluateBoardLines(p.board, this.calledSet);
        if (check.canClaimBingo) {
          return this.handleClaimBingo(playerId);
        }
      }

      if (playerId === this.currentTurnPlayerId()) {
        // Pick random uncalled number 1-25
        const uncalled: number[] = [];
        for (let v = 1; v <= 25; v++) {
          if (!this.calledSet.has(v)) uncalled.push(v);
        }
        if (uncalled.length > 0) {
          const choice = uncalled[Math.floor(this.rng() * uncalled.length)];
          return this.handleCallNumber(playerId, choice);
        }
      }
    }
    return { ok: false, error: "Nothing to auto-play" };
  }
}
