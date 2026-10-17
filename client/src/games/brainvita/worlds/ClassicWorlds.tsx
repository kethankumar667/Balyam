import { useSkinTokens } from "../BrainVitaSkinContext";
import { MAX_FRAME, SPRIG_MIN_FRAME, ARM_START, GRID_UNITS } from "../brainvitaTheme";
import { BoardSvg, boardOutline } from "./boardKit";
import { WorldMotion, motion } from "./WorldMotion";

/**
 * The two worlds that were here first: the walnut workshop table with its honey-wood board, and the neon
 * deck with its pane of glass (that board is drawn in `BrainVitaHolo.tsx`). Their tables are here so that
 * every world's scene lives beside the others.
 */

const TABLE_PLANKS =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 188px, rgba(0,0,0,0.3) 188px, rgba(0,0,0,0.3) 190px), " +
  "repeating-linear-gradient(90deg, rgba(255,214,150,0.04) 0px, rgba(255,214,150,0.04) 1px, transparent 1px, transparent 6px)";

export function WoodScene() {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundImage: TABLE_PLANKS }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,0.55) 100%)" }} />
    </>
  );
}

const HOLO_FLOOR =
  "linear-gradient(rgba(34,211,238,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px)";
const HOLO_FLOOR_MASK = "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 55%, #000 100%)";

const STARS = [
  { left: "7%", top: "11%", seconds: 4.2, delay: 0 },
  { left: "18%", top: "29%", seconds: 5.1, delay: 1.4 },
  { left: "31%", top: "7%", seconds: 3.8, delay: 2.2 },
  { left: "46%", top: "17%", seconds: 4.8, delay: 0.7 },
  { left: "63%", top: "9%", seconds: 5.4, delay: 3 },
  { left: "78%", top: "24%", seconds: 4.1, delay: 1.9 },
  { left: "90%", top: "13%", seconds: 4.6, delay: 0.3 },
  { left: "12%", top: "62%", seconds: 5.2, delay: 2.6 },
  { left: "93%", top: "58%", seconds: 3.9, delay: 1.1 },
];

/** The neon deck's night: a lattice floor in perspective, a few stars, and a faint line of light that sweeps down the glass. */
export function HoloScene() {
  return (
    <>
      <WorldMotion />
      {STARS.map((star) => (
        <span
          key={star.left + star.top}
          data-bvw
          className="absolute h-[3px] w-[3px] rounded-full bg-cyan-100"
          style={{ left: star.left, top: star.top, animation: motion("twinkle", star.seconds, { delay: star.delay, timing: "ease-in-out" }) }}
        />
      ))}
      <div className="absolute inset-0" style={{ backgroundImage: HOLO_FLOOR, backgroundSize: "56px 56px", WebkitMaskImage: HOLO_FLOOR_MASK, maskImage: HOLO_FLOOR_MASK }} />
      <div
        data-bvw
        className="absolute inset-x-0 top-0 h-[22%]"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.07) 60%, rgba(34,211,238,0.18) 100%)", animation: motion("scan", 9) }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,0.55) 100%)" }} />
    </>
  );
}

/** A carved sprig of five leaves on a curved stem, drawn about its own centre, one hole wide and a little over. */
function Sprig({ transform, dark, light }: { transform: string; dark: string; light: string }) {
  return (
    <g transform={transform}>
      {[0.8, 0].map((layer) => (
        <g key={layer} transform={`translate(${layer * 0.012} ${layer * 0.012})`} fill={layer ? light : dark} stroke="none">
          <path d="M-0.62 0.06 C -0.3 -0.1 0.22 -0.1 0.62 0.05 L 0.62 0.075 C 0.22 -0.07 -0.3 -0.07 -0.62 0.09 Z" />
          {[-0.42, -0.16, 0.1, 0.34].map((x, index) => (
            <g key={x} transform={`translate(${x} ${0.02 - index * 0.004})`}>
              <path d="M0 0 C 0.02 -0.12 0.14 -0.2 0.26 -0.19 C 0.24 -0.07 0.14 0.01 0 0 Z" />
              <path d="M0.02 0.04 C 0.04 0.14 0.14 0.2 0.24 0.2 C 0.22 0.1 0.14 0.03 0.02 0.04 Z" />
            </g>
          ))}
          <path d="M0.58 0.05 C 0.66 -0.02 0.74 -0.04 0.8 -0.02 C 0.74 0.03 0.66 0.06 0.58 0.05 Z" />
        </g>
      ))}
    </g>
  );
}

/** The carved wooden cross: shadow edge, honey top with grain, a groove near the rim, and carved sprigs. */
export function WoodSurface({ frame }: { frame: number }) {
  const palette = useSkinTokens().board as NonNullable<ReturnType<typeof useSkinTokens>["board"]>;
  const { outer, groove } = boardOutline(frame);
  const sprigScale = Math.min(1, frame / MAX_FRAME);
  const stripCentre = ARM_START - frame / 2;
  const shoulderCentre = (ARM_START - frame) / 2 + 0.05;
  const mirror = GRID_UNITS - shoulderCentre;
  const mirrorY = GRID_UNITS - stripCentre;
  return (
    <BoardSvg frame={frame} shadow="drop-shadow(0 14px 16px rgba(0,0,0,0.5))">
      <defs>
        <linearGradient id="bv-wood" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={palette.stops[0]} />
          <stop offset="48%" stopColor={palette.stops[1]} />
          <stop offset="100%" stopColor={palette.stops[2]} />
        </linearGradient>
        <pattern id="bv-grain" patternUnits="userSpaceOnUse" width="4" height="0.5" patternTransform="rotate(-2)">
          <path d="M0 0.08 C 1 0.02 2 0.14 4 0.07" stroke={palette.grainDark} strokeWidth="0.018" fill="none" />
          <path d="M0 0.27 C 1.2 0.33 2.4 0.2 4 0.3" stroke={palette.grainDark} strokeWidth="0.014" fill="none" opacity="0.8" />
          <path d="M0 0.43 C 1 0.4 3 0.47 4 0.42" stroke={palette.grainLight} strokeWidth="0.016" fill="none" />
        </pattern>
      </defs>
      <path d={outer} fill={palette.side} transform="translate(0 0.17)" />
      <path d={outer} fill="url(#bv-wood)" />
      <path d={outer} fill="url(#bv-grain)" />
      <path d={outer} fill="none" stroke={palette.edge} strokeWidth="0.035" />
      <path d={groove} fill="none" stroke={palette.grooveDark} strokeWidth="0.04" />
      <path d={groove} fill="none" stroke={palette.grooveLight} strokeWidth="0.026" transform="translate(0.018 0.026)" />
      {frame >= SPRIG_MIN_FRAME && (
        <>
          <Sprig transform={`translate(${shoulderCentre} ${stripCentre}) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
          <Sprig transform={`translate(${mirror} ${stripCentre}) scale(-1 1) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
          <Sprig transform={`translate(${shoulderCentre} ${mirrorY}) scale(1 -1) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
          <Sprig transform={`translate(${mirror} ${mirrorY}) scale(-1 -1) rotate(-8) scale(${sprigScale})`} dark={palette.sprigDark} light={palette.sprigLight} />
        </>
      )}
    </BoardSvg>
  );
}
