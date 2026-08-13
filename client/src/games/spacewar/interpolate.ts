import type { SpaceWarPublicState } from "@shared/types";

/**
 * Smoothing Space War between server frames.
 *
 * The engine runs at 30Hz. The board was drawing inside a `useEffect` keyed
 * on `state`, so it repainted exactly when a packet landed — frame rate WAS
 * packet rate. Every ship, bullet and enemy sat perfectly still for a
 * thirtieth of a second and then jumped, on a flawless connection as much as
 * a bad one, because it was never a connection problem: the game was showing
 * 30 discrete positions a second and calling it motion.
 *
 * Same treatment as Vyoma Yudh next door — keep the last two broadcasts,
 * match entities by id, draw each part-way between. The cost is displaying
 * the world one tick (~33ms) in the past, which nobody can see.
 *
 * Unlike Vyoma, the local ship is NOT predicted here. Space War's input is
 * already held server-side (`activeKeys`), so the ship moves every tick for
 * as long as a finger is down rather than once per delivered packet — the
 * responsiveness problem that made prediction worth the complexity over
 * there does not exist here. Interpolating it with everything else keeps one
 * coherent world rather than a ship living slightly in the future.
 */

export interface Snapshot {
  state: SpaceWarPublicState;
  /** performance.now() when this broadcast arrived. */
  at: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Lerps x/y on anything carrying an id, matched between frames. */
function blend<T extends { id: string; x: number; y: number }>(
  prev: readonly T[],
  cur: readonly T[],
  t: number,
): T[] {
  if (prev.length === 0) return cur as T[];
  const was = new Map(prev.map((e) => [e.id, e]));
  return cur.map((e) => {
    const before = was.get(e.id);
    // No previous frame means it spawned this tick. Draw it where it is —
    // inventing a start position makes new bullets fly out of thin air
    // somewhere they never were.
    return before ? { ...e, x: lerp(before.x, e.x, t), y: lerp(before.y, e.y, t) } : e;
  });
}

export function interpolateSpaceWar(
  prev: SpaceWarPublicState,
  cur: SpaceWarPublicState,
  alpha: number,
): SpaceWarPublicState {
  // Clamped, never extrapolated: if broadcasts stall, hold the newest known
  // position rather than guessing forward and being yanked back.
  const t = alpha <= 0 ? 0 : alpha >= 1 ? 1 : alpha;

  return {
    ...cur,
    player: {
      ...cur.player,
      x: lerp(prev.player.x, cur.player.x, t),
      y: lerp(prev.player.y, cur.player.y, t),
    },
    projectiles: blend(prev.projectiles, cur.projectiles, t),
    specials: blend(prev.specials, cur.specials, t),
    enemies: blend(prev.enemies, cur.enemies, t),
    powerUps: blend(prev.powerUps, cur.powerUps, t),
  };
}
