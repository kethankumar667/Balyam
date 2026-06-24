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

  // --- Authentic N-player Ludo as a gap-free "ring" board ----------------
  // Outer colored yard sectors → one continuous tiled track ring → colored
  // home-run cells per player → a central N-wedge home. Everything is placed
  // on a polar grid so cells tile with NO gaps for any N (5..8). The index
  // contract the engine depends on is preserved exactly:
  //   colorStarts[i] = i*13 ; home-stretch entry = i*13+12 ; safe = i*13, i*13+8
  const W = 360 / N;                 // angular width of one player's wedge
  const TOTAL = 13 * N;              // track cells around the ring
  const DELTA = 360 / TOTAL;         // angular step between track cells
  const apothem = R_OUTER * Math.cos(deg2rad(W / 2));

  // Polar point: angle in degrees, 0 = straight up (12 o'clock), +clockwise.
  const polar = (angleDeg: number, radius: number): Pt => {
    const t = deg2rad(angleDeg);
    return { x: CENTER + radius * Math.sin(t), y: CENTER - radius * Math.cos(t) };
  };

  // Solve the track radius so a square cell (tangential ≈ radial) tiles the
  // ring AND leaves ~1.6 cells of yard depth outside it along the apothem.
  const k = (2 * Math.PI) / TOTAL;        // radians per cell around the ring
  const R_TRACK = apothem / (1 + 1.6 * k);
  const CELL = R_TRACK * k;               // cell side length (tiles the ring)
  const R_HOME = Math.max(9, R_TRACK - 8 * CELL); // central home radius

  const trackCells: Pt[] = new Array(TOTAL);
  const stretchCells: Record<string, Pt[]> = {};
  const yardSlots: Record<string, Pt[]> = {};
  const yardPolygons: Record<string, string> = {};
  const centerTriangles: Record<string, string> = {};
  const safeSquares = new Set<number>();
  const colorStarts: Record<string, number> = {};
  const wedgeAngle: Record<string, number> = {};
  const nameAnchor: Record<string, Pt> = {};

  // Polygon vertices sit at the wedge BOUNDARIES (each wedge centered on a
  // side midpoint), so vertex j is between wedge j and wedge j+1.
  const outerVertices: Pt[] = [];
  for (let i = 0; i < N; i++) outerVertices.push(polar((i + 0.5) * W, R_OUTER));

  // Track ring: cell k centered at angle (k - 6)*DELTA, so for wedge i the 13
  // cells (i*13 .. i*13+12) are symmetric about the wedge axis θ_i = i*W:
  // j=0 (start) at θ_i-6Δ, j=6 at the axis, j=12 (home entry) at θ_i+6Δ.
  for (let k2 = 0; k2 < TOTAL; k2++) {
    trackCells[k2] = polar((k2 - 6) * DELTA, R_TRACK);
  }

  const R_YARD_IN = R_TRACK + CELL * 0.95;       // inner edge of the yard band
  const R_STRETCH_OUT = R_TRACK - CELL;          // first home-run cell (near track)
  const R_STRETCH_IN = R_HOME + CELL * 0.6;       // last home-run cell (near home)
  const STRETCH_STEP = (R_STRETCH_OUT - R_STRETCH_IN) / 5;

  for (let i = 0; i < N; i++) {
    const theta = i * W;
    const color = PLAYER_COLORS_ORDER[i];
    colorStarts[color] = i * 13;
    wedgeAngle[color] = theta;
    safeSquares.add(i * 13);
    safeSquares.add((i * 13 + 8) % TOTAL);

    // Home run: 6 colored cells along the home-entry ray (θ_i + 6Δ), marching
    // inward from just inside the track to the rim of the central home.
    const entryAngle = theta + 6 * DELTA;
    const stretch: Pt[] = [];
    for (let j = 0; j < 6; j++) {
      stretch.push(polar(entryAngle, R_STRETCH_OUT - j * STRETCH_STEP));
    }
    stretchCells[color] = stretch;

    // Yard: the colored outer sector of this wedge (between the two polygon
    // vertices and an inner arc), filled with 4 token slots in a 2×2.
    const vL = outerVertices[(i - 1 + N) % N];
    const vR = outerVertices[i];
    const innerL = polar(theta - W * 0.42, R_YARD_IN);
    const innerR = polar(theta + W * 0.42, R_YARD_IN);
    yardPolygons[color] = [vL, vR, innerR, innerL]
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    const yardR0 = R_YARD_IN + (R_OUTER - R_YARD_IN) * 0.30;
    const yardR1 = R_YARD_IN + (R_OUTER - R_YARD_IN) * 0.62;
    const yardDA = Math.min(W * 0.2, 14);
    yardSlots[color] = [
      polar(theta - yardDA, yardR0),
      polar(theta + yardDA, yardR0),
      polar(theta - yardDA, yardR1),
      polar(theta + yardDA, yardR1),
    ];
    nameAnchor[color] = polar(theta, (yardR0 + yardR1) / 2);

    // Central home wedge for this color (slice of the inner N-gon).
    const hL = polar(theta - W / 2, R_HOME);
    const hR = polar(theta + W / 2, R_HOME);
    centerTriangles[color] = [{ x: CENTER, y: CENTER }, hL, hR]
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
