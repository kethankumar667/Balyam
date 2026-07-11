import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  UnoCard,
  UnoColor,
  UnoGameOptions,
  UnoPublicState,
  UnoPlayerState,
  UnoRank,
} from "@shared/types.js";
import { DEFAULT_UNO_OPTIONS } from "@shared/types.js";

const STARTING_HAND_SIZE = 7;
const DRAW_PILE_SHUFFLE_THRESHOLD = 2; // Reshuffle when < this many cards left

// Color and rank constants
const COLORS: UnoColor[] = ["R", "G", "B", "Y"];
const NUMBER_RANKS: UnoRank[] = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
];
const ACTION_RANKS: UnoRank[] = ["Skip", "Reverse", "+2"];
const WILD_RANKS: UnoRank[] = ["Wild", "Wild+4"];

/**
 * Internal game state — server-only, never sent to clients.
 * Includes complete hands and unshuffled deck.
 *
 * Exported (not just for internal use) so tests can construct exact
 * scenarios by writing directly to `(engine as unknown as { state:
 * InternalUnoState }).state` — TS `private` is compile-time only, and
 * rigging the Fisher–Yates shuffle to produce a specific hand/discard
 * layout is far more indirect than just setting the state up.
 */
export interface InternalUnoState {
  phase: "playing" | "finished";
  options: UnoGameOptions;
  playerOrder: string[];
  turnIndex: number;
  direction: 1 | -1; // 1=clockwise, -1=counter-clockwise
  hands: Record<string, UnoCard[]>;
  deck: UnoCard[]; // Draw pile
  discard: UnoCard[]; // Discard pile
  currentColor: UnoColor | null; // Chosen for Wild/Wild+4
  scores: Record<string, number>;
  turnDeadline: number | null;
  winnerId: string | null;
  lastAction: string | null;
  drewLastTurn: boolean; // Prevent double-draw
  /** Player ids at exactly 1 card who have correctly declared UNO for that
   *  hand. See syncUnoDeclaration() for why this must be kept in sync with
   *  hand size rather than just accumulated. */
  unoDeclaredBy: Set<string>;
  /** Non-null from the instant a Wild Draw Four is played until the
   *  targeted player accepts or challenges. `wasLegal` is server-only —
   *  never put it on UnoPublicState, or the challenge has no purpose. */
  pendingChallenge: {
    challengerId: string;
    playedById: string;
    wasLegal: boolean;
  } | null;
}

export class UnoEngine implements GameEngine {
  readonly kind = "uno" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private state!: InternalUnoState;
  /** Injectable RNG, same contract as LudoEngine.setRng — real Math.random()
   *  in production, deterministic in tests. */
  private rng: () => number = Math.random;
  /** Captured by RoomManager before init() — same setOptions()-then-init()
   *  pattern as DotsBoxesEngine/MemoryMatchEngine. */
  private pendingOptions: UnoGameOptions = { ...DEFAULT_UNO_OPTIONS };

  /** Test-only: inject a deterministic RNG (returns a value in [0,1)). */
  setRng(rng: () => number): void {
    this.rng = rng;
  }

  setOptions(options: UnoGameOptions): void {
    this.pendingOptions = { ...DEFAULT_UNO_OPTIONS, ...options };
  }

  setTurnDeadline(deadline: number): void {
    this.state.turnDeadline = deadline;
  }

  clearTurnDeadline(): void {
    this.state.turnDeadline = null;
  }

  getTurnTimerSeconds(): number {
    return this.state?.options.turnTimerSeconds ?? this.pendingOptions.turnTimerSeconds;
  }

  /**
   * Who a room-level turn-timeout should force a move for — the real turn
   * holder, or (while a Wild Draw Four decision is outstanding) the
   * targeted player. Deliberately NOT the same set as pendingActors(),
   * which also lists anyone merely eligible to declare UNO — auto-declaring
   * for a human on a generic turn timeout would strip all risk from that
   * mechanic; only a bot should ever get auto-declared, via applyAutoMove.
   */
  getTimeoutActor(): string | null {
    if (this.state.phase !== "playing") return null;
    if (this.state.pendingChallenge) return this.state.pendingChallenge.challengerId;
    return this.state.playerOrder[this.state.turnIndex] ?? null;
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(
        `UNO requires ${this.minPlayers}-${this.maxPlayers} players`
      );
    }

    const playerIds = players.map((p) => p.id);
    const scores: Record<string, number> = {};
    for (const id of playerIds) scores[id] = 0;

