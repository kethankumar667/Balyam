import { memo, useMemo } from "react";
import type { CoinColor } from "@shared/types";
import { COIN_COLOR_HEX } from "../../components/CoinColorPicker";
import { CELL, VIEWBOX_HEIGHT, cellInfo, squareCenter, tokenFanOffset } from "./snl-geometry";
import {
  FINISH_DEEP,
  FINISH_GOLD,
  FINISH_INK,
  FINISH_LIGHT,
  HOLO_CYAN,
  LADDER_RAIL_DARK,
  LADDER_RAIL_LIGHT,
  LADDER_RAIL_MID,
  LADDER_RUNG_CORE,
  LADDER_RUNG_GLOW,
  SNAKE_PALETTES,
  TILE_A,
  TILE_A_TOP,
  TILE_B,
  TILE_B_TOP,
  TILE_EDGE,
  TILE_INK,
  TILE_LIGHT,
  TILE_MILESTONE,
  TILE_MILESTONE_TOP,
} from "./snl-theme";

/**
 * Snakes & Ladders — the board art, as three stacked SVGs sharing one viewBox.
 *
 *  1. BoardStaticLayer  tiles, START tray, ladders, snakes. Never changes during
 *                       a match, so its (filter-heavy) raster is painted once.
 *  2. BoardGlowLayer    the light: rung glow, snake eyes, the finish square's
 *                       halo. Breathes by animating the element's opacity only.
 *  3. TokensLayer       the pieces. These move every turn, so they sit on their
 *                       own layer and never force the blur filters to repaint.
 *
 * Render-only: the shell passes state in, nothing here talks to the socket.
 */

const VIEWBOX = `0 0 100 ${VIEWBOX_HEIGHT}`;
const MONO_FONT = "ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, Consolas, monospace";

/* ───────────────────────────── geometry builders ───────────────────────────── */

interface LadderGeometry {
  key: number;
  rails: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  rungs: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  /** Unit normal, used to put a light edge on one rail. */
  nx: number;
  ny: number;
  foot: { x: number; y: number };
  top: { x: number; y: number };
}

const LADDER_HALF_WIDTH = 1.55;

function buildLadder(startN: number, endN: number): LadderGeometry {
  const a = cellInfo(startN);
  const b = cellInfo(endN);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const w = LADDER_HALF_WIDTH;
  const rails = [1, -1].map((side) => ({
    x1: a.x + nx * w * side,
    y1: a.y + ny * w * side,
    x2: b.x + nx * w * side,
    y2: b.y + ny * w * side,
  }));
  const rungCount = Math.max(3, Math.floor(len / 3.2));
  const rungs = Array.from({ length: rungCount - 1 }, (_, i) => {
    const t = (i + 1) / rungCount;
    return {
      x1: rails[0].x1 + (rails[0].x2 - rails[0].x1) * t,
      y1: rails[0].y1 + (rails[0].y2 - rails[0].y1) * t,
      x2: rails[1].x1 + (rails[1].x2 - rails[1].x1) * t,
      y2: rails[1].y1 + (rails[1].y2 - rails[1].y1) * t,
    };
  });
  return { key: startN, rails, rungs, nx, ny, foot: { x: a.x, y: a.y }, top: { x: b.x, y: b.y } };
}

interface SnakeGeometry {
  key: number;
  paletteIndex: number;
  /** Closed outline of the tapered body. */
  bodyPath: string;
  /** Open spine, offset toward the light, for the specular streak. */
  streakPath: string;
  /** Open spine, for the glow underlay. */
  spinePath: string;
  diamonds: Array<{ points: string; key: string }>;
  head: { x: number; y: number };
  headDeg: number;
  tongue: { base: { x: number; y: number }; tip: { x: number; y: number }; forkA: { x: number; y: number }; forkB: { x: number; y: number } };
  tail: { x: number; y: number };
}

const SNAKE_STEPS = 30;
const SNAKE_HEAD_WIDTH = 2.9;
const SNAKE_TAIL_WIDTH = 0.5;

