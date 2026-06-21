import type {
  Card,
  Player,
  RummyGameOptions,
  RummyMatchMode,
  RummyPlayerState,
  RummyPublicState,
} from "@shared/types.js";
import { DEFAULT_RUMMY_OPTIONS } from "@shared/types.js";
import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import { deal } from "./deck.js";
import { validateDeclare } from "./declare.js";
import {
  pointsOfHand,
  bestArrangementForScoring,
  scoreFromArrangement,
  INVALID_DECLARE_PENALTY,
} from "./score.js";
import { findValidDeclaration, pickBestDiscard, shouldDrawFromOpen } from "./botArrange.js";

interface InternalState {
  phase: "playing" | "finished";
  hands: Map<string, Card[]>;
  closedDeck: Card[];
  openPile: Card[];
  wildJoker: Card;
  playerOrder: string[];
  turnIndex: number;
  turnAction: "draw" | "discardOrDeclare";
  winnerId: string | null;
  invalidDeclareBy: string | null;
  scores: Record<string, number>;
  finalHands: Record<string, Card[]>;
  finalMelds: Record<string, string[][]>;
  droppedPlayers: Set<string>;
  turnDeadline: number | null;
  options: RummyGameOptions;
  /** All players (kept for resetting between rounds). */
  allPlayers: Player[];
  matchMode: RummyMatchMode;
  poolTarget: number | null;
  cumulativeScores: Map<string, number>;
  eliminatedInMatch: Set<string>;
  roundNumber: number;
  matchWinnerId: string | null;
  matchOver: boolean;
}

function poolTargetFor(mode: RummyMatchMode): number | null {
  if (mode === "pool101") return 101;
  if (mode === "pool201") return 201;
  return null;
}

/** Drop penalty per the common Indian Rummy convention: first-drop = 20 points. */
const DROP_PENALTY = 20;

/** Per-action turn timers. Draw gets a longer think; discard is committed quickly. */
const RUMMY_DRAW_SECONDS = 30;
const RUMMY_DISCARD_SECONDS = 15;

export class RummyEngine implements GameEngine {
  readonly kind = "rummy" as const;
  readonly minPlayers = 2;
  readonly maxPlayers = 6;

  private s!: InternalState;
  private pendingOptions: RummyGameOptions = { ...DEFAULT_RUMMY_OPTIONS };
  /**
   * Last known client-side arrangement per player, keyed by player id.
   * Each value is a list of groups; each group is a list of card ids in
   * the order the player has placed them. Cards not listed in any group
   * are considered "ungrouped". The server uses this to score losers on
   * round end so the scorecard credits the SAME groups the player built
   * during play. Cleared on each new round.
   */
  private arrangements = new Map<string, string[][]>();

  /** Set game options before init. */
  setOptions(options: RummyGameOptions): void {
    this.pendingOptions = { ...DEFAULT_RUMMY_OPTIONS, ...options };
  }

  setTurnDeadline(deadline: number): void {
    this.s.turnDeadline = deadline;
  }

  clearTurnDeadline(): void {
    this.s.turnDeadline = null;
  }

  /**
   * Rummy uses TWO turn timers — draw and discard — instead of one
   * combined window. The user gets a longer think on the draw decision
   * (which pile, plan the build) and a shorter window to actually
   * commit the discard / declare. Returns the appropriate timer for
   * the current sub-action.
   *
   *   draw            → RUMMY_DRAW_SECONDS  (30s default)
   *   discardOrDeclare → RUMMY_DISCARD_SECONDS (15s default)
   *
   * Falls back to the legacy combined option if a custom value was
   * supplied via setOptions.
   */
  getTurnTimerSeconds(): number {
    const opts = this.s?.options ?? DEFAULT_RUMMY_OPTIONS;
    if (!this.s) return opts.turnTimerSeconds;
    return this.s.turnAction === "draw"
      ? opts.drawTimerSeconds ?? RUMMY_DRAW_SECONDS
      : opts.discardTimerSeconds ?? RUMMY_DISCARD_SECONDS;
  }

