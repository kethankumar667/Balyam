import type { LudoColor, LudoToken, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK, HOME_CENTER, SAFE_SQUARES, STRETCH_CELLS, TRACK_CELLS, YARD_CELLS, YARD_REGIONS } from "./board-layout";
import type { PolygonBoardGeometry } from "./polygon-board";
import {
  INK,
  GRID_STROKE as PRINT_GRID_STROKE,
  LANE_STROKE as PRINT_LANE_STROKE,
  RIM_STROKE as PRINT_RIM_STROKE,
  PRINT_CELL,
  LockMark,
  rosettePts,
  starPts,
} from "./print-marks";
import { YARD_TOKEN_W, HOME_TOKEN_W } from "./print-board";
import { ordinal } from "@shared/ludo-rules";

/**
 * Ludo — shared render primitives.
 *
 * Pure geometry helpers + the board SVG itself. Deliberately has ZERO
 * dependency on useLudoBoard (no import cycle): both the hook and the
 * composite layout components (ludo-board-composites.tsx) import from here.
 */

export const GRID = 15;

/**
 * The print stroke weights are expressed in the 5-8 board's 100-unit viewBox.
 * This board is 15 units across, so using them raw drew every line ~6.7x too
 * heavy — hairline cell borders came out as thick bars and the rim as a slab.
 * Converting keeps both boards at the SAME on-screen line weight, which is
 * most of what makes them read as one design.
 */
