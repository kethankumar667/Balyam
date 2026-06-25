import type { LudoColor } from "@shared/types";

/**
 * Shared *data* contract for the hand-built per-N Ludo boards (5/6/7/8).
 *
 * This is deliberately NOT a board generator — each board file owns its own
 * geometry math and SVG so it can be tuned pixel-by-pixel against its own
 * reference render. The only thing they share is this shape, because the
 * engine ↔ board token contract has to be identical everywhere:
 *
 *   - `trackCells[p]`            → centre of loop cell `p` (0 .. 13·N-1)
 *   - `stretchCells[color][s]`   → home-run cell `s` (0 = just entered .. 5 = home)
 *   - `yardSlots[color][i]`      → the 4 resting wells inside a pod
 *   - `homeSlots[color][i]`      → where finished tokens park near centre
 *   - `colorStarts[color]`       → track index a colour enters on (= 13·idx)
 *   - `safeSquares`              → loop indices that show a star (13·i, 13·i+8)
 *
 * `cellSize` drives token sizing. Everything is in a 0..100 SVG viewBox,
 * centre (50,50).
 */
export interface Pt {
  x: number;
  y: number;
}

/** One player's slice of the board — all the render-time pieces for a wedge. */
export interface BoardWedge {
  color: LudoColor;
  /** Outer hexagonal "pod" (home yard) polygon points. */
  podPoly: string;
  /** Slightly inset inner pod outline for the bevel. */
  podInner: string;
  /** Centre of the pod (crown emblem + name pill anchor). */
  podCenter: Pt;
  /** Name pill anchor (usually podCenter nudged toward the rim). */
  nameAnchor: Pt;
  /** This colour's slice of the centre medallion. */
  centerPoly: string;
  /** Direction chevron at the mouth of the home column. */
  arrow: { at: Pt; angle: number };
}

export interface LudoBoard {
  N: number;
  cellSize: number;
  colors: LudoColor[];
  trackCells: Pt[];
  stretchCells: Record<LudoColor, Pt[]>;
  yardSlots: Record<LudoColor, Pt[]>;
  homeSlots: Record<LudoColor, Pt[]>;
  colorStarts: Record<LudoColor, number>;
  safeSquares: Set<number>;
  /** Gold rim polygon (outer). */
  framePoly: string;
  /** Warm board surface polygon (inner). */
  boardPoly: string;
  wedges: BoardWedge[];
  /** Navy centre badge polygon. */
  centerBadge: string;
}
