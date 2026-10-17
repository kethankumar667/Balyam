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

/** A cut gem's outline: an octagon, as a stone is cut. */
const OCTAGON = "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";
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

/** A smooth river stone: matte, a little off-round, with a few flecks and only a soft sheen. */
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
          background: `radial-gradient(ellipse at 38% 30%, ${light} 0%, ${soft} 30%, ${mid} 62%, ${dark} 100%)`,
          boxShadow: `${isLifted ? skin.marbleSelectedShadow : skin.marbleShadow}, inset 0 -4px 7px rgba(70,60,40,0.32)`,
        }}
      />
      <span
        aria-hidden
        className={`${FILL} rounded-full opacity-60`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 62% 66%, rgba(90,80,60,0.5) 0 4%, transparent 5%), radial-gradient(circle at 30% 70%, rgba(90,80,60,0.4) 0 3%, transparent 4%), radial-gradient(circle at 68% 30%, rgba(90,80,60,0.35) 0 2.5%, transparent 3.5%)",
        }}
      />
      <span aria-hidden className="absolute left-[24%] top-[17%] h-[22%] w-[30%] -rotate-[25deg] rounded-full bg-white/40 blur-[3px]" />
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
        style={{ background: "conic-gradient(from 205deg, rgba(255,170,222,0.7), rgba(150,226,255,0.65), rgba(190,255,214,0.55), rgba(255,214,160,0.55), rgba(255,170,222,0.7))" }}
      />
      <span aria-hidden className="absolute left-[16%] top-[11%] h-[32%] w-[44%] -rotate-[24deg] rounded-full bg-white/75 blur-[2px]" />
      <span aria-hidden className="absolute left-[27%] top-[19%] h-[9%] w-[13%] rounded-full bg-white" />
    </>
  );
}

/** A cartoon ball: a solid colour, a dark outline, a hard crescent of shade and a flat white shine. */
function Candy({ isLifted }: MarbleBodyProps) {
  const skin = useSkinTokens();
  return (
    <>
      <span
        aria-hidden
        className={`${FILL} rounded-full`}
        style={{
          background: skin.marbleFill,
          border: `3px solid ${skin.marbleStops[4]}`,
          boxShadow: `${isLifted ? skin.marbleSelectedShadow : skin.marbleShadow}, inset -5px -6px 0 rgba(0,0,0,0.2)`,
        }}
      />
      <span aria-hidden className="absolute left-[21%] top-[15%] h-[22%] w-[32%] -rotate-[32deg] rounded-full bg-white/95" />
      <span aria-hidden className="absolute left-[59%] top-[25%] h-[9%] w-[9%] rounded-full bg-white/90" />
    </>
  );
}

/** A cut stone: an octagon with facets running out from the middle, a lighter table on top and a glint. */
function Gem({ isLifted }: MarbleBodyProps) {
  const skin = useSkinTokens();
  const clip: CSSProperties = { clipPath: OCTAGON };
  return (
    <span aria-hidden className={FILL} style={{ filter: `drop-shadow(${isLifted ? skin.marbleSelectedShadow : skin.marbleShadow})` }}>
      <span className={FILL} style={{ ...clip, background: skin.marbleFill }} />
      <span
        className={FILL}
        style={{ ...clip, background: "repeating-conic-gradient(from 22.5deg at 50% 50%, rgba(255,255,255,0.3) 0deg 22.5deg, rgba(0,0,0,0.24) 22.5deg 45deg)" }}
      />
      <span className="absolute inset-[24%]" style={{ ...clip, background: "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.06))" }} />
      <span className="absolute left-[20%] top-[16%] h-[11%] w-[11%] rotate-45 bg-white/95" />
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
