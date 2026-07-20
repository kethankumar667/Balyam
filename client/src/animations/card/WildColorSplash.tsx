import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useSpring, animated } from "@react-spring/web";
import type { UnoColor } from "@shared/types";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import { firePaintSplash } from "../particles/comicBursts";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";
import type { WildColorSplashEvent } from "./useWildColorSplash";

/** Same hex values as `uno-table.tsx`'s `WILD_COLOR_SWATCH` — kept
 *  local, matching that map's own "module-private, tiny, decorative"
 *  precedent (also mirrored in `particles/comicBursts.ts`'s
 *  `PAINT_COLOR_HEX`). */
const COLOR_HEX: Record<UnoColor, string> = { R: "#D22B27", G: "#3AA03A", B: "#1C6DD0", Y: "#E8B100" };
const COLOR_NAME: Record<UnoColor, string> = { R: "Red", G: "Green", B: "Blue", Y: "Yellow" };

/**
 * "Wild Card" — animation #5 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: whoever played a Wild (or Wild Draw Four) just chose a colour —
 * the felt gets repainted at the pile. Library split exactly per the
 * guide:
 *   - GSAP         → the paint-spread timeline — an expanding wash of
 *                    the chosen colour at the pile.
 *   - Framer Motion → the wild card's own reveal (a quick flip into its
 *                     new colour face).
 *   - React Spring  → the paintbrush's bounce-in — a one-shot elastic
 *                     overshoot, distinct from `usePlayerWobble`'s
 *                     multi-stage squash/settle (a bounce-in entrance
 *                     needs only one spring, so it stays inline here
 *                     rather than becoming a new shared hook prematurely —
 *                     promote it if a later animation needs the same
 *                     shape).
 *   - tsParticles   → coloured paint-splash droplets (`firePaintSplash`).
 *   - Howler        → a splash on spread-start, a magical chime once the
 *                     colour settles.
 *
 * Table-wide (no seat target), unlike +2/+4/Skip — mounted whenever
 * `useWildColorSplash` fires, unmounted via `onComplete`.
 */
export interface WildColorSplashProps {
  event: WildColorSplashEvent;
  /** Felt anchor to paint — the pile/table centre. */
  anchor: FeltAnchor;
  config: AnimationConfig;
  onComplete: () => void;
}

const T = {
  reveal: 260,
  spread: 420,
  hold: 380,
  fadeOut: 220,
} as const;

export function WildColorSplash({ event, anchor, config, onComplete }: WildColorSplashProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const washRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudio();
  const hex = COLOR_HEX[event.color];

  const [brushStyle, brushApi] = useSpring(() => ({ scale: 0, rotate: -25 }));

  useEffect(() => {
    const root = rootRef.current;
    const wash = washRef.current;
    if (!root || !wash) return;

    const sound = (key: (typeof AUDIO)[keyof typeof AUDIO], rate = pitchVariant(0.04)) => {
      if (config.soundEnabled) play(key, { rate });
    };

    if (config.reducedMotion) {
      sound(AUDIO.UNO_FX_SPLASH);
      const t = window.setTimeout(onComplete, 500);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    brushApi.start({
      from: { scale: 0, rotate: -25 },
      to: async (next) => {
        await next({ scale: 1.15, rotate: 8, config: { tension: 500, friction: 12 } });
        await next({ scale: 1, rotate: 0, config: { tension: 320, friction: 14 } });
      },
    });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(wash, { opacity: 0, scale: 0.2 });
      tl.call(() => sound(AUDIO.UNO_FX_SPLASH));
      tl.to(wash, { opacity: 0.85, scale: 1, duration: dur(T.spread), ease: "power2.out" });
      tl.call(() => {
        if (config.particleIntensity > 0) firePaintSplash(anchor, event.color, { intensity: config.particleIntensity });
        sound(AUDIO.UNO_FX_MAGIC_CHIME, pitchVariant(0.03));
      });
      tl.to(wash, { opacity: 0, duration: dur(T.fadeOut) }, `+=${dur(T.hold)}`);
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      {/* Paint wash — an expanding ring of the chosen colour. */}
      <div
        ref={washRef}
        className="absolute h-20 w-20 rounded-full opacity-0"
        style={{
          left: anchor.left,
          top: anchor.top,
          translate: "-50% -50%",
          background: `radial-gradient(circle, ${hex}CC 0%, ${hex}66 55%, transparent 78%)`,
        }}
      />

      {/* Wild card reveal flip. */}
      <motion.div
        className="absolute flex h-10 w-8 items-center justify-center rounded-md border-2 border-white text-[11px] font-black text-white shadow-lg"
        style={{ left: anchor.left, top: anchor.top, translateX: "-50%", translateY: "-140%", background: hex }}
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: [90, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: (T.reveal + T.hold) / 1000 / (config.speed || 1), times: [0, 0.35, 0.8, 1] }}
      >
        {COLOR_NAME[event.color].slice(0, 3).toUpperCase()}
      </motion.div>

      {/* Paintbrush bounce-in. */}
      {!config.reducedMotion && (
        <animated.div
          className="absolute text-2xl leading-none"
          style={{
            left: anchor.left,
            top: anchor.top,
            translate: "-50% -50%",
            rotate: brushStyle.rotate,
            scale: brushStyle.scale,
          }}
        >
          🖌️
        </animated.div>
      )}
    </div>
  );
}

export default WildColorSplash;
