import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  TambolaClaimType,
  TambolaClaimWin,
  TambolaOptions,
  TambolaPlayerPublic,
  TambolaPlayerState,
  TambolaPublicState,
} from "@shared/types.js";
import { DEFAULT_TAMBOLA_OPTIONS } from "@shared/types.js";
import { generateTambolaTicket } from "./ticketGenerator.js";

const ARRANGE_TIMER_SECONDS = 30;

export class TambolaEngine implements GameEngine {
  readonly kind = "tambola" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 12;

  private opts: TambolaOptions = { ...DEFAULT_TAMBOLA_OPTIONS };
  private pendingOptions: TambolaOptions | null = null;

  private seatOrder: string[] = [];
  private isBot = new Set<string>();
  private nameOf = new Map<string, string>();

  private tickets = new Map<string, number[][]>();
  private markedCells = new Map<string, boolean[][]>();
  private claimsWon = new Map<string, Set<TambolaClaimType>>();
  private readyPlayers = new Set<string>();

  private numberPool: number[] = [];
  private calledNumbers: number[] = [];
  private currentCall: number | null = null;

  private winners: TambolaClaimWin[] = [];
  private phase: "arranging" | "playing" | "finished" = "arranging";
  private isOverFlag = false;
  private winnerId: string | null = null;