    // Create and shuffle deck
    const deck = this.createDeck();
    this.shuffle(deck);

    // Deal 7 cards to each player
    const hands: Record<string, UnoCard[]> = {};
    for (const id of playerIds) hands[id] = [];

    let cardIndex = 0;
    for (let i = 0; i < STARTING_HAND_SIZE; i++) {
      for (const id of playerIds) {
        hands[id].push(deck[cardIndex++]!);
      }
    }

    // Reveal the starting card from the remaining pool. Official rule
    // (Volume 4 §7): if it's Wild/Wild+4, shuffle it back in and draw
    // again until a colored card appears — no more silently defaulting to
    // Red. Bounded retry count guards against a pathological all-Wild
    // remainder rather than looping forever.
    const pool = deck.slice(cardIndex);
    let startCard = pool.shift()!;
    let attempts = 0;
    while (
      (startCard.rank === "Wild" || startCard.rank === "Wild+4") &&
      pool.length > 0 &&
      attempts < 20
    ) {
      pool.push(startCard);
      this.shuffle(pool);
      startCard = pool.shift()!;
      attempts++;
    }

    const discard: UnoCard[] = [startCard];
    const drawPile = pool;

    this.state = {
      phase: "playing",
      options: { ...this.pendingOptions },
      playerOrder: playerIds,
      turnIndex: 0,
      direction: 1,
      hands,
      deck: drawPile,
      discard,
      currentColor: startCard.color ?? "R", // Defensive fallback only; see retry loop above.
      scores,
      turnDeadline: null,
      winnerId: null,
      lastAction: `Dealt 7 cards. ${playerIds[0] || "Player"} to play.`,
      drewLastTurn: false,
      unoDeclaredBy: new Set(),
      pendingChallenge: null,
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.state.phase === "finished") {
      return { ok: false, error: "Game is over" };
    }

    const data = move.data as Record<string, unknown> | undefined;
    const moveType = move.type as string;

    // Available to any seated player at any time, not gated by "is it your
    // turn" — declaring/catching UNO and resolving a Wild Draw Four
    // challenge are all independent of the normal turn cycle.
    if (moveType === "declareUno") {
      return this.handleDeclareUno(move.playerId);
    }
    if (moveType === "catchUno") {
      const targetId = data?.targetId as string | undefined;
      if (!targetId) return { ok: false, error: "Missing targetId" };
      return this.handleCatchUno(move.playerId, targetId);
    }
    if (moveType === "challenge" || moveType === "acceptDraw") {
      return this.handleChallengeDecision(move.playerId, moveType);
    }

    const currentPlayerId = this.state.playerOrder[this.state.turnIndex];
    if (move.playerId !== currentPlayerId) {
      return { ok: false, error: "Not your turn" };
    }
    if (this.state.pendingChallenge) {
      return { ok: false, error: "Waiting for a Wild Draw Four decision" };
    }

    if (moveType === "draw") {
      return this.handleDraw(move.playerId);
    }

    if (moveType === "play") {
      const cardId = data?.cardId as string | undefined;
      const chosenColor = data?.color as UnoColor | undefined;

      if (!cardId) return { ok: false, error: "Missing cardId" };
      return this.handlePlay(move.playerId, cardId, chosenColor);
    }

    if (moveType === "pass") {
      return this.handlePass(move.playerId);
    }

