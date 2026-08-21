import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ComicBurstText from "../comic/ComicBurstText";
import { fireComicDustBurst, fireStarSparkleBurst } from "../particles/comicBursts";
import { useTableCamera } from "../camera/useTableCamera";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { useHaptics } from "../../hooks/useHaptics";

export interface BhalyamMatchCountdownProps {
  onComplete: () => void;
}

/**
 * Universal BHALYAM Match Countdown (3 -> 2 -> 1 -> GO!).
 *
 * Sequence:
 * 1. Number 3: Hand-drawn circle, controlled impact, subtle tick.
 * 2. Number 2: Stronger pulse, rising pitch tick.
 * 3. Number 1: Strong anticipation, rising pitch tick.
 * 4. GO!: Comic burst, camera punch, celebration chime, transition to game.
 */
export default function BhalyamMatchCountdown({ onComplete }: BhalyamMatchCountdownProps) {
  const [step, setStep] = useState<3 | 2 | 1 | "GO">(3);
  const reduce = useReducedMotion();
  const camera = useTableCamera();
  const { play } = useAudio();
  const haptics = useHaptics();

  /*
   * Every dependency below (`onComplete`, `play`, `haptics`, `camera`) can
   * be a fresh reference on every parent render — `Room.tsx` passes
   * `onComplete={() => setShowMatchCountdown(false)}` as an inline arrow
   * function, recreated each time `Room.tsx` re-renders. With those in the
   * effect's dependency array, every parent re-render tore down this
   * effect's timers (via the cleanup) and rescheduled the whole 3→2→1→GO
   * sequence from t=0 — and `Room.tsx` re-renders plenty in the seconds
   * right after a match starts (socket sync, tutorial modal, team-select
   * updates). The result: this could restart indefinitely and never reach
   * `onComplete`, stuck showing whichever step it last reached. Refs let
   * the timer-scheduling effect below run exactly once, on mount, while
   * still always calling the *latest* versions of these.
   */
  const latest = useRef({ onComplete, play, haptics, camera, reduce });
  useEffect(() => {
    latest.current = { onComplete, play, haptics, camera, reduce };
  });

  useEffect(() => {
    // Step 3
    latest.current.play(AUDIO.SYS_TICK);
    latest.current.haptics.subtle();
    if (!latest.current.reduce) fireComicDustBurst({ left: "50%", top: "45%" }, { intensity: 0.4 });

    const t2 = setTimeout(() => {
      setStep(2);
      latest.current.play(AUDIO.SYS_TICK);
      latest.current.haptics.subtle();
      if (!latest.current.reduce) fireComicDustBurst({ left: "50%", top: "45%" }, { intensity: 0.6 });
    }, 900);

    const t1 = setTimeout(() => {
      setStep(1);
      latest.current.play(AUDIO.SYS_TICK);
      latest.current.haptics.turn();
      if (!latest.current.reduce) fireStarSparkleBurst({ left: "50%", top: "45%" }, { intensity: 0.7 });
    }, 1800);

    const tGo = setTimeout(() => {
      setStep("GO");
      latest.current.play(AUDIO.SYS_SUCCESS);
      latest.current.haptics.win();
      if (!latest.current.reduce) {
        latest.current.camera.punch({ scale: 1.05 });
        fireStarSparkleBurst({ left: "50%", top: "45%" }, { intensity: 1 });
      }
    }, 2700);

    const tEnd = setTimeout(() => {
      latest.current.onComplete();
    }, 3600);

    return () => {
      clearTimeout(t2);
      clearTimeout(t1);
      clearTimeout(tGo);
      clearTimeout(tEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <AnimatePresence mode="wait">
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ scale: 0, rotate: -15, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], rotate: [-15, 6, 0], opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: "backOut" }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-32 h-32 rounded-full border-4 border-amber-300 bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl flex items-center justify-center text-7xl font-black text-amber-950">
              3
            </div>
            <div className="text-sm uppercase tracking-[0.3em] font-extrabold text-amber-200 drop-shadow">
              Get Ready
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ scale: 0, rotate: 15, opacity: 0 }}
            animate={{ scale: [0, 1.45, 1], rotate: [15, -6, 0], opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: "backOut" }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-32 h-32 rounded-full border-4 border-orange-300 bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl flex items-center justify-center text-7xl font-black text-orange-950">
              2
            </div>
            <div className="text-sm uppercase tracking-[0.3em] font-extrabold text-orange-200 drop-shadow">
              Set
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], rotate: [-20, 8, 0], opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: "backOut" }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-32 h-32 rounded-full border-4 border-rose-300 bg-gradient-to-br from-rose-500 to-rose-700 shadow-2xl flex items-center justify-center text-7xl font-black text-white">
              1
            </div>
            <div className="text-sm uppercase tracking-[0.3em] font-extrabold text-rose-200 drop-shadow">
              Almost There…
            </div>
          </motion.div>
        )}

        {step === "GO" && (
          <motion.div
            key="step-go"
            initial={{ scale: 0, rotate: 0, opacity: 0 }}
            animate={{ scale: [0, 1.6, 1.2], opacity: 1 }}
            exit={{ scale: 1.8, opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="flex flex-col items-center"
          >
            <ComicBurstText text="GO!" accent="#15803D" fill="#86EFAC" seed={73} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
