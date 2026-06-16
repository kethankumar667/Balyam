import type { LudoColor } from "@shared/types";
import { PLAYER_COLORS_ORDER } from "./board-layout";

/**
 * Geometry for an N-sided Ludo board (5 ≤ N ≤ 8).
 *
 * Topology:
 *   - The board is a regular N-gon. Each player owns one *side* of the polygon.
 *   - The yard for each player is a trapezoid hugging that side on the outside,
 *     bounded by the two polygon vertices and a shorter inner edge.
 *   - Track cells sit *just inside* the yard. They form a U-shape per wedge:
 *       cells 0-4 : left rail going inward (parallel to the wedge's left boundary)
 *       cells 5-7 : inner connector going across the wedge
 *       cells 8-12: right rail going outward (parallel to the wedge's right boundary)
 *     The path naturally flows into the next wedge at the shared vertex/corner.
 *   - Each player's home stretch is a 6-cell column along the wedge axis,
 *     starting just past the inner connector and ending near the polygon center.
 *
 * Coordinates: SVG viewBox 0..100, center at (50, 50). Player 0 sits at 12 o'clock
 * and players are arranged clockwise. All math is expressed in a "wedge-local"
 * frame whose origin is at the *midpoint of the polygon side* the wedge owns:
 *   - lx = position along the side (+ = clockwise toward next vertex)
 *   - ly = distance inward from the side (+ = toward the polygon center)
 * `sideLocal()` transforms (lx, ly) into absolute viewBox coords.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface PolygonBoardGeometry {
  N: number;
  trackCells: Pt[];
  stretchCells: Record<LudoColor, Pt[]>;
  yardSlots: Record<LudoColor, Pt[]>;
  yardPolygons: Record<LudoColor, string>;
  outerVertices: Pt[];
  centerTriangles: Record<LudoColor, string>;
  safeSquares: Set<number>;
  colorStarts: Record<LudoColor, number>;
  cellSize: number;
  wedgeAngle: Record<LudoColor, number>;
  nameAnchor: Record<LudoColor, Pt>;
}

const VB = 100;
const CENTER = VB / 2;
const R_OUTER = 47;

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

/**
 * Side-local → global. `theta` is the angle of the wedge axis in degrees
 * (0 = up, growing clockwise). The local origin is the polygon-side midpoint
 * (at radius `apothem` from center along the wedge axis). +lx runs along the
 * side in the clockwise direction; +ly runs inward toward the polygon center.
 */
function sideLocal(theta: number, lx: number, ly: number, apothem: number): Pt {
  const t = deg2rad(theta);
  // Side midpoint (origin of local frame): polar(theta, apothem)
  // axis (outward from center to side midpoint): (sin t, -cos t)
  // side direction (clockwise along side): (cos t, sin t)
  // inward (from side toward center): -axis = (-sin t, cos t)
  const sideX = Math.cos(t);
  const sideY = Math.sin(t);
  const inX = -Math.sin(t);
  const inY = Math.cos(t);
  const midX = CENTER + apothem * Math.sin(t);
  const midY = CENTER - apothem * Math.cos(t);
  return {
    x: midX + lx * sideX + ly * inX,
    y: midY + lx * sideY + ly * inY,
  };
}

