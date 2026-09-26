import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Flame, Zap, Shield, Crown } from "lucide-react";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";
import { MiniclipHoloTilt } from "./MiniclipHoloTilt";
import { FlameStreakAura } from "./FlameStreakAura";
import SeatAvatar from "../profile/SeatAvatar";
import { getLevelTier, getLevelTitle } from "@shared/progression/MiniclipProgression";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

export interface ClashParticipant {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  winStreak?: number;
}

export interface MatchVersusClashProps {
  isOpen: boolean;
  player1: ClashParticipant;
  player2: ClashParticipant;
  gameTitle?: string;
  onComplete: () => void;
  autoDismissMs?: number;
}

/**
 * Authentic Miniclip-style 1v1 Match Versus Showdown Clash.
 *
 * Slams player cards together from opposite sides of the screen with spark impacts,
 * level emblems, and an electrifying center VS badge before revealing the active board.
 */
export const MatchVersusClash: React.FC<MatchVersusClashProps> = ({
  isOpen,
  player1,
  player2,
  gameTitle = "MATCH SHOWDOWN",
  onComplete,
  autoDismissMs = 2600,
}) => {
  const p1Tier = getLevelTier(player1.level);
  const p2Tier = getLevelTier(player2.level);

  useEffect(() => {
    if (!isOpen) return;

    try {
      HapticsManager.trigger("gameStart");
    } catch {
      // Haptics optional
    }

    const timer = setTimeout(() => {
      onComplete();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [isOpen, onComplete, autoDismissMs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Match Versus Clash"
        onClick={onComplete}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer select-none overflow-hidden"
      >
        {/* Ambient Top Light Beam */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/20 via-transparent to-transparent pointer-events-none" />

        {/* Center Game Title Ribbon */}
        <div className="absolute top-8 inset-x-0 flex flex-col items-center pointer-events-none">
          <span className="text-[10px] font-black uppercase font-mono tracking-[0.3em] text-amber-400">
            BHALYAM LOUNGE ARENA
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white font-display drop-shadow-md">
            {gameTitle}
          </h2>
        </div>

        {/* Main Versus Arena Cards */}
        <div className="w-full max-w-3xl flex flex-col md:flex-row items-center justify-center gap-6 relative z-10">
          {/* Player 1 Card (Slams in from Left) */}
          <motion.div
            initial={{ x: -250, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="w-full max-w-xs p-5 rounded-3xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-amber-500/40 text-center shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            <div
              className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-2xl opacity-30 pointer-events-none"
              style={{ backgroundColor: p1Tier.themeColor }}
            />
            <div className="flex justify-center mb-3">
              <SeatAvatar avatar={player1.avatar} name={player1.name} className="w-16 h-16 shadow-lg" />
            </div>
            <h3 className="text-lg font-black text-white truncate font-display mb-1">{player1.name}</h3>
            <div className="text-xs font-mono font-bold mb-3" style={{ color: p1Tier.themeColor }}>
              {p1Tier.name} Tier • {getLevelTitle(player1.level)}
            </div>
            <div className="flex justify-center">
              <FlameStreakAura streak={player1.winStreak || 0} showBadge={(player1.winStreak || 0) >= 2}>
                <MiniclipLevelBadge level={player1.level} size="lg" showTooltip={false} />
              </FlameStreakAura>
            </div>
          </motion.div>

          {/* Central Electrifying VS Clash Medallion */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: [0, 1.3, 1], rotate: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 20, delay: 0.2 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-[0_0_35px_rgba(245,158,11,0.8)] flex items-center justify-center shrink-0 z-20"
          >
            <div className="w-full h-full bg-stone-950 rounded-full flex flex-col items-center justify-center border border-amber-300">
              <span className="text-xl sm:text-2xl font-black font-display italic text-amber-400 tracking-tighter">
                VS
              </span>
            </div>
          </motion.div>

          {/* Player 2 Card (Slams in from Right) */}
          <motion.div
            initial={{ x: 250, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="w-full max-w-xs p-5 rounded-3xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-cyan-500/40 text-center shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-30 pointer-events-none"
              style={{ backgroundColor: p2Tier.themeColor }}
            />
            <div className="flex justify-center mb-3">
              <SeatAvatar avatar={player2.avatar} name={player2.name} className="w-16 h-16 shadow-lg" />
            </div>
            <h3 className="text-lg font-black text-white truncate font-display mb-1">{player2.name}</h3>
            <div className="text-xs font-mono font-bold mb-3" style={{ color: p2Tier.themeColor }}>
              {p2Tier.name} Tier • {getLevelTitle(player2.level)}
            </div>
            <div className="flex justify-center">
              <FlameStreakAura streak={player2.winStreak || 0} showBadge={(player2.winStreak || 0) >= 2}>
                <MiniclipLevelBadge level={player2.level} size="lg" showTooltip={false} />
              </FlameStreakAura>
            </div>
          </motion.div>
        </div>

        {/* Tap to Skip Prompt */}
        <div className="absolute bottom-6 inset-x-0 text-center text-[11px] font-mono text-stone-400">
          TAP TO ENTER MATCH
        </div>
      </div>
    </AnimatePresence>
  );
};

export default MatchVersusClash;
