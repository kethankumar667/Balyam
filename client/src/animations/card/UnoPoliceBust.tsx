import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { ComicBurstText } from "../comic/ComicBurstText";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "UNO Police" — animation #17 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: a Wild Draw Four challenge SUCCEEDS — the play really was
 * illegal (a legal card was available), and the bluffing player gets
 * busted, drawing 4 (`UnoEngine.handleChallengeDecision`'s "challenge
 * succeeds" branch, `lastAction` reads "…challenged successfully — …
 * draws 4."). Selected the same way as Revenge (#12) — by `lastAction`
 * text, the complementary outcome of the same challenge decision.
 *
 *   - GSAP         → a police car driving in from off-screen, then
 *                     driving back out once the bust is delivered.
 *   - Framer Motion → an officer popping up next to the car.
 *   - Howler        → a siren, then a whistle.
 *
 * No tsParticles/React Spring/RoughJS — not assigned here; an
 * enforcement gag reads better clean and quick than particle-heavy.
 */
export interface UnoPoliceBustProps {
  count: number;
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  onImpact?: () => void;
  onComplete: () => void;
}

const T = { driveIn: 340, hold: 700, driveOut: 320 } as const;

export function UnoPoliceBust({ count, targetAnchor, config, onImpact, onComplete }: UnoPoliceBustProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const carRef = useRef<HTMLSpanElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const car = carRef.current;
    if (!root || !car) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_SIREN);
      setImpact(true);
      onImpact?.();
      const t = window.setTimeout(onComplete, 600);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(car, { opacity: 0, x: -80 });
      tl.call(() => sound(AUDIO.UNO_FX_SIREN));
      tl.to(car, { opacity: 1, x: 0, duration: dur(T.driveIn), ease: "power2.out" });
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_COP_WHISTLE, pitchVariant(0.03));
          onImpact?.();
        },
      );
      tl.to({}, { duration: dur(T.hold) });
      tl.to(car, { opacity: 0, x: 80, duration: dur(T.driveOut), ease: "power2.in" });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      <span ref={carRef} className="absolute text-3xl leading-none opacity-0" style={{ left: targetAnchor.left, top: targetAnchor.top, translate: "-50% 20%" }}>
        🚓
      </span>

      {impact && (
        <motion.div
          className="absolute text-2xl leading-none"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "60%", translateY: "-90%" }}
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0], y: [10, -6, 0, 0] }}
          transition={{ duration: (T.hold + T.driveOut) / 1000 / (config.speed || 1), times: [0, 0.25, 0.5, 1] }}
        >
          👮
        </motion.div>
      )}

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "-155%" }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.1, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: (T.hold + T.driveOut) / 1000 / (config.speed || 1), times: [0, 0.3, 0.75, 1] }}
        >
          <ComicBurstText text={`BUSTED! +${count}`} accent="#0B1E3D" fill="#BFD8FF" />
        </motion.div>
      )}

      {config.reducedMotion && impact && (
        <motion.div
          className="absolute flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-black uppercase text-white shadow-lg"
          style={{
            left: targetAnchor.left,
            top: targetAnchor.top,
            translateX: "-50%",
            translateY: "-135%",
            background: "linear-gradient(135deg,#3B82F6,#1D4ED8)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.6 }}
        >
          🚓 BUSTED! +{count}
        </motion.div>
      )}
    </div>
  );
}

export default UnoPoliceBust;
