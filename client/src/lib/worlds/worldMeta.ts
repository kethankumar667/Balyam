import type { GameKind } from "@shared/types";
import { WORLD_WIN_LADDER, type WorldId } from "@shared/worlds";

/**
 * What a world is called, what it is like, and what it asks for. Words only: the drawing of each world lives with
 * the game that shows it. The names are shared with Brain Vita's worlds on purpose, so a name means one place
 * wherever it is met.
 */

export interface WorldMeta {
  name: string;
  /** One line on what the place is, so a locked world still says what it would be like to play in. */
  blurb: string;
}

export const WORLD_META: Readonly<Record<WorldId, WorldMeta>> = {
  classic: { name: "Classic", blurb: "The table as it has always been." },
  neon: { name: "Neon deck", blurb: "Glowing glass over a neon grid, after dark." },
  toy: { name: "Toy box", blurb: "A bright playroom, with blocks, a duck and crayons." },
  zen: { name: "Zen garden", blurb: "Raked sand, slate and smooth river stones." },
  reef: { name: "Coral reef", blurb: "The sea floor, with bubbles rising and light from above." },
  palace: { name: "Royal palace", blurb: "Marble inlaid with gold, brass lamps and marigolds." },
};

const GAME_NOUN: Partial<Record<GameKind, string>> = { ludo: "Ludo", rummy: "Rummy" };

/** What earning this world asks, in words. Empty for the classic world, which everyone has. */
export function requirementFor(game: GameKind, world: WorldId): string {
  if (world === "classic") return "";
  const wins = WORLD_WIN_LADDER[world];
  const noun = GAME_NOUN[game];
  const matches = wins === 1 ? "match" : "matches";
  return `Win ${wins} ${noun ? `${noun} ` : ""}${matches} against other people.`;
}
