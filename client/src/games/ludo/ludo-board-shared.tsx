import type { LudoColor, LudoToken, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK, HOME_CENTER, SAFE_SQUARES, STRETCH_CELLS, TRACK_CELLS, YARD_CELLS, YARD_REGIONS } from "./board-layout";
import type { PolygonBoardGeometry } from "./polygon-board";

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

/** Slight per-color visual offset so overlapping tokens on the same cell don't fully overlap. */
export function colorOffset(color: LudoColor): { r: number; c: number } {
  switch (color) {
    case "red":    return { r: -1, c: -1 };
    case "green":  return { r: -1, c: 1 };
    case "yellow": return { r: 1, c: 1 };
    case "blue":   return { r: 1, c: -1 };
    case "purple": return { r: -0.6, c: 0 };
    case "cyan":   return { r: 0, c: 1 };
    case "orange": return { r: 0.6, c: 0 };
    case "brown":  return { r: 0, c: -1 };
  }
}

/** Small per-token nudge layered on top of colorOffset so 2+ tokens of the
 * SAME player stacked on one track cell fan out instead of fully
 * overlapping - colorOffset alone only separates different colors sharing
 * a cell, not same-color stacks. */
export function stackOffset(tokenIdx: number): { r: number; c: number } {
  const FAN: { r: number; c: number }[] = [
    { r: 0, c: 0 },
    { r: -0.13, c: 0.13 },
    { r: 0.13, c: 0.13 },
    { r: 0.13, c: -0.13 },
  ];
  return FAN[tokenIdx % 4] ?? FAN[0];
}

export type LudoHoverPreview =
  | { kind: "track"; trackPos: number }
  | { kind: "stretch"; stretchPos: number; color: LudoColor }
  | { kind: "home"; color: LudoColor };

/** Token sizes for the polygon (5-8 player) board, scaled to cell size.
 *  Yard well positions (print-board.ts) are now derived from each yard
 *  triangle's own taper, not a fixed cellSize-relative constant, so the
 *  4-token cluster fills most of the yard at any N — 1.0 keeps tokens
 *  comfortably inside that spread without touching their neighbors. */
export function polygonTokenSize(state: LudoToken["state"], cellSize: number): number {
  if (state === "yard") return cellSize * 1.0;
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
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: `${p.left}%`,
        top: `${p.top}%`,
        transform: "translate(-50%, -50%)",
        width: "8%",
        aspectRatio: "1 / 1",
      }}
    >
      <div
        className="w-full h-full rounded-md animate-pulse"
        style={{
          background: `${hex}55`,
          boxShadow: `0 0 0 3px ${hex}, 0 0 18px ${hex}`,
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
}: {
  playerColorsInRoom: LudoColor[];
  players: Player[];
  playerOrder: string[];
  playerColors: Record<string, LudoColor>;
  hasCaptured: Record<string, boolean>;
  unlockBurst: Record<string, number>;
  registerCard?: (playerId: string, el: SVGGElement | null) => void;
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
            {name && (
              <g
                filter="url(#ludo-drop)"
                ref={(el) => registerCard?.(pid!, el)}
                onClick={
                  pid && pid !== selfId
                    ? () => window.dispatchEvent(new CustomEvent("bhalyam:react-at-player", { detail: { playerId: pid } }))
                    : undefined
                }
                style={pid && pid !== selfId ? { cursor: "pointer" } : undefined}
              >
                {pid && pid !== selfId && <title>React at {name}</title>}
                <rect x={c0 + 0.5} y={r0 + 0.18} width={5} height={0.75} rx={0.38} fill={COLOR_HEX[color]} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.08} />
                {/* Inner gold trim line */}
                <rect x={c0 + 0.62} y={r0 + 0.28} width={4.76} height={0.55} rx={0.3} fill="none" stroke="#ffffff" strokeWidth={0.04} opacity={0.35} />
                <text x={c0 + 2.85} y={r0 + 0.72} textAnchor="middle" fontSize="0.5" fontWeight="900" fill="#ffffff" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {name.slice(0, 12)}
                </text>
                {/* Home-progress corner badge: "N/4" tokens home, live during play. */}
                <circle cx={c0 + 5.5} cy={r0 + 0.18} r={0.34} fill={COLOR_HEX_DARK[color]} stroke={PARCHMENT} strokeWidth={0.05} />
                <text x={c0 + 5.5} y={r0 + 0.29} textAnchor="middle" fontSize="0.3" fontWeight="800" fill="#FFF">
                  {finishedCount[pid!] ?? 0}/4
                </text>
              </g>
            )}
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
        {/* Central gold disc + star — "finish" crest */}
        <circle cx={7.5} cy={7.5} r={0.62} fill={GOLD} stroke={GOLD_DEEP} strokeWidth={0.08} />
        <text x={7.5} y={7.78} fontSize={0.92} textAnchor="middle" fill={WOOD_DARK} fontWeight="900" style={{ paintOrder: "stroke", stroke: GOLD_DEEP, strokeWidth: 0.03 }}>
          ★
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
              <text x={cx} y={cy + 0.22} textAnchor="middle" fontSize="0.7">
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
              <text x={cx} y={cy + 0.25} textAnchor="middle" fontSize="0.8">
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
