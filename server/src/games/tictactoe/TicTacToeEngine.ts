import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  TicTacToeCell,
  TicTacToeMark,
  TicTacToeMove,
  TicTacToeOptions,
  TicTacToePublicState,
} from "@shared/types.js";
import { DEFAULT_TICTACTOE_OPTIONS, sanitizeTicTacToeOptions } from "@shared/types.js";
import { orderForAlternatingFirstMove } from "../seating.js";

/**
 * The client plays a start ceremony (countdown + reveal) before the board is
 * usable, and it runs while the first turn's clock is already ticking — measured
 * at 3-4 s of a 15 s window. Only the opening turn gets this back.
 */
export const TICTACTOE_FIRST_TURN_GRACE_MS = 4_000;

/** Best and worst score a winning line can earn (3-move win .. anything slow). */
const WIN_SCORE_MAX = 8;
const WIN_SCORE_MIN = 1;
/** 11 - 3 own moves = the maximum; each extra own move costs a point. */
const WIN_SCORE_BASE = 11;

/**
 * A win is worth more the fewer of your own marks it took. The old per-match
 * 1/0 could never rank anyone: every winner's best was 1.
 */
export function scoreTicTacToeWin(totalMoves: number, mark: TicTacToeMark): number {
  const ownMoves = mark === "X" ? Math.ceil(totalMoves / 2) : Math.floor(totalMoves / 2);
  return Math.min(WIN_SCORE_MAX, Math.max(WIN_SCORE_MIN, WIN_SCORE_BASE - ownMoves));
}

/**
 * Rematch seating (whoever sat second last game moves first) is shared with other two-seat
 * games; it lives in `../seating.ts` and is re-exported here so existing imports keep working.
 */
export { orderForAlternatingFirstMove };