export function buildPolygonGeometry(N: number, _activeColors: LudoColor[]): PolygonBoardGeometry {
  if (N < 2 || N > 8) throw new Error(`Polygon Ludo supports 2..8 players, got ${N}`);
  const wedgeAngleDeg = 360 / N;
  const alphaDeg = wedgeAngleDeg / 2;
  const alpha = deg2rad(alphaDeg);
  const apothem = R_OUTER * Math.cos(alpha);
  const sideHalf = R_OUTER * Math.sin(alpha); // half polygon-side length

  // -------------------------------------------------------------------------
  // Layout constants (all measured *inward* from the polygon side)
  // -------------------------------------------------------------------------
  // The yard occupies y ∈ [0, yardDepth] outward from where we measure inward.
  // Actually: the YARD lives BETWEEN the polygon side and the track. We use
  // side-local coords where +ly goes inward, so yard ly is small.
  const YARD_LY_OUTER = 0;             // at polygon side
  const YARD_LY_INNER = 9;             // depth of yard band
  // Track band sits just inside the yard.
  const RAIL_LX_INSET = Math.max(2.4, sideHalf * 0.08); // distance from each vertex
  const RAIL_LX = sideHalf - RAIL_LX_INSET; // x-coord of the rails
  const RAIL_LY_OUTER = YARD_LY_INNER + 1.5; // outer end of each rail (near yard)
  const RAIL_STEP = 3.6;               // distance between consecutive rail cells
  const RAIL_LY_INNER = RAIL_LY_OUTER + RAIL_STEP * 4; // inner end after 5 cells
  // Inner connector row (3 cells crossing the bottom of the U)
  const CONNECTOR_LY = RAIL_LY_INNER + 3.0;
  const CONNECTOR_STEP = (RAIL_LX * 2) / 4; // 3 cells across, step between them
  // Stretch: 6 cells on the wedge axis (lx = 0) going deeper toward the center
  const STRETCH_LY_OUTER = CONNECTOR_LY + 3.2;
  const STRETCH_LY_INNER = Math.min(apothem - 3, STRETCH_LY_OUTER + 3.2 * 5);
  const STRETCH_STEP = (STRETCH_LY_INNER - STRETCH_LY_OUTER) / 5;

  const CELL = Math.min(3.0, RAIL_STEP * 0.78);

  const trackCells: Pt[] = new Array(13 * N);
  const stretchCells: Record<string, Pt[]> = {};
  const yardSlots: Record<string, Pt[]> = {};
  const yardPolygons: Record<string, string> = {};
  const centerTriangles: Record<string, string> = {};
  const safeSquares = new Set<number>();
  const colorStarts: Record<string, number> = {};
  const wedgeAngle: Record<string, number> = {};
  const nameAnchor: Record<string, Pt> = {};

  // Polygon vertices (shared between adjacent wedges)
  const outerVertices: Pt[] = [];
  for (let i = 0; i < N; i++) {
    // Vertex i is the RIGHT vertex of wedge i (= left vertex of wedge i+1).
    // In wedge i's local frame the right vertex is at (lx = +sideHalf, ly = 0).
    const theta = i * wedgeAngleDeg;
    outerVertices.push(sideLocal(theta, +sideHalf, 0, apothem));
  }

  for (let i = 0; i < N; i++) {
    const theta = i * wedgeAngleDeg;
    const color = PLAYER_COLORS_ORDER[i];
    colorStarts[color] = i * 13;
    wedgeAngle[color] = theta;
    safeSquares.add(i * 13);
    safeSquares.add((i * 13 + 8) % (13 * N));

    // ---- 13 track cells in a U-shape (left rail down, connector across, right rail up)
    // cells 0..4: LEFT rail going inward (from outer-left at the polygon side to inner-left)
    for (let j = 0; j < 5; j++) {
      const ly = RAIL_LY_OUTER + j * RAIL_STEP;
      trackCells[i * 13 + j] = sideLocal(theta, -RAIL_LX, ly, apothem);
    }
    // cells 5..7: CONNECTOR row across the bottom of the U (left → right)
    for (let j = 0; j < 3; j++) {
      const lx = -RAIL_LX + (j + 1) * CONNECTOR_STEP;
      trackCells[i * 13 + 5 + j] = sideLocal(theta, lx, CONNECTOR_LY, apothem);
    }
    // cells 8..12: RIGHT rail going outward (inner-right back to outer-right)
    for (let j = 0; j < 5; j++) {
      const ly = RAIL_LY_INNER - j * RAIL_STEP;
      trackCells[i * 13 + 8 + j] = sideLocal(theta, +RAIL_LX, ly, apothem);
    }

    // ---- Stretch (6 cells) on the wedge axis, INSIDE the U
    const stretch: Pt[] = [];
    for (let j = 0; j < 6; j++) {
      // stretchPos 0 = entry (closer to track), stretchPos 5 = last cell before home
      const ly = STRETCH_LY_OUTER + j * STRETCH_STEP;
      stretch.push(sideLocal(theta, 0, ly, apothem));
    }
    stretchCells[color] = stretch;

    // ---- Yard polygon (trapezoid hugging the polygon side)
    const vL = outerVertices[(i - 1 + N) % N]; // left vertex of this wedge
    const vR = outerVertices[i];               // right vertex
    const yardInnerLeft = sideLocal(theta, -RAIL_LX - 0.5, YARD_LY_INNER, apothem);
    const yardInnerRight = sideLocal(theta, +RAIL_LX + 0.5, YARD_LY_INNER, apothem);
    yardPolygons[color] = [vL, yardInnerLeft, yardInnerRight, vR]
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    // ---- 4 token slots inside the yard (2 rows x 2 cols)
    const slotLyA = YARD_LY_OUTER + (YARD_LY_INNER - YARD_LY_OUTER) * 0.34;
    const slotLyB = YARD_LY_OUTER + (YARD_LY_INNER - YARD_LY_OUTER) * 0.72;
    // Slot x positions, clamped to stay inside the wedge boundaries.
    const slotLx = Math.min(RAIL_LX * 0.55, sideHalf * 0.42);
    yardSlots[color] = [
      sideLocal(theta, -slotLx, slotLyA, apothem),
      sideLocal(theta, +slotLx, slotLyA, apothem),
      sideLocal(theta, -slotLx, slotLyB, apothem),
      sideLocal(theta, +slotLx, slotLyB, apothem),
    ];

    // Label anchor: along the wedge axis between the two token rows
    nameAnchor[color] = sideLocal(theta, 0, (slotLyA + slotLyB) / 2, apothem);

    // ---- Center home triangle for this color
    const innerR = STRETCH_LY_INNER + STRETCH_STEP * 0.7;
    const capCenter = sideLocal(theta, 0, innerR, apothem);
    const capLeft = sideLocal(theta, -1.6, innerR - 1.6, apothem);
    const capRight = sideLocal(theta, +1.6, innerR - 1.6, apothem);
    centerTriangles[color] = [
      { x: CENTER, y: CENTER },
      capLeft,
      capCenter,
      capRight,
    ]
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");
  }

  return {
    N,
    trackCells,
    stretchCells: stretchCells as Record<LudoColor, Pt[]>,
    yardSlots: yardSlots as Record<LudoColor, Pt[]>,
    yardPolygons: yardPolygons as Record<LudoColor, string>,
    outerVertices,
    centerTriangles: centerTriangles as Record<LudoColor, string>,
    safeSquares,
    colorStarts: colorStarts as Record<LudoColor, number>,
    cellSize: CELL,
    wedgeAngle: wedgeAngle as Record<LudoColor, number>,
    nameAnchor: nameAnchor as Record<LudoColor, Pt>,
  };
}

export function geoToPct(p: Pt): { left: number; top: number } {
  return { left: p.x, top: p.y };
}
