import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireMeteorImpactBurst } from "../particles/comicBursts";
import { ComicBurstText } from "../comic/ComicBurstText";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "+4 Meteor Strike" — animation #2 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: the Wild Draw Four lands, and a comet streaks down from off-screen
 * to crater the struck seat. Library split exactly per the guide (note
 * this one differs from +2 Flying Slippers on purpose — "screen recoil"
 * is React Spring here, not GSAP):
 *   - GSAP         → the meteor's trajectory + the explosion timeline
 *                    (shockwave ring, flash, hit-stop).
 *   - Framer Motion → the +4 card's own launch flourish near the pile.
 *   - React Spring  → screen recoil — owned by the caller
 *                     (`useScreenRecoil`, wrapping `UnoTableMat` on its
 *                     own layer so it never fights `useTableCamera`'s
 *                     GSAP shake used elsewhere), triggered via `onImpact`.
 *   - tsParticles   → smoke, rainbow sparkles, debris
 *                     (`fireMeteorImpactBurst`).
 *   - RoughJS       → the "+4!"/"+6!" comic burst (count-aware: a failed
 *                     challenge makes the loser draw 6, not 4).
 *   - Howler        → a falling whoosh, then a layered explosion boom,
 *                     pitch-varied so repeat strikes don't sound identical.
 *
 * Mounted when `lastHit.kind === "draw4"`, unmounted via `onComplete` —
 * same trigger-by-props shape as `PlusTwoFlyingSlippers`.
 */
export interface DrawFourMeteorStrikeProps {
  /** Cards this hit delivered — 4 normally, 6 on a failed challenge. */
  count: number;
  /** Felt anchor the card was played from — the pile/table centre. */
  originAnchor: FeltAnchor;
  /** Felt anchor of the struck player's seat. */
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  /** Fired once, at the impact beat — wire to `useScreenRecoil().recoil`
   *  and the wobble trigger for the real seat chip. */
  onImpact?: () => void;
  /** Fired once the full sequence has finished — caller stops rendering. */
  onComplete: () => void;
}

/** Base (speed=1) timings in ms — bigger event than +2, so every beat runs
 *  a little longer: the guide gave no explicit numbers, chosen to read as
 *  "a genuinely bigger deal" without stalling the next turn. */
const T = {
  cardLaunch: 200,
  ignition: 100,
  flight: 480,
  hitStop: 100,
  explosion: 300,
  hold: 700,
  fadeOut: 240,
} as const;

