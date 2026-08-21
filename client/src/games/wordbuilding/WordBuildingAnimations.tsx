import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";

/**
 * Word Valid / Scored — Animation.
 */
export function WordBuildingWordBurst({
  word,
  points,
  playerName,
  onComplete,
}: {
  word: string;
  points: number;
  playerName: string;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "42%" }, { intensity: points >= 5 ? 0.9 : 0.6 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1300);
    return () => clearTimeout(timer);
  }, [points, onComplete]);

  const isLong = word.length >= 5;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, y: 30 }}
        animate={{
          scale: [0, 1.25, 1],
          y: 0,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center gap-1.5"
      >
        <div className="text-4xl">{isLong ? "🌟 📚 ✨" : "✨ 📖 ✨"}</div>
        <ComicBurstText
          text={isLong ? "BRILLIANT!" : "NICE WORD!"}
          accent="#1E3A8A"
          fill={isLong ? "#FEF08A" : "#BAE6FD"}
          seed={31}
        />
        <div className="px-4 py-1 rounded-full text-xs font-black text-white bg-indigo-700 border-2 border-indigo-950 shadow-xl tracking-wider uppercase">
          {playerName} made &quot;{word}&quot; (+{points} pts)
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Word Building Winner Celebration — L4 Vocab Champion Ceremony.
 */
export function WordBuildingWinnerCelebration({
  winnerName,
}: {
  winnerName: string;
}) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 0.95 });
    // Bounded — an unbounded interval kept firing bursts (and the idle
    // bounce/pulse below kept looping) for as long as this stayed mounted.
    // Six more bursts (~5s) reads as a proper fireworks finale, not a
    // stuck animation. (Already gated by `reportDismissed` on the board
    // side, so this couldn't loop forever in practice — bounded here too
    // for consistency with every other celebration in this batch, so the
    // safety doesn't depend on that gate being wired correctly everywhere.)
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

        <ComicBurstText text="VOCAB CHAMPION!" accent="#1E3A8A" fill="#FDE047" seed={33} />

        <div
          className="rounded-2xl px-8 py-3.5 text-center shadow-2xl mt-1"
          style={{
            background: "linear-gradient(135deg, #1e3a8a, #0f172a)",
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(96,165,250,0.5)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-blue-200 font-bold">
            Word Building Winner
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
          <span>📚</span>
          <span>✨</span>
          <span>🏆</span>
          <span>✨</span>
          <span>✏️</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
