import type { Card, Rank } from "@shared/types.js";
import { classifyMeld, isWildJoker } from "./melds.js";
import { validateDeclare } from "./declare.js";
import { bestArrangementForScoring } from "./score.js";
import { findValidDeclaration, type BotDeclaration } from "./botArrange.js";

/**
 * Rummy bot brain: when to declare, what to draw, what to throw.
 *
 * The old bot judged a card by counting its "partners" in the hand one pair at a time. That has no idea what
 * the hand already HOLDS: it would happily break a finished sequence to keep two loose cards, never noticed
 * that a hand with no pure sequence cannot win however neat the rest is, and its declaration finder was a
 * greedy pass that missed winning hands.
 *
 * Three upgrades, all pure (cards in, decision out):
 *
 *   findDeclaration   exact search for a winning arrangement. The old greedy finder runs first (it is quick),
 *                     then a backtracking cover tries every sequence and set that can contain the lowest
 *                     unplaced card, jokers as fillers. Whatever it returns has passed `validateDeclare`, the
 *                     same check the engine applies, so it cannot produce a wrong show.
 *   chooseDiscard     throws the card whose removal leaves the cheapest hand, where a hand's cost is its
 *                     unmelded points, plus a heavy charge for lacking a pure sequence (nothing counts without
 *                     one) and a lighter charge for lacking a second sequence, minus credit for near-melds.
 *   chooseDraw        takes the open card only when it makes the best next hand clearly cheaper than the hand
 *                     it has now, rather than on any adjacent card.
 */

const RANK_ORDER: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])) as Record<Rank, number>;
const POINTS: Record<Rank, number> = {
  A: 10, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, T: 10, J: 10, Q: 10, K: 10,
};
const SUIT_INDEX = { S: 0, H: 1, D: 2, C: 3 } as const;

/** Cost charged for having no pure sequence: nothing else in the hand counts without one. */
const PURE_MISSING_COST = 28;
/** Cost charged for having a pure sequence but no second sequence. */
const SECOND_SEQUENCE_MISSING_COST = 10;
/** Credit for a joker still in hand: it can finish any near-meld. */
const SPARE_WILD_CREDIT = 6;
/** Extra credit, per same-suit pair, while the hand still needs a pure sequence. */
const PURE_NEED_PAIR_BONUS = 6;
/** The open card must make the hand this much cheaper than the closed deck's expected card would. */
const OPEN_PICK_MARGIN = 3;
/** Backtracking budget for one discard's cover search. */
const SEARCH_NODE_LIMIT = 6_000;

const isWild = (card: Card, wild: Rank): boolean => isWildJoker(card, wild);

/** Cards in a fixed order: suit, then rank. Jokers sort last so they are placed after everything natural. */
function orderCards(cards: readonly Card[], wild: Rank): Card[] {
  return cards.slice().sort((a, b) => {
    const aw = isWild(a, wild) ? 1 : 0;
    const bw = isWild(b, wild) ? 1 : 0;
    if (aw !== bw) return aw - bw;
    return SUIT_INDEX[a.suit] - SUIT_INDEX[b.suit] || RANK_INDEX[a.rank] - RANK_INDEX[b.rank];
  });
}

const rankAtPosition = (position: number): Rank => RANK_ORDER[position === 13 ? 0 : position];

/* ── Exact declaration search ──────────────────────────────────────── */

interface Budget {
  nodes: number;
}

