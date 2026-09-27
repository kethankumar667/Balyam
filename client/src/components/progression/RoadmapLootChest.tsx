import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Check, Coins, Crown, Gift } from "lucide-react";
import type { LevelMilestone, LevelTier } from "@shared/progression/MiniclipProgression";
import { getLevelTier } from "@shared/progression/MiniclipProgression";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

export interface RoadmapLootChestProps {
  milestone: LevelMilestone;
  isUnlocked: boolean;
  isClaimed: boolean;
  onClaim?: () => void;
  className?: string;
}

/**
 * 3D Interactive Arcade Treasure Chest for Major Progression Milestones.
 * Features tier-specific metallic plating, lid opening physics,
 * radiant vertical light beam, and coin burst on unlock.
 */
export const RoadmapLootChest: React.FC<RoadmapLootChestProps> = ({
  milestone,
  isUnlocked,
  isClaimed,
  onClaim,
  className = "",
}) => {
  const reduceMotion = useReducedMotion();
  const tier: LevelTier = getLevelTier(milestone.level);
  const [isOpen, setIsOpen] = useState(isClaimed);
  const [isOpening, setIsOpening] = useState(false);

  const handleClick = () => {
    if (!isUnlocked || isClaimed || isOpening) return;

    setIsOpening(true);

    try {
      AudioManager.getInstance().play(AUDIO.REWARD_UNLOCK);
      HapticsManager.trigger("reward");
    } catch {
      // Audio/haptics optional
    }

    setTimeout(() => {
      setIsOpen(true);
      setIsOpening(false);
      onClaim?.();
    }, 600);
  };

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      style={{ perspective: "600px" }}
    >
      {/* Ambient Radial Backlight */}
      {isUnlocked && !isClaimed && (
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.4, 0.75, 0.4],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-2 rounded-2xl blur-lg pointer-events-none"
          style={{ backgroundColor: tier.themeColor }}
        />
      )}

      {/* Upward Light Eruption Beam when open */}
      {(isOpen || isOpening) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: [0.8, 1, 0.6], height: 90 }}
          transition={{ duration: 0.5 }}
          className="absolute -top-16 w-16 bg-gradient-to-t from-amber-400/80 via-yellow-200/50 to-transparent blur-xs pointer-events-none z-0"
        />
      )}

      {/* Chest Container */}
      <motion.button
        type="button"
        disabled={!isUnlocked || isClaimed}
        onClick={handleClick}
        whileHover={isUnlocked && !isClaimed ? { scale: 1.06, y: -2 } : {}}
        whileTap={isUnlocked && !isClaimed ? { scale: 0.94 } : {}}
        animate={
          isOpening
            ? {
                x: [-3, 3, -2, 2, 0],
                rotate: [-2, 2, -1, 1, 0],
              }
            : isUnlocked && !isClaimed && !reduceMotion
              ? { y: [0, -3, 0] }
              : {}
        }
        transition={
          isOpening
            ? { duration: 0.5 }
            : { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
        className={`relative z-10 w-16 h-16 rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all cursor-pointer ${
          isClaimed
            ? "bg-stone-900/60 border border-white/10 opacity-70 cursor-default"
            : isUnlocked
              ? "bg-gradient-to-b from-stone-800 to-stone-950 border-2 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              : "bg-stone-950/80 border border-white/5 opacity-50 cursor-not-allowed"
        }`}
        style={{
          borderColor: isUnlocked && !isClaimed ? tier.themeColor : undefined,
        }}
        aria-label={`Milestone Level ${milestone.level} Chest: ${
          isClaimed ? "Claimed" : isUnlocked ? "Ready to open" : "Locked"
        }`}
      >
        {/* Chest SVG Art */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          {/* Lid (Opens with 3D Rotate) */}
          <motion.div
            animate={{
              rotateX: isOpen ? -90 : isOpening ? -30 : 0,
              y: isOpen ? -6 : 0,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ transformOrigin: "top center", transformStyle: "preserve-3d" }}
            className="absolute top-0 w-9 h-4 rounded-t-lg bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 border border-yellow-200/40 flex items-center justify-center z-20 shadow-md"
          >
            <div className="w-2.5 h-1 bg-amber-950/60 rounded-xs" />
          </motion.div>

          {/* Chest Base Box */}
          <div className="w-9 h-6 mt-3 rounded-b-lg bg-gradient-to-b from-amber-800 via-amber-900 to-stone-950 border-x border-b border-amber-500/40 relative flex items-center justify-center shadow-inner">
            {/* Center Lock / Emblem */}
            <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-amber-900 flex items-center justify-center shadow-xs">
              {isClaimed ? (
                <Check className="w-2.5 h-2.5 text-stone-950 stroke-[3]" />
              ) : isUnlocked ? (
                <Crown className="w-2 h-2 text-stone-950 fill-stone-950" />
              ) : (
                <Lock className="w-2 h-2 text-stone-950" />
              )}
            </div>
          </div>
        </div>

        {/* Small Level Pip Pill */}
        <span
          className="absolute -bottom-2 px-1.5 py-0.2 rounded-full text-[9px] font-black font-mono border shadow-sm"
          style={{
            backgroundColor: isUnlocked ? tier.themeColor : "#292524",
            color: isUnlocked ? "#000000" : "#a8a29e",
            borderColor: isUnlocked ? "#ffffff44" : "#ffffff15",
          }}
        >
          LVL {milestone.level}
        </span>
      </motion.button>
    </div>
  );
};

export default RoadmapLootChest;