function buildSnake(headN: number, tailN: number, paletteIndex: number): SnakeGeometry {
  const head = cellInfo(headN);
  const tail = cellInfo(tailN);
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  // Serpentine centreline: head→tail plus a sine sway that is zero at both
  // ends (whole number of half-waves), with more bends for longer snakes.
  const bends = Math.max(1, Math.round(len / 24));
  const amp = Math.min(6.5, len * 0.15);
  const pts = Array.from({ length: SNAKE_STEPS + 1 }, (_, s) => {
    const t = s / SNAKE_STEPS;
    const off = amp * Math.sin(t * Math.PI * 2 * bends);
    return { x: head.x + dx * t + px * off, y: head.y + dy * t + py * off };
  });

  const widthAt = (t: number) => SNAKE_TAIL_WIDTH + (SNAKE_HEAD_WIDTH - SNAKE_TAIL_WIDTH) * Math.pow(1 - t, 0.85);

  const norm = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(SNAKE_STEPS, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    return { x: -ty / tl, y: tx / tl };
  });

  const edge = (side: 1 | -1) =>
    pts.map((p, i) => {
      const w = (widthAt(i / SNAKE_STEPS) / 2) * side;
      return `${(p.x + norm[i].x * w).toFixed(2)} ${(p.y + norm[i].y * w).toFixed(2)}`;
    });
  const left = edge(1);
  const right = edge(-1).reverse();
  const bodyPath = `M ${left[0]} L ${left.slice(1).join(" L ")} L ${right.join(" L ")} Z`;

  // Specular streak: the spine pushed 45% of the way to the lit (left) edge.
  const streak = pts.map((p, i) => {
    const w = (widthAt(i / SNAKE_STEPS) / 2) * 0.45;
    return `${(p.x + norm[i].x * w).toFixed(2)} ${(p.y + norm[i].y * w).toFixed(2)}`;
  });
  const streakPath = `M ${streak.slice(1, SNAKE_STEPS - 2).join(" L ")}`;
  const spinePath = `M ${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")}`;

  const diamonds = [0.18, 0.3, 0.42, 0.54, 0.66, 0.78].map((t, i) => {
    const si = Math.round(t * SNAKE_STEPS);
    const p = pts[si];
    const n = norm[si];
    const w = widthAt(t) * 0.34;
    const along = widthAt(t) * 0.55;
    const points = [
      `${p.x + n.x * w},${p.y + n.y * w}`,
      `${p.x + ux * along},${p.y + uy * along}`,
      `${p.x - n.x * w},${p.y - n.y * w}`,
      `${p.x - ux * along},${p.y - uy * along}`,
    ].join(" ");
    return { points, key: `dia-${headN}-${i}` };
  });

  const headDeg = (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180) / Math.PI;
  const n0 = norm[0];
  const tip = { x: head.x - ux * 2.9, y: head.y - uy * 2.9 };
  const tongue = {
    base: { x: head.x - ux * 1.5, y: head.y - uy * 1.5 },
    tip,
    forkA: { x: tip.x - ux * 1.0 + n0.x * 0.9, y: tip.y - uy * 1.0 + n0.y * 0.9 },
    forkB: { x: tip.x - ux * 1.0 - n0.x * 0.9, y: tip.y - uy * 1.0 - n0.y * 0.9 },
  };

  return {
    key: headN,
    paletteIndex,
    bodyPath,
    streakPath,
    spinePath,
    diamonds,
    head: { x: head.x, y: head.y },
    headDeg,
    tongue,
    tail: pts[SNAKE_STEPS],
  };
}

/* ───────────────────────────── static layer ───────────────────────────── */

