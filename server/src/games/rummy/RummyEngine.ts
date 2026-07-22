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
  phase: "playing" | "arranging" | "finished";
  hands: Map<string, Card[]>;
  closedDeck: Card[];
  openPile: Card[];
  wildJoker: Card;
  playerOrder: string[];
  turnIndex: number;
  turnAction: "draw" | "discardOrDeclare";
  winnerId: string | null;
  invalidDeclareBy: string | null;
  /** Player id whose disconnect ended this round, or null if the round
   *  ended normally (declare / wrong show). Drives the "Opponent
   *  disconnected" overlay instead of a confusing scorecard. */
  endedByDisconnect: string | null;
  scores: Record<string, number>;
  finalHands: Record<string, Card[]>;
  finalMelds: Record<string, string[][]>;
  droppedPlayers: Set<string>;
  turnDeadline: number | null;
  /**
   * When phase === "arranging", the wall-clock ms at which the 15-second
   * post-show rearrange window closes. null otherwise. The room manager
   * schedules the finalize timer from this; the client counts down to it.
   */
  arrangeDeadline: number | null;
  /**
   * Player id whose turn the current `turnDeadline` belongs to. Used so
   * the within-turn draw → discard transition can preserve any unused
   * seconds from the draw window instead of resetting the timer (which
   * felt like "losing 5 seconds" the moment you picked a card).
   */
  deadlineOwnerId: string | null;
  /**
   * Extra milliseconds the next turn timer should add on top of the
   * natural duration — used to pause the clock while the client plays
   * an animation (joker celebration, etc.). The engine sets this when
   * it processes a move that triggers a known animation; the room
   * manager reads it once via {@link consumePendingAnimationPauseMs}
   * and applies it to the scheduled deadline. Generic on purpose so
   * future animations can plug in without reshaping the timer logic.
   */
  pendingAnimationPauseMs: number;
  /**
   * Whether the round's very first draw has been taken. The seeded
   * open-pile card may be a printed ("special") joker; the house rule lets
   * whoever draws FIRST lift it from the open pile, but once that first
   * draw happens no player may pick a printed joker off the pile again.
   */
  firstDrawTaken: boolean;
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
/** Middle-drop (after drawing) in round 2+ of a pool match uses this fixed
 *  penalty instead of raw card weightage — the standard "middle drop = 40"
 *  tier (RummyCircle/Junglee Rummy convention). Round 1's middle-drop is
 *  unchanged (raw card points, up to HAND_CAP) — this floor only kicks in
 *  once a player has already completed at least one round in the match. */
const MIDDLE_DROP_PENALTY_AFTER_ROUND1 = 40;

/**
 * After a valid show, the round doesn't end instantly. Every OTHER player gets
 * this fixed window to rearrange their hand into melds and cut their score —
 * the declarer becomes a spectator, and no one may draw. When it elapses the
 * room manager calls {@link RummyEngine.finalizeArrangingRound}, which scores
 * each remaining player on the arrangement they actually built.
 */
const ARRANGE_WINDOW_MS = 15_000;

/**
 * Minimum points a non-winning player books when the round ends in a
 * valid declare. House rule: a loser whose hand happens to score 0
 * (every card landed in a credited meld) shouldn't walk away paying
 * nothing — they still LOST the round. We charge them 2 chips as a
 * token, which the winner correspondingly collects. Cards 2-9 are
 * already worth ≥2 face value, so this only changes the booking for
 * the rare 0-point natural outcome.
 */
