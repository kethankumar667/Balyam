import {
  INK,
  GRID_STROKE,
  LANE_STROKE,
  RIM_STROKE,
  norm180,
  readable,
  starPts,
  rosettePts,
  LockMark,
} from "./print-marks";
import { useId } from "react";
import type { LudoColor, Player } from "@shared/types";
import { PLAYER_COLORS_ORDER } from "./board-layout";
import { seatColor, seatColorDark, type PrintBoardGeometry } from "./print-board";

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
 * "HOME" wedges converging on a layered centre medallion.
 *
 * MATERIAL (2026-07-27): the board was originally a deliberately flat print
 * ("no gradients, shadows, glows or bevels"). That rule was lifted on request,
 * and the seat colours now carry the same five-layer treatment chosen globally
 * for Ludo — subtle top-to-bottom gradient, glossy upper highlight, darker
 * base, thin inner highlight, soft shadow — via `<defs>` gradients keyed by
 * arm index. It is applied ONLY to the large colour fields (border bands,
 * yards, centre wedges, home lanes, start cells); the ~200 small white loop
 * cells stay flat, because gloss at that scale is noise, not richness.
 *
 * Geometry comes from getPrintBoard(N) (engine-index compatible); tokens
 * are overlaid by the parent at the same 0..100 coordinates.
 */

/**
 * Stroke hierarchy. Everything used to be drawn at one weight (0.18), so a
 * home-lane divider carried the same visual force as the board's outer edge
 * and the whole board read as busy graph paper. Three tiers now: hairline for
 * the cell grid, medium for structural edges (yards, centre wedges,
 * medallion), heavy for the silhouette.
 */

/** Scale a point outward from the board center (50,50). */
function scalePt(p: { x: number; y: number }, k: number): { x: number; y: number } {
  return { x: 50 + (p.x - 50) * k, y: 50 + (p.y - 50) * k };
}

type Pt = { x: number; y: number };

