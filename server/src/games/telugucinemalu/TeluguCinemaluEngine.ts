import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  TeluguCinemaluOptions,
  TeluguCinemaluPhase,
  TeluguCinemaluPlayerPublic,
  TeluguCinemaluPlayerState,
  TeluguCinemaluPublicState,
  TeluguCinemaluQuestion,
  TeluguCinemaluStanding,
} from "@shared/types.js";
import { DEFAULT_TELUGUCINEMALU_OPTIONS } from "@shared/types.js";
import { TELUGUCINEMALU_QUESTIONS } from "./questions.js";

export class TeluguCinemaluEngine implements GameEngine {
  readonly kind = "telugucinemalu" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private opts: TeluguCinemaluOptions = { ...DEFAULT_TELUGUCINEMALU_OPTIONS };
  private pendingOptions: TeluguCinemaluOptions | null = null;

  private seatOrder: string[] = [];
  private isBot = new Set<string>();
  private nameOf = new Map<string, string>();

  private phase: TeluguCinemaluPhase = "playing";
  private round = 1;

  private questionPool: TeluguCinemaluQuestion[] = [];
  private currentQuestion: TeluguCinemaluQuestion | null = null;
  private roundStartTs = 0;

  private selectedIndices = new Map<string, number>();
  private answerTimes = new Map<string, number>();
  private scores = new Map<string, number>();
  private roundWins = new Map<string, number>();
  private roundScores = new Map<string, number>();

