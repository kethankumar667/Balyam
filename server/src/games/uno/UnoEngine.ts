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
/** Human-readable color names for lastAction announcements — the wire
 *  protocol only ever carries the single-letter UnoColor code, but
 *  "chose Blue!" reads far better in the action toast than "chose B!". */
const COLOR_NAMES: Record<UnoColor, string> = { R: "Red", G: "Green", B: "Blue", Y: "Yellow" };

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
  /** Current round within the match — starts at 1, incremented by
   *  startNewRound() (Volume 2/6 multi-round "race to a target score"
   *  matches). A single-round match (targetScore null) never advances
   *  past 1. */
  round: number;
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
  /** Non-null while Stack Draw Cards (Volume 4 §29) is mid-chain — the
   *  current player must play a matching card to keep it going, or draw
   *  the whole thing and forfeit their turn. Scoped to "+2" only; Wild
   *  Draw Four stacking is a deliberate, documented non-goal (see
   *  handleActionCard) given how much state the existing Wild+4
   *  legality/challenge machinery already carries. */
  pendingDrawStack: { count: number; kind: "+2" } | null;
  /** Mirrors UnoPublicState.lastHit — see that field's doc comment for
   *  the full rationale (client-side per-seat comedic flourishes,
   *  reliably targeted by id rather than parsed out of lastAction text). */
  lastHit: {
    targetIds: string[];
    kind: "skip" | "draw2" | "draw4" | "stack" | "swap" | "rotate" | "catch";
    count?: number;
  } | null;
}

export class UnoEngine implements GameEngine {
  readonly kind = "uno" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private state!: InternalUnoState;
  /** id -> display name, captured at init() — `lastAction` strings need a
   *  human-readable name, but the engine otherwise only ever stores ids. */
  private names: Record<string, string> = {};
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

  /** `this.names[id]`, falling back to the raw id — defensive only; every
   *  id in play should have been captured by init(). */
  private nameOf(id: string): string {
    return this.names[id] ?? id;
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
    this.names = {};
    for (const p of players) this.names[p.id] = p.name;

    const { hands, deck, discard, currentColor } = this.dealFreshRound(playerIds);

    this.state = {
      phase: "playing",
      round: 1,
      options: { ...this.pendingOptions },
      playerOrder: playerIds,
      turnIndex: 0,
      direction: 1,
      hands,
      deck,
      discard,
      currentColor,
      scores,
      turnDeadline: null,
      winnerId: null,
      lastAction: `Dealt 7 cards. ${playerIds[0] ? this.nameOf(playerIds[0]) : "Player"} to play.`,
      drewLastTurn: false,
      unoDeclaredBy: new Set(),
      pendingChallenge: null,
      pendingDrawStack: null,
      lastHit: null,
    };
  }

  /**
   * Shuffles a fresh 108-card deck, deals STARTING_HAND_SIZE to every seat
   * in `playerOrder`, and picks a non-Wild opening card (re-drawing per
   * Volume 4 §7 if the reveal lands on one). The deal algorithm shared by
   * init() (match start) and startNewRound() (each round after the first
   * in a Volume 2/6 multi-round target-score match) — doesn't touch
   * `this.state` itself so init() can still assemble the full initial
   * state object in one literal, matching every other engine's init()
   * shape.
   */
  private dealFreshRound(playerOrder: string[]): {
    hands: Record<string, UnoCard[]>;
    deck: UnoCard[];
    discard: UnoCard[];
    currentColor: UnoColor;
  } {
    const deck = this.createDeck();
    this.shuffle(deck);

    const hands: Record<string, UnoCard[]> = {};
    for (const id of playerOrder) hands[id] = [];

    let cardIndex = 0;
    for (let i = 0; i < STARTING_HAND_SIZE; i++) {
      for (const id of playerOrder) {
        hands[id].push(deck[cardIndex++]!);
      }
    }

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

    return {
      hands,
      deck: pool,
      discard: [startCard],
      currentColor: startCard.color ?? "R", // Defensive fallback only; see retry loop above.
    };
  }

