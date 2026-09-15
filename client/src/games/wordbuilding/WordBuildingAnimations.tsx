import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";

/**
 * Word Valid / Scored — Snappy, Non-blocking Burst (Parity with Dots & Boxes).
 */
export function WordBuildingWordBurst({
  word,
  points,
  playerName,
  penColor,
  onComplete,
}: {
  word: string;
  points: number;
  playerName: string;
  penColor?: string;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "40%" }, { intensity: points >= 5 ? 0.85 : 0.65 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 750);

    const dismissEarly = () => onComplete?.();
    window.addEventListener("pointerdown", dismissEarly, { once: true });
    window.addEventListener("keydown", dismissEarly, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", dismissEarly);
      window.removeEventListener("keydown", dismissEarly);
    };
  }, [points, onComplete]);

  const isLong = word.length >= 5;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.2, opacity: 0, y: 15 }}
        animate={{
          scale: [0.2, 1.15, 1],
          opacity: 1,
          y: 0,
        }}
        exit={{ scale: 0.8, opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: "backOut" }}
        className="flex flex-col items-center gap-1.5"
      >
        <div className="text-4xl sm:text-5xl">{isLong ? "🌟 📚 ✨" : "✨ 📖 ✨"}</div>
        <ComicBurstText
          text={isLong ? "BRILLIANT!" : "NICE WORD!"}
          accent={penColor ?? (isLong ? "#1E3A8A" : "#0F172A")}
          fill={isLong ? "#FEF08A" : "#BAE6FD"}
          seed={31}
        />
        <div
          className="px-4 py-1 rounded-full text-xs font-black text-white shadow-xl tracking-wider uppercase"
          style={{ background: penColor ?? "#1e3a8a" }}
        >
          {playerName} made &quot;{word}&quot; (+{points} pts)
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Multi-Word or Long Word Combo Banner — Floating at top of matrix.
 */
export function WordBuildingComboBanner({
  text,
}: {
  text: string;
}) {
  return (
    <div className="absolute top-2 z-30 px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] text-slate-950 font-black text-base sm:text-lg tracking-wider animate-bounce pointer-events-none">
      {text}
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
