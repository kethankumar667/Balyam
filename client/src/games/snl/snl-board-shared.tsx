import { useMemo } from "react";
import type { CoinColor, Player, SnlEvent, SnlState } from "@shared/types";
import { COIN_COLOR_HEX } from "../../components/CoinColorPicker";
import { Dice } from "../ludo/Dice";

/**
 * Snakes & Ladders — shared presentational layer.
 *
 * Every constant, pure geometry helper and dumb sub-component the board needs
 * lives here so the mobile and desktop shells import ONE source of truth and
 * never duplicate the (sizeable) SVG board markup. Logic/state live in
 * useSnlBoard; this file is render-only.
 */

const BOARD_SIZE = 100;
const CELL = BOARD_SIZE / 10;
const START_ZONE_Y = 105.5;

// Cell palette: five muted jewel tones cycled across the grid. Bright
// enough to read as a "real board" yet desaturated so they sit politely
// under the snake/ladder graphics. Numbers print in deep walnut on every
// tone — the palette is tuned so dark walnut hits ≥4.5:1 contrast across
// all five cells.
const CELL_COLORS = [
  "#FBE7D2", // warm peach
  "#D8E8C8", // soft sage
  "#F8E1A0", // butter cream
  "#C8DBE8", // dusty blue
  "#E4D0E8", // soft lavender
];
const CELL_DARK   = ["#A88248", "#A88248", "#A88248", "#A88248", "#A88248"];
const CELL_BORDER  = "#C8A66B";
const CELL_INK     = "#2B1B0F";
const FINISH_GOLD  = "#E0AE3B";
const FINISH_GOLD_DEEP = "#9A6E1A";

// Snake palettes — dignified, muted, scaled-creature feel.
//   body+gradEnd → linear gradient down the spine
//   outline      → thin dark contour
//   spot         → small accent dots that hint at scale pattern
const SNAKE_PALETTES = [
  { body: "#4D7C3A", gradEnd: "#22421E", outline: "#0F2A0E", spot: "#A8C879" }, // forest green
  { body: "#A86E2F", gradEnd: "#5A3B16", outline: "#2F1A06", spot: "#E5BE7E" }, // bronze
  { body: "#48556C", gradEnd: "#1F2937", outline: "#0F172A", spot: "#94A3B8" }, // slate
  { body: "#7C5295", gradEnd: "#3F2A52", outline: "#1E0F2E", spot: "#D4B8E5" }, // plum
  { body: "#B65441", gradEnd: "#6B2918", outline: "#2C0F08", spot: "#F5C4B5" }, // terracotta
];

// Ladder wood tones.
const LADDER_WOOD_TOP    = "#B07740";
const LADDER_WOOD_BOTTOM = "#6E4422";
const LADDER_WOOD_DARK   = "#3F2412";
const LADDER_RUNG        = "#8E5B30";

function cellInfo(n: number): { x: number; y: number; row: number; col: number; color: string; dark: string } {
  const idx = n - 1;
  const row = Math.floor(idx / 10);
  let col = idx % 10;
  if (row % 2 === 1) col = 9 - col;
  const colorIdx = (row + col) % CELL_COLORS.length;
  return {
    x: col * CELL + CELL / 2,
    y: (9 - row) * CELL + CELL / 2,
    row,
    col,
    color: CELL_COLORS[colorIdx],
    dark: CELL_DARK[colorIdx],
  };
}

function squareCenter(n: number, slot: number, totalAtStart: number): { x: number; y: number } {
  if (n <= 0) {
    // Spread up to 10 spots evenly across the start zone (x in [6, 94]).
    const span = totalAtStart > 1 ? 88 / (totalAtStart - 1) : 0;
    return { x: 6 + slot * span, y: START_ZONE_Y };
  }
  const info = cellInfo(n);
  return { x: info.x, y: info.y };
}

function tokenFanOffset(slot: number, total: number): { dx: number; dy: number; r: number } {
  if (total <= 1) return { dx: 0, dy: 0, r: 2.4 };
  const angle = (slot / total) * Math.PI * 2 - Math.PI / 2;
  const ringR = total <= 4 ? 1.8 : total <= 6 ? 2.0 : 2.3;
  const tokenR = total <= 4 ? 2.0 : total <= 7 ? 1.55 : 1.3;
  return { dx: Math.cos(angle) * ringR, dy: Math.sin(angle) * ringR, r: tokenR };
}

function bezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

// Auto-assign coin colors to players who didn't pick in the lobby.
const AUTO_FALLBACK_ORDER: CoinColor[] = [
  "red", "blue", "green", "yellow", "purple",
  "cyan", "orange", "pink", "lime", "magenta",
];

export function resolveCoinColors(playerOrder: string[], players: Player[]): Record<string, CoinColor> {
  const map: Record<string, CoinColor> = {};
  const taken = new Set<CoinColor>();
  for (const id of playerOrder) {
    const p = players.find((pp) => pp.id === id);
    if (p?.coinColor) {
      map[id] = p.coinColor;
      taken.add(p.coinColor);
    }
  }
  for (const id of playerOrder) {
    if (map[id]) continue;
    const next = AUTO_FALLBACK_ORDER.find((c) => !taken.has(c)) ?? "red";
    map[id] = next;
    taken.add(next);
  }
  return map;
}

/* ─────────────────────────── Difficulty badge ─────────────────────────── */

// Hoisted out of render — the meta table is static, no reason to rebuild it
// on every paint.
const DIFFICULTY_META: Record<
  SnlState["config"]["difficulty"],
  { emoji: string; label: string; color: string }
> = {
  easy:    { emoji: "🌱", label: "Easy",    color: "#22c55e" },
  medium:  { emoji: "⚖️", label: "Medium",  color: "#3b82f6" },
  hard:    { emoji: "🔥", label: "Hard",    color: "#f97316" },
  extreme: { emoji: "💀", label: "Extreme", color: "#ef4444" },
};

export function DifficultyBadge({ difficulty }: { difficulty: SnlState["config"]["difficulty"] }) {
  const m = DIFFICULTY_META[difficulty] ?? DIFFICULTY_META.medium;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1"
      style={{ background: m.color, color: "#0f172a" }}
    >
      <span>{m.emoji}</span>
      {m.label}
    </span>
  );
}

/* ─────────────────────────── Board SVG layers ─────────────────────────── */

/**
 * SVG <defs> block — gradients, filters, and patterns reused across the
 * board so individual cells/snakes/ladders stay declarative.
 */