  /**
   * Record the player's current hand arrangement (drag-and-drop groups).
   * Called every time the client emits `rummy:arrangement`. We don't
   * validate here — invalid groups fall through to ungrouped during
   * scoreFromArrangement, so they don't earn the player free credit.
   */
  setArrangement(playerId: string, groups: string[][]): void {
    if (!this.s) return;
    if (!this.s.playerOrder.includes(playerId)) return;
    if (!Array.isArray(groups)) return;
    // Defensive copy + filter so a malformed payload can't crash later.
    const normalised = groups
      .filter((g) => Array.isArray(g))
      .map((g) => g.filter((id) => typeof id === "string"));
    this.arrangements.set(playerId, normalised);
  }

  /**
   * Apply a sensible auto-move when the turn timer expires:
   *   • If the player still needs to draw → draw from the closed deck.
   *   • If they've drawn → discard the highest-point non-joker card.
   * Returns whether the auto-move was applied.
   */
  applyAutoMove(playerId: string): MoveResult {
    if (this.s.phase === "finished") return { ok: false, error: "Game over" };
    const current = this.s.playerOrder[this.s.turnIndex];
    if (playerId !== current) return { ok: false, error: "Not current player" };
    if (this.s.droppedPlayers.has(playerId)) return { ok: false, error: "Dropped" };

    const hand = this.s.hands.get(playerId);
    if (!hand) return { ok: false, error: "No hand" };
    const wildRank = this.s.wildJoker.rank;

    if (this.s.turnAction === "draw") {
      // Opportunistically pick up the open-pile top when it slots into a
      // near-meld. shouldDrawFromOpen handles the printed-joker / empty-pile
      // edge cases and falls back to false, so a "closed" draw is always
      // safe as the default.
      const openTop =
        this.s.openPile.length > 0
          ? this.s.openPile[this.s.openPile.length - 1]
          : null;
      const from = shouldDrawFromOpen(hand, openTop, wildRank) ? "open" : "closed";
      return this.handleDraw({
        playerId,
        type: "draw",
        data: { from },
      });
    }

    // discardOrDeclare: first try a real declaration — if the hand happens to
    // be arrangeable into valid melds, the bot wins this round. Otherwise
    // discard with retain-value awareness instead of blindly dumping the
    // highest-point card (which used to break up near-melds the bot had been
    // building — most visible on the score-card's leftover hand).
    const declaration = findValidDeclaration(hand, wildRank);
    if (declaration) {
      return this.handleDeclare({
        playerId,
        type: "declare",
        data: {
          discardCardId: declaration.discardCardId,
          melds: declaration.melds.map((g) => g.map((c) => c.id)),
        },
      });
    }

    const discardId = pickBestDiscard(hand, wildRank);
    return this.handleDiscard({
      playerId,
      type: "discard",
      data: { cardId: discardId },
    });
  }

  init(players: Player[]): void {
    if (players.length < this.minPlayers || players.length > this.maxPlayers) {
      throw new Error(`Rummy requires ${this.minPlayers}-${this.maxPlayers} players`);
    }
    const ids = players.map((p) => p.id);
    const { hands, closedDeck, openPile, wildJoker } = deal(ids);
    const cumulativeScores = new Map<string, number>();
    for (const id of ids) cumulativeScores.set(id, 0);
    this.s = {
      phase: "playing",
      hands: new Map(Object.entries(hands)),
      closedDeck,
      openPile,
      wildJoker,
      playerOrder: ids,
      turnIndex: 0,
      turnAction: "draw",
      winnerId: null,
      invalidDeclareBy: null,
      scores: {},
      finalHands: {},
      finalMelds: {},
      droppedPlayers: new Set(),
      turnDeadline: null,
      options: { ...this.pendingOptions },
      allPlayers: players.slice(),
      matchMode: this.pendingOptions.mode,
      poolTarget: poolTargetFor(this.pendingOptions.mode),
      cumulativeScores,
      eliminatedInMatch: new Set(),
      roundNumber: 1,
      matchWinnerId: null,
      matchOver: false,
    };
  }

