import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useSpring, animated } from "@react-spring/web";
import type { UnoColor } from "@shared/types";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireInkPopBurst } from "../particles/comicBursts";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";
import type { WildColorSplashEvent } from "./useWildColorSplash";

const COLOR_HEX: Record<UnoColor, string> = { R: "#D22B27", G: "#3AA03A", B: "#1C6DD0", Y: "#E8B100" };

/**
 * "Color Change" — animation #14 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: a complementary "confirmed!" stamp for the exact same moment
 * `WildColorSplash` (#5) already covers — mounted ALONGSIDE it (both
 * ride `useWildColorSplash`'s event), not a replacement. Where #5's
 * paint-spread is the CARD's own reveal, this is the table's ambient
 * reaction: a balloon in the new colour inflates, bounces, and pops.
 *
 *   - GSAP         → the balloon's inflation (scale 0 → full).
 *   - React Spring  → the balloon's bounce (an elastic settle once
 *                     inflated, distinct from GSAP's inflate tween).
 *   - tsParticles   → ink droplets on pop (`fireInkPopBurst`).
 *   - Howler        → a pop sound.
 */
export interface ColorChangeBalloonProps {
  event: WildColorSplashEvent;
  anchor: FeltAnchor;
  config: AnimationConfig;
  onComplete: () => void;
}

export function ColorChangeBalloon({ event, anchor, config, onComplete }: ColorChangeBalloonProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const balloonRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudio();
  const [bounceStyle, bounceApi] = useSpring(() => ({ scale: 1 }));

  useEffect(() => {
    const sound = (rate = pitchVariant(0.03)) => {
      if (config.soundEnabled) play(AUDIO.UNO_FX_BALLOON_POP, { rate });
    };

    if (config.reducedMotion) {
      const t = window.setTimeout(onComplete, 450);
      return () => window.clearTimeout(t);
    }

    const root = rootRef.current;
    const balloon = balloonRef.current;
    if (!root || !balloon) return;

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(balloon, { scale: 0, opacity: 0 });
      tl.to(balloon, { scale: 1, opacity: 1, duration: dur(280), ease: "power2.out" });
      tl.call(() => {
        bounceApi.start({
          to: async (next) => {
            await next({ scale: 1.12, config: { tension: 380, friction: 8 } });
            await next({ scale: 0.96, config: { tension: 380, friction: 8 } });
            await next({ scale: 1, config: { tension: 300, friction: 12 } });
          },
        });
      });
      tl.to({}, { duration: dur(420) });
      tl.call(() => {
        sound();
        if (config.particleIntensity > 0) fireInkPopBurst(anchor, event.color, { intensity: config.particleIntensity });
      });
      tl.to(balloon, { scale: 1.5, opacity: 0, duration: dur(160), ease: "power2.out" });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[46]" aria-hidden>
      <div
        ref={balloonRef}
        className="absolute opacity-0"
        style={{ left: anchor.left, top: anchor.top, translate: "60% -110%" }}
      >
        <animated.div
          className="h-9 w-7 rounded-full"
          style={{ scale: bounceStyle.scale, background: COLOR_HEX[event.color], boxShadow: "inset -4px -4px 8px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.3)" }}
        />
      </div>
    </div>
  );
}

export default ColorChangeBalloon;
