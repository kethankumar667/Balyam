import type { Card, Rank } from "@shared/types.js";
import { RANK_INDEX, SUIT_INDEX, sigOf } from "./cards.js";

/**
 * How many more cards a hand needs before it can show.
 *
 * A winning hand is 13 cards in groups, with at least one pure sequence and one more sequence. So the question
 * is: starting from the cards held, how few have to be swapped in? Each draw brings in one card, so the answer
 * is also the fewest draws that can win. 0 means the 13 cards already show (draw anything and declare), 1 means
 * one particular card finishes it, and so on.
 *
 * ── How it is counted ───────────────────────────────────────────────
 * Think of the finished hand as 13 slots. The held cards fill some of them and the rest are "holes" that must
 * be drawn. Two facts make the count simple:
 *
 *   - A joker (printed, or a card of the wild rank) fills any hole EXCEPT one in the pure sequence, which needs a
 *     real card. A wild-rank card sitting in its own slot is a real card, so it can fill a pure hole too.
 *   - Every natural card placed in a group removes one hole.
 *
 * With J jokers in hand, U natural cards placed in groups, and h holes in the pure sequence, the cards still
 * needed are  max(h, 13 - J - U)  : at least the pure holes, and otherwise whatever the jokers and placed
 * cards leave open. Choosing the pure sequence and the other groups to make that as small as possible is a
 * small packing problem, solved exactly here (a hand has at most 14 cards, and a group takes at least 3 slots,
 * so only a few groups ever fit).
 *
 * The result is verified against the engine's own declaration check (see distance.test.ts).
 */

const SLOTS = 13;
/** A group with more holes than this is never part of a win that is close, and would only add noise. */
const MAX_HOLES = 4;
const NEGATIVE = -1;

interface Item {
  suit: number;
  rank: number;
}

interface Template {
  /** Bits over the items that fill this group. */
  mask: number;
  /** Slots the group takes in the 13-card hand. */
  slots: number;
  isRun: boolean;
}

const bit = (index: number): number => 1 << index;
const popcount = (value: number): number => {
  let count = 0;
  for (let v = value; v; v &= v - 1) count += 1;
  return count;
};
const lowestBit = (mask: number): number => 31 - Math.clz32(mask & -mask);

/**
 * Every run that could be built around the given cards: a window of one suit with both ends held, and any
 * subset of the cards between the ends. The least slots that hold each distinct set of cards is kept.
 */
function runTemplates(items: readonly Item[]): Template[] {
  const positions: number[][][] = Array.from({ length: 4 }, () => Array.from({ length: 14 }, () => [] as number[]));
  items.forEach((item, index) => {
    positions[item.suit][item.rank].push(index);
    if (item.rank === 0) positions[item.suit][13].push(index);
  });

  const fewest = new Map<number, number>();
  const record = (mask: number, slots: number): void => {
    const known = fewest.get(mask);
    if (known === undefined || slots < known) fewest.set(mask, slots);
  };

  for (let suit = 0; suit < 4; suit++) {
    const row = positions[suit];
    for (let start = 0; start <= 13; start++) {
      if (row[start].length === 0) continue;
      for (let end = start; end <= 13 && end - start + 1 <= SLOTS; end++) {
        if (row[end].length === 0) continue;
        const span = end - start + 1;
        const slots = Math.max(3, span);

        const walk = (position: number, mask: number, used: number): void => {
          if (position === end) {
            if (slots - used <= MAX_HOLES) record(mask, slots);
            return;
          }
          // Skip the card at this interior position (a hole), or use any copy of it.
          walk(position + 1, mask, used);
          for (const index of row[position]) {
            if (mask & bit(index)) continue;
            walk(position + 1, mask | bit(index), used + 1);
          }
        };

        for (const first of row[start]) {
          if (start === end) {
            record(bit(first), slots);
            continue;
          }
          for (const last of row[end]) {
            if (first === last) continue; // the same Ace cannot sit at both ends
            walk(start + 1, bit(first) | bit(last), 2);
          }
        }
      }
    }
  }
  return [...fewest].map(([mask, slots]) => ({ mask, slots, isRun: true }));
}

