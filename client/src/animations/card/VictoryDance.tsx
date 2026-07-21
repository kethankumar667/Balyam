import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useSpring, animated } from "@react-spring/web";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { fireStarSparkleBurst } from "../particles/comicBursts";
import type { AnimationConfig, FeltAnchor } from "../helpers/types";

/**
 * "Victory Dance" — animation #20 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Story: a sustained follow-up to `WinnerCelebration` (#10)'s one-shot
 * rocket/fireworks burst — mounted by `UnoResultModal` alongside it, for
 * the self-winner only. Where #10 is the initial "you won!" impact, this
 * is the celebratory dance that keeps going for a few beats after.
 *
 *   - GSAP         → the dance choreography — a multi-step sway pattern
 *                     on a dancing-figure emoji (side to side, a little
 *                     hop on each beat).
 *   - React Spring  → a SECONDARY body bounce layered on top of the GSAP
 *                     sway — a follow-through wobble that trails the
 *                     main motion by a beat, the "soft body" jiggle a
 *                     pure GSAP tween wouldn't give it.
 *   - tsParticles   → ambient celebration sparkle
 *                     (`fireStarSparkleBurst`, reused, fired each beat).
 *   - Howler        → one of a small pool of victory tunes, chosen at
 *                     random each time — "random victory music" per the
 *                     guide, not the same single fanfare (`UNO_WIN`,
 *                     already played once by `useUnoBoard.ts`) every win.
 */
export interface VictoryDanceProps {
  anchor: FeltAnchor;
  config: AnimationConfig;
}

const VICTORY_TUNES = [AUDIO.UNO_FX_VICTORY_TUNE_A, AUDIO.UNO_FX_VICTORY_TUNE_B] as const;

export function VictoryDance({ anchor, config }: VictoryDanceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const figureRef = useRef<HTMLSpanElement | null>(null);
  const { play } = useAudio();
  const [bodyStyle, bodyApi] = useSpring(() => ({ scale: 1 }));

  useEffect(() => {
    if (config.soundEnabled) {
      const tune = VICTORY_TUNES[Math.floor(Math.random() * VICTORY_TUNES.length)];
      play(tune);
    }

    const root = rootRef.current;
    const figure = figureRef.current;
    if (config.reducedMotion || !root || !figure) return;

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;
    const beats = 4;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: 0 });
      for (let i = 0; i < beats; i++) {
        const dir = i % 2 === 0 ? -1 : 1;
        tl.to(figure, {
          x: dir * 14,
          rotation: dir * 8,
          y: -8,
          duration: dur(220),
          ease: "sine.out",
          onStart: () => {
            if (config.particleIntensity > 0) fireStarSparkleBurst(anchor, { intensity: config.particleIntensity * 0.6 });
            bodyApi.start({
              to: async (next) => {
                await next({ scale: 1.1, config: { tension: 400, friction: 9 } });
                await next({ scale: 1, config: { tension: 280, friction: 12 } });
              },
            });
          },
        });
        tl.to(figure, { y: 0, duration: dur(180), ease: "bounce.out" });
      }
      tl.to(figure, { x: 0, rotation: 0, duration: dur(200) });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (config.reducedMotion) return null;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[58]" aria-hidden>
      <animated.div className="absolute left-1/2 top-[32%] text-3xl leading-none" style={{ translate: "-50% -50%", scale: bodyStyle.scale }}>
        <span ref={figureRef} className="inline-block leading-none">
          💃
        </span>
      </animated.div>
    </div>
  );
}

export default VictoryDance;
