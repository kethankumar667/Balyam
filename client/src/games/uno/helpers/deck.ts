import type { UnoCard, UnoColor, UnoRank } from "@shared/types";

const COLORS: UnoColor[] = ["R", "G", "B", "Y"];
const NUMBER_RANKS: UnoRank[] = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
];
const ACTION_RANKS: UnoRank[] = ["Skip", "Reverse", "+2"];

/**
 * Card display properties: color emoji, label, icon
 */
export const CARD_DISPLAY: Record<
  string,
  { emoji: string; label: string; shortLabel: string }
> = {
  R: { emoji: "🔴", label: "Red", shortLabel: "R" },
  G: { emoji: "🟢", label: "Green", shortLabel: "G" },
  B: { emoji: "🔵", label: "Blue", shortLabel: "B" },
  Y: { emoji: "🟡", label: "Yellow", shortLabel: "Y" },
  Skip: { emoji: "⏭️", label: "Skip", shortLabel: "⏭" },
  Reverse: { emoji: "🔄", label: "Reverse", shortLabel: "↩" },
  "+2": { emoji: "2️⃣", label: "Draw Two", shortLabel: "+2" },
  Wild: { emoji: "🌈", label: "Wild", shortLabel: "🌈" },
  "Wild+4": { emoji: "🌈4️⃣", label: "Wild Draw Four", shortLabel: "W+4" },
};

export function getCardEmoji(card: UnoCard): string {
  if (card.rank === "Wild" || card.rank === "Wild+4") {
    return CARD_DISPLAY[card.rank]!.emoji;
  }
  if (card.color) {
    return CARD_DISPLAY[card.color]!.emoji;
  }
  return "❓";
}

export function getCardLabel(card: UnoCard): string {
  if (card.rank === "Wild" || card.rank === "Wild+4") {
    return CARD_DISPLAY[card.rank]!.label;
  }
  const colorLabel = card.color ? CARD_DISPLAY[card.color]?.label : "Unknown";
  const rankLabel = CARD_DISPLAY[card.rank]?.label || card.rank;
  return `${colorLabel} ${rankLabel}`.trim();
}

/**
 * Sort hand for better readability: group by color, then by rank within color.
 */
export function sortHand(cards: UnoCard[]): UnoCard[] {
  const wild = cards.filter((c) => c.rank === "Wild" || c.rank === "Wild+4");
  const colored = cards.filter((c) => c.color !== null);

  const coloredSorted = colored.sort((a, b) => {
    // First by color
    const colorOrder = { R: 0, G: 1, B: 2, Y: 3 };
    const colorCmp =
      colorOrder[a.color!] - colorOrder[b.color!];
    if (colorCmp !== 0) return colorCmp;

    // Then by rank (numbers first, then actions)
    const rankOrder: Record<UnoRank, number> = {
      "0": 0,
      "1": 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      Skip: 10,
      Reverse: 11,
      "+2": 12,
      Wild: 13,
      "Wild+4": 14,
    };
    return rankOrder[a.rank] - rankOrder[b.rank];
  });

  return [...coloredSorted, ...wild];
}

/**
 * Format a card for accessibility/debugging.
 */
export function describeCard(card: UnoCard): string {
  if (card.rank === "Wild") return "Wild card";
  if (card.rank === "Wild+4") return "Wild Draw Four";
  return `${CARD_DISPLAY[card.color!]?.label || "Unknown"} ${card.rank}`;
}
