import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireStarSparkleBurst } from "../particles/comicBursts";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "UNO Call" — animation #6 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: someone just correctly declared UNO — the table lights up for
 * them for a beat. Runs ALONGSIDE the existing `UnoDeclareBubble` +
 * `fireUnoDeclareConfetti()` (both left untouched, same "additive layer"
 * precedent as Wild Card leaving `UnoActionToast` alone), and works for
 * ANY player, not just self — `UnoDeclareBubble` only ever renders for
 * the local player's own seat.
 *
 *   - GSAP         → the spotlight sweep + a brief freeze-frame hold at
 *                     full brightness before it fades.
 *   - Framer Motion → the seat's glow ring + a jump-bounce burst icon
 *                     (an overlay, not the real seat chip — matching the
 *                     "don't reach into existing components" precedent
 *                     from +2/+4/Skip's wobble targets).
 *   - tsParticles   → gold stars + white sparkles (`fireStarSparkleBurst`).
 *   - Howler        → a crowd cheer, plus the "UNO!" shout — SKIPPED for
 *                     the local player when `isSelf`, since the existing
 *                     declare-button handler already plays
 *                     `AUDIO.UNO_DECLARED` optimistically; playing it
 *                     again here would double it. Opponents get it here
 *                     for the first time (they never had it before).
 */
export interface UnoCallCelebrationProps {
  anchor: FeltAnchor;
  isSelf: boolean;
  config: AnimationConfig;
  onComplete: () => void;
}

const T = { sweep: 260, hold: 500, fadeOut: 300 } as const;

export function UnoCallCelebration({ anchor, isSelf, config, onComplete }: UnoCallCelebrationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const spotlight = spotlightRef.current;
    if (!root || !spotlight) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant(0.05)) => {
      if (config.soundEnabled) play(key, { rate });
    };

    sound(AUDIO.UNO_FX_CROWD_CHEER);
    if (!isSelf) sound(AUDIO.UNO_DECLARED);
    if (config.particleIntensity > 0) fireStarSparkleBurst(anchor, { intensity: config.particleIntensity });

    if (config.reducedMotion) {
      const t = window.setTimeout(onComplete, 500);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ onComplete })
        .set(spotlight, { opacity: 0, scale: 0.3 })
        .to(spotlight, { opacity: 1, scale: 1, duration: dur(T.sweep), ease: "power2.out" })
        .to(spotlight, { opacity: 1, duration: dur(T.hold) })
        .to(spotlight, { opacity: 0, duration: dur(T.fadeOut), ease: "power1.in" });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-40" aria-hidden>
      <div
        ref={spotlightRef}
        className="absolute h-28 w-28 rounded-full opacity-0"
        style={{
          left: anchor.left,
          top: anchor.top,
          translate: "-50% -50%",
          background: "radial-gradient(circle, rgba(255,217,102,0.55) 0%, rgba(255,217,102,0.18) 55%, transparent 78%)",
        }}
      />
      <motion.div
        className="absolute"
        style={{ left: anchor.left, top: anchor.top, translateX: "-50%", translateY: "-50%" }}
        initial={{ scale: 0.5, opacity: 0, y: 0 }}
        animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 1, 0], y: [0, -18, 0, 0] }}
        transition={{ duration: (T.sweep + T.hold + T.fadeOut) / 1000 / (config.speed || 1), times: [0, 0.25, 0.5, 1] }}
      >
        <div
          className="h-16 w-16 rounded-full"
          style={{ border: "3px solid #FFD966", boxShadow: "0 0 22px 6px rgba(255,217,102,0.6)" }}
        />
      </motion.div>
    </div>
  );
}

export default UnoCallCelebration;
