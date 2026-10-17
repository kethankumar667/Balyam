import { cellOf, type Move } from "./brainvitaRules";

/**
 * The geometry of one jump, in hole widths, so the animation is drawn once and scales with the board.
 * Pure: nothing here knows about the DOM, and nothing decides anything about the game.
 */

/** How long a marble is in the air. Short enough that a fast player is never kept waiting. */
export const JUMP_DURATION_MS = 340;
/** How long the captured marble takes to dissolve. */
export const DISSOLVE_DURATION_MS = 420;
/** How high the arc rises at its peak, in hole widths. */
export const ARC_HEIGHT = 0.62;
/** Ghost copies trailing the flying marble, and the delay between them. */
export const TRAIL_COUNT = 4;
export const TRAIL_STEP_MS = 34;
/** Bits of light thrown off by the captured marble. */
export const PARTICLE_COUNT = 9;
/** How far a particle travels, in hole widths. */
export const PARTICLE_REACH = 0.8;

export interface JumpGeometry {
  /** Where the marble starts, as a cell centre in hole widths from the board's top-left. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** The captured marble's cell centre. */
  over: { x: number; y: number };
  /** The move from start to landing, in hole widths. */
  dx: number;
  dy: number;
}

const centre = (hole: number): { x: number; y: number } => {
  const { row, col } = cellOf(hole);
  return { x: col + 0.5, y: row + 0.5 };
};

export function jumpGeometry(move: Move): JumpGeometry {
  const from = centre(move.from);
  const to = centre(move.to);
  return { from, to, over: centre(move.over), dx: to.x - from.x, dy: to.y - from.y };
}

export interface Keyframe {
  /** In hole widths, to be turned into a translate of the marble's own size. */
  x: number;
  y: number;
  offset: number;
  scale: number;
}

/** The flight path: straight along the jump, with the height of an arc added on top, peaking in the middle. */
export function flightKeyframes(move: Move, steps = 8): Keyframe[] {
  const { dx, dy } = jumpGeometry(move);
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const lift = Math.sin(Math.PI * t) * ARC_HEIGHT;
    return { x: dx * t, y: dy * t - lift, offset: t, scale: 1 + 0.18 * Math.sin(Math.PI * t) };
  });
}

/** Evenly spaced directions for the particles, turned by `seed` so successive jumps do not look alike. */
export function particleAngles(count = PARTICLE_COUNT, seed = 0): number[] {
  return Array.from({ length: count }, (_, index) => ((index / count) * 2 + (seed % 7) * 0.09) * Math.PI);
}
