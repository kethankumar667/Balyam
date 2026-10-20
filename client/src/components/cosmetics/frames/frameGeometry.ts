import type { CSSProperties } from "react";

/** What every frame design receives: an id prefix that keeps its gradients and filters apart from the next avatar's. */
export interface FrameProps {
  uid: string;
}

/** Duration and start offset, in seconds, for one moving piece (the CSS reads them as --af-d and --af-delay). */
export const timing = (duration: number, delay = 0): CSSProperties =>
  ({ "--af-d": `${duration}s`, "--af-delay": `${delay}s` }) as CSSProperties;

/**
 * The shared geometry of the avatar frames.
 *
 * Every frame is drawn on a 100 x 100 canvas whose middle is the avatar. The overlay is laid over the avatar
 * 12% larger on every side (see `AvatarFrameOverlay`), which puts the edge of the avatar's circle at a radius of
 * about 40 on this canvas, so a frame lives between a radius of 41 and 50 and may reach past it, because the
 * overlay does not clip.
 */

export const CENTER = 50;
/** Radius of the avatar's own circle on the frame canvas. */
export const AVATAR_RADIUS = 40;

const ROUNDING = 100;

/** A coordinate trimmed to two decimals, so a generated path stays short enough to read in the DOM. */
export const num = (value: number): number => Math.round(value * ROUNDING) / ROUNDING;

/** A point `radius` from (cx, cy) at `angle` degrees, counted clockwise from straight up. */
export function polarAt(cx: number, cy: number, angle: number, radius: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [num(cx + radius * Math.cos(radians)), num(cy + radius * Math.sin(radians))];
}

/** A point on the ring around the avatar. */
export const polar = (angle: number, radius: number): [number, number] => polarAt(CENTER, CENTER, angle, radius);

const DEFAULT_STEPS = 96;

/** A closed ring whose radius swells and dips `lobes` times: a wave, a flame edge. */
export function wavyRingPath(radius: number, amplitude: number, lobes: number, phase = 0, steps = DEFAULT_STEPS): string {
  const points: string[] = [];
  for (let step = 0; step < steps; step++) {
    const angle = (step / steps) * 360;
    const swell = Math.sin(((angle * lobes + phase) * Math.PI) / 180);
    const [x, y] = polar(angle, radius + amplitude * swell);
    points.push(`${x} ${y}`);
  }
  return `M${points.join(" L")} Z`;
}

/** The ring between two radii as one filled path, for use with `fillRule="evenodd"`. */
export function bandOutline(outer: string, innerRadius: number): string {
  const left = CENTER - innerRadius;
  return `${outer} M${left} ${CENTER} a${innerRadius} ${innerRadius} 0 1 0 ${innerRadius * 2} 0 a${innerRadius} ${innerRadius} 0 1 0 ${-innerRadius * 2} 0 Z`;
}

/** A star with `points` tips. */
export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5, rotation = 0): string {
  const corners: string[] = [];
  for (let index = 0; index < points * 2; index++) {
    const [x, y] = polarAt(cx, cy, rotation + (index * 180) / points, index % 2 === 0 ? outer : inner);
    corners.push(`${x} ${y}`);
  }
  return `M${corners.join(" L")} Z`;
}

/** A toothed wheel: `teeth` flat-topped teeth between an inner and an outer radius. */
export function gearPath(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const step = 360 / teeth;
  const corners: string[] = [];
  for (let tooth = 0; tooth < teeth; tooth++) {
    const base = tooth * step;
    for (const [offset, radius] of [[-0.3, inner], [-0.17, outer], [0.17, outer], [0.3, inner]] as const) {
      const [x, y] = polarAt(cx, cy, base + offset * step, radius);
      corners.push(`${x} ${y}`);
    }
  }
  return `M${corners.join(" L")} Z`;
}

/** An arc of the ring from one angle to another, clockwise. */
export function arcPath(radius: number, from: number, to: number): string {
  const [x1, y1] = polar(from, radius);
  const [x2, y2] = polar(to, radius);
  const largeArc = (to - from + 360) % 360 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/** The angles of `count` evenly spaced items, starting at `start`. */
export const spread = (count: number, start = 0): number[] => Array.from({ length: count }, (_, index) => start + (index * 360) / count);

/** Circumference of a ring, for dash patterns that must close on themselves. */
export const circumference = (radius: number): number => 2 * Math.PI * radius;
