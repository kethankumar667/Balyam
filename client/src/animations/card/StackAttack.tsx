import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useSpring, animated } from "@react-spring/web";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireFlyingCardsBurst } from "../particles/comicBursts";
import { ComicBurstText } from "../comic/ComicBurstText";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Stacking +2" (#8) + "Draw Pile Attack" (#9) — animations #8-#9 of
 * `UNO_Animation_Implementation_Guide.md`, deliberately COMBINED.
 *
 * The engine has exactly one moment matching either title: `lastHit.kind
 * === "stack"` fires when a player who can no longer (or chooses not to)
 * keep stacking Draw Twos absorbs the WHOLE accumulated pile
 * (`UnoEngine.handleDraw`'s `pendingDrawStack` branch). "Stacking +2"'s
 * build/collapse and "Draw Pile Attack"'s chasing cards are the SAME
 * event described from two ends — the tower that built up (#8) is
 * exactly what attacks the player who breaks the chain (#9) — so rather
 * than invent a second, fictitious trigger, this one component plays
 * both halves back to back: build → wobble → collapse-and-chase. Every
 * library assignment from BOTH guide entries is used, faithfully:
 *
 *   - GSAP         → tower build (the group's entrance) AND the
 *                     collapse/chase (the group flying at the target).
 *   - Framer Motion → each stacked card's own stagger-in ("card
 *                     stacking").
 *   - React Spring  → the tower's pre-collapse wobble sway.
 *   - tsParticles   → flying cards scattering on collapse
 *                     (`fireFlyingCardsBurst`).
 *   - Howler        → wooden creaks under the build/wobble, a crash at
 *                     collapse.
 *
 * Mounted on `lastHit.kind === "stack"`, unmounted via `onComplete`.
 */
export interface StackAttackProps {
  /** Total cards in the absorbed stack (2, 4, 6, …). */
  count: number;
  originAnchor: FeltAnchor;
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  onImpact?: () => void;
  onComplete: () => void;
}

const SEGMENT_COLORS = ["#F7B84A", "#E8481E", "#3AA03A", "#1C6DD0", "#B347D6", "#D22B27"];

const T = { buildStagger: 70, buildSettle: 160, wobble: 420, hitStop: 90, collapse: 480, hold: 650, fadeOut: 240 } as const;

export function StackAttack({ count, originAnchor, targetAnchor, config, onImpact, onComplete }: StackAttackProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  const segments = Math.min(Math.max(Math.round(count / 2), 2), SEGMENT_COLORS.length);
  const buildDur = (T.buildStagger * segments + T.buildSettle) / 1000;

  const [wobbleStyle, wobbleApi] = useSpring(() => ({ rotate: 0 }));

  useEffect(() => {
    const root = rootRef.current;
    const group = groupRef.current;
    if (!root || !group) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant()) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_CRASH);
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

    sound(AUDIO.UNO_FX_WOOD_CREAK);

    // Wobble kicks in once the build stagger finishes.
    const wobbleTimer = window.setTimeout(() => {
      wobbleApi.start({
        to: async (next) => {
          await next({ rotate: -6, config: { tension: 220, friction: 8 } });
          await next({ rotate: 5, config: { tension: 220, friction: 8 } });
          await next({ rotate: -3, config: { tension: 220, friction: 9 } });
          await next({ rotate: 0, config: { tension: 260, friction: 14 } });
        },
      });
    }, buildDur * 1000);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(group, { x: 0, y: 0, rotation: 0, scale: 1 });
      // Hold through the build + wobble beats (owned by Framer/React
      // Spring above) before GSAP takes over for the collapse.
      tl.to({}, { duration: buildDur + dur(T.wobble) });
      tl.addLabel("impact", `+=${dur(T.hitStop)}`);
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_CRASH);
          if (config.particleIntensity > 0) fireFlyingCardsBurst(targetAnchor, { intensity: config.particleIntensity });
          onImpact?.();
        },
        undefined,
        "impact",
      );
      // Collapse: the whole tower topples and flies at the target.
      tl.to(group, { x: dx, y: dy, rotation: 200, scale: 0.5, opacity: 0, duration: dur(T.collapse), ease: "power2.in" }, "impact");
      tl.to({}, { duration: dur(T.hold - T.collapse > 0 ? T.hold - T.collapse : 0) });
      tl.to({}, { duration: dur(T.fadeOut) });
    }, root);

    return () => {
      window.clearTimeout(wobbleTimer);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      <div ref={groupRef} className="absolute" style={{ left: originAnchor.left, top: originAnchor.top }}>
        <animated.div style={{ transform: wobbleStyle.rotate.to((r) => `rotate(${r}deg)`) }}>
          {Array.from({ length: segments }, (_, i) => (
            <motion.div
              key={i}
              className="absolute h-8 w-11 rounded-sm border-2 border-white shadow-md"
              style={{
                left: 0,
                top: -(i * 9),
                translate: "-50% -50%",
                background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                zIndex: i,
              }}
              initial={{ opacity: 0, scale: 0.4, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 / (config.speed || 1), delay: (i * T.buildStagger) / 1000 / (config.speed || 1), ease: "backOut" }}
            />
          ))}
        </animated.div>
      </div>

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "-70%" }}
          initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1, 0], rotate: [-6, 3, 0] }}
          transition={{ duration: (T.hold + T.fadeOut) / 1000, times: [0, 0.25, 0.75, 1] }}
        >
          <ComicBurstText text={`+${count} STACKED!`} accent="#3A2110" fill="#E8C79A" />
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
          📚 +{count} STACKED!
        </motion.div>
      )}
    </div>
  );
}

export default StackAttack;
