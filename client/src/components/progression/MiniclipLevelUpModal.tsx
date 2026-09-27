import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Crown, Trophy, Star, Award, Coins, ChevronRight, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";
import { TierAscensionCeremony } from "./TierAscensionCeremony";
import {
  getLevelTier,
  getLevelTitle,
  getLevelReward,
} from "@shared/progression/MiniclipProgression";
import type { LevelReward } from "@shared/progression/MiniclipProgression";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

export interface MiniclipLevelUpModalProps {
  isOpen: boolean;
  level: number;
  onClose: () => void;
  customRewards?: LevelReward[];
}

/**
 * Authentic Miniclip-style Level Up Fanfare Celebration Modal.
 * Renders full-screen celebratory ambient rays, large animated badge,
 * coin reward counter, unlocked prestige titles, and confetti burst.
 */
export const MiniclipLevelUpModal: React.FC<MiniclipLevelUpModalProps> = ({
  isOpen,
  level,
  onClose,
  customRewards,
}) => {
  const reduceMotion = useReducedMotion();
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const tier = getLevelTier(safeLevel);
  const title = getLevelTitle(safeLevel);
  const defaultReward = getLevelReward(safeLevel);
  const rewards = customRewards && customRewards.length > 0 ? customRewards : [defaultReward];
  const totalCoins = rewards.reduce((sum, r) => sum + r.coins, 0);

  const isTierAscension = tier.id > 1 && safeLevel === tier.minLevel;

  useEffect(() => {
    if (!isOpen || isTierAscension) return;

    // 1. Audio celebration
    try {
      AudioManager.getInstance().play(AUDIO.REWARD_LEVEL_UP);
    } catch {
      // Audio optional
    }

    // 2. Haptics fanfare
    try {
      HapticsManager.trigger("win");
    } catch {
      // Haptics optional
    }

    // 3. Dual celebratory confetti cannons (suppressed if reduceMotion preferred)
    if (!reduceMotion) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6, x: 0.3 },
          colors: [tier.themeColor, "#fbbf24", "#ffffff", "#f59e0b"],
        });
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6, x: 0.7 },
          colors: [tier.themeColor, "#fbbf24", "#ffffff", "#f59e0b"],
        });
      } catch {
        // Confetti fallback
      }
    }

    // 4. Keyboard Escape dismiss
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, tier.themeColor, isTierAscension, reduceMotion]);

  if (isTierAscension) {
    return (
      <TierAscensionCeremony
        isOpen={isOpen}
        tier={tier}
        level={safeLevel}
        onClose={onClose}
      />
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="levelup-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Backdrop with dark radial glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            style={{
              background: `radial-gradient(ellipse at center, ${tier.themeColor}33 0%, rgba(5,5,8,0.92) 75%)`,
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 30 }}
            animate={reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { scale: 1, opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.85, opacity: 0, y: 20 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 350, damping: 25 }
            }
            className="relative w-full max-w-md mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-amber-500/30 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-center z-10"
          >
            {/* Ambient Light Rays */}
            <div
              className={`absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
                reduceMotion ? "opacity-20" : "opacity-40 animate-pulse"
              }`}
              style={{ backgroundColor: tier.themeColor }}
            />

            {/* Top Ornamental Ribbon Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400 font-mono">
                BHALYAM LOUNGE • LEVEL UP
              </span>
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>

            {/* Main Headline */}
            <h2
              id="levelup-title"
              className="text-3xl sm:text-4xl font-black uppercase tracking-wider font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] mb-6"
              style={{
                background: "linear-gradient(180deg, #FFF7C2 0%, #F59E0B 50%, #B45309 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              LEVEL UP!
            </h2>

            {/* Centered Large Emblem Badge */}
            <div className="flex justify-center my-4 relative">
              <MiniclipLevelBadge
                level={safeLevel}
                size="xl"
                animated={true}
                showTooltip={false}
              />
            </div>

            {/* Level Title & Tier Announcement */}
            <div className="space-y-1 mb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-400 font-mono">
                {tier.name} TIER UNLOCKED
              </div>
              <div
                className="text-xl sm:text-2xl font-black tracking-tight"
                style={{ color: tier.themeColor }}
              >
                Level {safeLevel} • {title}
              </div>
            </div>

            {/* Unlocked Rewards Showcase */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400/90 font-mono flex items-center justify-between">
                <span>REWARDS EARNED</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </div>

              {/* Coin Reward Card */}
              {totalCoins > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">+{totalCoins.toLocaleString()} Coins</div>
                      <div className="text-[11px] text-amber-400/80 font-mono">Added to your lounge wallet</div>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              )}

              {/* Milestone Perk/Title */}
              {rewards.map((r, i) =>
                r.title || r.perkDescription || r.badgeLabel ? (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                        {tier.hasCrown ? <Crown className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">
                          {r.title || r.badgeLabel || "Tier Perk Unlocked"}
                        </div>
                        <div className="text-[11px] text-purple-300/80 font-mono">
                          {r.perkDescription || "New prestige badge & title"}
                        </div>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {/* Primary Action Button */}
            <motion.button
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-base shadow-[0_4px_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            >
              <span>CLAIM & CONTINUE</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MiniclipLevelUpModal;