/** The 100-tile grid never changes — built once at module load, not per render. */
const BOARD_GRID_CELLS: JSX.Element[] = (() => {
  const cells: JSX.Element[] = [];
  for (let n = 1; n <= 100; n++) {
    const info = cellInfo(n);
    const x = info.x - CELL / 2;
    const y = info.y - CELL / 2;
    const isFinish = n === 100;
    const isMilestone = !isFinish && n % 10 === 0;
    const fill = isFinish ? "url(#snl-finish)" : isMilestone ? "url(#snl-tile-ms)" : `url(#snl-tile-${info.tone})`;
    cells.push(
      <g key={n}>
        <rect
          x={x + 0.2}
          y={y + 0.2}
          width={CELL - 0.4}
          height={CELL - 0.4}
          rx={0.9}
          fill={fill}
          stroke={isFinish ? FINISH_DEEP : TILE_EDGE}
          strokeOpacity={isFinish ? 0.9 : 0.75}
          strokeWidth={0.14}
        />
        {!isFinish && (
          <path
            d={`M ${x + 1} ${y + 0.6} H ${x + CELL - 1}`}
            stroke={TILE_LIGHT}
            strokeOpacity={isMilestone ? 0.55 : 0.3}
            strokeWidth={0.14}
            strokeLinecap="round"
          />
        )}
        {isFinish && (
          <g transform={`translate(${info.x + 1.2}, ${info.y + 1.8})`}>
            <line x1={0} y1={-2.2} x2={0} y2={2.4} stroke={FINISH_INK} strokeWidth={0.4} strokeLinecap="round" />
            <path d="M 0 -2.2 L 3 -1.4 L 0 -0.4 Z" fill={FINISH_INK} />
          </g>
        )}
      </g>,
    );
  }
  return cells;
})();

/**
 * Square numbers sit ABOVE the ladders and snakes, with a dark halo, so a
 * serpent crossing square 66 never hides it — players count squares by eye.
 */
const BOARD_NUMBER_LABELS: JSX.Element[] = (() => {
  const labels: JSX.Element[] = [];
  for (let n = 1; n <= 100; n++) {
    const info = cellInfo(n);
    const isFinish = n === 100;
    labels.push(
      <text
        key={n}
        x={info.x - CELL / 2 + 1.1}
        y={info.y - CELL / 2 + 3.4}
        fontSize={2.7}
        fontWeight={700}
        fontFamily={MONO_FONT}
        fill={isFinish ? FINISH_INK : TILE_INK}
        fillOpacity={isFinish ? 1 : 0.92}
        stroke={isFinish ? FINISH_LIGHT : "#050A14"}
        strokeOpacity={0.85}
        strokeWidth={0.55}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {n}
      </text>,
    );
  }
  return labels;
})();

