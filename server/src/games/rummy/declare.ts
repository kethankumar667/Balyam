import type { Card, Meld, Rank } from "@shared/types.js";
import { classifyMeld } from "./melds.js";

export interface DeclareResult {
  ok: boolean;
  melds?: Meld[];
  error?: string;
}

/**
 * Validate a player's declaration. The 13-card hand must be partitioned into melds where:
 *  - All cards are used (exactly 13)
 *  - Every group is a valid meld
 *  - At least one pure sequence
 *  - At least two sequences total (pure or impure)
 */
export function validateDeclare(
  cardGroups: Card[][],
  wildJokerRank: Rank,
): DeclareResult {
  const flat = cardGroups.flat();
  if (flat.length !== 13) {
    return { ok: false, error: `Expected 13 cards across all melds, got ${flat.length}` };
  }
  const ids = new Set<string>();
  for (const c of flat) {
    if (ids.has(c.id)) return { ok: false, error: `Card ${c.id} used more than once` };
    ids.add(c.id);
  }

  const melds: Meld[] = [];
  for (let i = 0; i < cardGroups.length; i++) {
    const g = cardGroups[i];
    const m = classifyMeld(g, wildJokerRank);
    if (!m) {
      return {
        ok: false,
        error: `Group ${i + 1} is not a valid meld (${g.map((c) => c.rank + c.suit).join(",")})`,
      };
    }
    melds.push(m);
  }

  const sequences = melds.filter(
    (m) => m.kind === "pureSequence" || m.kind === "impureSequence"
  );
  const pureSeqs = melds.filter((m) => m.kind === "pureSequence");
  if (pureSeqs.length < 1) {
    return { ok: false, error: "At least one pure sequence is required" };
  }
  if (sequences.length < 2) {
    return { ok: false, error: "At least two sequences are required" };
  }

  return { ok: true, melds };
}