  /**
   * Volume 2/6 "race to a target score" multi-round match structure —
   * unoonline.io's own "first to 500" headline feature (and Mattel's own
   * official default). Called instead of ending the match when a round's
   * winner hasn't reached `options.targetScore` yet: deals a completely
   * fresh round to the same `playerOrder`, keeping cumulative `scores`
   * (never touched here) and every match-level field (options,
   * playerOrder) — only per-round transient state resets. The round
   * winner deals/starts the next round, the common convention neither
   * Volume 4 nor Volume 2 contradicts.
   */
  private startNewRound(previousWinnerId: string): void {
    this.state.round += 1;
    const { hands, deck, discard, currentColor } = this.dealFreshRound(this.state.playerOrder);

    this.state.hands = hands;
    this.state.deck = deck;
    this.state.discard = discard;
    this.state.currentColor = currentColor;
    this.state.direction = 1;
    const dealerIndex = this.state.playerOrder.indexOf(previousWinnerId);
    this.state.turnIndex = dealerIndex === -1 ? 0 : dealerIndex; // defensive: winner always seated
    this.state.drewLastTurn = false;
    this.state.unoDeclaredBy = new Set();
    this.state.pendingChallenge = null;
    this.state.pendingDrawStack = null;
    this.state.winnerId = null; // match continues — this is a per-round field only until the real end
    this.state.lastHit = null; // a round transition itself isn't a "hit" moment
    this.state.lastAction = `Round ${this.state.round}! ${this.nameOf(previousWinnerId)} deals — ${this.nameOf(this.state.playerOrder[this.state.turnIndex]!)} to play.`;
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.state.phase === "finished") {
      return { ok: false, error: "Game is over" };
    }
    // Reset every move by default — only the specific branch that
    // produces a genuine "hit" (see UnoPublicState.lastHit) re-sets it,
    // so an unrelated later move never leaves a stale hit for the client
    // to (mis)react to.
    this.state.lastHit = null;

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
    if (moveType === "play" && move.playerId !== currentPlayerId) {
      // The only way a non-current player may act at all: Jump-In (Volume
      // 4 §30), gated entirely inside handleJumpIn (including whether the
      // house rule is even on) so this dispatch stays a thin router.
      const cardId = data?.cardId as string | undefined;
      const chosenColor = data?.color as UnoColor | undefined;
      if (!cardId) return { ok: false, error: "Missing cardId" };
      return this.handleJumpIn(move.playerId, cardId, chosenColor);
    }
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
    this.state.lastAction = `${this.nameOf(playerId)} declared UNO!`;
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
    this.state.lastHit = { targetIds: [targetId], kind: "catch", count: 2 };
    this.state.lastAction = `${this.nameOf(playerId)} caught ${this.nameOf(targetId)} without UNO! +2 penalty.`;
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
      this.state.lastHit = { targetIds: [pending.challengerId], kind: "draw4", count: 4 };
      this.state.lastAction = `${this.nameOf(pending.challengerId)} accepted the Wild Draw Four and drew 4.`;
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
      this.state.lastHit = { targetIds: [pending.playedById], kind: "draw4", count: 4 };
      this.state.lastAction = `${this.nameOf(pending.challengerId)} challenged successfully — ${this.nameOf(pending.playedById)} draws 4.`;
      this.state.turnIndex = this.stepIndex(this.state.turnIndex, 1);
      return { ok: true };
    }

    // Challenge fails: challenger draws 6 instead of 4, discouraging
    // frivolous challenges (Volume 4 §17).
    const drawn = this.drawCards(6);
    this.state.hands[pending.challengerId]!.push(...drawn);
    this.syncUnoDeclaration(pending.challengerId);
    this.state.lastHit = { targetIds: [pending.challengerId], kind: "draw4", count: 6 };
    this.state.lastAction = `${this.nameOf(pending.challengerId)} challenged and lost — draws 6.`;
    this.state.turnIndex = this.stepIndex(this.state.turnIndex, 2);
    return { ok: true };
  }

  private handleDraw(playerId: string): MoveResult {
    if (this.state.drewLastTurn) {
      return { ok: false, error: "Already drew this turn" };
    }

    // Stack Draw Cards (Volume 4 §29): the current player declined (or
    // couldn't) continue the stack — absorb the whole accumulated total
    // and the turn ends immediately, exactly like an un-stacked Draw Two.
    // No "then play or pass" window afterward, unlike a normal draw.
    if (this.state.pendingDrawStack) {
      const { count } = this.state.pendingDrawStack;
      const drawnStack = this.drawCards(count);
      this.state.hands[playerId].push(...drawnStack);
      this.syncUnoDeclaration(playerId);
      this.state.lastHit = { targetIds: [playerId], kind: "stack", count };
      this.state.lastAction = `${this.nameOf(playerId)} draws ${count} from the stack.`;
      this.state.pendingDrawStack = null;
      this.state.drewLastTurn = false;
      this.advanceTurn();
      return { ok: true };
    }

    // Keep Drawing (Volume 4 §33, house rule): draw repeatedly until a
    // playable card appears, instead of stopping at one. Bounded by
    // drawCards() itself returning fewer cards than requested once the
    // deck+discard are truly exhausted, so this always terminates even in
    // a pathological all-wrong-color remainder.
    const topCard = this.state.discard[this.state.discard.length - 1];
    const drawLimit = this.state.options.keepDrawing ? 200 : 1;
    let drewCount = 0;
    let landedPlayable: UnoCard | null = null;

    for (let i = 0; i < drawLimit; i++) {
      const drawn = this.drawCards(1);
      if (drawn.length === 0) break; // truly out of cards anywhere
      const newCard = drawn[0]!;
      this.state.hands[playerId].push(newCard);
      drewCount++;
      if (this.isPlayableNow(newCard, topCard, this.state.currentColor)) {
        landedPlayable = newCard;
        break;
      }
    }

    if (drewCount > 0) {
      this.syncUnoDeclaration(playerId);
      this.state.drewLastTurn = true;
      this.state.lastAction =
        drewCount === 1
          ? `${this.nameOf(playerId)} drew a card`
          : `${this.nameOf(playerId)} drew ${drewCount} cards looking for a play`;
    }

    // Force Play (Volume 4 §34, house rule): if what was drawn is
    // playable, it's played automatically — no manual decision. Routes
    // through the exact same finalizePlayedCard tail a manual play uses.
    if (this.state.options.forcePlay && landedPlayable) {
      const hand = this.state.hands[playerId]!;
      const cardIndex = hand.findIndex((c) => c.id === landedPlayable!.id);
      if (cardIndex !== -1) {
        const card = hand[cardIndex]!;
        const chosenColor =
          card.rank === "Wild" || card.rank === "Wild+4"
            ? this.pickColorForHand(hand)
            : undefined;
        const wasLegalWildFour =
          card.rank === "Wild+4" ? !hand.some((c) => c.color === this.state.currentColor) : true;
        // finalizePlayedCard always overwrites lastAction with the played
        // card's own description — capture the Keep Drawing note first (if
        // any) so a multi-card draw doesn't silently vanish from the toast
        // the instant Force Play auto-plays the card it landed on.
        const drawNote = drewCount > 1 ? this.state.lastAction : null;
        hand.splice(cardIndex, 1);
        this.syncUnoDeclaration(playerId);
        const result = this.finalizePlayedCard(playerId, card, chosenColor, wasLegalWildFour);
        if (drawNote && this.state.lastAction) {
          this.state.lastAction = `${drawNote} → ${this.state.lastAction}`;
        }
        return result;
      }
    }

    return { ok: true };
  }

  /**
   * The single source of truth for "can this specific card be played right
   * now" — wraps isValidPlay with the Stack Draw Cards house rule's
   * override (Volume 4 §29): while a draw stack is pending, only a card
   * matching the pending stack's kind may be played; every other card
   * (including a normally legal color/rank match) is illegal until the
   * stack is resolved via handleDraw. Used by handlePlay, getStateFor's
   * validMoves, and applyAutoMove so the restriction is consistent
   * everywhere a "can I play this" question is asked.
   */
  private isPlayableNow(
    card: UnoCard,
    topCard: UnoCard,
    currentColor: UnoColor | null
  ): boolean {
    if (this.state.pendingDrawStack) {
      return card.rank === this.state.pendingDrawStack.kind;
    }
    return this.isValidPlay(card, topCard, currentColor);
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

    if (!this.isPlayableNow(card, topCard, this.state.currentColor)) {
      return {
        ok: false,
        error: this.state.pendingDrawStack
          ? `Must play a matching ${this.state.pendingDrawStack.kind} or draw ${this.state.pendingDrawStack.count}`
          : "Invalid play: color/rank mismatch",
      };
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

    hand.splice(cardIndex, 1);
    this.syncUnoDeclaration(playerId);

    return this.finalizePlayedCard(playerId, card, chosenColor, wasLegalWildFour);
  }

  /**
   * Jump-In (Volume 4 §30, house rule): a player who is NOT the current
   * turn holder may play a card that is an EXACT match (same color AND
   * same rank) to the top of the discard pile, at any time. Wild/Wild+4
   * are colorless (`color: null`) and therefore can never be "identical"
   * to anything — a deliberate, documented scope decision, not an
   * oversight. Play order continues from the jumper afterward, so
   * turnIndex is snapped to their seat before the shared resolution tail
   * runs.
   */
  private handleJumpIn(
    playerId: string,
    cardId: string,
    chosenColor?: UnoColor
  ): MoveResult {
    if (!this.state.options.jumpIn) {
      return { ok: false, error: "Not your turn" };
    }
    if (this.state.pendingChallenge) {
      return { ok: false, error: "Waiting for a Wild Draw Four decision" };
    }
    if (this.state.pendingDrawStack) {
      return { ok: false, error: "A draw stack is active — only the current player may respond" };
    }
    const hand = this.state.hands[playerId];
    if (!hand) return { ok: false, error: "Unknown player" };
    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return { ok: false, error: "Card not in hand" };
    const card = hand[cardIndex]!;
    const topCard = this.state.discard[this.state.discard.length - 1];

    if (card.color === null || card.color !== topCard.color || card.rank !== topCard.rank) {
      return { ok: false, error: "Not your turn" };
    }

    hand.splice(cardIndex, 1);
    this.syncUnoDeclaration(playerId);
    this.state.turnIndex = this.state.playerOrder.indexOf(playerId);
    this.state.lastAction = `${this.nameOf(playerId)} jumped in!`;

    return this.finalizePlayedCard(playerId, card, chosenColor, true);
  }

  /**
   * Shared tail for every way a card can leave a hand onto the discard
   * pile — a normal in-turn play (handlePlay), a Jump-In (handleJumpIn),
   * or an auto-resolved Force Play draw (handleDraw). Every caller has
   * ALREADY removed the card from the player's hand and called
   * syncUnoDeclaration; this owns what happens once the card is on the
   * discard pile: color update, win check, Wild+4 defer-to-challenge, and
   * turn advance via handleActionCard. `wasLegalWildFour` must be computed
   * by the caller BEFORE splicing (it needs the hand as it stood with the
   * card still in it) — Jump-In cards are never Wild+4 (see the
   * exact-match guard above) so that caller always passes `true`.
   */
  private finalizePlayedCard(
    playerId: string,
    card: UnoCard,
    chosenColor: UnoColor | undefined,
    wasLegalWildFour: boolean
  ): MoveResult {
    this.state.discard.push(card);
    this.state.currentColor = chosenColor || card.color;
    this.state.drewLastTurn = false;

    const hand = this.state.hands[playerId]!;
    if (hand.length === 0) {
      this.awardRoundPoints(playerId);
      const target = this.state.options.targetScore;
      const reachedTarget = target != null && (this.state.scores[playerId] ?? 0) >= target;
      if (target == null || reachedTarget) {
        this.state.phase = "finished";
        this.state.winnerId = playerId;
        return { ok: true, isOver: true, winnerId: playerId };
      }
      // Volume 2/6: target not reached yet — the match continues with a
      // fresh round instead of ending here.
      this.startNewRound(playerId);
      return { ok: true };
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
      this.state.lastAction = `Wild Draw Four! ${this.nameOf(playerId)} chose ${COLOR_NAMES[this.state.currentColor!]}. Waiting for ${this.nameOf(targetId)} to accept or challenge.`;
      return { ok: true };
    }

    // Handle action cards (and, with house rules on, 0/7/stacked +2 too).
    // Reverse flips this.state.direction inside here, so by the time we
    // step below, "direction" already reflects the new direction.
    const actionResult = this.handleActionCard(card, playerId);
    this.state.lastHit = actionResult.hit ?? null;
    this.state.lastAction = actionResult.description;
    this.state.turnIndex = this.stepIndex(this.state.turnIndex, actionResult.turnAdvance);

    return { ok: true };
  }

  /** Volume 4 §32 (Zero Rotate, house rule): every hand moves one seat in
   *  the current play direction — direction-aware since a Reverse earlier
   *  in the same play already flipped this.state.direction before this
   *  runs. */
  private rotateHands(): void {
    const order = this.state.playerOrder;
    const n = order.length;
    if (n < 2) return;
    const snapshot = order.map((id) => this.state.hands[id]!);
    for (let i = 0; i < n; i++) {
      const fromIndex = ((i - this.state.direction) % n + n) % n;
      this.state.hands[order[i]!] = snapshot[fromIndex]!;
    }
    for (const id of order) this.syncUnoDeclaration(id);
  }

  /** Volume 4 §31 (Seven Swap, house rule, "Random target" mode): swaps
   *  the player's hand with a randomly chosen opponent's. "Player choice"
   *  mode (host picks who via a target-selection UI) is a stated, deferred
   *  enhancement — random-target is a complete, spec-valid variant on its
   *  own, not a stub. Returns the id swapped with. */
  private performSevenSwap(playerId: string): string {
    const opponents = this.state.playerOrder.filter((id) => id !== playerId);
    const swapWithId = opponents[Math.floor(this.rng() * opponents.length)]!;
    const myHand = this.state.hands[playerId]!;
    this.state.hands[playerId] = this.state.hands[swapWithId]!;
    this.state.hands[swapWithId] = myHand;
    this.syncUnoDeclaration(playerId);
    this.syncUnoDeclaration(swapWithId);
    return swapWithId;
  }

  /** Picks a color for an about-to-be-played Wild/Wild+4 by majority color
   *  in `hand` — the bot heuristic from applyAutoMove, extracted so Force
   *  Play (handleDraw) can reuse the exact same, hand-scoped-only logic
   *  instead of inventing a second version. Never reads anything beyond
   *  the hand passed in — no hidden-information risk. */
  private pickColorForHand(hand: UnoCard[]): UnoColor {
    const colorCounts: Record<UnoColor, number> = { R: 0, G: 0, B: 0, Y: 0 };
    for (const c of hand) {
      if (c.color) colorCounts[c.color]++;
    }
    const best = Object.entries(colorCounts).sort(([, a], [, b]) => b - a)[0];
    return (best?.[0] as UnoColor) ?? "R";
  }

  private handlePass(playerId: string): MoveResult {
    if (!this.state.drewLastTurn) {
      return { ok: false, error: "Can only pass after drawing" };
    }

    this.state.drewLastTurn = false;
    this.advanceTurn();
    this.state.lastAction = `${this.nameOf(playerId)} passed`;

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
    card: UnoCard,
    playerId: string
  ): {
    turnAdvance: number;
    description: string;
    /** A hit worth a client-side comedic flourish (Skip/Draw Two/Zero
     *  Rotate/Seven Swap) — omitted for effect-less cards (plain numbers,
     *  Reverse with 3+ players, Wild). Wild Draw Four's own hit is set
     *  separately in handleChallengeDecision, once it actually resolves. */
    hit?: { targetIds: string[]; kind: "skip" | "draw2" | "swap" | "rotate"; count?: number };
  } {
    if (card.rank === "Skip") {
      const skippedId = this.state.playerOrder[this.stepIndex(this.state.turnIndex, 1)]!;
      return {
        turnAdvance: 2,
        description: `Skip! ${this.nameOf(skippedId)} loses a turn.`,
        hit: { targetIds: [skippedId], kind: "skip" },
      };
    }

    if (card.rank === "Reverse") {
      this.state.direction *= -1;
      const dir = this.state.direction === 1 ? "clockwise" : "counter-clockwise";
      // Official rule: with exactly 2 players, Reverse acts as Skip (the
      // magnitude-2 hop is direction-symmetric, so this needs no direction
      // branch — it lands back on the same player either way).
      const twoPlayerSkip = this.state.playerOrder.length === 2;
      if (twoPlayerSkip) {
        const skippedId = this.state.playerOrder[this.stepIndex(this.state.turnIndex, 1)]!;
        return {
          turnAdvance: 2,
          description: `Reverse! Acts as Skip — ${this.nameOf(skippedId)} loses a turn.`,
          hit: { targetIds: [skippedId], kind: "skip" },
        };
      }
      return { turnAdvance: 1, description: `Reverse! Playing ${dir}.` };
    }

    if (card.rank === "+2") {
      if (this.state.options.stackDrawCards) {
        // Volume 4 §29 (Stack Draw Cards, house rule): defer the draw —
        // accumulate onto pendingDrawStack instead of resolving
        // immediately. The next player must play a matching +2 to pass the
        // stack along (handlePlay/isPlayableNow enforce that), or draw the
        // whole thing via handleDraw. Scoped to "+2" only — see
        // isPlayableNow's doc comment for why Wild+4 doesn't stack here.
        const priorCount =
          this.state.pendingDrawStack?.kind === "+2" ? this.state.pendingDrawStack.count : 0;
        this.state.pendingDrawStack = { count: priorCount + 2, kind: "+2" };
        return {
          turnAdvance: 1,
          description: `Draw Two stacked — ${this.state.pendingDrawStack.count} pending!`,
        };
      }
      const nextPlayerId = this.state.playerOrder[this.stepIndex(this.state.turnIndex, 1)]!;
      const drawn = this.drawCards(2);
      this.state.hands[nextPlayerId]!.push(...drawn);
      this.syncUnoDeclaration(nextPlayerId);
      return {
        turnAdvance: 2,
        description: `Draw Two! ${this.nameOf(nextPlayerId)} draws 2 cards.`,
        hit: { targetIds: [nextPlayerId], kind: "draw2", count: 2 },
      };
    }

    if (card.rank === "0" && this.state.options.zeroRotate) {
      this.rotateHands();
      return {
        turnAdvance: 1,
        description: "Zero! Everyone rotates hands.",
        hit: { targetIds: [...this.state.playerOrder], kind: "rotate" },
      };
    }

    if (card.rank === "7" && this.state.options.sevenSwap) {
      const swappedWithId = this.performSevenSwap(playerId);
      return {
        turnAdvance: 1,
        description: `Seven! ${this.nameOf(playerId)} swapped hands with ${this.nameOf(swappedWithId)}.`,
        hit: { targetIds: [playerId, swappedWithId], kind: "swap" },
      };
    }

    if (card.rank === "Wild") {
      // Plain Wild has no dedicated turn-order effect, but it DOES change
      // currentColor — announcing that choice is the whole point of the
      // card. Before this branch existed, a plain Wild fell through to the
      // generic "Card played." default below, silently dropping the one
      // piece of information every other player actually needs (Bhalyam
      // issue: "no indication of the player's chosen colour").
      // this.state.currentColor is already set to the chosen color by the
      // time finalizePlayedCard calls this (color update happens first).
      return {
        turnAdvance: 1,
        description: `${this.nameOf(playerId)} played Wild — chose ${COLOR_NAMES[this.state.currentColor!]}!`,
      };
    }

    // Wild+4 is NOT handled here — finalizePlayedCard() intercepts it
    // before this function is ever called, since it needs a
    // challenge-decision pause rather than an immediate turnAdvance.

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
      round: this.state.round,
      targetScore: this.state.options.targetScore,
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
      pendingDrawCount: this.state.pendingDrawStack?.count ?? 0,
      activeHouseRules: {
        stackDrawCards: this.state.options.stackDrawCards,
        jumpIn: this.state.options.jumpIn,
        sevenSwap: this.state.options.sevenSwap,
        zeroRotate: this.state.options.zeroRotate,
        keepDrawing: this.state.options.keepDrawing,
        forcePlay: this.state.options.forcePlay,
      },
      lastHit: this.state.lastHit,
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
        this.isPlayableNow(card, topCard, this.state.currentColor)
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
      this.isPlayableNow(card, topCard, this.state.currentColor)
    );

    if (validCard) {
      // Play the first valid card. For Wild cards, pick a color via the
      // shared majority-color heuristic (also used by Force Play).
      const chosenColor =
        validCard.rank === "Wild" || validCard.rank === "Wild+4"
          ? this.pickColorForHand(hand)
          : undefined;

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
