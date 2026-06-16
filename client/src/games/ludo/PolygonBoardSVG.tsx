import type { LudoColor, Player } from "@shared/types";
import type { PolygonBoardGeometry } from "./polygon-board";
import { COLOR_HEX, COLOR_HEX_DARK } from "./board-layout";

/**
 * Renders the N-sided Ludo board (5..8 player games). Geometry is pre-computed
 * by `buildPolygonGeometry(N, activeColors)` and passed in. The SVG viewBox is
 * 0..100 in both axes so tokens can be positioned by parent components using
 * percentage coords that match these units.
 */
export default function PolygonBoardSVG({
  geo,
  players,
  playerOrder,
  playerColors,
  activeColors,
  hasCaptured,
  unlockBurst,
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
  function nameFor(color: LudoColor): string | null {
    const pid = playerIdByColor[color];
    if (!pid) return null;
    return players.find((p) => p.id === pid)?.name ?? null;
  }
  const outerPolyPoints = geo.outerVertices
    .map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
    .join(" ");

  const cell = geo.cellSize;
  const half = cell / 2;

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full rounded-md shadow-inner"
      style={{ background: "#fafafa" }}
    >
      {/* Board outline */}
      <polygon
        points={outerPolyPoints}
        fill="#ffffff"
        stroke="#1e293b"
        strokeWidth="0.3"
      />

      {/* Yards — only active colors get a colored yard */}
      {activeColors.map((color) => {
        const dark = COLOR_HEX_DARK[color];
        const slot = geo.yardSlots[color];
        const anchor = geo.nameAnchor[color];
        const angle = geo.wedgeAngle[color] ?? 0;
        // Rotate labels so they read upright on each side of the polygon.
        let labelRot = angle;
        if (labelRot > 90 && labelRot < 270) labelRot += 180;
        const name = nameFor(color);
        return (
          <g key={color + "-yard"}>
            <polygon
              points={geo.yardPolygons[color]}
              fill={COLOR_HEX[color]}
              stroke={dark}
              strokeWidth="0.25"
            />
            {slot.map((s, i) => (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={cell * 0.7}
                fill="#ffffff"
                stroke={dark}
                strokeWidth="0.3"
                opacity={0.85}
              />
            ))}
            {name && (
              <g transform={`rotate(${labelRot}, ${anchor.x}, ${anchor.y})`}>
                <rect
                  x={anchor.x - 9}
                  y={anchor.y - 1.6}
                  width={18}
                  height={3.2}
                  rx={1.2}
                  fill="rgba(255,255,255,0.92)"
                  stroke={dark}
                  strokeWidth="0.18"
                />
                <text
                  x={anchor.x}
                  y={anchor.y + 0.9}
                  textAnchor="middle"
                  fontSize="2"
                  fontWeight="bold"
                  fill={dark}
                  style={{ letterSpacing: "0.06em" }}
                >
                  {(name ?? "").slice(0, 10).toUpperCase()}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Track cells */}
      {geo.trackCells.map((c, idx) => {
        const startEntries = Object.entries(geo.colorStarts) as [LudoColor, number][];
        const startColor = startEntries.find(([, v]) => v === idx)?.[0];
        const isStart = !!startColor;
        const fill =
          isStart && startColor && activeColors.includes(startColor)
            ? COLOR_HEX[startColor]
            : "#ffffff";
        const opacity = isStart ? 0.6 : 1;
        return (
          <rect
            key={idx}
            x={c.x - half}
            y={c.y - half}
            width={cell}
            height={cell}
            rx={0.35}
            fill={fill}
            opacity={opacity}
            stroke="#475569"
            strokeWidth={0.16}
          />
        );
      })}

      {/* Safe-square stars */}
      {[...geo.safeSquares].map((pos) => {
        const c = geo.trackCells[pos];
        if (!c) return null;
        return (
          <text
            key={"safe-" + pos}
            x={c.x}
            y={c.y + cell * 0.32}
            fontSize={cell * 0.85}
            textAnchor="middle"
            fill="#64748b"
          >
            ★
          </text>
        );
      })}

      {/* Stretches */}
      {activeColors.map((color) => (
        <g key={color + "-stretch"}>
          {geo.stretchCells[color].map((c, i) => (
            <rect
              key={i}
              x={c.x - half}
              y={c.y - half}
              width={cell}
              height={cell}
              rx={0.35}
              fill={COLOR_HEX[color]}
              opacity={0.88}
              stroke="#1e293b"
              strokeWidth={0.16}
            />
          ))}
        </g>
      ))}

      {/* Center home wedges */}
      {activeColors.map((color) => (
        <polygon
          key={color + "-center"}
          points={geo.centerTriangles[color]}
          fill={COLOR_HEX[color]}
        />
      ))}
      <circle cx={50} cy={50} r={1.6} fill="#ffffff" opacity={0.55} />

      {/* Mandatory-capture locks at each color's stretch entrance */}
      {activeColors.map((color) => {
        const pid = playerIdByColor[color];
        if (!pid) return null;
        const captured = hasCaptured[pid] ?? false;
        const burstAt = unlockBurst[pid];
        const entry = geo.stretchCells[color][0];
        if (!entry) return null;
        if (!captured && !burstAt) {
          return (
            <g
              key={color + "-lock"}
              className="lock-pulse"
              style={{ transformOrigin: `${entry.x}px ${entry.y}px` }}
            >
              <circle cx={entry.x} cy={entry.y} r={cell * 0.55} fill="rgba(0,0,0,0.55)" />
              <text x={entry.x} y={entry.y + cell * 0.3} textAnchor="middle" fontSize={cell * 0.9}>
                🔒
              </text>
            </g>
          );
        }
        if (burstAt) {
          return (
            <g
              key={color + "-unlock"}
              className="unlock-burst"
              style={{ transformOrigin: `${entry.x}px ${entry.y}px` }}
            >
              <circle cx={entry.x} cy={entry.y} r={cell * 0.7} fill={COLOR_HEX[color]} opacity={0.85} />
              <text x={entry.x} y={entry.y + cell * 0.35} textAnchor="middle" fontSize={cell}>
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
