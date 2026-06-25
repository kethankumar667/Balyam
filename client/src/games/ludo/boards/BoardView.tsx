import type { LudoColor, Player } from "@shared/types";
import { COLOR_HEX, COLOR_HEX_DARK } from "../board-layout";
import type { LudoBoard } from "./types";
import { Crown, angleOf, lighten } from "./kit";

/**
 * Shared renderer for the per-N Ludo boards. It only *draws whatever geometry
 * it is handed* — every board file (Board5/6/7/8) computes its own pods, arms,
 * home columns, centre wedges and rim, so the arrangement is tuned per design;
 * the visual style (gold rim, beveled tiles, glossy pods, navy crown badge) is
 * deliberately identical across all four, exactly like the reference set.
 *
 * `defs` ids are namespaced per player-count so the "all four side by side"
 * preview can mount every board without gradient id collisions.
 */
export default function BoardView({
  board,
  players,
  playerOrder,
  playerColors,
  activeColors,
  hasCaptured,
}: {
  board: LudoBoard;
  players: Player[];
  playerOrder: string[];
  playerColors: Record<string, LudoColor>;
  activeColors: LudoColor[];
  hasCaptured: Record<string, boolean>;
}) {
  const pfx = `lb${board.N}`;
  const cell = board.cellSize;
  const half = cell / 2;
  const rxc = cell * 0.16;

  const idByColor: Partial<Record<LudoColor, string>> = {};
  for (const pid of playerOrder) idByColor[playerColors[pid]] = pid;
  const nameFor = (c: LudoColor): string | null => {
    const pid = idByColor[c];
    return pid ? players.find((p) => p.id === pid)?.name ?? null : null;
  };

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${pfx}-surface`} cx="50%" cy="44%" r="62%">
          <stop offset="0%" stopColor="#fefcf5" />
          <stop offset="70%" stopColor="#f5ecd6" />
          <stop offset="100%" stopColor="#ead9b8" />
        </radialGradient>
        <linearGradient id={`${pfx}-frame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3d489" />
          <stop offset="45%" stopColor="#d9a948" />
          <stop offset="100%" stopColor="#a9772a" />
        </linearGradient>
        <linearGradient id={`${pfx}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#fbf5e6" />
          <stop offset="100%" stopColor="#e9dcc0" />
        </linearGradient>
        <linearGradient id={`${pfx}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`${pfx}-badge`} cx="50%" cy="38%" r="68%">
          <stop offset="0%" stopColor="#26324c" />
          <stop offset="100%" stopColor="#0f1726" />
        </radialGradient>
        {activeColors.map((color) => (
          <linearGradient key={color} id={`${pfx}-c-${color}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={lighten(COLOR_HEX[color], 0.45)} />
            <stop offset="48%" stopColor={COLOR_HEX[color]} />
            <stop offset="100%" stopColor={COLOR_HEX_DARK[color]} />
          </linearGradient>
        ))}
        <filter id={`${pfx}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.32" />
        </filter>
        <filter id={`${pfx}-sm`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.3" floodColor="#3a2a14" floodOpacity="0.34" />
        </filter>
        <filter id={`${pfx}-star`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="0.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <polygon points={board.framePoly} fill={`url(#${pfx}-frame)`} stroke="#7a5418" strokeWidth={0.7} strokeLinejoin="round" filter={`url(#${pfx}-shadow)`} />
      <polygon points={board.boardPoly} fill={`url(#${pfx}-surface)`} stroke="#caa86a" strokeWidth={0.5} strokeLinejoin="round" />

      {/* Track loop tiles */}
      <g filter={`url(#${pfx}-sm)`}>
        {board.trackCells.map((p, idx) => (
          <g key={"t" + idx} transform={`translate(${p.x} ${p.y}) rotate(${angleOf(p)})`}>
            <rect x={-half} y={-half} width={cell} height={cell} rx={rxc} fill={`url(#${pfx}-tile)`} stroke="#b9a577" strokeWidth={0.22} />
          </g>
        ))}
      </g>

      {/* Home columns */}
      <g filter={`url(#${pfx}-sm)`}>
        {activeColors.map((color) =>
          board.stretchCells[color].map((p, i) => (
            <g key={color + "h" + i} transform={`translate(${p.x} ${p.y}) rotate(${angleOf(p)})`}>
              <rect x={-half} y={-half} width={cell} height={cell} rx={rxc} fill={`url(#${pfx}-c-${color})`} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.22} />
            </g>
          )),
        )}
      </g>

      {/* Coloured start tiles */}
      {activeColors.map((color) => {
        const p = board.trackCells[board.colorStarts[color]];
        if (!p) return null;
        return (
          <g key={color + "-start"} transform={`translate(${p.x} ${p.y}) rotate(${angleOf(p)})`}>
            <rect x={-half} y={-half} width={cell} height={cell} rx={rxc} fill={`url(#${pfx}-c-${color})`} stroke={COLOR_HEX_DARK[color]} strokeWidth={0.3} />
          </g>
        );
      })}

      {/* Safe stars */}
      {[...board.safeSquares].map((idx) => {
        const p = board.trackCells[idx];
        if (!p) return null;
        const isStart = activeColors.some((c) => board.colorStarts[c] === idx);
        return (
          <text key={"s" + idx} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={cell * 0.82} fill={isStart ? "#fff8e1" : "#e7a814"} filter={`url(#${pfx}-star)`} style={{ pointerEvents: "none" }}>
            ★
          </text>
        );
      })}

      {/* Direction chevrons */}
      {board.wedges.map((w) => (
        <g key={w.color + "-arrow"} transform={`translate(${w.arrow.at.x} ${w.arrow.at.y}) rotate(${w.arrow.angle})`}>
          <path d="M-1.6 -0.9 L0 1.1 L1.6 -0.9 Z" fill={COLOR_HEX_DARK[w.color]} />
        </g>
      ))}

      {/* Pods */}
      {board.wedges.map((w) => {
        const dark = COLOR_HEX_DARK[w.color];
        const name = nameFor(w.color);
        return (
          <g key={w.color + "-pod"}>
            <polygon points={w.podPoly} fill={`url(#${pfx}-c-${w.color})`} stroke={dark} strokeWidth={0.7} strokeLinejoin="round" filter={`url(#${pfx}-sm)`} />
            <polygon points={w.podInner} fill="none" stroke={lighten(COLOR_HEX[w.color], 0.3)} strokeWidth={0.3} opacity={0.6} />
            <polygon points={w.podPoly} fill={`url(#${pfx}-gloss)`} opacity={0.4} />
            <Crown x={w.podCenter.x} y={w.podCenter.y} s={0.8} fill={dark} opacity={0.5} />
            {board.yardSlots[w.color].map((s, i) => (
              <g key={i}>
                <circle cx={s.x} cy={s.y} r={cell * 0.74} fill={dark} opacity={0.5} />
                <circle cx={s.x} cy={s.y} r={cell * 0.6} fill="#fffdf7" />
                <circle cx={s.x} cy={s.y} r={cell * 0.6} fill="none" stroke={dark} strokeWidth={0.3} opacity={0.6} />
              </g>
            ))}
            {name && (
              <g transform={`translate(${w.nameAnchor.x} ${w.nameAnchor.y})`}>
                <rect x={-7.5} y={-2.1} width={15} height={4.2} rx={2.1} fill="#1c130a" opacity={0.82} />
                <text x={0} y={0.15} textAnchor="middle" dominantBaseline="central" fontSize={2.4} fontWeight={800} fill="#fff" style={{ fontFamily: "'Poppins','Nunito',sans-serif" }}>
                  {name.length > 11 ? name.slice(0, 10) + "…" : name}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Centre medallion */}
      <g filter={`url(#${pfx}-sm)`}>
        {board.wedges.map((w) => (
          <polygon key={w.color + "-cw"} points={w.centerPoly} fill={`url(#${pfx}-c-${w.color})`} stroke="#fff" strokeWidth={0.35} strokeLinejoin="round" />
        ))}
      </g>
      <polygon points={board.centerBadge} fill={`url(#${pfx}-badge)`} stroke="#caa86a" strokeWidth={0.5} strokeLinejoin="round" filter={`url(#${pfx}-shadow)`} />
      <Crown x={50} y={50.4} s={1.1} fill="#f2c84b" />
    </svg>
  );
}
