import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { pitchVariant } from "../sound/pitch";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Last Card" — animation #11 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: someone just dropped to one card — the moment gets a beat of
 * suspense before the table moves on. Mounted via `useLastCardTension`,
 * table-wide (works for self or any opponent), unmounted via
 * `onComplete`.
 *
 *   - GSAP         → a slow-motion zoom on the seat (a scale-up on a
 *                     heavy, decelerating ease, reading as bullet-time).
 *   - Framer Motion → a pulsing glow ring around the seat.
 *   - Howler        → a short heartbeat loop (2 beats, pitch-varied so
 *                     it never sounds mechanically identical twice).
 *
 * No React Spring/tsParticles/RoughJS — the guide doesn't assign them
 * here, and a tension beat should stay quiet/uncluttered by design.
 */
export interface LastCardTensionProps {
  anchor: FeltAnchor;
  config: AnimationConfig;
  onComplete: () => void;
}

const T = { zoomIn: 260, hold: 700, zoomOut: 300 } as const;

export function LastCardTension({ anchor, config, onComplete }: LastCardTensionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<HTMLDivElement | null>(null);
  const { play } = useAudio();

  useEffect(() => {
    const root = rootRef.current;
    const zoom = zoomRef.current;
    if (!root || !zoom) return;

    const beat = (rate = pitchVariant(0.04)) => {
      if (config.soundEnabled) play(AUDIO.UNO_FX_HEARTBEAT, { rate });
    };
    beat();

    if (config.reducedMotion) {
      const t = window.setTimeout(onComplete, 500);
      return () => window.clearTimeout(t);
    }

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete });
      tl.set(zoom, { scale: 1, opacity: 0 });
      tl.to(zoom, { scale: 1.18, opacity: 1, duration: dur(T.zoomIn), ease: "power4.out" });
      tl.call(() => beat(), undefined, `+=${dur(T.hold) * 0.4}`);
      tl.to(zoom, { scale: 1, opacity: 0, duration: dur(T.zoomOut), ease: "power2.in" }, `+=${dur(T.hold) * 0.6}`);
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-40" aria-hidden>
      <div ref={zoomRef} className="absolute h-20 w-20 rounded-full opacity-0" style={{ left: anchor.left, top: anchor.top, translate: "-50% -50%" }}>
        <motion.div
          className="h-full w-full rounded-full"
          style={{ border: "3px solid #DC2626" }}
          animate={{ opacity: [0.9, 0.3, 0.9], scale: [1, 1.08, 1] }}
          transition={{ duration: 0.55 / (config.speed || 1), repeat: 2, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

export default LastCardTension;
