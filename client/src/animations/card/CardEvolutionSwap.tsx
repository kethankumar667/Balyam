import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireElectricSparkBurst } from "../particles/comicBursts";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Card Evolution" — animation #18 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: a Seven Swap (house rule) — the player swaps hands with a
 * random opponent (`lastHit.kind === "swap"`, both participants in
 * `targetIds`). Two hands transforming into each other reads well as a
 * "card evolution" — a glowing transformation at both ends, with a
 * crossing motion path between them.
 *
 *   - GSAP         → the transformation timeline — a ghost-card icon
 *                     travels from each seat to the other, crossing in
 *                     the middle.
 *   - Framer Motion → the glow-ring transition at each affected seat.
 *   - tsParticles   → electric sparks at both endpoints
 *                     (`fireElectricSparkBurst`).
 *   - Howler        → a power-up sound.
 */
export interface CardEvolutionSwapProps {
  targetAnchors: FeltAnchor[];
  config: AnimationConfig;
  onComplete: () => void;
}

export function CardEvolutionSwap({ targetAnchors, config, onComplete }: CardEvolutionSwapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const travelerARef = useRef<HTMLSpanElement | null>(null);
  const travelerBRef = useRef<HTMLSpanElement | null>(null);
  const { play } = useAudio();
  const [a, b] = targetAnchors;

  useEffect(() => {
    const sound = (rate = pitchVariant(0.04)) => {
      if (config.soundEnabled) play(AUDIO.UNO_FX_POWER_UP, { rate });
    };
    sound();
    for (const anchor of targetAnchors) {
      if (config.particleIntensity > 0) fireElectricSparkBurst(anchor, { intensity: config.particleIntensity });
    }

    const root = rootRef.current;
    const travelerA = travelerARef.current;
    const travelerB = travelerBRef.current;
    if (config.reducedMotion || !root || !travelerA || !travelerB || !a || !b) {
      const t = window.setTimeout(onComplete, 550);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;
    const rect = root.getBoundingClientRect();
    const dx = ((parseFloat(b.left) - parseFloat(a.left)) / 100) * rect.width;
    const dy = ((parseFloat(b.top) - parseFloat(a.top)) / 100) * rect.height;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(travelerA, { opacity: 1, x: 0, y: 0 });
      tl.set(travelerB, { opacity: 1, x: 0, y: 0 });
      tl.to(travelerA, { x: dx, y: dy, rotation: 360, duration: dur(520), ease: "power1.inOut" }, "cross");
      tl.to(travelerB, { x: -dx, y: -dy, rotation: -360, duration: dur(520), ease: "power1.inOut" }, "cross");
      tl.to([travelerA, travelerB], { opacity: 0, duration: dur(200) });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!a || !b) return null;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[46]" aria-hidden>
      {targetAnchors.map((anchor, i) => (
        <motion.div
          key={i}
          className="absolute h-14 w-14 rounded-full"
          style={{ left: anchor.left, top: anchor.top, translate: "-50% -50%", border: "3px solid #FFE066", boxShadow: "0 0 18px 4px rgba(255,224,102,0.55)" }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1.1, 1, 1] }}
          transition={{ duration: 0.85 / (config.speed || 1), times: [0, 0.3, 0.6, 1] }}
        />
      ))}
      {!config.reducedMotion && (
        <>
          <span ref={travelerARef} className="absolute text-xl leading-none opacity-0" style={{ left: a.left, top: a.top, translate: "-50% -50%" }}>
            🃏
          </span>
          <span ref={travelerBRef} className="absolute text-xl leading-none opacity-0" style={{ left: b.left, top: b.top, translate: "-50% -50%" }}>
            🃏
          </span>
        </>
      )}
    </div>
  );
}

export default CardEvolutionSwap;
