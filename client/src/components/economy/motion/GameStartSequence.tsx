import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Swords, Flame, Sparkles } from "lucide-react";

export interface GameStartSequenceProps {
  gameTitle: string;
  totalPotAmount: string;
  onComplete: () => void;
  className?: string;
}

/**
 * Game Start Ceremonial Sequence (Motion Chapter 2).
 * Contracted prize pot, ceremonial board halo, game title reveal, and 3..2..1 countdown.
 * Automatically clears after concise animation to not block gameplay interactions.
 */
export const GameStartSequence: React.FC<GameStartSequenceProps> = ({
  gameTitle,
  totalPotAmount,
  onComplete,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const [countdown, setCountdown] = useState<number>(3);

  // Latest-ref pattern: `onComplete` is read through a ref, not the effect's
  // dependency array. `EconomyMotionOrchestrator` renders this component with
  // `onComplete={onGameStartComplete || (() => {})}` — a fresh function
  // identity on every one of ITS renders — so depending on `onComplete`
  // directly would restart this countdown from 3 on any unrelated parent
  // re-render while it's mid-flight (a real risk once this is wired to a
  // live socket-driven parent like Room.tsx, even though nothing in the
  // current, unwired usage happens to trigger it).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (reduceMotion) {
      const timer = window.setTimeout(() => onCompleteRef.current(), 300);
      return () => window.clearTimeout(timer);
    }

    let current = 3;
    let finishTimer: number | null = null;
    const interval = window.setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        window.clearInterval(interval);
        finishTimer = window.setTimeout(() => onCompleteRef.current(), 250);
      }
    }, 500);

    return () => {
      window.clearInterval(interval);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
  }, [reduceMotion]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none pointer-events-none ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Match starting for ${gameTitle}. Prize pot: ${totalPotAmount} coins.`}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-[36px] bg-gradient-to-b from-[#1E2638]/95 to-[#0F1420]/95 border-2 border-amber-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center max-w-sm w-full mx-auto"
      >
        {/* Ambient Ring Glow */}
        <div
          className="absolute w-48 h-48 rounded-full bg-amber-500/20 blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Ceremonial Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mb-3 shadow-md">
          <Swords className="w-7 h-7 animate-pulse" aria-hidden="true" />
        </div>

        {/* Title */}
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400/90 font-bold flex items-center gap-1 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          MATCH COMMENCED
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          {gameTitle}
        </h2>

        {/* Pot Summary */}
        <div className="px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs mb-5">
          Pot: {totalPotAmount} Coins
        </div>

        {/* Countdown Number */}
        <motion.div
          key={countdown}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 flex items-center justify-center gap-2"
        >
          {countdown > 0 ? (
            <span>{countdown}</span>
          ) : (
            <span className="text-emerald-400 text-2xl flex items-center gap-1">
              <Flame className="w-6 h-6 text-emerald-400 fill-current" />
              PLAY!
            </span>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
