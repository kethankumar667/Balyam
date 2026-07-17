import type { LudoColor, Player } from "@shared/types";
import { PLAYER_COLORS_ORDER } from "./board-layout";
import { seatColor, type PrintBoardGeometry } from "./print-board";

/**
 * Flat-vector renderer for the N-player (5..8) print-design Ludo boards,
 * matched to the reference: white play field with thin-outlined grid cells
 * (every loop cell — including the arm-tip turn cell — is a plain uniform
 * square; player identity lives only in the big rotated label on the outer
 * border, never on the cell itself), colored home lanes, white entry cells
 * with thin colored arrows, one small colored route-direction arrow per arm,
 * thin outlined safe stars, solid seat-colored start cells with a white
 * star, solid triangular yards with a large white home circle + four flat
 * wells, a per-sector colored octagon border, and a center of colored
 * "HOME" wedges converging on a red hub. Deliberately NO gradients, shadows,
 * glows or bevels — it is a clean print.
 *
 * Geometry comes from getPrintBoard(N) (engine-index compatible); tokens
 * are overlaid by the parent at the same 0..100 coordinates.
 */

const INK = "#444444";
const GRID_STROKE = 0.18;

/** Scale a point outward from the board center (50,50). */
function scalePt(p: { x: number; y: number }, k: number): { x: number; y: number } {
  return { x: 50 + (p.x - 50) * k, y: 50 + (p.y - 50) * k };
}

type Pt = { x: number; y: number };

function angleDeg(a: Pt, b: Pt): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Keep rotated text upright-readable. */
function readable(a: number): number {
  return a > 90 || a < -90 ? a + 180 : a;
}

