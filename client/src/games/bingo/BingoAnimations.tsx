import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireComicDustBurst, fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";

/**
 * Number Called Ball Pop Animation.
 */
export function BingoBallCalledOverlay({
  number,
  onComplete,
}: {
  number: number;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireComicDustBurst({ left: "50%", top: "40%" }, { intensity: 0.6 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1100);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: -25, y: -40 }}
        animate={{
          scale: [0, 1.35, 1],
          rotate: [-25, 8, 0],
          y: [-40, 10, 0],
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center gap-2"
      >
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-black text-3xl sm:text-4xl text-slate-900 shadow-2xl border-4 border-amber-300"
          style={{
            background: "radial-gradient(circle at 35% 35%, #ffffff, #fef08a 50%, #eab308 100%)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(253,224,71,0.6)",
          }}
        >
          {number}
        </div>
        <ComicBurstText text={`#${number}!`} accent="#78350F" fill="#FEF08A" seed={37} />
      </motion.div>
    </div>
  );
}

/**
 * Bingo Claim / Winner Celebration — L4 Full House Ceremony.
 */
export function BingoWinnerCelebration({
  winnerName,
}: {
  winnerName: string;
}) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 1 });
    // Bounded — an unbounded interval kept firing bursts (and the idle
    // bounce/pulse below kept looping) for as long as this stayed mounted,
    // which for a celebration with no dismiss control is indefinitely.
    // Six more bursts (~5s) reads as a proper fireworks finale, not a
    // stuck animation.
    let burstCount = 0;
    const maxBursts = 6;
    const interval = setInterval(() => {
      fireFireworksBurst({ intensity: 0.8 });
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

        <ComicBurstText text="BINGO!" accent="#831843" fill="#FDE047" seed={41} />

        <div
          className="rounded-2xl px-8 py-3.5 text-center shadow-2xl mt-1"
          style={{
            background: "linear-gradient(135deg, #be185d, #9d174d)",
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(244,114,182,0.5)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-pink-200 font-bold">
            Bingo Champion
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
          <span>🎯</span>
          <span>✨</span>
          <span>🏆</span>
          <span>✨</span>
          <span>🎉</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
