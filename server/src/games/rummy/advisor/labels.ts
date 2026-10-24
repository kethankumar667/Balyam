import type { Card } from "@shared/types.js";
import { JOKER_SIG, rankOfSig, suitOfSig, type Sig } from "./cards.js";
import type { Out } from "./outlook.js";

const SUIT_MARK: Readonly<Record<string, string>> = { S: "♠", H: "♥", D: "♦", C: "♣" };

const rankLabel = (rank: string): string => (rank === "T" ? "10" : rank);

/** A card as a player says it: "10♥", or "joker" for a printed joker. */
export function cardLabel(card: Pick<Card, "rank" | "suit" | "isPrintedJoker">): string {
  if (card.isPrintedJoker) return "joker";
  return `${rankLabel(card.rank)}${SUIT_MARK[card.suit] ?? card.suit}`;
}

export const labelsOf = (cards: readonly Card[]): string => cards.map(cardLabel).join(" ");

export function sigLabel(sig: Sig): string {
  if (sig === JOKER_SIG) return "a joker";
  return `${rankLabel(rankOfSig(sig))}${SUIT_MARK[suitOfSig(sig)] ?? suitOfSig(sig)}`;
}

export const percent = (fraction: number): string => `${Math.round(fraction * 100)}%`;

export const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`;

/** The cards that would help, most plentiful first, trimmed to a sentence a player can take in. */
export function describeOuts(outs: readonly Out[], limit = 5): string {
  if (outs.length === 0) return "none";
  const ordered = outs.slice().sort((a, b) => b.copies - a.copies);
  const shown = ordered.slice(0, limit).map((out) => sigLabel(out.sig));
  const more = ordered.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${plural(more, "other kind")}` : shown.join(", ");
}
