import { Chess } from "chess.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  ChessBoardTheme,
  ChessMoveRecord,
  ChessOptions,
  ChessPieceColor,
  ChessPieceSet,
  ChessPublicState,
  Player,
} from "@shared/types.js";
import { DEFAULT_CHESS_OPTIONS } from "@shared/types.js";

export class ChessEngine implements GameEngine {
  readonly kind = "chess" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private opts: ChessOptions = { ...DEFAULT_CHESS_OPTIONS };
  private pendingOptions: ChessOptions | null = null;

  private chess: Chess = new Chess();
  private whitePlayerId: string | null = null;
  private blackPlayerId: string | null = null;

  private whiteTimeMs = 180000;
  private blackTimeMs = 180000;
  private lastMoveTimestamp: number | null = null;

  private historyRecords: ChessMoveRecord[] = [];
  private lastMove: { from: string; to: string } | null = null;
  private drawOfferedBy: string | null = null;
  private isFinished = false;
  private winnerId: string | null = null;
  private drawReason: string | null = null;

  setOptions(opts: Partial<ChessOptions>): void {
    this.pendingOptions = { ...DEFAULT_CHESS_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_CHESS_OPTIONS };
    this.chess = new Chess();

    this.whitePlayerId = players[0]?.id ?? null;
    this.blackPlayerId = players[1]?.id ?? null;

    const initialMs = (this.opts.initialSeconds ?? 180) * 1000;
    this.whiteTimeMs = initialMs;
    this.blackTimeMs = initialMs;
    this.lastMoveTimestamp = Date.now();

    this.historyRecords = [];
    this.lastMove = null;
    this.drawOfferedBy = null;
    this.isFinished = false;
    this.winnerId = null;
    this.drawReason = null;
  }

  private updateClocks(): void {
    if (this.isFinished || !this.lastMoveTimestamp) return;

    const now = Date.now();
    const elapsed = now - this.lastMoveTimestamp;
    this.lastMoveTimestamp = now;

    if (this.chess.turn() === "w") {
      this.whiteTimeMs = Math.max(0, this.whiteTimeMs - elapsed);
      if (this.whiteTimeMs === 0) {
        this.isFinished = true;
        this.winnerId = this.blackPlayerId;
        this.drawReason = "White ran out of time";
      }
    } else {
      this.blackTimeMs = Math.max(0, this.blackTimeMs - elapsed);
      if (this.blackTimeMs === 0) {
        this.isFinished = true;
        this.winnerId = this.whitePlayerId;
        this.drawReason = "Black ran out of time";
      }
    }
  }

  applyMove(moveContext: MoveContext): MoveResult {
    if (this.isFinished) return { ok: false, error: "Game is finished" };
    this.updateClocks();
    if (this.isFinished) return { ok: true, isOver: true, winnerId: this.winnerId };

    const { playerId, type, data } = moveContext;

    if (type === "resign") {
      this.isFinished = true;
      this.winnerId = playerId === this.whitePlayerId ? this.blackPlayerId : this.whitePlayerId;
      this.drawReason = "Resignation";
      return { ok: true, isOver: true, winnerId: this.winnerId };
    }

    if (type === "offerDraw") {
      this.drawOfferedBy = playerId;
      return { ok: true };
    }

    if (type === "acceptDraw") {
      if (this.drawOfferedBy && this.drawOfferedBy !== playerId) {
        this.isFinished = true;
        this.winnerId = null;
        this.drawReason = "Draw agreed by mutual consent";
        return { ok: true, isOver: true, winnerId: null };
      }
      return { ok: false, error: "No draw offered" };
    }

    if (type === "setOptions") {
      const optData = data as Partial<ChessOptions>;
      if (optData.boardTheme) this.opts.boardTheme = optData.boardTheme;
      if (optData.pieceSet) this.opts.pieceSet = optData.pieceSet;
      return { ok: true };
    }

    // Verify turn
    const turnColor = this.chess.turn(); // "w" | "b"
    const expectedPlayerId = turnColor === "w" ? this.whitePlayerId : this.blackPlayerId;
    if (playerId !== expectedPlayerId) {
      return { ok: false, error: "Not your turn" };
    }

    if (type === "move") {
      const { from, to, promotion } = (data as { from?: string; to?: string; promotion?: string }) ?? {};
      if (!from || !to) return { ok: false, error: "Invalid move squares" };

      try {
        const result = this.chess.move({
          from,
          to,
          promotion: promotion ?? "q",
        });

        if (!result) return { ok: false, error: "Illegal chess move" };

        // Add clock increment
        const incMs = (this.opts.incrementSeconds ?? 0) * 1000;
        if (turnColor === "w") {
          this.whiteTimeMs += incMs;
        } else {
          this.blackTimeMs += incMs;
        }
        this.lastMoveTimestamp = Date.now();
        this.lastMove = { from: result.from, to: result.to };
        this.drawOfferedBy = null;

        // Record history
        this.historyRecords.push({
          from: result.from,
          to: result.to,
          san: result.san,
          piece: result.piece,
          captured: result.captured,
          promotion: result.promotion,
          fen: this.chess.fen(),
        });

        // Check endgame conditions
        if (this.chess.isCheckmate()) {
          this.isFinished = true;
          this.winnerId = turnColor === "w" ? this.whitePlayerId : this.blackPlayerId;
          this.drawReason = "Checkmate";
        } else if (this.chess.isStalemate()) {
          this.isFinished = true;
          this.winnerId = null;
          this.drawReason = "Stalemate";
        } else if (this.chess.isThreefoldRepetition()) {
          this.isFinished = true;
          this.winnerId = null;
          this.drawReason = "Draw by 3-fold repetition";
        } else if (this.chess.isInsufficientMaterial()) {
          this.isFinished = true;
          this.winnerId = null;
          this.drawReason = "Draw by insufficient material";
        } else if (this.chess.isDraw()) {
          this.isFinished = true;
          this.winnerId = null;
          this.drawReason = "Draw by 50-move rule";
        }

        return { ok: true, isOver: this.isFinished, winnerId: this.winnerId };
      } catch {
        return { ok: false, error: "Illegal move" };
      }
    }

    return { ok: false, error: `Unknown move type: ${type}` };
  }

