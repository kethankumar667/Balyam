import { useEffect } from "react";
import { motion } from "framer-motion";
import ComicBurstText from "../../animations/comic/ComicBurstText";
import { fireComicDustBurst, fireStarSparkleBurst, fireFireworksBurst } from "../../animations/particles/comicBursts";
import type { Player } from "@shared/types";

/**
 * Snake Bite — "OUCH!" Signature Animation.
 * Comic star burst, "OUCH!" badge, hit-stop, and comedic reaction.
 */
export function SnakeBiteOverlay({
  playerName,
  from,
  to,
  x,
  y,
  onComplete,
}: {
  playerName: string;
  from: number;
  to: number;
  x: number;
  y: number;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireComicDustBurst({ left: `${x}%`, top: `${(y / 112) * 100}%` }, { intensity: 0.8 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1300);
    return () => clearTimeout(timer);
  }, [x, y, onComplete]);

  return (
    <div
      className="pointer-events-none absolute z-40 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${(y / 112) * 100}%` }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{
          scale: [0, 1.25, 1],
          rotate: [-20, 8, -4],
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.38, ease: "backOut" }}
        className="flex flex-col items-center"
      >
        <ComicBurstText text="OUCH!" accent="#7F1D1D" fill="#FCA5A5" seed={5} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-1 px-3 py-1 rounded-full text-xs font-black tracking-wider text-white shadow-lg uppercase bg-rose-600 border-2 border-rose-900"
        >
          🐍 {playerName} bit down to {to}!
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Ladder Climb — "SKY HIGH!" Animation.
 * Golden star sparkles, rapid rung climb with "SKY HIGH!" badge.
 */
export function LadderClimbOverlay({
  playerName,
  from,
  to,
  x,
  y,
  onComplete,
}: {
  playerName: string;
  from: number;
  to: number;
  x: number;
  y: number;
  onComplete?: () => void;
}) {
  useEffect(() => {
    fireStarSparkleBurst({ left: `${x}%`, top: `${(y / 112) * 100}%` }, { intensity: 0.9 });
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1300);
    return () => clearTimeout(timer);
  }, [x, y, onComplete]);

  return (
    <div
      className="pointer-events-none absolute z-40 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${(y / 112) * 100}%` }}
    >
      <motion.div
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: [0, 1.3, 1], y: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="flex flex-col items-center"
      >
        <ComicBurstText text="SKY HIGH!" accent="#064E3B" fill="#A7F3D0" seed={11} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-1 px-3 py-1 rounded-full text-xs font-black tracking-wider text-white shadow-lg uppercase bg-emerald-600 border-2 border-emerald-900"
        >
          🪜 {playerName} climbed to {to}!
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Exact 100 — L4 Cinematic Winner Celebration for Snakes & Ladders.
 */
export function SnlWinnerCelebration({
  winner,
}: {
  winner: Player | undefined;
}) {
  useEffect(() => {
    fireFireworksBurst({ intensity: 1 });
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
      {/* Dim backdrop pulse */}
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

        <ComicBurstText text="100! WINNER!" accent="#2B2118" fill="#FDE047" seed={14} />

        <div
          className="rounded-2xl px-8 py-3.5 text-center shadow-2xl mt-1"
          style={{
            background: "linear-gradient(135deg, #065f46, #047857)",
            outline: "3px solid rgba(255,255,255,0.75)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(52,211,153,0.5)",
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-emerald-200 font-bold">
            Snakes &amp; Ladders Champion
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight mt-0.5">
            {winner?.name ?? "Champion"}
          </div>
        </div>

        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.1, repeat: 7 }}
          className="text-2xl mt-1 flex gap-2"
        >
          <span>🏆</span>
          <span>✨</span>
          <span>🪜</span>
          <span>✨</span>
          <span>🏆</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