function angleDeg(a: Pt, b: Pt): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
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
  rotationDeg = 0,
}: {
  geo: PrintBoardGeometry;
  players: Player[];
  playerOrder: string[];
  playerColors: Record<string, LudoColor>;
  activeColors: LudoColor[];
  hasCaptured: Record<string, boolean>;
  /** How far the whole board is spun on screen (egocentric orientation). The
   *  label helpers below flip text that would land upside-down, and that
   *  decision depends on the FINAL on-screen angle — so they have to be told
   *  about a rotation applied by an ancestor, or half the names read upside
   *  down once the board turns. */
  rotationDeg?: number;
}) {
  // Namespace every <defs> id to this instance. The preview page renders
  // several boards at once, and duplicate ids would make them all resolve to
  // whichever mounted first — every board silently wearing the 5-player
  // board's gradients. Colons are stripped: they are legal in an id but break
  // `url(#…)` references.
  const gid = `pb${useId().replace(/:/g, "")}`;
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
      <defs>
        {/* One body gradient per arm: seat colour at the top easing to the
            darker base. `objectBoundingBox` (the default) means every shape
            gets its own top-lit gradient, which is what makes each panel read
            as a separate moulded piece rather than one flat sheet. */}
        {Array.from({ length: geo.N }, (_, i) => (
          <linearGradient key={"g" + i} id={`${gid}-seat-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={seatColor(i)} />
            <stop offset="68%" stopColor={seatColor(i)} />
            <stop offset="100%" stopColor={seatColorDark(i)} />
          </linearGradient>
        ))}
        {/* Gloss: a bright upper sheen fading out by the waist. The first cut
            of this ended at 40%→41%, which drew a visible hard horizontal
            SEAM across the big yard triangles — it read as a rendering
            artifact, not a curved surface. Eased over ~30% instead. */}
        <linearGradient id={`${gid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.32} />
          <stop offset="22%" stopColor="#ffffff" stopOpacity={0.16} />
          <stop offset="46%" stopColor="#ffffff" stopOpacity={0.04} />
          <stop offset="68%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        {/* Seats the board on the page instead of letting it float as a
            sticker. Kept soft and slightly dropped, one light source. */}
        <filter id={`${gid}-lift`} x="-12%" y="-12%" width="124%" height="124%">
          <feDropShadow dx="0" dy="0.7" stdDeviation="0.9" floodColor="#000000" floodOpacity="0.32" />
        </filter>
        {/* Very light centre-out vignette over the white field — enough to
            stop the play area reading as dead paper, not enough to grey it. */}
        <radialGradient id={`${gid}-vig`} cx="50%" cy="46%" r="62%">
          <stop offset="55%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#241C12" stopOpacity={0.09} />
        </radialGradient>
        {/* Centre boss — lit from the same direction as every other panel. */}
        <radialGradient id={`${gid}-hub`} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#F2564F" />
          <stop offset="52%" stopColor="#D8232A" />
          <stop offset="100%" stopColor="#8E1116" />
        </radialGradient>
      </defs>

      {/* Oversized on purpose. The board can be ROTATED (egocentric
          orientation), and a square only just larger than the viewBox leaves
          the container's corners uncovered once turned — which showed as white
          wedges poking out of the card. Half-diagonal of a 100×100 box is
          ~70.7, so this spans any rotation; the wrapper clips the excess. */}
      <rect className="board-bg-rect" x={-25} y={-25} width={150} height={150} fill="#ffffff" />
      <polygon
        points={silhouette}
        fill="#ffffff"
        stroke={INK}
        strokeWidth={RIM_STROKE}
        strokeLinejoin="round"
        filter={`url(#${gid}-lift)`}
      />

      {/* Per-sector colored border band along each outer edge */}
      {art.rimSegments.map(({ a, b }, i) => {
        const p1 = scalePt(a, BORDER_IN);
        const p2 = scalePt(b, BORDER_IN);
        const p3 = scalePt(b, BORDER_OUT);
        const p4 = scalePt(a, BORDER_OUT);
        const pts = `${p1.x.toFixed(2)},${p1.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)} ${p3.x.toFixed(2)},${p3.y.toFixed(2)} ${p4.x.toFixed(2)},${p4.y.toFixed(2)}`;
        return (
          <g key={"band" + i}>
            <polygon points={pts} fill={`url(#${gid}-seat-${i})`} />
            <polygon points={pts} fill={`url(#${gid}-gloss)`} />
          </g>
        );
      })}

      {/* Vignette over the white field. Drawn early (under the grid) so it
          shades the paper without dulling the cells, stars or tokens. */}
      <polygon points={silhouette} fill={`url(#${gid}-vig)`} pointerEvents="none" />

      {/* Big rotated player labels in the white band inside the border */}
      {art.rimSegments.map(({ a, b }, i) => {
        const mid = scalePt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, (1 + BORDER_IN) / 2);
        // Decide the flip on the FINAL on-screen angle, then subtract the
        // ancestor rotation back out so the glyphs still run along the rim.
        const rot = readable(norm180(angleDeg(a, b) + rotationDeg)) - rotationDeg;
        return (
          <g key={"lbl" + i} transform={`translate(${mid.x} ${mid.y}) rotate(${rot})`}>
            <text
              x={0}
              y={0.1}
              textAnchor="middle"
              dominantBaseline="central"
              // 2.2 → 1.65 (−25%). These are reference labels: you read them
              // once to learn which corner is whose, then never again, but at
              // the old size they competed with the tokens and cells you read
              // on every single turn. Tracking eases with them so the band
              // gets shorter AND narrower rather than just smaller.
              fontSize={1.65}
              fontWeight={800}
              fill="#23201E"
              fillOpacity={0.82}
              style={{ fontFamily: "'Poppins','Nunito',sans-serif", letterSpacing: "0.12em" }}
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
        <g key={`yard-${i}`}>
          <polygon points={tri} fill={`url(#${gid}-seat-${i})`} stroke={INK} strokeWidth={LANE_STROKE} strokeLinejoin="round" />
          <polygon points={tri} fill={`url(#${gid}-gloss)`} />
        </g>
      ))}

      {/* Yard wells. These were dropped once as "calmer", but it left four
          tokens floating on a big flat triangle with nothing seating them —
          and an EMPTY yard as a large dead colour field. Deliberately just a
          darker disc, no outline: enough to read as a slot without adding the
          grid noise the earlier bordered version did.

          Radius MUST clear the token that sits on this exact point, or the
          well is drawn and then completely hidden by it. Yard tokens are
          `cellSize * 1.0` across (polygonTokenSize), i.e. radius 0.5·cell, so
          0.66 leaves a visible collar around an occupied slot and reads as an
          empty socket once the token leaves. */}
      {art.yards.map(({ wells }, i) =>
        wells.map((w, j) => (
          <circle
            key={`well-${i}-${j}`}
            cx={w.x}
            cy={w.y}
            r={cell * 0.66}
            fill={seatColorDark(i)}
            opacity={0.38}
          />
        )),
      )}

      {/* Loop cells (side columns) — plain white, thin outline */}
      {art.whiteCells.map(({ pt, angle }, i) => (
        <g key={"w" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
          <rect x={-half} y={-half} width={cell} height={cell} fill="#ffffff" stroke={INK} strokeWidth={GRID_STROKE} />
        </g>
      ))}

      {/* Home lanes — the middle column, solid in the arm's seat color.
          Entries are pushed 5 per arm in arm order. */}
      {art.stretchWhite.map(({ pt, angle }, i) => (
        <g key={"m" + i} transform={`translate(${pt.x} ${pt.y}) rotate(${angle})`}>
          <rect
            x={-half}
            y={-half}
            width={cell}
            height={cell}
            fill={`url(#${gid}-seat-${Math.floor(i / 5)})`}
            stroke={INK}
            strokeWidth={GRID_STROKE}
          />
        </g>
      ))}

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
          <rect x={-half} y={-half} width={cell} height={cell} fill={`url(#${gid}-seat-${i})`} stroke={INK} strokeWidth={GRID_STROKE} />
          <polygon points={star} fill="#ffffff" />
        </g>
      ))}

      {/* Mid safe stars. One safe-cell language now, in two states: a SOLID
          seat-coloured cell with a white star is that arm's start; a white
          cell with that arm's colour outlined is a safe square. The old
          #9a9a9a hairline made the same concept nearly invisible on white
          while its sibling shouted — same meaning, two unrelated treatments.
          Stars are pushed one per arm in arm order, so `i` is the arm. */}
      {art.stars.map(({ pt }, i) => (
        <g key={"star" + i} transform={`translate(${pt.x} ${pt.y})`}>
          <polygon
            points={star}
            fill={seatColor(i)}
            fillOpacity={0.16}
            stroke={seatColor(i)}
            strokeWidth={0.2}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* Mandatory-capture locks at the stretch entrance (game rule info) */}
      {Array.from({ length: geo.N }, (_, i) => {
        if (armCaptured(i)) return null;
        const color = PLAYER_COLORS_ORDER[i];
        const entry = geo.stretchCells[color]?.[0];
        if (!entry) return null;
        return (
          // Counter-rotated: a padlock is a recognisable object, so it should
          // stand up whichever way the board is turned.
          <g key={"lock" + i} transform={`translate(${entry.x} ${entry.y}) rotate(${-rotationDeg})`}>
            <LockMark s={cell * 0.62} />
          </g>
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
        <g key={"slice" + sliceColor}>
          <polygon points={points} fill={`url(#${gid}-seat-${i})`} stroke={INK} strokeWidth={LANE_STROKE} strokeLinejoin="round" />
          <polygon points={points} fill={`url(#${gid}-gloss)`} />
        </g>
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
        const rot = uprightAngle(geo.wedgeAngle[sliceColor] + rotationDeg) - rotationDeg;
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
      {/* Centre medallion. Was a single flat red dot — the focal point where
          all N wedges converge, doing no work, and leaving the wedge tips to
          meet in a messy point. Now a layered hub: a white clearing that gives
          the tips somewhere clean to land, a dark rim, the red boss, and an
          N-point rosette so the centre states the table size.

          Sized off R_C (the centre polygon's circumradius), NOT off `cell`:
          the innermost home-token slot sits at 0.46·R_C, which at N=5 is only
          1.17·cell — a cell-based radius would bury home tokens on small
          tables. R_C = 1.5·cell / sin(180°/N), same as print-board.ts. */}
      {(() => {
        const rC = (1.5 * cell) / Math.sin(Math.PI / geo.N);
        const med = Math.min(cell * 1.15, rC * 0.3);
        return (
          <g transform="translate(50 50)">
            <circle r={med} fill="#ffffff" stroke={INK} strokeWidth={LANE_STROKE} />
            <circle r={med * 0.78} fill={`url(#${gid}-hub)`} />
            {/* Thin inner highlight along the boss's upper rim. */}
            <circle
              r={med * 0.78}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.4}
              strokeWidth={med * 0.06}
              strokeDasharray={`${med * 1.5} ${med * 4}`}
              transform="rotate(-125)"
            />
            <polygon points={rosettePts(geo.N, med * 0.6)} fill="#ffffff" fillOpacity={0.94} />
            <circle r={med * 0.17} fill="#B3161C" />
          </g>
        );
      })()}
    </svg>
  );
}