  pendingActors(): string[] {
    if (this.isFinished) return [];
    this.updateClocks();
    if (this.isFinished) return [];

    const actor = this.chess.turn() === "w" ? this.whitePlayerId : this.blackPlayerId;
    return actor ? [actor] : [];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.isFinished) return { ok: false, error: "Finished" };

    const legalMoves = this.chess.moves({ verbose: true });
    if (legalMoves.length === 0) return { ok: false, error: "No legal moves" };

    const diff = this.opts.botDifficulty ?? "medium";

    let chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];

    if (diff === "medium" || diff === "master") {
      // Prioritize captures and checks
      const priorityMoves = legalMoves.filter((m) => m.captured || m.san.includes("+") || m.san.includes("#"));
      if (priorityMoves.length > 0) {
        chosenMove = priorityMoves[Math.floor(Math.random() * priorityMoves.length)];
      }
    }

    return this.applyMove({
      playerId,
      type: "move",
      data: {
        from: chosenMove.from,
        to: chosenMove.to,
        promotion: chosenMove.promotion ?? "q",
      },
    });
  }

  private getCapturedPieces(): { white: string[]; black: string[] } {
    const initialCounts: Record<string, number> = {
      p: 8, n: 2, b: 2, r: 2, q: 1,
    };

    const currentWhiteCounts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBlackCounts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    const board = this.chess.board();
    for (const row of board) {
      for (const sq of row) {
        if (sq) {
          if (sq.color === "w" && sq.type in currentWhiteCounts) {
            currentWhiteCounts[sq.type]++;
          } else if (sq.color === "b" && sq.type in currentBlackCounts) {
            currentBlackCounts[sq.type]++;
          }
        }
      }
    }

    const capturedByWhite: string[] = []; // Black pieces lost
    const capturedByBlack: string[] = []; // White pieces lost

    for (const type of ["q", "r", "b", "n", "p"]) {
      const lostBlack = Math.max(0, initialCounts[type] - currentBlackCounts[type]);
      for (let i = 0; i < lostBlack; i++) capturedByWhite.push(type);

      const lostWhite = Math.max(0, initialCounts[type] - currentWhiteCounts[type]);
      for (let i = 0; i < lostWhite; i++) capturedByBlack.push(type);
    }

    return { white: capturedByWhite, black: capturedByBlack };
  }

  getPublicState(): ChessPublicState {
    this.updateClocks();

    return {
      kind: "chess",
      phase: this.isFinished ? "finished" : "aiming",
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      whitePlayerId: this.whitePlayerId,
      blackPlayerId: this.blackPlayerId,
      whiteTimeRemainingMs: this.whiteTimeMs,
      blackTimeRemainingMs: this.blackTimeMs,
      turnDeadline: null,
      inCheck: this.chess.inCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      drawReason: this.drawReason,
      history: [...this.historyRecords],
      lastMove: this.lastMove,
      capturedPieces: this.getCapturedPieces(),
      boardTheme: this.opts.boardTheme ?? "emerald",
      pieceSet: this.opts.pieceSet ?? "neo",
      isOver: this.isFinished,
      winnerId: this.winnerId,
    };
  }

  getStateFor(_playerId: string): ChessPublicState {
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.isFinished;
  }

  /**
   * A player left for good. Chess seats exactly two, so there is no game
   * left to play: the board is decided in favour of whoever is still here.
   *
   * RoomManager only calls this once the grace window has expired AND another
   * human remains, so this is a genuine forfeit rather than a dropped
   * connection. A disconnect inside the window is handled by the takeover
   * path instead, and the seat is given straight back on reconnect.
   */
  removePlayer(playerId: string): void {
    if (this.isFinished) return;
    if (playerId !== this.whitePlayerId && playerId !== this.blackPlayerId) return;
    this.isFinished = true;
    this.winnerId =
      playerId === this.whitePlayerId ? this.blackPlayerId : this.whitePlayerId;
    // A forfeit is not a draw; leave drawReason alone so the result reads as
    // a win rather than an agreed half point.
    this.lastMoveTimestamp = null;
  }

  armDeadline(): number { return 0; }
  clearDeadline(): void {}
  resolveDeadline(): void {
    const actor = this.pendingActors()[0];
    if (actor) this.applyAutoMove(actor);
  }
}
