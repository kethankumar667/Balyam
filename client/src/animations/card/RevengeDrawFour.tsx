import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireDarkSmokeBurst } from "../particles/comicBursts";
import { ComicBurstText } from "../comic/ComicBurstText";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Revenge" — animation #12 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: a Wild Draw Four challenge FAILS — the play really was legal,
 * and the doubting challenger draws 6 instead of the usual 4
 * (`UnoEngine.handleChallengeDecision`'s "challenge fails" branch,
 * `lastAction` reads "…challenged and lost — draws 6."). The original
 * player's card gets its revenge on whoever doubted it.
 *
 * Mounted by the board shell as an ALTERNATE to `DrawFourMeteorStrike`
 * (#2) for this specific outcome — selected by `lastAction` text, not a
 * new hit kind (the engine already tags both as `lastHit.kind: "draw4"`;
 * count alone (6 vs 4) is ambiguous with a stacked scenario reusing the
 * same count space, so the text check is the reliable signal, same
 * precedent `useUnoEventFlourish`/`UnoActionToast` already set).
 *
 *   - GSAP         → a ghost drifting in with a wavering, floating path
 *                     (distinct from the meteor's straight accelerating
 *                     fall).
 *   - Framer Motion → the +4 card's own throw flourish (shared visual
 *                     language with #2's card launch, darker palette).
 *   - tsParticles   → dark, wispy smoke (`fireDarkSmokeBurst`).
 *   - Howler        → an evil whisper.
 *
 * No React Spring/RoughJS — not assigned here.
 */
export interface RevengeDrawFourProps {
  count: number;
  originAnchor: FeltAnchor;
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  onImpact?: () => void;
  onComplete: () => void;
}

const T = { cardThrow: 220, ghostDrift: 520, hitStop: 90, hold: 680, fadeOut: 240 } as const;

export function RevengeDrawFour({ count, originAnchor, targetAnchor, config, onImpact, onComplete }: RevengeDrawFourProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLSpanElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const ghost = ghostRef.current;
    if (!root || !ghost) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_EVIL_WHISPER);
      setImpact(true);
      onImpact?.();
      const t = window.setTimeout(onComplete, 650);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;
    const rect = root.getBoundingClientRect();
    const dx = ((parseFloat(targetAnchor.left) - parseFloat(originAnchor.left)) / 100) * rect.width;
    const dy = ((parseFloat(targetAnchor.top) - parseFloat(originAnchor.top)) / 100) * rect.height;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(ghost, { opacity: 0, scale: 0.4, x: 0, y: 0 });
      tl.call(() => sound(AUDIO.UNO_FX_EVIL_WHISPER));
      tl.to(ghost, { opacity: 0.92, scale: 1, duration: dur(160), ease: "power1.out" });
      // Wavering float — a sine-like drift rather than a straight line.
      tl.to(ghost, { x: dx * 0.35, y: dy * 0.4 - 20, duration: dur(T.ghostDrift * 0.4), ease: "sine.inOut" });
      tl.to(ghost, { x: dx * 0.7, y: dy * 0.75 + 14, duration: dur(T.ghostDrift * 0.35), ease: "sine.inOut" });
      tl.to(ghost, { x: dx, y: dy, duration: dur(T.ghostDrift * 0.25), ease: "power1.in" });
      tl.addLabel("impact", `+=${dur(T.hitStop)}`);
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_SMACK, pitchVariant(0.08) * 0.9);
          if (config.particleIntensity > 0) fireDarkSmokeBurst(targetAnchor, { intensity: config.particleIntensity });
          onImpact?.();
        },
        undefined,
        "impact",
      );
      tl.to(ghost, { opacity: 0, scale: 1.4, duration: dur(300), ease: "power1.out" }, "impact");
      tl.to({}, { duration: dur(T.hold) });
      tl.to({}, { duration: dur(T.fadeOut) });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      <motion.div
        className="absolute flex h-9 w-7 items-center justify-center rounded-md border-2 border-white text-[13px] font-black text-white shadow-lg"
        style={{
          left: originAnchor.left,
          top: originAnchor.top,
          translateX: "-50%",
          translateY: "-50%",
          background: "linear-gradient(135deg,#3A2A4A,#1A1420)",
        }}
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: [0.6, 1.2, 1], opacity: [0, 1, 1, 0], rotate: [-8, 4, 0] }}
        transition={{ duration: (T.cardThrow + 260) / 1000 / (config.speed || 1), times: [0, 0.4, 1] }}
      >
        +{count}
      </motion.div>

      <span ref={ghostRef} className="absolute text-3xl leading-none opacity-0" style={{ left: originAnchor.left, top: originAnchor.top, translate: "-50% -50%" }}>
        👻
      </span>

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "-70%" }}
          initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1, 0], rotate: [-6, 3, 0] }}
          transition={{ duration: (T.hold + T.fadeOut) / 1000, times: [0, 0.25, 0.75, 1] }}
        >
          <ComicBurstText text={`REVENGE! +${count}`} accent="#E8D8FF" fill="#241B2E" />
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
            background: "linear-gradient(135deg,#3A2A4A,#1A1420)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.65 }}
        >
          👻 REVENGE! +{count}
        </motion.div>
      )}
    </div>
  );
}

export default RevengeDrawFour;
