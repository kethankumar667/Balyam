import type { VamanaLastMove } from "@shared/types.js";
import { VAMANA_PITS_PER_SIDE } from "@shared/types.js";

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * One plain sentence about the last turn, for the move log and for screen readers. The pit is named by
 * its place in its owner's row (1 to 7), the same number the pit's own label uses.
 */
export function describeLastMove(move: VamanaLastMove | null, nameOf: (playerId: string) => string): string {
  if (move === null) return "";
  const first = move.lifts[0];
  const relays = move.lifts.length - 1;
  const base = `${nameOf(move.playerId)} sowed ${plural(first.seeds, "seed")} from pit ${(first.pit % VAMANA_PITS_PER_SIDE) + 1}`;

  const parts: string[] = [];
  if (relays > 0) parts.push(`relayed ${plural(relays, "time")}`);
  if (move.capture) parts.push(`captured ${plural(move.capture.seeds, "seed")}`);

  let sentence = base;
  if (parts.length === 1) sentence = `${base} and ${parts[0]}`;
  if (parts.length === 2) sentence = `${base}, ${parts[0]}, and ${parts[1]}`;
  sentence += ".";
  if (move.truncated) sentence += " The turn hit the relay limit and ended without a capture.";
  return sentence;
}