  /**
   * Deal a fresh round in pool mode. Drops cards/closed deck/open pile state
   * but preserves cumulativeScores, eliminatedInMatch, matchOver, etc.
   * No-op if not in pool mode or if the match is already over.
   */
  private startNextRound(): MoveResult {
    if (this.s.matchOver) return { ok: false, error: "Match is over" };
    if (this.s.poolTarget == null) {
      return { ok: false, error: "Next round only available in pool mode" };
    }
    if (this.s.phase !== "finished") {
      return { ok: false, error: "Current round still in progress" };
    }
    // Active players = not eliminated.
    const activeIds = this.s.playerOrder.filter(
      (id) => !this.s.eliminatedInMatch.has(id),
    );
    if (activeIds.length < 2) {
      return { ok: false, error: "Not enough active players to deal another round" };
    }
    const { hands, closedDeck, openPile, wildJoker } = deal(activeIds);
    this.s.hands = new Map(Object.entries(hands));
    this.s.closedDeck = closedDeck;
    this.s.openPile = openPile;
    this.s.wildJoker = wildJoker;
    this.s.playerOrder = activeIds;
    this.s.turnIndex = 0;
    this.s.turnAction = "draw";
    this.s.phase = "playing";
    this.s.winnerId = null;
    this.s.invalidDeclareBy = null;
    this.s.scores = {};
    this.s.finalHands = {};
    this.s.finalMelds = {};
    this.s.droppedPlayers = new Set();
    this.s.turnDeadline = null;
    this.s.roundNumber += 1;
    // Wipe stale arrangements — last round's groups don't apply to the
    // fresh hands dealt for this round.
    this.arrangements.clear();
    return { ok: true };
  }

  /**
   * After a round ends, apply per-round scores to cumulativeScores and check
   * for pool-mode eliminations + final match winner.
   */
  private updateMatchScoresAfterRound(): void {
    if (this.s.poolTarget == null) return;
    const target = this.s.poolTarget;
    for (const id of this.s.playerOrder) {
      const add = this.s.scores[id] ?? 0;
      const prev = this.s.cumulativeScores.get(id) ?? 0;
      this.s.cumulativeScores.set(id, prev + add);
    }
    // Mark eliminations.
    for (const id of this.s.playerOrder) {
      const cum = this.s.cumulativeScores.get(id) ?? 0;
      if (cum >= target) this.s.eliminatedInMatch.add(id);
    }
    // Check if match is over (≤1 active).
    const active = this.s.playerOrder.filter(
      (id) => !this.s.eliminatedInMatch.has(id),
    );
    if (active.length <= 1) {
      this.s.matchOver = true;
      this.s.matchWinnerId = active[0] ?? null;
    }
  }

  applyMove(move: MoveContext): MoveResult {
    // newRound is special: allowed only when the round phase is "finished".
    if (move.type === "newRound") {
      if (!this.s.playerOrder.includes(move.playerId)) {
        return { ok: false, error: "Not a player in this match" };
      }
      if (this.s.eliminatedInMatch.has(move.playerId)) {
        return { ok: false, error: "You're eliminated" };
      }
      return this.startNextRound();
    }

    if (this.s.phase === "finished") return { ok: false, error: "Round is over" };

    const currentPlayer = this.s.playerOrder[this.s.turnIndex];
    if (move.playerId !== currentPlayer) {
      return { ok: false, error: "Not your turn" };
    }

    switch (move.type) {
      case "draw":
        return this.handleDraw(move);
      case "discard":
        return this.handleDiscard(move);
      case "declare":
        return this.handleDeclare(move);
      case "drop":
        return this.handleDrop(move);
      default:
        return { ok: false, error: `Unknown move type: ${move.type}` };
    }
  }

