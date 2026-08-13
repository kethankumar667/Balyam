import type {
  VyomaEntity,
  VyomaPickup,
  VyomaShot,
  VyomaYudhPublicState,
} from "@shared/types";

/**
 * Smoothing the gap between server frames.
 *
 * The simulation runs at 20Hz and the canvas redraws at 60. Drawing the raw
 * broadcast means every enemy and every bullet holds perfectly still for
 * three frames and then jumps — which reads as stutter no matter how good
 * the connection is, because it is not a connection problem at all. It was
 * the game rendering 20 distinct positions per second and calling it motion.
 *
 * This is ordinary entity interpolation: keep the last two broadcasts, match
 * entities by id, and draw each one part-way between where it was and where
 * it is. The cost is that the world is displayed one tick (50ms) in the
 * past. That is invisible for things you do not control — and the one thing
 * you DO control, your own ship, is predicted locally instead (see the
 * board), so it does not pay that 50ms.
 */

export interface Snapshot {
  state: VyomaYudhPublicState;
  /** performance.now() when this broadcast arrived. */
  at: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * A view of the world between two broadcasts.
 *
 * `alpha` runs 0 at `prev` to 1 at `cur`. Entities that exist only in `cur`
 * just spawned and are drawn where they are — there is nothing to smooth
 * from, and inventing a start position would make new bullets appear to
 * come from the wrong place.
 */
export function interpolateState(
  prev: VyomaYudhPublicState,
  cur: VyomaYudhPublicState,
  alpha: number,
): VyomaYudhPublicState {
  const t = alpha <= 0 ? 0 : alpha >= 1 ? 1 : alpha;

  const prevShots = new Map(prev.shots.map((s) => [s.id, s]));
  const prevEnemies = new Map(prev.enemies.map((e) => [e.id, e]));
  const prevPickups = new Map(prev.pickups.map((p) => [p.id, p]));

  const shots: VyomaShot[] = cur.shots.map((s) => {
    const was = prevShots.get(s.id);
    return was ? { ...s, x: lerp(was.x, s.x, t), y: lerp(was.y, s.y, t) } : s;
  });

  const enemies: VyomaEntity[] = cur.enemies.map((e) => {
    const was = prevEnemies.get(e.id);
    return was ? { ...e, x: lerp(was.x, e.x, t), y: lerp(was.y, e.y, t) } : e;
  });

  const pickups: VyomaPickup[] = cur.pickups.map((p) => {
    const was = prevPickups.get(p.id);
    return was ? { ...p, x: lerp(was.x, p.x, t), y: lerp(was.y, p.y, t) } : p;
  });

  return { ...cur, shots, enemies, pickups };
}

/**
 * Where the local ship should be drawn this frame.
 *
 * Steering is server-authoritative, so without this the ship does not begin
 * to move until a round trip has completed — press, wait, move. On a phone
 * that is 100-200ms of nothing, and it is the difference between a ship you
 * are flying and a ship you are requesting.
 *
 * So the board flies its own copy at the same speed the server uses, and
 * pulls it back toward the authoritative value continuously. The two agree
 * because they are running identical arithmetic on the same constants; the
 * correction only has work to do when something the client could not know
 * about happened — a wall, a respawn, a dropped packet.
 */
export function reconcileShipY(
  predicted: number,
  authoritative: number,
  dtSeconds: number,
  steerDir: -1 | 0 | 1,
  speed: number,
  min: number,
  max: number,
): number {
  let next = predicted + steerDir * speed * dtSeconds;
  next = Math.max(min, Math.min(max, next));

  const gap = authoritative - next;

  /**
   * A big disagreement is not drift, it is an event — a respawn recentring
   * the ship, or a reconnect. Easing across that would send the ship gliding
   * through the middle of the screen; snap instead, because the player
   * already knows something happened.
   */
  if (Math.abs(gap) > 12) return authoritative;

  // Otherwise close the gap gently. Frame-rate independent, so a 30fps phone
  // converges at the same real-world pace as a 120Hz one.
  const catchUp = 1 - Math.pow(0.0001, dtSeconds);
  return next + gap * catchUp;
}
