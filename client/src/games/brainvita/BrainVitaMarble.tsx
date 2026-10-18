import type { CSSProperties } from "react";
import { useSkinTokens } from "./BrainVitaSkinContext";
import { rgba } from "./brainvitaSkins";

/**
 * The marble itself, in whichever form the world gives it: glass, a core of light, a river pebble, a pearl,
 * a cartoon ball or a cut gem. It fills whatever positioned box it is placed in, and is used by the board,
 * the marble in the air, the one dissolving, the one being dragged and the little ones on the sign, so a
 * marble looks the same wherever it appears. Selection and hint rings are not drawn here: they are separate
 * round outlines, because a clipped gem could not carry a ring made of a shadow.
 */

const FILL = "absolute inset-0";

/** A cut gem's outline: sixteen sides, so it reads as a round brilliant-cut stone rather than a plate. */
const GEM_SIDES = 16;
const OUTLINE = `polygon(${Array.from({ length: GEM_SIDES }, (_, index) => {
  const angle = (index / GEM_SIDES) * Math.PI * 2;
  return `${(50 + Math.sin(angle) * 50).toFixed(2)}% ${(50 - Math.cos(angle) * 50).toFixed(2)}%`;
}).join(", ")})`;
const PEBBLE_RADIUS = "54% 46% 52% 48% / 50% 54% 46% 50%";
const PEBBLE_TURN_DEGREES = 37;

export interface MarbleBodyProps {
  /** Picked up: the shadow falls further away. */
  isLifted?: boolean;
  /** A number that turns one pebble differently from the next, so a handful never looks stamped out. */
  seed?: number;
}

function Glass({ isLifted }: MarbleBodyProps) {
  const skin = useSkinTokens();
  return (
    <>
      <span aria-hidden className={`${FILL} rounded-full`} style={{ background: skin.marbleFill, boxShadow: isLifted ? skin.marbleSelectedShadow : skin.marbleShadow }} />
      <span aria-hidden className="absolute left-[19%] top-[12%] h-[24%] w-[34%] -rotate-[28deg] rounded-full bg-white/85 blur-[1.2px]" />
      <span aria-hidden className="absolute bottom-[10%] right-[16%] h-[10%] w-[20%] rotate-[-28deg] rounded-full bg-sky-100/40 blur-[1.5px]" />
    </>
  );
}

/** A sphere of energy: no hard highlight, a bright core with a ring round it, glowing into the pane. */
function Orb({ isLifted }: MarbleBodyProps) {
  const skin = useSkinTokens();
  return (
    <>
      <span aria-hidden className={`${FILL} rounded-full`} style={{ background: skin.marbleFill, boxShadow: isLifted ? skin.marbleSelectedShadow : skin.marbleShadow }} />
      <span aria-hidden className="absolute inset-[12%] rounded-full" style={{ border: `1.5px solid ${rgba(skin.accentSoft, 0.6)}` }} />
      <span aria-hidden className="absolute inset-[27%] rounded-full" style={{ background: `radial-gradient(circle, #ffffff 0%, ${skin.accentSoft} 42%, transparent 76%)` }} />
    </>
  );
}

/** A smooth ivory river stone: nearly round, polished enough to hold a soft window of light, ringed in bronze where it sits. */
function Pebble({ isLifted, seed = 0 }: MarbleBodyProps) {
  const skin = useSkinTokens();
  const [light, soft, mid, , dark] = skin.marbleStops;
  return (
    <>
      <span
        aria-hidden
        className={FILL}
        style={{
          borderRadius: PEBBLE_RADIUS,
          transform: `rotate(${(seed * PEBBLE_TURN_DEGREES) % 360}deg)`,
          background: `radial-gradient(ellipse at 36% 28%, ${light} 0%, ${soft} 26%, ${mid} 60%, ${dark} 100%)`,
          border: `1.5px solid ${rgba("#9c7a3c", 0.7)}`,
          boxShadow: `${isLifted ? skin.marbleSelectedShadow : skin.marbleShadow}, inset 0 -5px 8px rgba(86,66,30,0.38), inset 0 2px 3px rgba(255,255,255,0.5)`,
        }}
      />
      <span
        aria-hidden
        className={`${FILL} rounded-full opacity-35`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 62% 66%, rgba(110,90,60,0.5) 0 3%, transparent 4%), radial-gradient(circle at 34% 72%, rgba(110,90,60,0.4) 0 2.5%, transparent 3.5%)",
        }}
      />
      <span aria-hidden className="absolute left-[20%] top-[13%] h-[26%] w-[36%] -rotate-[25deg] rounded-full bg-white/70 blur-[2px]" />
      <span aria-hidden className="absolute left-[29%] top-[21%] h-[8%] w-[11%] rounded-full bg-white/95" />
    </>
  );
}

