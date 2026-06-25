import type { Pt } from "./types";

/**
 * Leaf helpers shared by the per-N board files — pure trig / colour / a crown
 * glyph. This is NOT a board generator: every board still owns its own
 * geometry constants, loop assembly and SVG. These are the same kind of
 * primitive `Token` already is.
 */

export const CENTER = 50;
export const rad = (d: number): number => (d * Math.PI) / 180;

/** Point at polar (radius `r`, axis angle `aDeg` clockwise from up) + tangential `s`. */
export function P(r: number, aDeg: number, s = 0): Pt {
  const a = rad(aDeg);
  return {
    x: CENTER + r * Math.sin(a) + s * Math.cos(a),
    y: CENTER - r * Math.cos(a) + s * Math.sin(a),
  };
}

export const fmt = (p: Pt): string => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
export const scale = (p: Pt, k: number): Pt => ({ x: CENTER + (p.x - CENTER) * k, y: CENTER + (p.y - CENTER) * k });

export const lighten = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const L = (c: number) => Math.round(c + (255 - c) * amt);
  return `#${((1 << 24) + (L(r) << 16) + (L(g) << 8) + L(b)).toString(16).slice(1)}`;
};

/** Orientation (deg, 0 = up) of a point about the board centre — rotates a tile radially. */
export const angleOf = (p: Pt): number => (Math.atan2(p.x - 50, -(p.y - 50)) * 180) / Math.PI;

export function Crown({ x, y, s, fill, opacity = 1 }: { x: number; y: number; s: number; fill: string; opacity?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-3 2 L-3 -0.6 L-1.5 0.5 L0 -2.2 L1.5 0.5 L3 -0.6 L3 2 Z"
      fill={fill}
      opacity={opacity}
    />
  );
}
