import type { CSSProperties } from "react";
import { useSkinTokens } from "./BrainVitaSkinContext";
import { ARM_END, ARM_START, GRID_UNITS, crossOutlinePath } from "./brainvitaTheme";

/**
 * The things lying on the table round the board: a sack of marbles, a notepad that states the goal,
 * a pencil, and a few leaves. They are placed in percentages of the board's own square, in the four
 * corners the cross leaves empty, so they scale with it on every screen and never take layout room.
 * All of it is decoration, hidden from assistive tech and never in the way of a tap.
 */

const MARBLE_GRADIENT_ID = "bvp-marble";
const LEAF_GRADIENT_ID = "bvp-leaf";
const BURLAP_GRADIENT_ID = "bvp-burlap";

/** The holes of the little sketch on the notepad, in board units. */
export const SKETCH_HOLES = Array.from({ length: GRID_UNITS * GRID_UNITS }, (_, index) => ({ row: Math.floor(index / GRID_UNITS), col: index % GRID_UNITS })).filter(
  ({ row, col }) => (row >= ARM_START && row < ARM_END) || (col >= ARM_START && col < ARM_END),
);

function SharedDefs() {
  const { marbleStops } = useSkinTokens();
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <radialGradient id={MARBLE_GRADIENT_ID} cx="0.34" cy="0.28" r="0.8">
          <stop offset="0%" stopColor={marbleStops[0]} />
          <stop offset="17%" stopColor={marbleStops[1]} />
          <stop offset="46%" stopColor={marbleStops[2]} />
          <stop offset="74%" stopColor={marbleStops[3]} />
          <stop offset="100%" stopColor={marbleStops[4]} />
        </radialGradient>
        <linearGradient id={LEAF_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6cb852" />
          <stop offset="100%" stopColor="#2f7d32" />
        </linearGradient>
        <linearGradient id={BURLAP_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c7a876" />
          <stop offset="100%" stopColor="#8a6a3e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Sack({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 220 230" className={className}>
      <path d="M34 96 C 8 146 18 214 112 220 C 196 216 212 150 184 96 Z" fill={`url(#${BURLAP_GRADIENT_ID})`} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={`v${i}`} d={`M${30 + i * 20} 100 C ${26 + i * 20} 150 ${36 + i * 20} 190 ${34 + i * 20} 218`} stroke="rgba(70,45,18,0.22)" strokeWidth="1.4" fill="none" />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <path key={`h${i}`} d={`M24 ${118 + i * 17} C 80 ${126 + i * 17} 150 ${126 + i * 17} 200 ${118 + i * 17}`} stroke="rgba(70,45,18,0.2)" strokeWidth="1.4" fill="none" />
      ))}
      <path d="M40 98 C 52 62 164 62 178 98 C 160 112 58 112 40 98 Z" fill="#a98a58" />
      <ellipse cx="109" cy="86" rx="58" ry="17" fill="#2e2012" />
      {[
        [84, 84, 15],
        [112, 78, 15],
        [134, 88, 14],
        [100, 92, 13],
      ].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={`url(#${MARBLE_GRADIENT_ID})`} />
      ))}
      <path d="M44 102 C 70 114 148 114 176 102" stroke="#6d4b22" strokeWidth="6" strokeLinecap="round" fill="none" />
      {[
        [26, 196, 17],
        [52, 218, 16],
        [88, 226, 15],
      ].map(([x, y, r]) => (
        <circle key={`s${x}-${y}`} cx={x} cy={y} r={r} fill={`url(#${MARBLE_GRADIENT_ID})`} />
      ))}
    </svg>
  );
}

function Notepad({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 210 280" className={className}>
      <rect x="26" y="40" width="168" height="228" rx="8" fill="rgba(0,0,0,0.35)" transform="translate(5 7)" />
      <rect x="22" y="34" width="168" height="228" rx="8" fill="#f6f1e4" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1="30" x2="182" y1={150 + i * 11} y2={150 + i * 11} stroke="rgba(70,90,170,0.16)" strokeWidth="1" />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i} transform={`translate(${36 + i * 14} 34)`}>
          <ellipse cx="0" cy="0" rx="4.6" ry="6" fill="#2b2b2e" />
          <path d="M0 -3 L0 -14" stroke="#b9bcc4" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ))}
      <g transform="translate(75 56) scale(9)" stroke="#3a4fb0" fill="none">
        <path d={crossOutlinePath(0.3)} strokeWidth="0.12" />
        {SKETCH_HOLES.map(({ row, col }) => (
          <circle key={`${row}-${col}`} cx={col + 0.5} cy={row + 0.5} r="0.3" strokeWidth="0.09" />
        ))}
      </g>
      <text transform="translate(40 150) rotate(-5)" fontFamily="Caveat, 'Noto Sans Telugu', cursive" fontSize="21" fontWeight="600" fill="#2d3da0">
        <tspan x="0" dy="0">
          Remove
        </tspan>
        <tspan x="0" dy="21">
          all marbles
        </tspan>
        <tspan x="0" dy="21">
          leaving only
        </tspan>
        <tspan x="0" dy="21">
          one!
        </tspan>
      </text>
      <path d="M42 222 C 68 217 98 225 122 219" stroke="#2d3da0" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Pencil({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 220" className={className}>
      <path d="M20 4 L30 30 L10 30 Z" fill="#e9c892" />
      <path d="M20 4 L24 14 L16 14 Z" fill="#3a2a1a" />
      <rect x="10" y="30" width="20" height="150" fill="#f3a21c" />
      <rect x="10" y="30" width="7" height="150" fill="#fbc55a" />
      <rect x="10" y="180" width="20" height="14" fill="#b9bcc4" />
      <rect x="10" y="194" width="20" height="22" rx="4" fill="#d96a6a" />
    </svg>
  );
}

function Leaf({ className, style }: { className: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 140 80" className={className} style={style}>
      <path d="M4 40 C 34 -6 104 -6 136 40 C 104 86 34 86 4 40 Z" fill={`url(#${LEAF_GRADIENT_ID})`} />
      <path d="M8 40 L 132 40" stroke="#1e5a22" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

/** The table dressing for one board. Sits behind the board and overflows its square into the corners. */
export function BrainVitaProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <SharedDefs />
      <Sack className="absolute -left-[13%] -top-[10%] w-[36%] -rotate-[8deg] drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]" />
      <Notepad className="absolute -right-[7%] -top-[19%] w-[36%] rotate-[7deg] drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]" />
      <Pencil className="absolute -right-[14%] top-[8%] h-[32%] w-auto rotate-[14deg] drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]" />
      <Leaf className="absolute -bottom-[8%] -left-[12%] w-[34%] rotate-[-24deg] blur-[1.5px]" />
      <Leaf className="absolute -bottom-[14%] left-[-4%] w-[26%] rotate-[18deg] blur-[2px]" style={{ opacity: 0.9 }} />
    </div>
  );
}