export function DrawFourMeteorStrike({
  count,
  originAnchor,
  targetAnchor,
  config,
  onImpact,
  onComplete,
}: DrawFourMeteorStrikeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const meteorRef = useRef<HTMLSpanElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const shockwaveRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  // Straight above the target, off the felt — a meteor falls from the
  // sky onto its victim, unlike the +2's slippers which launch from the
  // pile. Derived from the target rather than an independent prop since
  // it's always directly overhead.
  const skyAnchor: FeltAnchor = { left: targetAnchor.left, top: "-18%" };

  useEffect(() => {
    const root = rootRef.current;
    const meteor = meteorRef.current;
    const glow = glowRef.current;
    const shockwave = shockwaveRef.current;
    const flash = flashRef.current;
    if (!root || !meteor || !glow || !shockwave || !flash) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_EXPLOSION);
      setImpact(true);
      onImpact?.();
      const t = window.setTimeout(onComplete, 700);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const rect = root.getBoundingClientRect();
    const dx = ((parseFloat(targetAnchor.left) - parseFloat(skyAnchor.left)) / 100) * rect.width;
    const dy = ((parseFloat(targetAnchor.top) - parseFloat(skyAnchor.top)) / 100) * rect.height;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });

      // Ignition — the meteor and its glow fade/scale in at the sky
      // anchor before the fall begins.
      tl.set([meteor, glow], { opacity: 0, scale: 0.5, x: 0, y: 0, rotation: -20 });
      tl.to([meteor, glow], { opacity: 1, scale: 1, duration: dur(T.ignition), ease: "power1.out" });
      tl.call(() => sound(AUDIO.UNO_FX_WHOOSH, pitchVariant(0.05) * 0.85));

      // Trajectory — accelerating fall, glow intensifying as it nears
      // (a growing radial glow reads as "heating up" without needing to
      // tween `filter` strings directly).
      tl.to(meteor, { x: dx, y: dy, rotation: "+=160", duration: dur(T.flight), ease: "power2.in" }, "flight");
      tl.to(glow, { x: dx, y: dy, scale: 1.8, opacity: 0.85, duration: dur(T.flight), ease: "power2.in" }, "flight");

      // Hit-stop — genuine timeline gap before the explosion reads.
      tl.addLabel("impact", `flight+=${dur(T.flight) + dur(T.hitStop)}`);
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_EXPLOSION);
          if (config.particleIntensity > 0) {
            fireMeteorImpactBurst(targetAnchor, { intensity: config.particleIntensity * (count > 4 ? 1.3 : 1) });
          }
          onImpact?.();
        },
        undefined,
        "impact",
      );

      // Explosion timeline — meteor is consumed, a screen flash, and a
      // shockwave ring expands outward from the crater.
      tl.to(meteor, { scale: 0, opacity: 0, duration: dur(140), ease: "power2.in" }, "impact");
      tl.to(glow, { scale: 2.2, opacity: 0, duration: dur(220), ease: "power2.out" }, "impact");
      tl.fromTo(flash, { opacity: 0.45 }, { opacity: 0, duration: dur(160), ease: "power1.out" }, "impact");
      tl.fromTo(
        shockwave,
        { opacity: 0.9, scale: 0.2 },
        { opacity: 0, scale: 2.6, duration: dur(T.explosion), ease: "power2.out" },
        "impact",
      );

      tl.to({}, { duration: dur(T.hold) });
      tl.to({}, { duration: dur(T.fadeOut) });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      {/* Full-felt impact flash. */}
      <div ref={flashRef} className="absolute inset-0 opacity-0" style={{ background: "#FFDDA8" }} />

      {/* The +4 card getting launched near the pile — Framer Motion's
          "card launch" per the guide. */}
      <motion.div
        className="absolute flex h-9 w-7 items-center justify-center rounded-md border-2 border-white text-[13px] font-black text-white shadow-lg"
        style={{
          left: originAnchor.left,
          top: originAnchor.top,
          translateX: "-50%",
          translateY: "-50%",
          background: "linear-gradient(135deg,#EF5DA8,#C22D74)",
        }}
        initial={{ scale: 0.6, opacity: 0, rotate: 10 }}
        animate={{ scale: [0.6, 1.25, 1], opacity: [0, 1, 1, 0], rotate: [10, -6, 0] }}
        transition={{ duration: (T.cardLaunch + 260) / 1000 / (config.speed || 1), times: [0, 0.4, 1] }}
      >
        +{count}
      </motion.div>

      {/* Glow trail beneath the meteor — grows as it approaches. */}
      <div
        ref={glowRef}
        className="absolute h-10 w-10 rounded-full opacity-0 blur-md"
        style={{
          left: skyAnchor.left,
          top: skyAnchor.top,
          translate: "-50% -50%",
          background: "radial-gradient(circle, #FFB347 0%, #E8481E 55%, transparent 75%)",
        }}
      />
      <span
        ref={meteorRef}
        className="absolute text-3xl leading-none opacity-0"
        style={{ left: skyAnchor.left, top: skyAnchor.top, translate: "-50% -50%" }}
      >
        ☄️
      </span>

      {/* Shockwave ring at the crater. */}
      <div
        ref={shockwaveRef}
        className="absolute h-16 w-16 rounded-full opacity-0"
        style={{
          left: targetAnchor.left,
          top: targetAnchor.top,
          translate: "-50% -50%",
          border: "3px solid #FFB347",
          boxShadow: "0 0 18px 4px rgba(232,72,30,0.55)",
        }}
      />

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "-70%" }}
          initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 1, 0], rotate: [-6, 3, 0] }}
          transition={{ duration: (T.hold + T.fadeOut) / 1000, times: [0, 0.2, 0.75, 1] }}
        >
          <ComicBurstText text={`+${count}!`} accent="#3D1608" fill="#FFC97A" />
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
            background: "linear-gradient(135deg,#EF5DA8,#C22D74)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.7 }}
        >
          🤯 +{count} YIKES!
        </motion.div>
      )}
    </div>
  );
}

export default DrawFourMeteorStrike;
