import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../comic/ComicBurstText";
import { fireStarSparkleBurst } from "../particles/comicBursts";

/**
 * Lead Change Animation Badge.
 */
export function LeadChangeBadge({
  leaderName,
  onComplete,
}: {
  leaderName: string;
  onComplete?: () => void;
}) {
  // `onComplete` in the dependency array means a caller passing an inline
  // arrow function (the common case — see `BhalyamMatchCountdown`, which
  // hit this for real via `Room.tsx`) restarts this timer on every
  // re-render instead of running it once. A ref keeps the effect's own
  // lifecycle independent of the caller's render frequency.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "35%" }, { intensity: 0.6 });
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, y: -20, opacity: 0 }}
        animate={{ scale: [0, 1.3, 1], y: [-20, 5, 0], opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.35, ease: "backOut" }}
        className="flex flex-col items-center gap-1"
      >
        <div className="text-3xl">👑 📈</div>
        <ComicBurstText text="LEAD CHANGE!" accent="#1E3A8A" fill="#93C5FD" seed={89} />
        <div className="px-3 py-1 rounded-full text-xs font-black text-white bg-blue-700 border border-blue-950 shadow-lg uppercase tracking-wider">
          {leaderName} takes 1st place!
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Comeback Animation Badge.
 */
export function ComebackBadge({
  playerName,
  onComplete,
}: {
  playerName: string;
  onComplete?: () => void;
}) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "35%" }, { intensity: 0.7 });
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: -10, opacity: 0 }}
        animate={{ scale: [0, 1.35, 1], rotate: [-10, 5, 0], opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center gap-1"
      >
        <div className="text-3xl">🚀 💥</div>
        <ComicBurstText text="COMEBACK!" accent="#701A75" fill="#F5D0FE" seed={97} />
        <div className="px-3 py-1 rounded-full text-xs font-black text-white bg-fuchsia-700 border border-fuchsia-950 shadow-lg uppercase tracking-wider">
          {playerName} is clawing back!
        </div>
      </motion.div>
    </div>
  );
}
