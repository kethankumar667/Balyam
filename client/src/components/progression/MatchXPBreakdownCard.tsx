import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, Zap, Star, Award } from "lucide-react";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";
import type { MatchXPBreakdown } from "@shared/progression/MiniclipProgression";
import {
  calculateLevel,
  getLevelTier,
  XP_CONFIG,
} from "@shared/progression/MiniclipProgression";

export interface MatchXPBreakdownCardProps {
  breakdown: MatchXPBreakdown;
  onOpenLevelUpCelebration?: () => void;
  className?: string;
}

export const MatchXPBreakdownCard: React.FC<MatchXPBreakdownCardProps> = ({
  breakdown,
  onOpenLevelUpCelebration,
  className = "",
}) => {
  const [expanded, setExpanded] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  const prevLvl = breakdown.previousLevel;
  const newLvl = breakdown.newLevel;
  const leveledUp = breakdown.leveledUp;

  // Previous progress % in level
  const prevLvlStartXP = (prevLvl - 1) * XP_CONFIG.XP_PER_LEVEL;
  const prevProgressInLvl = breakdown.previousXP - prevLvlStartXP;
  const initialPct = Math.min(100, Math.max(0, Math.round((prevProgressInLvl / XP_CONFIG.XP_PER_LEVEL) * 100)));

  // Target progress % in new level
  const newLvlStartXP = (newLvl - 1) * XP_CONFIG.XP_PER_LEVEL;
  const newProgressInLvl = breakdown.newXP - newLvlStartXP;
  const targetPct = Math.min(100, Math.max(0, Math.round((newProgressInLvl / XP_CONFIG.XP_PER_LEVEL) * 100)));

  useEffect(() => {
    // Start at initial percentage and smoothly animate to target percentage
    setProgressWidth(initialPct);
    const timer = setTimeout(() => {
      setProgressWidth(targetPct);
    }, 400);
    return () => clearTimeout(timer);
  }, [initialPct, targetPct]);

  const currentTier = getLevelTier(newLvl);

  return (
    <div
      className={`rounded-2xl bg-stone-900/90 border border-amber-500/30 p-4 shadow-xl backdrop-blur-md text-white relative overflow-hidden ${className}`}
    >
      {/* Background ambient lighting */}
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ backgroundColor: currentTier.themeColor }}
      />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 font-mono">
              MATCH EXPERIENCE
            </div>
            <div className="text-base font-black text-white flex items-center gap-1.5">
              <span>+{breakdown.totalXP} XP EARNED</span>
            </div>
          </div>
        </div>

        {leveledUp && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onOpenLevelUpCelebration}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-[11px] font-mono uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.5)] cursor-pointer flex items-center gap-1 animate-pulse"
          >
            <Star className="w-3.5 h-3.5 fill-stone-950" />
            <span>LEVEL UP!</span>
          </motion.button>
        )}
      </div>

      {/* XP Progress Bar Row */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <MiniclipLevelBadge level={newLvl} size="xs" showTooltip={false} />
            <span className="font-bold text-stone-200">Level {newLvl}</span>
          </div>
          <span className="text-amber-400 font-black">
            {newProgressInLvl} / {XP_CONFIG.XP_PER_LEVEL} XP ({targetPct}%)
          </span>
        </div>

        <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]"
            initial={{ width: `${initialPct}%` }}
            animate={{ width: `${progressWidth}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Collapsible Itemized Breakdown Button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full pt-1 text-[11px] font-mono text-stone-400 hover:text-stone-200 flex items-center justify-between cursor-pointer border-t border-white/10 transition-colors"
      >
        <span>View XP Breakdown</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Itemized List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1.5 pt-2 overflow-hidden"
          >
            {breakdown.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs font-mono text-stone-300 bg-white/[0.03] px-2.5 py-1.5 rounded-lg border border-white/5"
              >
                <span>{item.label}</span>
                <span className="text-amber-400 font-bold">+{item.amount} XP</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchXPBreakdownCard;
