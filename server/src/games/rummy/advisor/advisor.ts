import type { Card, Rank } from "@shared/types.js";
import { validateDeclare } from "../declare.js";
import { solveArrangement, type Arrangement } from "./arrangement.js";
import { FIRST_DROP_COST, HAND_CAP, looseValue, probeCard, sigOf, type Sig } from "./cards.js";
import { cardsNeeded } from "./distance.js";
import { feedRisk, readOpponents, type OpponentReads } from "./opponents.js";
import { drawOutlook, type Out } from "./outlook.js";
import { DEFAULT_TUNING, type AdvisorTuning } from "./tuning.js";
import type { AdvisorTable } from "./types.js";
import { unseenCounts } from "./unseen.js";

/** How good a 13-card hand is: how far from showing, how likely the next draw is to help, what it costs if lost. */
export interface HandEvaluation {
  needed: number;
  /** Chance one closed-deck card brings the hand closer. */
  chance: number;
  outs: Out[];
  /** Points left in the hand if an opponent shows now. */
  deadwood: number;
  arrangement: Arrangement;
}

export interface DiscardOption {
  card: Card;
  evaluation: HandEvaluation;
  /** How much throwing it would help opponents, from what they were seen to pick up. */
  feedRisk: number;
  /** Lower is better. */
  score: number;
}

export interface Show {
  discardCardId: string;
  melds: string[][];
}

export interface DrawChoice {
  from: "open" | "closed";
  /** The open card, if there is one that can be taken. */
  openCard: Card | null;
  /** The best hand reachable by taking the open card and then throwing the right card, or null if it cannot be taken. */
  openBest: DiscardOption | null;
  /** Estimated turns-plus-cost of taking the open card, or null when it cannot be taken. */
  openScore: number | null;
  closedScore: number;
  /** The hand as it stands, before drawing. */
  current: HandEvaluation;
  /** Whether the open card is one of the hand's outs. */
  openCardIsOut: boolean;
}

/** Whether leaving the round now is cheaper than playing it out. */
export interface DropVerdict {
  advised: boolean;
  /** Points paid for leaving. */
  dropCost: number;
  /** Points expected to be paid by playing on. */
  playCost: number;
  /** Chance of showing before anyone else does. */
  winChance: number;
}

export type Advice =
  | { kind: "wait"; evaluation: HandEvaluation | null; reads: OpponentReads }
  | { kind: "declare"; show: Show }
  | { kind: "discard"; options: DiscardOption[]; reads: OpponentReads; unseenTotal: number }
  | { kind: "draw"; choice: DrawChoice; reads: OpponentReads; unseenTotal: number; drop: DropVerdict | null };

/** The same unseen counts with one copy of a card taken out, for "if I draw this". */
function without(unseen: ReadonlyMap<Sig, number>, sig: Sig): Map<Sig, number> {
  const next = new Map(unseen);
  next.set(sig, Math.max(0, (next.get(sig) ?? 0) - 1));
  return next;
}

/** A hand is worth less the further it is from showing, the less likely a draw is to help, and the more it costs. */
function score(evaluation: HandEvaluation, feed: number, tuning: AdvisorTuning): number {
  return estimatedTurns(evaluation, tuning) + (tuning.deadwoodWeight * evaluation.deadwood) / 10 + tuning.feedWeight * feed;
}

/**
 * Turns until the hand can show. All but the last card arrive at the hand's current improving chance; the last
 * is a specific card, so it arrives at the hand's own chance when it is already one card away, and at the
 * typical finishing chance when it is further.
 */
function estimatedTurns(evaluation: HandEvaluation, tuning: AdvisorTuning): number {
  if (evaluation.needed === 0) return 1;
  const now = Math.max(evaluation.chance, tuning.chanceFloor);
  if (evaluation.needed === 1) return 1 / now;
  return (evaluation.needed - 1) / now + 1 / tuning.finalChance;
}

export function evaluateHand(hand: readonly Card[], wild: Rank, unseen: ReadonlyMap<Sig, number>): HandEvaluation {
  const outlook = drawOutlook(hand, wild, unseen);
  const arrangement = solveArrangement(hand, wild);
  return { needed: outlook.needed, chance: outlook.chance, outs: outlook.outs, deadwood: arrangement.deadwood, arrangement };
}

/**
 * A winning show from a 14-card hand, found with the exact solver. The engine's own `findDeclaration` is a
 * heuristic search and can miss a real win, so it is not what decides "you can declare" here. Whatever this
 * returns has also passed `validateDeclare`, the check the engine applies to a declaration.
 */
