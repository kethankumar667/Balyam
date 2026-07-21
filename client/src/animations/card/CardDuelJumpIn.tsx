import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useSpring, animated } from "@react-spring/web";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireEnergyBurst } from "../particles/comicBursts";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Card Duel" — animation #16 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: a Jump-In (Volume 4 §30 house rule) — a player slaps down a
 * card that's an EXACT match to the top of the pile, out of turn. Two
 * identical cards colliding reads naturally as a clash. Mounted via
 * `useJumpInDuel`, table-wide, unmounted via `onComplete`.
 *
 *   - GSAP         → the fight choreography — the two cards lunge at
 *                     each other and a rapid double-shake sells the hit.
 *   - Framer Motion → each card's own "transformation" — a quick colour
 *                     flash on impact.
 *   - React Spring  → the impact bounce-back once they collide.
 *   - tsParticles   → energy burst at the clash point
 *                     (`fireEnergyBurst`).
 *   - Howler        → a punch, then a small explosion.
 */
export interface CardDuelJumpInProps {
  anchor: FeltAnchor;
  config: AnimationConfig;
  onComplete: () => void;
}

export function CardDuelJumpIn({ anchor, config, onComplete }: CardDuelJumpInProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudio();
  const [bounceStyle, bounceApi] = useSpring(() => ({ scale: 1 }));

  useEffect(() => {
    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_PUNCH);
      const t = window.setTimeout(onComplete, 450);
      return () => window.clearTimeout(t);
    }

    const root = rootRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!root || !left || !right) return;

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(left, { opacity: 0, x: -34 });
      tl.set(right, { opacity: 0, x: 34 });
      tl.to([left, right], { opacity: 1, duration: dur(120) });
      tl.to(left, { x: -4, duration: dur(180), ease: "power2.in" }, "<");
      tl.to(right, { x: 4, duration: dur(180), ease: "power2.in" }, "<");
      tl.call(() => {
        sound(AUDIO.UNO_FX_PUNCH);
        window.setTimeout(() => sound(AUDIO.UNO_FX_EXPLOSION, pitchVariant(0.05) * 0.8), 60);
        if (config.particleIntensity > 0) fireEnergyBurst(anchor, { intensity: config.particleIntensity });
        bounceApi.start({
          to: async (next) => {
            await next({ scale: 1.25, config: { tension: 500, friction: 10 } });
            await next({ scale: 1, config: { tension: 320, friction: 14 } });
          },
        });
      });
      tl.to([left, right], { opacity: 0, duration: dur(260) }, "+=0.45");
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[46]" aria-hidden>
      <animated.div
        className="absolute"
        style={{ left: anchor.left, top: anchor.top, translate: "-50% -50%", scale: bounceStyle.scale }}
      >
        <motion.div
          ref={leftRef}
          className="absolute h-9 w-7 rounded-md border-2 border-white shadow-lg opacity-0"
          style={{ left: -20, top: -18, background: "linear-gradient(135deg,#F7B84A,#E6821E)" }}
          animate={{ backgroundColor: ["#E6821E", "#7DF9FF", "#E6821E"] }}
          transition={{ duration: 0.35 / (config.speed || 1) }}
        />
        <motion.div
          ref={rightRef}
          className="absolute h-9 w-7 rounded-md border-2 border-white shadow-lg opacity-0"
          style={{ left: 20, top: -18, background: "linear-gradient(135deg,#F7B84A,#E6821E)" }}
          animate={{ backgroundColor: ["#E6821E", "#7DF9FF", "#E6821E"] }}
          transition={{ duration: 0.35 / (config.speed || 1) }}
        />
      </animated.div>
    </div>
  );
}

export default CardDuelJumpIn;
