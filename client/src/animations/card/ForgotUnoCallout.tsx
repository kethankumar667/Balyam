import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireFallingCardsBurst } from "../particles/comicBursts";
import { SpeechBubble } from "../comic/SpeechBubble";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Forgot UNO" — animation #7 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: someone forgot to declare UNO and got caught — a giant finger
 * points them out while the table laughs. Mounted on
 * `lastHit.kind === "catch"` (the caught player IS `targetIds[0]`),
 * unmounted via `onComplete` — same trigger shape as +2/+4/Skip.
 *
 *   - GSAP         → the giant pointing finger swinging in and holding.
 *   - Framer Motion → the laugh emoji's entrance (pop + wobble).
 *   - tsParticles   → a light shower of falling cards
 *                     (`fireFallingCardsBurst`) — the punishment draw.
 *   - RoughJS       → a comic speech bubble (`SpeechBubble`, new — a
 *                     third hand-drawn shape family alongside
 *                     `ComicBurstText`'s star and `SkidMarks`'s curves).
 *   - Howler        → a laugh track, then a game-show buzzer.
 */
export interface ForgotUnoCalloutProps {
  count: number;
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  onImpact?: () => void;
  onComplete: () => void;
}

const T = { fingerSwing: 300, hold: 700, fadeOut: 260 } as const;

export function ForgotUnoCallout({ count, targetAnchor, config, onImpact, onComplete }: ForgotUnoCalloutProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fingerRef = useRef<HTMLSpanElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const finger = fingerRef.current;
    if (!root || !finger) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_BUZZER);
      setImpact(true);
      onImpact?.();
      const t = window.setTimeout(onComplete, 600);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(finger, { opacity: 0, scale: 0.3, rotation: -50, x: 60, y: -40 });
      tl.to(finger, { opacity: 1, scale: 1, rotation: -18, x: 0, y: 0, duration: dur(T.fingerSwing), ease: "back.out(1.8)" });
      tl.call(() => sound(AUDIO.UNO_FX_BUZZER));
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_LAUGH_TRACK, pitchVariant(0.03));
          if (config.particleIntensity > 0) fireFallingCardsBurst(targetAnchor, { intensity: config.particleIntensity });
          onImpact?.();
        },
      );
      tl.to(finger, { rotation: -12, duration: dur(140), ease: "sine.inOut", yoyo: true, repeat: 3 });
      tl.to(finger, { opacity: 0, duration: dur(T.fadeOut) }, `+=${dur(T.hold - 560)}`);
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      <span
        ref={fingerRef}
        className="absolute text-4xl leading-none opacity-0"
        style={{ left: targetAnchor.left, top: targetAnchor.top, translate: "-30% -160%" }}
      >
        👉
      </span>

      {impact && (
        <motion.div
          className="absolute text-3xl leading-none"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "10%", translateY: "-220%" }}
          initial={{ scale: 0, opacity: 0, rotate: -10 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0], rotate: [-10, 8, 0] }}
          transition={{ duration: (T.hold + T.fadeOut) / 1000 / (config.speed || 1), times: [0, 0.25, 0.75, 1] }}
        >
          😂
        </motion.div>
      )}

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-70%", translateY: "-140%" }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.1, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: (T.hold + T.fadeOut) / 1000 / (config.speed || 1), times: [0, 0.3, 0.75, 1] }}
        >
          <SpeechBubble text={`FORGOT UNO! +${count}`} />
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
            background: "linear-gradient(135deg,#F87171,#DC2626)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.6 }}
        >
          🚨 CAUGHT! +{count}
        </motion.div>
      )}
    </div>
  );
}

export default ForgotUnoCallout;