const WINNING_COMBINATIONS: readonly [number, number, number][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

export class TicTacToeEngine implements GameEngine {
  readonly kind = "tictactoe" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private options: TicTacToeOptions = { ...DEFAULT_TICTACTOE_OPTIONS };
  private phase: "playing" | "finished" = "playing";
  private playerOrder: string[] = [];
  private playerMarks: Record<string, TicTacToeMark> = {};
  private turnPlayerId = "";
  private grid: (TicTacToeCell | null)[] = Array(9).fill(null);
  private pieceQueues: Record<TicTacToeMark, number[]> = { X: [], O: [] };
  private winningLine: number[] | null = null;
  private winnerId: string | "draw" | null = null;
  private moveCount = 0;
  private turnDeadline: number | null = null;
  private lastEvaporatedCell: number | null = null;

  setOptions(options?: Partial<TicTacToeOptions>): void {
    if (options) {
      // Never trust the shape: this is fed straight from the room-create payload.
      this.options = sanitizeTicTacToeOptions({ ...this.options, ...options });
    }
  }

  init(players: Player[]): void {
    if (players.length !== 2) {
      throw new Error(`Tic Tac Toe requires exactly 2 players, got ${players.length}`);
    }

    this.playerOrder = [players[0].id, players[1].id];
    this.playerMarks = {
      [players[0].id]: "X",
      [players[1].id]: "O",
    };
    this.turnPlayerId = players[0].id;
    this.grid = Array(9).fill(null);
    this.pieceQueues = { X: [], O: [] };
    this.winningLine = null;
    this.winnerId = null;
    this.moveCount = 0;
    this.lastEvaporatedCell = null;
    this.phase = "playing";
    this.refreshTurnDeadline();
  }

  private refreshTurnDeadline(withOpeningGrace = true): void {
    if (this.options.turnTimerSeconds > 0 && this.phase === "playing") {
      const grace = withOpeningGrace && this.moveCount === 0 ? TICTACTOE_FIRST_TURN_GRACE_MS : 0;
      this.turnDeadline = Date.now() + this.options.turnTimerSeconds * 1000 + grace;
    } else {
      this.turnDeadline = null;
    }
  }

  /**
   * Opens a fresh, full window for the player on turn. The room layer calls
   * this when it finds the stored deadline already expired but the timeout was
   * deliberately not applied (e.g. the opponent is inside a disconnect-grace
   * window) — otherwise no timer would ever be re-armed and the clock would sit
   * at zero forever.
   */
  restartTurnClock(): void {
    this.refreshTurnDeadline(false);
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.phase === "finished") {
      return { ok: false, error: "Match over — request a rematch to keep playing" };
    }

    if (move.playerId !== this.turnPlayerId) {
      return { ok: false, error: "Not your turn" };
    }

    if (move.type !== "place") {
      return { ok: false, error: `Invalid move type: ${move.type}` };
    }

    const payload = (move.data ?? move) as Partial<TicTacToeMove>;
    const cellIndex = payload.cellIndex;

    if (cellIndex === undefined || cellIndex < 0 || cellIndex > 8 || !Number.isInteger(cellIndex)) {
      return { ok: false, error: "Invalid cell index (must be 0-8)" };
    }

    if (this.grid[cellIndex] !== null) {
      return { ok: false, error: "Cell is already occupied" };
    }

    const mark = this.playerMarks[move.playerId];
    if (!mark) {
      return { ok: false, error: "Unknown player mark" };
    }

    this.moveCount += 1;
    this.lastEvaporatedCell = null;

    // Quantum Flux Logic: FIFO piece evaporation if queue has 3 pieces
    if (this.options.mode === "quantum") {
      const queue = this.pieceQueues[mark];
      if (queue.length >= 3) {
        const oldestCellIndex = queue.shift();
        if (oldestCellIndex !== undefined) {
          this.grid[oldestCellIndex] = null;
          this.lastEvaporatedCell = oldestCellIndex;
        }
      }
      queue.push(cellIndex);
    }

    // Place the new mark
    this.grid[cellIndex] = {
      mark,
      playerId: move.playerId,
      moveNumber: this.moveCount,
      isExpiring: false,
    };

    // Update isExpiring badges across all cells in Quantum mode
    if (this.options.mode === "quantum") {
      for (const m of ["X", "O"] as const) {
        const q = this.pieceQueues[m];
        for (let i = 0; i < q.length; i++) {
          const idx = q[i];
          const cell = this.grid[idx];
          if (cell) {
            // If the player currently has 3 pieces, their oldest piece (index 0) will evaporate on their next placement
            cell.isExpiring = q.length >= 3 && i === 0;
          }
        }
      }
    }

    // Check for winning lines
    const win = this.checkWin();
    if (win) {
      this.winningLine = win.line;
      this.winnerId = win.winnerId;
      this.phase = "finished";
      this.turnDeadline = null;
      return { ok: true, isOver: true, winnerId: this.winnerId };
    }

    // Check for draw in Classic mode (grid full and no winner)
    if (this.options.mode === "classic" && this.grid.every((c) => c !== null)) {
      this.winningLine = null;
      this.winnerId = "draw";
      this.phase = "finished";
      this.turnDeadline = null;
      return { ok: true, isOver: true, winnerId: null };
    }

    // Next player turn
    const nextPlayerId = this.playerOrder.find((id) => id !== this.turnPlayerId);
    if (!nextPlayerId) {
      throw new Error("Cannot find next player in rotation");
    }

    this.turnPlayerId = nextPlayerId;
    this.refreshTurnDeadline();

    return { ok: true, isOver: false };
  }

  private checkWin(): { line: number[]; winnerId: string } | null {
    for (const line of WINNING_COMBINATIONS) {
      const [a, b, c] = line;
      const cellA = this.grid[a];
      const cellB = this.grid[b];
      const cellC = this.grid[c];

      if (cellA && cellB && cellC && cellA.mark === cellB.mark && cellB.mark === cellC.mark) {
        return {
          line: [a, b, c],
          winnerId: cellA.playerId,
        };
      }
    }
    return null;
  }

  getStateFor(_playerId: string): TicTacToePublicState {
    return this.getPublicState();
  }

  getPublicState(): TicTacToePublicState {
    return {
      kind: "tictactoe",
      phase: this.phase,
      options: { ...this.options },
      playerOrder: [...this.playerOrder],
      playerMarks: { ...this.playerMarks },
      turnPlayerId: this.turnPlayerId,
      grid: this.grid.map((c) => (c ? { ...c } : null)),
      pieceQueues: {
        X: [...this.pieceQueues.X],
        O: [...this.pieceQueues.O],
      },
      winningLine: this.winningLine ? [...this.winningLine] : null,
      winnerId: this.winnerId,
      moveCount: this.moveCount,
      turnDeadline: this.turnDeadline,
      lastEvaporatedCell: this.lastEvaporatedCell,
    };
  }

  isOver(): boolean {
    return this.phase === "finished";
  }

  /**
   * Profile, economy and timeline code read the winner through `getWinnerId`,
   * which prefers this method. A draw must read as "no winner": the public
   * state's `"draw"` marker is a string, and a truthy string that matches no
   * seat made the profile layer record LOSS for both players.
   */
  getWinner(): string | null {
    return this.winnerId === "draw" ? null : this.winnerId;
  }

  removePlayer(playerId: string): void {
    if (this.phase === "finished") return;

    const remaining = this.playerOrder.find((id) => id !== playerId);
    if (remaining) {
      this.phase = "finished";
      this.winnerId = remaining;
      this.turnDeadline = null;
    }
  }

  pendingActors(): string[] {
    if (this.phase !== "playing" || !this.turnPlayerId) {
      return [];
    }
    return [this.turnPlayerId];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.phase !== "playing" || playerId !== this.turnPlayerId) {
      return { ok: false, error: "Not eligible for auto move" };
    }

    const mark = this.playerMarks[playerId];
    const opponentMark: TicTacToeMark = mark === "X" ? "O" : "X";

    // 1. Check if we have an immediate winning move
    const winningMove = this.findWinningMove(mark);
    if (winningMove !== null) {
      return this.applyMove({ playerId, type: "place", data: { cellIndex: winningMove } });
    }

    // 2. Check if opponent has an immediate winning move and block it
    const blockingMove = this.findWinningMove(opponentMark);
    if (blockingMove !== null) {
      return this.applyMove({ playerId, type: "place", data: { cellIndex: blockingMove } });
    }

    // 3. Positional heuristics (Center > Corners > Edges)
    const priority = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    for (const cell of priority) {
      if (this.grid[cell] === null) {
        return this.applyMove({ playerId, type: "place", data: { cellIndex: cell } });
      }
    }

    return { ok: false, error: "No legal moves remaining" };
  }

  private findWinningMove(targetMark: TicTacToeMark): number | null {
    // Determine which cell would vanish for targetMark in Quantum mode if they placed a piece
    const wouldEvaporateCell =
      this.options.mode === "quantum" && this.pieceQueues[targetMark].length >= 3
        ? this.pieceQueues[targetMark][0]
        : null;

    for (let i = 0; i < 9; i++) {
      if (this.grid[i] !== null) continue;

      // Simulate placing mark at cell i
      let createsWin = false;
      for (const line of WINNING_COMBINATIONS) {
        if (!line.includes(i)) continue;

        const otherIndices = line.filter((idx) => idx !== i);
        const cell1 = this.grid[otherIndices[0]];
        const cell2 = this.grid[otherIndices[1]];

        // In quantum mode, if one of the other cells in the line is the one that would evaporate, it cannot form a win!
        if (wouldEvaporateCell !== null && (otherIndices[0] === wouldEvaporateCell || otherIndices[1] === wouldEvaporateCell)) {
          continue;
        }

        if (cell1 && cell2 && cell1.mark === targetMark && cell2.mark === targetMark) {
          createsWin = true;
          break;
        }
      }

      if (createsWin) {
        return i;
      }
    }

    return null;
  }
}
