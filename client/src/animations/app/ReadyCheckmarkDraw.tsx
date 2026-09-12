import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Zap } from "lucide-react";
import { fireStarSparkleBurst } from "../particles/comicBursts";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";

/**
 * Hand-drawn animated checkmark for Ready state.
 */
export function ReadyCheckmarkPencil({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-500 drop-shadow-sm"
    >
      <motion.path
        d="M4 12.5l5.5 5.5L20 6"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      />
    </svg>
  );
}

/**
 * "EVERYONE'S READY!" Room-Wide Confirmation Banner before countdown starts.
 */
export function EveryoneReadyBanner({ onComplete }: { onComplete?: () => void }) {
  const reduce = useReducedMotion();
  const { play } = useAudio();

  // Same fix as `BhalyamMatchCountdown`: `Room.tsx` passes
  // `onComplete={() => setShowAllReadyBanner(false)}` inline, a fresh
  // reference every re-render. With `onComplete`/`play` in the dependency
  // array, each `Room.tsx` re-render in the window right after everyone
  // readies up (socket sync, countdown starting) tore this effect down and
  // restarted its 1.3s timer from zero — the banner could sit there firing
  // its chime and sparkle burst on repeat instead of dismissing once. A
  // ref lets the timer run exactly once while still calling the latest
  // `onComplete`/`play`.
  const latest = useRef({ onComplete, play, reduce });
  useEffect(() => {
    latest.current = { onComplete, play, reduce };
  });

  useEffect(() => {
    latest.current.play(AUDIO.SYS_SUCCESS);
    if (!latest.current.reduce) {
      fireStarSparkleBurst({ left: "50%", top: "35%" }, { intensity: 0.8 });
    }
    const timer = setTimeout(() => {
      latest.current.onComplete?.();
    }, 1300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0, y: -30, opacity: 0 }}
        animate={{ scale: [0, 1.12, 1], y: [-30, 4, 0], opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#102A22]/95 via-[#0A1A15]/95 to-[#06100D]/95 border-2 border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.35)] text-center max-w-sm w-full backdrop-blur-xl select-none"
      >
        {/* Ambient Ring Glow */}
        <div
          className="absolute w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Ceremonial Icon */}
        <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
          <CheckCircle2 className="w-7 h-7 animate-pulse" aria-hidden="true" />
        </div>

        {/* Eyebrow label */}
        <span className="relative text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.25em] text-emerald-400/90 flex items-center gap-1.5 mb-1">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          SQUAD READINESS CONFIRMED
        </span>

        {/* Main Title */}
        <h2 className="relative text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(16,185,129,0.5)]">
          ALL READY!
        </h2>
      </motion.div>
    </div>
  );
}

