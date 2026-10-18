import { SPRIG_MIN_FRAME } from "../brainvitaTheme";
import { BoardSvg, HOLE_CENTRES, boardOutline, ornamentSpots } from "./boardKit";
import { WorldMotion, motion } from "./WorldMotion";

/**
 * Coral reef. The table is the sea: light falling through the water in slow shafts, a net of caustic light
 * drifting over everything, bubbles rising, seaweed swaying on the sand below. The board is one great
 * scallop shell, pearly and ribbed, with a small scalloped cup for every marble and a branch of coral
 * growing in each notch; the marbles are pearls. A starfish, a sea fan and a shell lie round it.
 */

const RAYS = [
  { left: "6%", width: "13%", seconds: 11, delay: 0 },
  { left: "30%", width: "9%", seconds: 14, delay: 3 },
  { left: "58%", width: "15%", seconds: 12, delay: 6 },
  { left: "82%", width: "8%", seconds: 16, delay: 2 },
];

const BUBBLES = [
  { left: "6%", size: 10, seconds: 13, delay: 0, drift: 18 },
  { left: "14%", size: 6, seconds: 9, delay: 4, drift: -10 },
  { left: "23%", size: 14, seconds: 16, delay: 7, drift: 22 },
  { left: "34%", size: 8, seconds: 11, delay: 2, drift: -16 },
  { left: "47%", size: 12, seconds: 15, delay: 9, drift: 14 },
  { left: "58%", size: 6, seconds: 10, delay: 5, drift: -8 },
  { left: "67%", size: 16, seconds: 17, delay: 1, drift: 20 },
  { left: "76%", size: 9, seconds: 12, delay: 8, drift: -18 },
  { left: "86%", size: 12, seconds: 14, delay: 3, drift: 12 },
  { left: "94%", size: 7, seconds: 10, delay: 6, drift: -12 },
];

const WEEDS = [
  { left: "2%", height: "19vh", seconds: 5.2, delay: 0, tone: "#1d8a6d" },
  { left: "9%", height: "13vh", seconds: 4.4, delay: 1.2, tone: "#2aa07a" },
  { left: "84%", height: "16vh", seconds: 5.8, delay: 0.6, tone: "#1d8a6d" },
  { left: "92%", height: "22vh", seconds: 4.9, delay: 2, tone: "#27997a" },
];

function Weed({ left, height, seconds, delay, tone }: (typeof WEEDS)[number]) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 120"
      className="absolute bottom-0 w-[8vh] min-w-[26px]"
      style={{ left, height, transformOrigin: "50% 100%", animation: motion("sway", seconds, { delay, timing: "ease-in-out" }) }}
      data-bvw
    >
      <path d="M20 120 C 6 96 34 80 18 56 C 6 36 26 22 20 2" stroke={tone} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M20 120 C 34 100 8 86 24 64" stroke={tone} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

export function ReefScene() {
  return (
    <>
      <WorldMotion />
      {RAYS.map((ray) => (
        <div
          key={ray.left}
          data-bvw
          className="absolute -top-[10%] h-[120%]"
          style={{
            left: ray.left,
            width: ray.width,
            background: "linear-gradient(180deg, rgba(220,255,250,0.55) 0%, rgba(220,255,250,0) 82%)",
            animation: motion("ray", ray.seconds, { delay: ray.delay, timing: "ease-in-out" }),
            transformOrigin: "50% 0%",
          }}
        />
      ))}
      <div
        data-bvw
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.13) 0 7%, transparent 8%), radial-gradient(ellipse at 70% 60%, rgba(190,255,245,0.1) 0 6%, transparent 7%)",
          backgroundSize: "92px 56px, 74px 48px",
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 78%)",
          maskImage: "linear-gradient(180deg, #000 0%, transparent 78%)",
          animation: motion("caustic", 22),
        }}
      />
      {BUBBLES.map((bubble) => (
        <span
          key={bubble.left}
          data-bvw
          className="absolute rounded-full"
          style={{
            left: bubble.left,
            bottom: "-4vh",
            width: bubble.size,
            height: bubble.size,
            border: "1.5px solid rgba(230,255,251,0.75)",
            background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.7) 0 18%, rgba(255,255,255,0.08) 60%)",
            ["--bvw-drift" as string]: `${bubble.drift}px`,
            animation: motion("bubble", bubble.seconds, { delay: bubble.delay, timing: "ease-in" }),
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[11vh]" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(238,214,160,0.34) 100%)" }} />
      {WEEDS.map((weed) => (
        <Weed key={weed.left} {...weed} />
      ))}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 50%, rgba(2,24,44,0.55) 100%)" }} />
    </>
  );
}

