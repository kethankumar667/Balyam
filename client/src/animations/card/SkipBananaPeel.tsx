import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireComicDustBurst } from "../particles/comicBursts";
import { ComicBurstText } from "../comic/ComicBurstText";
import { SkidMarks } from "../comic/SkidMarks";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Skip (Banana Peel)" — animation #4 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: a banana peel appears under the skipped player, their turn
 * slips right out from under them. Library split exactly per the guide:
 *   - GSAP         → the slip: dizzy stars skid sideways, "exit" into a
 *                    stumble, then "return" bouncing back upright, plus
 *                    the hit-stop before the fall registers.
 *   - Framer Motion → the Skip card's own flourish at the pile.
 *   - React Spring  → the elastic body stretch — owned by the caller
 *                     (`usePlayerWobble`, reused as-is from +2/+4, wired
 *                     to the real seat chip through `onImpact`).
 *   - tsParticles   → dust cloud (`fireComicDustBurst`, reused as-is).
 *   - RoughJS       → cartoon skid marks (`SkidMarks`, new).
 *   - Howler        → a slip whistle, then a thud on landing.
 *
 * Mounted when `lastHit.kind === "skip"`, unmounted via `onComplete` —
 * same trigger-by-props shape as the +2/+4 cinematics.
 */
export interface SkipBananaPeelProps {
  /** Felt anchor the card was played from — the pile/table centre. */
  originAnchor: FeltAnchor;
  /** Felt anchor of the skipped player's seat. */
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  /** Fired once, at the fall beat — wire to the wobble trigger for the
   *  real seat chip (no camera shake/punch/recoil for Skip — the guide
   *  doesn't assign one, this is a lesser penalty than +2/+4). */
  onImpact?: () => void;
  /** Fired once the full sequence has finished — caller stops rendering. */
  onComplete: () => void;
}

/** Base (speed=1) timings in ms — a lighter, quicker beat than +2/+4
 *  (losing a turn is a smaller penalty than drawing cards), chosen to
 *  feel snappy since Skip can fire often at a full table. */
const T = {
  cardFlourish: 180,
  peelAppear: 120,
  slip: 420,
  hitStop: 80,
  settle: 650,
  fadeOut: 200,
} as const;

export function SkipBananaPeel({ originAnchor, targetAnchor, config, onImpact, onComplete }: SkipBananaPeelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const peelRef = useRef<HTMLSpanElement | null>(null);
  const starARef = useRef<HTMLSpanElement | null>(null);
  const starBRef = useRef<HTMLSpanElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const peel = peelRef.current;
    const starA = starARef.current;
    const starB = starBRef.current;
    if (!root || !peel || !starA || !starB) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_THUD);
      setImpact(true);
      onImpact?.();
      const t = window.setTimeout(onComplete, 600);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });

      // Peel pops in underfoot.
      tl.set(peel, { opacity: 0, scale: 0.4, rotation: -15 });
      tl.to(peel, { opacity: 1, scale: 1, rotation: 0, duration: dur(T.peelAppear), ease: "back.out(2.2)" });

      // Slip — dizzy stars skid out sideways in opposite arcs and spin,
      // reading as the character's feet sliding out from under them.
      tl.set([starA, starB], { opacity: 0, x: 0, y: 0, scale: 0.5, rotation: 0 });
      tl.to([starA, starB], { opacity: 1, duration: dur(80) }, "slip");
      tl.call(() => sound(AUDIO.UNO_FX_SLIP_WHISTLE), undefined, "slip");
      tl.to(starA, { x: -26, y: -10, rotation: -260, scale: 1, duration: dur(T.slip), ease: "power2.out" }, "slip");
      tl.to(starB, { x: 26, y: -6, rotation: 260, scale: 1, duration: dur(T.slip), ease: "power2.out" }, "slip");

      // Hit-stop before the fall lands.
      tl.addLabel("impact", `slip+=${dur(T.slip) + dur(T.hitStop)}`);
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_THUD);
          if (config.particleIntensity > 0) fireComicDustBurst(targetAnchor, { intensity: config.particleIntensity });
          onImpact?.();
        },
        undefined,
        "impact",
      );

      // Return — stars bounce back to rest and fade; the peel lingers a
      // beat (the evidence) before fading with everything else.
      tl.to([starA, starB], { x: 0, y: 0, rotation: 0, scale: 0.3, opacity: 0, duration: dur(280), ease: "back.in(1.4)" }, "impact");
      tl.to(peel, { opacity: 0, duration: dur(T.fadeOut) }, `impact+=${dur(T.settle)}`);

      tl.to({}, { duration: dur(T.settle) });
      tl.to({}, { duration: dur(T.fadeOut) });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      {/* The Skip card's own flourish at the pile — Framer Motion. */}
      <motion.div
        className="absolute flex h-9 w-7 items-center justify-center rounded-md border-2 border-white text-base font-black text-white shadow-lg"
        style={{
          left: originAnchor.left,
          top: originAnchor.top,
          translateX: "-50%",
          translateY: "-50%",
          background: "linear-gradient(135deg,#F0765A,#D6472B)",
        }}
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: [0.6, 1.2, 1], opacity: [0, 1, 1, 0], rotate: [-8, 4, 0] }}
        transition={{ duration: (T.cardFlourish + 240) / 1000 / (config.speed || 1), times: [0, 0.4, 1] }}
      >
        ⊘
      </motion.div>

      <span
        ref={peelRef}
        className="absolute text-2xl leading-none opacity-0"
        style={{ left: targetAnchor.left, top: targetAnchor.top, translate: "-50% -20%" }}
      >
        🍌
      </span>
      <span
        ref={starARef}
        className="absolute text-xl leading-none opacity-0"
        style={{ left: targetAnchor.left, top: targetAnchor.top, translate: "-50% -80%" }}
      >
        💫
      </span>
      <span
        ref={starBRef}
        className="absolute text-xl leading-none opacity-0"
        style={{ left: targetAnchor.left, top: targetAnchor.top, translate: "-50% -80%" }}
      >
        💫
      </span>

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "10%" }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0.9, 0], scale: 1 }}
          transition={{ duration: (T.settle + T.fadeOut) / 1000, times: [0, 0.15, 0.75, 1] }}
        >
          <SkidMarks />
        </motion.div>
      )}

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "-70%" }}
          initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1, 0], rotate: [-6, 3, 0] }}
          transition={{ duration: (T.settle + T.fadeOut) / 1000, times: [0, 0.25, 0.75, 1] }}
        >
          <ComicBurstText text="SKIPPED!" accent="#4A1B0E" fill="#FFC9AE" />
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
            background: "linear-gradient(135deg,#F0765A,#D6472B)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.6 }}
        >
          ⏭️ SKIPPED!
        </motion.div>
      )}
    </div>
  );
}

export default SkipBananaPeel;
