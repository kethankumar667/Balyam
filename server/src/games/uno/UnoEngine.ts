import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  UnoCard,
  UnoColor,
  UnoPublicState,
  UnoPlayerState,
  UnoRank,
} from "@shared/types.js";

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
 */
interface InternalUnoState {
  phase: "playing" | "finished";
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
}

export class UnoEngine implements GameEngine {
  readonly kind = "uno" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 8;

  private state!: InternalUnoState;

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

    // Initialize discard with first card from deck
    const discard: UnoCard[] = [];
    let startCard = deck[cardIndex++]!;
    // If start card is Wild, we'll choose a color after init
    discard.push(startCard);

    // Remaining cards form the draw pile
    const drawPile = deck.slice(cardIndex);

    this.state = {
      phase: "playing",
      playerOrder: playerIds,
      turnIndex: 0,
      direction: 1,
      hands,
      deck: drawPile,
      discard,
      currentColor:
        startCard.color === null ? "R" : startCard.color, // Default to Red for Wild
      scores,
      turnDeadline: null,
      winnerId: null,
      lastAction: `Dealt 7 cards. ${playerIds[0] || "Player"} to play.`,
      drewLastTurn: false,
    };
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.state.phase === "finished") {
      return { ok: false, error: "Game is over" };
    }

    const currentPlayerId = this.state.playerOrder[this.state.turnIndex];
    if (move.playerId !== currentPlayerId) {
      return { ok: false, error: "Not your turn" };
    }

    const data = move.data as Record<string, unknown> | undefined;
    const moveType = move.type as string;

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

  private handleDraw(playerId: string): MoveResult {
    if (this.state.drewLastTurn) {
      return { ok: false, error: "Already drew this turn" };
    }

    const drawn = this.drawCards(1);
    if (drawn.length > 0) {
      this.state.hands[playerId].push(drawn[0]!);
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

    // Play the card
    hand.splice(cardIndex, 1);
    this.state.discard.push(card);
    this.state.currentColor = chosenColor || card.color;
    this.state.drewLastTurn = false;

    // Check win
    if (hand.length === 0) {
      this.state.phase = "finished";
      this.state.winnerId = playerId;
      return { ok: true, isOver: true, winnerId: playerId };
    }

    // Handle action cards
    const actionResult = this.handleActionCard(card);
    this.state.lastAction = actionResult.description;

    // Advance turn (may advance by 1 or 2 depending on card)
    this.state.turnIndex =
      (this.state.turnIndex + actionResult.turnAdvance) %
      this.state.playerOrder.length;

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
      return { turnAdvance: 1, description: `Reverse! Playing ${dir}.` };
    }

    if (card.rank === "+2") {
      const nextPlayerId =
        this.state.playerOrder[
          (this.state.turnIndex + 1) % this.state.playerOrder.length
        ];
      const drawn = this.drawCards(2);
      this.state.hands[nextPlayerId!].push(...drawn);
      return {
        turnAdvance: 2,
        description: `Draw Two! Next player draws 2.`,
      };
    }

    if (card.rank === "Wild+4") {
      const nextPlayerId =
        this.state.playerOrder[
          (this.state.turnIndex + 1) % this.state.playerOrder.length
        ];
      const drawn = this.drawCards(4);
      this.state.hands[nextPlayerId!].push(...drawn);
      return {
        turnAdvance: 2,
        description: `Wild Draw Four! Next player draws 4.`,
      };
    }

    return { turnAdvance: 1, description: "Card played." };
  }

  private advanceTurn(): void {
    this.state.turnIndex =
      (this.state.turnIndex + 1) % this.state.playerOrder.length;
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
      const j = Math.floor(Math.random() * (i + 1));
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

  pendingActors(): string[] {
    if (this.state.phase !== "playing") return [];
    return [this.state.playerOrder[this.state.turnIndex] || ""];
  }

  applyAutoMove(playerId: string): MoveResult {
    if (this.state.phase !== "playing") return { ok: false };

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
