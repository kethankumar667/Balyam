import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../comic/ComicBurstText";
import { fireStarSparkleBurst } from "../particles/comicBursts";

export interface ScoreFlyingFloatProps {
  delta: number;
  x?: number | string;
  y?: number | string;
  onComplete?: () => void;
}

/**
 * Flying Score Delta (+10, +50) animation.
 */
export function ScoreFlyingDelta({
  delta,
  x = "50%",
  y = "50%",
  onComplete,
}: ScoreFlyingFloatProps) {
  // `onComplete` in the dependency array restarts this timer on every
  // re-render if the caller passes an inline arrow function (the pattern
  // that actually broke `BhalyamMatchCountdown` in production — see there
  // for the full story). A ref keeps this effect's lifecycle independent
  // of the caller's render frequency.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  const isPositive = delta > 0;
  const sign = isPositive ? "+" : "";

  return (
    <div
      className="pointer-events-none fixed z-50 transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      <motion.div
        initial={{ scale: 0, y: 0, opacity: 0 }}
        animate={{
          scale: [0, 1.4, 1.1],
          y: [-0, -40, -65],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`font-black text-2xl sm:text-3xl drop-shadow-lg ${
          isPositive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {sign}
        {delta}
      </motion.div>
    </div>
  );
}

/**
 * Streak Milestone Badge ("5 IN A ROW!").
 */
export function StreakMilestoneBadge({
  streak,
  playerName,
  onComplete,
}: {
  streak: number;
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
    }, 1300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: -15, opacity: 0 }}
        animate={{ scale: [0, 1.35, 1], rotate: [-15, 6, 0], opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center gap-1.5"
      >
        <div className="text-4xl">🔥 ⚡ 🔥</div>
        <ComicBurstText text={`${streak} IN A ROW!`} accent="#9A3412" fill="#FDBA74" seed={83} />
        <div className="px-3.5 py-1 rounded-full text-xs font-black text-white bg-orange-700 border border-orange-900 shadow-xl uppercase tracking-wider">
          {playerName} is on fire!
        </div>
      </motion.div>
    </div>
  );
}
