import { holeAt } from "../brainvitaRules";
import { GRID_UNITS, SPRIG_MIN_FRAME } from "../brainvitaTheme";
import { BoardSvg, HOLE_CENTRES, boardOutline, ornamentSpots } from "./boardKit";
import { WorldMotion, motion } from "./WorldMotion";

/**
 * Royal palace. The table is a deep crimson carpet with a faint gold lattice worked into it, under a row of
 * dim arches, with marigold petals drifting down. The board is a slab of burnished copper, engraved with
 * filigree and bordered in thick gold, every hole wearing a beaded gold rim and a small garnet set at each
 * crossing; the marbles are cut emeralds. Brass lamps burn beside it, and a bunch of marigolds lies on the
 * carpet. The carpet is kept quiet so the copper and the emeralds are what the eye finds.
 */

const GOLD = "#e8b84a";
const GOLD_DARK = "#9c6f17";

const PETALS = [
  { left: "8%", seconds: 17, delay: 0, drift: 36, size: 9 },
  { left: "21%", seconds: 21, delay: 6, drift: -30, size: 7 },
  { left: "37%", seconds: 19, delay: 11, drift: 42, size: 10 },
  { left: "55%", seconds: 23, delay: 3, drift: -38, size: 8 },
  { left: "71%", seconds: 18, delay: 9, drift: 30, size: 9 },
  { left: "88%", seconds: 22, delay: 14, drift: -26, size: 7 },
];

/** A cusped arch opening centred on `m`, 28 wide, rising from the floor line of the strip. */
const arch = (m: number): string => `M${m - 14} 26 V 12 C ${m - 14} 6 ${m - 6} 3 ${m} 0 C ${m + 6} 3 ${m + 14} 6 ${m + 14} 12 V 26 Z`;