export function findShow(hand: readonly Card[], wild: Rank): Show | null {
  if (hand.length !== 14 || cardsNeeded(hand, wild) !== 0) return null;
  // Throw the dearest card that still leaves a winning 13: it keeps the cheaper cards in the groups.
  const byWorth = hand.slice().sort((a, b) => looseValue(b, wild) - looseValue(a, wild));
  for (const out of byWorth) {
    const rest = hand.filter((card) => card.id !== out.id);
    const arrangement = solveArrangement(rest, wild);
    if (arrangement.deadwood !== 0) continue;
    if (!validateDeclare(arrangement.melds, wild).ok) continue;
    return { discardCardId: out.id, melds: arrangement.melds.map((group) => group.map((card) => card.id)) };
  }
  return null;
}

/** The first card of each kind: two identical cards are the same choice. */
function distinctBySig(hand: readonly Card[]): Card[] {
  const seen = new Set<Sig>();
  return hand.filter((card) => (seen.has(sigOf(card)) ? false : (seen.add(sigOf(card)), true)));
}

/**
 * Rank every sensible discard from a 14-card hand, best first.
 *
 * Each card is judged by the hand it leaves: how many cards from winning, how likely the next draw is to help
 * (counted against the cards still unseen), how many points it leaves exposed, and whether throwing it feeds an
 * opponent. The cheap measure (cards needed) screens every card; the odds and arrangement are worked out only
 * for the few that could win.
 */
export function rankDiscards(
  hand: readonly Card[],
  wild: Rank,
  unseen: ReadonlyMap<Sig, number>,
  reads: OpponentReads,
  tuning: AdvisorTuning = DEFAULT_TUNING,
): DiscardOption[] {
  const screened = distinctBySig(hand).map((card) => {
    const rest = hand.filter((other) => other.id !== card.id);
    return { card, rest, needed: cardsNeeded(rest, wild) };
  });
  const fewest = Math.min(...screened.map((entry) => entry.needed));
  const finalists = screened
    .filter((entry) => entry.needed <= fewest + 1)
    .sort((a, b) => a.needed - b.needed || looseValue(b.card, wild) - looseValue(a.card, wild))
    .slice(0, 7);

  return finalists
    .map(({ card, rest }) => {
      const evaluation = evaluateHand(rest, wild, unseen);
      const feed = feedRisk(card, reads);
      return { card, evaluation, feedRisk: feed, score: score(evaluation, feed, tuning) };
    })
    .sort((a, b) => a.score - b.score || looseValue(b.card, wild) - looseValue(a.card, wild));
}

/** The best the hand can do after drawing a card: the cheapest discard, using the unseen pool as given. */
function bestAfterDrawing(hand: readonly Card[], wild: Rank, unseen: ReadonlyMap<Sig, number>, reads: OpponentReads, tuning: AdvisorTuning): DiscardOption | null {
  return rankDiscards(hand, wild, unseen, reads, tuning)[0] ?? null;
}

/** How many kinds of helpful card are worked out one by one when weighing the closed deck. */
const MAX_EXACT_OUTS = 14;

/**
 * A cheaper `bestAfterDrawing` for the closed-deck estimate, where it runs once per possible card: the discard
 * that leaves the fewest cards to find (the dearest one on a tie), evaluated once, instead of seven finalists.
 */
function quickBestAfterDrawing(hand: readonly Card[], wild: Rank, unseen: ReadonlyMap<Sig, number>, reads: OpponentReads, tuning: AdvisorTuning): DiscardOption | null {
  let best: { card: Card; rest: Card[]; needed: number } | null = null;
  for (const card of distinctBySig(hand)) {
    const rest = hand.filter((other) => other.id !== card.id);
    const needed = cardsNeeded(rest, wild);
    if (!best || needed < best.needed || (needed === best.needed && looseValue(card, wild) > looseValue(best.card, wild))) best = { card, rest, needed };
  }
  if (!best) return null;
  const evaluation = evaluateHand(best.rest, wild, unseen);
  const feed = feedRisk(best.card, reads);
  return { card: best.card, evaluation, feedRisk: feed, score: score(evaluation, feed, tuning) };
}

/**
 * Open pile or closed deck.
 *
 * The open card is known: what it does for the hand is calculated exactly. The closed card is not: it is one
 * of the unseen cards, so its worth is the chance-weighted average over the cards that would help, with every
 * other card treated as "no better than the hand now" (it is thrown straight back). The open card is taken
 * only when it is clearly better, because it also shows opponents what the hand wants.
 */
