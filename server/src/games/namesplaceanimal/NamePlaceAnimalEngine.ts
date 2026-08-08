import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  NamePlaceAnimalAnswers,
  NamePlaceAnimalCategory,
  NamePlaceAnimalOptions,
  NamePlaceAnimalPhase,
  NamePlaceAnimalPlayerPublic,
  NamePlaceAnimalPublicState,
  NamePlaceAnimalStanding,
  Player,
} from "@shared/types.js";
import { DEFAULT_NAMESPLACEANIMAL_OPTIONS } from "@shared/types.js";
import { getBotAnswer, validateAnswer } from "./dictionary.js";

const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWYY".split("");

export class NamePlaceAnimalEngine implements GameEngine {
  readonly kind = "namesplaceanimal" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private opts: NamePlaceAnimalOptions = { ...DEFAULT_NAMESPLACEANIMAL_OPTIONS };
  private pendingOptions: NamePlaceAnimalOptions | null = null;

  private seatOrder: string[] = [];
  private isBot = new Set<string>();
  private nameOf = new Map<string, string>();

  private phase: NamePlaceAnimalPhase = "playing";
  private round = 1;
  private currentLetter: string = "A";
  private usedLetters = new Set<string>();

  private answers = new Map<string, NamePlaceAnimalAnswers>();
  private usedCluesMap = new Map<string, Set<NamePlaceAnimalCategory>>();
  private submitted = new Set<string>();
  private stoppedByPlayerId: string | null = null;

  private scores = new Map<string, number>();
  private roundWins = new Map<string, number>();
  private roundCategoryScores = new Map<string, Record<NamePlaceAnimalCategory, number>>();
  private roundScores = new Map<string, number>();

