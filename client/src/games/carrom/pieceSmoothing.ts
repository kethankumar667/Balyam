import type { CarromPiece } from "@shared/types";

/**
 * Smooths the Carrom pieces between the server's snapshots.
 *
 * The server steps the physics at 60 Hz but a snapshot reaches the browser whenever the network
 * delivers it, so pieces used to jump from one snapshot to the next and a hit looked choppy even
 * when the simulation was right. The board now draws a moment in the PAST (RENDER_DELAY_MS) and
 * blends between the two snapshots on either side of that moment. It never extrapolates: a piece
 * is only ever drawn where the server has said it was or on a straight line between two such places.
 */

/** How far behind the newest snapshot the board is drawn. Covers a couple of late packets. */
export const RENDER_DELAY_MS = 50;

/** Enough history for the delay plus jitter; older snapshots are never sampled. */
export const MAX_SNAPSHOTS = 12;

export interface Snapshot {
  /** When the snapshot reached the browser, in `performance.now()` milliseconds. */
  readonly t: number;
  readonly pieces: readonly CarromPiece[];
}

/** Adds a snapshot, keeping time strictly increasing and the buffer short. Returns a new buffer. */
export function pushSnapshot(buffer: readonly Snapshot[], pieces: readonly CarromPiece[], now: number): Snapshot[] {
  const last = buffer[buffer.length - 1];
  const t = last && now <= last.t ? last.t + 1 : now;
  return [...buffer, { t, pieces }].slice(-MAX_SNAPSHOTS);
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

/**
 * Where one piece is part-way from `from` to `to`. A piece that has already fallen stays fallen; a
 * piece that falls in `to` stays on the board until `to` is reached, so the fall plays at the right time.
 */
function blendPiece(from: CarromPiece, to: CarromPiece | undefined, alpha: number): CarromPiece {
  if (!to || from.pocketed) return from;
  return {
    ...from,
    x: lerp(from.x, to.x, alpha),
    y: lerp(from.y, to.y, alpha),
    vx: lerp(from.vx, to.vx, alpha),
    vy: lerp(from.vy, to.vy, alpha),
  };
}

/** The board as it should be drawn at `renderTime` (a `performance.now()` value minus the delay). */
export function samplePieces(buffer: readonly Snapshot[], renderTime: number): readonly CarromPiece[] {
  if (buffer.length === 0) return [];
  const first = buffer[0];
  const last = buffer[buffer.length - 1];
  if (renderTime <= first.t) return first.pieces;
  if (renderTime >= last.t) return last.pieces;

  let i = 0;
  while (buffer[i + 1].t <= renderTime) i++;
  const from = buffer[i];
  const to = buffer[i + 1];
  const alpha = (renderTime - from.t) / (to.t - from.t);

  const nextById = new Map(to.pieces.map((p) => [p.id, p]));
  const blended = from.pieces.map((p) => blendPiece(p, nextById.get(p.id), alpha));
  const known = new Set(from.pieces.map((p) => p.id));
  const arrivals = to.pieces.filter((p) => !known.has(p.id));
  return [...blended, ...arrivals];
}

/** True while any piece still on the board has speed. */
export function isAnyMoving(pieces: readonly CarromPiece[]): boolean {
  return pieces.some((p) => !p.pocketed && (p.vx !== 0 || p.vy !== 0));
}

/**
 * True once the newest snapshot is the one being drawn and it is at rest, so the animation loop can stop
 * and the board can show the server's pieces as they are.
 */
export function caughtUp(buffer: readonly Snapshot[], now: number): boolean {
  const last = buffer[buffer.length - 1];
  if (!last) return true;
  return !isAnyMoving(last.pieces) && now - RENDER_DELAY_MS >= last.t;
}
