/**
 * Ludo — the flat "print board" visual language, shared by BOTH board
 * renderers.
 *
 * Extracted from PrintBoardSVG.tsx so the classic 2-4 player cross board can
 * be drawn in the same idiom as the 5-8 polygon boards: one ink colour, three
 * stroke weights, white cells, flat seat-coloured sectors, and pure-vector
 * marks (no emoji, which render differently on every OS).
 *
 * Geometry lives in the board modules; this file is finish only.
 */

/** The single stroke colour for the whole board. Not black — a printed board
 *  uses a soft ink that sits back behind the seat colours. */
export const INK = "#444444";

/** Three weights, used consistently: hairline for the cell grid, medium for
 *  anything that carries meaning (lanes, sectors, medallion), heavy for the
 *  outer silhouette. */
export const GRID_STROKE = 0.11;
export const LANE_STROKE = 0.26;
export const RIM_STROKE = 0.5;

/** Paper the cells are printed on. */
export const PRINT_CELL = "#ffffff";

/** Normalise to (-180, 180]. `readable` compares against ±90, so it only
 *  works on an angle already in that range — feeding it a raw sum like
 *  `edgeAngle + boardRotation` (which can reach ±360) made it flip the wrong
 *  way and rendered some arm names upside-down once the board could rotate. */
export function norm180(a: number): number {
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

/** Keep rotated text upright-readable. Expects an angle already in ±180. */
export function readable(a: number): number {
  return a > 90 || a < -90 ? a + 180 : a;
}

/** 5-point star polygon points centered on (0,0), outer radius r. */
export function starPts(r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    pts.push(`${(rr * Math.cos(a)).toFixed(2)},${(rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/** n-point rosette for the centre medallion — one point per seat, so the hub
 *  states the table size. `inner` is the waist as a fraction of `r`. */
export function rosettePts(n: number, r: number, inner = 0.52): string {
  const pts: string[] = [];
  for (let k = 0; k < n * 2; k++) {
    const rr = k % 2 === 0 ? r : r * inner;
    const a = -Math.PI / 2 + (k * Math.PI) / n;
    pts.push(`${(rr * Math.cos(a)).toFixed(2)},${(rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/** Flat vector padlock, drawn at the origin, sized to `s`. Replaces a raw
 *  `🔒` emoji — the one non-vector mark on an otherwise pure-vector board,
 *  and one that renders differently on every OS. Sits on a white disc so it
 *  stays legible on the solid seat-coloured lane cell underneath. */
export function LockMark({ s }: { s: number }) {
  const bodyW = s * 0.62;
  const bodyH = s * 0.46;
  const bodyY = -s * 0.1;
  return (
    <g>
      <circle r={s * 0.62} fill="#ffffff" stroke={INK} strokeWidth={GRID_STROKE} />
      <path
        d={`M ${-bodyW * 0.3} ${bodyY} v ${-s * 0.2} a ${bodyW * 0.3} ${s * 0.2} 0 0 1 ${bodyW * 0.6} 0 v ${s * 0.2}`}
        fill="none"
        stroke={INK}
        strokeWidth={s * 0.11}
        strokeLinecap="round"
      />
      <rect x={-bodyW / 2} y={bodyY} width={bodyW} height={bodyH} rx={s * 0.08} fill={INK} />
    </g>
  );
}

/** Direction chevron — the "this way round" mark on a home-run approach.
 *  Drawn at the origin pointing +x; rotate the group to aim it. */
export function ArrowMark({ s, color = INK }: { s: number; color?: string }) {
  return (
    <path
      d={`M ${-s * 0.35} ${-s * 0.42} L ${s * 0.4} 0 L ${-s * 0.35} ${s * 0.42}`}
      fill="none"
      stroke={color}
      strokeWidth={s * 0.22}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
