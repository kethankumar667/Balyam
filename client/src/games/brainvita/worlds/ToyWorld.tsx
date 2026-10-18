import { SPRIG_MIN_FRAME } from "../brainvitaTheme";
import { BoardSvg, HOLE_CENTRES, boardOutline, ornamentSpots } from "./boardKit";

/**
 * Toy box. A playroom floor with a bright play mat; a thick moulded plastic game tray with a ring of
 * colour round every hole and a sticker in each notch; cartoon balls for marbles. Beside it lie a stack of
 * lettered blocks, a rubber duck and a fan of crayons. It is the loud, friendly world, and the only light one.
 */

const RING_COLOURS = ["#ff4d6d", "#ffc21a", "#2ee59d", "#a855f7", "#ff8a1f"] as const;

/** The play mat: soft shapes in primary colours on the floor, and a scatter of white dots over them. */
export function ToyScene() {
  return (
    <>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="bt-dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="0.7" fill="rgba(255,255,255,0.55)" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#bt-dots)" />
        <circle cx="10" cy="20" r="15" fill="#ff8fab" opacity="0.34" />
        <polygon points="86,6 99,30 73,30" fill="#6ec1ff" opacity="0.4" />
        <path d="M4 52 q 6 -8 12 0 t 12 0 t 12 0" stroke="#59cf7a" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5" />
        <rect x="78" y="62" width="15" height="15" rx="2" fill="#ffd23f" opacity="0.55" transform="rotate(14 85 70)" />
        <circle cx="18" cy="86" r="11" fill="#b794f6" opacity="0.36" />
        <path d="M66 94 q 6 -8 12 0 t 12 0" stroke="#ff7a3d" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.45" />
      </svg>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 44%, transparent 56%, rgba(150,96,10,0.3) 100%)" }} />
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

/** The tray: moulded plastic with a thick edge, a gloss across its top, and a ring of colour round each hole. */
export function ToySurface({ frame }: { frame: number }) {
  const { outer, groove } = boardOutline(frame);
  const spots = ornamentSpots(frame);
  return (
    <BoardSvg frame={frame} shadow="drop-shadow(0 14px 12px rgba(80,50,0,0.4))">
      <defs>
        <linearGradient id="bt-plastic" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#5b96ff" />
          <stop offset="55%" stopColor="#2f6fe8" />
          <stop offset="100%" stopColor="#2352c2" />
        </linearGradient>
        <linearGradient id="bt-gloss" x1="0" y1="0" x2="0.9" y2="0.9">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="34%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={outer} fill="#173f94" transform="translate(0 0.21)" />
      <path d={outer} fill="url(#bt-plastic)" />
      <path d={outer} fill="url(#bt-gloss)" />
      <path d={outer} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.045" />
      <path d={groove} fill="none" stroke="rgba(15,45,120,0.55)" strokeWidth="0.04" />
      <path d={groove} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.022" transform="translate(0.018 0.026)" />
      {HOLE_CENTRES.map(({ hole, cx, cy }) => {
        const colour = RING_COLOURS[(Math.floor(cy) + Math.floor(cx)) % RING_COLOURS.length];
        return (
          <g key={hole}>
            <circle cx={cx} cy={cy} r="0.53" fill="none" stroke="rgba(15,45,120,0.5)" strokeWidth="0.12" />
            <circle cx={cx} cy={cy} r="0.52" fill="none" stroke={colour} strokeWidth="0.1" />
            <circle cx={cx} cy={cy} r="0.565" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.02" />
          </g>
        );
      })}
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

/** The playroom's clutter, in the four corners the cross leaves empty. */
export function ToyProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Blocks className="absolute -left-[11%] -top-[16%] w-[33%] drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]" />
      <Duck className="absolute -right-[8%] top-[1%] w-[27%] rotate-[6deg] drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]" />
      <Crayons className="absolute -bottom-[14%] -left-[10%] w-[30%] drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]" />
    </div>
  );
}
