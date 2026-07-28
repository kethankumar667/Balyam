import type { LudoColor, LudoToken, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK, HOME_CENTER, SAFE_SQUARES, STRETCH_CELLS, TRACK_CELLS, YARD_CELLS, YARD_REGIONS } from "./board-layout";
import type { PolygonBoardGeometry } from "./polygon-board";
import { YARD_TOKEN_W } from "./print-board";

/**
 * Ludo — shared render primitives.
 *
 * Pure geometry helpers + the board SVG itself. Deliberately has ZERO
 * dependency on useLudoBoard (no import cycle): both the hook and the
 * composite layout components (ludo-board-composites.tsx) import from here.
 */

export const GRID = 15;

/** Convert grid (row, col) to percent (left, top) for absolute positioning. */
export function cellToPct(row: number, col: number): { left: number; top: number } {
  return {
    left: ((col + 0.5) / GRID) * 100,
    top: ((row + 0.5) / GRID) * 100,
  };
}

/**
 * Where token `i` of `n` sharing one cell sits, in CELL units, and how much to
 * shrink it so the whole cluster still fits inside that cell.
 *
 * Replaces the old `colorOffset` + `stackOffset` pair, which were blind: they
 * derived a nudge from the token's colour and index rather than from what was
 * actually on the cell. Two same-colour tokens got ~0.18 cell of separation
 * against a token ~1.18 cells wide — about 85% overlap — and the polygon
 * (5-8 player) board never applied them at all, so a block of 2-4 tokens
 * rendered as a single visible piece.
 *
 * Ludo genuinely allows several tokens on one cell — a block of the same
 * player's pieces, or different players resting on a safe square — so every
 * one of them has to stay individually countable.
 */
export function fanSlot(i: number, n: number): { dx: number; dy: number; scale: number } {
  if (n <= 1) return { dx: 0, dy: 0, scale: 1 };
  // A pair reads best side by side: the pieces are taller than they are wide,
  // so horizontal separation costs the least overlap.
  if (n === 2) return { dx: i === 0 ? -0.23 : 0.23, dy: 0, scale: 0.74 };
  const radius = n <= 4 ? 0.28 : 0.34;
  const scale = n === 3 ? 0.64 : n === 4 ? 0.56 : Math.max(0.4, 1.15 / Math.sqrt(n));
  const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return { dx: radius * Math.cos(ang), dy: radius * Math.sin(ang), scale };
}

export type LudoHoverPreview =
  | { kind: "track"; trackPos: number }
  | { kind: "stretch"; stretchPos: number; color: LudoColor }
  | { kind: "home"; color: LudoColor };

/** Token sizes for the polygon (5-8 player) board, scaled to cell size. The
 *  YARD size is imported, not a literal: print-board.ts erodes each yard
 *  triangle by half that width to guarantee the slots sit fully inside the
 *  walls, so the two values have to be the same number. */
export function polygonTokenSize(state: LudoToken["state"], cellSize: number): number {
  if (state === "yard") return cellSize * YARD_TOKEN_W;
  if (state === "home") return cellSize * 1.05;
  return cellSize * 1.18;
}

export function HoverPreviewMarker({
  preview,
  geo,
}: {
  preview: LudoHoverPreview;
  geo: PolygonBoardGeometry | null;
}) {
  let p: { left: number; top: number };
  let hex: string;
  if (geo) {
    if (preview.kind === "track") {
      const pt = geo.trackCells[preview.trackPos];
      p = { left: pt.x, top: pt.y };
      hex = "#fbbf24";
    } else if (preview.kind === "stretch") {
      const pt = geo.stretchCells[preview.color][preview.stretchPos];
      p = { left: pt.x, top: pt.y };
      hex = COLOR_HEX[preview.color];
    } else {
      p = { left: 50, top: 50 };
      hex = COLOR_HEX[preview.color];
    }
  } else if (preview.kind === "track") {
    const c = TRACK_CELLS[preview.trackPos];
    p = cellToPct(c.row, c.col);
    hex = "#fbbf24";
  } else if (preview.kind === "stretch") {
    const c = STRETCH_CELLS[preview.color][preview.stretchPos];
    p = cellToPct(c.row, c.col);
    hex = COLOR_HEX[preview.color];
  } else {
    p = cellToPct(HOME_CENTER.row, HOME_CENTER.col);
    hex = COLOR_HEX[preview.color];
  }
  // Size the target to the actual cell (polygon boards carry a cellSize in
  // viewBox %; the cross board's cells are ~1/15 of the board).
  const sizePct = geo ? geo.cellSize * 1.15 : 7;
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: `${p.left}%`,
        top: `${p.top}%`,
        transform: "translate(-50%, -50%)",
        width: `${sizePct}%`,
        aspectRatio: "1 / 1",
      }}
    >
      {/* soft radial glow */}
      <div
        className="absolute rounded-full"
        style={{ inset: "-22%", background: `radial-gradient(circle, ${hex}55, transparent 66%)` }}
      />
      {/* expanding sonar ping */}
      <div
        className="ludo-hover-ping absolute inset-0 rounded-full"
        style={{ border: `2px solid ${hex}` }}
      />
      {/* steady framing ring (gently breathing) */}
      <div
        className="ludo-hover-core absolute rounded-full"
        style={{
          inset: "12%",
          border: `2.5px solid ${hex}`,
          boxShadow: `0 0 8px ${hex}, inset 0 0 5px ${hex}aa`,
          background: `${hex}22`,
        }}
      />
      {/* center pip */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: "26%",
          height: "26%",
          transform: "translate(-50%, -50%)",
          background: hex,
          boxShadow: `0 0 6px ${hex}`,
        }}
      />
    </div>
  );
}

