import { SPRIG_MIN_FRAME, ARM_END, ARM_START } from "../brainvitaTheme";
import { BoardSvg, HOLE_CENTRES, boardOutline, ornamentSpots, scatter } from "./boardKit";
import { WorldMotion, motion } from "./WorldMotion";

/**
 * Zen garden. The table is raked sand, with ripples spreading out from the board as if it were a great flat
 * stone set in the garden; the board is a thick slab of pale sandstone, raked like the sand round it, with a
 * bronze ring set round every hole, a hand-brushed circle in each notch and moss in the corners; the marbles
 * are ivory river pebbles. Round it stand a stone lantern with a small warm light, a stand of bamboo and
 * fern, and a cairn. Nothing else glows and nothing is glossy: it is the quiet world.
 */

const RIPPLES = Array.from({ length: 15 }, (_, index) => 20 + index * 5.2);
const SLAB_RAKES = Array.from({ length: 9 }, (_, index) => 0.55 + index * 0.84);

/** The sand: raked rings spreading from the board, each with a thin bright ridge beside its furrow. */
export function ZenScene() {
  return (
    <>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {RIPPLES.map((radius) => (
          <g key={radius} fill="none">
            <circle cx="50" cy="46" r={radius} stroke="rgba(80,66,38,0.3)" strokeWidth="0.32" />
            <circle cx="50" cy="46" r={radius + 0.55} stroke="rgba(255,250,232,0.42)" strokeWidth="0.22" />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 44%, rgba(58,46,24,0.55) 100%)" }} />
    </>
  );
}

const SLAB_SPECKS = scatter(90, 11);

function Moss({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="0.55" ry="0.36" fill="#6c8a55" opacity="0.92" />
      <ellipse cx="0.22" cy="0.12" rx="0.34" ry="0.24" fill="#85a468" opacity="0.9" />
      <ellipse cx="-0.2" cy="0.1" rx="0.28" ry="0.2" fill="#587545" opacity="0.9" />
      {[[-0.1, -0.12], [0.3, -0.05], [0.05, 0.2]].map(([dx, dy]) => (
        <circle key={`${dx}${dy}`} cx={dx} cy={dy} r="0.05" fill="#a9c487" />
      ))}
    </g>
  );
}

/** A hand-brushed circle, left open as a brush leaves it, in dark ink pressed into the pale stone. */
function Enso({ x, y, flipX, flipY }: { x: number; y: number; flipX: number; flipY: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flipX} ${flipY})`} fill="none" strokeLinecap="round">
      <path d="M0.2 -0.2 A0.28 0.28 0 1 1 -0.2 -0.16" stroke="rgba(255,252,238,0.5)" strokeWidth="0.075" transform="translate(0.01 0.014)" />
      <path d="M0.2 -0.2 A0.28 0.28 0 1 1 -0.2 -0.16" stroke="rgba(62,50,34,0.75)" strokeWidth="0.06" />
    </g>
  );
}

export function StoneSurface({ frame }: { frame: number }) {
  const { span, outer, groove } = boardOutline(frame);
  const spots = ornamentSpots(frame);
  const near = ARM_START - frame;
  const far = ARM_END + frame;
  return (
    <BoardSvg frame={frame} shadow="drop-shadow(0 16px 14px rgba(40,30,12,0.55))">
      <defs>
        <linearGradient id="bz-slate" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#d6ccb4" />
          <stop offset="48%" stopColor="#bdb298" />
          <stop offset="100%" stopColor="#9a8f75" />
        </linearGradient>
        <linearGradient id="bz-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,250,232,0.55)" />
          <stop offset="100%" stopColor="rgba(60,48,28,0.25)" />
        </linearGradient>
        <clipPath id="bz-slab">
          <path d={outer} />
        </clipPath>
      </defs>
      <path d={outer} fill="#5f5540" transform="translate(0 0.22)" />
      <path d={outer} fill="#7a6f56" transform="translate(0 0.1)" />
      <path d={outer} fill="url(#bz-slate)" />
      <g clipPath="url(#bz-slab)">
        {SLAB_RAKES.map((y, index) => (
          <path
            key={y}
            d={`M-0.6 ${y} C 1.6 ${y - 0.22} 2.8 ${y + 0.24} 4.2 ${y} S 6.6 ${y - 0.2} 8 ${y + 0.1}`}
            stroke={index % 2 === 0 ? "rgba(70,56,32,0.16)" : "rgba(255,250,232,0.32)"}
            strokeWidth="0.04"
            fill="none"
          />
        ))}
        {SLAB_SPECKS.map(({ x, y, r }, index) => (
          <circle key={index} cx={x * span - frame} cy={y * span - frame} r={0.01 + r * 0.026} fill={r > 0.5 ? "#fffaf0" : "#4a3f2a"} opacity={r > 0.5 ? 0.34 : 0.22} />
        ))}
        {[[near, near], [far, near], [near, far], [far, far]].map(([x, y]) => (
          <Moss key={`${x}-${y}`} x={x} y={y} />
        ))}
      </g>
      <path d={outer} fill="none" stroke="url(#bz-rim)" strokeWidth="0.08" />
      <path d={outer} fill="none" stroke="rgba(255,252,238,0.55)" strokeWidth="0.03" />
      <path d={groove} fill="none" stroke="rgba(58,46,26,0.55)" strokeWidth="0.04" />
      <path d={groove} fill="none" stroke="rgba(255,250,232,0.5)" strokeWidth="0.022" transform="translate(0.018 0.026)" />
      {HOLE_CENTRES.map(({ hole, cx, cy }) => (
        <g key={hole}>
          <circle cx={cx} cy={cy} r="0.56" fill="none" stroke="rgba(70,52,26,0.5)" strokeWidth="0.05" />
          <circle cx={cx} cy={cy} r="0.53" fill="none" stroke="#b08f55" strokeWidth="0.035" />
          <circle cx={cx} cy={cy} r="0.6" fill="none" stroke="rgba(255,250,232,0.5)" strokeWidth="0.022" />
        </g>
      ))}
      {frame >= SPRIG_MIN_FRAME && spots.map(({ key, x, y, flipX, flipY }) => <Enso key={key} x={x} y={y} flipX={flipX} flipY={flipY} />)}
    </BoardSvg>
  );
}

export function Lantern({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 190" className={className}>
      <ellipse cx="60" cy="182" rx="40" ry="6" fill="rgba(0,0,0,0.25)" />
      <path d="M30 178 Q 28 164 38 160 L 82 160 Q 92 164 90 178 Z" fill="#7d868b" />
      <rect x="48" y="104" width="24" height="58" rx="3" fill="#8f979b" />
      <rect x="48" y="104" width="9" height="58" rx="3" fill="#a7aeb2" />
      <path d="M32 106 L 88 106 L 82 94 L 38 94 Z" fill="#6c7479" />
      <rect x="40" y="52" width="40" height="44" rx="3" fill="#868e93" />
      <rect x="48" y="60" width="24" height="28" rx="2" fill="#2a1d10" />
      <rect x="48" y="60" width="24" height="28" rx="2" fill="#ffc46b" data-bvw style={{ animation: motion("flicker", 3.2, { timing: "ease-in-out" }), transformOrigin: "50% 100%", transformBox: "fill-box" }} opacity="0.95" />
      <path d="M60 60 V 88 M48 74 H 72" stroke="#2a1d10" strokeWidth="2" />
      <path d="M14 56 Q 60 18 106 56 L 98 60 Q 60 38 22 60 Z" fill="#5e676c" />
      <path d="M22 60 Q 60 38 98 60 L 94 66 Q 60 48 26 66 Z" fill="#79828a" />
      <circle cx="60" cy="24" r="8" fill="#8f979b" />
      <path d="M52 30 L 68 30 L 64 38 L 56 38 Z" fill="#6c7479" />
      {[[28, 60], [40, 52], [78, 54], [92, 60]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#6c8a55" />
      ))}
    </svg>
  );
}

export function Bamboo({ className }: { className: string }) {
  const stalks = [
    { x: 30, lean: -3, height: 290, shade: "#86a85d" },
    { x: 62, lean: 2, height: 250, shade: "#76984f" },
    { x: 92, lean: 4, height: 210, shade: "#8cae63" },
  ];
  return (
    <svg aria-hidden viewBox="0 0 130 300" className={className}>
      <defs>
        <linearGradient id="bz-bamboo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5f7f3f" />
          <stop offset="40%" stopColor="#9bbd70" />
          <stop offset="100%" stopColor="#5a7a3b" />
        </linearGradient>
      </defs>
      {stalks.map(({ x, lean, height, shade }) => (
        <g key={x} transform={`rotate(${lean} ${x} 300)`}>
          <rect x={x - 7} y={300 - height} width="14" height={height} rx="4" fill="url(#bz-bamboo)" />
          {Array.from({ length: Math.floor(height / 46) }, (_, node) => (
            <rect key={node} x={x - 8.5} y={300 - 40 - node * 46} width="17" height="5" rx="2" fill={shade} stroke="rgba(40,60,20,0.5)" strokeWidth="0.8" />
          ))}
          {[0, 1, 2].map((leaf) => (
            <path
              key={leaf}
              d="M0 0 C 14 -6 34 -4 46 6 C 30 6 14 4 0 0 Z"
              fill="#6f9a4a"
              transform={`translate(${x} ${300 - height + 18 + leaf * 26}) rotate(${leaf % 2 === 0 ? -14 : 196 + leaf * 6}) scale(${leaf % 2 === 0 ? 1 : -1} 1)`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Cairn({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 150 120" className={className}>
      <ellipse cx="62" cy="110" rx="52" ry="7" fill="rgba(0,0,0,0.25)" />
      <ellipse cx="62" cy="98" rx="46" ry="16" fill="#8d9498" />
      <ellipse cx="62" cy="93" rx="42" ry="12" fill="#a3aaae" />
      <ellipse cx="64" cy="72" rx="33" ry="13" fill="#868e92" />
      <ellipse cx="64" cy="68" rx="29" ry="9" fill="#9da4a8" />
      <ellipse cx="60" cy="49" rx="22" ry="10" fill="#7f878b" />
      <ellipse cx="60" cy="46" rx="19" ry="7" fill="#969da1" />
      <ellipse cx="62" cy="31" rx="13" ry="7" fill="#899094" />
      <ellipse cx="62" cy="29" rx="11" ry="5" fill="#a1a8ac" />
      <g transform="translate(122 96) rotate(-18)">
        <path d="M0 -20 L5 -8 L16 -12 L11 -1 L20 3 L8 8 L10 20 L0 13 L-10 20 L-8 8 L-20 3 L-11 -1 L-16 -12 L-5 -8 Z" fill="#c2562b" />
        <path d="M0 -14 V 18" stroke="#8c3a18" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

/** A cluster of fern fronds arching out from one point, each a spine with paired leaflets. */
export function Fern({ className }: { className: string }) {
  const fronds = [-62, -34, -8, 20, 48];
  return (
    <svg aria-hidden viewBox="0 0 160 120" className={className}>
      {fronds.map((turn, index) => (
        <g key={turn} transform={`translate(80 116) rotate(${turn})`}>
          <path d="M0 0 C 2 -34 0 -66 -3 -92" stroke="#3f6b32" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {Array.from({ length: 9 }, (_, leaf) => {
            const y = -12 - leaf * 9;
            const length = 24 - leaf * 2 - (index % 2) * 2;
            return (
              <g key={leaf}>
                <path d={`M0 ${y} Q ${length * 0.5} ${y - 6} ${length} ${y - 2} Q ${length * 0.5} ${y - 1} 0 ${y}`} fill={leaf % 2 === 0 ? "#5d8c42" : "#6fa04c"} />
                <path d={`M0 ${y} Q ${-length * 0.5} ${y - 6} ${-length} ${y - 2} Q ${-length * 0.5} ${y - 1} 0 ${y}`} fill={leaf % 2 === 0 ? "#6fa04c" : "#5d8c42"} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/** Two river rocks, one leaning on the other, with moss on the shoulder of the larger. */
export function Rocks({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 150 100" className={className}>
      <ellipse cx="72" cy="92" rx="62" ry="7" fill="rgba(0,0,0,0.25)" />
      <path d="M14 88 C 6 62 26 34 56 30 C 84 26 108 44 112 70 C 114 82 108 90 100 90 Z" fill="#7a8286" />
      <path d="M20 80 C 16 62 32 44 56 40 C 76 38 94 50 100 66 C 84 56 54 54 20 80 Z" fill="#9aa2a6" />
      <path d="M90 90 C 88 70 104 54 124 56 C 142 58 148 76 140 90 Z" fill="#6c7478" />
      <path d="M96 78 C 100 66 112 60 124 62 C 114 66 106 72 102 80 Z" fill="#8a9296" />
      <ellipse cx="46" cy="36" rx="16" ry="6" fill="#6c8a55" opacity="0.92" />
      <ellipse cx="54" cy="34" rx="9" ry="3.4" fill="#85a468" opacity="0.9" />
    </svg>
  );
}

/** The garden's furnishings, in the four corners the cross leaves empty. */
export function ZenProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <WorldMotion />
      <Fern className="absolute -left-[4%] -top-[22%] w-[26%] drop-shadow-[0_8px_8px_rgba(40,30,10,0.35)]" />
      <span
        data-bvw
        className="absolute -left-[7%] -top-[14%] h-[24%] w-[24%] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,196,107,0.55) 0%, rgba(255,196,107,0) 68%)", animation: motion("flicker", 3.2, { timing: "ease-in-out" }) }}
      />
      <Lantern className="absolute -left-[9%] -top-[17%] w-[24%] drop-shadow-[0_10px_10px_rgba(40,30,10,0.4)]" />
      <Bamboo className="absolute -right-[10%] -top-[22%] h-[44%] w-auto -rotate-[4deg] drop-shadow-[0_8px_8px_rgba(40,30,10,0.35)]" />
      <Cairn className="absolute -bottom-[11%] -left-[11%] w-[32%] drop-shadow-[0_8px_8px_rgba(40,30,10,0.4)]" />
      <Rocks className="absolute -bottom-[9%] -right-[10%] w-[26%] drop-shadow-[0_8px_8px_rgba(40,30,10,0.4)]" />
    </div>
  );
}
