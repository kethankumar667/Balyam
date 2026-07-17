import type { LudoColor } from "@shared/types";
import { PLAYER_COLORS_ORDER } from "./board-layout";
import type { PolygonBoardGeometry, Pt } from "./polygon-board";

/**
 * N-player (5..8) "print" Ludo boards — the classic flat printed design the
 * 8-player octagon was matched against, generalized to any arm count:
 * N three-column arms radiating from a central N-slice polygon, a compact
 * turn cell at each arm tip, triangular yards (thick colored outline,
 * 4 wells) filling the sectors between arms, a colored entry-arrow cell at
 * the outer end of each arm's middle column, and colored safe-stars.
 *
 * Everything is derived from N:
 *   - The central polygon's edge hosts one arm's 3 columns exactly, so its
 *     circumradius is R_C = 1.5·CELL / sin(π/N).
 *   - Adjacent arms' side edges (each 1.5·CELL off its axis) converge at
 *     exactly that same radius, so every yard triangle's tip IS a central
 *     polygon vertex — the same construction at any N.
 *   - CELL is solved from a fixed outer radius so each board fills the
 *     viewBox: fewer players → wider sectors AND bigger cells.
 *
 * Engine compatibility (server/src/games/ludo/track.ts):
 *   - loop = 13·N cells, color i starts at engine index 13·i and diverts
 *     into its 6-cell stretch after 13·i − 1.
 *   - Engine index k maps to physical slot (k + 8) mod 13·N, where each
 *     arm's 13 physical slots run: out-column inner→outer (6), tip banner
 *     (1), in-column outer→inner (6). The +8 phase is arm-count independent
 *     and puts:
 *       · the start cell (13·i) on arm i's in-column ROW 4 (2nd from the
 *         tip, beside color i's yard) — drawn as a solid seat-colored cell
 *         with a star, classic Ludo style;
 *       · the divert point (13·i − 1) on the in-column's outermost cell,
 *         from which a finishing token sidesteps into the lane's arrow
 *         cell (stretch[0]) — also classic;
 *       · the mid safe (13·i + 8) on the next arm's out-column row 3.
 *
 * Fulfils the PolygonBoardGeometry contract, so tokens, hover previews,
 * step animation and cursors all work unchanged. The `art` payload carries
 * the print-design elements PrintBoardSVG draws.
 */

/** The tip cell's own outer edge — and now also the yard/border rim (see
 *  R_RIM below) — lands on this radius (viewBox 0..100), leaving room
 *  outside for the colored border band + label the reference design
 *  carries. Solved so `R_OUT_TARGET * BORDER_OUT` (PrintBoardSVG.tsx) stays
 *  safely inside the 0..100 viewBox at every N — do not raise this without
 *  re-checking that product (N=5's widest per-arm angle is the tight case). */
const R_OUT_TARGET = 40;

/**
 * Flat seat palette, indexed to match `PLAYER_COLORS_ORDER` (board-layout.ts:
 * red, green, yellow, blue, purple, cyan, orange, brown) so a color a player
 * PICKS in the lobby (LudoColorPicker.tsx) is the color they actually SEE
 * rendered — this must stay name-accurate, not just visually distinct.
 *
 * User-supplied palette (2026-07-17), replacing the earlier reference-match
 * set. Two entries needed clarification before applying: the given Magenta
 * hex was an exact duplicate of Ruby Red's, and the given "Lime Green" hex
 * (#90e0ef) is actually a pale sky-blue, not lime green — the user confirmed
 * a corrected magenta (#D6249F) for Purple and the pale-blue hex for Cyan
 * (matching each hex's natural hue family; both ambiguously-labeled entries
 * left Purple/Cyan as the only unclaimed seats among the 8).
 */
export const SEAT_COLORS = [
  "#D90429", // red — Ruby Red
  "#2a9d8f", // green — Emerald Green
  "#ffb703", // yellow — Golden Yellow
  "#00b4d8", // blue — Cobalt Blue
  "#D6249F", // purple — Magenta (corrected; given hex duplicated Red)
  "#90e0ef", // cyan — "Lime Green" as given (reads as pale sky-blue)
  "#fb8500", // orange — Vivid Orange
  "#6f4e37", // brown — Chocolate Brown
] as const;