export function MiniBurst({
  left,
  top,
  color,
}: {
  left: number;
  top: number;
  color: LudoColor;
}) {
  const pieces = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 28 + Math.random() * 18;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      bg: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#ffffff" : COLOR_HEX[color],
      rotate: Math.random() * 360,
    };
  });
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${left}%`, top: `${top}%`, width: 0, height: 0 }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="mini-burst-piece"
          style={
            {
              backgroundColor: p.bg,
              transform: `rotate(${p.rotate}deg)`,
              ["--dx" as never]: `${p.dx}px`,
              ["--dy" as never]: `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board SVG: yards, track cells, home stretches, center triangles, safe stars
//
// Palette/lookup constants hoisted to module scope (were re-allocated every
// render in the original single-file board) — pure perf, identical visuals.
// ---------------------------------------------------------------------------

const ORDERED_COLORS: LudoColor[] = ["red", "green", "yellow", "blue"];

/** First cell of each home stretch (where the lock sits) — 4 colors on the cross board. */
const STRETCH_ENTRY: Partial<Record<LudoColor, { row: number; col: number }>> = {
  red:    { row: 7, col: 1 },
  green:  { row: 1, col: 7 },
  yellow: { row: 7, col: 13 },
  blue:   { row: 13, col: 7 },
};