const LOSER_MIN_SCORE_ON_DECLARE = 2;

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

  setTurnDeadline(deadline: number, ownerId?: string): void {
    this.s.turnDeadline = deadline;
    if (ownerId !== undefined) this.s.deadlineOwnerId = ownerId;
  }

  clearTurnDeadline(): void {
    this.s.turnDeadline = null;
    this.s.deadlineOwnerId = null;
  }

  /**
   * Read the pending animation pause and clear it in one step. Called
   * by the room manager right before scheduling the next deadline; the
   * returned ms are added on top of the natural timer so the player
   * doesn't lose seconds while a celebration plays. Generic to keep
   * future animations cheap to plug in — set the field in whichever
   * move handler triggers a known animation.
   */
  consumePendingAnimationPauseMs(): number {
    const v = this.s.pendingAnimationPauseMs ?? 0;
    this.s.pendingAnimationPauseMs = 0;
    return v;
  }

  /**
   * Remaining ms on the current deadline if it still belongs to the
   * player whose turn it is right now. Returns 0 when the deadline is
   * stale (belonged to a previous player, or there was none) — that's
   * the signal to the room manager that it should reset to the full
   * timer instead of carrying anything over.
   *
   * Lets the draw → discard transition keep its unused seconds: a
   * player who drew quickly within their 30 s draw window doesn't see
   * the timer snap down to the 15 s discard window. They keep whatever
   * was left, or the discard window — whichever is larger.
   */
  getRemainingForCurrentTurnOwner(now: number): number {
    if (this.s.turnDeadline == null) return 0;
    const cur = this.s.playerOrder[this.s.turnIndex];
    if (!cur || this.s.deadlineOwnerId !== cur) return 0;
    return Math.max(0, this.s.turnDeadline - now);
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
    if (this.s.phase !== "playing") return { ok: false, error: "Not in play" };
    const current = this.s.playerOrder[this.s.turnIndex];
    if (playerId !== current) return { ok: false, error: "Not current player" };
    if (this.s.droppedPlayers.has(playerId)) return { ok: false, error: "Dropped" };

    const hand = this.s.hands.get(playerId);
    if (!hand) return { ok: false, error: "No hand" };
    const wildRank = this.s.wildJoker.rank;

    if (this.s.turnAction === "draw") {
      // shouldDrawFromOpen runs the open-vs-closed heuristic (printed
      // jokers / empty pile fall back to false), so a "closed" draw is the
      // safe default. One exception: on the round's first draw, grab the
      // seeded special joker off the open pile if it's sitting there.
      const openTop =
        this.s.openPile.length > 0
          ? this.s.openPile[this.s.openPile.length - 1]
          : null;
      const from =
        !this.s.firstDrawTaken && openTop?.isPrintedJoker
          ? "open"
          : shouldDrawFromOpen(hand, openTop, wildRank)
          ? "open"
          : "closed";
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
      endedByDisconnect: null,
      scores: {},
      finalHands: {},
      finalMelds: {},
      droppedPlayers: new Set(),
      turnDeadline: null,
      arrangeDeadline: null,
      deadlineOwnerId: null,
      pendingAnimationPauseMs: 0,
      firstDrawTaken: false,
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
    this.s.endedByDisconnect = null;
    this.s.scores = {};
    this.s.finalHands = {};
    this.s.finalMelds = {};
    this.s.droppedPlayers = new Set();
    this.s.turnDeadline = null;
    this.s.arrangeDeadline = null;
    this.s.deadlineOwnerId = null;
    this.s.pendingAnimationPauseMs = 0;
    this.s.firstDrawTaken = false;
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
    // Post-show rearrange window: no deck access, no turns. Players may only
    // rearrange (streamed via setArrangement), which isn't an applyMove.
    if (this.s.phase === "arranging") {
      return { ok: false, error: "Rearrange your hand — scoring in progress" };
    }

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
    // Both first-drop (before drawing this turn) and middle-drop (after drawing)
    // are valid. Not-your-turn is already caught in applyMove.
    this.s.droppedPlayers.add(move.playerId);
    const hand = this.s.hands.get(move.playerId);
    // Deliberately NOT recorded into this.s.finalHands — a dropped player's
    // cards are never shown to the table (real-world Rummy convention: you
    // don't reveal your hand when you drop, only your score is announced).
    // scoreFromArrangement/pointsOfHand read straight from this.s.hands
    // below, so omitting finalHands doesn't affect scoring, only display.
    // First-drop (turnAction === "draw"): fixed 20-point penalty.
    // Middle-drop (turnAction === "discardOrDeclare"): raw card points
    // (capped at 80 by pointsOfHand's own HAND_CAP guard) in round 1 of a
    // match; a fixed 40-point penalty from round 2 onward — the standard
    // 3-tier convention (20 / 40 / up-to-80), see MIDDLE_DROP_PENALTY_AFTER_ROUND1.
    const dropScore =
      this.s.turnAction === "draw"
        ? DROP_PENALTY
        : this.s.roundNumber > 1
          ? MIDDLE_DROP_PENALTY_AFTER_ROUND1
          : pointsOfHand(hand ?? [], this.s.wildJoker.rank);
    this.s.scores[move.playerId] = dropScore;

    // If only one active (non-dropped) player remains, they win. No melds
    // were ever played this round, so — same as the dropped players above —
    // the winner's hand is NOT recorded into finalHands either.
    const active = this.s.playerOrder.filter(
      (id) => !this.s.droppedPlayers.has(id) && this.s.hands.has(id),
    );
    if (active.length === 1) {
      const winner = active[0];
      this.s.winnerId = winner;
      this.s.scores[winner] = 0;
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
      // House rule: printed ("special") jokers can't be lifted off the
      // discard pile — EXCEPT on the round's very first draw, when the
      // seeded open card may be claimed by whoever picks first. After that
      // first draw no player may take a printed joker from the pile.
      if (top.isPrintedJoker && this.s.firstDrawTaken) {
        return { ok: false, error: "Printed jokers cannot be drawn from the discard pile" };
      }
      const drawn = this.s.openPile.pop()!;
      hand.push(drawn);
    }
    this.s.firstDrawTaken = true;
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

    // Valid show — DON'T finish yet. Open the 15-second rearrange window; the
    // room manager schedules finalizeArrangingRound() when arrangeDeadline hits.
    this.enterArrangingPhase(move.playerId, discard, meldGroupIds);
    return { ok: true, winnerId: move.playerId };
  }

  /**
   * A valid show has been made. Lock in the winner (remove their discard, credit
   * their melds, score them 0) and open the fixed rearrange window for everyone
   * else. Nobody is scored yet — losers keep streaming arrangements until the
   * window closes and {@link finalizeArrangingRound} runs.
   */
  private enterArrangingPhase(
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

    this.s.winnerId = winnerId;
    this.s.scores[winnerId] = 0;
    this.s.finalHands[winnerId] = winnerHand.slice();
    // Winner's exact melds — the proof of how they made the show.
    this.s.finalMelds[winnerId] = winnerMelds.map((g) => g.slice());

    this.s.phase = "arranging";
    this.s.arrangeDeadline = Date.now() + ARRANGE_WINDOW_MS;
    this.clearTurnDeadline();
  }

  /** Wall-clock ms the rearrange window closes at, or null when not arranging. */
  getArrangeDeadline(): number | null {
    return this.s?.phase === "arranging" ? this.s.arrangeDeadline : null;
  }

  /**
   * Close the rearrange window and score the round. Each non-winner is scored
   * on the arrangement THEY built during the window (their streamed groups) —
   * un-melded cards count full, so the timer genuinely mattered. Idempotent:
   * a no-op unless we're actually in the arranging phase.
   */
  finalizeArrangingRound(): void {
    if (this.s.phase !== "arranging") return;
    const winnerId = this.s.winnerId;

    for (const pid of this.s.playerOrder) {
      if (pid === winnerId) continue;
      const hand = this.s.hands.get(pid) ?? [];
      this.s.finalHands[pid] = hand.slice();
      // Score from the player's actual arrangement built during the window.
      // A bot (or anyone who never streamed groups) falls back to the engine's
      // best-credit arrangement so it isn't punished for having no client.
      const submitted = this.arrangements.get(pid);
      const arrangement = submitted
        ? scoreFromArrangement(hand, submitted, this.s.wildJoker.rank)
        : bestArrangementForScoring(hand, this.s.wildJoker.rank);
      this.s.scores[pid] = Math.max(LOSER_MIN_SCORE_ON_DECLARE, arrangement.points);
      // Display the FULL arrangement the player built (incl. short/invalid
      // groups) so the scorecard's per-group badges mirror their hand.
      if (submitted && submitted.length > 0) {
        this.s.finalMelds[pid] = submitted.map((g) => g.slice());
      } else if (arrangement.melds.length > 0) {
        this.s.finalMelds[pid] = arrangement.melds.map((g) => g.map((c) => c.id));
      }
    }

    this.s.phase = "finished";
    this.s.arrangeDeadline = null;
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
      openJokerDrawable:
        this.s.openPile[this.s.openPile.length - 1]?.isPrintedJoker === true &&
        !this.s.firstDrawTaken,
      handSizes,
      playerOrder: this.s.playerOrder,
      openPile: this.s.openPile.slice(),
      turnDeadline: this.s.turnDeadline,
      arrangeDeadline: this.s.phase === "arranging" ? this.s.arrangeDeadline : null,
      droppedPlayers: [...this.s.droppedPlayers],
      matchMode: this.s.matchMode,
      cumulativeScores: Object.fromEntries(this.s.cumulativeScores),
      eliminatedInMatch: [...this.s.eliminatedInMatch],
      roundNumber: this.s.roundNumber,
      matchWinnerId: this.s.matchWinnerId,
      matchOver: this.s.matchOver,
      poolTarget: this.s.poolTarget,
      // Reveal the winner as soon as the show is made (arranging) so clients can
      // announce it and show the spectator/countdown state; scores/hands/melds
      // stay hidden until the round is actually scored (finished).
      winnerId: this.s.phase !== "playing" ? this.s.winnerId : undefined,
      scores: this.s.phase === "finished" ? this.s.scores : undefined,
      finalHands: this.s.phase === "finished" ? this.s.finalHands : undefined,
      finalMelds: this.s.phase === "finished" ? this.s.finalMelds : undefined,
      invalidDeclareBy: this.s.invalidDeclareBy ?? null,
      endedByDisconnect: this.s.endedByDisconnect ?? null,
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
    // Capture the leaving player's hand BEFORE we delete it so the
    // scorecard can show their cards (otherwise the column reads as
    // empty and players see a "winner" with no proof).
    const removedHand = this.s.hands.get(playerId);
    if (!removedHand) return;
    this.s.hands.delete(playerId);

    if (this.s.hands.size < 2 && this.s.phase === "playing") {
      const remaining = [...this.s.hands.keys()];
      const winnerId = remaining[0] ?? null;
      this.s.phase = "finished";
      this.s.winnerId = winnerId;
      this.s.endedByDisconnect = playerId;

      for (const pid of this.s.playerOrder) {
        const hand = pid === playerId ? removedHand : this.s.hands.get(pid) ?? [];
        this.s.finalHands[pid] = hand.slice();
        this.s.scores[pid] = pid === winnerId ? 0 : INVALID_DECLARE_PENALTY;
        // Prefer the last arrangement the player streamed up; fall back
        // to a flat single-group dump so the scorecard never renders a
        // ghost player.
        const submitted = this.arrangements.get(pid);
        if (submitted && submitted.length > 0) {
          this.s.finalMelds[pid] = submitted.map((g) => g.slice());
        } else if (hand.length > 0) {
          this.s.finalMelds[pid] = [hand.map((c) => c.id)];
        }
      }
      this.updateMatchScoresAfterRound();
    }
  }
}
