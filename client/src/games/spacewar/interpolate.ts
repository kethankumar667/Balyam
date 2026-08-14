import type { SpaceWarPublicState } from "@shared/types";

/**
 * Smoothing Space War between server frames.
 *
 * Buffer broadcasts, match entities by id, and interpolate/extrapolate smoothly between them.
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
    return before ? { ...e, x: lerp(before.x, e.x, t), y: lerp(before.y, e.y, t) } : e;
  });
}

export function interpolateSpaceWar(
  prev: SpaceWarPublicState,
  cur: SpaceWarPublicState,
  alpha: number,
): SpaceWarPublicState {
  // Allow graceful micro-extrapolation up to 1.2 to avoid sudden freezes on network jitter
  const t = Math.max(0, Math.min(1.2, alpha));

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
