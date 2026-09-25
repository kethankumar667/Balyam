import type { GameKind } from "@shared/types.js";

/** The games a group can start from a Mandali, and how many can sit down to each. */
export const GAMES: ReadonlyArray<{ kind: GameKind; name: string; min: number; max: number }> = [
  { kind: "ludo", name: "Ludo", min: 2, max: 4 },
  { kind: "handcricket", name: "Hand Cricket", min: 2, max: 2 },
  { kind: "rummy", name: "Rummy", min: 2, max: 6 },
  { kind: "snl", name: "Snakes & Ladders", min: 2, max: 4 },
  { kind: "uno", name: "UNO", min: 2, max: 4 },
  { kind: "dotsboxes", name: "Dots & Boxes", min: 2, max: 2 },
];

/** A game's name as people say it. Falls back to a tidied version of the kind for anything not listed. */
export function gameLabel(kind: string): string {
  const known = GAMES.find((g) => g.kind === kind);
  if (known) return known.name;
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
