import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles, Trophy, Shield, Gift, Check, Crown } from "lucide-react";
import { type DailyStreakClaimResult } from "@shared/streak-types";
import { HapticsManager } from "../../services/HapticsManager";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { bhalyamSpring } from "../../lib/motion";
import CountUp from "../CountUp";

interface StreakClaimCelebrationProps {
  result: DailyStreakClaimResult;
  onClose: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  shape: "circle" | "square" | "strip";
}

const CONFETTI_COLORS = [
  "#ffffff",
  "#fef3c7", // Light amber
  "#fed7aa", // Light orange
  "#fecdd3", // Light rose
  "#fde68a", // Gold
];

export function StreakClaimCelebration({ result, onClose }: StreakClaimCelebrationProps) {
  // 3-Stage Reveal: "rumble" -> "burst" -> "revealed"
  const [stage, setStage] = useState<"rumble" | "burst" | "revealed">("rumble");

  const isMilestone = Boolean(result.reward?.milestoneChest);
  const isGrandCycle = Boolean(result.cycleCompleted);

  // 3-stage timed sequence with coordinated audio and haptics
  useEffect(() => {
    // Stage 1: Rumbling bounce + subtle haptic tick
    HapticsManager.trigger("subtle");

    const burstTimer = setTimeout(() => {
      // Stage 2: Light ray burst + audio fanfare
      setStage("burst");
      if (isMilestone || isGrandCycle) {
        AudioManager.play(AUDIO.REWARD_ACHIEVEMENT);
      } else {
        AudioManager.play(AUDIO.REWARD_COIN);
      }
      HapticsManager.trigger("reward");
    }, 320);

    const revealTimer = setTimeout(() => {
      // Stage 3: Fully revealed + particle explosion
      setStage("revealed");
    }, 650);

    return () => {
      clearTimeout(burstTimer);
      clearTimeout(revealTimer);
    };
  }, [isMilestone, isGrandCycle]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Generate 55 celebratory confetti particles
  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 440,
      y: (Math.random() - 0.7) * 480 - 60,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      shape: i % 3 === 0 ? "strip" : i % 2 === 0 ? "circle" : "square",
    }));
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
        {/* Confetti Explosion Layer (Active in revealed stage) */}
        {stage === "revealed" && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: [0, 1.2, 0.8],
                  opacity: [1, 1, 0],
                  rotate: p.rotation + 360,
                }}
                transition={{
                  duration: 2.0,
                  ease: [0.22, 1, 0.36, 1],
                  delay: Math.random() * 0.12,
                }}
                style={{
                  width: p.shape === "strip" ? p.size * 2.2 : p.size,
                  height: p.shape === "strip" ? p.size * 0.5 : p.size,
                  backgroundColor: p.color,
                  borderRadius: p.shape === "circle" ? "9999px" : "2px",
                }}
                className="absolute"
              />
            ))}
          </div>
        )}

        {/* Modal Card — bold solid gradient, matching the streak hero band.
            This is the reward "big moment": it needs to read instantly and
            stay legible through the entry animation, so every surface here
            is a solid fill, not a translucent panel over a blurred backdrop. */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Streak Reward Claimed"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={bhalyamSpring}
          className="relative z-10 w-full max-w-sm rounded-3xl p-6 sm:p-8 text-center
                     bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500
                     border-2 border-white/40
                     shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]
                     overflow-hidden"
        >
          {/* Ambient Radiant Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />

          {/* Rotating Sunburst Rays (visible during burst and revealed stages) */}
          {stage !== "rumble" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.35, scale: 1, rotate: 360 }}
              transition={{
                opacity: { duration: 0.4 },
                scale: { duration: 0.6 },
                rotate: { duration: 25, repeat: Infinity, ease: "linear" },
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none -z-10"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg 20deg, rgba(255,255,255,0.25) 20deg 40deg, transparent 40deg 60deg, rgba(255,255,255,0.25) 60deg 80deg, transparent 80deg 100deg, rgba(255,255,255,0.25) 100deg 120deg, transparent 120deg 140deg, rgba(255,255,255,0.25) 140deg 160deg, transparent 160deg 180deg, rgba(255,255,255,0.25) 180deg 200deg, transparent 200deg 220deg, rgba(255,255,255,0.25) 220deg 240deg, transparent 240deg 260deg, rgba(255,255,255,0.25) 260deg 280deg, transparent 280deg 300deg, rgba(255,255,255,0.25) 300deg 320deg, transparent 320deg 340deg, rgba(255,255,255,0.25) 340deg 360deg)",
              }}
            />
          )}

          {/* Animated Chest / Trophy Icon with 3-Stage Spring Physics */}
          <motion.div
            animate={
              stage === "rumble"
                ? {
                    x: [-2, 2, -2, 2, 0],
                    rotate: [-3, 3, -3, 3, 0],
                    scale: [0.95, 1.05, 0.98, 1.02],
                  }
                : {
                    scale: [1, 1.15, 1],
                    rotate: [0, 8, 0],
                  }
            }
            transition={{
              duration: stage === "rumble" ? 0.35 : 0.6,
              ease: "easeOut",
            }}
            className="mx-auto w-24 h-24 rounded-2xl flex items-center justify-center mb-4
                       bg-white/25 border-2 border-white/50 shadow-inner"
          >
            {isGrandCycle || result.claimedDay === 30 ? (
              <Crown className="w-12 h-12 text-white animate-bounce" />
            ) : isMilestone ? (
              <Gift className="w-12 h-12 text-white animate-pulse" />
            ) : (
              <Coins className="w-12 h-12 text-white animate-pulse" />
            )}
          </motion.div>

          {/* Header Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-white/25 text-white border border-white/50 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Day {result.claimedDay} Claimed!
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
              {result.cycleCompleted
                ? "Grand Cycle Completed!"
                : isMilestone
                  ? `${result.reward?.milestoneChest?.toUpperCase()} CHEST UNLOCKED`
                  : "Streak Reward Granted"}
            </h2>
          </motion.div>

          {/* Coins Count-up */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="my-4 p-4 rounded-2xl bg-black/20 border border-white/25"
          >
            <div className="flex items-center justify-center gap-2 text-3xl font-black text-white font-mono">
              <Coins className="w-8 h-8 text-white animate-pulse" />
              <span>+</span>
              <CountUp end={result.coinsAwarded} duration={1.2} />
            </div>
            <p className="text-xs text-white/85 mt-1 font-medium">
              Coins credited directly to your BHALYAM balance
            </p>
          </motion.div>

          {/* Special Milestone Rewards */}
          {result.reward?.specialRewardTitle && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mb-5 p-3 rounded-2xl bg-black/20 border border-white/25 flex items-center justify-center gap-2.5"
            >
              {result.reward.specialRewardType === "shield" ? (
                <Shield className="w-5 h-5 text-white fill-white/20" />
              ) : (
                <Trophy className="w-5 h-5 text-white" />
              )}
              <div className="text-left">
                <span className="block text-[10px] font-bold text-white/75 uppercase tracking-wider">
                  Special Reward Unlocked
                </span>
                <span className="text-sm font-black text-white">
                  {result.reward.specialRewardTitle}
                </span>
              </div>
            </motion.div>
          )}

          {/* Dismiss CTA Button */}
          <motion.button
            type="button"
            autoFocus
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="group relative w-full min-h-[50px] py-3.5 px-6 rounded-2xl font-black text-base
                       bg-white text-orange-600
                       shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] cursor-pointer flex items-center justify-center gap-2
                       overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            Awesome!
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default StreakClaimCelebration;