  private deadline: number | null = null;
  private isOverFlag = false;
  private winnerId: string | null = null;
  private standings: NamePlaceAnimalStanding[] | null = null;

  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<NamePlaceAnimalOptions>): void {
    const merged = { ...DEFAULT_NAMESPLACEANIMAL_OPTIONS, ...opts };
    if (opts.difficulty && !opts.roundSeconds) {
      merged.roundSeconds = opts.difficulty === "easy" ? 45 : opts.difficulty === "hard" ? 20 : 30;
    }
    this.pendingOptions = merged;
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Name Place Animal Thing requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    this.opts = this.pendingOptions ?? { ...DEFAULT_NAMESPLACEANIMAL_OPTIONS };
    this.seatOrder = players.map((p) => p.id);
    this.isBot = new Set(players.filter((p) => p.isBot).map((p) => p.id));
    this.nameOf = new Map(players.map((p) => [p.id, p.name]));

    for (const id of this.seatOrder) {
      this.scores.set(id, 0);
      this.roundWins.set(id, 0);
    }
    this.round = 1;
    this.usedLetters.clear();
    this.isOverFlag = false;
    this.winnerId = null;
    this.standings = null;

    this.startRound();
  }

  private pickLetter(): string {
    const available = LETTERS.filter((l) => !this.usedLetters.has(l));
    const pool = available.length > 0 ? available : LETTERS;
    const picked = pool[Math.floor(this.rng() * pool.length)];
    this.usedLetters.add(picked);
    return picked;
  }

  private startRound(): void {
    this.currentLetter = this.pickLetter();
    this.phase = "playing";
    this.answers.clear();
    this.usedCluesMap.clear();
    this.submitted.clear();
    this.stoppedByPlayerId = null;
    this.deadline = Date.now() + (this.opts.roundSeconds || 30) * 1000;
    this.roundCategoryScores.clear();
    this.roundScores.clear();
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
      case "requestClue":
        return this.handleRequestClue(pid, (move.data as { category?: NamePlaceAnimalCategory })?.category);
      case "submitAnswers":
        return this.handleSubmitAnswers(pid, move.data as NamePlaceAnimalAnswers);
      case "stopClock":
        return this.handleStopClock(pid);
      case "nextRound":
        if (this.phase !== "roundSummary") return { ok: false, error: "Not in summary phase" };
        this.advanceAfterSummary();
        return this.result();
      default:
        return { ok: false, error: `Unknown move: ${move.type}` };
    }
  }

  private handleRequestClue(pid: string, category?: NamePlaceAnimalCategory): MoveResult {
    if (this.phase !== "playing") return { ok: false, error: "Not in playing phase" };
    if (!category || !["name", "place", "animal", "thing"].includes(category)) {
      return { ok: false, error: "Invalid category for clue" };
    }
    let set = this.usedCluesMap.get(pid);
    if (!set) {
      set = new Set();
      this.usedCluesMap.set(pid, set);
    }
    set.add(category);
    return this.result();
  }

  private handleSubmitAnswers(pid: string, data: NamePlaceAnimalAnswers | undefined): MoveResult {
    if (this.phase !== "playing") return { ok: false, error: "Not in playing phase" };
    const ans: NamePlaceAnimalAnswers = {
      name: (data?.name ?? "").trim(),
      place: (data?.place ?? "").trim(),
      animal: (data?.animal ?? "").trim(),
      thing: (data?.thing ?? "").trim(),
    };
    this.answers.set(pid, ans);
    if (data?.usedClues && Array.isArray(data.usedClues)) {
      let set = this.usedCluesMap.get(pid);
      if (!set) {
        set = new Set();
        this.usedCluesMap.set(pid, set);
      }
      for (const cat of data.usedClues) {
        set.add(cat);
      }
    }
    this.submitted.add(pid);

    if (this.submitted.size === this.seatOrder.length) {
      this.evaluateRound();
    }
    return this.result();
  }

  private handleStopClock(pid: string): MoveResult {
    if (this.phase !== "playing") return { ok: false, error: "Not in playing phase" };
    const ans = this.answers.get(pid);
    if (!ans || !ans.name || !ans.place || !ans.animal || !ans.thing) {
      return { ok: false, error: "Fill all four categories before calling STOP!" };
    }
    this.stoppedByPlayerId = pid;
    // Accelerate deadline to 5 seconds if more than 5s left
    const fiveSecMs = 5000;
    if (this.deadline != null && this.deadline - Date.now() > fiveSecMs) {
      this.deadline = Date.now() + fiveSecMs;
    }
    return this.result();
  }

  private evaluateRound(): void {
    const categories: NamePlaceAnimalCategory[] = ["name", "place", "animal", "thing"];

    // Compute validity for every category and player
    const validMap = new Map<string, Record<NamePlaceAnimalCategory, boolean>>();
    for (const pid of this.seatOrder) {
      const ans = this.answers.get(pid) ?? { name: "", place: "", animal: "", thing: "" };
      validMap.set(pid, {
        name: validateAnswer("name", this.currentLetter, ans.name),
        place: validateAnswer("place", this.currentLetter, ans.place),
        animal: validateAnswer("animal", this.currentLetter, ans.animal),
        thing: validateAnswer("thing", this.currentLetter, ans.thing),
      });
    }

    // Score per category:
    // Correct answer without clue = 10 pts
    // Correct answer WITH clue for category = 5 pts (50% reduction)
    // Invalid / empty = 0 pts
    for (const cat of categories) {
      for (const pid of this.seatOrder) {
        const isValid = validMap.get(pid)![cat];
        const usedClue = this.usedCluesMap.get(pid)?.has(cat) ?? false;
        let pts = 0;
        if (isValid) {
          pts = usedClue ? 5 : 10;
        }

        const catScores = this.roundCategoryScores.get(pid) ?? { name: 0, place: 0, animal: 0, thing: 0 };
        catScores[cat] = pts;
        this.roundCategoryScores.set(pid, catScores);
      }
    }

    // Sum total round score per player
    let maxRoundScore = -1;
    let roundWinnerId: string | null = null;
    for (const pid of this.seatOrder) {
      const catScores = this.roundCategoryScores.get(pid)!;
      const total = catScores.name + catScores.place + catScores.animal + catScores.thing;
      this.roundScores.set(pid, total);
      this.scores.set(pid, (this.scores.get(pid) ?? 0) + total);
      if (total > maxRoundScore) {
        maxRoundScore = total;
        roundWinnerId = pid;
      }
    }

    if (roundWinnerId && maxRoundScore > 0) {
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

  private computeStandings(): NamePlaceAnimalStanding[] {
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

  private publicPlayers(): NamePlaceAnimalPlayerPublic[] {
    return this.seatOrder.map((pid) => ({
      id: pid,
      hasSubmitted: this.submitted.has(pid),
      score: this.scores.get(pid) ?? 0,
      roundWins: this.roundWins.get(pid) ?? 0,
    }));
  }

  getCategoriesForRound(): string[] {
    const pack = this.opts.themePack ?? "classic";
    switch (pack) {
      case "popculture":
        return ["Movie", "Actor", "Song", "Brand"];
      case "foodie":
        return ["Dish", "Fruit/Veggie", "Drink", "Snack"];
      case "school":
        return ["Country", "Capital", "Element", "Figure"];
      case "random": {
        const pools = [
          ["Movie", "Actor", "Song", "Brand"],
          ["Dish", "Fruit/Veggie", "Drink", "Snack"],
          ["Country", "Capital", "Element", "Figure"],
          ["Name", "Place", "Animal", "Thing"],
        ];
        return pools[(this.round - 1) % pools.length];
      }
      default:
        return ["Name", "Place", "Animal", "Thing"];
    }
  }

  getPublicState(): NamePlaceAnimalPublicState {
    const allAnswersObj: Record<string, NamePlaceAnimalAnswers> = {};
    for (const [pid, ans] of this.answers.entries()) {
      allAnswersObj[pid] = ans;
    }

    const catScoresObj: Record<string, Record<NamePlaceAnimalCategory, number>> = {};
    for (const [pid, cs] of this.roundCategoryScores.entries()) {
      catScoresObj[pid] = cs;
    }

    const roundScoresObj: Record<string, number> = {};
    for (const [pid, rs] of this.roundScores.entries()) {
      roundScoresObj[pid] = rs;
    }

    return {
      kind: "namesplaceanimal",
      phase: this.phase,
      letter: this.currentLetter,
      round: this.round,
      totalRounds: this.opts.totalRounds,
      roundSeconds: this.opts.roundSeconds,
      deadline: this.deadline,
      seatOrder: [...this.seatOrder],
      players: this.publicPlayers(),
      allAnswers: this.phase === "roundSummary" || this.phase === "finished" ? allAnswersObj : null,
      categoryScores: this.phase === "roundSummary" || this.phase === "finished" ? catScoresObj : null,
      roundScores: this.phase === "roundSummary" || this.phase === "finished" ? roundScoresObj : null,
      standings: this.standings,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
      stoppedByPlayerId: this.stoppedByPlayerId,
      categories: this.getCategoriesForRound(),
      themePack: this.opts.themePack ?? "classic",
    };
  }

  getStateFor(playerId: string): unknown {
    const pub = this.getPublicState();
    const myAns = this.answers.get(playerId) ?? { name: "", place: "", animal: "", thing: "" };
    return {
      ...pub,
      myAnswers: myAns,
    };
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    if (!this.seatOrder.includes(playerId)) return;
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    this.isBot.delete(playerId);
    this.answers.delete(playerId);
    this.submitted.delete(playerId);

    if (this.seatOrder.length < this.minPlayers) {
      if (!this.isOverFlag && this.seatOrder.length > 0) {
        this.finalizeGame();
      }
    }
  }

  getPhaseTimerSeconds(): number {
    switch (this.phase) {
      case "playing":
        return this.opts.roundSeconds;
      case "roundSummary":
        return 10;
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
      // Auto-submit for anyone who hasn't submitted
      for (const pid of this.seatOrder) {
        if (!this.submitted.has(pid)) {
          if (!this.answers.has(pid)) {
            this.answers.set(pid, { name: "", place: "", animal: "", thing: "" });
          }
          this.submitted.add(pid);
        }
      }
      this.evaluateRound();
    } else if (this.phase === "roundSummary") {
      this.advanceAfterSummary();
    }
  }

  pendingActors(): string[] {
    if (this.phase === "playing") {
      return this.seatOrder.filter((pid) => !this.submitted.has(pid));
    }
    return [];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.phase === "playing") {
      const existing = this.answers.get(playerId) ?? { name: "", place: "", animal: "", thing: "" };
      const diff = this.opts.difficulty ?? "medium";
      const chance = diff === "easy" ? 0.55 : diff === "hard" ? 0.95 : 0.75;
      const botAnswers: NamePlaceAnimalAnswers = {
        name: existing.name || (this.rng() < chance ? getBotAnswer("name", this.currentLetter) : ""),
        place: existing.place || (this.rng() < chance ? getBotAnswer("place", this.currentLetter) : ""),
        animal: existing.animal || (this.rng() < chance ? getBotAnswer("animal", this.currentLetter) : ""),
        thing: existing.thing || (this.rng() < chance ? getBotAnswer("thing", this.currentLetter) : ""),
      };
      return this.handleSubmitAnswers(playerId, botAnswers);
    }
    return { ok: false, error: "Nothing to auto-play" };
  }
}
