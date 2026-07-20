import { useEffect, useRef } from "react";
import gsap from "gsap";
import { animated } from "@react-spring/web";
import { fireFireworksBurst } from "../particles/comicBursts";
import { useBounceIn } from "../player/useBounceIn";
import type { AnimationConfig } from "../helpers/types";

/**
 * "Winner Celebration" — animation #10 of `UNO_Animation_Implementation_Guide.md`.
 *
 * Mounted by `UnoResultModal` only for the self-winner, alongside (not
 * replacing) its existing `fireUnoWinConfetti()` single burst — this
 * layers a genuine multi-burst fireworks SEQUENCE on top, timed to a
 * rocket launch, plus a bouncing trophy. `AUDIO.UNO_WIN` is already
 * played by `useUnoBoard.ts` the instant `winnerId === selfId` — NOT
 * re-triggered here, which would double it; the guide's single "victory
 * fanfare" requirement is already satisfied by that existing wiring.
 *
 *   - GSAP         → the rocket launch sequence (🚀 streaks up and off
 *                     the top of the screen, timed to the firework
 *                     bursts below it).
 *   - Framer Motion → the winner UI itself — `UnoResultModal`'s card is
 *                     wrapped in a `motion.div` entrance (see that
 *                     file's diff), not duplicated here.
 *   - React Spring  → the trophy's bounce-in (`useBounceIn`, shared with
 *                     Wild Card's paintbrush).
 *   - tsParticles   → fireworks (`fireFireworksBurst`, several staggered
 *                     bursts) layered over the existing single confetti
 *                     burst.
 */
export interface WinnerCelebrationProps {
  config: AnimationConfig;
}

export function WinnerCelebration({ config }: WinnerCelebrationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rocketRef = useRef<HTMLSpanElement | null>(null);
  const { style: trophyStyle, play: playTrophyBounce } = useBounceIn(-15);

  useEffect(() => {
    playTrophyBounce();
    if (config.particleIntensity > 0) fireFireworksBurst({ intensity: config.particleIntensity });

    const root = rootRef.current;
    const rocket = rocketRef.current;
    if (config.reducedMotion || !root || !rocket) return;

    const speed = config.speed || 1;
    const dur = (ms: number) => ms / 1000 / speed;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.set(rocket, { opacity: 1, y: 0, x: 0 });
      tl.to(rocket, { y: -420, x: 30, rotation: -8, duration: dur(900), ease: "power1.in" });
      tl.call(() => {
        if (config.particleIntensity > 0) fireFireworksBurst({ intensity: config.particleIntensity });
      }, undefined, `-=${dur(150)}`);
      tl.set(rocket, { opacity: 0 });
      tl.call(() => {
        if (config.particleIntensity > 0) {
          fireFireworksBurst({ intensity: config.particleIntensity });
          fireFireworksBurst({ intensity: config.particleIntensity });
        }
      });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {!config.reducedMotion && (
        <span ref={rocketRef} className="absolute bottom-4 left-1/2 text-3xl leading-none opacity-0" style={{ translate: "-50% 0" }}>
          🚀
        </span>
      )}
      {!config.reducedMotion && (
        <animated.div
          className="absolute left-1/2 top-[18%] text-4xl leading-none"
          style={{ translate: "-50% -50%", scale: trophyStyle.scale, rotate: trophyStyle.rotate }}
        >
          🏆
        </animated.div>
      )}
    </div>
  );
}

export default WinnerCelebration;
