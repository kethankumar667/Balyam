import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireFlyingCardsBurst, fireFallingCardsBurst } from "../particles/comicBursts";
import { ComicBurstText } from "../comic/ComicBurstText";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Draw 20" — animation #15 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: an exceptionally large stacked pile (`lastHit.kind === "stack"`
 * with a big `count`) gets dumped — big enough that "a tower toppled"
 * (`StackAttack`, #8-#9) undersells it, so the board shell selects THIS
 * as an alternate for `count >= 8` (four or more chained Draw Twos): a
 * whole truckload arrives instead of a hand-stacked tower.
 *
 *   - GSAP         → the truck driving in, "unloading" (a shake/tilt),
 *                     then reversing back out.
 *   - Framer Motion → the cascade of falling cards during the unload.
 *   - tsParticles   → a card burst (`fireFlyingCardsBurst` at the crash,
 *                     `fireFallingCardsBurst` for the ongoing cascade).
 *   - Howler        → a truck-reverse beep, then an avalanche crash.
 */
export interface Draw20TruckAttackProps {
  count: number;
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  onImpact?: () => void;
  onComplete: () => void;
}

const T = { driveIn: 380, unload: 420, hold: 700, driveOut: 340 } as const;

export function Draw20TruckAttack({ count, targetAnchor, config, onImpact, onComplete }: Draw20TruckAttackProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const truckRef = useRef<HTMLSpanElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const truck = truckRef.current;
    if (!root || !truck) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_AVALANCHE);
      setImpact(true);
      onImpact?.();
      const t = window.setTimeout(onComplete, 650);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(truck, { opacity: 0, x: -100 });
      tl.call(() => sound(AUDIO.UNO_FX_TRUCK_REVERSE));
      tl.to(truck, { opacity: 1, x: 0, duration: dur(T.driveIn), ease: "power2.out" });
      tl.to(truck, { rotation: -3, duration: dur(90), ease: "sine.inOut", yoyo: true, repeat: 3 });
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_AVALANCHE);
          if (config.particleIntensity > 0) {
            fireFlyingCardsBurst(targetAnchor, { intensity: config.particleIntensity * 1.4 });
            fireFallingCardsBurst(targetAnchor, { intensity: config.particleIntensity });
          }
          onImpact?.();
        },
      );
      tl.to({}, { duration: dur(T.hold) });
      tl.to(truck, { opacity: 0, x: 100, duration: dur(T.driveOut), ease: "power2.in" });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      <span ref={truckRef} className="absolute text-4xl leading-none opacity-0" style={{ left: targetAnchor.left, top: targetAnchor.top, translate: "-50% 10%" }}>
        🚚
      </span>

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "-90%" }}
          initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1, 0], rotate: [-6, 3, 0] }}
          transition={{ duration: (T.hold + T.driveOut) / 1000 / (config.speed || 1), times: [0, 0.25, 0.75, 1] }}
        >
          <ComicBurstText text={`+${count} DUMPED!`} accent="#3A2110" fill="#E8C79A" />
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
            background: "linear-gradient(135deg,#B084F0,#7C3AED)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.65 }}
        >
          🚚 +{count} DUMPED!
        </motion.div>
      )}
    </div>
  );
}

export default Draw20TruckAttack;