export function PalaceScene() {
  return (
    <>
      <WorldMotion />
      <svg aria-hidden className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="bp-carpet" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M13 1 L25 13 L13 25 L1 13 Z" fill="none" stroke={GOLD} strokeWidth="0.9" opacity="0.5" />
            <path d="M13 7 L19 13 L13 19 L7 13 Z" fill="none" stroke={GOLD} strokeWidth="0.7" opacity="0.4" />
            <circle cx="13" cy="13" r="1.5" fill={GOLD} opacity="0.55" />
            <circle cx="0" cy="0" r="1.1" fill={GOLD} opacity="0.35" />
            <circle cx="26" cy="26" r="1.1" fill={GOLD} opacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bp-carpet)" opacity="0.2" />
      </svg>
      <svg aria-hidden viewBox="0 0 100 26" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-0 h-[22vh] w-full">
        <defs>
          <linearGradient id="bp-glow" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffb44a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7a1f2d" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="100" height="26" fill="#1b060c" opacity="0.6" />
        {[20, 50, 80].map((m) => (
          <g key={m}>
            <path d={arch(m)} fill="url(#bp-glow)" />
            <path d={arch(m)} fill="none" stroke={GOLD} strokeWidth="0.4" opacity="0.5" />
          </g>
        ))}
        <rect y="24.8" width="100" height="1.2" fill={GOLD} opacity="0.45" />
      </svg>
      {PETALS.map((petal) => (
        <span
          key={petal.left}
          data-bvw
          className="absolute top-0"
          style={{
            left: petal.left,
            width: petal.size,
            height: petal.size * 1.5,
            borderRadius: "60% 40% 60% 40% / 70% 70% 30% 30%",
            background: "linear-gradient(160deg, #fbbf24, #ea580c)",
            ["--bvw-drift" as string]: `${petal.drift}px`,
            animation: motion("petal", petal.seconds, { delay: petal.delay, timing: "ease-in-out" }),
          }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 46%, rgba(20,3,8,0.6) 100%)" }} />
    </>
  );
}

/** Where four holes meet, inside the cross: the places a jewel can be set. */
const CROSSINGS = Array.from({ length: (GRID_UNITS - 1) * (GRID_UNITS - 1) }, (_, index) => ({ row: Math.floor(index / (GRID_UNITS - 1)) + 1, col: (index % (GRID_UNITS - 1)) + 1 })).filter(
  ({ row, col }) => [holeAt(row - 1, col - 1), holeAt(row - 1, col), holeAt(row, col - 1), holeAt(row, col)].every((hole) => hole !== null),
);

const BEADS = Array.from({ length: 10 }, (_, index) => (index / 10) * Math.PI * 2);

/** A four-petalled flower, the board's mark in each notch. */
function Lotus({ x, y, flipX, flipY }: { x: number; y: number; flipX: number; flipY: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flipX} ${flipY})`}>
      {[0, 90, 180, 270].map((turn) => (
        <path key={turn} d="M0 0 C 0.08 -0.1 0.08 -0.24 0 -0.3 C -0.08 -0.24 -0.08 -0.1 0 0 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="0.015" transform={`rotate(${turn})`} />
      ))}
      <circle r="0.06" fill="#9a1f33" stroke={GOLD_DARK} strokeWidth="0.015" />
    </g>
  );
}

export function PalaceSurface({ frame }: { frame: number }) {
  const { outer, groove } = boardOutline(frame);
  const spots = ornamentSpots(frame);
  return (
    <BoardSvg frame={frame} shadow="drop-shadow(0 16px 16px rgba(10,0,4,0.7))">
      <defs>
        <linearGradient id="bp-marble" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#f2b56a" />
          <stop offset="48%" stopColor="#d88b40" />
          <stop offset="100%" stopColor="#a85b23" />
        </linearGradient>
        <pattern id="bp-filigree" width="0.62" height="0.62" patternUnits="userSpaceOnUse">
          <path d="M0.31 0.04 L0.58 0.31 L0.31 0.58 L0.04 0.31 Z" fill="none" stroke="rgba(92,42,8,0.3)" strokeWidth="0.022" />
          <circle cx="0.31" cy="0.31" r="0.035" fill="rgba(255,226,160,0.4)" />
        </pattern>
        <clipPath id="bp-slab">
          <path d={outer} />
        </clipPath>
        <g id="bp-rim">
          <circle r="0.535" fill="none" stroke="rgba(80,50,0,0.5)" strokeWidth="0.07" />
          <circle r="0.52" fill="none" stroke={GOLD} strokeWidth="0.05" />
          {BEADS.map((angle) => (
            <circle key={angle} cx={Math.cos(angle) * 0.575} cy={Math.sin(angle) * 0.575} r="0.026" fill={GOLD} stroke={GOLD_DARK} strokeWidth="0.008" />
          ))}
        </g>
      </defs>
      <path d={outer} fill="#4a2408" transform="translate(0 0.24)" />
      <path d={outer} fill="#7a3f12" transform="translate(0 0.12)" />
      <path d={outer} fill="url(#bp-marble)" />
      <g clipPath="url(#bp-slab)" fill="none" strokeLinecap="round">
        <rect x={-frame} y={-frame} width="12" height="12" fill="url(#bp-filigree)" />
        <path d="M-0.4 1.6 C 1.2 1.1 2.1 2.4 3.6 1.9 S 5.9 1.1 7.4 1.8" stroke="rgba(110,52,10,0.28)" strokeWidth="0.04" />
        <path d="M-0.4 4.9 C 1.6 5.6 2.6 4.4 4.1 5.1 S 6.2 5.8 7.4 5.0" stroke="rgba(110,52,10,0.24)" strokeWidth="0.035" />
        <path d="M-0.4 3.3 C 1.4 3.0 2.6 3.7 3.9 3.4 S 6.1 3.0 7.4 3.5" stroke="rgba(255,226,170,0.5)" strokeWidth="0.03" />
        <ellipse cx="1.8" cy="0.5" rx="2.8" ry="1" fill="rgba(255,236,190,0.2)" transform="rotate(-24 1.8 0.5)" />
      </g>
      <path d={outer} fill="none" stroke="rgba(60,28,4,0.6)" strokeWidth="0.12" />
      <path d={outer} fill="none" stroke={GOLD} strokeWidth="0.07" />
      <path d={outer} fill="none" stroke="rgba(255,244,200,0.7)" strokeWidth="0.018" transform="translate(0 -0.02)" />
      <path d={groove} fill="none" stroke={GOLD_DARK} strokeWidth="0.035" />
      <path d={groove} fill="none" stroke={GOLD} strokeWidth="0.016" transform="translate(0.012 0.016)" />
      {CROSSINGS.map(({ row, col }) => (
        <path key={`${row}-${col}`} d={`M${col} ${row - 0.11} L${col + 0.11} ${row} L${col} ${row + 0.11} L${col - 0.11} ${row} Z`} fill="#7a1426" stroke={GOLD} strokeWidth="0.025" />
      ))}
      {HOLE_CENTRES.map(({ hole, cx, cy }) => (
        <use key={hole} href="#bp-rim" x={cx} y={cy} />
      ))}
      {frame >= SPRIG_MIN_FRAME && spots.map(({ key, x, y, flipX, flipY }) => <Lotus key={key} x={x} y={y} flipX={flipX} flipY={flipY} />)}
    </BoardSvg>
  );
}

export function Diya({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 140 130" className={className}>
      <defs>
        <radialGradient id={`bp-flame-glow-${delay}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff8a1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bp-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3cd6d" />
          <stop offset="55%" stopColor="#c9962e" />
          <stop offset="100%" stopColor="#8d6516" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="122" rx="50" ry="6" fill="rgba(0,0,0,0.35)" />
      <circle cx="70" cy="46" r="42" fill={`url(#bp-flame-glow-${delay})`} data-bvw style={{ animation: motion("flicker", 2.6, { delay, timing: "ease-in-out" }), transformOrigin: "50% 50%", transformBox: "fill-box" }} />
      <path d="M70 12 C 82 28 86 40 70 58 C 54 40 58 28 70 12 Z" fill="#ff9a1f" data-bvw style={{ animation: motion("flicker", 2.1, { delay, timing: "ease-in-out" }), transformOrigin: "50% 100%", transformBox: "fill-box" }} />
      <path d="M70 28 C 77 38 78 46 70 56 C 62 46 63 38 70 28 Z" fill="#fff0b3" />
      <path d="M16 78 C 16 62 40 60 70 60 C 100 60 124 62 124 78 C 124 104 98 114 70 114 C 42 114 16 104 16 78 Z" fill="url(#bp-brass)" />
      <ellipse cx="70" cy="68" rx="46" ry="10" fill="#6e4a10" />
      <ellipse cx="70" cy="66" rx="40" ry="7" fill="#3a2506" />
      <path d="M118 74 C 134 70 140 80 128 88 C 124 82 120 78 118 74 Z" fill="#c9962e" />
      <path d="M26 82 C 40 100 60 106 76 106" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Marigold({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {Array.from({ length: 14 }, (_, index) => (
        <ellipse key={index} cx="0" cy="-15" rx="6" ry="13" fill={index % 2 === 0 ? "#f59e0b" : "#fbbf24"} transform={`rotate(${index * (360 / 14)})`} />
      ))}
      {Array.from({ length: 10 }, (_, index) => (
        <ellipse key={`i${index}`} cx="0" cy="-9" rx="4.4" ry="8" fill="#ea580c" opacity="0.9" transform={`rotate(${index * 36 + 18})`} />
      ))}
      <circle r="5" fill="#b45309" />
    </g>
  );
}

export function MarigoldBunch({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 170 130" className={className}>
      {[[30, 100, 10], [64, 106, 8]].map(([x, y, r]) => (
        <path key={x} d={`M${x} ${y} q 24 -30 ${r * 6} -56`} stroke="#3d7a3a" strokeWidth="5" fill="none" strokeLinecap="round" />
      ))}
      <path d="M40 96 C 20 70 36 54 58 62 C 56 78 52 88 40 96 Z" fill="#3d7a3a" />
      <path d="M120 100 C 146 84 150 62 128 56 C 116 72 118 88 120 100 Z" fill="#3d7a3a" />
      <Marigold x={52} y={62} size={0.95} />
      <Marigold x={106} y={74} size={1.05} />
      <Marigold x={82} y={34} size={0.78} />
      <Marigold x={142} y={108} size={0.6} />
    </svg>
  );
}

/** The palace's furnishings, in the four corners the cross leaves empty. */
export function PalaceProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <WorldMotion />
      <Diya className="absolute -left-[10%] -top-[16%] w-[30%] drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]" />
      <MarigoldBunch className="absolute -right-[11%] -top-[18%] w-[33%] rotate-[5deg] drop-shadow-[0_8px_8px_rgba(0,0,0,0.4)]" />
      <Diya className="absolute -bottom-[12%] -left-[9%] w-[24%] drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]" delay={1.3} />
    </div>
  );
}
