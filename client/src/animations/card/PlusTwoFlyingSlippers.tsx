import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { fireComicDustBurst } from "../particles/comicBursts";
import { ComicBurstText } from "../comic/ComicBurstText";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

gsap.registerPlugin(MotionPathPlugin);

/**
 * "+2 Flying Slippers" — animation #1 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: the +2 card lands, and two comic slippers come flying across the
 * felt to bonk the struck player, who staggers back before the smoke
 * clears. Library split exactly per the guide:
 *   - GSAP        → slipper flight path (MotionPathPlugin arc), the
 *                   hit-stop freeze, the camera punch (via `onImpact`).
 *   - Framer Motion → the +2 card's own throw flourish near the pile.
 *   - React Spring  → the struck player's wobble — owned by the caller
 *                     (`usePlayerWobble`, wired to the real seat chip),
 *                     triggered through `onImpact` rather than duplicated
 *                     here, since only the board shell has a handle on
 *                     that DOM node.
 *   - tsParticles  → comic dust + star-fleck burst at the impact point.
 *   - RoughJS      → the "+N!" hand-drawn comic burst.
 *   - Howler       → whoosh (launch) → smack (impact) → boing (settle),
 *                    each with a randomised pitch so repeat hits don't
 *                    sound identical.
 *
 * Self-contained: mount it when `lastHit.kind === "draw2"`, unmount on
 * `onComplete`. No imperative `play…()` export — this animation's
 * trigger IS server state (`UnoPublicState.lastHit`), so a mounted
 * component driven by props is the idiomatic React shape, matching how
 * `UnoHitBadge`/`useUnoHitReaction` (the system this replaces for the
 * draw2 case) already works.
 */
export interface PlusTwoFlyingSlippersProps {
  /** Cards this hit delivered — `lastHit.count`, always 2 for a plain
   *  (non-stacked) Draw Two. */
  count: number;
  /** Felt anchor the card was played from — the pile/table centre. */
  originAnchor: FeltAnchor;
  /** Felt anchor of the struck player's seat. */
  targetAnchor: FeltAnchor;
  config: AnimationConfig;
  /** Fired once, at the impact beat — wire to `useTableCamera().shake` +
   *  `.punch()` and to the wobble trigger for the real seat chip. */
  onImpact?: () => void;
  /** Fired once the full sequence (including hold + fade) has finished —
   *  the caller should stop rendering this component. */
  onComplete: () => void;
}

/** Base (speed=1) timings in ms — the guide gave no explicit numbers for
 *  this animation, so these were chosen to read clearly at a table-game
 *  pace: quick enough not to stall the next turn, slow enough that the
 *  gag actually lands. */
const T = {
  windup: 160,
  flight: 480,
  hitStop: 90,
  settle: 620,
  fadeOut: 220,
} as const;

