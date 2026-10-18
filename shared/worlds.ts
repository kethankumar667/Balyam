import type { GameKind } from "./types.js";

/**
 * Worlds: the look of a whole table, chosen by the host and seen by everyone sitting at it.
 *
 * A world is a place, not a palette: its own scene behind the table, its own material for the board or felt,
 * its own things lying about, its own way of scattering a captured piece, its own sound. It is purely visual.
 * Game engines never read it, it never touches a seat's colour (a seat's colour is who a player is), and it
 * changes no rule, score or reward.
 *
 * Only Ludo and Rummy have worlds so far. The list below is CLOSED: the host's choice is re-broadcast to every
 * other player's page, so anything that is not exactly one of these names is dropped on the way in, never
 * echoed. That is the same rule as for reactions and avatars (see AGENTS.md, "Player-supplied values").
 */

export const WORLD_IDS = ["classic", "neon", "toy", "zen", "reef", "palace"] as const;
export type WorldId = (typeof WORLD_IDS)[number];

/** Where every table starts, and where anything unrecognised falls back to. The look the game always had. */
export const DEFAULT_WORLD: WorldId = "classic";

const WORLD_GAMES: readonly GameKind[] = ["ludo", "rummy"];

/** The worlds a game offers: all of them for a game that has worlds, none for one that does not. */
export function worldsFor(game: GameKind): readonly WorldId[] {
  return WORLD_GAMES.includes(game) ? WORLD_IDS : [];
}

const isWorldId = (value: unknown): value is WorldId => typeof value === "string" && (WORLD_IDS as readonly string[]).includes(value);

/**
 * The world a value names for this game, or the classic one. Exact match only: no trimming, no case folding,
 * so a value that is almost a world is not one.
 */
export function sanitizeWorld(game: GameKind, value: unknown): WorldId {
  return isWorldId(value) && worldsFor(game).includes(value) ? value : DEFAULT_WORLD;
}

/** Whether a value names a world this game really offers (as opposed to merely sanitising to the classic one). */
export function isWorldOf(game: GameKind, value: unknown): value is WorldId {
  return isWorldId(value) && worldsFor(game).includes(value);
}

/**
 * How many matches a player must win, in a game, to earn each world, easiest first. The classic world is not
 * on it: everyone has it. Only matches with two or more humans count, so that a bot cannot be farmed for a
 * world (that rule is applied where the wins are counted, on the client).
 */
export const WORLD_WIN_LADDER: Readonly<Record<Exclude<WorldId, "classic">, number>> = {
  neon: 1,
  toy: 3,
  zen: 7,
  reef: 15,
  palace: 30,
};

/** Every world that this many wins has earned, in the order of `WORLD_IDS`. A damaged count earns only the classic world. */
export function worldsEarnedBy(wins: number): WorldId[] {
  const count = Number.isFinite(wins) && wins > 0 ? Math.floor(wins) : 0;
  return WORLD_IDS.filter((id) => id === "classic" || count >= WORLD_WIN_LADDER[id]);
}
