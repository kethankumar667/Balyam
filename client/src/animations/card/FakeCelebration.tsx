import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Fake Celebration" — animation #19 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: someone had declared UNO, then got hit before they could play
 * their last card — their celebration gets yanked back. Mounted via
 * `useFakeCelebration`, table-wide, unmounted via `onComplete`.
 *
 *   - GSAP         → a record-scratch jolt (a hard, brief shake) then a
 *                     rewind (the "UNO!" text visibly shrinks back down,
 *                     the opposite of a normal entrance).
 *   - Framer Motion → the confetti-retract read on the same text (scale
 *                     collapsing rather than expanding).
 *   - tsParticles   → NOT used — a true "reverse confetti" pull-in isn't
 *                     something `@tsparticles/confetti`'s emit-only API
 *                     can do; the guide's intent (the celebration
 *                     visibly failing/retracting) is fully carried by
 *                     the GSAP rewind + Framer retract instead of
 *                     faking a fizzled-out burst that would just read as
 *                     a worse confetti, not a "reverse" one.
 *   - Howler        → a record scratch, then a sad trumpet.
 */
export interface FakeCelebrationProps {
  anchor: FeltAnchor;
  config: AnimationConfig;
  onComplete: () => void;
}

export function FakeCelebration({ anchor, config, onComplete }: FakeCelebrationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudio();

  useEffect(() => {
    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant(0.04)) => {
      if (config.soundEnabled) play(key, { rate });
    };
    sound(AUDIO.UNO_FX_RECORD_SCRATCH);

    const root = rootRef.current;
    const text = textRef.current;
    if (config.reducedMotion || !root || !text) {
      const t = window.setTimeout(onComplete, 500);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(text, { opacity: 1, scale: 1.1, x: 0 });
      // Record-scratch jolt.
      tl.to(text, { x: -6, duration: dur(45), ease: "power1.inOut" });
      tl.to(text, { x: 6, duration: dur(45), ease: "power1.inOut" });
      tl.to(text, { x: -4, duration: dur(45), ease: "power1.inOut" });
      tl.to(text, { x: 0, duration: dur(45), ease: "power1.inOut" });
      tl.call(() => sound(AUDIO.UNO_FX_SAD_TRUMPET, pitchVariant(0.03) * 0.85));
      // Rewind — shrink back down rather than grow.
      tl.to(text, { scale: 0.2, opacity: 0, duration: dur(360), ease: "power2.in" });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[45]" aria-hidden>
      <div ref={textRef} className="absolute opacity-0" style={{ left: anchor.left, top: anchor.top, translate: "-50% -130%" }}>
        <motion.div
          className="rounded-2xl px-3 py-1 text-sm font-black text-white whitespace-nowrap"
          style={{ background: "#4A4A4A", border: "2px solid #FFF9F0" }}
        >
          UNO...? 🎻
        </motion.div>
      </div>
    </div>
  );
}

export default FakeCelebration;