export function PlusTwoFlyingSlippers({
  count,
  originAnchor,
  targetAnchor,
  config,
  onImpact,
  onComplete,
}: PlusTwoFlyingSlippersProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const slipperARef = useRef<HTMLSpanElement | null>(null);
  const slipperBRef = useRef<HTMLSpanElement | null>(null);
  const [impact, setImpact] = useState(false);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const a = slipperARef.current;
    const b = slipperBRef.current;
    if (!root || !a || !b) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO]) => {
      if (config.soundEnabled) play(key, { rate: pitchVariant() });
    };

    // Reduced motion: skip the cinematic entirely — a quick text pop +
    // layered sound still carries "you got hit", no motion, no shake,
    // no particles. Never blocks the turn either way.
    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_SMACK);
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
    const lift = -Math.min(90, Math.abs(dy) * 0.6 + 40);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });

      // Wind-up: both slippers pop in at the pile with a tiny anticipatory
      // squash, staggered so it doesn't read as one flat unit.
      tl.set([a, b], { opacity: 1, scale: 0.4, x: 0, y: 0, rotation: 0 });
      tl.to([a, b], { scale: 1, duration: dur(T.windup), ease: "back.out(2.4)", stagger: 0.05 });
      tl.call(() => sound(AUDIO.UNO_FX_WHOOSH));

      // Flight: an arced motion path from the pile to the struck seat,
      // spinning wildly — the comic "hurled object" read. Second slipper
      // trails 60ms behind the first.
      tl.to(
        a,
        {
          motionPath: {
            path: [{ x: 0, y: 0 }, { x: dx * 0.5, y: dy * 0.5 + lift }, { x: dx, y: dy }],
            curviness: 1.3,
          },
          rotation: "+=540",
          duration: dur(T.flight),
          ease: "power1.in",
        },
        "flight",
      );
      tl.to(
        b,
        {
          motionPath: {
            path: [{ x: 0, y: 0 }, { x: dx * 0.5 - 14, y: dy * 0.5 + lift + 10 }, { x: dx + 10, y: dy + 6 }],
            curviness: 1.3,
          },
          rotation: "-=540",
          duration: dur(T.flight),
          ease: "power1.in",
        },
        "flight+=0.06",
      );

      // Hit-stop: a genuine gap in the timeline — everything holds still
      // for a beat before the impact reads, giving the hit weight.
      tl.addLabel("impact", `flight+=${dur(T.flight) + dur(T.hitStop)}`);
      tl.call(
        () => {
          setImpact(true);
          sound(AUDIO.UNO_FX_SMACK);
          if (config.particleIntensity > 0) fireComicDustBurst(targetAnchor, { intensity: config.particleIntensity });
          onImpact?.();
        },
        undefined,
        "impact",
      );

      // Splat + drop-away: a hard squash on landing, then the slippers
      // topple off and fade — they've done their job.
      tl.to([a, b], { scaleX: 1.4, scaleY: 0.6, duration: dur(120), ease: "power2.out" }, "impact");
      tl.to(
        [a, b],
        { y: `+=${Math.abs(dy) * 0.15 + 24}`, rotation: "+=70", opacity: 0, duration: dur(T.settle), ease: "power2.in" },
        "impact+=0.08",
      );
      tl.call(() => sound(AUDIO.UNO_FX_BOING), undefined, "impact+=0.1");

      tl.to({}, { duration: dur(T.fadeOut) });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      {/* The +2 card itself getting slammed down near the pile — Framer
          Motion owns this flourish per the guide's "card throw animation"
          assignment. */}
      <motion.div
        className="absolute flex h-9 w-7 items-center justify-center rounded-md border-2 border-white text-[13px] font-black text-white shadow-lg"
        style={{
          left: originAnchor.left,
          top: originAnchor.top,
          translateX: "-50%",
          translateY: "-50%",
          background: "linear-gradient(135deg,#F7B84A,#E6821E)",
        }}
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: [0.6, 1.2, 1], opacity: [0, 1, 1, 0], rotate: [-8, 4, 0] }}
        transition={{ duration: (T.windup + 260) / 1000 / (config.speed || 1), times: [0, 0.4, 1] }}
      >
        +{count}
      </motion.div>

      <span
        ref={slipperARef}
        className="absolute text-2xl leading-none opacity-0"
        style={{ left: originAnchor.left, top: originAnchor.top, translate: "-50% -50%" }}
      >
        🩴
      </span>
      <span
        ref={slipperBRef}
        className="absolute text-2xl leading-none opacity-0"
        style={{ left: originAnchor.left, top: originAnchor.top, translate: "-50% -50%" }}
      >
        🩴
      </span>

      {!config.reducedMotion && impact && (
        <motion.div
          className="absolute"
          style={{ left: targetAnchor.left, top: targetAnchor.top, translateX: "-50%", translateY: "-70%" }}
          initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1, 0], rotate: [-6, 3, 0] }}
          transition={{ duration: (T.settle + T.fadeOut) / 1000, times: [0, 0.25, 0.7, 1] }}
        >
          <ComicBurstText text={`+${count}!`} />
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
            background: "linear-gradient(135deg,#F7B84A,#E6821E)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.65 }}
        >
          😵 +{count} OOF!
        </motion.div>
      )}
    </div>
  );
}

export default PlusTwoFlyingSlippers;
