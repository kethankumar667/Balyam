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
 *  re-checking that product (N=5's widest per-arm angle is the tight case).
 *
 *  Raised 40 → 41.6 (2026-07-27): the drawn board only covered 91-96% of its
 *  own square, so on a portrait phone — where the board is WIDTH-bound and
 *  every pixel counts — up to 9% of the playing surface was blank margin
 *  inside the card. The binding constraint is `R_OUT_TARGET * BORDER_OUT`
 *  (1.19) ≤ 50, i.e. a hard ceiling of 42.0; 41.6 gives 49.5, keeping a small
 *  margin for the rim stroke. */
const R_OUT_TARGET = 41.6;

/**
 * Flat seat palette, indexed to match `PLAYER_COLORS_ORDER` (board-layout.ts:
 * red, green, yellow, blue, purple, cyan, orange, brown) so a color a player
 * PICKS in the lobby (LudoColorPicker.tsx) is the color they actually SEE
 * rendered — this must stay name-accurate, not just visually distinct.
 *
 * User-supplied palette (2026-07-26) — mirrors board-layout.ts COLOR_HEX
 * exactly (same hexes, indexed to PLAYER_COLORS_ORDER) so 4-player cross
 * boards and 5-8 polygon boards render one consistent global palette.
 */
export const SEAT_COLORS = [
  "#D7263D", // red — Crimson
  "#00A86B", // green — Emerald
  "#F4B400", // yellow — Gold
  "#2563EB", // blue — Royal Blue
  "#7B2CBF", // purple — Violet
  "#E11D8A", // cyan — Magenta
  "#F97316", // orange — Orange
  "#A16207", // brown — Bronze
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
/**
 * Yard token width, as a multiple of CELL. SHARED with `polygonTokenSize`
 * (ludo-board-shared.tsx), which sizes the actual rendered piece. The yard
 * slot geometry below erodes the triangle by half this value, so if the two
 * ever disagree the tokens go straight back to overhanging their walls —
 * hence one exported constant rather than a literal in each file.
 */
export const YARD_TOKEN_W = 1.0;

const fmt = (p: Pt): string => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Shrink a triangle inward by `d` on every side — the safe region for the
 * CENTRE of a disc of radius `d`. A triangle offset inward by a uniform
 * distance is just the original scaled about its INCENTRE (not its centroid:
 * scaling about the centroid moves the three edges by different amounts on a
 * non-equilateral triangle, which is exactly the case here — yard triangles
 * are wide-and-short at N=5 and narrow-and-tall at N=8).
 */
function erodeTriangle(t: readonly [Pt, Pt, Pt], d: number): [Pt, Pt, Pt] {
  const [A, B, C] = t;
  const a = dist(B, C);
  const b = dist(C, A);
  const c = dist(A, B);
  const per = a + b + c;
  const inc: Pt = { x: (a * A.x + b * B.x + c * C.x) / per, y: (a * A.y + b * B.y + c * C.y) / per };
  const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  const rIn = area / (per / 2);
  // Clamped: if a token were wider than the triangle's incircle there is no
  // valid region at all, and we'd rather collapse to the incentre than emit
  // inverted geometry.
  const k = Math.max(0.04, (rIn - d) / rIn);
  const s = (p: Pt): Pt => ({ x: inc.x + (p.x - inc.x) * k, y: inc.y + (p.y - inc.y) * k });
  return [s(A), s(B), s(C)];
}

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

    // Yard token slots — a 2+2 cluster laid out in BARYCENTRIC coordinates of
    // the yard triangle, after eroding that triangle by the token's own
    // radius.
    //
    // Every previous attempt here placed token CENTRES using the raw triangle
    // (polar rows, then a 2x2 grid, then a 2-1-1 pyramid) and never accounted
    // for the token having width. Measured result: all 5/6/7/8 yards on every
    // board had tokens overhanging their walls — clearance 0.3-1.0 where half
    // a token width (1.9-2.2) was needed — and at N=5 a centre sat OUTSIDE the
    // triangle entirely. They were simultaneously spread 2.2 token-widths
    // apart, i.e. the cluster was far too big for the space.
    //
    // Eroding first makes "inside the walls" structural rather than tuned:
    // any centre placed in the eroded triangle is provably clear by `margin`,
    // at any N, with no per-N constants. Barycentric rows then taper with the
    // triangle automatically — the upper row is narrower because the triangle
    // is, which is what makes wide-short (N=5) and narrow-tall (N=8) yards
    // both look deliberate.
    const tokenR = (CELL * YARD_TOKEN_W) / 2;
    const [eTip, eL, eR] = erodeTriangle([insTip, insL, insR], tokenR + CELL * 0.1);
    /** `up` = 0 at the base edge, 1 at the tip; `f` = 0..1 across that row. */
    const inYard = (up: number, f: number): Pt => {
      const w = 1 - up;
      return {
        x: up * eTip.x + w * ((1 - f) * eL.x + f * eR.x),
        y: up * eTip.y + w * ((1 - f) * eL.y + f * eR.y),
      };
    };
    // DIAMOND (1-2-1), not two rows of two. A row's width tapers with the
    // triangle, so any side-by-side pair placed high up is squeezed: at N=8 a
    // row 62% of the way to the tip is only ~1.15 token widths across, which
    // forced the pair to 0.69 widths apart — overlapping each other even
    // though both were safely inside the walls. The diamond puts its only
    // side-by-side pair at 40%, where the triangle is still wide, and keeps
    // the two singles on the centre line. Measured worst-case separation is
    // then ~1.4 token widths at EVERY N (5-8), rather than 0.69-1.08.
    yardSlots[color] = [
      inYard(0.06, 0.5),
      inYard(0.4, 0.1),
      inYard(0.4, 0.9),
      inYard(0.78, 0.5),
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