/** A pearl: a pale sphere with a pink, blue and green sheen that slides across it, and a broad soft window of light. */
function Pearl({ isLifted }: MarbleBodyProps) {
  const skin = useSkinTokens();
  return (
    <>
      <span aria-hidden className={`${FILL} rounded-full`} style={{ background: skin.marbleFill, boxShadow: isLifted ? skin.marbleSelectedShadow : skin.marbleShadow }} />
      <span
        aria-hidden
        className={`${FILL} rounded-full opacity-60`}
        style={{ background: "conic-gradient(from 205deg, rgba(255,190,230,0.55), rgba(150,226,255,0.55), rgba(190,255,214,0.4), rgba(255,226,180,0.4), rgba(255,190,230,0.55))" }}
      />
      <span aria-hidden className="absolute left-[16%] top-[11%] h-[32%] w-[44%] -rotate-[24deg] rounded-full bg-white/75 blur-[2px]" />
      <span aria-hidden className="absolute left-[27%] top-[19%] h-[9%] w-[13%] rounded-full bg-white" />
    </>
  );
}

/** A glossy red ball: deep colour at the edge, light bleeding through at the bottom, a window of light and a small glint on top. */
function Candy({ isLifted }: MarbleBodyProps) {
  const skin = useSkinTokens();
  return (
    <>
      <span
        aria-hidden
        className={`${FILL} rounded-full`}
        style={{
          background: skin.marbleFill,
          boxShadow: `${isLifted ? skin.marbleSelectedShadow : skin.marbleShadow}, inset -4px -7px 9px rgba(70,0,12,0.55), inset 3px 3px 5px rgba(255,190,190,0.28)`,
        }}
      />
      <span aria-hidden className="absolute bottom-[9%] right-[15%] h-[14%] w-[30%] -rotate-[30deg] rounded-full bg-rose-200/40 blur-[2px]" />
      <span aria-hidden className="absolute left-[17%] top-[11%] h-[26%] w-[40%] -rotate-[30deg] rounded-full bg-white/80 blur-[1.5px]" />
      <span aria-hidden className="absolute left-[27%] top-[19%] h-[9%] w-[13%] rounded-full bg-white" />
    </>
  );
}

/** A cut stone: a round brilliant with sixteen facets running out from the middle, a lighter table on top and a star-shaped glint. */
function Gem({ isLifted }: MarbleBodyProps) {
  const skin = useSkinTokens();
  const clip: CSSProperties = { clipPath: OUTLINE };
  return (
    <span aria-hidden className={FILL} style={{ filter: `drop-shadow(${isLifted ? skin.marbleSelectedShadow : skin.marbleShadow})` }}>
      <span className={FILL} style={{ ...clip, background: skin.marbleFill }} />
      <span
        className={FILL}
        style={{ ...clip, background: "repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.34) 0deg 22.5deg, rgba(0,20,10,0.3) 22.5deg 45deg)" }}
      />
      <span
        className="absolute inset-[18%]"
        style={{ ...clip, background: "repeating-conic-gradient(from 11.25deg at 50% 50%, rgba(255,255,255,0.3) 0deg 22.5deg, rgba(0,0,0,0.12) 22.5deg 45deg)" }}
      />
      <span className="absolute inset-[34%]" style={{ ...clip, background: "radial-gradient(circle at 36% 30%, rgba(255,255,255,0.75), rgba(255,255,255,0.06) 78%)" }} />
      <span
        className="absolute left-[17%] top-[11%] h-[18%] w-[18%] bg-white"
        style={{ clipPath: "polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)" }}
      />
    </span>
  );
}

export function MarbleBody(props: MarbleBodyProps) {
  const { marbleKind } = useSkinTokens();
  switch (marbleKind) {
    case "orb":
      return <Orb {...props} />;
    case "pebble":
      return <Pebble {...props} />;
    case "pearl":
      return <Pearl {...props} />;
    case "candy":
      return <Candy {...props} />;
    case "gem":
      return <Gem {...props} />;
    default:
      return <Glass {...props} />;
  }
}
