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
  homeSlots: Record<LudoColor, Pt[]>;
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

export function buildPolygonGeometry(N: number, _activeColors: LudoColor[]): PolygonBoardGeometry {
  if (N < 2 || N > 8) throw new Error(`Polygon Ludo supports 2..8 players, got ${N}`);

  const W = 360 / N;            // angular width of one wedge
  const TOTAL = 13 * N;         // track cells around the ring
  const DELTA = 360 / TOTAL;    // angular step between adjacent track cells

  // Polar point: angle in degrees (0 = up, +clockwise), radius from center.
  const polar = (angleDeg: number, radius: number): Pt => {
    const t = deg2rad(angleDeg);
    return { x: CENTER + radius * Math.sin(t), y: CENTER - radius * Math.cos(t) };
  };

  // --- Radial budget (center 50 → board edge ~47) -----------------------
  const R_HOME = 11;                  // central N-wedge home radius
  const R_TRACK = 28.5;               // the continuous track ring sits here
  const R_POD_IN = R_TRACK + 2.5;     // protruding yard pods start just outside…
  const R_POD_OUT = R_OUTER - 1.5;    // …and stop just inside the board edge
  const CELL = R_TRACK * deg2rad(DELTA) * 1.02; // square side that tiles the ring

  const trackCells: Pt[] = new Array(TOTAL);
  const stretchCells: Record<string, Pt[]> = {};
  const yardSlots: Record<string, Pt[]> = {};
  const yardPolygons: Record<string, string> = {};
  const centerTriangles: Record<string, string> = {};
  const homeSlots: Record<string, Pt[]> = {};
  const safeSquares = new Set<number>();
  const colorStarts: Record<string, number> = {};
  const wedgeAngle: Record<string, number> = {};
  const nameAnchor: Record<string, Pt> = {};

  // Polygon vertices sit at wedge boundaries; vertex j is between wedge j/j+1.
  const outerVertices: Pt[] = [];
  for (let i = 0; i < N; i++) outerVertices.push(polar((i + 0.5) * W, R_OUTER));

  // Track ring: cell k centered at (k − 6)·DELTA so wedge i's 13 cells
  // (i·13 … i·13+12) sit symmetrically about its axis θ_i = i·W — cell i·13
  // (the start) just left of the pod, cell i·13+12 just right of it.
  for (let k = 0; k < TOTAL; k++) trackCells[k] = polar((k - 6) * DELTA, R_TRACK);

  // Home-run spoke marches inward along the wedge axis from just inside the
  // track ring to the rim of the central home.
  const R_STRETCH_OUT = R_TRACK - CELL * 1.15;
  const R_STRETCH_IN = R_HOME + CELL * 0.55;
  const STRETCH_STEP = (R_STRETCH_OUT - R_STRETCH_IN) / 5;

  for (let i = 0; i < N; i++) {
    const theta = i * W;
    const color = PLAYER_COLORS_ORDER[i];
    const base = i * 13;
    colorStarts[color] = base;
    wedgeAngle[color] = theta;
    safeSquares.add(base);
    safeSquares.add((base + 8) % TOTAL);

    // Home stretch — centered under the pod, on the wedge axis.
    const stretch: Pt[] = [];
    for (let j = 0; j < 6; j++) stretch.push(polar(theta, R_STRETCH_OUT - j * STRETCH_STEP));
    stretchCells[color] = stretch;

    // Yard pod — a protruding rounded base on the axis at the rim, holding
    // 4 token sockets in a 2×2.
    const podHalf = W * 0.42;
    const tipBulge = (R_POD_OUT - R_POD_IN) * 0.16;
    yardPolygons[color] = [
      polar(theta - podHalf, R_POD_IN),
      polar(theta - podHalf * 0.72, R_POD_OUT),
      polar(theta, R_POD_OUT + tipBulge),
      polar(theta + podHalf * 0.72, R_POD_OUT),
      polar(theta + podHalf, R_POD_IN),
    ]
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    const slotDA = podHalf * 0.42;
    const rNear = R_POD_IN + (R_POD_OUT - R_POD_IN) * 0.30;
    const rFar = R_POD_IN + (R_POD_OUT - R_POD_IN) * 0.70;
    yardSlots[color] = [
      polar(theta - slotDA, rFar),
      polar(theta + slotDA, rFar),
      polar(theta - slotDA, rNear),
      polar(theta + slotDA, rNear),
    ];
    nameAnchor[color] = polar(theta, R_POD_IN + (R_POD_OUT - R_POD_IN) * 0.5);

    // Central home wedge + 4 rest slots, kept clear of the hub medallion.
    const hL = polar(theta - W / 2, R_HOME);
    const hR = polar(theta + W / 2, R_HOME);
    centerTriangles[color] = [{ x: CENTER, y: CENTER }, hL, hR]
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");
    const hDA = (W / 2) * 0.42;
    homeSlots[color] = [
      polar(theta - hDA, R_HOME * 0.8),
      polar(theta + hDA, R_HOME * 0.8),
      polar(theta - hDA, R_HOME * 0.52),
      polar(theta + hDA, R_HOME * 0.52),
    ];
  }

  return {
    N,
    trackCells,
    stretchCells: stretchCells as Record<LudoColor, Pt[]>,
    yardSlots: yardSlots as Record<LudoColor, Pt[]>,
    yardPolygons: yardPolygons as Record<LudoColor, string>,
    outerVertices,
    centerTriangles: centerTriangles as Record<LudoColor, string>,
    homeSlots: homeSlots as Record<LudoColor, Pt[]>,
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
