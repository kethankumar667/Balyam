import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";

/**
 * Letter Reveal Burst — When roulette stops on a letter.
 */
export function NpatLetterRevealBurst({
  letter,
  onComplete,
}: {
  letter: string;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "35%" }, { intensity: 0.8 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{
          scale: [0, 1.35, 1],
          rotate: [-20, 8, 0],
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center gap-2"
      >
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center font-black text-5xl sm:text-6xl text-slate-900 shadow-2xl border-4 border-amber-300"
          style={{
            background: "linear-gradient(135deg, #fef08a, #f59e0b)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(245,158,11,0.6)",
          }}
        >
          {letter}
        </div>
        <ComicBurstText text={`LETTER ${letter}!`} accent="#78350F" fill="#FEF08A" seed={43} />
      </motion.div>
    </div>
  );
}

/**
 * Name Place Animal Thing Winner Celebration — L4 Trivia Master Ceremony.
 */
export function NpatWinnerCelebration({
  winnerName,
}: {
  winnerName: string;
}) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 0.95 });
    // Bounded — an unbounded interval kept firing bursts (and the idle
    // bounce/pulse below kept looping) for as long as this stayed mounted.
    // Six more bursts (~5s) reads as a proper fireworks finale, not a
    // stuck animation.
    let burstCount = 0;
    const maxBursts = 6;
    const interval = setInterval(() => {
      fireFireworksBurst({ intensity: 0.75 });
      burstCount += 1;
      if (burstCount >= maxBursts) clearInterval(interval);
    }, 850);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black"
      />

      <motion.div
        initial={{ scale: 0, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "backOut" }}
        className="relative flex flex-col items-center gap-3"
      >
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 1.6, repeat: 5, ease: "easeInOut" }}
          className="text-8xl drop-shadow-2xl"
        >
          👑
        </motion.div>

        <ComicBurstText text="TRIVIA MASTER!" accent="#78350F" fill="#FDE047" seed={47} />

        <div
          className="rounded-2xl px-8 py-3.5 text-center shadow-2xl mt-1"
          style={{
            background: "linear-gradient(135deg, #b45309, #78350f)",
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(245,158,11,0.5)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-amber-200 font-bold">
            Match Winner
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight mt-0.5">
            {winnerName}
          </div>
        </div>

        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.1, repeat: 7 }}
          className="text-2xl mt-1 flex gap-2"
        >
          <span>🦁</span>
          <span>🌍</span>
          <span>🏆</span>
          <span>🚗</span>
          <span>✨</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
