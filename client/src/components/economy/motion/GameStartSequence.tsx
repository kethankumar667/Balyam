import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Shuffle,
  Layers,
  Swords,
  Flame,
} from "lucide-react";
import CountdownNumeral3D, { chromeAccentFor, type CountdownStep } from "../../../animations/app/CountdownNumeral3D";
import { pickCountdownSlogans } from "../../../animations/app/countdownSlogans";
import { fireComicDustBurst, fireStarSparkleBurst } from "../../../animations/particles/comicBursts";
import { useAudio } from "../../../hooks/useAudio";
import { AUDIO } from "../../../constants/audio";
import { useHaptics } from "../../../hooks/useHaptics";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import type { GameKind } from "@shared/types";

export interface GameStartSequenceProps {
  /** Real game kind — selects UNO's card-color cycle / Rummy's felt-and-gold theme, their funny slogans, and the display title. */
  game?: GameKind;
  /** Explicit override; only used when `game` is omitted (e.g. a caller that hasn't been updated yet). */
  gameTitle?: string;
  totalPotAmount: string;
  onComplete: () => void;
  className?: string;
}

function iconFor(game: GameKind | undefined) {
  if (game === "uno") return Shuffle;
  if (game === "rummy") return Layers;
  return Swords;
}

/**
 * Game Start Ceremonial Sequence (Motion Chapter 2) — the countdown almost
 * every match actually sees, right after cards are shuffled and dealt: the
 * economy commitment is confirmed, the pot is formed, and this is the last
 * beat before the board appears. Shares its numeral with
 * `BhalyamMatchCountdown` (`CountdownNumeral3D`) so the "3D flip + funny
 * slogan" identity is the same regardless of which of the two ceremonies a
 * given match takes.
 */
export const GameStartSequence: React.FC<GameStartSequenceProps> = ({
  game,
  gameTitle,
  totalPotAmount,
  onComplete,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const [countdown, setCountdown] = useState<number>(3);
  const { play } = useAudio();
  const haptics = useHaptics();

  const [slogans] = useState(() => pickCountdownSlogans(game));
  const accent = chromeAccentFor(game);
  const Icon = iconFor(game);
  const title = game ? GAME_DISPLAY_NAMES[game] : gameTitle || "BHALYAM Match";

  const step: CountdownStep = countdown > 0 ? (countdown as CountdownStep) : "GO";
  const slogan =
    step === 3 ? slogans.three : step === 2 ? slogans.two : step === 1 ? slogans.one : slogans.go;

  // Latest-ref pattern: `onComplete` is read through a ref, not the effect's
  // dependency array. `EconomyMotionOrchestrator` renders this component with
  // `onComplete={onGameStartComplete || (() => {})}` — a fresh function
  // identity on every one of ITS renders — so depending on `onComplete`
  // directly would restart this countdown from 3 on any unrelated parent
  // re-render while it's mid-flight (a real risk once this is wired to a
  // live socket-driven parent like Room.tsx, even though nothing in the
  // current, unwired usage happens to trigger it).
  const latest = useRef({ onComplete, play, haptics, reduceMotion });
  useEffect(() => {
    latest.current = { onComplete, play, haptics, reduceMotion };
  });

  useEffect(() => {
    if (latest.current.reduceMotion) {
      const timer = window.setTimeout(() => latest.current.onComplete(), 300);
      return () => window.clearTimeout(timer);
    }

    latest.current.play(AUDIO.SYS_COUNTDOWN);
    latest.current.haptics.subtle();
    fireComicDustBurst({ left: "50%", top: "42%" }, { intensity: 0.4 });

    let current = 3;
    let finishTimer: number | null = null;
    const interval = window.setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current > 0) {
        latest.current.play(AUDIO.SYS_COUNTDOWN);
        latest.current.haptics.subtle();
        fireComicDustBurst({ left: "50%", top: "42%" }, { intensity: 0.4 + (3 - current) * 0.15 });
      } else {
        latest.current.play(AUDIO.SYS_SUCCESS);
        latest.current.haptics.win();
        fireStarSparkleBurst({ left: "50%", top: "42%" }, { intensity: 1 });
        window.clearInterval(interval);
        finishTimer = window.setTimeout(() => latest.current.onComplete(), 500);
      }
    }, 650);

    return () => {
      window.clearInterval(interval);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none pointer-events-none ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Match starting for ${title}. Prize pot: ${totalPotAmount} coins. ${slogan}`}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-[36px] bg-gradient-to-b from-[#1E2638]/95 to-[#0F1420]/95 border-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center max-w-sm w-full mx-auto"
        style={{ borderColor: accent.border }}
      >
        {/* Ambient Ring Glow — per-game tinted */}
        <div
          className="absolute w-56 h-56 rounded-full blur-2xl pointer-events-none"
          style={{ background: accent.glow }}
          aria-hidden="true"
        />

        {/* Ceremonial Icon */}
        <div
          className="relative w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mb-3 shadow-md"
        >
          <Icon className="w-7 h-7 animate-pulse" aria-hidden="true" />
        </div>

        {/* Title */}
        <span className="relative text-xs font-mono uppercase tracking-[0.25em] text-amber-400/90 font-bold flex items-center gap-1 mb-1">
          <Flame className="w-3.5 h-3.5" />
          {accent.eyebrow}
        </span>

        <h2 className="relative text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          {title}
        </h2>

        {/* Pot Summary */}
        <div className="relative px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs mb-5">
          Pot: {totalPotAmount} Coins
        </div>

        {/* 3D flip numeral + funny per-game slogan — shared with BhalyamMatchCountdown */}
        <div className="relative">
          <CountdownNumeral3D step={step} game={game} slogan={slogan} size={104} />
        </div>
      </motion.div>
    </div>
  );
};
