import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Crown, Flame, Gift, Shield, X } from "lucide-react";
import { STREAK_REWARDS_SCHEDULE, type StreakMilestoneChest } from "@shared/streak-types";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { PremiumRewardChest } from "./PremiumRewardChest";
import { StreakHeroArtwork } from "./StreakHeroArtwork";

interface DailyStreakRewardScreenProps {
  onClose: () => void;
  onOpenJourney: () => void;
}

const MILESTONES: ReadonlyArray<{ day: number; name: string; chest: StreakMilestoneChest }> = [
  { day: 7, name: "Bronze Chest", chest: "bronze" },
  { day: 14, name: "Silver Chest", chest: "silver" },
  { day: 21, name: "Gold Chest", chest: "gold" },
  { day: 30, name: "Ultimate Vault", chest: "diamond" },
];

export function DailyStreakRewardScreen({ onClose, onOpenJourney }: DailyStreakRewardScreenProps) {
  const { state, isClaiming, claimToday } = useStreakStore();
  const reduceMotion = useReducedMotion();
  const currentDay = state?.activeDayInCycle ?? 1;
  const isClaimable = Boolean(state?.isClaimableToday);
  const displayStreak = Math.max(1, state?.currentStreak ?? 0);
  const longestStreak = Math.max(displayStreak, state?.longestStreak ?? 0);
  const shieldsRemaining = state?.shieldsRemaining ?? 0;

  const todayReward = useMemo(
    () => state?.schedule?.find((reward) => reward.day === currentDay)
      ?? STREAK_REWARDS_SCHEDULE.find((reward) => reward.day === currentDay)
      ?? STREAK_REWARDS_SCHEDULE[0],
    [currentDay, state?.schedule],
  );

  const nextDay = (currentDay % 30) + 1;
  const nextReward = STREAK_REWARDS_SCHEDULE.find((reward) => reward.day === nextDay)
    ?? STREAK_REWARDS_SCHEDULE[0];
  const nextMilestone = useMemo(() => {
    const upcoming = MILESTONES.find((milestone) => milestone.day > currentDay);
    if (upcoming) return { ...upcoming, daysAway: upcoming.day - currentDay };
    return { ...MILESTONES[0], daysAway: 30 - currentDay + MILESTONES[0].day };
  }, [currentDay]);

  const [timeLeft, setTimeLeft] = useState("24:00:00");
  useEffect(() => {
    const updateCountdown = () => {
      const target = state?.nextResetAt ?? Date.now() + 86_400_000;
      const remaining = Math.max(0, target - Date.now());
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1_000);
      setTimeLeft([hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":"));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(timer);
  }, [state?.nextResetAt]);

  const [claimError, setClaimError] = useState<string | null>(null);
  const handleClaim = async () => {
    if (!isClaimable || isClaiming) return;
    setClaimError(null);
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COIN);
    const result = await claimToday();
    if (!result?.success) setClaimError(result?.message || "Failed to claim reward. Please try again.");
  };

  const progress = Math.min(100, Math.round((currentDay / 30) * 100));

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Login Streak Reward"
      initial={{ scale: 0.94, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.96, opacity: 0, y: 12 }}
      transition={bhalyamSpring}
      className="streak-claim-modal relative z-10 mx-2 flex max-h-[min(94vh,600px)] w-full max-w-[460px] select-none flex-col overflow-hidden rounded-[24px] border"
    >
      <div className="pointer-events-none absolute inset-px rounded-[23px] border border-white/10" />
      <div className="streak-claim-scroll relative flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
        {/* Header */}
        <header className="flex items-center justify-between gap-2">
          <div className="streak-claim-streak flex min-h-[36px] items-center gap-1.5 rounded-full border px-3">
            <Flame className={`h-4 w-4 shrink-0 fill-orange-400 text-orange-500 ${reduceMotion ? "" : "animate-pulse"}`} />
            <span className="truncate font-display text-sm font-black">{displayStreak} Day Streak</span>
          </div>
          <p className="hidden flex-1 -rotate-1 text-center font-script text-sm leading-tight text-[var(--claim-muted)] xs:block">
            Keep playing to unlock bigger rewards!
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="streak-claim-close flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Hero Artwork Box */}
        <section className="streak-claim-hero relative flex h-[115px] sm:h-[125px] items-center justify-center overflow-hidden rounded-[18px] border">
          <div className="streak-claim-rays pointer-events-none absolute inset-0" />
          <div className="streak-claim-stage pointer-events-none absolute bottom-2 left-1/2 h-8 w-48 -translate-x-1/2 rounded-[50%] blur-sm" />
          <div className="relative z-10 flex items-center justify-center">
            <StreakHeroArtwork
              type={todayReward.milestoneChest ? todayReward.milestoneChest : "coins"}
              size={100}
            />
          </div>
          <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2 -rotate-6 whitespace-pre-line text-center font-script text-base leading-4 text-[#b9cdf0] sm:text-lg">
            {isClaimable ? (todayReward.milestoneChest ? "Chest\nunlocked!" : "Your reward\nawaits!") : "Great\nstart!"}
            <span className="mt-1 block text-xl text-amber-300">☺</span>
          </div>
        </section>

        {/* Grant Amount & Status */}
        <div className="text-center">
          <div className="streak-claim-amount font-display text-3xl sm:text-4xl font-black leading-none tracking-tight">
            +{todayReward.coins.toLocaleString()}<span className="ml-1.5 text-lg sm:text-xl">coins</span>
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            <div className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3 text-xs font-black ${isClaimable ? "streak-claim-ready" : "streak-claim-complete"}`}>
              {isClaimable ? <Flame className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 stroke-[3]" />}
              Day {currentDay} {isClaimable ? "Ready to Claim" : "Complete!"}
            </div>
            {shieldsRemaining > 0 && (
              <span className="inline-flex min-h-[28px] items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 text-[11px] font-black text-sky-800" title="Streak shields remaining">
                <Shield className="h-3 w-3 text-sky-600" /> {shieldsRemaining}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-bold text-[var(--claim-muted)]">
            {isClaimable ? (todayReward.specialRewardTitle ? `Claim today to receive ${todayReward.specialRewardTitle}!` : "Claim today to keep your expedition moving.") : "Come back tomorrow for more rewards!"}
          </p>
        </div>

        {/* 30-Day Expedition Progress Bar */}
        <section className="streak-claim-panel rounded-[16px] border p-2.5">
          <div className="flex items-center justify-between text-xs font-black">
            <div className="flex items-center gap-2">
              <span className="font-display">Day {currentDay} of 30</span>
              <span className="text-[10px] text-[var(--claim-muted)] font-bold">
                (Best: {longestStreak}d)
              </span>
            </div>
            <span className="text-amber-500 font-display">{progress}%</span>
          </div>
          <div className="streak-claim-track mt-1.5 h-2 overflow-hidden rounded-full border p-[1px]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={reduceMotion ? { duration: 0 } : { duration: 0.85, ease: "easeOut" }} className="streak-claim-progress h-full min-w-2 rounded-full" />
          </div>
        </section>

        {/* Tomorrow & Next Chest Teasers */}
        <div className="grid grid-cols-2 gap-2">
          <article className="streak-claim-preview streak-claim-preview-tomorrow flex items-center gap-2 rounded-[14px] border p-2">
            <div className="h-10 w-10 shrink-0 flex items-center justify-center">
              {nextReward.milestoneChest ? (
                <PremiumRewardChest type={nextReward.milestoneChest} size={36} scale={1.35} />
              ) : (
                <StreakHeroArtwork type="coins" size={38} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-500 leading-none">Tomorrow</div>
              <div className="mt-0.5 font-mono text-xs font-black text-amber-500 leading-tight">+{nextReward.coins.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-[var(--claim-muted)] truncate">Day {nextDay}</div>
            </div>
          </article>
          <article className="streak-claim-preview streak-claim-preview-chest flex items-center gap-2 rounded-[14px] border p-2">
            <div className="h-10 w-10 shrink-0 flex items-center justify-center">
              <PremiumRewardChest type={nextMilestone.chest} size={42} scale={1.38} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-indigo-500 leading-none">
                <span>Next chest</span>
              </div>
              <div className="mt-0.5 font-display text-xs font-black leading-tight">in {nextMilestone.daysAway}d</div>
              <div className="text-[10px] font-bold text-[var(--claim-muted)] truncate">{nextMilestone.name}</div>
            </div>
          </article>
        </div>

        {/* Claim Error */}
        {claimError && <div role="alert" className="rounded-lg border border-rose-500/35 bg-rose-500/10 p-2 text-center text-xs font-bold text-rose-500">{claimError}</div>}

        {/* Primary Action Button */}
        <motion.button
          type="button"
          whileHover={isClaiming ? undefined : { scale: 1.01 }}
          whileTap={isClaiming ? undefined : { scale: 0.985 }}
          onClick={isClaimable ? handleClaim : onClose}
          disabled={isClaiming}
          aria-busy={isClaiming}
          className="streak-claim-primary group relative flex min-h-[44px] sm:min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 font-display text-base font-black"
        >
          {isClaiming ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />CLAIMING...</>
          ) : (
            <>
              {isClaimable ? <Gift className="h-4 w-4" /> : <Check className="h-4 w-4 stroke-[3]" />}
              <span>{isClaimable ? `CLAIM +${todayReward.coins.toLocaleString()} COINS` : "CONTINUE"}</span>
              <ChevronRight className="absolute right-4 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </motion.button>

        {/* Compact Footer Line */}
        <div className="flex items-center justify-between pt-0.5 text-xs font-bold text-[var(--claim-muted)]">
          <div className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px]">{isClaimable ? "Reset:" : "Next:"}</span>
            <strong className="font-mono text-xs text-amber-500">{timeLeft}</strong>
          </div>
          <button
            type="button"
            onClick={onOpenJourney}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            <span>View 30-Day Rewards</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakRewardScreen;
