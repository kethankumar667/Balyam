import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ComicBurstText from "../comic/ComicBurstText";
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
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, y: -30, opacity: 0 }}
        animate={{ scale: [0, 1.3, 1], y: [-30, 8, 0], opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center gap-1"
      >
        <div className="text-4xl">⚡ ✨ ⚡</div>
        <ComicBurstText text="ALL READY!" accent="#065F46" fill="#A7F3D0" seed={77} />
      </motion.div>
    </div>
  );
}