function BoardDefs({ ladderCount, snakeCount }: { ladderCount: number; snakeCount: number }) {
  // Per-snake body gradients depend only on the snake count — memoise so a
  // dice/turn re-render doesn't regenerate the gradient nodes.
  const snakeGradients = useMemo(
    () =>
      Array.from({ length: snakeCount }, (_, i) => {
        const p = SNAKE_PALETTES[i % SNAKE_PALETTES.length];
        return (
          <linearGradient key={`snake-grad-${i}`} id={`snl-snake-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.body} />
            <stop offset="100%" stopColor={p.gradEnd} />
          </linearGradient>
        );
      }),
    [snakeCount]
  );
  return (
    <defs>
      {/* Ladder wood — rails get a vertical gradient so they read as round
          poles instead of flat lines. */}
      <linearGradient id="snl-ladder-rail" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={LADDER_WOOD_DARK} />
        <stop offset="38%" stopColor={LADDER_WOOD_TOP} />
        <stop offset="58%" stopColor="#D6A06A" />
        <stop offset="100%" stopColor={LADDER_WOOD_BOTTOM} />
      </linearGradient>

      {/* Subtle drop shadow used by ladders + snakes so they appear to sit
          ABOVE the board cells instead of flat with them. */}
      <filter id="snl-drop" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.35" />
        <feOffset dx="0" dy="0.45" result="off" />
        <feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Square 100 — gold finish square uses a sun-burst gradient. */}
      <radialGradient id="snl-finish" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stopColor="#FFF1B8" />
        <stop offset="45%" stopColor={FINISH_GOLD} />
        <stop offset="100%" stopColor={FINISH_GOLD_DEEP} />
      </radialGradient>

      {snakeGradients}

      {/* Reserved for ladder shadow indexing — keeps prop unused but ready. */}
      <metadata>{ladderCount}</metadata>
    </defs>
  );
}

// The 100-cell grid is fully static — compute it ONCE at module load instead
// of re-running cellInfo 100× on every render.
const BOARD_GRID_CELLS: JSX.Element[] = (() => {
  const cells: JSX.Element[] = [];
  for (let n = 1; n <= 100; n++) {
    const info = cellInfo(n);
    const x = info.x - CELL / 2;
    const y = info.y - CELL / 2;
    const isFinish = n === 100;
    cells.push(
      <g key={n}>
        {/* Base cell — small inset so a hairline of board parchment shows
            between cells, giving the grid a subtle relief. */}
        <rect
          x={x + 0.12}
          y={y + 0.12}
          width={CELL - 0.24}
          height={CELL - 0.24}
          rx={0.7}
          fill={isFinish ? "url(#snl-finish)" : info.color}
          stroke={CELL_BORDER}
          strokeWidth={0.18}
        />
        {/* Inner highlight — thin top stroke that suggests a beveled edge. */}
        <line
          x1={x + 0.5}
          y1={y + 0.5}
          x2={x + CELL - 0.5}
          y2={y + 0.5}
          stroke="#FFFFFF"
          strokeOpacity={0.55}
          strokeWidth={0.12}
        />
        {/* Number — top-left, deep walnut for both tones, hairline halo. */}
        <text
          x={x + 1.2}
          y={y + 3.2}
          fontSize="2.6"
          fill={CELL_INK}
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          style={{
            paintOrder: "stroke",
            stroke: "#FFFFFF",
            strokeWidth: 0.45,
            strokeOpacity: 0.7,
          }}
        >
          {n}
        </text>
        {isFinish && (
          <>
            {/* A simple flag glyph; sits in the lower-right so it doesn't
                fight the "100" number. */}
            <g transform={`translate(${info.x + 1.5}, ${info.y + 2.0})`}>
              <line x1={0} y1={-1.8} x2={0} y2={2.4} stroke={FINISH_GOLD_DEEP} strokeWidth={0.35} strokeLinecap="round" />
              <path d="M 0 -1.8 L 2.4 -1.2 L 0 -0.4 Z" fill={FINISH_GOLD_DEEP} />
            </g>
          </>
        )}
      </g>
    );
  }
  return cells;
})();

function StartZone({ count }: { count: number }) {
  return (
    <g>
      <rect
        x={1.5}
        y={101.5}
        width={97}
        height={9}
        rx={1.4}
        fill="#FBF4DE"
        stroke="#6B4422"
        strokeWidth={0.35}
      />
      {/* Inner gold bevel */}
      <rect
        x={2.0}
        y={102.0}
        width={96}
        height={8}
        rx={1.1}
        fill="none"
        stroke={FINISH_GOLD}
        strokeWidth={0.18}
        opacity={0.85}
      />
      <text
        x={3.5}
        y={107.8}
        fontSize="2.4"
        fill={CELL_INK}
        fontWeight="900"
        letterSpacing="0.3"
      >
        START
      </text>
      {count > 0 && (
        <text x={96.5} y={107.6} fontSize="1.8" fill="#5C3A1A" fontWeight="700" textAnchor="end">
          {count} waiting
        </text>
      )}
    </g>
  );
}

function LaddersLayer({ ladders }: { ladders: Record<number, number> }) {
  // Geometry is a pure function of the ladder config; memoise so a roll/turn
  // re-render doesn't recompute every rail + rung.
  const parts = useMemo(() => {
    const out: JSX.Element[] = [];
    for (const [startStr, endN] of Object.entries(ladders)) {
      const startN = Number(startStr);
      const a = cellInfo(startN);
      const b = cellInfo(endN);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const nx = -dy / len;
      const ny = dx / len;
      // Rail separation (a touch wider than before for a sturdier look).
      const w = 1.7;
      const ax1 = a.x + nx * w, ay1 = a.y + ny * w;
      const ax2 = a.x - nx * w, ay2 = a.y - ny * w;
      const bx1 = b.x + nx * w, by1 = b.y + ny * w;
      const bx2 = b.x - nx * w, by2 = b.y - ny * w;
      const rungs = Math.max(3, Math.floor(len / 3.0));
      const rungLines: JSX.Element[] = [];
      for (let i = 1; i < rungs; i++) {
        const t = i / rungs;
        const rx1 = ax1 + (bx1 - ax1) * t;
        const ry1 = ay1 + (by1 - ay1) * t;
        const rx2 = ax2 + (bx2 - ax2) * t;
        const ry2 = ay2 + (by2 - ay2) * t;
        rungLines.push(
          <g key={`r-${startN}-${i}`}>
            {/* Rung shadow under the rung gives it depth */}
            <line
              x1={rx1}
              y1={ry1 + 0.18}
              x2={rx2}
              y2={ry2 + 0.18}
              stroke={LADDER_WOOD_DARK}
              strokeWidth={0.85}
              strokeLinecap="round"
              opacity={0.55}
            />
            <line
              x1={rx1}
              y1={ry1}
              x2={rx2}
              y2={ry2}
              stroke={LADDER_RUNG}
              strokeWidth={0.75}
              strokeLinecap="round"
            />
            {/* Thin upper highlight on the rung */}
            <line
              x1={rx1}
              y1={ry1 - 0.18}
              x2={rx2}
              y2={ry2 - 0.18}
              stroke="#E0B981"
              strokeWidth={0.18}
              strokeLinecap="round"
              opacity={0.7}
            />
          </g>
        );
      }
      out.push(
        <g key={`ladder-${startN}`} filter="url(#snl-drop)">
          {/* Rail outline */}
          <line x1={ax1} y1={ay1} x2={bx1} y2={by1} stroke={LADDER_WOOD_DARK} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={ax2} y1={ay2} x2={bx2} y2={by2} stroke={LADDER_WOOD_DARK} strokeWidth={1.5} strokeLinecap="round" />
          {/* Rail wood */}
          <line x1={ax1} y1={ay1} x2={bx1} y2={by1} stroke="url(#snl-ladder-rail)" strokeWidth={1.1} strokeLinecap="round" />
          <line x1={ax2} y1={ay2} x2={bx2} y2={by2} stroke="url(#snl-ladder-rail)" strokeWidth={1.1} strokeLinecap="round" />
          {/* Subtle rail highlight strip on the lit edge */}
          <line
            x1={ax1 - nx * 0.18}
            y1={ay1 - ny * 0.18}
            x2={bx1 - nx * 0.18}
            y2={by1 - ny * 0.18}
            stroke="#F2C78A"
            strokeWidth={0.18}
            strokeLinecap="round"
            opacity={0.7}
          />
          <line
            x1={ax2 + nx * 0.18}
            y1={ay2 + ny * 0.18}
            x2={bx2 + nx * 0.18}
            y2={by2 + ny * 0.18}
            stroke="#F2C78A"
            strokeWidth={0.18}
            strokeLinecap="round"
            opacity={0.7}
          />
          {rungLines}
        </g>
      );
    }
    return out;
  }, [ladders]);
  return <>{parts}</>;
}

function SnakesLayer({ snakes }: { snakes: Record<number, number> }) {
  // A realistic serpent: a TAPERED filled body (thick at the head, thinning to
  // the tail) winding along a multi-bend spine, with a dorsal diamond pattern,
  // a belly highlight, a wedge head with eyes + nostrils, and a flicking forked
  // tongue. Pure function of the snake config, so it's memoised.
  const parts = useMemo(() => {
    const entries = Object.entries(snakes)
      .map(([h, t]) => [Number(h), t] as const)
      .sort((a, b) => a[0] - b[0]);
    return entries.map(([headN, tailN], idx) => {
      const palette = SNAKE_PALETTES[idx % SNAKE_PALETTES.length];
      const gradientId = `snl-snake-${idx}`;
      const head = cellInfo(headN);
      const tail = cellInfo(tailN);
      const dx = tail.x - head.x;
      const dy = tail.y - head.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;       // head → tail unit
      const px = -uy, py = ux;                   // left-perpendicular

      // Serpentine centreline: lerp head→tail + a sine sway that's zero at both
      // ends (even number of half-waves), more bends for longer snakes.
      const bends = Math.max(1, Math.round(len / 24));
      const amp = Math.min(6.5, len * 0.15);
      const STEPS = 30;
      const center = (t: number) => {
        const off = amp * Math.sin(t * Math.PI * 2 * bends);
        return { x: head.x + dx * t + px * off, y: head.y + dy * t + py * off };
      };
      const pts = Array.from({ length: STEPS + 1 }, (_, s) => center(s / STEPS));

      // Body width tapers from head to tail.
      const wHead = 2.7, wTail = 0.45;
      const widthAt = (t: number) => wTail + (wHead - wTail) * Math.pow(1 - t, 0.85);

      // Local tangent/normal per sample (finite difference).
      const norm = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(STEPS, i + 1)];
        const tx = b.x - a.x, ty = b.y - a.y;
        const tl = Math.hypot(tx, ty) || 1;
        return { x: -ty / tl, y: tx / tl };
      });

      // Tapered outline: left edge head→tail, then right edge tail→head.
      const left = pts.map((p, i) => {
        const w = widthAt(i / STEPS) / 2;
        return `${(p.x + norm[i].x * w).toFixed(2)} ${(p.y + norm[i].y * w).toFixed(2)}`;
      });
      const right = pts
        .map((p, i) => {
          const w = widthAt(i / STEPS) / 2;
          return `${(p.x - norm[i].x * w).toFixed(2)} ${(p.y - norm[i].y * w).toFixed(2)}`;
        })
        .reverse();
      const bodyPath = `M ${left[0]} L ${left.slice(1).join(" L ")} L ${right.join(" L ")} Z`;

      // Dorsal diamond pattern down the spine.
      const diamonds = [0.2, 0.33, 0.46, 0.58, 0.7, 0.8].map((t, i) => {
        const si = Math.round(t * STEPS);
        const p = pts[si];
        const n = norm[si];
        const w = widthAt(t) * 0.34;
        const fb = ux * (widthAt(t) * 0.55), fbq = uy * (widthAt(t) * 0.55);
        const a = `${p.x + n.x * w},${p.y + n.y * w}`;
        const b = `${p.x + fb},${p.y + fbq}`;
        const c = `${p.x - n.x * w},${p.y - n.y * w}`;
        const d2 = `${p.x - fb},${p.y - fbq}`;
        return (
          <polygon
            key={`dia-${headN}-${i}`}
            points={`${a} ${b} ${c} ${d2}`}
            fill={palette.gradEnd}
            opacity={0.5}
          />
        );
      });

      // Head frame: wedge oriented along the initial tangent.
      const t0 = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
      const headDeg = (Math.atan2(t0.y, t0.x) * 180) / Math.PI;
      const n0 = norm[0];
      // Tongue base sits just ahead of the head tip (opposite the body dir).
      const tipX = head.x - ux * 2.6, tipY = head.y - uy * 2.6;

      return (
        <g key={`snake-${headN}`} filter="url(#snl-drop)">
          {/* Forked tongue — drawn under the head so the head overlaps its base */}
          <g stroke="#C2272D" strokeWidth={0.34} fill="none" strokeLinecap="round">
            <path d={`M ${head.x - ux * 1.4} ${head.y - uy * 1.4} L ${tipX} ${tipY}`} />
            <path d={`M ${tipX} ${tipY} L ${tipX - ux * 1.0 + n0.x * 0.9} ${tipY - uy * 1.0 + n0.y * 0.9}`} />
            <path d={`M ${tipX} ${tipY} L ${tipX - ux * 1.0 - n0.x * 0.9} ${tipY - uy * 1.0 - n0.y * 0.9}`} />
          </g>

          {/* Body: dark outline + gradient fill + belly highlight */}
          <path d={bodyPath} fill={palette.outline} />
          <path d={bodyPath} fill={`url(#${gradientId})`} transform="" />
          <path
            d={`M ${left[0]} L ${left.slice(1).join(" L ")}`}
            fill="none"
            stroke="#FBF4DE"
            strokeWidth={0.3}
            opacity={0.4}
            strokeLinecap="round"
          />
          {diamonds}

          {/* Head */}
          <g transform={`translate(${head.x}, ${head.y}) rotate(${headDeg})`}>
            {/* wedge: tip points away from the body (−x in local frame) */}
            <path
              d="M -2.9 0 L -0.6 -1.9 L 2.0 -1.5 L 2.0 1.5 L -0.6 1.9 Z"
              fill={palette.outline}
            />
            <path
              d="M -2.5 0 L -0.4 -1.55 L 1.7 -1.2 L 1.7 1.2 L -0.4 1.55 Z"
              fill={palette.body}
            />
            <ellipse cx={0.4} cy={-0.95} rx={1.0} ry={0.42} fill={palette.gradEnd} opacity={0.5} />
            <ellipse cx={0.4} cy={0.95} rx={1.0} ry={0.42} fill={palette.gradEnd} opacity={0.5} />
            {/* eyes */}
            <circle cx={-0.2} cy={-0.85} r={0.46} fill="#F8E9B0" />
            <circle cx={-0.2} cy={0.85} r={0.46} fill="#F8E9B0" />
            <ellipse cx={-0.25} cy={-0.85} rx={0.18} ry={0.3} fill="#0F172A" />
            <ellipse cx={-0.25} cy={0.85} rx={0.18} ry={0.3} fill="#0F172A" />
            {/* nostrils near the tip */}
            <circle cx={-2.0} cy={-0.45} r={0.16} fill={palette.outline} />
            <circle cx={-2.0} cy={0.45} r={0.16} fill={palette.outline} />
          </g>

          {/* Tail point */}
          <circle cx={pts[STEPS].x} cy={pts[STEPS].y} r={0.3} fill={palette.outline} />
        </g>
      );
    });
  }, [snakes]);
  return <>{parts}</>;
}

function TokensLayer({
  positions,
  playerOrder,
  turnPlayerId,
  coinColorOf,
  initialOf,
  squareGroups,
}: {
  positions: Record<string, number>;
  playerOrder: string[];
  turnPlayerId: string;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  squareGroups: Map<number, string[]>;
}) {
  return (
    <>
      {playerOrder.map((id) => {
        const sq = positions[id] ?? 0;
        const groupIds = squareGroups.get(sq) ?? [id];
        const slotInGroup = groupIds.indexOf(id);
        const total = groupIds.length;
        const startTotal = (squareGroups.get(0) ?? []).length;

        let cx: number, cy: number, r: number;
        if (sq <= 0) {
          const start = squareCenter(0, slotInGroup, startTotal);
          cx = start.x;
          cy = start.y;
          r = 2.2;
        } else {
          const center = cellInfo(sq);
          const { dx, dy, r: ringR } = tokenFanOffset(slotInGroup, total);
          cx = center.x + dx;
          cy = center.y + dy;
          r = ringR;
        }

        const isActive = id === turnPlayerId;
        const colorKey = coinColorOf[id];
        const palette = COIN_COLOR_HEX[colorKey];

        return (
          <g
            key={id}
            style={{
              transform: `translate(${cx}px, ${cy}px)`,
              transition: "transform 520ms cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            {isActive && (
              <circle
                r={r + 0.85}
                fill="none"
                stroke={palette.fill}
                strokeWidth={0.5}
                opacity={0.95}
                className="snl-token-pulse"
              />
            )}
            {/* Shadow */}
            <ellipse cx={0} cy={r + 0.3} rx={r * 0.7} ry={r * 0.25} fill="rgba(0,0,0,0.35)" />
            {/* Coin body */}
            <circle r={r} fill={palette.fill} stroke="#0f172a" strokeWidth={0.4} />
            <circle r={r - 0.35} fill="none" stroke={palette.dark} strokeWidth={0.25} opacity={0.6} />
            {/* Highlight */}
            <circle r={r * 0.42} cx={-r * 0.3} cy={-r * 0.35} fill="#ffffff" opacity={0.5} />
            {/* Initial */}
            <text
              x={0}
              y={r * 0.45}
              fontSize={r * 1.15}
              textAnchor="middle"
              fill="#ffffff"
              fontWeight="900"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              style={{ paintOrder: "stroke", stroke: palette.dark, strokeWidth: 0.3 }}
            >
              {initialOf[id]}
            </text>
          </g>
        );
      })}
    </>
  );
}

/**
 * The full felt board: the SVG (cells + snakes + ladders + tokens) plus the
 * floating event toast. Shared verbatim by both shells — only the wrapping
 * column width differs between mobile and desktop.
 */
export function SnlBoardSvg({
  state,
  coinColorOf,
  initialOf,
  squareGroups,
  startCount,
  toast,
}: {
  state: SnlState;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  squareGroups: Map<number, string[]>;
  startCount: number;
  toast: { text: string; emoji: string; color: string } | null;
}) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 112"
        className="w-full max-w-[min(92vw,720px)] mx-auto block rounded-2xl"
        style={{
          aspectRatio: "100 / 112",
          background:
            "radial-gradient(ellipse at 50% 35%, #FBF4DE 0%, #EFD7A6 65%, #DCBE83 100%)",
          border: "6px solid #3F2412",
          boxShadow:
            "0 22px 58px rgba(0,0,0,0.55), inset 0 0 0 2px #E0AE3B, inset 0 0 0 4px #6B4422",
        }}
      >
        <BoardDefs
          ladderCount={Object.keys(state.config.ladders).length}
          snakeCount={Object.keys(state.config.snakes).length}
        />
        {BOARD_GRID_CELLS}
        <StartZone count={startCount} />
        <LaddersLayer ladders={state.config.ladders} />
        <SnakesLayer snakes={state.config.snakes} />
        <TokensLayer
          positions={state.positions}
          playerOrder={state.playerOrder}
          turnPlayerId={state.turnPlayerId}
          coinColorOf={coinColorOf}
          initialOf={initialOf}
          squareGroups={squareGroups}
        />
      </svg>

      {toast && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-3 px-4 py-2 rounded-full shadow-2xl text-sm font-bold toast-in pointer-events-none"
          style={{
            background: toast.color,
            color: "#fff",
            boxShadow: `0 0 24px ${toast.color}, 0 4px 12px rgba(0,0,0,0.4)`,
          }}
        >
          <span className="mr-2">{toast.emoji}</span>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Side-rail widgets ─────────────────────────── */

export function DiceTray({
  value,
  rolling,
  canRoll,
  myTurn,
  phase,
  turnName,
  onRoll,
}: {
  value: number | null;
  rolling: boolean;
  canRoll: boolean;
  myTurn: boolean;
  phase: SnlState["phase"];
  turnName: string;
  onRoll: () => void;
}) {
  const finished = phase === "finished";
  return (
    <div
      className={`rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3 transition ${
        myTurn ? "" : "opacity-60"
      }`}
      style={{
        background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
      }}
    >
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
            {myTurn ? "Your dice" : `${turnName}'s dice`}
          </span>
          <Dice value={value} rolling={rolling} highlight={myTurn && canRoll && !finished} />
        </div>

        {myTurn ? (
          <button
            onClick={onRoll}
            disabled={!canRoll || rolling || finished}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 px-5 py-3 font-bold transition"
          >
            🎲 Roll
          </button>
        ) : (
          <div className="text-sm text-slate-300 max-w-[12rem]">
            <span className="block font-semibold">{turnName}'s turn</span>
            <span className="block text-xs text-slate-400">
              {finished
                ? "Game over"
                : canRoll
                ? "Waiting for them to roll…"
                : "Waiting for move to resolve…"}
            </span>
          </div>
        )}

        {value === 6 && !rolling && !finished && (
          <span className="text-amber-300 text-xs whitespace-nowrap">Six! Roll again if rules allow.</span>
        )}
      </div>
    </div>
  );
}

/**
 * SnlPlayerRail — the in-board roster (coin colour + square + climb/bite
 * stats). Renamed from the original in-file `PlayerList` so it no longer
 * shadows the shared `components/PlayerList` (a different roster widget).
 */
export function SnlPlayerRail({
  players,
  state,
  coinColorOf,
  initialOf,
  selfId,
}: {
  players: Player[];
  state: SnlState;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  selfId: string | null;
}) {
  return (
    <div
      className="rounded-xl p-2 space-y-1.5 max-h-[280px] overflow-y-auto"
      style={{
        background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
        border: "1px solid #334155",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 px-1 pt-1">
        Players ({state.playerOrder.length})
      </div>
      {state.playerOrder.map((id) => {
        const p = players.find((pp) => pp.id === id);
        const pos = state.positions[id] ?? 0;
        const stats = state.stats[id];
        const isTurn = state.turnPlayerId === id;
        const finished = state.finishedOrder.includes(id);
        const palette = COIN_COLOR_HEX[coinColorOf[id]];
        return (
          <div
            key={id}
            className={`flex items-center gap-2 p-1.5 rounded-lg transition ${
              isTurn ? "bg-slate-800/80" : "bg-slate-800/30"
            }`}
            style={{
              borderLeft: `3px solid ${isTurn ? palette.fill : "transparent"}`,
              boxShadow: isTurn ? `0 0 10px ${palette.fill}40` : undefined,
            }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-extrabold flex-shrink-0"
              style={{
                background: palette.fill,
                color: "#fff",
                boxShadow: `inset 0 -2px 0 ${palette.dark}`,
              }}
            >
              {initialOf[id]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-100 font-semibold truncate flex items-center gap-1">
                {p?.name ?? "—"}
                {id === selfId && <span className="text-[9px] text-slate-500 font-normal">(you)</span>}
                {finished && <span title="Finished">🏁</span>}
              </div>
              <div className="text-[9px] text-slate-400 flex gap-1.5">
                <span>sq <b className="text-slate-200">{pos}</b></span>
                {stats && (
                  <>
                    <span title="Ladders">🪜{stats.laddersClimbed}</span>
                    <span title="Snake bites">🐍{stats.snakesBitten}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EventFeed({
  events,
  players,
}: {
  events: SnlEvent[];
  players: Player[];
}) {
  const recent = events.slice(-6).reverse();
  function name(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }
  return (
    <div
      className="rounded-xl p-2 space-y-0.5 max-h-[180px] overflow-y-auto"
      style={{
        background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
        border: "1px solid #334155",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 px-1 pt-1">Feed</div>
      {recent.length === 0 ? (
        <div className="text-[11px] text-slate-600 italic px-1 py-2">Waiting for first roll…</div>
      ) : (
        recent.map((e, i) => (
          <div key={`${e.ts}-${i}`} className="text-[11px] text-slate-300 px-1 py-0.5 leading-snug">
            {renderEvent(e, name)}
          </div>
        ))
      )}
    </div>
  );
}

function renderEvent(e: SnlEvent, name: (id: string) => string): string {
  switch (e.kind) {
    case "roll":   return `🎲 ${name(e.playerId)} rolled ${e.roll}`;
    case "ladder": return `🪜 ${name(e.playerId)} climbed ${e.from} → ${e.to}`;
    case "snake":  return `🐍 ${name(e.playerId)} bit at ${e.from} → ${e.to}`;
    case "bounce": return `↩ ${name(e.playerId)} bounced back to ${e.landing}`;
    case "stay":   return `· ${name(e.playerId)} stayed put`;
    case "win":    return `🏆 ${name(e.playerId)} reached 100!`;
    default:       return "";
  }
}

export function toastForEvent(e: SnlEvent, players: Player[]): { text: string; emoji: string; color: string } | null {
  const n = players.find((p) => p.id === e.playerId)?.name ?? "Player";
  switch (e.kind) {
    case "ladder": return { text: `${n} climbed to ${e.to}!`, emoji: "🪜", color: "#16a34a" };
    case "snake":  return { text: `${n} got bit! Down to ${e.to}`, emoji: "🐍", color: "#dc2626" };
    case "bounce": return { text: `${n} bounced back to ${e.landing}`, emoji: "↩", color: "#ea580c" };
    case "win":    return { text: `${n} wins!`, emoji: "🏆", color: "#a855f7" };
    default:       return null;
  }
}

/* ─────────────────────────── Header + finish banner ─────────────────────────── */

export function SnlHeader({
  state,
  turnPlayer,
  turnColor,
}: {
  state: SnlState;
  turnPlayer: Player | undefined;
  turnColor: CoinColor | undefined;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">
          🐍 Snakes &amp; Ladders
        </div>
        <DifficultyBadge difficulty={state.config.difficulty} />
      </div>
      <div className="text-sm flex items-center gap-2">
        <span className="text-slate-400">Turn:</span>
        {turnColor && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-extrabold"
            style={{
              background: COIN_COLOR_HEX[turnColor].fill,
              color: "#0f172a",
              boxShadow: `0 0 12px ${COIN_COLOR_HEX[turnColor].fill}88`,
            }}
          >
            {turnPlayer?.name ?? "—"}
          </span>
        )}
      </div>
    </div>
  );
}

export function SnlFinishedBanner({
  players,
  winnerId,
}: {
  players: Player[];
  winnerId: string | null;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
        border: "2px solid #10b981",
        boxShadow: "0 0 32px rgba(16,185,129,0.4)",
      }}
    >
      <div className="text-3xl mb-1">🏆</div>
      <div className="text-xl font-bold text-emerald-200">
        {players.find((p) => p.id === winnerId)?.name ?? "Someone"} reached 100!
      </div>
    </div>
  );
}
