import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { fireFireworksBurst } from "../particles/comicBursts";
import type { AnimationConfig } from "../helpers/types";

/**
 * "Chain Reaction" — animation #13 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: several action-card hits landed back to back — the table
 * itself reacts to the streak, layered ON TOP of whatever per-hit
 * cinematic is already playing for the most recent one. Mounted by
 * `useComboCounter`, table-wide, unmounted via `onComplete`.
 *
 *   - GSAP         → the combo timeline — a punchy scale/settle on the
 *                     counter text, escalating with `count`.
 *   - Framer Motion → the "COMBO x3!" counter itself (entrance/exit).
 *   - tsParticles   → fireworks (`fireFireworksBurst`, reused from
 *                     Winner Celebration — a combo is its own small
 *                     celebration), intensity scaling with `count`.
 *   - Howler        → an increasingly higher-pitched combo sound per
 *                     step (pitch scales directly with `count`, not the
 *                     usual small random jitter — the escalation IS the
 *                     point here).
 */
export interface ComboReactionProps {
  count: number;
  config: AnimationConfig;
  onComplete: () => void;
}

export function ComboReaction({ count, config, onComplete }: ComboReactionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudio();

  useEffect(() => {
    if (config.soundEnabled) {
      // Escalating pitch per combo step, capped so it never gets shrill.
      const rate = Math.min(1 + (count - 2) * 0.12, 1.8);
      play(AUDIO.UNO_FX_COMBO, { rate });
    }
    if (config.particleIntensity > 0) {
      fireFireworksBurst({ intensity: Math.min(config.particleIntensity * (0.6 + count * 0.15), 2) });
    }

    const root = rootRef.current;
    const text = textRef.current;
    if (config.reducedMotion || !root || !text) {
      const t = window.setTimeout(onComplete, 500);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ onComplete })
        .set(text, { scale: 0.4, opacity: 0 })
        .to(text, { scale: 1.25, opacity: 1, duration: dur(220), ease: "back.out(2.4)" })
        .to(text, { scale: 1, duration: dur(140), ease: "power1.out" })
        .to(text, { opacity: 0, duration: dur(260) }, "+=0.55");
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[45] flex items-start justify-center pt-[8%]" aria-hidden>
      <div ref={textRef} className="opacity-0">
        <motion.div
          className="rounded-full px-5 py-2 text-lg font-black uppercase tracking-wide text-white shadow-2xl"
          style={{ background: "linear-gradient(135deg,#FF8F00,#E23E2E)", border: "3px solid #FFF9F0" }}
        >
          🔥 Combo ×{count}!
        </motion.div>
      </div>
    </div>
  );
}

export default ComboReaction;