export function adviseDraw(
  hand: readonly Card[],
  wild: Rank,
  unseen: ReadonlyMap<Sig, number>,
  reads: OpponentReads,
  openTop: Card | null,
  openJokerDrawable: boolean,
  tuning: AdvisorTuning = DEFAULT_TUNING,
): DrawChoice {
  const current = evaluateHand(hand, wild, unseen);
  const baseline = score(current, 0, tuning);

  // Closed deck: each helpful card, weighted by how likely it is, plus "nothing useful" for the rest.
  const total = [...unseen.values()].reduce((sum, copies) => sum + copies, 0);
  let closedScore = baseline;
  if (current.needed > 0 && total > 0) {
    // The most plentiful outs carry nearly all the weight, so only those are worked out; the rest take their average.
    const ordered = current.outs.slice().sort((a, b) => b.copies - a.copies);
    let helpedChance = 0;
    let helpedScore = 0;
    for (const out of ordered.slice(0, MAX_EXACT_OUTS)) {
      const chance = out.copies / total;
      helpedChance += chance;
      helpedScore += chance * (quickBestAfterDrawing([...hand, probeCard(out.sig)], wild, without(unseen, out.sig), reads, tuning)?.score ?? baseline);
    }
    const restCopies = ordered.slice(MAX_EXACT_OUTS).reduce((sum, out) => sum + out.copies, 0);
    if (helpedChance > 0 && restCopies > 0) {
      const restChance = restCopies / total;
      helpedScore += restChance * (helpedScore / helpedChance);
      helpedChance += restChance;
    }
    closedScore = helpedScore + (1 - helpedChance) * baseline;
  } else if (current.needed === 0) {
    closedScore = 1;
  }

  const takeable = openTop !== null && (!openTop.isPrintedJoker || openJokerDrawable);
  if (!takeable || !openTop) {
    return { from: "closed", openCard: null, openBest: null, openScore: null, closedScore, current, openCardIsOut: false };
  }
  const openBest = bestAfterDrawing([...hand, openTop], wild, unseen, reads, tuning);
  const openScore = openBest?.score ?? Infinity;
  const openCardIsOut = current.outs.some((out) => out.sig === sigOf(openTop));
  const closer = (openBest?.evaluation.needed ?? Infinity) < current.needed;
  const margin = closer ? tuning.openMargin : tuning.openNoGainMargin;
  return {
    from: openScore < closedScore - margin ? "open" : "closed",
    openCard: openTop,
    openBest,
    openScore,
    closedScore,
    current,
    openCardIsOut,
  };
}

/**
 * Play on or leave. The race is the hand's own turns-to-show against each rival's, each treated as a constant
 * chance per turn; the loss, if the race is lost, is the points the hand would still hold. Leaving costs a flat
 * penalty, so a hand far from showing, with several rivals, is cheaper to abandon than to carry.
 */
export function dropVerdict(
  current: HandEvaluation,
  rivals: number,
  myTurns: number,
  tuning: AdvisorTuning = DEFAULT_TUNING,
): DropVerdict | null {
  if (rivals < 1) return null;
  const myTurnsToShow = estimatedTurns(current, tuning);
  const winChance = tuning.rivalTurns / (tuning.rivalTurns + rivals * myTurnsToShow);
  const playCost = (1 - winChance) * Math.min(HAND_CAP, current.deadwood * tuning.lossShare);
  const advised = myTurns <= tuning.dropUntilTurn && playCost > FIRST_DROP_COST + tuning.dropMargin;
  return { advised, dropCost: FIRST_DROP_COST, playCost, winChance };
}

/** Everything the advisor concludes for one moment of the game. */
export function advise(table: AdvisorTable, tuning: AdvisorTuning = DEFAULT_TUNING): Advice {
  const reads = readOpponents(table.log, table.myId);
  if (table.hand.length === 0) return { kind: "wait", evaluation: null, reads };

  const unseen = unseenCounts({
    hand: table.hand,
    openPile: table.openPile,
    cutCard: table.cutCard,
    heldByOpponents: reads.heldByOpponents,
  });
  const unseenTotal = [...unseen.values()].reduce((sum, copies) => sum + copies, 0);

  if (table.phase === "discard") {
    const show = findShow(table.hand, table.wild);
    if (show) return { kind: "declare", show };
    return { kind: "discard", options: rankDiscards(table.hand, table.wild, unseen, reads, tuning), reads, unseenTotal };
  }

  if (table.phase === "draw") {
    const top = table.openPile.at(-1) ?? null;
    const choice = adviseDraw(table.hand, table.wild, unseen, reads, top, table.openJokerDrawable, tuning);
    const drop = dropVerdict(choice.current, table.opponents.length, table.myTurns, tuning);
    return { kind: "draw", choice, reads, unseenTotal, drop };
  }

  return { kind: "wait", evaluation: evaluateHand(table.hand, table.wild, unseen), reads };
}
