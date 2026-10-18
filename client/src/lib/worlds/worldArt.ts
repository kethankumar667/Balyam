import type { GameKind } from "@shared/types";
import { DEFAULT_WORLD, WORLD_IDS, worldsFor, type WorldId } from "@shared/worlds";

/**
 * Which worlds each game can actually DRAW. The server accepts every world on the shared list for a game that has
 * worlds (`shared/worlds.ts`), because a host's client can only ever pick one it offers; this is the narrower list
 * of what has art. It grows one world at a time as a game's art is built, and the picker, the lobby card and the
 * board all read it, so none of them can offer or show a world that has no drawing behind it.
 */
const DRAWN: Readonly<Partial<Record<GameKind, readonly WorldId[]>>> = {
  ludo: ["classic", "toy", "palace"],
  rummy: ["classic", "toy", "palace"],
};

/** The worlds this game has art for, in the order of the shared list. Empty for a game with no worlds. */
export function artWorldsFor(game: GameKind): readonly WorldId[] {
  const drawn = DRAWN[game] ?? [];
  return worldsFor(game).length === 0 ? [] : WORLD_IDS.filter((id) => drawn.includes(id));
}

/**
 * The world to draw for a table. A world the game has no art for, a missing value (a server that predates worlds)
 * or anything unrecognised is drawn as the classic table: a table is never left looking like nothing.
 */
export function drawnWorld(game: GameKind, world: WorldId | undefined): WorldId {
  return world !== undefined && artWorldsFor(game).includes(world) ? world : DEFAULT_WORLD;
}