    return { ok: false, error: `Unknown move type: ${moveType}` };
  }

  /** A player may declare UNO only while holding exactly one card and not
   *  having already declared for that hand. */
  private canDeclareUno(playerId: string): boolean {
    const hand = this.state.hands[playerId];
    return !!hand && hand.length === 1 && !this.state.unoDeclaredBy.has(playerId);
  }

  /** A stale "declared" flag must not survive a hand-size change away from
   *  1 card — otherwise a later return to exactly 1 card (e.g. after being
   *  hit with a Draw Two while already at 1 card) would be wrongly treated
   *  as already-declared. Call after every hand mutation. */
  private syncUnoDeclaration(playerId: string): void {
    const hand = this.state.hands[playerId];
    if (!hand || hand.length !== 1) {
      this.state.unoDeclaredBy.delete(playerId);
    }
  }

  private handleDeclareUno(playerId: string): MoveResult {
    if (!this.canDeclareUno(playerId)) {
      return { ok: false, error: "Nothing to declare" };
    }
    this.state.unoDeclaredBy.add(playerId);
    this.state.lastAction = `${playerId} declared UNO!`;
    return { ok: true };
  }

  private handleCatchUno(playerId: string, targetId: string): MoveResult {
    if (playerId === targetId) {
      return { ok: false, error: "Cannot catch yourself" };
    }
    if (!this.state.playerOrder.includes(targetId)) {
      return { ok: false, error: "Unknown player" };
    }
    if (!this.canDeclareUno(targetId)) {
      return { ok: false, error: "Nothing to catch" };
    }
    const drawn = this.drawCards(2);
    this.state.hands[targetId]!.push(...drawn);
    this.syncUnoDeclaration(targetId);
    this.state.lastAction = `${playerId} caught ${targetId} without UNO! +2 penalty.`;
    return { ok: true };
  }

  /**
   * Resolves the Wild Draw Four challenge window. Turn math: `turnIndex`
   * was deliberately left unadvanced when the Wild+4 was played (see
   * handlePlay), so it still sits at the original player's slot — stepping
   * by 1 from there lands on the challenger, by 2 lands on whoever comes
   * after them. See UNO_GAME_PLAN.md §14.5 for the full decision table.
   */
  private handleChallengeDecision(
    playerId: string,
    decision: "challenge" | "acceptDraw"
  ): MoveResult {
    const pending = this.state.pendingChallenge;
    if (!pending) return { ok: false, error: "No pending challenge" };
    if (playerId !== pending.challengerId) {
      return { ok: false, error: "Not your decision to make" };
    }

    this.state.pendingChallenge = null;

    if (decision === "acceptDraw") {
      const drawn = this.drawCards(4);
      this.state.hands[pending.challengerId]!.push(...drawn);
      this.syncUnoDeclaration(pending.challengerId);
      this.state.lastAction = `${pending.challengerId} accepted the Wild Draw Four and drew 4.`;
      this.state.turnIndex = this.stepIndex(this.state.turnIndex, 2);
      return { ok: true };
    }

    // decision === "challenge"
    if (!pending.wasLegal) {
      // Challenge succeeds: the player who played it draws 4 instead, and
      // the challenger keeps their own turn uninterrupted (Volume 4 §17).
      const drawn = this.drawCards(4);
      this.state.hands[pending.playedById]!.push(...drawn);
      this.syncUnoDeclaration(pending.playedById);
      this.state.lastAction = `${pending.challengerId} challenged successfully — ${pending.playedById} draws 4.`;
      this.state.turnIndex = this.stepIndex(this.state.turnIndex, 1);
      return { ok: true };
    }

    // Challenge fails: challenger draws 6 instead of 4, discouraging
    // frivolous challenges (Volume 4 §17).
    const drawn = this.drawCards(6);
    this.state.hands[pending.challengerId]!.push(...drawn);
    this.syncUnoDeclaration(pending.challengerId);
    this.state.lastAction = `${pending.challengerId} challenged and lost — draws 6.`;
    this.state.turnIndex = this.stepIndex(this.state.turnIndex, 2);
    return { ok: true };
  }

  private handleDraw(playerId: string): MoveResult {
    if (this.state.drewLastTurn) {
      return { ok: false, error: "Already drew this turn" };
    }

    const drawn = this.drawCards(1);
    if (drawn.length > 0) {
      this.state.hands[playerId].push(drawn[0]!);
      this.syncUnoDeclaration(playerId);
      this.state.drewLastTurn = true;
      this.state.lastAction = `${playerId} drew a card`;
    }

    return { ok: true };
  }

  private handlePlay(
    playerId: string,
    cardId: string,
    chosenColor?: UnoColor
  ): MoveResult {
    const hand = this.state.hands[playerId];
    const cardIndex = hand.findIndex((c) => c.id === cardId);

    if (cardIndex === -1) {
      return { ok: false, error: "Card not in hand" };
    }

    const card = hand[cardIndex]!;
    const topCard = this.state.discard[this.state.discard.length - 1];

    // Validate move
    if (!this.isValidPlay(card, topCard, this.state.currentColor)) {
      return { ok: false, error: "Invalid play: color/rank mismatch" };
    }

    // For Wild/Wild+4, color must be provided
    if ((card.rank === "Wild" || card.rank === "Wild+4") && !chosenColor) {
      return { ok: false, error: "Must choose color for Wild card" };
    }

    // Wild Draw Four legality (Volume 4 §16): official UNO never blocks the
    // play outright — a player CAN attempt it illegally, since opponents
    // can't see their hand. Illegality only matters if challenged, so
    // snapshot it now, before the card leaves the hand, and let the
    // challenge window (handleChallengeDecision) do the enforcing.
    const wasLegalWildFour =
      card.rank === "Wild+4" ? !hand.some((c) => c.color === this.state.currentColor) : true;

    // Play the card
    hand.splice(cardIndex, 1);
    this.syncUnoDeclaration(playerId);
    this.state.discard.push(card);
    this.state.currentColor = chosenColor || card.color;
    this.state.drewLastTurn = false;

    // Check win
    if (hand.length === 0) {
      this.state.phase = "finished";
      this.state.winnerId = playerId;
      this.awardRoundPoints(playerId);
      return { ok: true, isOver: true, winnerId: playerId };
    }

    if (card.rank === "Wild+4") {
      // Defer resolution: don't draw or advance the turn yet. The targeted
      // player must accept or challenge first (Volume 4 §17). turnIndex is
      // deliberately left pointing at this player's slot — the challenge
      // resolution steps from there once a decision comes in.
      const targetId = this.state.playerOrder[this.stepIndex(this.state.turnIndex, 1)]!;
      this.state.pendingChallenge = {
        challengerId: targetId,
        playedById: playerId,
        wasLegal: wasLegalWildFour,
      };
      this.state.lastAction = `Wild Draw Four! Waiting for ${targetId} to accept or challenge.`;
      return { ok: true };
    }

    // Handle action cards. Reverse flips this.state.direction inside here,
    // so by the time we step below, "direction" already reflects the new
    // direction — which is exactly right (the hop away from the player who
    // just moved happens in the post-Reverse direction).
    const actionResult = this.handleActionCard(card);
    this.state.lastAction = actionResult.description;

    // Advance turn (may advance by 1 or 2 depending on card), respecting
    // current play direction.
    this.state.turnIndex = this.stepIndex(this.state.turnIndex, actionResult.turnAdvance);

    return { ok: true };
  }

  private handlePass(playerId: string): MoveResult {
    if (!this.state.drewLastTurn) {
      return { ok: false, error: "Can only pass after drawing" };
    }

    this.state.drewLastTurn = false;
    this.advanceTurn();
    this.state.lastAction = `${playerId} passed`;

    return { ok: true };
  }

  /** Point value of a single card per the official table (Volume 4 §20):
   *  number cards score their face value, action cards 20, Wild cards 50. */
  private cardPoints(card: UnoCard): number {
    if (card.rank === "Wild" || card.rank === "Wild+4") return 50;
    if (card.rank === "Skip" || card.rank === "Reverse" || card.rank === "+2") return 20;
    return Number(card.rank);
  }

  /** Sums every OTHER player's remaining hand into the winner's score —
   *  called the instant a hand empties (Volume 2 §18 / Volume 4 §20).
   *  Cumulative rather than overwritten so `scores` would already be
   *  correct if a future multi-round mode (Phase D's own remaining scope)
   *  starts calling init() again without resetting between rounds. */
  private awardRoundPoints(winnerId: string): void {
    let total = 0;
    for (const pid of this.state.playerOrder) {
      if (pid === winnerId) continue;
      const hand = this.state.hands[pid] ?? [];
      for (const card of hand) total += this.cardPoints(card);
    }
    this.state.scores[winnerId] = (this.state.scores[winnerId] ?? 0) + total;
  }

  private isValidPlay(
    card: UnoCard,
    topCard: UnoCard,
    currentColor: UnoColor | null
  ): boolean {
    // Wild and Wild+4 are always playable
    if (card.rank === "Wild" || card.rank === "Wild+4") return true;

    // If Wild was played, match chosen color
    if (topCard.rank === "Wild" || topCard.rank === "Wild+4") {
      return card.color === currentColor;
    }

    // Otherwise, match color or rank
    return card.color === topCard.color || card.rank === topCard.rank;
  }

  private handleActionCard(
    card: UnoCard
  ): { turnAdvance: number; description: string } {
    if (card.rank === "Skip") {
      return { turnAdvance: 2, description: "Skip! Next player skipped." };
    }

    if (card.rank === "Reverse") {
      this.state.direction *= -1;
      const dir = this.state.direction === 1 ? "clockwise" : "counter-clockwise";
      // Official rule: with exactly 2 players, Reverse acts as Skip (the
      // magnitude-2 hop is direction-symmetric, so this needs no direction
      // branch — it lands back on the same player either way).
      const twoPlayerSkip = this.state.playerOrder.length === 2;
      return {
        turnAdvance: twoPlayerSkip ? 2 : 1,
        description: twoPlayerSkip
          ? "Reverse! Acts as Skip with two players."
          : `Reverse! Playing ${dir}.`,
      };
    }

    if (card.rank === "+2") {
      const nextPlayerId = this.state.playerOrder[this.stepIndex(this.state.turnIndex, 1)]!;
      const drawn = this.drawCards(2);
      this.state.hands[nextPlayerId]!.push(...drawn);
      this.syncUnoDeclaration(nextPlayerId);
      return {
        turnAdvance: 2,
        description: `Draw Two! Next player draws 2.`,
      };
    }

    // Wild+4 is NOT handled here — handlePlay() intercepts it before this
    // function is ever called, since it needs a challenge-decision pause
    // rather than an immediate turnAdvance.

    return { turnAdvance: 1, description: "Card played." };
  }

  private advanceTurn(): void {
    this.state.turnIndex = this.stepIndex(this.state.turnIndex, 1);
  }

  /**
   * Direction-aware turn-index arithmetic. Every turn advancement in the
   * engine must go through this — `this.state.direction` is otherwise just
   * a display flag that Reverse flips without ever affecting whose turn is
   * next, which was a real bug (direction was set and broadcast to clients
   * but never consulted). `+ n) % n` guards against JS's `%` returning a
   * negative result for a negative dividend when direction is -1.
   */
  private stepIndex(from: number, steps: number): number {
    const n = this.state.playerOrder.length;
    return ((from + steps * this.state.direction) % n + n) % n;
  }

  private drawCards(count: number): UnoCard[] {
    const drawn: UnoCard[] = [];

    for (let i = 0; i < count; i++) {
      if (this.state.deck.length < DRAW_PILE_SHUFFLE_THRESHOLD) {
        // Reshuffle discard into deck
        if (this.state.discard.length <= 1) {
          // Not enough cards to reshuffle; just take what we have
          drawn.push(...this.state.deck.splice(0));
          break;
        }

        // Keep top card of discard, reshuffle the rest
        const topCard = this.state.discard.pop()!;
        this.state.deck.push(...this.state.discard);
        this.state.discard = [topCard];
        this.shuffle(this.state.deck);
      }

      const card = this.state.deck.shift();
      if (card) drawn.push(card);
    }

    return drawn;
  }

  private createDeck(): UnoCard[] {
    const deck: UnoCard[] = [];
    let id = 0;

    // Number cards: 0 is 1 per color, 1-9 are 2 per color
    for (const color of COLORS) {
      deck.push({ id: String(id++), color, rank: "0" });
      for (const rank of NUMBER_RANKS.slice(1)) {
        deck.push({ id: String(id++), color, rank });
        deck.push({ id: String(id++), color, rank });
      }
    }

    // Action cards: 2 per color
    for (const color of COLORS) {
      for (const rank of ACTION_RANKS) {
        deck.push({ id: String(id++), color, rank });
        deck.push({ id: String(id++), color, rank });
      }
    }

    // Wild and Wild+4: 4 each
    for (let i = 0; i < 4; i++) {
      deck.push({ id: String(id++), color: null, rank: "Wild" });
      deck.push({ id: String(id++), color: null, rank: "Wild+4" });
    }

    // Note: nextCardId is not tracked; IDs are generated sequentially per shuffle
    return deck;
  }

  private shuffle<T>(arr: T[]): void {
    // Fisher–Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  }

  getPublicState(): UnoPublicState {
    const topCard = this.state.discard[this.state.discard.length - 1];

    return {
      kind: "uno",
      phase: this.state.phase,
      playerOrder: this.state.playerOrder,
      turnPlayerId: this.state.playerOrder[this.state.turnIndex] || "",
      direction: this.state.direction,
      topCard,
      currentColor: this.state.currentColor,
      handSizes: Object.fromEntries(
        this.state.playerOrder.map((id) => [id, this.state.hands[id]!.length])
      ),
      deckCount: this.state.deck.length,
      scores: { ...this.state.scores },
      turnDeadline: this.state.turnDeadline,
      winnerId: this.state.winnerId,
      lastAction: this.state.lastAction,
      unoDeclaredBy: [...this.state.unoDeclaredBy],
      pendingChallenge: this.state.pendingChallenge
        ? {
            challengerId: this.state.pendingChallenge.challengerId,
            playedById: this.state.pendingChallenge.playedById,
            // wasLegal is intentionally omitted — must stay hidden until resolved.
          }
        : null,
    };
  }

  getStateFor(playerId: string): UnoPlayerState {
    const publicState = this.getPublicState();
    const hand = this.state.hands[playerId] || [];
    const topCard = this.state.discard[this.state.discard.length - 1];

    return {
      ...publicState,
      myHand: hand,
      validMoves: hand.filter((card) =>
        this.isValidPlay(card, topCard, this.state.currentColor)
      ),
    };
  }

  isOver(): boolean {
    return this.state.phase === "finished";
  }

  removePlayer(playerId: string): void {
    const idx = this.state.playerOrder.indexOf(playerId);
    if (idx === -1) return;

    // Remove player from turn order
    this.state.playerOrder.splice(idx, 1);

    // Return their hand to deck
    const hand = this.state.hands[playerId];
    if (hand) {
      this.state.deck.push(...hand);
      delete this.state.hands[playerId];
    }

    this.state.unoDeclaredBy.delete(playerId);
    // Never leave the game frozen waiting on a challenge decision from
    // (or about) someone who just left — drop it without applying either
    // penalty rather than trying to resolve fairness for a vanished seat.
    if (
      this.state.pendingChallenge?.challengerId === playerId ||
      this.state.pendingChallenge?.playedById === playerId
    ) {
      this.state.pendingChallenge = null;
    }

    // Advance turn if this player was current
    if (idx < this.state.turnIndex) {
      this.state.turnIndex--;
    } else if (
      idx === this.state.turnIndex &&
      this.state.playerOrder.length > 0
    ) {
      this.state.turnIndex = this.state.turnIndex % this.state.playerOrder.length;
    }

    // Check if only one player left
    if (this.state.playerOrder.length === 1) {
      this.state.phase = "finished";
      this.state.winnerId = this.state.playerOrder[0] || null;
    }
  }

  /**
   * Who needs to act right now — the real turn/challenge holder (see
   * getTimeoutActor) PLUS anyone sitting on an undeclared 1-card hand.
   * Note this is broader than getTimeoutActor() on purpose: it drives the
   * generic bot scheduler (RoomManager.scheduleBotMoveIfNeeded), and bots
   * SHOULD always auto-declare immediately — only a human-facing timeout
   * must not.
   */
  pendingActors(): string[] {
    if (this.state.phase !== "playing") return [];
    const actors = new Set<string>();

    if (this.state.pendingChallenge) {
      actors.add(this.state.pendingChallenge.challengerId);
    } else {
      const current = this.state.playerOrder[this.state.turnIndex];
      if (current) actors.add(current);
    }

    for (const pid of this.state.playerOrder) {
      if (this.canDeclareUno(pid)) actors.add(pid);
    }

    return [...actors];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.state.phase !== "playing") return { ok: false };

    // Resolve an outstanding Wild Draw Four decision first. Bots never have
    // enough information to know whether a challenge would succeed (hidden
    // hand data), so the safe, non-exploitable default is to always accept
    // — a simple baseline, not a strategy tier (see UNO_GAME_PLAN.md §15
    // for future difficulty tiers).
    if (this.state.pendingChallenge && this.state.pendingChallenge.challengerId === playerId) {
      return this.applyMove({ playerId, type: "acceptDraw" });
    }

    // Never miss a declaration.
    if (this.canDeclareUno(playerId)) {
      return this.applyMove({ playerId, type: "declareUno" });
    }

    const hand = this.state.hands[playerId];
    if (!hand) return { ok: false };

    const topCard = this.state.discard[this.state.discard.length - 1];

    // Find first valid card
    const validCard = hand.find((card) =>
      this.isValidPlay(card, topCard, this.state.currentColor)
    );

    if (validCard) {
      // Play the first valid card
      // For Wild cards, pick a color (just use the most common in hand)
      let chosenColor: UnoColor | undefined;
      if (validCard.rank === "Wild" || validCard.rank === "Wild+4") {
        const colorCounts = { R: 0, G: 0, B: 0, Y: 0 };
        for (const c of hand) {
          if (c.color) colorCounts[c.color]++;
        }
        chosenColor = (
          Object.entries(colorCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
          "R"
        ) as UnoColor;
      }

      return this.applyMove({
        playerId,
        type: "play",
        data: { cardId: validCard.id, color: chosenColor },
      });
    }

    // No valid plays, draw
    const drawResult = this.applyMove({ playerId, type: "draw" });
    if (drawResult.ok && this.state.drewLastTurn) {
      // After drawing, pass
      return this.applyMove({ playerId, type: "pass" });
    }

    return drawResult;
  }
}
