import { useEffect, useRef, type CSSProperties } from "react";
import { MarbleBody } from "./BrainVitaMarble";
import { useSkinTokens } from "./BrainVitaSkinContext";
import { particleLook } from "./brainvitaParticles";
import {
  DISSOLVE_DURATION_MS,
  JUMP_DURATION_MS,
  PARTICLE_COUNT,
  PARTICLE_REACH,
  TRAIL_COUNT,
  TRAIL_STEP_MS,
  flightKeyframes,
  jumpGeometry,
  particleAngles,
} from "./brainvitaJump";
import { GRID_UNITS } from "./brainvitaTheme";
import type { JumpFlight } from "./useJumpFlight";

/**
 * What the eye sees for one jump, laid over the pit area: the marble flying its arc with a light trail,
 * the captured marble dissolving in a puff of particles. All of it is decoration for a change the board
 * has already made, so it is hidden from assistive tech and never takes a tap. Sizes are in hole widths,
 * which is why a translate of a cell-sized element by "100%" is exactly one hole.
 */

const CELL = 100 / GRID_UNITS;
const FLIGHT_EASING = "cubic-bezier(0.3, 0.7, 0.4, 1)";

const cellBox = (x: number, y: number): CSSProperties => ({
  left: `${(x - 0.5) * CELL}%`,
  top: `${(y - 0.5) * CELL}%`,
  width: `${CELL}%`,
  height: `${CELL}%`,
});

/** Runs a Web Animation on an element when the browser has them, and quietly does nothing where it does not. */
function useAnimation(keyframes: Keyframe[], options: KeyframeAnimationOptions, key: number) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof element.animate !== "function") return;
    const animation = element.animate(keyframes, options);
    return () => animation.cancel();
    // The keyframes are a pure function of the jump, so the jump's id is the only thing that restarts them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ref;
}

function FlyingMarble({ flight, index }: { flight: JumpFlight; index: number }) {
  const skin = useSkinTokens();
  const { from } = jumpGeometry(flight.move);
  const isTrail = index > 0;
  const keyframes = flightKeyframes(flight.move).map(({ x, y, offset, scale }) => ({
    transform: `translate(${x * 100}%, ${y * 100}%) scale(${isTrail ? scale * (1 - index * 0.09) : scale})`,
    offset,
  }));
  const ref = useAnimation(keyframes, { duration: JUMP_DURATION_MS, delay: index * TRAIL_STEP_MS, easing: FLIGHT_EASING, fill: "both" }, flight.id);
  return (
    <span
      ref={ref}
      aria-hidden
      className="absolute rounded-full"
      style={{
        ...cellBox(from.x, from.y),
        zIndex: isTrail ? 4 : 5,
        opacity: isTrail ? 0.42 - index * 0.08 : 1,
        filter: isTrail ? `blur(${index * 0.8}px)` : undefined,
      }}
    >
      <span className="absolute inset-[9%]" style={{ filter: isTrail ? `drop-shadow(0 0 6px ${skin.accent})` : undefined }}>
        <MarbleBody isLifted />
      </span>
    </span>
  );
}

function Dissolve({ burst }: { burst: JumpFlight }) {
  const { over } = jumpGeometry(burst.move);
  const ref = useAnimation(
    [
      { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
      { opacity: 0, transform: "scale(1.45)", filter: "blur(6px)" },
    ],
    { duration: DISSOLVE_DURATION_MS * 0.8, easing: "ease-out", fill: "both" },
    burst.id,
  );
  return (
    <span ref={ref} aria-hidden className="absolute rounded-full" style={{ ...cellBox(over.x, over.y), zIndex: 3 }}>
      <span className="absolute inset-[9%]">
        <MarbleBody />
      </span>
    </span>
  );
}

function Particle({ burst, angle, index }: { burst: JumpFlight; angle: number; index: number }) {
  const skin = useSkinTokens();
  const { over } = jumpGeometry(burst.move);
  const spread = PARTICLE_REACH * (0.7 + (index % 3) * 0.2);
  const look = particleLook(skin.particleKind, index, Math.cos(angle) * spread, Math.sin(angle) * spread, skin.particleColors);
  const ref = useAnimation(
    [
      { opacity: look.opacityFrom, transform: look.from },
      { opacity: 0, transform: look.to },
    ],
    { duration: DISSOLVE_DURATION_MS, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both" },
    burst.id,
  );
  return (
    <span ref={ref} aria-hidden className="absolute flex items-center justify-center" style={{ ...cellBox(over.x, over.y), zIndex: 6 }}>
      <span className="block" style={look.style} />
    </span>
  );
}

export interface BrainVitaJumpLayerProps {
  flight: JumpFlight | null;
  burst: JumpFlight | null;
}

export function BrainVitaJumpLayer({ flight, burst }: BrainVitaJumpLayerProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {flight && Array.from({ length: TRAIL_COUNT + 1 }, (_, index) => <FlyingMarble key={`${flight.id}-${index}`} flight={flight} index={index} />)}
      {burst && (
        <>
          <Dissolve key={`d-${burst.id}`} burst={burst} />
          {particleAngles(PARTICLE_COUNT, burst.id).map((angle, index) => (
            <Particle key={`${burst.id}-${index}`} burst={burst} angle={angle} index={index} />
          ))}
        </>
      )}
    </div>
  );
}