export function seatColor(i: number): string {
  return SEAT_COLORS[((i % SEAT_COLORS.length) + SEAT_COLORS.length) % SEAT_COLORS.length];
}

/** Darkened variant of a seat color (flat shading for token bases/edges). */
export function seatColorDark(i: number): string {
  const n = parseInt(seatColor(i).slice(1), 16);
  const d = (c: number) => Math.round(c * 0.68);
  const r = d((n >> 16) & 255);
  const g = d((n >> 8) & 255);
  const b = d(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const rad = (d: number): number => (d * Math.PI) / 180;
/** Point at polar (radius r, axis aDeg clockwise from up) + tangential s (+ = clockwise). */
function P(r: number, aDeg: number, s = 0): Pt {
  const a = rad(aDeg);
  return {
    x: 50 + r * Math.sin(a) + s * Math.cos(a),
    y: 50 - r * Math.cos(a) + s * Math.sin(a),
  };
}
const fmt = (p: Pt): string => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

export interface PrintBoardArt {
  /** All plain white loop cells (tip caps excluded): position + arm angle. */
  whiteCells: { pt: Pt; angle: number }[];
  /** The N tip cells (these ARE loop cells — the turn cell). */
  caps: { pt: Pt; angle: number }[];
  /** Middle-column cells (stretch 1..5; stretch 0 is the arrow cell). */
  stretchWhite: { color: LudoColor; pt: Pt; angle: number }[];
  /** Colored entry-arrow cell at each stretch entrance (stretch[0]). */
  arrows: { color: LudoColor; pt: Pt; angle: number }[];
  /** Start cells (13·i): solid seat-colored cell + star, one per arm. */
  starts: { color: LudoColor; pt: Pt; angle: number }[];
  /** One small directional arrow per arm (cosmetic wayfinding, not tied to
   *  a specific engine index) showing the clockwise travel direction. */
  routeArrows: { color: LudoColor; pt: Pt; angle: number }[];
  /** Mid safe cells (13·i + 8): thin outlined print-style stars. */
  stars: { color: LudoColor; pt: Pt; style: "outline" | "fill" }[];
  /** Yard triangles: thick colored outline, white fill, 4 wells inside. */
  yards: { color: LudoColor; tri: string; wells: Pt[]; bisector: number }[];
  /** Central polygon slices, one per color, fed by that color's stretch. */
  slices: { color: LudoColor; points: string }[];
  /** Thin black rim segments along each yard base (the board's outer edge). */
  rimSegments: { a: Pt; b: Pt }[];
}

export type PrintBoardGeometry = PolygonBoardGeometry & { art: PrintBoardArt };

function build(
  N: number,
  opts?: {
    outerTarget?: number;
    triInset?: number;
    nameOffset?: number;
  },
): PrintBoardGeometry {
  const outerTarget = opts?.outerTarget ?? R_OUT_TARGET;
  const triInsetMul = opts?.triInset ?? 0.86;
  const nameOffset = opts?.nameOffset ?? 1.35;

  const W = 360 / N;
  const HALF_W = W / 2;
  const TOTAL = 13 * N;
  const colors = PLAYER_COLORS_ORDER.slice(0, N);

  // Solve CELL so the tip cell's own outer edge lands on outerTarget:
  //   apothem A_C = 1.5·CELL/tan(π/N); outermost = A_C + 7·CELL.
  const CELL = outerTarget / (1.5 / Math.tan(rad(HALF_W)) + 7);
  const R_C = (1.5 * CELL) / Math.sin(rad(HALF_W)); // central polygon circumradius
  const A_C = R_C * Math.cos(rad(HALF_W)); // apothem — arm rows start here
  // Yard/rim corners sit at the TIP cell's true outer edge (A_C + 7·CELL,
  // == outerTarget by construction), not at row-5's outer edge (A_C+6·CELL).
  // Using the row-5 radius here previously left the plain tip cell (after
  // the banner was removed) poking out past the drawn board silhouette —
  // a stray white square floating outside the outline at every seam.
  const R_RIM = A_C + 7 * CELL;
  const R_CAP = A_C + 6.5 * CELL; // tip cell's own radial center
  const rowR = (r: number): number => A_C + (r + 0.5) * CELL;

  // ---- physical loop slots (arm-major order) --------------------------
  // Arm i: out-column (counterclockwise side, tangential −CELL) inner→outer,
  // tip cap, in-column (clockwise side, +CELL) outer→inner. Movement over
  // these in order = clockwise around the board, same as every other board.
  const physical: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const a = i * W;
    for (let r = 0; r < 6; r++) physical.push(P(rowR(r), a, -CELL));
    physical.push(P(R_CAP, a));
    for (let r = 5; r >= 0; r--) physical.push(P(rowR(r), a, +CELL));
  }

  // Engine index k → physical slot (k + 8): start (13·i) lands on arm i's
  // in-column row 4, one cell in from the tip — see the header note.
  const trackCells: Pt[] = new Array(TOTAL);
  for (let k = 0; k < TOTAL; k++) trackCells[k] = physical[(k + 8) % TOTAL];

  const stretchCells = {} as Record<LudoColor, Pt[]>;
  const yardSlots = {} as Record<LudoColor, Pt[]>;
  const yardPolygons = {} as Record<LudoColor, string>;
  const centerTriangles = {} as Record<LudoColor, string>;
  const homeSlots = {} as Record<LudoColor, Pt[]>;
  const colorStarts = {} as Record<LudoColor, number>;
  const wedgeAngle = {} as Record<LudoColor, number>;
  const nameAnchor = {} as Record<LudoColor, Pt>;
  const safeSquares = new Set<number>();

  const art: PrintBoardArt = {
    whiteCells: [],
    caps: [],
    stretchWhite: [],
    arrows: [],
    starts: [],
    routeArrows: [],
    stars: [],
    yards: [],
    slices: [],
    rimSegments: [],
  };

  colors.forEach((color, i) => {
    const a = i * W;
    const base = i * 13;
    colorStarts[color] = base;
    wedgeAngle[color] = a;
    safeSquares.add(base);
    safeSquares.add((base + 8) % TOTAL);

    for (let r = 0; r < 6; r++) {
      art.whiteCells.push({ pt: P(rowR(r), a, -CELL), angle: a });
      art.whiteCells.push({ pt: P(rowR(r), a, +CELL), angle: a });
    }
    art.caps.push({ pt: P(R_CAP, a), angle: a });

    stretchCells[color] = Array.from({ length: 6 }, (_, s) => P(rowR(5 - s), a));
    art.arrows.push({ color, pt: P(rowR(5), a), angle: a });
    for (let s = 1; s < 6; s++) {
      art.stretchWhite.push({ color, pt: P(rowR(5 - s), a), angle: a });
    }

    // Safe markers sit on the ACTUAL safe cells (engine: start 13·i and
    // 13·i+8) — marking any other cell would misinform players about where
    // tokens are protected. The start is a solid seat-colored cell with a
    // star (classic Ludo); the mid safe is a thin outlined print star.
    art.starts.push({ color, pt: trackCells[base], angle: a });
    art.stars.push({ color, pt: trackCells[(base + 8) % TOTAL], style: "outline" });

    // Route-direction arrow: one per arm, on the in-column (the side
    // adjacent to this color's own yard — the side a token actually enters
    // on), a couple of cells in from the start cell. Purely a wayfinding
    // cue (not tied to a specific engine index) pointing inward, matching
    // the in-column's real direction of travel (outer → inner).
    art.routeArrows.push({ color, pt: P(rowR(2), a, +CELL), angle: a });

    const b = a + HALF_W;
    const vTip = P(R_C, b);
    const vL = P(R_RIM, a, 1.5 * CELL);
    const vR = P(R_RIM, a + W, -1.5 * CELL);
    const g = { x: (vTip.x + vL.x + vR.x) / 3, y: (vTip.y + vL.y + vR.y) / 3 };
    const inset = (v: Pt): Pt => ({ x: g.x + (v.x - g.x) * triInsetMul, y: g.y + (v.y - g.y) * triInsetMul });
    const insTip = inset(vTip);
    const insL = inset(vL);
    const insR = inset(vR);
    const tri = [insTip, insL, insR].map(fmt).join(" ");
    yardPolygons[color] = tri;

    // Home well grid: sized off the triangle's OWN dimensions (not a fixed
    // CELL-relative constant) so the 4-token cluster actually fills most of
    // the yard, matching the reference — a fixed small cluster left a wide
    // gap of bare triangle around it. The triangle tapers linearly from 0
    // width at the tip to `halfBaseWidth` at the base, so each row's
    // available half-width is derived from that taper directly, keeping
    // wells clear of the walls at any N without hand-tuned per-N constants.
    //
    // Arrangement is 2-1-1 (pyramid), not a 2×2 grid: 2 tokens side by side
    // nearest the base, then 1 centered above them, then 1 more centered
    // above that, tapering up toward the tip.
    //
    // Row-to-row RADIAL gap is a fixed multiple of CELL (the same unit
    // tokens are sized in), not a fraction of the triangle's own radial
    // span — that span's relationship to CELL varies a lot across N (wide,
    // short triangles at low N vs narrow, tall ones at high N), so a fixed
    // fraction (e.g. "28% of the span") produced a real absolute gap wide
    // enough to separate the stacked mid/tip tokens at N=8 but nowhere near
    // wide enough at N=5-7, where they visually merged into one blob.
    // Clamped to the triangle's own radial span so it can never push a row
    // past the tip or base on an unusually short/inset triangle.
    const insBaseMid = { x: (insL.x + insR.x) / 2, y: (insL.y + insR.y) / 2 };
    const insTipR = dist(insTip, { x: 50, y: 50 });
    const insBaseR = dist(insBaseMid, { x: 50, y: 50 });
    const halfBaseWidth = dist(insL, insR) / 2;
    const radialSpan = insBaseR - insTipR;
    const clusterMidR = (insTipR + insBaseR) / 2;
    const rowGap = Math.min(CELL * 2.2, radialSpan * 0.46);
    const rBaseRow = clusterMidR + rowGap;
    const rMid = clusterMidR;
    const rTip = clusterMidR - rowGap;
    const widthAtR = (r: number) => (halfBaseWidth * (r - insTipR)) / radialSpan;
    const sBaseRow = Math.max(CELL * 0.58, widthAtR(rBaseRow) * 0.6);
    yardSlots[color] = [
      P(rBaseRow, b, -sBaseRow),
      P(rBaseRow, b, +sBaseRow),
      P(rMid, b, 0),
      P(rTip, b, 0),
    ];
    art.yards.push({ color, tri, wells: yardSlots[color], bisector: b });

    art.rimSegments.push({ a: vL, b: vR });
    nameAnchor[color] = P(R_RIM + nameOffset, b);

    centerTriangles[color] = [{ x: 50, y: 50 }, P(R_C, a - HALF_W), P(R_C, a + HALF_W)]
      .map(fmt)
      .join(" ");
    art.slices.push({ color, points: centerTriangles[color] });

    const homeS = (r: number): number => 0.45 * Math.tan(rad(HALF_W)) * r;
    const rH1 = 0.7 * R_C;
    const rH2 = 0.46 * R_C;
    homeSlots[color] = [
      P(rH1, a, -homeS(rH1)),
      P(rH1, a, +homeS(rH1)),
      P(rH2, a, -homeS(rH2)),
      P(rH2, a, +homeS(rH2)),
    ];
  });

  return {
    N,
    trackCells,
    stretchCells,
    yardSlots,
    yardPolygons,
    outerVertices: colors.map((_, i) => P(R_CAP + CELL * 0.75, i * W)),
    centerTriangles,
    homeSlots,
    safeSquares,
    colorStarts,
    cellSize: CELL,
    wedgeAngle,
    nameAnchor,
    art,
  };
}

const cache = new Map<number, PrintBoardGeometry>();

/** Print-design board for 5..8 players (clamped), built once per N. */
export function getPrintBoard(n: number): PrintBoardGeometry {
  const N = Math.max(5, Math.min(8, n));
  let geo = cache.get(N);
  if (!geo) {
    geo = N === 8 ? build(N, { triInset: 0.9, nameOffset: 0.35 }) : build(N);
    cache.set(N, geo);
  }
  return geo;
}