// Refined palette — keeps the cardinal hues identifiable while toning down
// the saturated primaries that made the old board read as cartoonish. Yard
// fills sit slightly below COLOR_HEX so the bright tokens pop against them,
// and the frame inherits COLOR_HEX_DARK for a coherent dark trim.
const YARD_FILL: Record<LudoColor, string> = {
  red: "#D9534F", green: "#3E9A6B", yellow: "#E2A933", blue: "#3A7CCB",
  purple: "#9F60D0", cyan: "#3DA8B9", orange: "#E08148", brown: "#8E5C2E",
};
const STRETCH_FILL: Record<LudoColor, string> = {
  red: "#E89895", green: "#7CC59E", yellow: "#F2D08C", blue: "#85AEDA",
  purple: "#C7A2E2", cyan: "#83CBD5", orange: "#EFB388", brown: "#B58A5E",
};
const PARCHMENT      = "#FBF4DE";
const PARCHMENT_DEEP = "#F1E3BC";
const TRACK_FILL     = "#FDF8E6";
const TRACK_BORDER   = "#C8A66B";
const WOOD_DARK      = "#3F2412";
const GOLD           = "#E0AE3B";
const GOLD_DEEP      = "#9A6E1A";

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(3)},${(cy + rr * Math.sin(a)).toFixed(3)}`);
  }
  return pts.join(" ");
}

/** Track index of each color's launch square on the cross (4-player) board. */
const START_MAP: Record<string, number> = { red: 0, green: 13, yellow: 26, blue: 39 };

/** Arrow direction/position out of each color's start square. */
const ARROW_DIR: Partial<Record<LudoColor, { x: number; y: number; rot: number }>> = {
  red:    { x: 1.5, y: 6.5, rot: 0 },
  green:  { x: 8.5, y: 1.5, rot: 90 },
  yellow: { x: 13.5, y: 7.5, rot: 180 },
  blue:   { x: 6.5, y: 13.5, rot: 270 },
};

export function BoardSVG({
  playerColorsInRoom,
  players,
  playerOrder,
  playerColors,
  hasCaptured,
  unlockBurst,
  registerCard,
  selfId,
  finishedCount,
  rotationDeg = 0,
}: {
  playerColorsInRoom: LudoColor[];
  players: Player[];
  playerOrder: string[];
  playerColors: Record<string, LudoColor>;
  hasCaptured: Record<string, boolean>;
  unlockBurst: Record<string, number>;
  registerCard?: (playerId: string, el: SVGGElement | null) => void;
  /** How far an ancestor has spun the board (egocentric orientation). Glyphs
   *  that represent OBJECTS — names, crowns, padlocks — are counter-rotated by
   *  this so they stay upright; the direction arrows deliberately are NOT,
   *  since they point board-relative. */
  rotationDeg?: number;
  /** Used to hide the "react at" affordance on the viewer's own name plate. */
  selfId: string | null;
  /** Home-token count per playerId - drives the live "N/4" corner badge. */
  finishedCount: Record<string, number>;
}) {
  // Map color -> playerId for this room
  const playerIdByColor: Partial<Record<LudoColor, string | null>> = {};
  for (const pid of playerOrder) {
    const c = playerColors[pid];
    if (c) playerIdByColor[c] = pid;
  }

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      className="absolute inset-0 w-full h-full rounded-md"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, " + PARCHMENT + " 0%, " + PARCHMENT_DEEP + " 75%, #D9BE82 100%)",
      }}
    >
      <defs>
        {/* Wood-grain stroke used as the outer board frame trim. */}
        <linearGradient id="ludo-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5C3A1A" />
          <stop offset="50%" stopColor="#8B5E2E" />
          <stop offset="100%" stopColor="#3F2412" />
        </linearGradient>
        {/* Per-color radial gradient for yard quadrants — gives each yard a
            soft "inset bowl" look instead of a flat block. */}
        {ORDERED_COLORS.map((color) => (
          <radialGradient key={color + "-yard-grad"} id={`ludo-yard-${color}`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={YARD_FILL[color]} />
            <stop offset="80%" stopColor={YARD_FILL[color]} />
            <stop offset="100%" stopColor={COLOR_HEX_DARK[color]} />
          </radialGradient>
        ))}
        {/* Soft drop-shadow used for the center cross + name labels so they
            sit above the board instead of flush with it. */}
        <filter id="ludo-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.18" />
          <feOffset dx="0" dy="0.18" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer wood frame trim — sits at the very edge so the rest of the
          drawing reads as the felt inside the box. */}
      <rect x={0.1} y={0.1} width={GRID - 0.2} height={GRID - 0.2} rx={0.5} fill="none" stroke="url(#ludo-frame)" strokeWidth={0.4} />
      <rect x={0.35} y={0.35} width={GRID - 0.7} height={GRID - 0.7} rx={0.35} fill="none" stroke={GOLD} strokeWidth={0.12} opacity={0.7} />

      {/* 4 yard quadrants */}
      {ORDERED_COLORS.map((color) => {
        const { r0, c0 } = YARD_REGIONS[color];
        const inactive = !playerColorsInRoom.includes(color);
        const pid = playerIdByColor[color];
        const name = pid ? players.find((p) => p.id === pid)?.name ?? null : null;
        return (
          <g key={color} opacity={inactive ? 0.45 : 1}>
            {/* Outer colored frame with rounded corner */}
            <rect x={c0 + 0.2} y={r0 + 0.2} width={6 - 0.4} height={6 - 0.4} rx={0.4} fill={`url(#ludo-yard-${color})`} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.12} />
            {/* Inner cream pad where tokens park */}
            <rect x={c0 + 1} y={r0 + 1} width={4} height={4} rx={0.3} fill={PARCHMENT} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.08} />
            {/* Faint hand-drawn crown watermark behind the parked tokens —
                the reference's per-quadrant motif. Decorative only. */}
            <text
              x={c0 + 3}
              y={r0 + 3.55}
              textAnchor="middle"
              fontSize={2}
              opacity={0.12}
              transform={`rotate(${-rotationDeg} ${c0 + 3} ${r0 + 3})`}
              style={{ pointerEvents: "none" }}
            >
              👑
            </text>
            {/* Token slot circles — slightly darker so they read as a
                landing pad rather than a faint ghost. */}
            {YARD_CELLS[color].map((cell, i) => (
              <g key={i}>
                <circle cx={cell.col + 0.5} cy={cell.row + 0.5} r={0.62} fill={YARD_FILL[color]} opacity={0.2} />
                <circle cx={cell.col + 0.5} cy={cell.row + 0.5} r={0.62} fill="none" stroke={COLOR_HEX_DARK[color]} strokeWidth={0.06} opacity={0.45} />
              </g>
            ))}
            {/* Player name badge inside each yard. Clicking a teammate's
                badge fires a custom event that opens InlineRoomRail's
                emoji picker pre-targeted at them - lets "shoot this
                player" happen straight from the board, not just the
                buried Players side-panel. Also carries a small "N/4"
                home-progress pill so everyone can see at a glance how
                many of this player's tokens have made it home. */}
            {name && (() => {
              /* The badge is placed in SCREEN space, not board space.
                 It is 5 units wide and used to sit 2.8 above its yard centre;
                 once the board could rotate, counter-rotating it swung that
                 wide span perpendicular and shoved ~2 units of it off the
                 board edge — the plates rendered as "AJU" / "ONICA".
                 Anchoring to the yard CENTRE and offsetting by a rotated
                 2.4-unit vector keeps it the same distance "above" the tokens
                 from the player's point of view at any angle, while its
                 furthest corner stays inside the 6x6 yard. */
              const t = (-rotationDeg * Math.PI) / 180;
              const bx = c0 + 3 + 2.4 * Math.sin(t);
              const by = r0 + 3 - 2.4 * Math.cos(t);
              return (
              <g
                filter="url(#ludo-drop)"
                transform={`translate(${bx} ${by}) rotate(${-rotationDeg})`}
                ref={(el) => registerCard?.(pid!, el)}
                onClick={
                  pid && pid !== selfId
                    ? () => window.dispatchEvent(new CustomEvent("bhalyam:react-at-player", { detail: { playerId: pid } }))
                    : undefined
                }
                style={pid && pid !== selfId ? { cursor: "pointer" } : undefined}
              >
                {pid && pid !== selfId && <title>React at {name}</title>}
                <rect x={-2.5} y={-0.375} width={5} height={0.75} rx={0.38} fill={COLOR_HEX[color]} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.08} />
                {/* Inner gold trim line */}
                <rect x={-2.38} y={-0.275} width={4.76} height={0.55} rx={0.3} fill="none" stroke="#ffffff" strokeWidth={0.04} opacity={0.35} />
                <text x={-0.15} y={0.17} textAnchor="middle" fontSize="0.5" fontWeight="900" fill="#ffffff" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {name.slice(0, 12)}
                </text>
                {/* Home-progress corner badge: "N/4" tokens home, live during play. */}
                <circle cx={2.5} cy={-0.375} r={0.34} fill={COLOR_HEX_DARK[color]} stroke={PARCHMENT} strokeWidth={0.05} />
                <text x={2.5} y={-0.265} textAnchor="middle" fontSize="0.3" fontWeight="800" fill="#FFF">
                  {finishedCount[pid!] ?? 0}/4
                </text>
              </g>
              );
            })()}
          </g>
        );
      })}

      {/* Track cells — warm off-white with hairline gold-tan border */}
      {TRACK_CELLS.map((cell, idx) => (
        <g key={idx}>
          <rect x={cell.col + 0.04} y={cell.row + 0.04} width={1 - 0.08} height={1 - 0.08} rx={0.12} fill={TRACK_FILL} stroke="#A89978" strokeWidth={0.055} />
          {/* Subtle top highlight for bevel */}
          <line x1={cell.col + 0.15} y1={cell.row + 0.12} x2={cell.col + 0.85} y2={cell.row + 0.12} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={0.04} />
        </g>
      ))}

      {/* Entry squares — solid yard color so the start cell reads as
          "your launch pad", not a faded ghost. */}
      {ORDERED_COLORS.map((color) => {
        const startIdx = START_MAP[color];
        const cell = TRACK_CELLS[startIdx];
        return (
          <g key={color + "-start"}>
            <rect x={cell.col + 0.04} y={cell.row + 0.04} width={1 - 0.08} height={1 - 0.08} rx={0.12} fill={STRETCH_FILL[color]} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.08} />
          </g>
        );
      })}

      {/* Safe-square stars — gold with deep-gold halo for premium feel */}
      {[...SAFE_SQUARES].map((pos) => {
        const cell = TRACK_CELLS[pos];
        const safeColor = ORDERED_COLORS.find((c) => START_MAP[c] === pos || ((START_MAP[c] + 8) % 52) === pos) ?? "yellow";
        return (
          <g key={"safe" + pos}>
            <polygon
              points={starPoints(cell.col + 0.5, cell.row + 0.5, 0.35)}
              fill={COLOR_HEX[safeColor]}
              stroke={COLOR_HEX_DARK[safeColor]}
              strokeWidth={0.045}
            />
          </g>
        );
      })}

      {/* Home stretches — gradient strip in stretch color with rounded
          cells, dark trim inherited from the yard's frame. */}
      {ORDERED_COLORS.map((color) => (
        <g key={color + "-stretch"}>
          {STRETCH_CELLS[color].map((cell, i) => (
            <g key={i}>
              <rect x={cell.col + 0.04} y={cell.row + 0.04} width={1 - 0.08} height={1 - 0.08} rx={0.12} fill={STRETCH_FILL[color]} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.06} />
              <line x1={cell.col + 0.15} y1={cell.row + 0.12} x2={cell.col + 0.85} y2={cell.row + 0.12} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={0.04} />
            </g>
          ))}
        </g>
      ))}

      {/* Center: 4 deeper-toned triangles + gold star crest */}
      <g filter="url(#ludo-drop)">
        <polygon points="6,6 6,9 7.5,7.5" fill={YARD_FILL.red} />
        <polygon points="6,6 9,6 7.5,7.5" fill={YARD_FILL.green} />
        <polygon points="9,6 9,9 7.5,7.5" fill={YARD_FILL.yellow} />
        <polygon points="6,9 9,9 7.5,7.5" fill={YARD_FILL.blue} />
        {/* Frame */}
        <rect x={6} y={6} width={3} height={3} fill="none" stroke={WOOD_DARK} strokeWidth={0.1} />
        {/* Gold inner trim */}
        <rect x={6.12} y={6.12} width={2.76} height={2.76} fill="none" stroke={GOLD} strokeWidth={0.05} opacity={0.85} />
        {/* Central gold disc + crown — the "finish" crest (reference motif). */}
        <circle cx={7.5} cy={7.5} r={0.7} fill={GOLD} stroke={GOLD_DEEP} strokeWidth={0.08} />
        <text x={7.5} y={7.86} fontSize={0.95} textAnchor="middle" transform={`rotate(${-rotationDeg} 7.5 7.5)`} style={{ pointerEvents: "none" }}>
          👑
        </text>
      </g>

      {/* Arrows from each color's start square pointing into the track */}
      {ORDERED_COLORS.map((color) => {
        const d = ARROW_DIR[color];
        if (!d) return null;
        return (
          <g key={color + "-arrow"} transform={`rotate(${d.rot}, ${d.x}, ${d.y})`}>
            <polygon points={`${d.x - 0.25},${d.y - 0.15} ${d.x + 0.15},${d.y} ${d.x - 0.25},${d.y + 0.15}`} fill={COLOR_HEX_DARK[color]} opacity={0.85} />
          </g>
        );
      })}

      {/* Mandatory-capture lock at each player's home-stretch entrance */}
      {ORDERED_COLORS.map((color) => {
        const pid = playerIdByColor[color];
        if (!pid) return null;
        const captured = hasCaptured[pid] ?? false;
        const burstAt = unlockBurst[pid];
        const cell = STRETCH_ENTRY[color];
        if (!cell) return null;
        const cx = cell.col + 0.5;
        const cy = cell.row + 0.5;
        if (!captured && !burstAt) {
          // Show locked padlock
          return (
            <g key={color + "-lock"} className="lock-pulse" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r={0.45} fill="rgba(0,0,0,0.45)" />
              <text x={cx} y={cy + 0.22} textAnchor="middle" fontSize="0.7" transform={`rotate(${-rotationDeg} ${cx} ${cy})`}>
                🔒
              </text>
            </g>
          );
        }
        if (burstAt) {
          // Show unlock burst briefly
          return (
            <g key={color + "-unlock"} className="unlock-burst" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r={0.5} fill={COLOR_HEX[color]} opacity={0.85} />
              <text x={cx} y={cy + 0.25} textAnchor="middle" fontSize="0.8" transform={`rotate(${-rotationDeg} ${cx} ${cy})`}>
                🔓
              </text>
            </g>
          );
        }
        return null;
      })}
    </svg>
  );
}
