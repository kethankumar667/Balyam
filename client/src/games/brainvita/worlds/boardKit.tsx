import type { ReactNode } from "react";
import { HOLE_COUNT, cellOf } from "../brainvitaRules";
import { ARM_START, GRID_UNITS, crossOutlinePath, grooveInset } from "../brainvitaTheme";

/**
 * What the worlds' board drawings have in common: the square they are drawn in (the holes are one unit
 * apart and the rim of the board lies outside them), where every hole is, and the four spots along the
 * rim where a world puts its ornament. Each world draws its own material on top of this.
 */

export interface HoleCentre {
  hole: number;
  cx: number;
  cy: number;
}

export const HOLE_CENTRES: readonly HoleCentre[] = Array.from({ length: HOLE_COUNT }, (_, hole) => {
  const { row, col } = cellOf(hole);
  return { hole, cx: col + 0.5, cy: row + 0.5 };
});

export interface Ornament {
  x: number;
  y: number;
  flipX: 1 | -1;
  flipY: 1 | -1;
  key: string;
}

/** The four places along the rim (one in each notch) that a world's ornament is drawn, with how to mirror it. */
export function ornamentSpots(frame: number): Ornament[] {
  const strip = ARM_START - frame / 2;
  const shoulder = (ARM_START - frame) / 2 + 0.05;
  return [
    { x: shoulder, y: strip, flipX: 1, flipY: 1, key: "tl" },
    { x: GRID_UNITS - shoulder, y: strip, flipX: -1, flipY: 1, key: "tr" },
    { x: shoulder, y: GRID_UNITS - strip, flipX: 1, flipY: -1, key: "bl" },
    { x: GRID_UNITS - shoulder, y: GRID_UNITS - strip, flipX: -1, flipY: -1, key: "br" },
  ];
}

export interface BoardOutline {
  span: number;
  outer: string;
  groove: string;
}

export function boardOutline(frame: number): BoardOutline {
  return { span: GRID_UNITS + 2 * frame, outer: crossOutlinePath(frame), groove: crossOutlinePath(frame, grooveInset(frame)) };
}

export interface BoardSvgProps {
  frame: number;
  /** A CSS drop-shadow for the whole board, so it sits on the table. */
  shadow: string;
  children: ReactNode;
}

/** The transparent square every world draws its board in. Never takes a tap. */
export function BoardSvg({ frame, shadow, children }: BoardSvgProps) {
  const { span } = boardOutline(frame);
  return (
    <svg
      aria-hidden
      viewBox={`${-frame} ${-frame} ${span} ${span}`}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      style={{ filter: shadow }}
    >
      {children}
    </svg>
  );
}

/** A deterministic scatter of points in a unit square, so a speckled material looks the same on every render. */
export function scatter(count: number, seed: number): { x: number; y: number; r: number }[] {
  let state = seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Array.from({ length: count }, () => ({ x: next(), y: next(), r: next() }));
}
