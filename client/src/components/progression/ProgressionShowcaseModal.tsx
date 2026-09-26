import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Crown,
  Trophy,
  Flame,
  Award,
  Zap,
  Coins,
  ChevronRight,
  ShieldCheck,
  BarChart2,
} from "lucide-react";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";
import { MiniclipHoloTilt } from "./MiniclipHoloTilt";
import { FlameStreakAura } from "./FlameStreakAura";
import { LevelRoadmapModal } from "./LevelRoadmapModal";
import {
  calculateMiniclipXPProgression,
  getLevelTier,
  getLevelTitle,
} from "@shared/progression/MiniclipProgression";
import type { LevelTier } from "@shared/progression/MiniclipProgression";

export interface ProgressionShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  level: number;
  experiencePoints: number;
  playerId?: string;
  winStreak?: number;
  totalMatches?: number;
  winRatePct?: number;
  avatar?: string | null;
}

/**
 * 3D Holographic Player Progression Showcase Card Modal.
 *
 * The definitive player showcase card inspired by Miniclip high-roller profiles:
 *  - 3D interactive HoloTilt emblem with living tier auras
 *  - "On Fire" flame win streak badge
 *  - Real-time XP progress bar and next level milestone reward preview
 *  - Quick launcher into the full Level Rewards Road
 */
export const ProgressionShowcaseModal: React.FC<ProgressionShowcaseModalProps> = ({
  isOpen,
  onClose,
  playerName,
  level,
  experiencePoints,
  playerId = "local_player",
  winStreak = 0,
  totalMatches = 0,
  winRatePct = 0,
  avatar,
}) => {
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const safeLevel = Math.max(1, Math.floor(level));
  const tier: LevelTier = getLevelTier(safeLevel);
  const title = getLevelTitle(safeLevel);
  const progression = calculateMiniclipXPProgression(experiencePoints);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="showcase-title"
            className="fixed inset-0 z-[95] flex items-center justify-center p-4 overflow-y-auto"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              style={{
                background: `radial-gradient(circle at center, ${tier.themeColor}22 0%, rgba(5,5,8,0.92) 80%)`,
              }}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative w-full max-w-md mx-auto rounded-3xl p-6 bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-amber-500/30 text-white shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden text-center z-10"
            >
              {/* Top Bar with Close Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono text-amber-400">
                    PLAYER PRESTIGE CARD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  aria-label="Close Showcase"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3D Holo Emblem Feature */}
              <div className="flex justify-center my-4">
                <FlameStreakAura streak={winStreak} showBadge={winStreak >= 2}>
                  <MiniclipHoloTilt tier={tier} maxTiltDeg={18} enableAura={true}>
                    <MiniclipLevelBadge
                      level={safeLevel}
                      size="xl"
                      enableHoloTilt={false}
                      showTooltip={false}
                    />
                  </MiniclipHoloTilt>
                </FlameStreakAura>
              </div>

              {/* Player Identity */}
              <div className="space-y-1 mb-5">
                <h3 id="showcase-title" className="text-2xl font-black text-white font-display">
                  {playerName}
                </h3>
                <div
                  className="text-xs font-black uppercase font-mono tracking-wider"
                  style={{ color: tier.themeColor }}
                >
                  {tier.name} Tier • {title}
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-left space-y-2 mb-5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-stone-300 font-bold">Level {safeLevel} Progress</span>
                  <span className="text-amber-400 font-black">{progression.levelProgressPercent}%</span>
                </div>
                <div className="h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    style={{ width: `${progression.levelProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono">
                  <span>{progression.currentXP} / {progression.nextLevelXP} XP</span>
                  <span>Next: +{progression.rewardForNextLevel.coins} Coins</span>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
                  <Trophy className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-sm font-black text-white">{experiencePoints.toLocaleString()}</span>
                  <span className="text-[9px] uppercase text-stone-400 font-mono">Total XP</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
                  <Flame className="w-4 h-4 text-orange-400 mb-1" />
                  <span className="text-sm font-black text-white">{winStreak}x</span>
                  <span className="text-[9px] uppercase text-stone-400 font-mono">Win Streak</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
                  <BarChart2 className="w-4 h-4 text-emerald-400 mb-1" />
                  <span className="text-sm font-black text-white">{totalMatches}</span>
                  <span className="text-[9px] uppercase text-stone-400 font-mono">Matches</span>
                </div>
              </div>

              {/* Open Full Level Road Button */}
              <button
                type="button"
                onClick={() => {
                  setIsRoadmapOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs font-mono uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <span>OPEN LEVEL REWARDS ROAD</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Level Road Modal */}
      <LevelRoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
        experiencePoints={experiencePoints}
        playerId={playerId}
      />
    </>
  );
};

export default ProgressionShowcaseModal;
