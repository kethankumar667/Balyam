import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  TcDifficulty,
  TcRole,
  TcRoundKind,
  TeluguCinemaluOptions,
  TeluguCinemaluPersonCard,
  TeluguCinemaluPersonality,
  TeluguCinemaluPhase,
  TeluguCinemaluPlayerPublic,
  TeluguCinemaluPlayerState,
  TeluguCinemaluPublicState,
  TeluguCinemaluQuestion,
  TeluguCinemaluRoundResult,
  TeluguCinemaluSet,
  TeluguCinemaluStanding,
} from "@shared/types.js";
import {
  DEFAULT_TELUGUCINEMALU_OPTIONS,
  TC_DIFFICULTY_POINTS,
  TC_ROUND_PLAN,
  TC_TOTAL_QUESTIONS,
} from "@shared/types.js";
import { TELUGUCINEMALU_PERSONALITIES } from "./personalities.js";
import { TELUGUCINEMALU_SETS } from "./sets.js";

/**
 * Four-round Telugu cinema quiz.
 *
 *   roleSelection   pick Hero / Heroine / Director / Music Director
 *   personSelection pick one of the shuffled name cards for that role
 *   playing         answer the current question
 *   questionSummary reveal the answer, the points and any trivia
 *   roundSummary    round tally, then on to the next round
 *
 * Rounds 2-4 are drawn from a single randomly chosen set so that questions
 * within one game never give each other away.
 */
export class TeluguCinemaluEngine implements GameEngine {
  readonly kind = "telugucinemalu" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 1;

  private opts: TeluguCinemaluOptions = { ...DEFAULT_TELUGUCINEMALU_OPTIONS };
  private pendingOptions: TeluguCinemaluOptions | null = null;

  private seatOrder: string[] = [];
  private isBot = new Set<string>();

  private phase: TeluguCinemaluPhase = "roleSelection";
  private selectedRole: TcRole | null = null;
  private personChoices: TeluguCinemaluPersonality[] = [];
  private selectedPerson: TeluguCinemaluPersonality | null = null;

  /** Flattened plan: one entry per question, in play order. */
  private plan: { round: number; kind: TcRoundKind; question: TeluguCinemaluQuestion }[] = [];
  private cursor = 0;

  private selectedIndices = new Map<string, number>();
  private lastAwarded = new Map<string, number>();
  private scores = new Map<string, number>();
  private correctCounts = new Map<string, number>();
  private streaks = new Map<string, number>();
  private roundResults: TeluguCinemaluRoundResult[] = [];
  /** Accumulators for the round in progress, folded into `roundResults` when
   *  the round's last question is dismissed. Solo game, so one seat's tally
   *  is the round's tally. */
  private roundCorrect = 0;
  private roundPoints = 0;

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

    for (const id of this.seatOrder) {
      this.scores.set(id, 0);
      this.correctCounts.set(id, 0);
      this.streaks.set(id, 0);
    }

