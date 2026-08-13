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
 * Buffer the broadcasts, match entities by id, draw each part-way between.
 * The cost is displaying the world about one tick (~33ms) in the past, which
 * nobody can see. Which two snapshots to blend, and how far between them, is
 * SnapshotTimeline's job; this module only does the blending.
 *
 * The local ship is interpolated here like everything else and then given a
 * separate, decaying lead by the board (see predict.ts). Keeping the two apart
 * is deliberate: this function stays a pure function of two server states, so
 * the prediction can be switched off — paused, finished, spectating — by
 * simply not applying it.
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
