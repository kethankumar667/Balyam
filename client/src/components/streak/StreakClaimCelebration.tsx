import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Trophy,
  Shield,
  Gift,
  Check,
  Crown,
  ArrowRight,
  Flame,
} from "lucide-react";
import { type DailyStreakClaimResult, STREAK_REWARDS_SCHEDULE } from "@shared/streak-types";
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
  "#6ee7b7", // Mint emerald
  "#93c5fd", // Sky blue
  "#c084fc", // Purple
];

export function StreakClaimCelebration({ result, onClose }: StreakClaimCelebrationProps) {
  // 3-Stage Reveal: "rumble" -> "burst" -> "revealed"
  const [stage, setStage] = useState<"rumble" | "burst" | "revealed">("rumble");

  const isMilestone = Boolean(result.reward?.milestoneChest);
  const isGrandCycle = Boolean(result.cycleCompleted);

  // Compute tomorrow's teaser reward
  const nextDayNum = (result.claimedDay % 30) + 1;
  const nextReward =
    STREAK_REWARDS_SCHEDULE.find((r) => r.day === nextDayNum) ?? STREAK_REWARDS_SCHEDULE[0];
  const isTomorrowMilestone = Boolean(nextReward.milestoneChest);

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

  // Generate 60 celebratory confetti particles
  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 460,
      y: (Math.random() - 0.7) * 500 - 80,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      shape: i % 3 === 0 ? "strip" : i % 2 === 0 ? "circle" : "square",
    }));
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl select-none">
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
                  scale: [0, 1.25, 0.85],
                  opacity: [1, 1, 0],
                  rotate: p.rotation + 360,
                }}
                transition={{
                  duration: 2.2,
                  ease: [0.22, 1, 0.36, 1],
                  delay: Math.random() * 0.12,
                }}
                style={{
                  width: p.shape === "strip" ? p.size * 2.4 : p.size,
                  height: p.shape === "strip" ? p.size * 0.5 : p.size,
                  backgroundColor: p.color,
                  borderRadius: p.shape === "circle" ? "9999px" : "2px",
                }}
                className="absolute"
              />
            ))}
          </div>
        )}

        {/* Modal Card — dopamine-engineered reward presentation */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Streak Reward Claimed"
          initial={{ scale: 0.85, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={bhalyamSpring}
          className="relative z-10 w-full max-w-sm rounded-3xl p-6 sm:p-7 text-center
                     bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600
                     border-2 border-white/40
                     shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]
                     overflow-hidden"
        >
          {/* Ambient Radiant Glow */}
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

          <div aria-hidden="true" className="absolute inset-x-6 top-4 h-px bg-gradient-to-r from-transparent via-amber-100/40 to-transparent" />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(135deg,rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:18px_18px]" />

          {/* Rotating Sunburst Rays */}
          {stage !== "rumble" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.4, scale: 1, rotate: 360 }}
              transition={{
                opacity: { duration: 0.4 },
                scale: { duration: 0.6 },
                rotate: { duration: 25, repeat: Infinity, ease: "linear" },
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none -z-10"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg 20deg, rgba(251,191,36,0.20) 20deg 40deg, transparent 40deg 60deg, rgba(251,191,36,0.20) 60deg 80deg, transparent 80deg 100deg, rgba(251,191,36,0.20) 100deg 120deg, transparent 120deg 140deg, rgba(251,191,36,0.20) 140deg 160deg, transparent 160deg 180deg, rgba(251,191,36,0.20) 180deg 200deg, transparent 200deg 220deg, rgba(251,191,36,0.20) 220deg 240deg, transparent 240deg 260deg, rgba(251,191,36,0.20) 260deg 280deg, transparent 280deg 300deg, rgba(251,191,36,0.20) 300deg 320deg, transparent 320deg 340deg, rgba(251,191,36,0.20) 340deg 360deg)",
              }}
            />
          )}

          {/* Animated Chest / Trophy Icon with Spring Bounce */}
          <motion.div
            animate={
              stage === "rumble"
                ? {
                    x: [-2, 2, -2, 2, 0],
                    rotate: [-3, 3, -3, 3, 0],
                    scale: [0.95, 1.05, 0.98, 1.02],
                  }
                : {
                    scale: [1, 1.18, 1],
                    rotate: [0, 8, 0],
                  }
            }
            transition={{
              duration: stage === "rumble" ? 0.35 : 0.6,
              ease: "easeOut",
            }}
            className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-3
                       bg-white/30 border-2 border-white/60 shadow-inner backdrop-blur-sm"
          >
            {isGrandCycle || result.claimedDay === 30 ? (
              <Crown className="w-10 h-10 text-black animate-bounce" />
            ) : isMilestone ? (
              <Gift className="w-10 h-10 text-black animate-pulse" />
            ) : (
              <Coins className="w-10 h-10 text-black animate-pulse" />
            )}
          </motion.div>

          {/* Day Complete Badge + Headline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-[0.16em] uppercase bg-emerald-400/[0.14] text-emerald-200 border border-emerald-300/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] mb-2">
              <Flame className="w-3.5 h-3.5" />
              Day {result.claimedDay} Complete!
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
              {result.cycleCompleted
                ? "Grand Cycle Completed!"
                : isMilestone
                  ? `${result.reward?.milestoneChest?.toUpperCase()} CHEST UNLOCKED`
                  : "Daily Streak Maintained!"}
            </h2>
          </motion.div>

          {/* DOMINANT REWARD BOX: +COINS CLAIMED */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="my-4 p-4 rounded-[24px] bg-black/[0.34] border border-amber-200/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_18px_44px_-32px_rgba(245,158,11,0.9)] relative overflow-hidden"
          >
            {/* Shimmer line */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/85">
              Reward Awarded
            </div>
            <div className="flex items-center justify-center gap-2 text-4xl sm:text-5xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_8px_24px_rgba(245,158,11,0.35)] my-1">
              <Coins className="w-9 h-9 text-amber-300 animate-pulse shrink-0" />
              <span>+</span>
              <CountUp end={result.coinsAwarded} duration={1.2} />
            </div>
            <p className="text-xs font-black tracking-wider uppercase text-white/90">
              Coins Claimed
            </p>
          </motion.div>

          {/* Special Milestone Rewards */}
          {result.reward?.specialRewardTitle && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="mb-3 p-3 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              {result.reward.specialRewardType === "shield" ? (
                <Shield className="w-5 h-5 text-white fill-white/20 shrink-0" />
              ) : (
                <Trophy className="w-5 h-5 text-white shrink-0" />
              )}
              <div className="text-left leading-tight">
                <span className="block text-[10px] font-bold text-white/80 uppercase tracking-wider">
                  Milestone Loot Unlocked
                </span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {result.reward.specialRewardTitle}
                </span>
              </div>
            </motion.div>
          )}

          {/* TOMORROW'S REWARD TEASER HOOK */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-4 p-3 rounded-2xl bg-black/[0.32] border border-white/10 text-left flex items-center justify-between gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-300/10 border border-amber-200/20 flex items-center justify-center shrink-0">
                {isTomorrowMilestone ? (
                  <Gift className="w-4 h-4 text-amber-200 animate-pulse" />
                ) : (
                  <Flame className="w-4 h-4 text-orange-200" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                  Next Reward Tomorrow
                </div>
                <div className="text-xs font-black text-white truncate">
                  Day {nextDayNum}:{" "}
                  <span className="text-amber-200 font-mono">
                    +{nextReward.coins.toLocaleString()} Coins
                  </span>
                  {isTomorrowMilestone && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/[0.30] text-amber-200 border border-amber-300/40">
                      {nextReward.milestoneChest?.toUpperCase()} CHEST
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/60 shrink-0" />
          </motion.div>

          {/* Dismiss CTA Button */}
          <motion.button
            type="button"
            autoFocus
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="group relative w-full min-h-[48px] py-3 px-6 rounded-2xl font-black text-base
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