function StaticDefs({ snakeCount }: { snakeCount: number }) {
  return (
    <defs>
      <linearGradient id="snl-tile-0" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={TILE_A_TOP} />
        <stop offset="1" stopColor={TILE_A} />
      </linearGradient>
      <linearGradient id="snl-tile-1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={TILE_B_TOP} />
        <stop offset="1" stopColor={TILE_B} />
      </linearGradient>
      <linearGradient id="snl-tile-ms" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={TILE_MILESTONE_TOP} />
        <stop offset="1" stopColor={TILE_MILESTONE} />
      </linearGradient>
      <radialGradient id="snl-finish" cx="50%" cy="45%" r="70%">
        <stop offset="0" stopColor={FINISH_LIGHT} />
        <stop offset="0.5" stopColor={FINISH_GOLD} />
        <stop offset="1" stopColor={FINISH_DEEP} />
      </radialGradient>
      <linearGradient id="snl-tray" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#101B30" />
        <stop offset="1" stopColor="#0A1222" />
      </linearGradient>
      {/* Hex-scale skin laid over every snake body. */}
      <pattern id="snl-scales" width="1.5" height="1.3" patternUnits="userSpaceOnUse">
        <path d="M 0 0.65 Q 0.75 -0.1 1.5 0.65" fill="none" stroke="#FFFFFF" strokeOpacity="0.42" strokeWidth="0.16" />
        <path d="M -0.75 1.3 Q 0 0.55 0.75 1.3" fill="none" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="0.16" />
        <path d="M 0.75 1.3 Q 1.5 0.55 2.25 1.3" fill="none" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="0.16" />
      </pattern>
      <filter id="snl-drop" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" />
        <feOffset dx="0.1" dy="0.55" result="off" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.6" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="snl-underglow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.1" />
      </filter>
      {Array.from({ length: snakeCount }, (_, i) => {
        const p = SNAKE_PALETTES[i % SNAKE_PALETTES.length];
        return (
          <linearGradient key={`snake-grad-${i}`} id={`snl-snake-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={p.body} />
            <stop offset="1" stopColor={p.shade} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

function StartTray({ count }: { count: number }) {
  return (
    <g>
      <rect x={1.5} y={101.6} width={97} height={9.2} rx={2.2} fill="url(#snl-tray)" stroke={TILE_EDGE} strokeWidth={0.28} />
      <path d="M 4 102.3 H 96" stroke={HOLO_CYAN} strokeOpacity={0.45} strokeWidth={0.16} strokeLinecap="round" />
      <text x={4} y={104.1} fontSize={1.7} fontWeight={800} letterSpacing={0.5} fill={TILE_INK} fontFamily={MONO_FONT}>
        START
      </text>
      {count > 0 && (
        <text x={96} y={104.1} fontSize={1.7} fontWeight={700} textAnchor="end" fill={TILE_LIGHT} fontFamily={MONO_FONT}>
          {count} waiting
        </text>
      )}
    </g>
  );
}

function LadderBody({ ladder }: { ladder: LadderGeometry }) {
  const [railA, railB] = ladder.rails;
  return (
    <g>
      {/* Contact shadow */}
      {ladder.rails.map((r, i) => (
        <line key={`s-${i}`} x1={r.x1} y1={r.y1 + 0.5} x2={r.x2} y2={r.y2 + 0.5} stroke="#000" strokeOpacity={0.45} strokeWidth={1.7} strokeLinecap="round" />
      ))}
      {/* Rails: dark core → brushed metal → lit edge reads as a round pole. */}
      {ladder.rails.map((r, i) => (
        <g key={`r-${i}`}>
          <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={LADDER_RAIL_DARK} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={LADDER_RAIL_MID} strokeWidth={1.05} strokeLinecap="round" />
        </g>
      ))}
      <line
        x1={railA.x1 - ladder.nx * 0.2}
        y1={railA.y1 - ladder.ny * 0.2}
        x2={railA.x2 - ladder.nx * 0.2}
        y2={railA.y2 - ladder.ny * 0.2}
        stroke={LADDER_RAIL_LIGHT}
        strokeOpacity={0.8}
        strokeWidth={0.28}
        strokeLinecap="round"
      />
      <line
        x1={railB.x1 + ladder.nx * 0.2}
        y1={railB.y1 + ladder.ny * 0.2}
        x2={railB.x2 + ladder.nx * 0.2}
        y2={railB.y2 + ladder.ny * 0.2}
        stroke={LADDER_RAIL_LIGHT}
        strokeOpacity={0.5}
        strokeWidth={0.22}
        strokeLinecap="round"
      />
      {ladder.rungs.map((r, i) => (
        <g key={`u-${i}`}>
          <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={LADDER_RAIL_DARK} strokeWidth={0.95} strokeLinecap="round" />
          <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={LADDER_RUNG_CORE} strokeWidth={0.45} strokeLinecap="round" />
        </g>
      ))}
      {/* Anchor bolts at foot and top. */}
      {[ladder.foot, ladder.top].map((p, i) => (
        <circle key={`b-${i}`} cx={p.x} cy={p.y} r={0.55} fill={LADDER_RAIL_LIGHT} stroke={LADDER_RAIL_DARK} strokeWidth={0.18} />
      ))}
    </g>
  );
}

function SnakeBody({ snake }: { snake: SnakeGeometry }) {
  const palette = SNAKE_PALETTES[snake.paletteIndex % SNAKE_PALETTES.length];
  const { tongue } = snake;
  return (
    <g>
      <g stroke="#FF3B57" strokeWidth={0.34} fill="none" strokeLinecap="round">
        <path d={`M ${tongue.base.x} ${tongue.base.y} L ${tongue.tip.x} ${tongue.tip.y}`} />
        <path d={`M ${tongue.tip.x} ${tongue.tip.y} L ${tongue.forkA.x} ${tongue.forkA.y}`} />
        <path d={`M ${tongue.tip.x} ${tongue.tip.y} L ${tongue.forkB.x} ${tongue.forkB.y}`} />
      </g>
      <path d={snake.bodyPath} fill={palette.outline} stroke={palette.outline} strokeWidth={0.5} strokeLinejoin="round" />
      <path d={snake.bodyPath} fill={`url(#snl-snake-${snake.paletteIndex % SNAKE_PALETTES.length})`} />
      <path d={snake.bodyPath} fill="url(#snl-scales)" />
      {snake.diamonds.map((d) => (
        <polygon key={d.key} points={d.points} fill={palette.shade} opacity={0.55} />
      ))}
      <path d={snake.streakPath} fill="none" stroke={palette.scale} strokeOpacity={0.55} strokeWidth={0.4} strokeLinecap="round" strokeLinejoin="round" />
      <g transform={`translate(${snake.head.x}, ${snake.head.y}) rotate(${snake.headDeg})`}>
        <path d="M -3 0 L -0.6 -2 L 2.1 -1.6 L 2.1 1.6 L -0.6 2 Z" fill={palette.outline} />
        <path d="M -2.6 0 L -0.4 -1.65 L 1.8 -1.3 L 1.8 1.3 L -0.4 1.65 Z" fill={palette.body} />
        <path d="M -2.4 0 L -0.4 -1.4 L 1.5 -1.1" fill="none" stroke={palette.scale} strokeOpacity={0.55} strokeWidth={0.25} strokeLinecap="round" />
        <circle cx={-2.05} cy={-0.45} r={0.16} fill={palette.outline} />
        <circle cx={-2.05} cy={0.45} r={0.16} fill={palette.outline} />
      </g>
      <circle cx={snake.tail.x} cy={snake.tail.y} r={0.3} fill={palette.outline} />
    </g>
  );
}

interface BoardLayerProps {
  ladders: Record<number, number>;
  snakes: Record<number, number>;
}

/** Entries sorted by head square so a snake keeps its colour on every client. */
function sortedSnakes(snakes: Record<number, number>): Array<[number, number]> {
  return Object.entries(snakes)
    .map(([h, t]) => [Number(h), t] as [number, number])
    .sort((a, b) => a[0] - b[0]);
}

function useBoardGeometry({ ladders, snakes }: BoardLayerProps) {
  return useMemo(
    () => ({
      ladderGeo: Object.entries(ladders).map(([s, e]) => buildLadder(Number(s), e)),
      snakeGeo: sortedSnakes(snakes).map(([h, t], i) => buildSnake(h, t, i)),
    }),
    [ladders, snakes],
  );
}

export const BoardStaticLayer = memo(function BoardStaticLayer({
  ladders,
  snakes,
  waiting,
}: BoardLayerProps & { waiting: number }) {
  const { ladderGeo, snakeGeo } = useBoardGeometry({ ladders, snakes });
  return (
    <svg viewBox={VIEWBOX} className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
      <StaticDefs snakeCount={snakeGeo.length} />
      {BOARD_GRID_CELLS}
      <StartTray count={waiting} />
      <g filter="url(#snl-drop)">
        {ladderGeo.map((l) => (
          <LadderBody key={`ladder-${l.key}`} ladder={l} />
        ))}
      </g>
      {/* Soft coloured light under each snake, so it looks lit from within. */}
      <g filter="url(#snl-underglow)" opacity={0.55}>
        {snakeGeo.map((s) => (
          <path
            key={`ug-${s.key}`}
            d={s.spinePath}
            fill="none"
            stroke={SNAKE_PALETTES[s.paletteIndex % SNAKE_PALETTES.length].glow}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
      <g filter="url(#snl-drop)">
        {snakeGeo.map((s) => (
          <SnakeBody key={`snake-${s.key}`} snake={s} />
        ))}
      </g>
      {BOARD_NUMBER_LABELS}
    </svg>
  );
});

/* ───────────────────────────── glow layer ───────────────────────────── */

/**
 * The light on top of the static art. The whole <svg> breathes (opacity only,
 * `.snl-fx-breathe`), which the browser composites without repainting it.
 */
export const BoardGlowLayer = memo(function BoardGlowLayer({ ladders, snakes }: BoardLayerProps) {
  const { ladderGeo, snakeGeo } = useBoardGeometry({ ladders, snakes });
  const finish = cellInfo(100);
  return (
    <svg viewBox={VIEWBOX} className="snl-fx-breathe pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <filter id="snl-fx-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>
      <g filter="url(#snl-fx-glow)">
        {ladderGeo.flatMap((l) =>
          l.rungs.map((r, i) => (
            <line
              key={`g-${l.key}-${i}`}
              x1={r.x1}
              y1={r.y1}
              x2={r.x2}
              y2={r.y2}
              stroke={LADDER_RUNG_GLOW}
              strokeOpacity={0.75}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          )),
        )}
        <rect x={finish.x - CELL / 2} y={finish.y - CELL / 2} width={CELL} height={CELL} rx={1.2} fill={FINISH_GOLD} fillOpacity={0.35} />
      </g>
      {snakeGeo.map((s) => {
        const palette = SNAKE_PALETTES[s.paletteIndex % SNAKE_PALETTES.length];
        return (
          <g key={`eye-${s.key}`} transform={`translate(${s.head.x}, ${s.head.y}) rotate(${s.headDeg})`}>
            {[-0.85, 0.85].map((cy) => (
              <g key={cy}>
                <circle cx={-0.2} cy={cy} r={0.95} fill={palette.glow} fillOpacity={0.5} />
                <circle cx={-0.2} cy={cy} r={0.46} fill={palette.glow} />
                <ellipse cx={-0.25} cy={cy} rx={0.14} ry={0.3} fill="#050A14" />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
});

/* ───────────────────────────── tokens ───────────────────────────── */

interface TokensLayerProps {
  positions: Record<string, number>;
  playerOrder: string[];
  turnPlayerId: string;
  coinColorOf: Record<string, CoinColor>;
  initialOf: Record<string, string>;
  squareGroups: Map<number, string[]>;
}

export function TokensLayer({ positions, playerOrder, turnPlayerId, coinColorOf, initialOf, squareGroups }: TokensLayerProps) {
  const usedColors = Array.from(new Set(playerOrder.map((id) => coinColorOf[id]).filter(Boolean)));
  const startTotal = (squareGroups.get(0) ?? []).length;
  return (
    <svg viewBox={VIEWBOX} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        {usedColors.map((color) => {
          const palette = COIN_COLOR_HEX[color];
          return (
            <radialGradient key={color} id={`snl-coin-${color}`} cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="0.28" stopColor={palette.fill} />
              <stop offset="1" stopColor={palette.dark} />
            </radialGradient>
          );
        })}
      </defs>
      {playerOrder.map((id) => {
        const sq = positions[id] ?? 0;
        const groupIds = squareGroups.get(sq) ?? [id];
        const slot = Math.max(0, groupIds.indexOf(id));
        const total = groupIds.length;

        let cx: number;
        let cy: number;
        let r: number;
        if (sq <= 0) {
          const start = squareCenter(0, slot, startTotal);
          cx = start.x;
          cy = start.y;
          r = 2.2;
        } else {
          const center = cellInfo(sq);
          const fan = tokenFanOffset(slot, total);
          cx = center.x + fan.dx;
          cy = center.y + fan.dy;
          r = fan.r;
        }

        const color = coinColorOf[id];
        const palette = COIN_COLOR_HEX[color];
        const isActive = id === turnPlayerId;

        return (
          <g key={id} className="snl-token" style={{ transform: `translate(${cx}px, ${cy}px)` }}>
            {isActive && (
              <>
                <circle r={r + 1.5} fill="none" stroke={HOLO_CYAN} strokeWidth={0.22} strokeOpacity={0.6} className="snl-token-pulse" />
                <circle r={r + 0.8} fill="none" stroke={palette.fill} strokeWidth={0.5} className="snl-token-pulse" />
              </>
            )}
            <ellipse cx={0} cy={r * 0.95} rx={r * 0.95} ry={r * 0.34} fill="#000" fillOpacity={0.5} />
            <circle r={r} fill={`url(#snl-coin-${color})`} stroke={palette.dark} strokeWidth={0.35} />
            <circle r={r - 0.4} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.18} />
            <ellipse cx={-r * 0.3} cy={-r * 0.45} rx={r * 0.38} ry={r * 0.2} fill="#FFFFFF" fillOpacity={0.55} transform={`rotate(-25 ${-r * 0.3} ${-r * 0.45})`} />
            <text
              x={0}
              y={r * 0.4}
              fontSize={r * 1.1}
              textAnchor="middle"
              fill="#FFFFFF"
              fontWeight={900}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              style={{ paintOrder: "stroke", stroke: palette.dark, strokeWidth: 0.3 }}
            >
              {initialOf[id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Used by the shell to size the aspect box that all three layers share. */
export const BOARD_ASPECT = `100 / ${VIEWBOX_HEIGHT}`;
