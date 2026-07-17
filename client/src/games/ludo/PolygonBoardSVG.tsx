import type { LudoColor, Player } from "@shared/types";
import type { PolygonBoardGeometry, Pt } from "./polygon-board";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";

/**
 * Renders the N-sided Ludo board (5..8 players) with a premium, "physical"
 * look: a dark decorative frame, a warm board surface, glossy gradient yard
 * sectors with 3-D token sockets, beveled raised track tiles with depth
 * shadows, colored home-runs, and a polished center emblem. Geometry comes
 * from `buildPolygonGeometry`; tokens are overlaid by the parent at the same
 * 0..100 percentage coordinates.
 */

/** Lighten a #rrggbb toward white by `amt` (0..1). */
function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const L = (c: number) => Math.round(c + (255 - c) * amt);
  return `#${((1 << 24) + (L(r) << 16) + (L(g) << 8) + L(b)).toString(16).slice(1)}`;
}

/** Orientation of a point about the board center, in degrees (0 = up). */
function angleOf(p: Pt): number {
  return (Math.atan2(p.x - 50, -(p.y - 50)) * 180) / Math.PI;
}

const scaleFromCenter = (v: Pt, k: number): Pt => ({
  x: 50 + (v.x - 50) * k,
  y: 50 + (v.y - 50) * k,
});

function shortLabel(name: string): string {
  return name.length > 16 ? name.slice(0, 15) + "…" : name;
}

function pillWidth(label: string): number {
  return Math.max(15, Math.min(22, 5.4 + label.length * 0.9));
}