  private handleDrop(move: MoveContext): MoveResult {
    if (this.s.droppedPlayers.has(move.playerId)) {
      return { ok: false, error: "You already dropped" };
    }
    if (this.s.turnAction !== "draw") {
      return { ok: false, error: "You can only drop before drawing" };
    }
    this.s.droppedPlayers.add(move.playerId);
    this.s.scores[move.playerId] = DROP_PENALTY;
    const hand = this.s.hands.get(move.playerId);
    if (hand) this.s.finalHands[move.playerId] = hand.slice();

    // If only one active (non-dropped) player remains, they win.
    const active = this.s.playerOrder.filter(
      (id) => !this.s.droppedPlayers.has(id) && this.s.hands.has(id),
    );
    if (active.length === 1) {
      const winner = active[0];
      this.s.winnerId = winner;
      this.s.scores[winner] = 0;
      const winnerHand = this.s.hands.get(winner) ?? [];
      this.s.finalHands[winner] = winnerHand.slice();
      this.s.phase = "finished";
      this.updateMatchScoresAfterRound();
      return { ok: true, isOver: true, winnerId: winner };
    }
    if (active.length === 0) {
      this.s.phase = "finished";
      this.updateMatchScoresAfterRound();
      return { ok: true, isOver: true };
    }
    this.advanceTurn();
    return { ok: true };
  }

  private handleDraw(move: MoveContext): MoveResult {
    if (this.s.turnAction !== "draw") {
      return { ok: false, error: "You already drew this turn" };
    }
    const data = move.data as { from?: "closed" | "open" } | undefined;
    const from = data?.from;
    if (from !== "closed" && from !== "open") {
      return { ok: false, error: "Specify 'closed' or 'open' deck" };
    }
    const hand = this.s.hands.get(move.playerId);
    if (!hand) return { ok: false, error: "Player has no hand" };

    if (from === "closed") {
      if (this.s.closedDeck.length === 0) {
        this.reshuffleOpenIntoClosed();
        if (this.s.closedDeck.length === 0) {
          return { ok: false, error: "Deck exhausted" };
        }
      }
      const drawn = this.s.closedDeck.shift()!;
      hand.push(drawn);
    } else {
      if (this.s.openPile.length === 0) {
        return { ok: false, error: "Open pile is empty" };
      }
      const top = this.s.openPile[this.s.openPile.length - 1];
      // House rule: printed jokers ("special jokers") cannot be picked up from
      // the discard pile. They're only earned via the deal. This prevents a
      // player from grabbing a misclick-discarded joker mid-round.
      if (top.isPrintedJoker) {
        return { ok: false, error: "Printed jokers cannot be drawn from the discard pile" };
      }
      const drawn = this.s.openPile.pop()!;
      hand.push(drawn);
    }
    this.s.turnAction = "discardOrDeclare";
    return { ok: true };
  }

  private handleDiscard(move: MoveContext): MoveResult {
    if (this.s.turnAction !== "discardOrDeclare") {
      return { ok: false, error: "Draw before discarding" };
    }
    const data = move.data as { cardId?: string } | undefined;
    const cardId = data?.cardId;
    if (!cardId) return { ok: false, error: "Missing cardId" };

    const hand = this.s.hands.get(move.playerId);
    if (!hand) return { ok: false, error: "Player has no hand" };
    const idx = hand.findIndex((c) => c.id === cardId);
    if (idx < 0) return { ok: false, error: "Card not in hand" };

    const [card] = hand.splice(idx, 1);
    this.s.openPile.push(card);
    this.advanceTurn();
    return { ok: true };
  }

  private handleDeclare(move: MoveContext): MoveResult {
    if (this.s.turnAction !== "discardOrDeclare") {
      return { ok: false, error: "Draw before declaring" };
    }
    const data = move.data as
      | { discardCardId?: string; melds?: string[][] }
      | undefined;
    const discardCardId = data?.discardCardId;
    const meldGroupIds = data?.melds;
    if (!discardCardId || !meldGroupIds) {
      return { ok: false, error: "Provide discardCardId and melds" };
    }

    const hand = this.s.hands.get(move.playerId);
    if (!hand) return { ok: false, error: "Player has no hand" };

    if (hand.length !== 14) {
      return { ok: false, error: "Internal: hand size must be 14 on declare" };
    }

    const byId = new Map(hand.map((c) => [c.id, c]));
    const discard = byId.get(discardCardId);
    if (!discard) return { ok: false, error: "Discard card not in hand" };

    const meldGroups: Card[][] = [];
    for (const group of meldGroupIds) {
      const cards: Card[] = [];
      for (const cid of group) {
        if (cid === discardCardId) {
          return { ok: false, error: "Discard card cannot appear in a meld" };
        }
        const c = byId.get(cid);
        if (!c) return { ok: false, error: `Card ${cid} not in hand` };
        cards.push(c);
      }
      meldGroups.push(cards);
    }

    const result = validateDeclare(meldGroups, this.s.wildJoker.rank);
    if (!result.ok) {
      this.finalizeWithInvalidDeclare(move.playerId, meldGroupIds);
      return { ok: false, error: result.error, isOver: true };
    }

    this.finalizeWithWinner(move.playerId, discard, meldGroupIds);
    return { ok: true, isOver: true, winnerId: move.playerId };
  }