/** Every valid sequence or set the lowest-ordered natural card `anchor` can start, using cards in `pool`. */
function groupsStartingAt(anchor: Card, pool: readonly Card[], wild: Rank): Card[][] {
  const out: Card[][] = [];
  const seen = new Set<string>();
  const push = (group: Card[]): void => {
    if (!classifyMeld(group, wild)) return;
    const key = group.map((c) => c.id).sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    out.push(group);
  };

  // Jokers, printed ones first, so a wild-rank card is kept free to sit naturally in a pure run.
  const jokers = pool.filter((c) => isWild(c, wild)).sort((a, b) => Number(!!b.isPrintedJoker) - Number(!!a.isPrintedJoker));

  // Sequences: every window of 3..8 positions that contains the anchor.
  const anchorPositions = anchor.rank === "A" ? [0, 13] : [RANK_INDEX[anchor.rank]];
  for (const anchorPosition of anchorPositions) {
    for (let length = 3; length <= 8; length++) {
      for (let start = Math.max(0, anchorPosition - (length - 1)); start <= anchorPosition; start++) {
        if (start + length - 1 > 13) continue;
        const used = new Set<string>([anchor.id]);
        const group: Card[] = [];
        let jokersUsed = 0;
        let fits = true;
        for (let p = start; p < start + length; p++) {
          if (p === anchorPosition) {
            group.push(anchor);
            continue;
          }
          const rank = rankAtPosition(p);
          const natural = pool.find((c) => !used.has(c.id) && !c.isPrintedJoker && c.suit === anchor.suit && c.rank === rank);
          if (natural) {
            used.add(natural.id);
            group.push(natural);
            continue;
          }
          const joker = jokers.find((c) => !used.has(c.id));
          if (!joker) {
            fits = false;
            break;
          }
          used.add(joker.id);
          jokersUsed += 1;
          group.push(joker);
        }
        if (fits && jokersUsed < length) push(group);
      }
    }
  }

  // Sets: the anchor's rank in other suits, jokers filling the rest.
  const bySuit = new Map<string, Card>();
  for (const c of pool) {
    if (c.id === anchor.id || isWild(c, wild) || c.rank !== anchor.rank || c.suit === anchor.suit) continue;
    if (!bySuit.has(c.suit)) bySuit.set(c.suit, c);
  }
  const others = [...bySuit.values()];
  for (let mask = 0; mask < 1 << others.length; mask++) {
    const chosen = others.filter((_, i) => mask & (1 << i));
    for (let fill = 0; fill <= 2 && fill <= jokers.length; fill++) {
      const size = 1 + chosen.length + fill;
      if (size < 3 || size > 4) continue;
      push([anchor, ...chosen, ...jokers.slice(0, fill)]);
    }
  }
  return out;
}

/** Leftover jokers (no natural card left to anchor on): fold them into existing groups or make an all-joker set. */
function placeJokers(jokers: readonly Card[], groups: Card[][], wild: Rank): Card[][] | null {
  if (jokers.length === 0) return groups;
  const [first, ...rest] = jokers;
  for (let i = 0; i < groups.length; i++) {
    const extended = [...groups[i], first];
    if (!classifyMeld(extended, wild)) continue;
    const next = groups.map((g, j) => (j === i ? extended : g));
    const done = placeJokers(rest, next, wild);
    if (done) return done;
  }
  if (jokers.length >= 3 && jokers.length <= 4) return [...groups, [...jokers]];
  return null;
}

function cover(pool: readonly Card[], groups: Card[][], wild: Rank, budget: Budget): Card[][] | null {
  if (budget.nodes++ > SEARCH_NODE_LIMIT) return null;
  const anchor = pool.find((c) => !isWild(c, wild));
  if (!anchor) return placeJokers(pool, groups, wild);

  for (const group of groupsStartingAt(anchor, pool, wild)) {
    const taken = new Set(group.map((c) => c.id));
    const found = cover(pool.filter((c) => !taken.has(c.id)), [...groups, group], wild, budget);
    if (found) return found;
  }
  return null;
}

/** The first winning arrangement of `hand` (14 cards: 13 melded plus the discard), or null. */
export function findDeclaration(hand: readonly Card[], wild: Rank): BotDeclaration | null {
  if (hand.length !== 14) return null;
  const quick = findValidDeclaration(hand.slice(), wild);
  if (quick) return quick;

  // Throw the dearest cards first: if the hand wins either way, keep the cheaper cards in the melds.
  const worth = (c: Card): number => (isWild(c, wild) ? -1 : POINTS[c.rank]);
  const discards = hand.slice().sort((a, b) => worth(b) - worth(a));
  for (const discard of discards) {
    const rest = orderCards(hand.filter((c) => c.id !== discard.id), wild);
    const groups = cover(rest, [], wild, { nodes: 0 });
    if (groups && validateDeclare(groups, wild).ok) return { melds: groups, discardCardId: discard.id };
  }
  return null;
}

/* ── Hand cost: what is this hand still short of? ─────────────────── */