const VB = GRID / 100;
const GRID_STROKE = PRINT_GRID_STROKE * VB;
const LANE_STROKE = PRINT_LANE_STROKE * VB;
const RIM_STROKE = PRINT_RIM_STROKE * VB;

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
  // Must match HOME_TOKEN_W, which the centre-wedge slot geometry is solved
  // against — a literal here is exactly how the old 1.05 drifted out of step
  // with the slots and left finished tokens overhanging the wedge.
  if (state === "home") return cellSize * HOME_TOKEN_W;
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
// The 2-4 player board is now PRINTED rather than upholstered, matching the
// 5-8 boards: a white play field, one ink colour for every line, flat seat
// colour for anything belonging to a player. The wood / felt / gold
// vocabulary this board used to share with nothing else is gone. These
// aliases are kept so the markup below still reads the same.
const PARCHMENT      = "#FFFFFF";
const PARCHMENT_DEEP = "#FFFFFF";
const TRACK_FILL     = PRINT_CELL;
const TRACK_BORDER   = INK;
const WOOD_DARK      = INK;
const GOLD           = INK;
const GOLD_DEEP      = INK;

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
  finishOrder = [],
  rotationDeg = 0,
  paint,
}: {
  playerColorsInRoom: LudoColor[];
  players: Player[];
  playerOrder: string[];
  /** Board ARM per player — geometry. Never the color they are painted in. */
  playerColors: Record<string, LudoColor>;
  /** Arm -> paint color. An arm nobody occupies keeps its own color, so an
   *  empty wedge still looks like a wedge. This is what lets a player who
   *  picked purple sit on the cross board's four-arm geometry and still be
   *  purple everywhere: tokens, yard, home lane and name plate. */
  paint?: Partial<Record<LudoColor, LudoColor>>;
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
  /** Seats that are all-home, in the order they got there. A player's index
   *  here is their PLACE, which is stamped across their emptied yard. */
  finishOrder?: string[];
}) {
  // Every fill below goes through these, so an arm is drawn in its
  // occupant's color rather than its own.
  const pc = (c: LudoColor): LudoColor => paint?.[c] ?? c;
  const CH = (c: LudoColor) => COLOR_HEX[pc(c)];
  const CHD = (c: LudoColor) => COLOR_HEX_DARK[pc(c)];
  const SF = (c: LudoColor) => STRETCH_FILL[pc(c)];
  const YF = (c: LudoColor) => YARD_FILL[pc(c)];

  /**
   * An arm with no player must look empty EVERYWHERE, not just in its yard.
   * The yard already dimmed, but the home lane, start square, safe star and
   * centre sector all stayed at full strength — so an empty red arm still
   * read as an occupied one, which is misleading at a glance on a 2-3 player
   * table.
   */
  const armOpacity = (c: LudoColor) => (playerColorsInRoom.includes(c) ? 1 : 0.16);

  // Map ARM -> playerId for this room
  const playerIdByColor: Partial<Record<LudoColor, string | null>> = {};
  for (const pid of playerOrder) {
    const c = playerColors[pid];
    if (c) playerIdByColor[c] = pid;
  }

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      className="absolute inset-0 w-full h-full rounded-md"
      style={{ background: "#FFFFFF" }}
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
        {/* Flat seat fills. The radial inset-bowl gradient that used to live
            here is the single biggest thing that made this board read as a
            different product from the 5-8 print boards. */}
        {ORDERED_COLORS.map((color) => (
          <linearGradient key={color + "-yard-grad"} id={`ludo-yard-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={YF(color)} />
            <stop offset="100%" stopColor={YF(color)} />
          </linearGradient>
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
      <rect x={RIM_STROKE / 2} y={RIM_STROKE / 2} width={GRID - RIM_STROKE} height={GRID - RIM_STROKE} rx={0.3}
            fill="none" stroke={INK} strokeWidth={RIM_STROKE} />

      {/* 4 yard quadrants */}
      {ORDERED_COLORS.map((color) => {
        const { r0, c0 } = YARD_REGIONS[color];
        const inactive = !playerColorsInRoom.includes(color);
        const pid = playerIdByColor[color];
        const seat = pid ? players.find((p) => p.id === pid) ?? null : null;
        const name = seat?.name ?? null;
        /** 1-based finishing place, or 0 while they are still playing. Their
         *  yard is empty by then — all four tokens are home — so the number
         *  has the whole pad to itself. */
        const place = pid ? finishOrder.indexOf(pid) + 1 : 0;
        /** The server is playing this seat. Shown to EVERYONE: a table needs
         *  to know why a player keeps moving without being there. */
        const autoPlaying = seat?.isAutoPlaying === true;
        /** Permanently out via the auto-play turn cap — distinct from
         *  `autoPlaying`, which is temporary and ends on reconnect. Shares
         *  the same badge layout (left-aligned icon, shifted name) since
         *  both mean "this seat isn't really here", but the tooltip and
         *  icon differ: nobody is playing FOR a quit seat, the table has
         *  simply moved on without it. */
        const hasQuit = seat?.hasQuit === true;
        const showAwayBadge = autoPlaying || hasQuit;
        return (
          <g key={color} opacity={inactive ? 0.45 : 1}>
            {/* Outer colored frame with rounded corner */}
            <rect x={c0 + 0.2} y={r0 + 0.2} width={6 - 0.4} height={6 - 0.4} rx={0.25} fill={`url(#ludo-yard-${color})`} stroke={INK} strokeWidth={LANE_STROKE} />
            {/* Inner cream pad where tokens park */}
            <rect x={c0 + 1} y={r0 + 1} width={4} height={4} rx={0.2} fill={PRINT_CELL} stroke={INK} strokeWidth={GRID_STROKE} />

            {/* FINISHING PLACE, stamped across the emptied yard.
                Only appears once all four of this player's tokens are home,
                which is exactly when the pad is free — so a big numeral costs
                nothing and turns a blank quadrant into the scoreboard. Drawn
                under the tokens layer and counter-rotated, like the name
                plate, so it stays upright however the board is spun. */}
            {place > 0 && (
              <g
                transform={`translate(${c0 + 3} ${r0 + 3}) rotate(${-rotationDeg})`}
                style={{ pointerEvents: "none" }}
              >
                <title>{name} finished {ordinal(place)}</title>
                <text
                  textAnchor="middle"
                  y={1.05}
                  fontSize="3.2"
                  fontWeight="900"
                  fill={CH(color)}
                  stroke={CHD(color)}
                  strokeWidth={0.11}
                  paintOrder="stroke"
                  opacity={0.92}
                >
                  {place}
                </text>
                <text
                  textAnchor="middle"
                  y={1.75}
                  fontSize="0.62"
                  fontWeight="800"
                  fill={CHD(color)}
                  style={{ textTransform: "uppercase", letterSpacing: "0.14em" }}
                >
                  {ordinal(place).slice(String(place).length)}
                </text>
              </g>
            )}
            {/* Faint hand-drawn crown watermark behind the parked tokens —
                the reference's per-quadrant motif. Decorative only. */}
            <g
              transform={`translate(${c0 + 3} ${r0 + 3}) rotate(${-rotationDeg})`}
              opacity={0.14}
              style={{ pointerEvents: "none" }}
            >
              <polygon points={rosettePts(4, 1.15)} fill="none" stroke={INK} strokeWidth={LANE_STROKE} />
              <polygon points={starPts(0.5)} fill={INK} />
            </g>
            {/* Token slot circles — slightly darker so they read as a
                landing pad rather than a faint ghost. */}
            {YARD_CELLS[color].map((cell, i) => (
              <g key={i}>
                <circle cx={cell.col + 0.5} cy={cell.row + 0.5} r={0.62} fill={YF(color)} opacity={0.2} />
                <circle cx={cell.col + 0.5} cy={cell.row + 0.5} r={0.62} fill="none" stroke={CHD(color)} strokeWidth={0.06} opacity={0.45} />
              </g>
            ))}
            {/* Player name badge inside each yard. Clicking a teammate's
                badge fires a custom event that opens InlineRoomRail's
                emoji picker pre-targeted at them - lets "shoot this
                player" happen straight from the board, not just the
                buried Players side-panel. */}
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
                <rect x={-2.5} y={-0.375} width={5} height={0.75} rx={0.38} fill={CH(color)} stroke={CHD(color)} strokeWidth={0.08} />
                {/* Inner gold trim line */}
                <rect x={-2.38} y={-0.275} width={4.76} height={0.55} rx={0.3} fill="none" stroke="#ffffff" strokeWidth={0.04} opacity={0.35} />
                {/* Robot badge — rides the name plate rather than the yard pad,
                    because the pad is where tokens park and a badge there
                    would sit under one. Left end, so the name still centres
                    close to where it always did. */}
                {showAwayBadge && (
                  <g transform="translate(-1.95 0)">
                    <title>
                      {hasQuit
                        ? `${name} quit — the table played their turns for too long and moved on without them`
                        : `${name} is away — the table is playing their turns`}
                    </title>
                    <circle r={0.3} fill="#ffffff" opacity={0.92} />
                    {hasQuit ? (
                      // A simple "×" rather than the robot face — nobody is
                      // playing FOR this seat, it's just permanently skipped.
                      <g stroke={CHD(color)} strokeWidth={0.06} strokeLinecap="round">
                        <path d="M-0.13 -0.13 L0.13 0.13 M0.13 -0.13 L-0.13 0.13" />
                      </g>
                    ) : (
                      <g stroke={CHD(color)} strokeWidth={0.055} fill="none" strokeLinecap="round">
                        {/* antenna */}
                        <path d="M0 -0.235 v -0.075" />
                        <circle cx={0} cy={-0.3} r={0.045} fill={CHD(color)} stroke="none" />
                        {/* head */}
                        <rect x={-0.17} y={-0.19} width={0.34} height={0.3} rx={0.08} />
                      </g>
                    )}
                    {!hasQuit && (
                      <>
                        {/* eyes */}
                        <circle cx={-0.07} cy={-0.05} r={0.037} fill={CHD(color)} />
                        <circle cx={0.07} cy={-0.05} r={0.037} fill={CHD(color)} />
                      </>
                    )}
                  </g>
                )}
                <text
                  x={showAwayBadge ? 0.15 : -0.15}
                  y={0.17}
                  textAnchor="middle"
                  fontSize="0.5"
                  fontWeight="900"
                  fill="#ffffff"
                  style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  {name.slice(0, showAwayBadge ? 10 : 12)}
                </text>
                {/* The "N/4" home-progress pill that used to sit here was
                    removed at the user's request: the seat cards already
                    carry four pips each showing exactly the same thing, and
                    on a phone the badge was an unreadable ~10px disc that
                    only added clutter to the name plate. */}
              </g>
              );
            })()}
          </g>
        );
      })}

      {/* Track cells — warm off-white with hairline gold-tan border */}
      {TRACK_CELLS.map((cell, idx) => (
        <g key={idx}>
          <rect x={cell.col} y={cell.row} width={1} height={1} fill={PRINT_CELL} stroke={INK} strokeWidth={GRID_STROKE} />
        </g>
      ))}

      {/* Entry squares — solid yard color so the start cell reads as
          "your launch pad", not a faded ghost. */}
      {ORDERED_COLORS.map((color) => {
        const startIdx = START_MAP[color];
        const cell = TRACK_CELLS[startIdx];
        return (
          <g key={color + "-start"} opacity={armOpacity(color)}>
            <rect x={cell.col} y={cell.row} width={1} height={1} fill={CH(color)} stroke={INK} strokeWidth={LANE_STROKE} />
          </g>
        );
      })}

      {/* Safe-square stars — gold with deep-gold halo for premium feel */}
      {[...SAFE_SQUARES].map((pos) => {
        const cell = TRACK_CELLS[pos];
        const safeColor = ORDERED_COLORS.find((c) => START_MAP[c] === pos || ((START_MAP[c] + 8) % 52) === pos) ?? "yellow";
        return (
          <g key={"safe" + pos} opacity={armOpacity(safeColor)}>
            <polygon
              // A start square is itself a safe square, and it is already
              // filled with the seat colour — so a seat-coloured star on it
              // was invisible. On colour, print white; on the white track,
              // print the seat colour.
              points={starPoints(cell.col + 0.5, cell.row + 0.5, 0.34)}
              fill={START_MAP[safeColor] === pos ? PRINT_CELL : CH(safeColor)}
              stroke={INK}
              strokeWidth={GRID_STROKE}
            />
          </g>
        );
      })}

      {/* Home stretches — gradient strip in stretch color with rounded
          cells, dark trim inherited from the yard's frame. */}
      {ORDERED_COLORS.map((color) => (
        <g key={color + "-stretch"} opacity={armOpacity(color)}>
          {STRETCH_CELLS[color].map((cell, i) => (
            <g key={i}>
              <rect x={cell.col} y={cell.row} width={1} height={1} fill={CH(color)} stroke={INK} strokeWidth={GRID_STROKE} />
            </g>
          ))}
        </g>
      ))}

      {/* Center: 4 deeper-toned triangles + gold star crest */}
      <g filter="url(#ludo-drop)">
        <polygon points="6,6 6,9 7.5,7.5" fill={YF("red")} fillOpacity={armOpacity("red")} stroke={INK} strokeWidth={GRID_STROKE} />
        <polygon points="6,6 9,6 7.5,7.5" fill={YF("green")} fillOpacity={armOpacity("green")} stroke={INK} strokeWidth={GRID_STROKE} />
        <polygon points="9,6 9,9 7.5,7.5" fill={YF("yellow")} fillOpacity={armOpacity("yellow")} stroke={INK} strokeWidth={GRID_STROKE} />
        <polygon points="6,9 9,9 7.5,7.5" fill={YF("blue")} fillOpacity={armOpacity("blue")} stroke={INK} strokeWidth={GRID_STROKE} />
        {/* Frame */}
        <rect x={6} y={6} width={3} height={3} fill="none" stroke={INK} strokeWidth={LANE_STROKE} />
        {/* Rosette medallion — the same hub motif the 5-8 print boards use,
            one point per arm. Replaces the gold disc and the 👑 emoji, which
            was the last non-vector mark on the board and rendered differently
            on every OS. */}
        <g transform={`translate(7.5 7.5)`}>
          <circle r={0.8} fill={PRINT_CELL} stroke={INK} strokeWidth={LANE_STROKE} />
          <polygon points={rosettePts(4, 0.6)} fill="none" stroke={INK} strokeWidth={GRID_STROKE} />
          <polygon points={starPts(0.32)} fill={INK} />
        </g>
      </g>

      {/* Arrows from each color's start square pointing into the track */}
      {ORDERED_COLORS.map((color) => {
        const d = ARROW_DIR[color];
        if (!d) return null;
        return (
          <g key={color + "-arrow"} opacity={armOpacity(color)} transform={`rotate(${d.rot}, ${d.x}, ${d.y})`}>
            <polygon points={`${d.x - 0.24},${d.y - 0.16} ${d.x + 0.18},${d.y} ${d.x - 0.24},${d.y + 0.16}`} fill={INK} />
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
              <g transform={`translate(${cx} ${cy}) rotate(${-rotationDeg})`}>
                <LockMark s={0.62} />
              </g>
            </g>
          );
        }
        if (burstAt) {
          // Show unlock burst briefly
          return (
            <g key={color + "-unlock"} className="unlock-burst" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r={0.5} fill={CH(color)} opacity={0.85} />
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