  private finalizeWithWinner(
    winnerId: string,
    discard: Card,
    winnerMelds: string[][],
  ): void {
    const winnerHand = this.s.hands.get(winnerId)!;
    winnerHand.splice(
      winnerHand.findIndex((c) => c.id === discard.id),
      1,
    );
    this.s.openPile.push(discard);

    for (const pid of this.s.playerOrder) {
      const hand = this.s.hands.get(pid) ?? [];
      this.s.finalHands[pid] = hand.slice();
      if (pid === winnerId) {
        this.s.scores[pid] = 0;
        continue;
      }
      // Losers: score from the player's last submitted arrangement so
      // the scorecard's groups + points match what the player saw during
      // play. If no arrangement was received (e.g. a bot, or a stale
      // round), fall back to the engine's best-credit auto-arrangement.
      const submitted = this.arrangements.get(pid);
      const arrangement = submitted
        ? scoreFromArrangement(hand, submitted, this.s.wildJoker.rank)
        : bestArrangementForScoring(hand, this.s.wildJoker.rank);
      this.s.scores[pid] = arrangement.points;
      // Display: show the FULL submitted arrangement (including invalid
      // / short groups) so the scorecard mirrors what the player actually
      // built. The badges on the client compute per-group points and
      // mark credited vs uncredited — they need every group to do that.
      // When no arrangement was sent, fall back to the credited melds.
      if (submitted && submitted.length > 0) {
        this.s.finalMelds[pid] = submitted.map((g) => g.slice());
      } else if (arrangement.melds.length > 0) {
        this.s.finalMelds[pid] = arrangement.melds.map((g) => g.map((c) => c.id));
      }
    }
    // Winner's exact melds — the proof of how they made the show.
    this.s.finalMelds[winnerId] = winnerMelds.map((g) => g.slice());
    this.s.phase = "finished";
    this.s.winnerId = winnerId;
    this.updateMatchScoresAfterRound();
  }

  private finalizeWithInvalidDeclare(
    declarerId: string,
    attemptedMelds?: string[][],
  ): void {
    // Wrong-show / invalid declare: the declarer eats the full 80-point
    // penalty, and the opposing players each take a zero (they didn't get
    // to play out their hands). The penalty's CHIP equivalent is split
    // evenly across opponents by the scorecard, so opponents come out
    // ahead even though their own hand value isn't booked.
    //
    // There is no single "round winner" in this scenario — the chips are
    // distributed across every opponent — so we set winnerId to null and
    // let the client recognise the wrong-show via invalidDeclareBy.
    this.s.invalidDeclareBy = declarerId;
    for (const pid of this.s.playerOrder) {
      const hand = this.s.hands.get(pid) ?? [];
      this.s.finalHands[pid] = hand.slice();
      if (pid === declarerId) {
        this.s.scores[pid] = INVALID_DECLARE_PENALTY;
      } else {
        // Opponents book a clean zero (penalty chips are distributed
        // separately by the scorecard), but we still compute their
        // best meld arrangement so the scorecard shows the groups they
        // had been building instead of an unstructured pile.
        this.s.scores[pid] = 0;
        const submitted = this.arrangements.get(pid);
        const arrangement = submitted
          ? scoreFromArrangement(hand, submitted, this.s.wildJoker.rank)
          : bestArrangementForScoring(hand, this.s.wildJoker.rank);
        if (submitted && submitted.length > 0) {
          this.s.finalMelds[pid] = submitted.map((g) => g.slice());
        } else if (arrangement.melds.length > 0) {
          this.s.finalMelds[pid] = arrangement.melds.map((g) => g.map((c) => c.id));
        }
      }
    }
    // Capture the declarer's attempted (invalid) arrangement so the
    // scorecard can show *why* it was a wrong show.
    if (attemptedMelds) {
      this.s.finalMelds[declarerId] = attemptedMelds.map((g) => g.slice());
    }
    this.s.phase = "finished";
    this.s.winnerId = null;
    this.updateMatchScoresAfterRound();
  }

