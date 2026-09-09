import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles, Trophy, Shield, Gift, Check } from "lucide-react";
import { type DailyStreakClaimResult } from "@shared/streak-types";
import { HapticsManager } from "../../services/HapticsManager";
import { AudioManager } from "../../services/AudioManager";
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
  "#f59e0b", // Amber
  "#f97316", // Orange
  "#ef4444", // Rose
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#fbbf24", // Gold
];

export function StreakClaimCelebration({ result, onClose }: StreakClaimCelebrationProps) {
  const [stage, setStage] = useState<"opening" | "revealed">("opening");

  // Audio and Haptics on mount
  useEffect(() => {
    HapticsManager.trigger("reward");
    AudioManager.play("coins");

    const timer = setTimeout(() => {
      setStage("revealed");
    }, 600);

    return () => clearTimeout(timer);
  }, []);

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

  // Generate 45 celebratory confetti particles
  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: 45 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.7) * 450 - 50,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      shape: i % 3 === 0 ? "strip" : i % 2 === 0 ? "circle" : "square",
    }));
  }, []);

  const isMilestone = Boolean(result.reward?.milestoneChest);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        {/* Confetti Explosion Layer */}
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
                duration: 1.8,
                ease: [0.22, 1, 0.36, 1],
                delay: Math.random() * 0.15,
              }}
              style={{
                width: p.shape === "strip" ? p.size * 2 : p.size,
                height: p.shape === "strip" ? p.size * 0.5 : p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "9999px" : "2px",
              }}
              className="absolute"
            />
          ))}
        </div>

        {/* Modal Card */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Streak Reward Claimed"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={bhalyamSpring}
          className="relative z-10 w-full max-w-sm rounded-3xl p-6 sm:p-8 text-center
                     bg-[var(--chrome-panel)] border border-[var(--chrome-border)]
                     shadow-2xl overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          {/* Chest / Trophy Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.2, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto w-24 h-24 rounded-2xl flex items-center justify-center mb-4
                       bg-gradient-to-tr from-amber-500/20 via-orange-500/25 to-yellow-400/30
                       border border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
          >
            {result.cycleCompleted ? (
              <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
            ) : isMilestone ? (
              <Gift className="w-12 h-12 text-amber-400 animate-pulse" />
            ) : (
              <Coins className="w-12 h-12 text-amber-500 animate-pulse" />
            )}
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Day {result.claimedDay} Claimed!
            </span>
            <h2 className="text-2xl font-black text-[var(--chrome-ink)] tracking-tight">
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
            transition={{ delay: 0.35 }}
            className="my-4 p-4 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)]"
          >
            <div className="flex items-center justify-center gap-2 text-3xl font-black text-amber-500">
              <Coins className="w-8 h-8 text-amber-500" />
              <span>+</span>
              <CountUp end={result.coinsAwarded} duration={1.2} />
            </div>
            <p className="text-xs text-[var(--chrome-ink-soft)] mt-1 font-medium">
              Coins added directly to your BHALYAM wallet
            </p>
          </motion.div>

          {/* Special Milestone Rewards */}
          {result.reward?.specialRewardTitle && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-5 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-orange-500/10 border border-purple-500/25 flex items-center justify-center gap-2"
            >
              {result.reward.specialRewardType === "shield" ? (
                <Shield className="w-5 h-5 text-sky-400" />
              ) : (
                <Trophy className="w-5 h-5 text-amber-400" />
              )}
              <div className="text-left">
                <span className="block text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Special Reward
                </span>
                <span className="text-sm font-black text-[var(--chrome-ink)]">
                  {result.reward.specialRewardTitle}
                </span>
              </div>
            </motion.div>
          )}

          {/* Dismiss Button */}
          <motion.button
            type="button"
            autoFocus
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full min-h-[48px] py-3 px-6 rounded-xl font-black text-base
                       bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white
                       shadow-lg shadow-amber-500/25 cursor-pointer flex items-center justify-center gap-2
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Check className="w-5 h-5" />
            Awesome!
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default StreakClaimCelebration;
