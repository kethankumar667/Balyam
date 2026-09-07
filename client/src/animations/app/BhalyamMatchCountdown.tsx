import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { GameKind } from "@shared/types";
import CountdownNumeral3D from "./CountdownNumeral3D";
import { pickCountdownSlogans } from "./countdownSlogans";
import { fireComicDustBurst, fireStarSparkleBurst } from "../particles/comicBursts";
import { useTableCamera } from "../camera/useTableCamera";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { useHaptics } from "../../hooks/useHaptics";

export interface BhalyamMatchCountdownProps {
  onComplete: () => void;
  /** Selects UNO's card-color cycle / Rummy's felt-and-gold theme and their funny per-beat slogans — omit for the generic BHALYAM identity. */
  game?: GameKind;
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
export default function BhalyamMatchCountdown({ onComplete, game }: BhalyamMatchCountdownProps) {
  const [step, setStep] = useState<3 | 2 | 1 | "GO">(3);
  const reduce = useReducedMotion();
  const camera = useTableCamera();
  const { play } = useAudio();
  const haptics = useHaptics();
  // Picked once per mount — re-picking on every render would flicker the
  // joke mid-countdown instead of holding it for the whole 3s ceremony.
  const [slogans] = useState(() => pickCountdownSlogans(game));

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
    latest.current.play(AUDIO.SYS_COUNTDOWN);
    latest.current.haptics.subtle();
    if (!latest.current.reduce) fireComicDustBurst({ left: "50%", top: "45%" }, { intensity: 0.4 });

    const t2 = setTimeout(() => {
      setStep(2);
      latest.current.play(AUDIO.SYS_COUNTDOWN);
      latest.current.haptics.subtle();
      if (!latest.current.reduce) fireComicDustBurst({ left: "50%", top: "45%" }, { intensity: 0.6 });
    }, 900);

    const t1 = setTimeout(() => {
      setStep(1);
      latest.current.play(AUDIO.SYS_COUNTDOWN);
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

  const slogan = step === 3 ? slogans.three : step === 2 ? slogans.two : step === 1 ? slogans.one : slogans.go;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <CountdownNumeral3D step={step} game={game} slogan={slogan} />
    </div>
  );
}