  private deadline: number | null = null;
  private isOverFlag = false;
  private winnerId: string | null = null;
  private standings: TeluguCinemaluStanding[] | null = null;

  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<TeluguCinemaluOptions>): void {
    this.pendingOptions = { ...DEFAULT_TELUGUCINEMALU_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Telugu Cinema Quiz requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    this.opts = this.pendingOptions ?? { ...DEFAULT_TELUGUCINEMALU_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.isBot = new Set(players.filter((p) => p.isBot).map((p) => p.id));
    this.nameOf = new Map(players.map((p) => [p.id, p.name]));

    for (const id of this.seatOrder) {
      this.scores.set(id, 0);
      this.roundWins.set(id, 0);
    }
    this.round = 1;
    this.isOverFlag = false;
    this.winnerId = null;
    this.standings = null;

    // Shuffle questions
    this.questionPool = [...TELUGUCINEMALU_QUESTIONS].sort(() => this.rng() - 0.5);

    this.startRound();
  }

  private startRound(): void {
    this.phase = "playing";
    this.selectedIndices.clear();
    this.answerTimes.clear();
    this.roundScores.clear();

    this.currentQuestion = this.questionPool[(this.round - 1) % this.questionPool.length];
    this.roundStartTs = Date.now();
    this.deadline = null;
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
      case "submitAnswer":
        return this.handleSubmitAnswer(pid, (move.data as { optionIndex?: number })?.optionIndex);
      case "nextRound":
        if (this.phase !== "roundSummary") return { ok: false, error: "Not in summary phase" };
        this.advanceAfterSummary();
        return this.result();
      default:
        return { ok: false, error: `Unknown move: ${move.type}` };
    }
  }

  private handleSubmitAnswer(pid: string, optionIndex?: number): MoveResult {
    if (this.phase !== "playing") return { ok: false, error: "Not in playing phase" };
    if (optionIndex == null || optionIndex < 0 || optionIndex > 3) {
      return { ok: false, error: "Invalid option index" };
    }
    if (this.selectedIndices.has(pid)) {
      return { ok: false, error: "Already submitted answer" };
    }

    this.selectedIndices.set(pid, optionIndex);
    this.answerTimes.set(pid, Date.now() - this.roundStartTs);

    if (this.selectedIndices.size === this.seatOrder.length) {
      this.evaluateRound();
    }
    return this.result();
  }

  private evaluateRound(): void {
    if (!this.currentQuestion) return;

    const correct = this.currentQuestion.correctIndex;
    let maxPts = -1;
    let roundWinnerId: string | null = null;

    for (const pid of this.seatOrder) {
      const chosen = this.selectedIndices.get(pid);
      let pts = 0;
      if (chosen === correct) {
        const timeTakenMs = this.answerTimes.get(pid) ?? 10000;
        const totalMs = this.opts.questionSeconds * 1000;
        const remainingRatio = Math.max(0, (totalMs - timeTakenMs) / totalMs);
        const speedBonus = Math.round(remainingRatio * 50);
        pts = 100 + speedBonus;
      }
      this.roundScores.set(pid, pts);
      this.scores.set(pid, (this.scores.get(pid) ?? 0) + pts);

      if (pts > maxPts && pts > 0) {
        maxPts = pts;
        roundWinnerId = pid;
      }
    }

    if (roundWinnerId) {
      this.roundWins.set(roundWinnerId, (this.roundWins.get(roundWinnerId) ?? 0) + 1);
    }

    this.phase = "roundSummary";
    this.deadline = null;
  }

  private advanceAfterSummary(): void {
    if (this.round >= this.opts.totalRounds) {
      this.finalizeGame();
    } else {
      this.round += 1;
      this.startRound();
    }
  }

  private finalizeGame(): void {
    this.standings = this.computeStandings();
    this.winnerId = this.standings[0]?.playerId ?? null;
    this.isOverFlag = true;
    this.phase = "finished";
    this.deadline = null;
  }

  private computeStandings(): TeluguCinemaluStanding[] {
    const rows = this.seatOrder.map((pid) => ({
      playerId: pid,
      score: this.scores.get(pid) ?? 0,
      roundWins: this.roundWins.get(pid) ?? 0,
    }));

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.roundWins - a.roundWins;
    });

    const medals: ("gold" | "silver" | "bronze")[] = ["gold", "silver", "bronze"];
    return rows.map((r, i) => ({ ...r, rank: i, medal: medals[i] ?? null }));
  }

  private result(): MoveResult {
    return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
  }

  private publicPlayers(): TeluguCinemaluPlayerPublic[] {
    return this.seatOrder.map((pid) => ({
      id: pid,
      hasAnswered: this.selectedIndices.has(pid),
      score: this.scores.get(pid) ?? 0,
      roundWins: this.roundWins.get(pid) ?? 0,
    }));
  }

  getPublicState(): TeluguCinemaluPublicState {
    const selectedIndicesObj: Record<string, number> = {};
    const roundScoresObj: Record<string, number> = {};

    if (this.phase === "roundSummary" || this.phase === "finished") {
      for (const pid of this.seatOrder) {
        if (this.selectedIndices.has(pid)) selectedIndicesObj[pid] = this.selectedIndices.get(pid)!;
        if (this.roundScores.has(pid)) roundScoresObj[pid] = this.roundScores.get(pid)!;
      }
    }

    const questionPub = this.currentQuestion
      ? {
          id: this.currentQuestion.id,
          movieTitle: this.currentQuestion.movieTitle,
          dialogue: this.currentQuestion.dialogue,
          prompt: this.currentQuestion.prompt,
          options: this.currentQuestion.options,
          trivia: this.currentQuestion.trivia,
        }
      : null;

    return {
      kind: "telugucinemalu",
      phase: this.phase,
      round: this.round,
      totalRounds: this.opts.totalRounds,
      questionSeconds: this.opts.questionSeconds,
      deadline: this.deadline,
      currentQuestion: questionPub,
      seatOrder: [...this.seatOrder],
      players: this.publicPlayers(),
      selectedIndices: this.phase === "roundSummary" || this.phase === "finished" ? selectedIndicesObj : null,
      correctIndex: this.phase === "roundSummary" || this.phase === "finished" ? (this.currentQuestion?.correctIndex ?? null) : null,
      roundScores: this.phase === "roundSummary" || this.phase === "finished" ? roundScoresObj : null,
      standings: this.standings,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
    };
  }

  getStateFor(playerId: string): TeluguCinemaluPlayerState {
    const pub = this.getPublicState();
    return {
      ...pub,
      mySelectedIndex: this.selectedIndices.get(playerId) ?? null,
    };
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    if (!this.seatOrder.includes(playerId)) return;
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    this.isBot.delete(playerId);
    this.selectedIndices.delete(playerId);

    if (this.seatOrder.length < this.minPlayers) {
      if (!this.isOverFlag && this.seatOrder.length > 0) {
        this.finalizeGame();
      }
    }
  }

  getPhaseTimerSeconds(): number {
    switch (this.phase) {
      case "playing":
        return this.opts.questionSeconds;
      case "roundSummary":
        return 7;
      default:
        return 0;
    }
  }

  armDeadline(totalMs: number): number {
    if (this.deadline == null) this.deadline = Date.now() + totalMs;
    return Math.max(0, this.deadline - Date.now());
  }

  clearDeadline(): void {
    this.deadline = null;
  }

  resolveDeadline(): void {
    if (this.phase === "playing") {
      this.evaluateRound();
    } else if (this.phase === "roundSummary") {
      this.advanceAfterSummary();
    }
  }

  pendingActors(): string[] {
    if (this.phase === "playing") {
      return this.seatOrder.filter((pid) => !this.selectedIndices.has(pid));
    }
    return [];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.phase === "playing" && this.currentQuestion) {
      // Bots pick correct option 85% of the time, else random
      const isCorrect = this.rng() < 0.85;
      const choice = isCorrect
        ? this.currentQuestion.correctIndex
        : Math.floor(this.rng() * 4);
      return this.handleSubmitAnswer(playerId, choice);
    }
    return { ok: false, error: "Nothing to auto-play" };
  }
}
