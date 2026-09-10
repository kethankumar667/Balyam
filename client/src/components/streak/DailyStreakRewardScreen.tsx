import { useEffect, useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  X,
  Flame,
  Gift,
  ArrowRight,
  Check,
  Clock,
  Shield,
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { STREAK_REWARDS_SCHEDULE } from "@shared/streak-types";
import { StreakHeroArtwork } from "./StreakHeroArtwork";

interface DailyStreakRewardScreenProps {
  onClose: () => void;
  onOpenJourney: () => void;
}

export function DailyStreakRewardScreen({ onClose, onOpenJourney }: DailyStreakRewardScreenProps) {
  const { state, isClaiming, claimToday } = useStreakStore();

  const reduce = useReducedMotion();
  const currentDay = state?.activeDayInCycle ?? 1;
  const isClaimable = Boolean(state?.isClaimableToday);
  const currentStreak = state?.currentStreak ?? 0;
  const longestStreak = state?.longestStreak ?? 0;
  const shieldsRemaining = state?.shieldsRemaining ?? 0;

  // Active today reward item
  const todayReward = useMemo(() => {
    return (
      state?.schedule?.find((s) => s.day === currentDay) ??
      STREAK_REWARDS_SCHEDULE.find((s) => s.day === currentDay) ??
      STREAK_REWARDS_SCHEDULE[0]
    );
  }, [state?.schedule, currentDay]);

  // Tomorrow reward preview
  const nextDayNum = (currentDay % 30) + 1;
  const nextReward = useMemo(() => {
    return (
      STREAK_REWARDS_SCHEDULE.find((s) => s.day === nextDayNum) ??
      STREAK_REWARDS_SCHEDULE[0]
    );
  }, [nextDayNum]);

  // Nearest upcoming chest calculation
  const { nextChestName, daysToNextChest } = useMemo(() => {
    const chestDays = [7, 14, 21, 30];
    const upcoming = chestDays.find((d) => d >= currentDay && (d > currentDay || !isClaimable));
    const targetDay = upcoming ?? 7;
    const diff = targetDay >= currentDay ? targetDay - currentDay : 30 - currentDay + targetDay;
    const nameMap: Record<number, string> = {
      7: "Bronze Chest",
      14: "Silver Chest",
      21: "Gold Chest",
      30: "Diamond Crown",
    };
    return {
      nextChestName: nameMap[targetDay] ?? "Milestone Chest",
      daysToNextChest: diff === 0 ? 1 : diff,
    };
  }, [currentDay, isClaimable]);

  // Live countdown to next UTC reset (00:00:00 UTC)
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const target = state?.nextResetAt ?? Date.now() + 86400000;
      const diff = Math.max(0, target - now);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [state?.nextResetAt]);

  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!isClaimable || isClaiming) return;
    setClaimError(null);
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COIN);
    const result = await claimToday();
    if (!result || !result.success) {
      setClaimError(result?.message || "Failed to claim reward. Please try again.");
    }
  };

  const isMilestone = Boolean(todayReward.milestoneChest);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Login Streak Reward"
      initial={{ scale: 0.92, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 15 }}
      transition={bhalyamSpring}
      className="relative z-10 w-full max-w-sm sm:max-w-md mx-4 rounded-3xl p-5 sm:p-6 text-center
                 bg-gradient-to-b from-slate-900/95 via-zinc-900/95 to-slate-950/98
                 border-2 border-amber-500/30
                 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)]
                 backdrop-blur-2xl overflow-hidden select-none"
    >
      {/* Top Ambient Glow */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-amber-500/25 via-orange-500/15 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300">
            <Flame className={`w-4 h-4 text-orange-400 fill-orange-400 ${reduce ? "" : "animate-pulse"}`} />
            <span className="text-xs font-black tracking-wider uppercase">
              {currentStreak > 0 ? `${currentStreak}-Day Streak` : "Login Streak"}
            </span>
          </div>

          {/* Streak shield — makes the loss-protection mechanic visible so
              missing a day feels safe instead of prompting an outright quit
              the first time a streak would otherwise reset to zero. */}
          {shieldsRemaining > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300">
              <Shield className="w-3.5 h-3.5 fill-sky-400/20" />
              <span className="text-xs font-black">{shieldsRemaining}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            AudioManager.play(AUDIO.UI_POPUP_CLOSE);
            onClose();
          }}
          aria-label="Close"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-colors
                     flex items-center justify-center text-slate-300 hover:text-white cursor-pointer
                     focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Central Hero Artwork (Emotional Focal Point) */}
      <div className="my-2 flex justify-center items-center">
        <StreakHeroArtwork
          type={isMilestone && todayReward.milestoneChest ? todayReward.milestoneChest : "coins"}
          size={110}
        />
      </div>

      {/* Dominant Coins Display */}
      <div className="my-1">
        <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-300 drop-shadow-[0_2px_14px_rgba(251,191,36,0.45)]">
          +{todayReward.coins.toLocaleString()}
          <span className="text-xl sm:text-2xl ml-1 font-bold text-amber-200">COINS</span>
        </div>
      </div>

      {/* Day Status Pill */}
      <div className="my-2 flex justify-center">
        {isClaimable ? (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-black uppercase tracking-wider shadow-sm">
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            Day {currentDay} Ready to Claim
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-sm">
            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
            Day {currentDay} Complete!
          </div>
        )}
      </div>

      {/* Sleek Cycle Progress Line */}
      <div className="my-3 px-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
          <span>Day {currentDay} of 30</span>
          <span className="text-amber-400 font-mono">
            {Math.round((currentDay / 30) * 100)}%
          </span>
        </div>
        <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (currentDay / 30) * 100)}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
          />
        </div>
      </div>

      {/* Personal-best streak — self-competition ("beat your own record")
          is a proven low-cost motivator that had no home anywhere in this
          screen. */}
      {longestStreak > 0 && (
        <div className="mb-1 text-center text-[11px] font-bold text-slate-400">
          🏆 Longest streak: <span className="text-amber-300 font-black">{longestStreak} days</span>
        </div>
      )}

      {/* Tomorrow & Next Chest Preview Card */}
      <div className="my-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-2 gap-2 text-left">
        {/* Left: Tomorrow Teaser */}
        <div className="p-2 rounded-xl bg-black/20 border border-white/5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Tomorrow
          </div>
          <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
            +{nextReward.coins.toLocaleString()} Coins
          </div>
        </div>

        {/* Right: Next Chest Hook or Timer */}
        <div className="p-2 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Next Chest</span>
            <Gift className="w-3 h-3 text-orange-400" />
          </div>
          <div className="text-xs sm:text-sm font-black text-white mt-0.5">
            {daysToNextChest === 1 ? "Tomorrow!" : `in ${daysToNextChest} Days`}
          </div>
        </div>
      </div>

      {/* Reset countdown — always visible now, not just post-claim. This is
          the single strongest same-day-return signal in any daily-reward
          system; hiding it until after the player has already claimed
          meant it never actually created urgency for the decision that
          mattered (claim today or not). */}
      {timeLeft && (
        <div className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{isClaimable ? "Claim before today resets in:" : "Next reward unlocks in:"}</span>
          <span className="text-amber-300 font-mono tracking-wider font-extrabold">{timeLeft}</span>
        </div>
      )}

      {/* Primary Action Button (CLAIM or CONTINUE) */}
      <div className="mt-2">
        {claimError && (
          <div
            role="alert"
            className="mb-2.5 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center"
          >
            {claimError}
          </div>
        )}
        {isClaimable ? (
          <motion.button
            type="button"
            whileHover={isClaiming ? {} : { scale: 1.02 }}
            whileTap={isClaiming ? {} : { scale: 0.98 }}
            onClick={handleClaim}
            disabled={isClaiming}
            aria-busy={isClaiming}
            className={`group relative w-full min-h-[50px] py-3 px-6 rounded-2xl font-black text-base
                       bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400
                       hover:from-amber-300 hover:to-orange-400
                       text-slate-950 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.5)]
                       flex items-center justify-center gap-2 overflow-hidden
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300
                       ${isClaiming ? "opacity-75 cursor-wait" : "cursor-pointer"}`}
          >
            {/* Shimmer sweep effect */}
            {!isClaiming && (
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
            )}
            {isClaiming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>CLAIMING...</span>
              </span>
            ) : (
              <>
                <Flame className="w-5 h-5 fill-slate-950/20" />
                <span>CLAIM +{todayReward.coins.toLocaleString()} COINS</span>
              </>
            )}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              AudioManager.play(AUDIO.UI_POPUP_CLOSE);
              onClose();
            }}
            className="w-full min-h-[50px] py-3 px-6 rounded-2xl font-black text-base
                       bg-white hover:bg-slate-100 text-slate-900
                       shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4)]
                       cursor-pointer flex items-center justify-center gap-2
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          >
            <Check className="w-5 h-5 stroke-[3] text-emerald-600" />
            <span>CONTINUE</span>
          </motion.button>
        )}
      </div>

      {/* Secondary Link: View Full Rewards / Calendar */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => {
            AudioManager.play(AUDIO.UI_CLICK);
            onOpenJourney();
          }}
          className="inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold text-slate-400 hover:text-amber-300 transition-colors cursor-pointer min-h-[44px] group"
        >
          <span>View 30-Day Rewards</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

export default DailyStreakRewardScreen;