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
      initial={{ scale: 0.94, opacity: 0, y: 22 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.96, opacity: 0, y: 14 }}
      transition={bhalyamSpring}
      className="streak-claim-modal relative z-10 mx-2 flex max-h-[calc(100dvh-16px)] w-full max-w-[680px] select-none flex-col overflow-hidden rounded-[28px] border sm:mx-4 sm:max-h-[calc(100dvh-32px)] sm:rounded-[36px]"
    >
      <div className="pointer-events-none absolute inset-px rounded-[27px] border border-white/10 sm:rounded-[35px]" />
      <div className="streak-claim-scroll relative overflow-y-auto px-3 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-5">
        <header className="flex items-center gap-3">
          <div className="streak-claim-streak flex min-h-[48px] min-w-0 items-center gap-2 rounded-full border px-4 sm:min-h-[54px] sm:px-6">
            <Flame className={`h-6 w-6 shrink-0 fill-orange-400 text-orange-500 ${reduceMotion ? "" : "animate-pulse"}`} />
            <span className="truncate font-display text-lg font-black sm:text-2xl">{displayStreak} Day Streak</span>
          </div>
          <p className="hidden flex-1 -rotate-2 text-center font-script text-xl leading-5 text-[var(--claim-muted)] sm:block sm:text-2xl">
            Keep playing<br />to unlock bigger rewards!
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="streak-claim-close ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14">
            <X className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </header>

        <section className="streak-claim-hero relative mt-3 flex h-[180px] items-center justify-center overflow-hidden rounded-[24px] border sm:mt-4 sm:h-[228px] sm:rounded-[28px]">
          <div className="streak-claim-rays pointer-events-none absolute inset-0" />
          <div className="streak-claim-stage pointer-events-none absolute bottom-3 left-1/2 h-10 w-64 -translate-x-1/2 rounded-[50%] blur-md" />
          <motion.img
            src="/assets/streak/premium-coin-pile.webp"
            alt="A pile of golden reward coins"
            initial={reduceMotion ? false : { scale: 0.76, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ delay: 0.12, ...bhalyamSpring }}
            className="relative z-10 h-[174px] w-[174px] object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.5)] sm:h-[224px] sm:w-[224px]"
          />
          <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2 -rotate-6 whitespace-pre-line text-center font-script text-xl leading-5 text-[#b9cdf0] sm:right-7 sm:text-3xl sm:leading-7">
            {isClaimable ? "Your reward\nawaits!" : "Great\nstart!"}
            <span className="mt-2 block text-3xl text-amber-300">☺</span>
          </div>
        </section>

        <div className="mt-2 text-center sm:mt-3">
          <div className="streak-claim-amount font-display text-[3.5rem] font-black leading-none tracking-tight sm:text-[5rem]">
            +{todayReward.coins.toLocaleString()}<span className="ml-2 text-2xl sm:text-4xl">coins</span>
          </div>
          <div className={`mx-auto mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 font-black sm:text-lg ${isClaimable ? "streak-claim-ready" : "streak-claim-complete"}`}>
            {isClaimable ? <Flame className="h-5 w-5" /> : <Check className="h-5 w-5 stroke-[3]" />}
            Day {currentDay} {isClaimable ? "Ready to Claim" : "Complete!"}
          </div>
          <p className="mt-2 text-sm font-bold text-[var(--claim-muted)] sm:text-base">
            {isClaimable ? "Claim today to keep your expedition moving." : "Come back tomorrow for more rewards!"}
          </p>
        </div>

        <section className="streak-claim-panel mt-4 rounded-[24px] border p-4 sm:px-5">
          <div className="flex items-center justify-between font-display text-lg font-black sm:text-2xl">
            <span>Day {currentDay} of 30</span><span className="text-amber-500">{progress}%</span>
          </div>
          <div className="streak-claim-track mt-2 h-3 overflow-hidden rounded-full border p-[2px]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={reduceMotion ? { duration: 0 } : { duration: 0.85, ease: "easeOut" }} className="streak-claim-progress h-full min-w-3 rounded-full" />
          </div>
        </section>

        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-[var(--claim-muted)] sm:text-base">
          <Crown className="h-5 w-5 fill-amber-300 text-amber-500" /><span>Best streak:</span>
          <strong className="text-[var(--claim-ink)]">{longestStreak} {longestStreak === 1 ? "day" : "days"}</strong>
          {shieldsRemaining > 0 && <span className="ml-2 inline-flex items-center gap-1" title="Streak shields remaining"><Shield className="h-4 w-4 text-sky-500" /> {shieldsRemaining}</span>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="streak-claim-preview streak-claim-preview-tomorrow flex min-h-[112px] items-center gap-3 rounded-[22px] border p-3">
            <img src="/assets/streak/premium-coin-pile.webp" alt="" className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.35)]" />
            <div className="min-w-0"><div className="text-xs font-black uppercase tracking-wide text-emerald-500">Tomorrow</div><div className="mt-1 font-mono text-xl font-black text-amber-500">+{nextReward.coins.toLocaleString()} coins</div><div className="mt-0.5 text-sm font-bold text-[var(--claim-muted)]">Day {nextDay} Reward</div></div>
          </article>
          <article className="streak-claim-preview streak-claim-preview-chest flex min-h-[112px] items-center gap-2 rounded-[22px] border p-3">
            <PremiumRewardChest type={nextMilestone.chest} size={82} />
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-indigo-500"><span>Next chest</span><CalendarDays className="h-4 w-4 text-amber-500" /></div><div className="mt-1 font-display text-xl font-black">in {nextMilestone.daysAway} {nextMilestone.daysAway === 1 ? "day" : "days"}</div><div className="mt-0.5 truncate text-sm font-bold text-[var(--claim-muted)]">Day {nextMilestone.day} · {nextMilestone.name}</div></div>
          </article>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[var(--claim-muted)] sm:text-base">
          <Clock3 className="h-5 w-5 text-amber-500" /><span>{isClaimable ? "Claim before reset:" : "Next reward unlocks in:"}</span><strong className="font-mono text-lg text-amber-500">{timeLeft}</strong>
        </div>

        {claimError && <div role="alert" className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-center text-sm font-bold text-rose-500">{claimError}</div>}

        <motion.button
          type="button"
          whileHover={isClaiming ? undefined : { scale: 1.01 }}
          whileTap={isClaiming ? undefined : { scale: 0.985 }}
          onClick={isClaimable ? handleClaim : onClose}
          disabled={isClaiming}
          aria-busy={isClaiming}
          className="streak-claim-primary group relative mt-4 flex min-h-[62px] w-full items-center justify-center gap-3 overflow-hidden rounded-full border px-6 font-display text-xl font-black sm:min-h-[72px] sm:text-2xl"
        >
          {isClaiming ? <><span className="h-5 w-5 animate-spin rounded-full border-[3px] border-current border-t-transparent" />CLAIMING...</> : <>{isClaimable ? <Gift className="h-6 w-6" /> : <Check className="h-6 w-6 stroke-[3]" />}<span>{isClaimable ? `CLAIM +${todayReward.coins.toLocaleString()} COINS` : "CONTINUE"}</span><ChevronRight className="absolute right-6 h-6 w-6 transition-transform group-hover:translate-x-1" /></>}
        </motion.button>

        <button type="button" onClick={onOpenJourney} className="mx-auto mt-3 flex min-h-[48px] items-center justify-center gap-3 px-4 font-bold text-[var(--claim-muted)] transition-colors hover:text-amber-500 sm:mt-4">
          <Gift className="h-5 w-5 text-amber-500" /><span className="border-b border-current pb-1">View 30-Day Rewards</span><ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}

export default DailyStreakRewardScreen;