export default function PolygonBoardSVG({
  geo,
  players,
  playerOrder,
  playerColors,
  activeColors,
  hasCaptured,
}: {
  geo: PolygonBoardGeometry;
  players: Player[];
  playerOrder: string[];
  playerColors: Record<string, LudoColor>;
  activeColors: LudoColor[];
  hasCaptured: Record<string, boolean>;
  unlockBurst: Record<string, number>;
}) {
  const playerIdByColor: Partial<Record<LudoColor, string>> = {};
  for (const pid of playerOrder) {
    const c = playerColors[pid];
    if (c) playerIdByColor[c] = pid;
  }
  const nameFor = (color: LudoColor): string | null => {
    const pid = playerIdByColor[color];
    if (!pid) return null;
    return players.find((p) => p.id === pid)?.name ?? null;
  };
  const capturedFor = (color: LudoColor): boolean => {
    const pid = playerIdByColor[color];
    return pid ? !!hasCaptured[pid] : true;
  };

  const boardPoly = geo.outerVertices
    .map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
    .join(" ");
  const framePoly = geo.outerVertices
    .map((v) => scaleFromCenter(v, 1.055))
    .map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
    .join(" ");

  const cell = geo.cellSize;
  const half = cell / 2;
  const rxc = cell * 0.26;
  const safe = geo.safeSquares;

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="lu-surface" cx="50%" cy="44%" r="62%">
          <stop offset="0%" stopColor="#fefcf5" />
          <stop offset="70%" stopColor="#f5ecd6" />
          <stop offset="100%" stopColor="#ead9b8" />
        </radialGradient>
        <linearGradient id="lu-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3320" />
          <stop offset="55%" stopColor="#2c1d10" />
          <stop offset="100%" stopColor="#1c1108" />
        </linearGradient>
        {/* Beveled track tile: top-lit cream → shaded bottom. */}
        <linearGradient id="lu-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#fbf5e6" />
          <stop offset="100%" stopColor="#e9dcc0" />
        </linearGradient>
        <linearGradient id="lu-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        {activeColors.map((color) => (
          <linearGradient key={color} id={`lu-c-${color}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={lighten(COLOR_HEX[color], 0.45)} />
            <stop offset="48%" stopColor={COLOR_HEX[color]} />
            <stop offset="100%" stopColor={COLOR_HEX_DARK[color]} />
          </linearGradient>
        ))}
        <filter id="lu-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.55" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.3" />
        </filter>
        <filter id="lu-shadow-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.32" floodColor="#3a2a14" floodOpacity="0.34" />
        </filter>
        <filter id="lu-star" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="0.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Decorative frame + warm board surface */}
      <polygon points={framePoly} fill="url(#lu-frame)" stroke="#0e0905" strokeWidth={0.5} strokeLinejoin="round" filter="url(#lu-shadow)" />
      <polygon points={boardPoly} fill="url(#lu-surface)" stroke="#caa86a" strokeWidth={0.5} strokeLinejoin="round" />

      {/* Yard sectors */}
      {activeColors.map((color) => {
        const dark = COLOR_HEX_DARK[color];
        const name = nameFor(color);
        const label = name ? shortLabel(name) : null;
        const width = label ? pillWidth(label) : 15;
        const anchor = geo.nameAnchor[color];
        return (
          <g key={color + "-yard"}>
            <polygon
              points={geo.yardPolygons[color]}
              fill={`url(#lu-c-${color})`}
              stroke={dark}
              strokeWidth={0.5}
              strokeLinejoin="round"
            />
            {/* sheen along the outer edge of the yard */}
            <polygon points={geo.yardPolygons[color]} fill="url(#lu-gloss)" opacity={0.45} />
            {/* 3-D token sockets */}
            {geo.yardSlots[color].map((s, i) => (
              <g key={i}>
                <circle cx={s.x} cy={s.y} r={cell * 0.66} fill={dark} opacity={0.55} />
                <circle cx={s.x} cy={s.y} r={cell * 0.56} fill="#fffdf7" />
                <circle cx={s.x} cy={s.y} r={cell * 0.56} fill="none" stroke={dark} strokeWidth={0.3} opacity={0.6} />
              </g>
            ))}
            {/* name pill */}
            {label && (
              <g transform={`translate(${anchor.x} ${anchor.y})`}>
                <rect x={-width / 2} y={-2.1} width={width} height={4.2} rx={2.1} fill="#1c130a" opacity={0.78} />
                <text
                  x={0}
                  y={0.15}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={2.5}
                  fontWeight={800}
                  fill="#ffffff"
                  style={{ fontFamily: "'Poppins','Nunito',sans-serif" }}
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Home-run cells (glossy color) with shared depth shadow */}
      <g filter="url(#lu-shadow-sm)">
        {activeColors.map((color) => (
          <g key={color + "-stretch"}>
            {geo.stretchCells[color].map((p, i) => (
              <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${angleOf(p)})`}>
                <rect x={-half} y={-half} width={cell} height={cell} rx={rxc} fill={`url(#lu-c-${color})`} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.22} />
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* Track ring — beveled raised tiles, one shared drop shadow */}
      <g filter="url(#lu-shadow-sm)">
        {geo.trackCells.map((p, idx) => (
          <g key={"t" + idx} transform={`translate(${p.x} ${p.y}) rotate(${angleOf(p)})`}>
            <rect x={-half} y={-half} width={cell} height={cell} rx={rxc} fill="url(#lu-tile)" stroke="#b9a577" strokeWidth={0.22} />
          </g>
        ))}
      </g>

      {/* Colored start tiles */}
      {activeColors.map((color) => {
        const p = geo.trackCells[geo.colorStarts[color]];
        if (!p) return null;
        return (
          <g key={color + "-start"} transform={`translate(${p.x} ${p.y}) rotate(${angleOf(p)})`}>
            <rect x={-half} y={-half} width={cell} height={cell} rx={rxc} fill={`url(#lu-c-${color})`} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.3} />
          </g>
        );
      })}

      {/* Safe-square stars with glow */}
      {[...safe].map((idx) => {
        const p = geo.trackCells[idx];
        if (!p) return null;
        // a start tile already carries its color; only star the mid-wedge safes
        const isStart = activeColors.some((c) => geo.colorStarts[c] === idx);
        return (
          <text
            key={"s" + idx}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={cell * 0.8}
            fill={isStart ? "#fff8e1" : "#e7a814"}
            filter="url(#lu-star)"
            style={{ pointerEvents: "none" }}
          >
            ★
          </text>
        );
      })}

      {/* Center emblem: glossy color wedges + a hub with a gold star */}
      <g filter="url(#lu-shadow-sm)">
        {activeColors.map((color) => (
          <polygon
            key={color + "-home"}
            points={geo.centerTriangles[color]}
            fill={`url(#lu-c-${color})`}
            stroke="#ffffff"
            strokeWidth={0.4}
            strokeLinejoin="round"
          />
        ))}
      </g>
      {(() => {
        const hubR = Math.max(2.6, geo.cellSize * 1.05);
        return (
          <g>
            <circle cx={50} cy={50} r={hubR} fill="#1c130a" opacity={0.92} />
            <circle cx={50} cy={50} r={hubR} fill="url(#lu-gloss)" opacity={0.4} />
            <text x={50} y={50} textAnchor="middle" dominantBaseline="central" fontSize={hubR * 1.5} fill="#f2c84b" filter="url(#lu-star)">
              ★
            </text>
          </g>
        );
      })()}

      {/* Mandatory-capture locks */}
      {activeColors.map((color) => {
        if (capturedFor(color)) return null;
        const entry = geo.stretchCells[color]?.[0];
        if (!entry) return null;
        return (
          <text key={color + "-lock"} x={entry.x} y={entry.y} textAnchor="middle" dominantBaseline="central" fontSize={cell * 0.82}>
            🔒
          </text>
        );
      })}
    </svg>
  );
}