    this.phase = "roleSelection";
    this.selectedRole = null;
    this.personChoices = [];
    this.selectedPerson = null;
    this.plan = [];
    this.cursor = 0;
    this.roundResults = [];
    this.selectedIndices.clear();
    this.lastAwarded.clear();
    this.isOverFlag = false;
    this.winnerId = null;
    this.standings = null;
    this.deadline = null;
  }

  private shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /**
   * Draws one question per difficulty slot in `mix`, never repeating a question
   * within the round. If a pool is short of a given difficulty the slot falls
   * back to any unused question, so a thin pool degrades to a shorter ladder
   * rather than throwing mid-game.
   */
  private pickByMix(
    pool: readonly TeluguCinemaluQuestion[],
    mix: readonly TcDifficulty[]
  ): TeluguCinemaluQuestion[] {
    const remaining = this.shuffle(pool);
    const used = new Set<string>();
    const picked: TeluguCinemaluQuestion[] = [];

    for (const want of mix) {
      let q = remaining.find((c) => !used.has(c.id) && c.difficulty === want);
      if (!q) q = remaining.find((c) => !used.has(c.id));
      if (!q) break;
      used.add(q.id);
      picked.push(q);
    }
    return picked;
  }

  private buildPlan(person: TeluguCinemaluPersonality, set: TeluguCinemaluSet): void {
    const byKind: Record<TcRoundKind, readonly TeluguCinemaluQuestion[]> = {
      personality: person.questions,
      narration: set.narration,
      dialogue: set.dialogue,
      combination: set.combination,
    };

    this.plan = [];
    TC_ROUND_PLAN.forEach((spec, i) => {
      for (const q of this.pickByMix(byKind[spec.kind], spec.mix)) {
        this.plan.push({ round: i + 1, kind: spec.kind, question: q });
      }
    });
    this.cursor = 0;
  }

  private current(): { round: number; kind: TcRoundKind; question: TeluguCinemaluQuestion } | null {
    return this.plan[this.cursor] ?? null;
  }

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    if (!this.seatOrder.includes(pid)) return { ok: false, error: "Not a player in this game" };
    if (this.isOverFlag) return { ok: false, error: "Game is over" };

    switch (move.type) {
      case "selectRole":
        return this.handleSelectRole((move.data as { role?: TcRole })?.role);
      case "selectPerson":
        return this.handleSelectPerson((move.data as { personId?: string })?.personId);
      case "submitAnswer":
        return this.handleSubmitAnswer(pid, (move.data as { optionIndex?: number })?.optionIndex);
      case "next":
        return this.handleNext();
      default:
        return { ok: false, error: `Unknown move: ${move.type}` };
    }
  }

  private handleSelectRole(role?: TcRole): MoveResult {
    if (this.phase !== "roleSelection") return { ok: false, error: "Not in role selection" };
    if (!role) return { ok: false, error: "Role is required" };

    const forRole = TELUGUCINEMALU_PERSONALITIES.filter((p) => p.role === role);
    if (forRole.length === 0) return { ok: false, error: `No personalities for role ${role}` };

    this.selectedRole = role;
    this.personChoices = this.shuffle(forRole).slice(
      0,
      Math.max(1, Math.min(this.opts.personChoiceCount, forRole.length))
    );
    this.phase = "personSelection";
    this.deadline = null;
    return this.result();
  }

  private handleSelectPerson(personId?: string): MoveResult {
    if (this.phase !== "personSelection") return { ok: false, error: "Not in person selection" };
    const person = this.personChoices.find((p) => p.id === personId);
    if (!person) return { ok: false, error: "That person was not offered" };

    const set = this.shuffle(TELUGUCINEMALU_SETS)[0];
    if (!set) return { ok: false, error: "No question sets available" };

    this.selectedPerson = person;
    this.buildPlan(person, set);
    if (this.plan.length === 0) return { ok: false, error: "Could not build a question plan" };

    this.phase = "playing";
    this.selectedIndices.clear();
    this.lastAwarded.clear();
    this.deadline = null;
    return this.result();
  }

  private handleSubmitAnswer(pid: string, optionIndex?: number): MoveResult {
    if (this.phase !== "playing") return { ok: false, error: "Not in playing phase" };
    const entry = this.current();
    if (!entry) return { ok: false, error: "No current question" };
    if (optionIndex == null || optionIndex < 0 || optionIndex >= entry.question.options.length) {
      return { ok: false, error: "Invalid option index" };
    }
    if (this.selectedIndices.has(pid)) return { ok: false, error: "Already answered" };

    this.selectedIndices.set(pid, optionIndex);
    if (this.selectedIndices.size >= this.seatOrder.length) this.revealQuestion();
    return this.result();
  }

  /** Scores the current question and moves to the reveal. */
  private revealQuestion(): void {
    const entry = this.current();
    if (!entry) return;

    for (const pid of this.seatOrder) {
      const chosen = this.selectedIndices.get(pid);
      const right = chosen === entry.question.correctIndex;
      // A miss scores zero rather than going negative: the difficulty ladder
      // already separates players, and negative marking on a 150-point extreme
      // question would swing a whole round on one guess.
      const pts = right ? TC_DIFFICULTY_POINTS[entry.question.difficulty] : 0;

      this.lastAwarded.set(pid, pts);
      this.scores.set(pid, (this.scores.get(pid) ?? 0) + pts);
      if (right) {
        this.correctCounts.set(pid, (this.correctCounts.get(pid) ?? 0) + 1);
        this.streaks.set(pid, (this.streaks.get(pid) ?? 0) + 1);
      } else {
        this.streaks.set(pid, 0);
      }

      if (pid === this.seatOrder[0]) {
        if (right) this.roundCorrect += 1;
        this.roundPoints += pts;
      }
    }

    this.phase = "questionSummary";
    this.deadline = null;
  }

  private handleNext(): MoveResult {
    if (this.phase === "questionSummary") {
      // Both of these must be read BEFORE the cursor moves: afterwards
      // `plan[cursor]` is the next round's first question, so the tally would
      // be filed against the wrong round.
      const finished = this.plan[this.cursor];
      const wasLastOfRound = this.isLastQuestionOfRound();

      this.cursor += 1;
      this.selectedIndices.clear();

      if (wasLastOfRound && finished) this.recordRound(finished.round, finished.kind);

      if (this.cursor >= this.plan.length) {
        this.finalizeGame();
      } else if (wasLastOfRound) {
        this.phase = "roundSummary";
      } else {
        this.phase = "playing";
      }
      this.deadline = null;
      return this.result();
    }

    if (this.phase === "roundSummary") {
      this.phase = "playing";
      this.lastAwarded.clear();
      this.deadline = null;
      return this.result();
    }

    return { ok: false, error: "Nothing to advance" };
  }

  private isLastQuestionOfRound(): boolean {
    const here = this.plan[this.cursor];
    const next = this.plan[this.cursor + 1];
    if (!here) return false;
    return !next || next.round !== here.round;
  }

  /** Files the tally for a completed round and resets the accumulators. */
  private recordRound(round: number, kind: TcRoundKind): void {
    if (this.roundResults.some((r) => r.kind === kind)) return;
    this.roundResults.push({
      kind,
      correct: this.roundCorrect,
      asked: this.plan.filter((p) => p.round === round).length,
      points: this.roundPoints,
    });
    this.roundCorrect = 0;
    this.roundPoints = 0;
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
      correctCount: this.correctCounts.get(pid) ?? 0,
    }));
    rows.sort((a, b) =>
      b.score !== a.score ? b.score - a.score : b.correctCount - a.correctCount
    );
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
      correctCount: this.correctCounts.get(pid) ?? 0,
      streak: this.streaks.get(pid) ?? 0,
    }));
  }

  private personCards(): TeluguCinemaluPersonCard[] {
    return this.personChoices.map((p) => ({ id: p.id, name: p.name, knownFor: p.knownFor }));
  }

  getPublicState(): TeluguCinemaluPublicState {
    const entry = this.current();
    const revealed = this.phase === "questionSummary" || this.phase === "roundSummary" || this.phase === "finished";

    const inRound = entry ? this.plan.filter((p) => p.round === entry.round) : [];
    const positionInRound = entry ? inRound.findIndex((p) => p.question.id === entry.question.id) + 1 : 0;

    // The answer is withheld until the reveal. Shipping the whole plan up
    // front would put every correct index in the client bundle's memory.
    const questionPub = entry
      ? {
          id: entry.question.id,
          difficulty: entry.question.difficulty,
          prompt: entry.question.prompt,
          body: entry.question.body,
          options: entry.question.options,
          trivia: revealed ? entry.question.trivia : undefined,
        }
      : null;

    const selectedObj: Record<string, number> = {};
    const awardedObj: Record<string, number> = {};
    if (revealed) {
      for (const pid of this.seatOrder) {
        const s = this.selectedIndices.get(pid);
        if (s != null) selectedObj[pid] = s;
        const a = this.lastAwarded.get(pid);
        if (a != null) awardedObj[pid] = a;
      }
    }

    return {
      kind: "telugucinemalu",
      phase: this.phase,
      round: entry?.round ?? (this.isOverFlag ? TC_ROUND_PLAN.length : 1),
      roundKind: entry?.kind ?? TC_ROUND_PLAN[0].kind,
      totalRounds: TC_ROUND_PLAN.length,
      questionInRound: positionInRound,
      questionsInRound: inRound.length,
      questionsAnswered: this.cursor,
      totalQuestions: TC_TOTAL_QUESTIONS,
      questionSeconds: this.opts.questionSeconds,
      deadline: this.deadline,
      selectedRole: this.selectedRole,
      selectedPersonName: this.selectedPerson?.name ?? null,
      personChoices: this.phase === "personSelection" ? this.personCards() : null,
      currentQuestion: questionPub,
      seatOrder: [...this.seatOrder],
      players: this.publicPlayers(),
      selectedIndices: revealed ? selectedObj : null,
      correctIndex: revealed ? entry?.question.correctIndex ?? null : null,
      lastAwarded: revealed ? awardedObj : null,
      roundResults: [...this.roundResults],
      standings: this.standings,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
    };
  }

  getStateFor(playerId: string): TeluguCinemaluPlayerState {
    return { ...this.getPublicState(), mySelectedIndex: this.selectedIndices.get(playerId) ?? null };
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    if (!this.seatOrder.includes(playerId)) return;
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    this.isBot.delete(playerId);
    this.selectedIndices.delete(playerId);
    if (this.seatOrder.length < this.minPlayers && !this.isOverFlag) {
      this.finalizeGame();
    }
  }

  getPhaseTimerSeconds(): number {
    switch (this.phase) {
      case "playing":
        return this.opts.questionSeconds;
      case "questionSummary":
        return 6;
      case "roundSummary":
        return 8;
      default:
        // Role and person selection are deliberately untimed — the player is
        // choosing what the whole first round will be about.
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
      this.revealQuestion();
    } else if (this.phase === "questionSummary" || this.phase === "roundSummary") {
      this.handleNext();
    }
  }

  pendingActors(): string[] {
    if (this.phase === "playing") {
      return this.seatOrder.filter((pid) => !this.selectedIndices.has(pid));
    }
    return [];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.phase === "roleSelection") return this.handleSelectRole("hero");
    if (this.phase === "personSelection") {
      return this.handleSelectPerson(this.personChoices[0]?.id);
    }
    if (this.phase === "playing") {
      const entry = this.current();
      if (!entry) return { ok: false, error: "Nothing to auto-play" };
      const right = this.rng() < 0.7;
      const choice = right
        ? entry.question.correctIndex
        : Math.floor(this.rng() * entry.question.options.length);
      return this.handleSubmitAnswer(playerId, choice);
    }
    return { ok: false, error: "Nothing to auto-play" };
  }
}