  private advanceTurn(): void {
    const total = this.s.playerOrder.length;
    for (let i = 0; i < total; i++) {
      this.s.turnIndex = (this.s.turnIndex + 1) % total;
      const id = this.s.playerOrder[this.s.turnIndex];
      if (this.s.hands.has(id) && !this.s.droppedPlayers.has(id)) {
        this.s.turnAction = "draw";
        return;
      }
    }
    this.s.turnAction = "draw";
  }

  private reshuffleOpenIntoClosed(): void {
    if (this.s.openPile.length <= 1) return;
    const top = this.s.openPile.pop()!;
    const toShuffle = this.s.openPile;
    this.s.openPile = [top];
    for (let i = toShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
    }
    this.s.closedDeck = toShuffle;
  }

  getPublicState(): RummyPublicState {
    const handSizes: Record<string, number> = {};
    for (const pid of this.s.playerOrder) {
      handSizes[pid] = (this.s.hands.get(pid) ?? []).length;
    }
    return {
      kind: "rummy",
      phase: this.s.phase,
      turnPlayerId: this.s.playerOrder[this.s.turnIndex],
      turnAction: this.s.turnAction,
      turnIndex: this.s.turnIndex,
      wildJoker: this.s.wildJoker,
      closedDeckCount: this.s.closedDeck.length,
      topOfOpenPile: this.s.openPile[this.s.openPile.length - 1] ?? null,
      handSizes,
      playerOrder: this.s.playerOrder,
      openPile: this.s.openPile.slice(),
      turnDeadline: this.s.turnDeadline,
      droppedPlayers: [...this.s.droppedPlayers],
      matchMode: this.s.matchMode,
      cumulativeScores: Object.fromEntries(this.s.cumulativeScores),
      eliminatedInMatch: [...this.s.eliminatedInMatch],
      roundNumber: this.s.roundNumber,
      matchWinnerId: this.s.matchWinnerId,
      matchOver: this.s.matchOver,
      poolTarget: this.s.poolTarget,
      winnerId: this.s.phase === "finished" ? this.s.winnerId : undefined,
      scores: this.s.phase === "finished" ? this.s.scores : undefined,
      finalHands: this.s.phase === "finished" ? this.s.finalHands : undefined,
      finalMelds: this.s.phase === "finished" ? this.s.finalMelds : undefined,
      invalidDeclareBy: this.s.invalidDeclareBy ?? null,
    };
  }

  getStateFor(playerId: string): RummyPlayerState {
    return {
      ...this.getPublicState(),
      myHand: (this.s.hands.get(playerId) ?? []).slice(),
    };
  }

  isOver(): boolean {
    // Single-mode: round end = match end. Pool mode: only when match is fully over.
    if (this.s.poolTarget == null) return this.s.phase === "finished";
    return this.s.matchOver;
  }

  /**
   * For the shared bot orchestration in RoomManager. Rummy is turn-based —
   * the current player is the only one who can act.
   */
  pendingActors(): string[] {
    if (this.s.phase !== "playing") return [];
    const current = this.s.playerOrder[this.s.turnIndex];
    if (!current) return [];
    if (this.s.droppedPlayers.has(current)) return [];
    return [current];
  }

  removePlayer(playerId: string): void {
    if (!this.s.hands.has(playerId)) return;
    this.s.hands.delete(playerId);
    if (this.s.hands.size < 2 && this.s.phase === "playing") {
      const remaining = [...this.s.hands.keys()];
      this.s.phase = "finished";
      this.s.winnerId = remaining[0] ?? null;
      for (const pid of this.s.playerOrder) {
        this.s.scores[pid] = pid === this.s.winnerId ? 0 : INVALID_DECLARE_PENALTY;
      }
    }
  }
}
