import { useId } from "react";
import { Star } from "lucide-react";

interface RecordStageProps {
  /** The game's tile art, shown at the centre of the wreath. Without it the centre is a gold star medal. */
  art: string | null;
}

const LEAF_COUNT = 8;
const WREATH_RADIUS = 60;
const CENTER_X = 110;
const CENTER_Y = 98;

/** Where each laurel leaf sits and how it is turned: along a circle, long side following the curve. */
function wreathLeaves(side: "left" | "right") {
  const first = side === "left" ? 262 : 278;
  const last = side === "left" ? 140 : 400;
  return Array.from({ length: LEAF_COUNT }, (_, index) => {
    const angle = first + ((last - first) * index) / (LEAF_COUNT - 1);
    const radians = (angle * Math.PI) / 180;
    const outwardTilt = side === "left" ? 22 : -22;
    return {
      x: CENTER_X + WREATH_RADIUS * Math.cos(radians),
      y: CENTER_Y - WREATH_RADIUS * Math.sin(radians),
      rotation: -angle + outwardTilt,
      scale: 1 - index * 0.035,
    };
  });
}

const LEFT_LEAVES = wreathLeaves("left");
const RIGHT_LEAVES = wreathLeaves("right");

/** Gold specks that twinkle only for people who have not asked for reduced motion. */
const SPARKS: ReadonlyArray<{ className: string; delay: string }> = [
  { className: "left-[18%] top-[8%] h-2 w-2", delay: "0s" },
  { className: "right-[20%] top-[14%] h-1.5 w-1.5", delay: "0.6s" },
  { className: "left-[30%] top-[46%] h-1.5 w-1.5", delay: "1.1s" },
  { className: "right-[27%] top-[52%] h-2 w-2", delay: "0.3s" },
  { className: "left-[9%] top-[30%] h-1.5 w-1.5", delay: "1.4s" },
  { className: "right-[10%] top-[34%] h-2 w-2", delay: "0.9s" },
];

const LIGHT_DOTS = {
  backgroundImage: "radial-gradient(circle, #fff4c2 34%, rgba(255,244,194,0) 40%)",
  backgroundSize: "9px 9px",
  filter: "drop-shadow(0 0 5px rgba(255,214,102,.9))",
} as const;

