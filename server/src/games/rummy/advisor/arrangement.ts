import type { Card, Rank } from "@shared/types.js";
import { HAND_CAP, looseValue } from "./cards.js";
import { enumerateMelds, type MeldCandidate } from "./meldCandidates.js";

/** The best way to group a hand, and what is left over. */
export interface Arrangement {
  /** The groups that earn credit, as cards. */
  melds: Card[][];
  /** Cards outside every credited group. */
  ungrouped: Card[];
  /** Points still against the hand, capped at 80 as a round score is. */
  deadwood: number;
  /** The same, before the cap. */
  rawDeadwood: number;
  hasPureSequence: boolean;
  /** A second sequence, pure or impure, which is what lets sets count. */
  hasSecondSequence: boolean;
}

const bit = (index: number): number => 1 << index;
const lowestBit = (mask: number): number => 31 - Math.clz32(mask & -mask);

interface Search {
  credit: number;
  chosen: MeldCandidate[];
}

/**
 * Exact best grouping under Indian Rummy's credit rules:
 *   - nothing is credited without a pure sequence;
 *   - sets are credited only once a second sequence (pure or impure) exists.
 *
 * The engine's `bestArrangementForScoring` takes the longest run in each suit and stops, so it can miss a
 * better grouping (a run split so a set can use its middle card, a joker spent where it is needed). This
 * tries every partition of the hand into legal groups and keeps the cheapest.
 */
export function solveArrangement(hand: readonly Card[], wild: Rank): Arrangement {
  const candidates = enumerateMelds(hand, wild);
  const worth = hand.map((card) => looseValue(card, wild));
  const total = worth.reduce((sum, value) => sum + value, 0);
  const pointsOfMask = (mask: number): number => {
    let sum = 0;
    for (let i = 0; i < hand.length; i++) if (mask & bit(i)) sum += worth[i];
    return sum;
  };

  const byLowest = new Map<number, (MeldCandidate & { points: number })[]>();
  for (const candidate of candidates) {
    const low = lowestBit(candidate.mask);
    const list = byLowest.get(low) ?? [];
    list.push({ ...candidate, points: pointsOfMask(candidate.mask) });
    byLowest.set(low, list);
  }

  const everyCard = hand.length === 0 ? 0 : (1 << hand.length) - 1;

  /** Best credit when sets count (needs a pure sequence and two sequences), or when only sequences do. */
  const run = (withSets: boolean): Search | null => {
    const memo = new Map<number, Search | null>();
    const go = (done: number, pure: number, sequences: number): Search | null => {
      if (done === everyCard) {
        const feasible = withSets ? pure === 1 && sequences >= 2 : pure === 1;
        return feasible ? { credit: 0, chosen: [] } : null;
      }
      const key = (done << 3) | (pure << 2) | sequences;
      if (memo.has(key)) return memo.get(key)!;

      const next = lowestBit(~done & everyCard);
      let best: Search | null = go(done | bit(next), pure, sequences); // this card stays loose

      for (const meld of byLowest.get(next) ?? []) {
        if (meld.mask & done) continue;
        const isSequence = meld.kind !== "set";
        if (!withSets && !isSequence) continue;
        const rest = go(
          done | meld.mask,
          meld.kind === "pure" ? 1 : pure,
          Math.min(2, sequences + (isSequence ? 1 : 0)),
        );
        if (!rest) continue;
        const credit = rest.credit + meld.points;
        if (!best || credit > best.credit) best = { credit, chosen: [meld, ...rest.chosen] };
      }
      memo.set(key, best);
      return best;
    };
    return go(0, 0, 0);
  };

  const full = run(true);
  const sequencesOnly = run(false);
  const best = [full, sequencesOnly].reduce<Search | null>((a, b) => (!b ? a : !a || b.credit > a.credit ? b : a), null);

  const chosen = best?.chosen ?? [];
  const inMeld = chosen.reduce((mask, meld) => mask | meld.mask, 0);
  const melds = chosen.map((meld) => hand.filter((_, index) => meld.mask & bit(index)));
  const rawDeadwood = total - (best?.credit ?? 0);

  return {
    melds,
    ungrouped: hand.filter((_, index) => !(inMeld & bit(index))),
    rawDeadwood,
    deadwood: Math.min(HAND_CAP, rawDeadwood),
    hasPureSequence: chosen.some((meld) => meld.kind === "pure"),
    hasSecondSequence: chosen.filter((meld) => meld.kind !== "set").length >= 2,
  };
}
