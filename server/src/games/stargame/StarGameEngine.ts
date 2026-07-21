import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  StarActivityEntry,
  StarCard,
  StarGameOptions,
  StarPhase,
  StarPlayerPublic,
  StarPublicState,
  StarRoundResult,
  StarStanding,
} from "@shared/types.js";
import { DEFAULT_STARGAME_OPTIONS } from "@shared/types.js";
import { getStarTheme } from "@shared/star-themes.js";
import { keyBetween } from "@shared/frac-index.js";

const TOKENS_PER_VALUE = 4;
const ACTIVITY_CAP = 80;

/** Between-round nostalgic interstitials (the emotional finishing touch). */
const NOSTALGIA: ReadonlyArray<string> = [
  "Remember those summer holidays?",
  "Who used to win in your childhood group?",
  "Those folded paper slips are back...",
  "Some memories never grow old.",
  "One more round before mom calls everyone for dinner?",
];

/** Per-phase action window (seconds). 0 = no auto-advance (only "finished"). */
function phaseSeconds(phase: StarPhase, passSpeed: "normal" | "fast"): number {
  switch (phase) {
    case "themeSelect":
      return 30;
    case "shuffle":
      return 6;
    case "deal":
      return 2;
    case "pass":
      return passSpeed === "fast" ? 9 : 16;
    case "star":
      return 12;
    case "handstack":
      return 7;
    case "roundSummary":
      return 7;
    case "finished":
      return 0;
  }
}

interface React {
  sum: number;
  count: number;
}

/**
 * Star Game engine — server-authoritative reflex card game. See the header in
 * shared/types.ts for the rules. The whole game is a phase machine; the
 * RoomManager drives the per-phase deadline (armDeadline/resolveDeadline) and
 * paces bots through pendingActors()/applyAutoMove(), exactly like RPS.
 *
 * Authority guarantees: card ownership, one-card-per-pass (committed set kills
 * double-pass / replay), 4-of-a-kind eligibility, and the STAR + hand-stack
 * ORDER are all decided here from server receive-time — clients only send
 * intents and never a timestamp.
 */
export class StarGameEngine implements GameEngine {
  readonly kind = "stargame" as const;
  readonly minPlayers = 3;
  readonly maxPlayers = 8;

  private opts: StarGameOptions = { ...DEFAULT_STARGAME_OPTIONS };
  private pendingOptions: StarGameOptions | null = null;

  private seatOrder: string[] = [];
  private isBot = new Set<string>();
  private nameOf = new Map<string, string>();

  private phase: StarPhase = "themeSelect";
  private round = 1;

  private themeValues: string[] = [];
  private valuesInPlay: string[] = [];

  private selectedValue = new Map<string, string>();
  private deck: StarCard[] = [];
  private hands = new Map<string, StarCard[]>();
  private cardSeq = 0;

  private hasShuffled = new Set<string>();
  private shuffleIdx = 0;

  private armed = new Map<string, string>();
  private committed = new Set<string>();
  /** This round's designated relay starter — rotates every round, fixed for
   *  the whole round (all laps). Computed once per round in startShuffle(). */
  private starterId = "";
  /** seatOrder rotated to begin at starterId — the fixed relay route for
   *  this round. Cards travel passOrder[i] -> passOrder[i+1], wrapping. */
  private passOrder: string[] = [];
  /** Position within passOrder whose turn it is to select+send THIS lap.
   *  0 = the starter (has 4, selects 1 of 4); 1..n-1 = everyone else (has
   *  5, selects 1 of 5). Reset to 0 at the start of every lap. */
  private passTurnIndex = 0;
  /** Most recent relay handoff, for the client's travel animation. Reset to
   *  null at the top of every applyMove, re-set only by a successful pass —
   *  same one-shot pattern as UnoEngine's lastHit (shared/types.ts). */
  private lastPass: { fromId: string; toId: string; cardId: string } | null = null;

  private starWinnerId: string | null = null;
  private winningValue: string | null = null;
  private starPhaseStartTs: number | null = null;
  private handstackStartTs: number | null = null;
  private stackOrder: string[] = [];