/** Every set that could be built around the given cards: one card per suit of a rank. */
function setTemplates(items: readonly Item[]): Template[] {
  const byRank = new Map<number, number[][]>();
  items.forEach((item, index) => {
    const row = byRank.get(item.rank) ?? [[], [], [], []];
    row[item.suit].push(index);
    byRank.set(item.rank, row);
  });

  const fewest = new Map<number, number>();
  for (const row of byRank.values()) {
    const choose = (suit: number, mask: number, size: number): void => {
      if (suit === 4) {
        if (size > 0 && !fewest.has(mask)) fewest.set(mask, Math.max(3, size));
        return;
      }
      choose(suit + 1, mask, size);
      for (const index of row[suit]) choose(suit + 1, mask | bit(index), size + 1);
    };
    choose(0, 0, 0);
  }
  return [...fewest].map(([mask, slots]) => ({ mask, slots, isRun: false }));
}

const cache = new Map<string, number>();
const CACHE_LIMIT = 40_000;

/** Cards still needed for `hand` to be able to show. */
export function cardsNeeded(hand: readonly Card[], wild: Rank): number {
  const key = `${wild}|${hand.map((card) => sigOf(card)).sort().join(",")}`;
  const known = cache.get(key);
  if (known !== undefined) return known;
  const answer = compute(hand, wild);
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, answer);
  return answer;
}

function compute(hand: readonly Card[], wild: Rank): number {
  // Cards that can only ever be natural, cards of the wild rank (natural in their own slot, joker elsewhere), and printed jokers.
  const naturals: Item[] = [];
  const wildRank: Item[] = [];
  let printed = 0;
  for (const card of hand) {
    if (card.isPrintedJoker) printed += 1;
    else if (card.rank === wild) wildRank.push({ suit: SUIT_INDEX[card.suit], rank: RANK_INDEX[card.rank] });
    else naturals.push({ suit: SUIT_INDEX[card.suit], rank: RANK_INDEX[card.rank] });
  }
  const jokers = printed + wildRank.length;
  const required = SLOTS - jokers;
  const naturalMask = naturals.length === 0 ? 0 : (1 << naturals.length) - 1;

  // Groups the other (non-pure) part of the hand can use: natural cards only.
  const inner = [...runTemplates(naturals), ...setTemplates(naturals)];
  const byLowest = new Map<number, Template[]>();
  for (const template of inner) {
    const low = lowestBit(template.mask);
    const list = byLowest.get(low) ?? [];
    list.push(template);
    byLowest.set(low, list);
  }

  /** Most natural cards that fit in groups within `budget` slots, optionally requiring at least one run. */
  const memo = new Map<number, number>();
  const best = (mask: number, budget: number, needRun: boolean): number => {
    if (budget < 3 || mask === 0) return needRun ? NEGATIVE : 0;
    const key = mask * 64 + budget * 2 + (needRun ? 1 : 0);
    const known = memo.get(key);
    if (known !== undefined) return known;

    const anchor = lowestBit(mask);
    let result = best(mask & ~bit(anchor), budget, needRun);
    for (const template of byLowest.get(anchor) ?? []) {
      if ((template.mask & mask) !== template.mask || template.slots > budget) continue;
      const rest = best(mask & ~template.mask, budget - template.slots, needRun && !template.isRun);
      if (rest === NEGATIVE) continue;
      result = Math.max(result, popcount(template.mask) + rest);
    }
    memo.set(key, result);
    return result;
  };

  // The pure sequence: any run built from natural cards and wild-rank cards in their own slots, or none yet.
  const pureItems = [...naturals, ...wildRank];
  const pure = runTemplates(pureItems);
  pure.push({ mask: 0, slots: 3, isRun: true });

  let fewest = SLOTS;
  for (const template of pure) {
    const naturalPart = template.mask & naturalMask;
    const naturalUsed = popcount(naturalPart);
    const wildUsed = popcount(template.mask >> naturals.length);
    const pureHoles = template.slots - naturalUsed - wildUsed;
    const rest = naturalMask & ~naturalPart;

    // The second sequence comes from the other groups, or is built from scratch (3 slots, and one real card).
    const withRun = best(rest, SLOTS - template.slots, true);
    if (withRun !== NEGATIVE) fewest = Math.min(fewest, Math.max(pureHoles, required - naturalUsed - withRun));
    if (SLOTS - template.slots - 3 >= 0) {
      const fresh = best(rest, SLOTS - template.slots - 3, false);
      fewest = Math.min(fewest, Math.max(pureHoles + 1, required - naturalUsed - fresh));
    }
  }
  return Math.max(0, fewest);
}
