import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  Coins,
  Crown,
  Lock,
  Check,
  ChevronRight,
  Award,
  Zap,
} from "lucide-react";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";
import {
  LEVEL_MILESTONES,
  MINICLIP_LEVEL_TIERS,
  calculateMiniclipXPProgression,
  calculateLevelCoinReward,
  getLevelTier,
  getLevelTitle,
} from "@shared/progression/MiniclipProgression";
import type { LevelTierName } from "@shared/progression/MiniclipProgression";
import { apiFetch } from "../../lib/playerIdentity";

export interface LevelRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  experiencePoints: number;
  playerId?: string;
  onClaimReward?: (level: number, coins: number) => void;
}

const TIER_NAMES: LevelTierName[] = [
  "Bronze",
  "Silver",
  "Cobalt",
  "Gold",
  "Ruby",
  "Amethyst",
  "Emerald",
  "Celestial",
];

export const LevelRoadmapModal: React.FC<LevelRoadmapModalProps> = ({
  isOpen,
  onClose,
  experiencePoints,
  playerId,
  onClaimReward,
}) => {
  const [selectedTier, setSelectedTier] = useState<LevelTierName>("Bronze");
  const [claimedLevels, setClaimedLevels] = useState<Set<number>>(new Set());
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  const progression = calculateMiniclipXPProgression(experiencePoints);
  const currentLevel = progression.currentLevel;
  const currentTier = progression.tier;

  // Filter milestones by active tier
  const activeTierConfig = MINICLIP_LEVEL_TIERS[selectedTier];
  const tierMilestones = LEVEL_MILESTONES.filter(
    (m) => m.level >= activeTierConfig.minLevel && m.level <= activeTierConfig.maxLevel
  );

  const handleClaim = async (level: number, coins: number) => {
    if (!playerId) return;
    setClaimingLevel(level);
    try {
      const res = await apiFetch(`/api/profile/${playerId}/claim-level-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (res.ok) {
        setClaimedLevels((prev) => new Set([...prev, level]));
        if (onClaimReward) {
          onClaimReward(level, coins);
        }
      }
    } catch {
      // Offline fallback
      setClaimedLevels((prev) => new Set([...prev, level]));
    } finally {
      setClaimingLevel(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="roadmap-title"
          className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative w-full max-w-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-amber-500/30 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between relative bg-stone-900/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="roadmap-title" className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-display">
                    Level Rewards Road
                  </h2>
                  <p className="text-xs text-stone-400 font-mono">
                    Progress through levels to unlock coins, titles & prestige crests
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close Level Road"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Current Level Status Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-neutral-900 to-stone-950 border border-amber-500/30 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
                <div className="flex items-center gap-4">
                  <MiniclipLevelBadge level={currentLevel} size="lg" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 font-mono">
                      CURRENT RANK
                    </div>
                    <div className="text-lg font-black text-white">
                      Level {currentLevel} • {progression.levelTitle}
                    </div>
                    <div className="text-xs text-stone-400 font-mono mt-0.5">
                      {currentTier.name} Tier • {experiencePoints.toLocaleString()} Lifetime XP
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Details */}
                <div className="w-full sm:w-56 space-y-1.5 shrink-0">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-stone-300 font-bold">Next: Level {currentLevel + 1}</span>
                    <span className="text-amber-400 font-black">{progression.levelProgressPercent}%</span>
                  </div>
                  <div className="h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/15 p-0.5 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      style={{ width: `${progression.levelProgressPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono text-right">
                    {progression.currentXP} / {progression.nextLevelXP} XP
                  </div>
                </div>
              </div>

              {/* Tier Navigation Tabs */}
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-stone-400 font-mono mb-2.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>SELECT TIER TRACK</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {TIER_NAMES.map((tierName) => {
                    const t = MINICLIP_LEVEL_TIERS[tierName];
                    const isSelected = selectedTier === tierName;
                    const isReached = currentLevel >= t.minLevel;
                    return (
                      <button
                        key={tierName}
                        type="button"
                        onClick={() => setSelectedTier(tierName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono tracking-wider uppercase whitespace-nowrap transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                            : isReached
                              ? "bg-stone-800/80 hover:bg-stone-800 text-white border-white/15"
                              : "bg-stone-950/60 text-stone-500 border-white/5 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: t.themeColor }}
                        />
                        <span>{t.name}</span>
                        <span className="text-[9px] opacity-75">Lv.{t.minLevel}+</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Milestones Road Track for Selected Tier */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
                  <span>
                    {activeTierConfig.name} Tier Roadmap (Levels {activeTierConfig.minLevel}–{activeTierConfig.maxLevel})
                  </span>
                  <span>{activeTierConfig.title} Class</span>
                </div>

                <div className="space-y-2.5">
                  {tierMilestones.map((milestone) => {
                    const isReached = currentLevel >= milestone.level;
                    const isCurrent = currentLevel === milestone.level;
                    const isClaimed = claimedLevels.has(milestone.level);
                    const isClaimable = isReached && !isClaimed;
                    const isClaiming = claimingLevel === milestone.level;

                    return (
                      <div
                        key={milestone.level}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isCurrent
                            ? "bg-amber-500/10 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            : isReached
                              ? "bg-stone-900/60 border-white/15"
                              : "bg-stone-950/40 border-white/5 opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <MiniclipLevelBadge level={milestone.level} size="sm" showTooltip={false} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">
                                Level {milestone.level}
                              </span>
                              {milestone.reward.title && (
                                <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {milestone.reward.title}
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                                  CURRENT
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-400 font-mono mt-0.5 flex items-center gap-2">
                              <span className="flex items-center gap-1 text-amber-400 font-bold">
                                <Coins className="w-3.5 h-3.5" />
                                +{milestone.reward.coins.toLocaleString()} Coins
                              </span>
                              {milestone.reward.perkDescription && (
                                <>
                                  <span>•</span>
                                  <span className="text-stone-300">{milestone.reward.perkDescription}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status / Claim Action */}
                        <div className="self-end sm:self-center">
                          {isClaimable ? (
                            <button
                              type="button"
                              disabled={isClaiming}
                              onClick={() => handleClaim(milestone.level, milestone.reward.coins)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs font-mono uppercase tracking-wider shadow-md hover:shadow-amber-500/30 cursor-pointer transition flex items-center gap-1.5"
                            >
                              <span>{isClaiming ? "CLAIMING..." : "CLAIM"}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : isClaimed ? (
                            <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-xs">
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>CLAIMED</span>
                            </div>
                          ) : isReached ? (
                            <div className="flex items-center gap-1 text-stone-400 font-mono font-bold text-xs">
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span>UNLOCKED</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-stone-500 font-mono text-xs">
                              <Lock className="w-3.5 h-3.5" />
                              <span>LOCKED</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LevelRoadmapModal;
