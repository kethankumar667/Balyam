import type { AimData } from "./carrom-shared";

/**
 * Turning a finger into a shot.
 *
 * Aim used to be read from the striker to wherever the finger happened to be. That made the first
 * touch anywhere on the board already a full-power shot, let a second finger take the aim over, tied
 * the angle and the power to the same short lever, and let the fingertip rolling as it lifted change
 * the shot at the last instant. Here the aim comes from how far the finger has MOVED since it went
 * down (a slingshot: pull back, and the striker flies the other way), and all of that is pure
 * arithmetic so it can be tested without a screen.
 */

/** Board units of pull that mean full power. A longer lever gives finer control of both power and angle. */
export const MAX_PULL_UNITS = 40;
/** A pull shorter than this is not an aim. It is also how a player cancels: pull back to where you started. */
export const DEAD_ZONE_UNITS = 3;
/** At or beyond this pull the angle follows the finger exactly; shorter pulls damp it (see `aimAt`). */
export const ANGLE_FULL_TRUST_UNITS = 14;
/** The least a single movement can turn the angle, however short the pull. */
const MIN_ANGLE_WEIGHT = 0.25;
/** The shot fired is the aim held this long before the finger left the glass, not the lift-off twitch. */
export const RELEASE_LOOKBACK_MS = 60;
/** How much recent movement is remembered. Only the look-back needs any of it. */
const SAMPLE_WINDOW_MS = 400;

export interface Point {
  x: number;
  y: number;
}

export interface AimSample {
  /** `event.timeStamp` of the movement, in milliseconds. */
  readonly t: number;
  /** The aim at that moment, or null while the pull is inside the dead zone. */
  readonly aim: AimData | null;
}

export interface AimGesture {
  readonly pointerId: number;
  /** Where the finger went down, in board units. The pull is measured from here, not from the striker. */
  readonly anchor: Point;
  readonly samples: readonly AimSample[];
}

/** Folds any angle into (-PI, PI]. */
function wrap(angle: number): number {
  return ((((angle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/**
 * The aim for a finger at `p`, given the previous aim in the same gesture.
 *
 * A short pull is a short lever: the same twitch of the fingertip turns the angle much further. So
 * short pulls only move the angle part of the way toward the finger, in proportion to the pull, and
 * a long pull follows the finger exactly.
 */
function aimAt(anchor: Point, p: Point, previous: AimData | null): AimData | null {
  const dx = anchor.x - p.x;
  const dy = anchor.y - p.y;
  const pull = Math.hypot(dx, dy);
  if (pull < DEAD_ZONE_UNITS) return null;

  const raw = Math.atan2(dy, dx);
  const weight = pull >= ANGLE_FULL_TRUST_UNITS ? 1 : Math.max(MIN_ANGLE_WEIGHT, pull / ANGLE_FULL_TRUST_UNITS);
  const angle = previous ? wrap(previous.angle + wrap(raw - previous.angle) * weight) : raw;

  return { angle, power: Math.min(1, pull / MAX_PULL_UNITS), dx, dy };
}

export function startGesture(pointerId: number, anchor: Point, t: number): AimGesture {
  return { pointerId, anchor, samples: [{ t, aim: null }] };
}

/** Folds one movement into the gesture. Movement from any other finger is ignored. */
export function moveGesture(gesture: AimGesture, pointerId: number, p: Point, t: number): AimGesture {
  if (pointerId !== gesture.pointerId) return gesture;

  const previous = currentAim(gesture);
  const samples = [...gesture.samples, { t, aim: aimAt(gesture.anchor, p, previous) }].filter(
    (sample) => sample.t >= t - SAMPLE_WINDOW_MS,
  );
  return { ...gesture, samples };
}

/** The aim to show right now. */
export function currentAim(gesture: AimGesture): AimData | null {
  return gesture.samples[gesture.samples.length - 1]?.aim ?? null;
}

/**
 * The shot to fire when the finger lifts at time `t`, or null for no shot.
 *
 * Pulling back to the start cancels, whatever happened a moment earlier. Otherwise the shot is the aim
 * held `RELEASE_LOOKBACK_MS` before the lift, so the fingertip rolling off the glass cannot turn it. A
 * gesture too short to have that history fires its latest aim.
 */
export function releaseAim(gesture: AimGesture, t: number): AimData | null {
  const latest = currentAim(gesture);
  if (!latest) return null;

  const cutoff = t - RELEASE_LOOKBACK_MS;
  const held = [...gesture.samples].reverse().find((sample) => sample.t <= cutoff);
  return held?.aim ?? latest;
}
