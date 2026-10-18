import { SPRIG_MIN_FRAME } from "../brainvitaTheme";
import { BoardSvg, HOLE_CENTRES, boardOutline, ornamentSpots } from "./boardKit";

/**
 * Toy box. A playroom at lamp-light: a floor of wooden boards, with a few gold stars dropped on it; a thick
 * moulded plastic game tray in glossy blue with one deep well for every marble and a sticker in each notch;
 * glossy red balls for marbles. Beside it lie a stack of lettered blocks, a rubber duck, a fan of crayons and a
 * star. The toys keep their bright colours, but the room round them is warm and dim, so they stand out of it.
 */

const PLANK_COUNT = 12;
const PLANK_TONES = ["#84552a", "#7a4d25", "#8c5b2e", "#76491f", "#80522a", "#8a592c"] as const;
const FLOOR_STARS = [
  { x: 12, y: 12, size: 2.4, turn: -12 },
  { x: 90, y: 41, size: 1.8, turn: 14 },
  { x: 8, y: 63, size: 1.5, turn: 20 },
  { x: 93, y: 88, size: 2.2, turn: -8 },
] as const;

const STAR_POINTS = "0,-1 0.26,-0.36 0.95,-0.31 0.42,0.14 0.59,0.81 0,0.45 -0.59,0.81 -0.42,0.14 -0.95,-0.31 -0.26,-0.36";

/** The floor: boards laid across, each with its own tone, a dark seam and a little grain; a few stars lie on it. */
export function ToyScene() {
  const plankHeight = 100 / PLANK_COUNT;
  return (
    <>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {Array.from({ length: PLANK_COUNT }, (_, index) => (
          <g key={index}>
            <rect y={index * plankHeight} width="100" height={plankHeight} fill={PLANK_TONES[index % PLANK_TONES.length]} opacity="0.55" />
            <path d={`M0 ${index * plankHeight + plankHeight * 0.34} C 24 ${index * plankHeight + plankHeight * 0.2} 52 ${index * plankHeight + plankHeight * 0.52} 100 ${index * plankHeight + plankHeight * 0.3}`} stroke="rgba(40,18,4,0.22)" strokeWidth="0.18" fill="none" />
            <path d={`M0 ${index * plankHeight + plankHeight * 0.72} C 30 ${index * plankHeight + plankHeight * 0.62} 64 ${index * plankHeight + plankHeight * 0.84} 100 ${index * plankHeight + plankHeight * 0.7}`} stroke="rgba(255,210,150,0.1)" strokeWidth="0.16" fill="none" />
            <rect y={index * plankHeight} width="100" height="0.28" fill="rgba(25,10,0,0.5)" />
          </g>
        ))}
        {FLOOR_STARS.map(({ x, y, size, turn }) => (
          <polygon key={`${x}-${y}`} points={STAR_POINTS} transform={`translate(${x} ${y}) rotate(${turn}) scale(${size})`} fill="#ffc21a" stroke="#fff0b3" strokeWidth="0.08" opacity="0.8" />
        ))}
      </svg>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 44%, transparent 38%, rgba(18,8,0,0.6) 100%)" }} />
    </>
  );
}