const RIBS = Array.from({ length: 44 }, (_, index) => (index / 44) * Math.PI * 2);
const CUP_RIDGES = Array.from({ length: 12 }, (_, index) => (index / 12) * Math.PI * 2);

function Coral({ x, y, flipX, flipY }: { x: number; y: number; flipX: number; flipY: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flipX} ${flipY})`} fill="none" strokeLinecap="round">
      <path d="M0 0.22 V -0.02 M0 0.1 L-0.15 -0.07 M0 0.03 L0.14 -0.1 M-0.15 -0.07 L-0.16 -0.2 M0.14 -0.1 L0.22 -0.22 M0 -0.02 L0.02 -0.17" stroke="#d94f73" strokeWidth="0.09" />
      <path d="M0 0.22 V -0.02 M0 0.1 L-0.15 -0.07 M0 0.03 L0.14 -0.1 M-0.15 -0.07 L-0.16 -0.2 M0.14 -0.1 L0.22 -0.22 M0 -0.02 L0.02 -0.17" stroke="#ff8aa6" strokeWidth="0.05" />
      {[[-0.16, -0.2], [0.22, -0.22], [0.02, -0.17]].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="0.045" fill="#ffd0dc" stroke="none" />
      ))}
    </g>
  );
}

/** The scallop: pearly, ribbed from its hinge, with a cup for each marble. */
export function ShellSurface({ frame }: { frame: number }) {
  const { outer, groove } = boardOutline(frame);
  const spots = ornamentSpots(frame);
  return (
    <BoardSvg frame={frame} shadow="drop-shadow(0 14px 16px rgba(0,25,50,0.55))">
      <defs>
        <linearGradient id="br-pearl" x1="0.1" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fff7f1" />
          <stop offset="50%" stopColor="#f7dcd5" />
          <stop offset="100%" stopColor="#d6e9ee" />
        </linearGradient>
        <linearGradient id="br-iris" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,170,220,0.32)" />
          <stop offset="50%" stopColor="rgba(160,230,255,0.22)" />
          <stop offset="100%" stopColor="rgba(200,255,220,0.28)" />
        </linearGradient>
        <clipPath id="br-slab">
          <path d={outer} />
        </clipPath>
        <g id="br-cup">
          <circle r="0.55" fill="none" stroke="rgba(176,104,122,0.6)" strokeWidth="0.045" />
          <circle r="0.585" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.02" />
          {CUP_RIDGES.map((angle) => (
            <path key={angle} d={`M${Math.cos(angle) * 0.48} ${Math.sin(angle) * 0.48} L${Math.cos(angle) * 0.57} ${Math.sin(angle) * 0.57}`} stroke="rgba(176,104,122,0.55)" strokeWidth="0.035" strokeLinecap="round" />
          ))}
        </g>
      </defs>
      <path d={outer} fill="#a97881" transform="translate(0 0.17)" />
      <path d={outer} fill="url(#br-pearl)" />
      <g clipPath="url(#br-slab)">
        <path d={outer} fill="url(#br-iris)" />
        {RIBS.map((angle) => (
          <path key={angle} d={`M3.5 7.9 L${3.5 + Math.cos(angle) * 12} ${7.9 + Math.sin(angle) * 12}`} stroke="rgba(176,104,122,0.17)" strokeWidth="0.035" />
        ))}
        {[3, 4.4, 5.8, 7.2, 8.6].map((radius) => (
          <circle key={radius} cx="3.5" cy="7.9" r={radius} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.03" />
        ))}
        <ellipse cx="1.4" cy="0.6" rx="2.6" ry="1.1" fill="rgba(255,255,255,0.28)" transform="rotate(-24 1.4 0.6)" />
      </g>
      <path d={outer} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.04" />
      <path d={groove} fill="none" stroke="rgba(176,104,122,0.42)" strokeWidth="0.03" strokeDasharray="0.14 0.1" />
      {HOLE_CENTRES.map(({ hole, cx, cy }) => (
        <use key={hole} href="#br-cup" x={cx} y={cy} />
      ))}
      {frame >= SPRIG_MIN_FRAME && spots.map(({ key, x, y, flipX, flipY }) => <Coral key={key} x={x} y={y} flipX={flipX} flipY={flipY} />)}
    </BoardSvg>
  );
}

export function Starfish({ className }: { className: string }) {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 62 : 26;
    const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
    return `${(70 + Math.cos(angle) * radius).toFixed(1)},${(70 + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");
  return (
    <svg aria-hidden viewBox="0 0 140 140" className={className}>
      <polygon points={points} fill="#f58a3b" stroke="#f58a3b" strokeWidth="14" strokeLinejoin="round" />
      <polygon points={points} fill="#ffae5c" stroke="#ffae5c" strokeWidth="9" strokeLinejoin="round" />
      {Array.from({ length: 5 }, (_, arm) => {
        const angle = (arm / 5) * Math.PI * 2 - Math.PI / 2;
        return [0.32, 0.5, 0.68].map((reach) => (
          <circle key={`${arm}-${reach}`} cx={70 + Math.cos(angle) * 62 * reach} cy={70 + Math.sin(angle) * 62 * reach} r={reach === 0.5 ? 3.4 : 2.6} fill="#fff1d6" />
        ));
      })}
      <circle cx="70" cy="70" r="5" fill="#fff1d6" />
    </svg>
  );
}

export function SeaFan({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 160 170" className={className}>
      <path d="M80 168 L 74 120 C 20 100 6 40 24 14 C 52 30 66 6 80 0 C 94 6 108 30 136 14 C 154 40 140 100 86 120 Z" fill="#9b4fc9" opacity="0.92" />
      <path d="M80 168 L 74 120 C 20 100 6 40 24 14 C 52 30 66 6 80 0 C 94 6 108 30 136 14 C 154 40 140 100 86 120 Z" fill="none" stroke="#d8a8ff" strokeWidth="2" />
      {Array.from({ length: 7 }, (_, index) => (
        <path key={index} d={`M80 120 L ${22 + index * 19} ${index === 3 ? 6 : 24 + Math.abs(3 - index) * 6}`} stroke="#d8a8ff" strokeWidth="1.8" fill="none" opacity="0.75" />
      ))}
      {[40, 62, 84].map((y) => (
        <path key={y} d={`M${30 + (y - 40) / 6} ${y} Q 80 ${y - 12} ${130 - (y - 40) / 6} ${y}`} stroke="#d8a8ff" strokeWidth="1.4" fill="none" opacity="0.6" />
      ))}
    </svg>
  );
}

export function Scallop({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 150 130" className={className}>
      <ellipse cx="75" cy="122" rx="52" ry="6" fill="rgba(0,20,40,0.3)" />
      <path d="M75 116 C 14 108 2 56 24 30 C 40 38 52 16 75 8 C 98 16 110 38 126 30 C 148 56 136 108 75 116 Z" fill="#f4d0c2" />
      {Array.from({ length: 9 }, (_, index) => {
        const t = (index - 4) / 4;
        return <path key={index} d={`M75 112 Q ${75 + t * 38} 64 ${75 + t * 62} ${index === 4 ? 12 : 34 + Math.abs(t) * 6}`} stroke="#c98d86" strokeWidth="3" fill="none" />;
      })}
      <path d="M58 120 H 92 L 84 106 H 66 Z" fill="#e6b7a8" />
    </svg>
  );
}

/** The sea's furnishings, in the four corners the cross leaves empty. */
export function ReefProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Starfish className="absolute -left-[9%] -top-[12%] w-[27%] -rotate-[14deg] drop-shadow-[0_8px_8px_rgba(0,25,50,0.45)]" />
      <SeaFan className="absolute -right-[10%] -top-[9%] w-[28%] rotate-[6deg] drop-shadow-[0_8px_8px_rgba(0,25,50,0.45)]" />
      <Scallop className="absolute -bottom-[11%] -left-[11%] w-[30%] -rotate-[10deg] drop-shadow-[0_8px_8px_rgba(0,25,50,0.45)]" />
    </div>
  );
}