  private scores = new Map<string, number>();
  private roundWins = new Map<string, number>();
  private starReact = new Map<string, React>();
  private stackReact = new Map<string, React>();

  private lastResult: StarRoundResult | null = null;
  private nostalgiaMessage: string | null = null;
  private activity: StarActivityEntry[] = [];
  private lastActivityIdx: string | null = null;

  private deadline: number | null = null;
  private isOverFlag = false;
  private winnerId: string | null = null;
  private standings: StarStanding[] | null = null;

  private rng: () => number = Math.random;

  /** Test seam: deterministic shuffles. */
  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<StarGameOptions>): void {
    this.pendingOptions = { ...DEFAULT_STARGAME_OPTIONS, ...opts };
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Star Game requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    this.opts = this.pendingOptions ?? { ...DEFAULT_STARGAME_OPTIONS };
    const theme = getStarTheme(this.opts.themeId);
    this.themeValues = [...theme.values];

    this.seatOrder = players.map((p) => p.id);
    this.isBot = new Set(players.filter((p) => p.isBot).map((p) => p.id));
    this.nameOf = new Map(players.map((p) => [p.id, p.name]));
    for (const id of this.seatOrder) {
      this.scores.set(id, 0);
      this.roundWins.set(id, 0);
      this.starReact.set(id, { sum: 0, count: 0 });
      this.stackReact.set(id, { sum: 0, count: 0 });
    }
    this.round = 1;
    this.isOverFlag = false;
    this.winnerId = null;
    this.standings = null;
    this.activity = [];
    this.lastActivityIdx = null;
    this.addActivity("info", `Star Game begins — secretly pick your ${theme.label} value!`);
    this.startThemeSelect();
  }

  /* ──────────────────────────── phase entry ──────────────────────────── */

  private startThemeSelect(): void {
    this.phase = "themeSelect";
    this.selectedValue.clear();
    this.valuesInPlay = [];
    this.deck = [];
    this.deadline = null;
  }

  private buildDeckAndShuffleSetup(): void {
    // Distinct picks => one value per seat, 4 copies each = 4N cards.
    this.valuesInPlay = this.seatOrder.map((pid) => this.selectedValue.get(pid)!).filter(Boolean);
    this.deck = [];
    this.cardSeq = 0;
    for (const value of this.valuesInPlay) {
      for (let i = 0; i < TOKENS_PER_VALUE; i++) {
        this.deck.push({ id: `s${this.cardSeq++}`, value });
      }
    }
    this.startShuffle();
  }

  private startShuffle(): void {
    this.phase = "shuffle";
    this.hasShuffled.clear();
    this.shuffleIdx = 0;
    this.armed.clear();
    this.committed.clear();
    this.stackOrder = [];
    this.starWinnerId = null;
    this.winningValue = null;
    this.deadline = null;
    // Round starter rotates by round number (seating order, wraps for any
    // player count) — fixed for every lap within this round.
    const starterIdx = (this.round - 1) % this.seatOrder.length;
    this.starterId = this.seatOrder[starterIdx];
    this.passOrder = [...this.seatOrder.slice(starterIdx), ...this.seatOrder.slice(0, starterIdx)];
    this.passTurnIndex = 0;
    this.lastPass = null;
    this.addActivity("shuffle", "Shuffle ceremony — each player gives the chits a mix.");
  }

  private fisherYates(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  private startDeal(): void {
    // Round-robin deal from the shuffled deck — 4 each.
    this.hands.clear();
    for (const id of this.seatOrder) this.hands.set(id, []);
    let ptr = 0;
    for (let k = 0; k < TOKENS_PER_VALUE; k++) {
      for (const id of this.seatOrder) {
        this.hands.get(id)!.push(this.deck[ptr++]);
      }
    }
    this.phase = "deal";
    this.deadline = null;
    this.addActivity("deal", "Cards dealt — four chits to every hand.");
  }

  private startPassCycle(): void {
    this.phase = "pass";
    this.armed.clear();
    this.committed.clear();
    this.passTurnIndex = 0;
    this.deadline = null;
  }

  private startStar(): void {
    this.phase = "star";
    this.starWinnerId = null;
    this.starPhaseStartTs = Date.now();
    this.deadline = null;
    this.addActivity("star", "FOUR of a kind! Somebody slap the STAR!");
  }

  private startHandstack(): void {
    this.phase = "handstack";
    this.stackOrder = [];
    this.handstackStartTs = Date.now();
    this.deadline = null;
    this.addActivity("stack", "Stack your hands — fastest taps take the higher places!");
  }

  /* ──────────────────────────── moves ──────────────────────────── */

  applyMove(move: MoveContext): MoveResult {
    const pid = move.playerId;
    if (!this.seatOrder.includes(pid)) {
      return { ok: false, error: "Not a player in this game" };
    }
    if (this.isOverFlag) {
      return { ok: false, error: "Game is over" };
    }
    // One-shot animation signal (see field doc) — cleared before dispatch so
    // a move that isn't itself a pass never leaves a stale one behind.
    this.lastPass = null;
    switch (move.type) {
      case "selectValue":
        return this.handleSelectValue(pid, (move.data as { value?: string } | undefined)?.value);
      case "shuffle":
        return this.handleShuffle(pid);
      case "selectCard":
        return this.handleSelectCard(pid, (move.data as { cardId?: string } | undefined)?.cardId);
      case "pass":
        return this.handlePass(pid);
      case "reorderHand":
        return this.handleReorderHand(pid, (move.data as { cardIds?: string[] } | undefined)?.cardIds);
      case "pressStar":
        return this.handlePressStar(pid);
      case "placeHand":
        return this.handlePlaceHand(pid);
      case "nextRound":
        if (this.phase !== "roundSummary") return { ok: false, error: "No round to advance" };
        this.advanceAfterSummary();
        return this.result();
      default:
        return { ok: false, error: `Unknown move: ${move.type}` };
    }
  }

  private handleSelectValue(pid: string, value: string | undefined): MoveResult {
    if (this.phase !== "themeSelect") return { ok: false, error: "Not the selection phase" };
    if (this.selectedValue.has(pid)) return { ok: false, error: "You already picked" };
    if (!value || !this.themeValues.includes(value)) return { ok: false, error: "Invalid value" };
    for (const [other, v] of this.selectedValue) {
      if (other !== pid && v === value) {
        return { ok: false, error: "Someone already chose that — pick another" };
      }
    }
    this.selectedValue.set(pid, value);
    if (this.selectedValue.size === this.seatOrder.length) {
      this.buildDeckAndShuffleSetup();
    }
    return this.result();
  }

  private handleShuffle(pid: string): MoveResult {
    if (this.phase !== "shuffle") return { ok: false, error: "Not the shuffle phase" };
    if (this.seatOrder[this.shuffleIdx] !== pid) return { ok: false, error: "Not your shuffle turn" };
    this.fisherYates();
    this.hasShuffled.add(pid);
    this.shuffleIdx += 1;
    this.deadline = null;
    if (this.shuffleIdx >= this.seatOrder.length) {
      this.startDeal();
    }
    return this.result();
  }

  private handleSelectCard(pid: string, cardId: string | undefined): MoveResult {
    if (this.phase !== "pass") return { ok: false, error: "Not the pass phase" };
    if (this.passOrder[this.passTurnIndex] !== pid) return { ok: false, error: "Not your turn to pass" };
    const hand = this.hands.get(pid) ?? [];
    if (!cardId || !hand.some((c) => c.id === cardId)) return { ok: false, error: "You don't hold that card" };
    this.armed.set(pid, cardId);
    return this.result();
  }

  /**
   * Sequential relay (Volume-redesign): exactly one player may act at a
   * time — passOrder[passTurnIndex]. The starter (index 0) selects from
   * their normal 4-card hand; everyone else selects from a temporary
   * 5-card hand (their 4 plus the one just received). The destination is
   * always passOrder[(passTurnIndex+1) % n] — this naturally closes the
   * loop back onto the starter for the last relay step with no special
   * casing. Replaces the old simultaneous-commit resolvePass() model.
   */
  private handlePass(pid: string): MoveResult {
    if (this.phase !== "pass") return { ok: false, error: "Not the pass phase" };
    if (this.passOrder[this.passTurnIndex] !== pid) return { ok: false, error: "Not your turn to pass" };
    const hand = this.hands.get(pid) ?? [];
    if (hand.length === 0) return { ok: false, error: "No cards to pass" };
    // Auto-arm the LAST card in hand order if nothing was explicitly
    // selected — auto-pass always takes the last chit, never the first.
    const cardId = this.armed.get(pid) ?? hand[hand.length - 1].id;
    const idx = hand.findIndex((c) => c.id === cardId);
    if (idx < 0) return { ok: false, error: "You don't hold that card" };
    const [card] = hand.splice(idx, 1);
    const destIdx = (this.passTurnIndex + 1) % this.passOrder.length;
    const destId = this.passOrder[destIdx];
    this.hands.get(destId)!.push(card);
    this.lastPass = { fromId: pid, toId: destId, cardId: card.id };
    this.committed.add(pid);
    this.armed.delete(pid);
    this.passTurnIndex += 1;
    if (this.passTurnIndex >= this.passOrder.length) {
      // Full clockwise circulation closed — everyone's back to exactly 4.
      // Check for a fresh 4-of-a-kind; else start the next lap with the
      // SAME starter/passOrder for this round.
      this.addActivity("pass", "A full circulation completed — chits back to four each.");
      const eligible = this.seatOrder.filter((id) => this.isFourOfAKind(id));
      if (eligible.length > 0) {
        this.startStar();
      } else {
        this.startPassCycle();
      }
    }
    return this.result();
  }

  /** Client-driven hand reorder (drag-and-drop) — a pure preference action,
   *  no phase gate beyond having cards. Must be an exact permutation of the
   *  cards already held. Auto-pass reads hand[length-1] straight after
   *  this, so reordering is how a player steers what gets auto-passed. */
  private handleReorderHand(pid: string, cardIds: string[] | undefined): MoveResult {
    const hand = this.hands.get(pid);
    if (!hand || hand.length === 0) return { ok: false, error: "No hand to reorder" };
    if (!Array.isArray(cardIds) || cardIds.length !== hand.length) {
      return { ok: false, error: "Reorder must include every card exactly once" };
    }
    const byId = new Map(hand.map((c) => [c.id, c] as const));
    const reordered: StarCard[] = [];
    for (const id of cardIds) {
      const c = byId.get(id);
      if (!c) return { ok: false, error: "Unknown card in reorder" };
      reordered.push(c);
      byId.delete(id);
    }
    if (byId.size > 0) return { ok: false, error: "Reorder missing cards" };
    this.hands.set(pid, reordered);
    return this.result();
  }

  private handlePressStar(pid: string): MoveResult {
    if (this.phase !== "star") return { ok: false, error: "Not the STAR moment" };
    if (this.starWinnerId) return { ok: false, error: "STAR already taken" };
    if (!this.isFourOfAKind(pid)) return { ok: false, error: "You don't have four yet" };
    this.starWinnerId = pid;
    this.winningValue = this.hands.get(pid)![0].value;
    this.roundWins.set(pid, (this.roundWins.get(pid) ?? 0) + 1);
    if (this.starPhaseStartTs != null) this.record(this.starReact, pid, Date.now() - this.starPhaseStartTs);
    this.addActivity("star", `${this.nameOf.get(pid) ?? "A player"} slapped the STAR with four ${this.winningValue}!`, pid);
    this.startHandstack();
    return this.result();
  }

  private handlePlaceHand(pid: string): MoveResult {
    if (this.phase !== "handstack") return { ok: false, error: "Not the hand-stack moment" };
    if (pid === this.starWinnerId) return { ok: false, error: "You already won this round" };
    if (this.stackOrder.includes(pid)) return { ok: false, error: "Hand already placed" };
    this.stackOrder.push(pid);
    if (this.handstackStartTs != null) this.record(this.stackReact, pid, Date.now() - this.handstackStartTs);
    if (this.stackOrder.length >= this.seatOrder.length - 1) {
      this.finalizeRound();
    }
    return this.result();
  }

  private finalizeRound(): void {
    const order = [this.starWinnerId!, ...this.stackOrder];
    for (const pid of this.seatOrder) if (!order.includes(pid)) order.push(pid);
    const points: Record<string, number> = {};
    order.forEach((pid, rank) => {
      const pts = Math.max(1, 10 - rank);
      points[pid] = pts;
      this.scores.set(pid, (this.scores.get(pid) ?? 0) + pts);
    });
    this.lastResult = {
      round: this.round,
      winnerId: this.starWinnerId,
      winningValue: this.winningValue,
      order,
      points,
    };
    this.nostalgiaMessage = NOSTALGIA[(this.round - 1) % NOSTALGIA.length];
    this.addActivity("round", `${this.nameOf.get(this.starWinnerId!) ?? "Winner"} takes round ${this.round}.`, this.starWinnerId ?? undefined);
    this.phase = "roundSummary";
    this.deadline = null;
  }

  private advanceAfterSummary(): void {
    const target = this.opts.winningPoints ?? null;
    const reachedTarget = target != null && this.seatOrder.some((pid) => (this.scores.get(pid) ?? 0) >= target);
    if (this.round >= this.opts.totalRounds || reachedTarget) {
      this.finalizeGame();
    } else {
      this.round += 1;
      this.startShuffle();
    }
  }

  private finalizeGame(): void {
    this.standings = this.computeStandings();
    this.winnerId = this.standings[0]?.playerId ?? null;
    this.isOverFlag = true;
    this.phase = "finished";
    this.deadline = null;
    const champ = this.winnerId ? this.nameOf.get(this.winnerId) : null;
    this.addActivity("round", champ ? `${champ} wins the game!` : "Game over.");
  }

  private computeStandings(): StarStanding[] {
    const rows = this.seatOrder.map((pid) => {
      const sr = this.starReact.get(pid)!;
      const hr = this.stackReact.get(pid)!;
      return {
        playerId: pid,
        score: this.scores.get(pid) ?? 0,
        roundWins: this.roundWins.get(pid) ?? 0,
        avgStarMs: sr.count ? sr.sum / sr.count : null,
        avgStackMs: hr.count ? hr.sum / hr.count : null,
      };
    });
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      const sa = a.avgStarMs ?? Infinity;
      const sb = b.avgStarMs ?? Infinity;
      if (sa !== sb) return sa - sb;
      const ka = a.avgStackMs ?? Infinity;
      const kb = b.avgStackMs ?? Infinity;
      return ka - kb;
    });
    const medals: ("gold" | "silver" | "bronze")[] = ["gold", "silver", "bronze"];
    return rows.map((r, i) => ({ ...r, rank: i, medal: medals[i] ?? null }));
  }

  /* ──────────────────────────── helpers ──────────────────────────── */

  private isFourOfAKind(pid: string): boolean {
    const hand = this.hands.get(pid);
    if (!hand || hand.length !== TOKENS_PER_VALUE) return false;
    return hand.every((c) => c.value === hand[0].value);
  }

  private record(map: Map<string, React>, pid: string, ms: number): void {
    const r = map.get(pid)!;
    r.sum += ms;
    r.count += 1;
  }

  private addActivity(kind: StarActivityEntry["kind"], text: string, playerId?: string): void {
    const idx = keyBetween(this.lastActivityIdx, null, true);
    this.lastActivityIdx = idx;
    this.activity.push({ idx, ts: Date.now(), kind, text, playerId });
    if (this.activity.length > ACTIVITY_CAP) this.activity = this.activity.slice(-ACTIVITY_CAP);
  }

  private result(): MoveResult {
    return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
  }

  private publicPlayers(): StarPlayerPublic[] {
    const stackRankOf = (pid: string): number | null => {
      if (pid === this.starWinnerId) return 0;
      const i = this.stackOrder.indexOf(pid);
      return i >= 0 ? i + 1 : null;
    };
    return this.seatOrder.map((pid) => ({
      id: pid,
      hasSelected: this.selectedValue.has(pid),
      hasShuffled: this.hasShuffled.has(pid),
      hasPassed: this.committed.has(pid),
      hasStacked: pid === this.starWinnerId || this.stackOrder.includes(pid),
      score: this.scores.get(pid) ?? 0,
      roundWins: this.roundWins.get(pid) ?? 0,
      cardCount: this.hands.get(pid)?.length ?? 0,
      starEligible: this.phase === "star" && this.starWinnerId == null && this.isFourOfAKind(pid),
      stackRank: stackRankOf(pid),
    }));
  }

  getPublicState(): StarPublicState {
    return {
      kind: "stargame",
      phase: this.phase,
      themeId: this.opts.themeId,
      round: this.round,
      totalRounds: this.opts.totalRounds,
      passSpeed: this.opts.passSpeed,
      winningPoints: this.opts.winningPoints ?? null,
      seatOrder: [...this.seatOrder],
      players: this.publicPlayers(),
      shuffleTurnId: this.phase === "shuffle" ? this.seatOrder[this.shuffleIdx] ?? null : null,
      deadline: this.deadline,
      valuesInPlay: [...this.valuesInPlay],
      starWinnerId: this.starWinnerId,
      stackOrder: [...this.stackOrder],
      lastResult: this.lastResult,
      nostalgiaMessage: this.phase === "roundSummary" ? this.nostalgiaMessage : null,
      activity: [...this.activity],
      standings: this.standings,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
      starterId: this.starterId || null,
      passOrder: [...this.passOrder],
      currentPasserId: this.phase === "pass" ? this.passOrder[this.passTurnIndex] ?? null : null,
      lastPass: this.lastPass,
    };
  }

  getStateFor(playerId: string): unknown {
    const pub = this.getPublicState();
    const taken: string[] = [];
    if (this.phase === "themeSelect") {
      for (const [pid, v] of this.selectedValue) if (pid !== playerId) taken.push(v);
    }
    return {
      ...pub,
      myHand: this.hands.get(playerId) ?? [],
      mySelectedValue: this.selectedValue.get(playerId) ?? null,
      myArmedCardId: this.armed.get(playerId) ?? null,
      themeValues: [...this.themeValues],
      takenValues: taken,
    };
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    if (!this.seatOrder.includes(playerId)) return;
    this.seatOrder = this.seatOrder.filter((id) => id !== playerId);
    this.isBot.delete(playerId);
    this.selectedValue.delete(playerId);
    this.hands.delete(playerId);
    this.hasShuffled.delete(playerId);
    this.armed.delete(playerId);
    this.committed.delete(playerId);
    this.stackOrder = this.stackOrder.filter((id) => id !== playerId);
    if (this.starWinnerId === playerId) this.starWinnerId = null;
    if (this.shuffleIdx > this.seatOrder.length) this.shuffleIdx = this.seatOrder.length;
    // Keep the relay route consistent with the shrunken table so a departed
    // player's old slot never gets looked up mid-lap.
    if (this.passOrder.includes(playerId)) {
      this.passOrder = this.passOrder.filter((id) => id !== playerId);
      if (this.passTurnIndex >= this.passOrder.length) this.passTurnIndex = 0;
    }
    if (this.starterId === playerId) this.starterId = this.passOrder[0] ?? "";
    this.addActivity("info", `${this.nameOf.get(playerId) ?? "A player"} left the game.`);
    // Below the floor (or only one left) — end and crown the current leader.
    if (this.seatOrder.length < this.minPlayers) {
      if (!this.isOverFlag && this.seatOrder.length > 0) {
        this.finalizeGame();
      }
    }
  }

  /* ──────────────────── RoomManager timer integration ──────────────────── */

  getPhaseTimerSeconds(): number {
    return phaseSeconds(this.phase, this.opts.passSpeed);
  }

  armDeadline(totalMs: number): number {
    if (this.deadline == null) this.deadline = Date.now() + totalMs;
    return Math.max(0, this.deadline - Date.now());
  }

  clearDeadline(): void {
    this.deadline = null;
  }

  /** Human-like randomized bot delay (1.5-4s) — replaces the platform
   *  default (1200-2000ms, RoomManager.scheduleBotMoveIfNeeded) for the
   *  DELIBERATE-CHOICE phases (picking a value, shuffling, choosing which
   *  chit to pass) so bots don't feel instant/robotic there. Deliberately
   *  NOT applied to "star"/"handstack" — those are reflex-speed races
   *  where a bot artificially "thinking" for seconds would defeat the
   *  whole point of the phase and give humans a free win every time; they
   *  keep the platform-default pace untouched. A fresh value every call,
   *  per the GameEngine.ts contract. */
  getBotThinkDelayMs(): number {
    if (this.phase === "star" || this.phase === "handstack") {
      return 1200 + this.rng() * 800; // unchanged platform default — reflex phases
    }
    return 1500 + this.rng() * 2500;
  }

  /** Auto-resolve the current phase when its window lapses (a missing/slow
   *  player never stalls the table). Never invoked for bots — bots act through
   *  applyAutoMove on their own paced schedule. */
  resolveDeadline(): void {
    switch (this.phase) {
      case "themeSelect": {
        for (const pid of this.seatOrder) {
          if (this.phase !== "themeSelect") break;
          if (!this.selectedValue.has(pid)) this.handleSelectValue(pid, this.firstFreeValue());
        }
        break;
      }
      case "shuffle": {
        let guard = 0;
        while (this.phase === "shuffle" && guard++ < this.seatOrder.length + 1) {
          this.handleShuffle(this.seatOrder[this.shuffleIdx]);
        }
        break;
      }
      case "deal":
        this.startPassCycle();
        break;
      case "pass": {
        // Sequential relay — force just the current actor, not the table.
        const pid = this.passOrder[this.passTurnIndex];
        if (pid) this.handlePass(pid);
        break;
      }
      case "star": {
        if (!this.starWinnerId) {
          const first = this.seatOrder.find((pid) => this.isFourOfAKind(pid));
          if (first) this.handlePressStar(first);
        }
        break;
      }
      case "handstack": {
        for (const pid of this.seatOrder) {
          if (this.phase !== "handstack") break;
          if (pid !== this.starWinnerId && !this.stackOrder.includes(pid)) this.handlePlaceHand(pid);
        }
        break;
      }
      case "roundSummary":
        this.advanceAfterSummary();
        break;
      case "finished":
        break;
    }
  }

  private firstFreeValue(): string {
    const taken = new Set(this.selectedValue.values());
    return this.themeValues.find((v) => !taken.has(v)) ?? this.themeValues[0];
  }

  /* ──────────────────────────── bot support ──────────────────────────── */

  pendingActors(): string[] {
    switch (this.phase) {
      case "themeSelect":
        return this.seatOrder.filter((pid) => !this.selectedValue.has(pid));
      case "shuffle":
        return this.seatOrder[this.shuffleIdx] ? [this.seatOrder[this.shuffleIdx]] : [];
      case "pass":
        return this.passOrder[this.passTurnIndex] ? [this.passOrder[this.passTurnIndex]] : [];
      case "star":
        return this.starWinnerId ? [] : this.seatOrder.filter((pid) => this.isFourOfAKind(pid));
      case "handstack":
        return this.seatOrder.filter((pid) => pid !== this.starWinnerId && !this.stackOrder.includes(pid));
      default:
        return [];
    }
  }

  applyAutoMove(playerId: string): MoveResult {
    switch (this.phase) {
      case "themeSelect":
        return this.handleSelectValue(playerId, this.firstFreeValue());
      case "shuffle":
        return this.handleShuffle(playerId);
      case "pass": {
        // Auto-pass always takes the LAST chit in hand order, never a
        // random one — matches the human timeout fallback in handlePass.
        const hand = this.hands.get(playerId) ?? [];
        const pick = hand[hand.length - 1];
        if (pick) this.handleSelectCard(playerId, pick.id);
        return this.handlePass(playerId);
      }
      case "star":
        return this.handlePressStar(playerId);
      case "handstack":
        return this.handlePlaceHand(playerId);
      default:
        return { ok: false, error: "Nothing to auto-play" };
    }
  }
}