/** A sticker in a notch: a star, a circle, a triangle or a square, each with a white edge. */
function Sticker({ index, x, y }: { index: number; x: number; y: number }) {
  const fill = ["#ffc21a", "#ff5c8a", "#2ee59d", "#ff8a1f"][index % 4];
  const edge = { stroke: "#ffffff", strokeWidth: 0.06, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${x} ${y})`}>
      {index % 4 === 0 && <polygon points="0,-0.24 0.07,-0.08 0.24,-0.07 0.11,0.04 0.15,0.22 0,0.12 -0.15,0.22 -0.11,0.04 -0.24,-0.07 -0.07,-0.08" fill={fill} {...edge} />}
      {index % 4 === 1 && <circle r="0.2" fill={fill} {...edge} />}
      {index % 4 === 2 && <polygon points="0,-0.22 0.22,0.17 -0.22,0.17" fill={fill} {...edge} />}
      {index % 4 === 3 && <rect x="-0.17" y="-0.17" width="0.34" height="0.34" rx="0.06" fill={fill} {...edge} />}
    </g>
  );
}

/** The tray: moulded plastic with a thick navy edge, a gloss across its top, and one deep well for each marble. */
export function ToySurface({ frame }: { frame: number }) {
  const { outer, groove } = boardOutline(frame);
  const spots = ornamentSpots(frame);
  return (
    <BoardSvg frame={frame} shadow="drop-shadow(0 16px 12px rgba(0,0,0,0.55))">
      <defs>
        <linearGradient id="bt-plastic" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#4a86f5" />
          <stop offset="55%" stopColor="#2a62dc" />
          <stop offset="100%" stopColor="#1d47b0" />
        </linearGradient>
        <linearGradient id="bt-gloss" x1="0" y1="0" x2="0.9" y2="0.9">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={outer} fill="#0a1f5a" transform="translate(0 0.26)" />
      <path d={outer} fill="#12306f" transform="translate(0 0.13)" />
      <path d={outer} fill="url(#bt-plastic)" />
      <path d={outer} fill="url(#bt-gloss)" />
      <path d={outer} fill="none" stroke="rgba(190,215,255,0.75)" strokeWidth="0.04" />
      <path d={groove} fill="none" stroke="rgba(8,28,92,0.6)" strokeWidth="0.045" />
      <path d={groove} fill="none" stroke="rgba(170,205,255,0.4)" strokeWidth="0.022" transform="translate(0.018 0.026)" />
      {HOLE_CENTRES.map(({ hole, cx, cy }) => (
        <g key={hole}>
          <circle cx={cx} cy={cy} r="0.54" fill="none" stroke="rgba(6,22,80,0.6)" strokeWidth="0.09" />
          <circle cx={cx} cy={cy} r="0.585" fill="none" stroke="rgba(170,205,255,0.45)" strokeWidth="0.022" />
        </g>
      ))}
      {frame >= SPRIG_MIN_FRAME && spots.map(({ key, x, y }, index) => <Sticker key={key} index={index} x={x} y={y} />)}
    </BoardSvg>
  );
}

interface BlockSpec {
  x: number;
  y: number;
  front: string;
  top: string;
  side: string;
  letter: string;
  turn?: number;
}

function Block({ x, y, front, top, side, letter, turn = 0 }: BlockSpec) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <polygon points="0,0 14,-12 74,-12 60,0" fill={top} />
      <polygon points="60,0 74,-12 74,48 60,60" fill={side} />
      <rect x="0" y="0" width="60" height="60" rx="5" fill={front} />
      <rect x="4" y="4" width="52" height="52" rx="3" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <text x="30" y="46" textAnchor="middle" fontFamily="Fredoka, Nunito, sans-serif" fontWeight="700" fontSize="40" fill="#ffffff" stroke="rgba(0,0,0,0.2)" strokeWidth="1">
        {letter}
      </text>
    </g>
  );
}

export function Blocks({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 190 170" className={className}>
      <ellipse cx="95" cy="160" rx="84" ry="8" fill="rgba(80,50,0,0.22)" />
      <Block x={14} y={98} front="#ef4444" top="#ff8a8a" side="#b91c1c" letter="A" />
      <Block x={92} y={98} front="#3b82f6" top="#8ab8ff" side="#1d4ed8" letter="B" />
      <Block x={52} y={34} front="#fbbf24" top="#ffe08a" side="#d97706" letter="C" turn={-7} />
    </svg>
  );
}

export function Duck({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 150 120" className={className}>
      <ellipse cx="72" cy="110" rx="50" ry="7" fill="rgba(80,50,0,0.22)" />
      <path d="M18 70 C 18 40 56 38 84 44 C 112 50 130 66 124 88 C 118 108 40 112 22 90 Z" fill="#ffd23f" />
      <path d="M28 96 C 56 106 100 106 120 88 C 112 108 40 112 28 96 Z" fill="#f0b400" />
      <circle cx="42" cy="38" r="26" fill="#ffd23f" />
      <path d="M16 38 C 4 34 2 46 12 50 C 20 52 28 48 30 42 Z" fill="#ff8a1f" />
      <circle cx="46" cy="32" r="3.6" fill="#1f2937" />
      <circle cx="47.2" cy="30.8" r="1.1" fill="#ffffff" />
      <path d="M76 66 C 96 58 114 70 108 86 C 94 90 78 82 76 66 Z" fill="#f6b800" />
      <ellipse cx="34" cy="48" rx="5" ry="3" fill="#ff9aa2" opacity="0.7" />
    </svg>
  );
}

export function Crayons({ className }: { className: string }) {
  const crayons = [
    { turn: -24, body: "#ef4444", dark: "#b91c1c" },
    { turn: -4, body: "#3b82f6", dark: "#1d4ed8" },
    { turn: 16, body: "#22c55e", dark: "#15803d" },
  ];
  return (
    <svg aria-hidden viewBox="0 0 160 150" className={className}>
      <ellipse cx="80" cy="140" rx="60" ry="6" fill="rgba(80,50,0,0.2)" />
      {crayons.map(({ turn, body, dark }) => (
        <g key={body} transform={`translate(80 138) rotate(${turn})`}>
          <polygon points="-9,-110 9,-110 0,-130" fill={dark} />
          <rect x="-9" y="-110" width="18" height="108" rx="2" fill={body} />
          <rect x="-9" y="-92" width="18" height="40" fill="#fff8e6" opacity="0.92" />
          <rect x="-9" y="-92" width="18" height="5" fill={dark} />
          <rect x="-9" y="-57" width="18" height="5" fill={dark} />
        </g>
      ))}
    </svg>
  );
}

/** A fat toy star, with a light face and a darker edge, lying on its side. */
export function ToyStar({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 120" className={className}>
      <ellipse cx="62" cy="112" rx="40" ry="6" fill="rgba(0,0,0,0.35)" />
      <polygon points="60,6 75,42 114,46 84,72 93,110 60,90 27,110 36,72 6,46 45,42" fill="#d98a00" stroke="#d98a00" strokeWidth="10" strokeLinejoin="round" />
      <polygon points="60,6 75,42 114,46 84,72 93,110 60,90 27,110 36,72 6,46 45,42" fill="#ffc21a" stroke="#ffc21a" strokeWidth="6" strokeLinejoin="round" />
      <polygon points="60,22 70,46 96,49 76,66 82,92 60,78" fill="rgba(255,240,170,0.55)" />
    </svg>
  );
}

/** The playroom's clutter, in the four corners the cross leaves empty. */
export function ToyProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Blocks className="absolute -left-[11%] -top-[16%] w-[33%] drop-shadow-[0_8px_6px_rgba(0,0,0,0.4)]" />
      <Duck className="absolute -right-[8%] top-[1%] w-[27%] rotate-[6deg] drop-shadow-[0_8px_6px_rgba(0,0,0,0.4)]" />
      <Crayons className="absolute -bottom-[14%] -left-[10%] w-[30%] drop-shadow-[0_8px_6px_rgba(0,0,0,0.4)]" />
      <ToyStar className="absolute -bottom-[9%] right-0 w-[16%] rotate-[14deg] drop-shadow-[0_8px_6px_rgba(0,0,0,0.4)]" />
    </div>
  );
}