interface Pair {
  a: string;
  b: string;
  value: number;
}

/** Credit for cards that are one card from a meld, each card used once, strongest first. */
function nearMeldCredit(cards: readonly Card[], needsPure: boolean): number {
  const pairs: Pair[] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const x = cards[i];
      const y = cards[j];
      if (x.suit === y.suit) {
        const gap = Math.abs(RANK_INDEX[x.rank] - RANK_INDEX[y.rank]);
        const edge = x.rank === "A" || y.rank === "A" || x.rank === "K" || y.rank === "K";
        if (gap === 1) pairs.push({ a: x.id, b: y.id, value: (edge ? 5 : 7) + (needsPure ? PURE_NEED_PAIR_BONUS : 0) });
        else if (gap === 2) pairs.push({ a: x.id, b: y.id, value: 4 + (needsPure ? PURE_NEED_PAIR_BONUS / 2 : 0) });
      } else if (x.rank === y.rank) {
        pairs.push({ a: x.id, b: y.id, value: 5 });
      }
    }
  }
  pairs.sort((p, q) => q.value - p.value);
  const used = new Set<string>();
  let credit = 0;
  for (const pair of pairs) {
    if (used.has(pair.a) || used.has(pair.b)) continue;
    used.add(pair.a);
    used.add(pair.b);
    credit += pair.value;
  }
  return credit;
}

/** Lower is better. How far this hand is from a winning shape. */
export function handCost(hand: readonly Card[], wild: Rank): number {
  const arrangement = bestArrangementForScoring(hand.slice(), wild);
  const loose = arrangement.ungrouped.filter((c) => !isWild(c, wild));
  const spareWilds = arrangement.ungrouped.length - loose.length;

  // Sets that a second sequence will unlock count as built; the missing sequence is charged below.
  let unmelded = loose;
  if (!arrangement.hasSecondSequence) {
    const byRank = new Map<Rank, Card[]>();
    for (const c of loose) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
    const inSets = new Set<string>();
    for (const cards of byRank.values()) {
      const bySuit = new Map<string, Card>();
      for (const c of cards) if (!bySuit.has(c.suit)) bySuit.set(c.suit, c);
      if (bySuit.size >= 3) for (const c of bySuit.values()) inSets.add(c.id);
    }
    unmelded = loose.filter((c) => !inSets.has(c.id));
  }

  const deadwood = unmelded.reduce((sum, c) => sum + POINTS[c.rank], 0);
  const shape = !arrangement.hasPureSequence ? PURE_MISSING_COST : !arrangement.hasSecondSequence ? SECOND_SEQUENCE_MISSING_COST : 0;
  return deadwood + shape - nearMeldCredit(unmelded, !arrangement.hasPureSequence) - spareWilds * SPARE_WILD_CREDIT;
}

/** The cheapest hand reachable by throwing one card from `hand`, and which card that is. */
function bestThrow(hand: readonly Card[], wild: Rank): { id: string; cost: number } {
  let best: { id: string; cost: number; points: number } | null = null;
  for (const card of hand) {
    if (isWild(card, wild)) continue;
    const cost = handCost(hand.filter((c) => c.id !== card.id), wild);
    const points = POINTS[card.rank];
    if (!best || cost < best.cost || (cost === best.cost && points > best.points)) best = { id: card.id, cost, points };
  }
  // A hand of nothing but jokers: throw the last card.
  return best ?? { id: hand[hand.length - 1].id, cost: handCost(hand.slice(0, -1), wild) };
}

/** The card to throw from a 14-card hand. */
export function chooseDiscard(hand: readonly Card[], wild: Rank): string {
  return bestThrow(hand, wild).id;
}

/** Whether to take the open pile's top card (13-card hand, before drawing). */
export function chooseDraw(hand: readonly Card[], openTop: Card | null, wild: Rank): "open" | "closed" {
  if (!openTop || openTop.isPrintedJoker) return "closed";
  if (openTop.rank === wild) return "open";
  const now = handCost(hand, wild);
  const afterOpen = bestThrow([...hand, openTop], wild).cost;
  return afterOpen < now - OPEN_PICK_MARGIN ? "open" : "closed";
}
