import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";

/**
 * Pure Sequence — Gold & Emerald sequence highlight animation.
 */
export function RummyPureSequenceBurst({ onComplete }: { onComplete?: () => void }) {
  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "60%" }, { intensity: 0.7 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, y: 30 }}
        animate={{ scale: [0, 1.25, 1], y: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="flex flex-col items-center gap-1.5"
      >
        <div className="text-4xl">✨ 🃏 ✨</div>
        <ComicBurstText text="PURE RUN!" accent="#064E3B" fill="#6EE7B7" seed={8} />
        <div className="px-3.5 py-1 rounded-full text-xs font-black text-white bg-emerald-700 border border-emerald-900 shadow-xl tracking-wider uppercase">
          Pure Sequence Locked!
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Invalid Declaration — Red Stamp & Card Shake.
 */
export function RummyInvalidDeclareOverlay({ onComplete }: { onComplete?: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 2, opacity: 0, rotate: -20 }}
        animate={{
          scale: [2, 0.9, 1],
          opacity: [0, 1, 1],
          rotate: [-20, 5, -5],
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col items-center gap-2 p-6 rounded-3xl bg-rose-950/80 border-2 border-rose-600 shadow-2xl backdrop-blur-sm"
      >
        <div className="text-5xl">🚫 ❌ 🃏</div>
        <div className="text-2xl sm:text-3xl font-black text-rose-300 tracking-wider uppercase border-4 border-rose-500 px-6 py-2 rounded-xl rotate-[-4deg] shadow-lg">
          INVALID DECLARATION
        </div>
        <div className="text-xs font-bold text-rose-200 mt-1">
          Requires 2 runs (including at least 1 Pure Sequence)
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Declaration Flourish — Valid declare notification.
 */
export function RummyDeclareFlourish({
  declarerName,
  onComplete,
}: {
  declarerName: string;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireStarSparkleBurst({ left: "50%", top: "45%" }, { intensity: 0.8 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1400);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, y: 40 }}
        animate={{ scale: [0, 1.2, 1], y: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="flex flex-col items-center gap-2"
      >
        <div className="text-5xl">🎴 👑 🎴</div>
        <ComicBurstText text="DECLARED!" accent="#1E1B4B" fill="#C7D2FE" seed={16} />
        <div className="px-4 py-1.5 rounded-full text-xs font-black text-white bg-indigo-700 border-2 border-indigo-950 shadow-xl tracking-wider uppercase">
          {declarerName} has declared!
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Rummy Winner Celebration — L4 Card Table Victory Ceremony.
 */
export function RummyWinnerCelebration({
  winnerName,
}: {
  winnerName: string;
}) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 0.9 });
    // Bounded — an unbounded interval kept firing bursts (and the idle
    // bounce/pulse below kept looping) for as long as this stayed mounted.
    // Six more bursts (~5s) reads as a proper fireworks finale, not a
    // stuck animation. (This one is already gated by `scorecardDismissed`
    // on the board side, so it can't loop forever in practice — bounded
    // here too for the same reason every celebration in this batch is:
    // consistency, and it removes the dependency on that gate being
    // correct everywhere it's reused.)
    let burstCount = 0;
    const maxBursts = 6;
    const interval = setInterval(() => {
      fireFireworksBurst({ intensity: 0.7 });
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
          animate={{ y: [0, -12, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 1.6, repeat: 5, ease: "easeInOut" }}
          className="text-8xl drop-shadow-2xl"
        >
          👑
        </motion.div>

        <ComicBurstText text="RUMMY CHAMPION!" accent="#1F2937" fill="#FDE047" seed={21} />

        <div
          className="rounded-2xl px-8 py-3.5 text-center shadow-2xl mt-1"
          style={{
            background: "linear-gradient(135deg, #065f46, #047857)",
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(52,211,153,0.5)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-emerald-200 font-bold">
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
          <span>🎴</span>
          <span>✨</span>
          <span>🏆</span>
          <span>✨</span>
          <span>🃏</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