function StadiumLights({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute top-[18%] h-[34px] w-[46px] ${side === "left" ? "left-1 -rotate-6" : "right-1 rotate-6"}`}
      style={LIGHT_DOTS}
    />
  );
}

function PaperNote({ side, children }: { side: "left" | "right"; children: string }) {
  return (
    <p
      className={`absolute bottom-[14%] w-[76px] rounded-[3px] bg-[#f1dfb2] px-1.5 py-2 font-script text-[15px] font-bold leading-[1.05] text-[#5b3a1a] shadow-[0_6px_14px_rgba(0,0,0,.45)] ${
        side === "left" ? "left-0 -rotate-[8deg]" : "right-0 rotate-[7deg]"
      }`}
    >
      <span aria-hidden="true" className="absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#c9482f] shadow-sm" />
      {children}
    </p>
  );
}

/**
 * The hero of the "you beat your own record" popup: a crowned trophy on a lit podium, between stadium lights and two
 * handwritten notes. The centre is the game's own tile art, so the picture is the game the record was set in.
 * Decorative throughout: the words that matter are in the popup around it.
 */
export default function RecordStage({ art }: RecordStageProps) {
  const id = useId();
  const gold = `${id}-gold`;
  const disc = `${id}-disc`;
  const clip = `${id}-clip`;
  const rim = `${id}-rim`;
  const glow = `${id}-glow`;

  return (
    <div aria-hidden="true" className="relative mx-auto my-1 h-[236px] w-full [@media(max-height:790px)]:h-[196px] max-w-[360px] select-none">
      <div
        className="pointer-events-none absolute inset-x-[8%] top-[2%] h-[74%] rounded-full opacity-70 motion-safe:animate-spin"
        style={{
          animationDuration: "60s",
          background:
            "repeating-conic-gradient(from 0deg, rgba(255,205,92,.34) 0deg 6deg, rgba(255,205,92,0) 6deg 18deg)",
          WebkitMaskImage: "radial-gradient(circle, #000 18%, transparent 68%)",
          maskImage: "radial-gradient(circle, #000 18%, transparent 68%)",
        }}
      />
      <StadiumLights side="left" />
      <StadiumLights side="right" />
      {SPARKS.map((spark) => (
        <span
          key={spark.className}
          className={`absolute rotate-45 bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,.9)] motion-safe:animate-pulse ${spark.className}`}
          style={{ animationDelay: spark.delay }}
        />
      ))}

      <svg viewBox="0 0 220 214" className="absolute left-1/2 top-0 h-full -translate-x-1/2" role="presentation">
        <defs>
          <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1b0" />
            <stop offset=".45" stopColor="#f6b93b" />
            <stop offset="1" stopColor="#b9770e" />
          </linearGradient>
          <radialGradient id={disc} cx=".5" cy=".4" r=".75">
            <stop offset="0" stopColor="#1d3d78" />
            <stop offset="1" stopColor="#081330" />
          </radialGradient>
          <linearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a3f4a" />
            <stop offset="1" stopColor="#12151c" />
          </linearGradient>
          <clipPath id={clip}>
            <circle cx={CENTER_X} cy={CENTER_Y} r="40" />
          </clipPath>
          <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="110" cy="178" rx="92" ry="14" fill={`url(#${rim})`} stroke="#f6b93b" strokeWidth="2" opacity=".95" />
        <path d="M44 176 Q110 150 176 176 L164 190 Q110 204 56 190 Z" fill={`url(#${rim})`} stroke="#f6b93b" strokeWidth="1.5" />

        {[LEFT_LEAVES, RIGHT_LEAVES].flatMap((leaves, wreath) =>
          leaves.map((leaf, index) => (
            <ellipse
              key={`${wreath}-${index}`}
              rx="5"
              ry="12"
              fill={`url(#${gold})`}
              stroke="#8a5a0b"
              strokeWidth=".6"
              transform={`translate(${leaf.x.toFixed(1)} ${leaf.y.toFixed(1)}) rotate(${leaf.rotation.toFixed(1)}) scale(${leaf.scale.toFixed(2)})`}
            />
          )),
        )}

        <circle cx={CENTER_X} cy={CENTER_Y} r="47" fill="none" stroke={`url(#${gold})`} strokeWidth="5" filter={`url(#${glow})`} />

        {art ? (
          <g>
            <circle cx={CENTER_X} cy={CENTER_Y} r="40" fill={`url(#${disc})`} />
            <image
              href={art}
              x={CENTER_X - 46}
              y={CENTER_Y - 46}
              width="92"
              height="92"
              preserveAspectRatio="xMidYMid meet"
              clipPath={`url(#${clip})`}
            />
          </g>
        ) : (
          <g>
            <circle cx={CENTER_X} cy={CENTER_Y} r="39" fill={`url(#${gold})`} stroke="#8a5a0b" strokeWidth="1.5" />
            <circle cx={CENTER_X} cy={CENTER_Y} r="30" fill="none" stroke="#fff1b0" strokeWidth="1.5" opacity=".8" />
            <path
              d="M110 78 l6.2 13 14.2 1.9 -10.4 9.9 2.7 14.1 -12.7 -6.9 -12.7 6.9 2.7 -14.1 -10.4 -9.9 14.2 -1.9 Z"
              fill="#7a4a06"
              opacity=".85"
            />
          </g>
        )}

        <g filter={`url(#${glow})`}>
          <path d="M84 52 L90 30 L100 42 L110 22 L120 42 L130 30 L136 52 Z" fill={`url(#${gold})`} stroke="#8a5a0b" strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="84" y="50" width="52" height="7" rx="2" fill={`url(#${gold})`} stroke="#8a5a0b" strokeWidth="1" />
          <circle cx="110" cy="23" r="2.6" fill="#fff" />
          <circle cx="90" cy="31" r="2" fill="#fff" />
          <circle cx="130" cy="31" r="2" fill="#fff" />
        </g>
      </svg>

      <p className="absolute bottom-[8%] left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-400/70 bg-[#0a1020]/90 px-3 py-1 font-display text-[13px] uppercase tracking-[0.14em] text-amber-300 shadow-[0_0_14px_rgba(245,158,11,.4)]">
        <Star className="h-3 w-3 fill-amber-300" />
        New best
        <Star className="h-3 w-3 fill-amber-300" />
      </p>

      <PaperNote side="left">A Better You Today!</PaperNote>
      <PaperNote side="right">Small Steps Big Memories ♥</PaperNote>
    </div>
  );
}
