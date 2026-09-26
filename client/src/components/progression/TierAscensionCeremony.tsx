import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Crown, Star, Award, Zap, ChevronRight, ShieldCheck, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";
import { MiniclipHoloTilt } from "./MiniclipHoloTilt";
import {
  getLevelTier,
  getLevelTitle,
  MINICLIP_LEVEL_TIERS,
} from "@shared/progression/MiniclipProgression";
import type { LevelTier } from "@shared/progression/MiniclipProgression";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

export interface TierAscensionCeremonyProps {
  isOpen: boolean;
  tier: LevelTier;
  level: number;
  onClose: () => void;
  previousTier?: LevelTier;
}

/**
 * Epic Tier Promotion & Ascension Ceremony Modal.
 *
 * Triggered when a player ascends across a tier boundary (e.g. Bronze -> Silver,
 * Silver -> Cobalt with Wings, Cobalt -> Gold with Laurels, etc.).
 * Delivers full-screen cinematic shockwave, screen-shake impact, forged emblem
 * reveal, unlocked tier perks, and dual golden confetti cannon bursts.
 */
export const TierAscensionCeremony: React.FC<TierAscensionCeremonyProps> = ({
  isOpen,
  tier,
  level,
  onClose,
  previousTier,
}) => {
  const reduceMotion = useReducedMotion();
  const safeLevel = Math.max(1, Math.floor(level));
  const title = getLevelTitle(safeLevel);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Audio Fanfare
    try {
      AudioManager.getInstance().play(AUDIO.REWARD_LEVEL_UP);
    } catch {
      // Audio optional
    }

    // 2. Haptics Impact
    try {
      HapticsManager.trigger("win");
    } catch {
      // Haptics optional
    }

    // 3. Dense Golden/Tier Confetti Cannons (suppressed if reduced motion preferred)
    if (!reduceMotion) {
      try {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.55 },
          colors: [tier.themeColor, "#fbbf24", "#ffffff", tier.secondaryColor],
        });
      } catch {
        // Confetti optional
      }
    }
  }, [isOpen, tier, reduceMotion]);

  const perks = [
    {
      title: `${tier.name} Prestige Emblem`,
      desc: tier.badgeShape.replace("-", " ").toUpperCase() + " metallic badging unlocked",
      icon: <Award className="w-4 h-4 text-amber-400" />,
    },
    tier.hasWings
      ? {
          title: "Prestige Wing Accents",
          desc: "Ornate metallic wings pinned to your profile",
          icon: <Crown className="w-4 h-4 text-sky-400" />,
        }
      : null,
    tier.hasLaurel
      ? {
          title: "Golden Laurels of Honor",
          desc: "Olympic wreath surrounding your level pip",
          icon: <Trophy className="w-4 h-4 text-yellow-400" />,
        }
      : null,
    tier.hasCrown
      ? {
          title: "Imperial Royal Crown",
          desc: "Sovereign crown crest atop your emblem",
          icon: <Crown className="w-4 h-4 text-rose-400" />,
        }
      : null,
    {
      title: "Lounge Seat Aura",
      desc: `Dynamic ${tier.name.toLowerCase()} glowing presence in all game rooms`,
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
    },
  ].filter(Boolean) as Array<{ title: string; desc: string; icon: React.ReactNode }>;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ascension-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Backdrop with animated vignette */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-lg"
            style={{
              background: `radial-gradient(circle at center, ${tier.themeColor}33 0%, rgba(5,5,8,0.95) 75%)`,
            }}
          />

          {/* Cinematic Shockwave Ripple */}
          {!reduceMotion && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute w-96 h-96 rounded-full border-4 pointer-events-none"
              style={{ borderColor: tier.themeColor }}
            />
          )}

          {/* Modal Container with Screen Shake Impact */}
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 40 }}
            animate={
              reduceMotion
                ? { opacity: 1, scale: 1, y: 0, x: 0 }
                : {
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    x: [0, -4, 4, -2, 2, 0],
                  }
            }
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.85, opacity: 0, y: 20 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : {
                    type: "spring",
                    stiffness: 300,
                    damping: 22,
                  }
            }
            className="relative w-full max-w-lg mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-amber-500/40 text-white shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden text-center z-10"
          >
            {/* Top Ornamental Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400 font-mono">
                TIER PROMOTION ASCENSION
              </span>
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>

            {/* Main Headline */}
            <h2
              id="ascension-title"
              className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-display mb-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
              style={{
                color: tier.themeColor,
                textShadow: `0 0 20px ${tier.themeColor}88`,
              }}
            >
              {tier.name} TIER!
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 font-mono mb-6">
              You have ascended to <span className="font-bold text-white">{title}</span> (Level {safeLevel})
            </p>

            {/* Centerpiece 3D Holo Emblem */}
            <div className="flex justify-center my-6 relative">
              <MiniclipHoloTilt tier={tier} maxTiltDeg={20} enableAura={true}>
                <MiniclipLevelBadge
                  level={safeLevel}
                  size="xl"
                  enableHoloTilt={false}
                  showTooltip={false}
                  showTitle={true}
                />
              </MiniclipHoloTilt>
            </div>

            {/* Unlocked Tier Privileges */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400/90 font-mono flex items-center justify-between">
                <span>NEW PRESTIGE UNLOCKED</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="space-y-2">
                {perks.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      {p.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{p.title}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Claim & Continue Action Button */}
            <motion.button
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-base shadow-[0_4px_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
            >
              <span>ACCEPT PROMOTION</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TierAscensionCeremony;
