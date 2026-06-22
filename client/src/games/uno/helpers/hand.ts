import type { UnoCard } from "@shared/types";

/**
 * Find a card by ID in a hand.
 */
export function findCardById(hand: UnoCard[], cardId: string): UnoCard | undefined {
  return hand.find((c) => c.id === cardId);
}

/**
 * Count cards of a specific rank in hand.
 */
export function countRank(hand: UnoCard[], rank: string): number {
  return hand.filter((c) => c.rank === rank).length;
}

/**
 * Count cards of a specific color in hand.
 */
export function countColor(hand: UnoCard[], color: string): number {
  return hand.filter((c) => c.color === color).length;
}

/**
 * Count wild cards in hand.
 */
export function countWilds(hand: UnoCard[]): number {
  return hand.filter((c) => c.rank === "Wild" || c.rank === "Wild+4").length;
}

/**
 * Get the most common color in hand (for bot Wild decisions).
 */
export function getMostCommonColor(
  hand: UnoCard[]
): "R" | "G" | "B" | "Y" | null {
  const counts = { R: 0, G: 0, B: 0, Y: 0 };
  for (const card of hand) {
    if (card.color) {
      counts[card.color]++;
    }
  }
  const entries = Object.entries(counts) as Array<
    [keyof typeof counts, number]
  >;
  const [color] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  return color || null;
}