/** 5-point star polygon points centered on (0,0), outer radius r. */
function starPts(r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    pts.push(`${(rr * Math.cos(a)).toFixed(2)},${(rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/** Keep a radially-placed label upright: rotate by the arm axis, adding a
 *  half turn for downward-facing arms so text never renders upside-down. */
function uprightAngle(axisDeg: number): number {
  const a = ((axisDeg % 360) + 360) % 360;
  return a > 90 && a < 270 ? a + 180 : a;
}

/** Colored border band: inner scale (from the yard baselines) and outer. */
const BORDER_IN = 1.08;
const BORDER_OUT = 1.19;

export default function PrintBoardSVG({
  geo,
  players,
  playerOrder,
  playerColors,
  hasCaptured,
}: {
  geo: PrintBoardGeometry;
  players: Player[];
  playerOrder: string[];
  playerColors: Record<string, LudoColor>;
  activeColors: LudoColor[];
  hasCaptured: Record<string, boolean>;
}) {
  const art = geo.art;
  const cell = geo.cellSize;
  const half = cell / 2;
  const star = starPts(cell * 0.4);

  // Arm index i owns canonical color PLAYER_COLORS_ORDER[i]; resolve which
  // seated player (if any) holds that color so labels follow real seats even
  // when players hand-picked colors out of order.
  const pidByArm: (string | undefined)[] = Array.from({ length: geo.N });
  for (const pid of playerOrder) {
    const c = playerColors[pid];
    const arm = c ? PLAYER_COLORS_ORDER.indexOf(c) : -1;
    if (arm >= 0 && arm < geo.N) pidByArm[arm] = pid;
  }
  const armLabel = (i: number): string => {
    const pid = pidByArm[i];
    const name = pid ? players.find((p) => p.id === pid)?.name : null;
    return (name ?? `Player ${i + 1}`).toUpperCase();
  };
  const armCaptured = (i: number): boolean => {
    const pid = pidByArm[i];
    return pid ? !!hasCaptured[pid] : true;
  };

  // Outer silhouette: all yard-baseline corners scaled to the border's outer
  // edge, in perimeter order (vL then vR per sector).
  const silhouette = art.rimSegments
    .flatMap(({ a, b }) => [scalePt(a, BORDER_OUT), scalePt(b, BORDER_OUT)])
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
      {/* Flat white page + octagon body */}
      <rect className="board-bg-rect" x={-2} y={-2} width={104} height={104} rx={4} fill="#ffffff" />
      <polygon points={silhouette} fill="#ffffff" stroke="#666" strokeWidth={0.22} strokeLinejoin="round" />

      {/* Per-sector colored border band along each outer edge */}
      {art.rimSegments.map(({ a, b }, i) => {
        const p1 = scalePt(a, BORDER_IN);
        const p2 = scalePt(b, BORDER_IN);
        const p3 = scalePt(b, BORDER_OUT);
        const p4 = scalePt(a, BORDER_OUT);
        return (
          <polygon
            key={"band" + i}
            points={`${p1.x.toFixed(2)},${p1.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)} ${p3.x.toFixed(2)},${p3.y.toFixed(2)} ${p4.x.toFixed(2)},${p4.y.toFixed(2)}`}
            fill={seatColor(i)}
          />
        );
      })}

      {/* Big rotated player labels in the white band inside the border */}
      {art.rimSegments.map(({ a, b }, i) => {
        const mid = scalePt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, (1 + BORDER_IN) / 2);
        const rot = readable(angleDeg(a, b));
        return (
          <g key={"lbl" + i} transform={`translate(${mid.x} ${mid.y}) rotate(${rot})`}>
            <text
              x={0}
              y={0.1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={2.1}
              fontWeight={800}
              fill="#1b1b1b"
              style={{ fontFamily: "'Poppins','Nunito',sans-serif", letterSpacing: "0.08em" }}
            >
              {armLabel(i)}
            </text>
          </g>
        );
      })}

      {/* Thin baseline edge under each yard */}
      {art.rimSegments.map(({ a, b }, i) => (
        <line key={"rim" + i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={GRID_STROKE} />
      ))}

      {/* Yard sectors: just the flat colored triangle — tokens (rendered by
          the parent at these same `yardSlots` coordinates) sit directly on
          it, matching the reference: no white backdrop disc, no separate
          colored "well" markers underneath. Each token's own dark outline +
          drop-shadow (Token.tsx) already gives it enough grounding against
          the flat color, so nothing is lost by dropping the extra layer —
          it's actually calmer/closer to the reference this way. */}
      {art.yards.map(({ tri }, i) => (
        <polygon key={`yard-${i}`} points={tri} fill={seatColor(i)} stroke={INK} strokeWidth={0.22} strokeLinejoin="round" />
      ))}

      {/* Loop cells (side columns) — plain white, thin outline */}
      {art.whiteCells.map(({ pt, angle }, i) => (
        <g key={"w" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
          <rect x={-half} y={-half} width={cell} height={cell} fill="#ffffff" stroke={INK} strokeWidth={GRID_STROKE} />
        </g>
      ))}

      {/* Home lanes — the middle column, solid in the arm's seat color.
          Entries are pushed 5 per arm in arm order. */}
      {art.stretchWhite.map(({ pt, angle }, i) => {
        const c = seatColor(Math.floor(i / 5));
        return (
          <g key={"m" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
            <rect x={-half} y={-half} width={cell} height={cell} fill={c} stroke={INK} strokeWidth={GRID_STROKE} />
          </g>
        );
      })}

      {/* Entry cells — white with a thin colored arrow pointing inward */}
      {art.arrows.map(({ pt, angle }, i) => {
        const c = seatColor(i);
        return (
          <g key={"arrow" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
            <rect x={-half} y={-half} width={cell} height={cell} fill="#ffffff" stroke={INK} strokeWidth={GRID_STROKE} />
            {/* local −y = outward, so the arrow points +y (toward the center) */}
            <line x1={0} y1={-cell * 0.26} x2={0} y2={cell * 0.1} stroke={c} strokeWidth={cell * 0.09} />
            <polygon
              points={`${-cell * 0.16},${cell * 0.08} ${cell * 0.16},${cell * 0.08} 0,${cell * 0.32}`}
              fill={c}
            />
          </g>
        );
      })}

      {/* Arm-tip cells — the loop's turn cell. Player identity is already
          carried by the big rotated label in the outer border band, so this
          stays a PLAIN cell, same size as every other loop cell, rather than
          a wide banner that painted over its two neighbors. */}
      {art.caps.map(({ pt, angle }, i) => (
        <g key={"cap" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
          <rect x={-half} y={-half} width={cell} height={cell} fill="#ffffff" stroke={INK} strokeWidth={GRID_STROKE} />
        </g>
      ))}

      {/* Route-direction arrows — one thin colored arrow per arm on the
          in-column, pointing inward (toward center), showing which way
          tokens travel after entering from the yard. */}
      {art.routeArrows.map(({ pt, angle }, i) => {
        const c = seatColor(i);
        return (
          <g key={"route" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
            <line x1={0} y1={-cell * 0.22} x2={0} y2={cell * 0.05} stroke={c} strokeWidth={cell * 0.09} strokeLinecap="round" />
            <polygon
              points={`${-cell * 0.13},${cell * 0.05} ${cell * 0.13},${cell * 0.05} 0,${cell * 0.27}`}
              fill={c}
            />
          </g>
        );
      })}

      {/* Start cells — solid seat-colored cell + white star (the engine's
          actual entry/safe cell, one per arm) */}
      {art.starts.map(({ pt, angle }, i) => (
        <g key={"startcell" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
          <rect x={-half} y={-half} width={cell} height={cell} fill={seatColor(i)} stroke={INK} strokeWidth={GRID_STROKE} />
          <polygon points={star} fill="#ffffff" />
        </g>
      ))}

      {/* Mid safe stars — thin outlined, on the engine's actual safe cells */}
      {art.stars.map(({ pt }, i) => (
        <g key={"star" + i} transform={`translate(${pt.x} ${pt.y})`}>
          <polygon points={star} fill="none" stroke="#9a9a9a" strokeWidth={0.14} strokeLinejoin="round" />
        </g>
      ))}

      {/* Mandatory-capture locks at the stretch entrance (game rule info) */}
      {Array.from({ length: geo.N }, (_, i) => {
        if (armCaptured(i)) return null;
        const color = PLAYER_COLORS_ORDER[i];
        const entry = geo.stretchCells[color]?.[0];
        if (!entry) return null;
        return (
          <text key={"lock" + i} x={entry.x} y={entry.y} textAnchor="middle" dominantBaseline="central" fontSize={cell * 0.66}>
            🔒
          </text>
        );
      })}

      {/* Center: colored HOME wedges converging on a red hub — the
          reference's "beautiful center", replacing the old black-hex/die.
          The live board overlays the real interactive dice on top of this
          same spot (LudoDiceTray in ludo-board-composites.tsx); the preview
          page doesn't mount a dice tray at all, so this hub reads correctly
          either way — a small red circle, like a physical die's resting
          spot on a printed board, not a drawn-on die face. */}
      {art.slices.map(({ color: sliceColor, points }, i) => (
        <polygon key={"slice" + sliceColor} points={points} fill={seatColor(i)} stroke={INK} strokeWidth={0.28} strokeLinejoin="round" />
      ))}
      {/* "HOME" label per wedge, anchored at the mean of that color's
          finished-token slots (already mid-wedge) and kept upright. */}
      {art.slices.map(({ color: sliceColor }) => {
        const slots = geo.homeSlots[sliceColor];
        if (!slots?.length) return null;
        const anchor = slots.reduce(
          (acc, s) => ({ x: acc.x + s.x / slots.length, y: acc.y + s.y / slots.length }),
          { x: 0, y: 0 },
        );
        const rot = uprightAngle(geo.wedgeAngle[sliceColor]);
        return (
          <text
            key={"homelbl" + sliceColor}
            x={anchor.x}
            y={anchor.y}
            transform={`rotate(${rot} ${anchor.x} ${anchor.y})`}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.max(1.1, cell * 0.34)}
            fontWeight={800}
            fill="#ffffff"
            style={{ fontFamily: "'Poppins','Nunito',sans-serif", letterSpacing: "0.04em" }}
          >
            HOME
          </text>
        );
      })}
      <circle cx={50} cy={50} r={Math.max(1.6, cell * 0.62)} fill="#D8232A" stroke="#ffffff" strokeWidth={0.4} />
    </svg>
  );
}