  private deadline: number | null = null;
  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<TambolaOptions>): void {
    this.pendingOptions = { ...DEFAULT_TAMBOLA_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Tambola requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    this.opts = this.pendingOptions ?? { ...DEFAULT_TAMBOLA_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.isBot = new Set(players.filter((p) => p.isBot).map((p) => p.id));
    this.nameOf = new Map(players.map((p) => [p.id, p.name]));

    // Generate 1-90 pool
    this.numberPool = Array.from({ length: 90 }, (_, i) => i + 1).sort(() => this.rng() - 0.5);
    this.calledNumbers = [];
    this.currentCall = null;
    this.winners = [];
    this.phase = "arranging";
    this.isOverFlag = false;
    this.winnerId = null;
    this.readyPlayers.clear();

    for (const pid of this.seatOrder) {
      this.tickets.set(pid, generateTambolaTicket(this.rng));
      this.markedCells.set(
        pid,
        Array.from({ length: 3 }, () => Array(9).fill(false))
      );
      this.claimsWon.set(pid, new Set());
      if (this.isBot.has(pid)) {
        this.readyPlayers.add(pid);
      }
    }

    // If all players are already ready (e.g. all bots)
    if (this.readyPlayers.size >= this.seatOrder.length) {
      this.phase = "playing";
      this.drawNextNumber();
    }
  }

  private drawNextNumber(): boolean {
    if (this.numberPool.length === 0) {
      this.finalizeGame();
      return false;
    }
    const num = this.numberPool.pop()!;
    this.calledNumbers.push(num);
    this.currentCall = num;
    this.deadline = Date.now() + this.opts.callIntervalMs;

    // Auto-mark and evaluate claims for any bot players in this match
    this.processBotTurns();

    return true;
  }

  private processBotTurns(): void {
    if (this.phase !== "playing") return;
    for (const botId of this.isBot) {
      const ticket = this.tickets.get(botId);
      const grid = this.markedCells.get(botId);
      if (!ticket || !grid) continue;

      // 1. Mark all called numbers on the bot's ticket
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
          const val = ticket[r][c];
          if (val > 0 && !grid[r][c] && this.calledNumbers.includes(val)) {
            grid[r][c] = true;
          }
        }
      }

      // 2. Check each claim type in standard order
      const claimTypes: TambolaClaimType[] = [
        "early5",
        "topLine",
        "middleLine",
        "bottomLine",
        "fullHouse",
      ];
      for (const cType of claimTypes) {
        if (
          !this.winners.some((w) => w.type === cType) &&
          this.verifyClaim(botId, cType)
        ) {
          const win: TambolaClaimWin = {
            type: cType,
            winnerId: botId,
            winnerName: this.nameOf.get(botId) || "Bot",
            ts: Date.now(),
          };
          this.winners.push(win);
          this.claimsWon.get(botId)?.add(cType);

          if (cType === "fullHouse") {
            this.winnerId = botId;
            this.finalizeGame();
            return;
          }
        }
      }
    }
  }

  getBotThinkDelayMs(): number {
    return 600 + Math.floor(this.rng() * 400);
  }

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    if (!this.seatOrder.includes(pid)) {
      return { ok: false, error: "Not a player in this game" };
    }
    if (this.isOverFlag) {
      return { ok: false, error: "Game is over" };
    }

    switch (move.type) {
      case "shuffleTicket":
      case "shuffleBoard":
        return this.handleShuffleTicket(pid);
      case "lockTicket":
      case "lockBoard":
      case "ready":
        return this.handleLockTicket(pid);
      case "markCell":
        return this.handleMarkCell(pid, move.data as { row?: number; col?: number });
      case "claim":
        return this.handleClaim(pid, (move.data as { claimType?: TambolaClaimType })?.claimType);
      default:
        return { ok: false, error: `Unknown move: ${move.type}` };
    }
  }

  private handleShuffleTicket(pid: string): MoveResult {
    if (this.phase !== "arranging") {
      return { ok: false, error: "Cannot shuffle ticket after match has started" };
    }
    if (this.readyPlayers.has(pid)) {
      return { ok: false, error: "Ticket already locked / ready" };
    }
    this.tickets.set(pid, generateTambolaTicket(this.rng));
    return this.result();
  }

  private handleLockTicket(pid: string): MoveResult {
    if (this.phase !== "arranging") {
      return { ok: false, error: "Match has already started" };
    }
    this.readyPlayers.add(pid);

    // If all players are ready, start playing
    if (this.seatOrder.every((id) => this.readyPlayers.has(id))) {
      this.phase = "playing";
      this.drawNextNumber();
    }
    return this.result();
  }

  private handleMarkCell(pid: string, data?: { row?: number; col?: number }): MoveResult {
    if (this.phase !== "playing") {
      return { ok: false, error: "Match not in playing phase" };
    }
    const row = data?.row;
    const col = data?.col;
    if (row == null || col == null || row < 0 || row > 2 || col < 0 || col > 8) {
      return { ok: false, error: "Invalid cell position" };
    }
    const ticket = this.tickets.get(pid);
    const num = ticket?.[row]?.[col];
    if (!num || num === 0) {
      return { ok: false, error: "Empty cell cannot be marked" };
    }
    if (!this.calledNumbers.includes(num)) {
      return { ok: false, error: "Number has not been called yet" };
    }

    const grid = this.markedCells.get(pid)!;
    grid[row][col] = !grid[row][col]; // toggle
    return this.result();
  }

  private handleClaim(pid: string, claimType?: TambolaClaimType): MoveResult {
    if (this.phase !== "playing") {
      return { ok: false, error: "Match not in playing phase" };
    }
    if (!claimType) return { ok: false, error: "Claim type required" };

    // Check if this claim type was already claimed by anyone
    if (this.winners.some((w) => w.type === claimType)) {
      return { ok: false, error: `${claimType} has already been claimed` };
    }

    const isValid = this.verifyClaim(pid, claimType);
    if (!isValid) {
      return { ok: false, error: `Bogus claim! Requirements for ${claimType} not met.` };
    }

    const win: TambolaClaimWin = {
      type: claimType,
      winnerId: pid,
      winnerName: this.nameOf.get(pid) || "Player",
      ts: Date.now(),
    };
    this.winners.push(win);
    this.claimsWon.get(pid)!.add(claimType);

    if (claimType === "fullHouse") {
      this.winnerId = pid;
      this.finalizeGame();
    }

    return this.result();
  }

  private verifyClaim(pid: string, claimType: TambolaClaimType): boolean {
    const ticket = this.tickets.get(pid);
    const grid = this.markedCells.get(pid);
    if (!ticket || !grid) return false;

    // Helper: is a cell marked and called
    const isCellValid = (r: number, c: number): boolean => {
      const val = ticket[r][c];
      return val > 0 && grid[r][c] && this.calledNumbers.includes(val);
    };

    switch (claimType) {
      case "early5": {
        let count = 0;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 9; c++) {
            if (isCellValid(r, c)) count++;
          }
        }
        return count >= 5;
      }
      case "topLine":
        return [0, 1, 2, 3, 4, 5, 6, 7, 8].every((c) => ticket[0][c] === 0 || isCellValid(0, c));
      case "middleLine":
        return [0, 1, 2, 3, 4, 5, 6, 7, 8].every((c) => ticket[1][c] === 0 || isCellValid(1, c));
      case "bottomLine":
        return [0, 1, 2, 3, 4, 5, 6, 7, 8].every((c) => ticket[2][c] === 0 || isCellValid(2, c));
      case "fullHouse": {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 9; c++) {
            if (ticket[r][c] > 0 && !isCellValid(r, c)) return false;
          }
        }
        return true;
      }
    }
  }

  private countMarked(pid: string): number {
    const grid = this.markedCells.get(pid);
    if (!grid) return 0;
    let count = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c]) count++;
      }
    }
    return count;
  }

  private finalizeGame(): void {
    this.phase = "finished";
    this.isOverFlag = true;
    this.deadline = null;
  }

  private result(): MoveResult {
    return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
  }

  getPublicState(): TambolaPublicState {
    const playersPub: TambolaPlayerPublic[] = this.seatOrder.map((pid) => ({
      id: pid,
      name: this.nameOf.get(pid) || "Player",
      markedCount: this.countMarked(pid),
      claimsWon: Array.from(this.claimsWon.get(pid) || []),
      isReady: this.readyPlayers.has(pid),
    }));

    return {
      kind: "tambola",
      phase: this.phase,
      calledNumbers: [...this.calledNumbers],
      currentCall: this.currentCall,
      callDeadline: this.deadline,
      seatOrder: [...this.seatOrder],
      players: playersPub,
      winners: [...this.winners],
      isOver: this.isOverFlag,
    };
  }

  getStateFor(playerId: string): TambolaPlayerState {
    const pub = this.getPublicState();
    const ticket = this.tickets.get(playerId) || Array.from({ length: 3 }, () => Array(9).fill(0));
    const grid = this.markedCells.get(playerId) || Array.from({ length: 3 }, () => Array(9).fill(false));
    return {
      ...pub,
      myTicket: ticket,
      myMarkedCells: grid,
    };
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    if (!this.seatOrder.includes(playerId)) return;
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    this.isBot.delete(playerId);
    this.tickets.delete(playerId);
    this.markedCells.delete(playerId);
    this.claimsWon.delete(playerId);
    this.readyPlayers.delete(playerId);

    if (this.phase === "arranging" && this.seatOrder.length > 0) {
      if (this.seatOrder.every((id) => this.readyPlayers.has(id))) {
        this.phase = "playing";
        this.drawNextNumber();
      }
    }

    if (this.seatOrder.length < this.minPlayers) {
      if (!this.isOverFlag && this.seatOrder.length > 0) {
        this.finalizeGame();
      }
    }
  }

  getPhaseTimerSeconds(): number {
    if (this.phase === "arranging") {
      return ARRANGE_TIMER_SECONDS;
    }
    return Math.floor(this.opts.callIntervalMs / 1000);
  }

  armDeadline(totalMs: number): number {
    if (this.deadline == null) this.deadline = Date.now() + totalMs;
    return Math.max(0, this.deadline - Date.now());
  }

  clearDeadline(): void {
    this.deadline = null;
  }

  resolveDeadline(): void {
    if (this.phase === "arranging") {
      for (const pid of this.seatOrder) {
        this.readyPlayers.add(pid);
      }
      this.phase = "playing";
      this.drawNextNumber();
    } else if (this.phase === "playing") {
      this.drawNextNumber();
    }
  }

  pendingActors(): string[] {
    if (this.phase === "arranging") {
      return this.seatOrder.filter((id) => !this.readyPlayers.has(id) && this.isBot.has(id));
    }
    return [];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.phase === "arranging") {
      return this.handleLockTicket(playerId);
    }
    if (this.phase !== "playing") return { ok: false, error: "Not playing" };

    const ticket = this.tickets.get(playerId);
    const grid = this.markedCells.get(playerId);
    if (!ticket || !grid) return { ok: false, error: "No ticket" };

    // Auto mark called numbers
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 9; c++) {
        const val = ticket[r][c];
        if (val > 0 && !grid[r][c] && this.calledNumbers.includes(val)) {
          this.handleMarkCell(playerId, { row: r, col: c });
        }
      }
    }

    // Auto claim eligible prizes
    const claimTypes: TambolaClaimType[] = ["early5", "topLine", "middleLine", "bottomLine", "fullHouse"];
    for (const cType of claimTypes) {
      if (!this.winners.some((w) => w.type === cType) && this.verifyClaim(playerId, cType)) {
        return this.handleClaim(playerId, cType);
      }
    }

    return this.result();
  }
}
