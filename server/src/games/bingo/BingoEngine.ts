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
import { BINGO_MARK_WINDOW_MS, DEFAULT_BINGO_OPTIONS } from "@shared/types.js";
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
  /**
   * Numbers THIS player has actually marked.
   *
   * Marking used to be global: `callNumber` set `marked` on every board at
   * once, and both `getStateFor` and win evaluation read the shared
   * `calledSet`, so the per-cell flag was decorative. That is the whole
   * reason the game played like a screensaver — no call ever needed a
   * player to do anything.
   *
   * Now each player owns their marks. It converges back to `calledSet` when
   * a window closes (missed numbers are auto-marked), so this can never
   * permanently disagree with what was called.
   */
  markedSet: Set<number>;
  /** Per-player accessibility preference; see BingoPlayerPublic.autoMark. */
  autoMark: boolean;
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

  /**
   * The number currently awaiting marks, and when it stops waiting.
   *
   * Non-null means the caller is blocked: no new number goes out while one
   * is still open. That gating is what keeps every board on the same call
   * even though the mark window (8s) is longer than every call-interval
   * tier (2.5-6s).
   */
  private pendingMark: { value: number; deadline: number } | null = null;

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
          const check = evaluateBoardLines(p.board, p.markedSet);
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
        markedSet: new Set<number>(),
        // Default OFF: manual marking IS the game now. Auto-mark is the
        // accessibility escape hatch, not the default experience.
        autoMark: false,
      });
    }

    this.phase = "arranging";
    this.turnIndex = 0;
    this.calledNumbers = [];
    this.calledSet.clear();
    this.lastCalledNumber = null;
    this.pendingMark = null;
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
      case "markNumber":
        return this.handleMarkNumber(pid, (move.data as { number?: number })?.number);
      case "setAutoMark":
        return this.handleSetAutoMark(pid, (move.data as { on?: boolean })?.on);
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

  /**
   * The player found the open number on their board and tapped it.
   *
   * Only the number currently on the clock is accepted. Letting a client
   * mark anything it liked would hand it the ability to fake a line, and
   * win validation reads the same marked set.
   */
  private handleMarkNumber(pid: string, num?: number): MoveResult {
    if (this.phase !== "playing") {
      return { ok: false, error: "Game is not in playing phase" };
    }
    const p = this.players.get(pid);
    if (!p) return { ok: false, error: "Not a player in this match" };

    const pending = this.pendingMark;
    if (!pending) return { ok: false, error: "No number is open for marking" };
    if (this.pendingMarkExpired()) {
      // The window lapsed between the tap leaving the phone and arriving.
      // Settling gives them the number anyway, so a late tap is never worse
      // than not tapping.
      this.settlePendingMark();
      return { ok: true };
    }
    if (num !== pending.value) {
      return { ok: false, error: "That is not the number being called" };
    }
    if (p.markedSet.has(num)) return { ok: false, error: "Already marked" };

    p.markedSet.add(num);
    this.settleIfAllMarked();
    return { ok: true };
  }

  /** Toggle this player's auto-mark preference. Takes effect next call. */
  private handleSetAutoMark(pid: string, on?: boolean): MoveResult {
    const p = this.players.get(pid);
    if (!p) return { ok: false, error: "Not a player in this match" };
    p.autoMark = on !== false;
    // Switching it ON mid-window should not leave them waiting on a number
    // they just delegated.
    if (p.autoMark && this.pendingMark) {
      p.markedSet.add(this.pendingMark.value);
      this.settleIfAllMarked();
    }
    return { ok: true };
  }

  /**
   * Close the open number: anyone who did not tap it in time gets it marked
   * for them. Idempotent, and safe to call when nothing is pending.
   */
  private settlePendingMark(): void {
    const pending = this.pendingMark;
    if (!pending) return;
    for (const p of this.players.values()) p.markedSet.add(pending.value);
    this.pendingMark = null;
  }

  /** Close early once every seat has the number — no need to burn the clock. */
  private settleIfAllMarked(): void {
    const pending = this.pendingMark;
    if (!pending) return;
    for (const p of this.players.values()) {
      if (!p.markedSet.has(pending.value)) return;
    }
    this.pendingMark = null;
  }

  /** True once the open number can be closed: everyone marked, or time is up. */
  private pendingMarkExpired(): boolean {
    return this.pendingMark != null && this.now() >= this.pendingMark.deadline;
  }

  private handleCallNumber(pid: string, num?: number): MoveResult {
    if (this.phase !== "playing") {
      return { ok: false, error: "Game is not in playing phase" };
    }
    // A number still open blocks the next one. The caller (bot or timer)
    // simply retries; once the window lapses this settles it and proceeds,
    // so no external timer is needed to close the window.
    if (this.pendingMark) {
      if (!this.pendingMarkExpired()) {
        return { ok: false, error: "Players are still marking the last number" };
      }
      this.settlePendingMark();
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

    // The number goes out UNMARKED. Players who opted into auto-mark get it
    // immediately; everyone else has to find it on their own board before
    // the window closes.
    this.pendingMark = { value: num, deadline: this.now() + BINGO_MARK_WINDOW_MS };
    for (const p of this.players.values()) {
      if (p.autoMark || p.isBot || !p.isConnected) {
        // Bots and disconnected seats resolve instantly: neither can tap,
        // and making the table wait 8s on them would punish the humans.
        p.markedSet.add(num);
      }
    }
    this.settleIfAllMarked();

    // Check if remaining numbers in 1-25 are exhausted
    if (this.calledSet.size >= 25) {
      // Check if anyone can claim Bingo, else auto-finish
      let anyCanClaim = false;
      for (const p of this.players.values()) {
        const check = evaluateBoardLines(p.board, p.markedSet);
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

    const check = evaluateBoardLines(p.board, p.markedSet);
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
      const evalRes = evaluateBoardLines(p.board, p.markedSet);
      // Map cell marked state
      const boardWithMarked = p.board.map((c) => ({
        ...c,
        marked: p.markedSet.has(c.value),
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
        autoMark: p.autoMark,
        hasMarkedCurrent:
          this.pendingMark == null || p.markedSet.has(this.pendingMark.value),
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
      markDeadline: this.pendingMark?.deadline ?? null,
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
    // A spectator has no seat and therefore no marks of their own.
    const myMarks = p?.markedSet ?? new Set<number>();
    const myBoard = rawBoard.map((c) => ({
      ...c,
      marked: myMarks.has(c.value),
    }));
    const evalRes = evaluateBoardLines(myBoard, myMarks);

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
          const check = evaluateBoardLines(p.board, p.markedSet);
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
        const check = evaluateBoardLines(p.board, p.markedSet);
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
