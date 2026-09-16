import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Clock3,
  Coins,
  Crown,
  Flame,
  Gift,
  Lightbulb,
  Shield,
  Target,
  Trophy,
} from "lucide-react";
import {
  STREAK_REWARDS_SCHEDULE,
  type StreakMilestoneChest,
  type StreakScheduledDay,
} from "@shared/streak-types";
import { useStreakStore } from "../../store/streakStore";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";
import { PremiumRewardChest } from "./PremiumRewardChest";

export interface ExpeditionMilestone {
  day: 7 | 14 | 21 | 30;
  title: string;
  chest: StreakMilestoneChest;
  coins: number;
  special: string;
}

export const EXPEDITION_MILESTONES: readonly ExpeditionMilestone[] = [
  { day: 7, title: "Bronze Chest", chest: "bronze", coins: 1_000, special: "Early Bird title" },
  { day: 14, title: "Silver Chest", chest: "silver", coins: 2_500, special: "Emoji pack" },
  { day: 21, title: "Gold Chest", chest: "gold", coins: 5_000, special: "Solar Flare frame" },
  { day: 30, title: "Ultimate Vault", chest: "diamond", coins: 10_000, special: "Champion crown + shield" },
] as const;

export interface StreakExpeditionModel {
  activeDay: number;
  completedDays: number;
  currentStreak: number;
  longestStreak: number;
  shieldsRemaining: number;
  isClaimable: boolean;
  isClaiming: boolean;
  claimError: string | null;
  todayReward: StreakScheduledDay;
  nextReward: StreakScheduledDay;
  nextMilestone: ExpeditionMilestone;
  daysToNextMilestone: number;
  progressPercent: number;
  upcomingRewards: StreakScheduledDay[];
  totalCoins: number;
  timeUntilReset: string;
  claim: () => void;
}

function scheduledReward(day: number, schedule: StreakScheduledDay[]): StreakScheduledDay {
  const fallback = STREAK_REWARDS_SCHEDULE[day - 1] ?? STREAK_REWARDS_SCHEDULE[0];
  return (
    schedule.find((reward) => reward.day === day) ?? {
      ...fallback,
      status: "LOCKED" as const,
    }
  );
}

export function useStreakExpedition(): StreakExpeditionModel {
  const {
    state,
    isClaiming,
    claimToday,
    timeUntilReset,
    updateTimeRemaining,
  } = useStreakStore();
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    updateTimeRemaining();
    const interval = window.setInterval(updateTimeRemaining, 1_000);
    return () => window.clearInterval(interval);
  }, [updateTimeRemaining]);

  const schedule = state?.schedule ?? [];
  const activeDay = Math.min(30, Math.max(1, state?.activeDayInCycle ?? 1));
  const isClaimable = state?.isClaimableToday ?? false;
  const completedDays = isClaimable ? Math.max(0, activeDay - 1) : activeDay;
  const todayReward = scheduledReward(activeDay, schedule);
  const nextDay = activeDay === 30 ? 1 : activeDay + 1;
  const nextReward = scheduledReward(nextDay, schedule);
  const nextMilestone =
    EXPEDITION_MILESTONES.find((milestone) => milestone.day > completedDays) ??
    EXPEDITION_MILESTONES[EXPEDITION_MILESTONES.length - 1];
  const daysToNextMilestone = Math.max(0, nextMilestone.day - completedDays);
  const progressPercent = Math.min(100, (completedDays / 30) * 100);

  const upcomingRewards = useMemo(() => {
    const rewards: StreakScheduledDay[] = [];
    for (let day = activeDay + 1; day <= 30 && rewards.length < 5; day += 1) {
      rewards.push(scheduledReward(day, schedule));
    }
    return rewards;
  }, [activeDay, schedule]);

  const totalCoins = useMemo(
    () => STREAK_REWARDS_SCHEDULE.reduce((sum, reward) => sum + reward.coins, 0),
    []
  );

  const claim = () => {
    if (isClaiming || !isClaimable) return;
    setClaimError(null);
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COIN);
    void claimToday().then((result) => {
      if (!result?.success) {
        setClaimError(result?.message || "Failed to claim reward. Please try again.");
      }
    });
  };

  return {
    activeDay,
    completedDays,
    currentStreak: state?.currentStreak ?? 0,
    longestStreak: state?.longestStreak ?? 0,
    shieldsRemaining: state?.shieldsRemaining ?? 0,
    isClaimable,
    isClaiming,
    claimError,
    todayReward,
    nextReward,
    nextMilestone,
    daysToNextMilestone,
    progressPercent,
    upcomingRewards,
    totalCoins,
    timeUntilReset,
    claim,
  };
}

interface TodayRewardCardProps {
  model: StreakExpeditionModel;
  compact?: boolean;
}

export function TodayRewardCard({ model, compact = false }: TodayRewardCardProps) {
  const reduce = useReducedMotion();
  const streakCount = Math.max(model.currentStreak, model.completedDays);

  return (
    <section className={`streak-paper relative h-full overflow-hidden ${compact ? "p-4" : "p-5"}`}>
      <div aria-hidden="true" className="absolute inset-y-0 left-4 flex flex-col justify-around py-4">
        {Array.from({ length: compact ? 5 : 6 }, (_, index) => (
          <span key={index} className="h-2.5 w-2.5 rounded-full bg-[#10254b]/75" />
        ))}
      </div>

      <div className="relative pl-7">
        <div className="flex items-start gap-3">
          <motion.div
            animate={reduce ? undefined : { rotate: [-2, 2, -2], y: [0, -3, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className={`grid shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600 ring-2 ring-orange-300 ${compact ? "h-14 w-14" : "h-16 w-16"}`}
          >
            <Flame className={`${compact ? "h-8 w-8" : "h-10 w-10"} fill-orange-400/45`} />
          </motion.div>
          <div className="min-w-0">
            <p className="font-hand text-sm font-bold text-[#365eaa]">Your daily expedition</p>
            <h3 className={`${compact ? "text-3xl" : "text-4xl"} font-hand font-black leading-none text-[#10254b]`}>
              {Math.max(1, streakCount)} Day Streak!
            </h3>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-black ${model.isClaimable ? "border-orange-300 bg-orange-100 text-orange-900" : "border-emerald-300 bg-emerald-100 text-emerald-800"}`}>
            {model.isClaimable ? <Flame className="h-4 w-4" /> : <Check className="h-4 w-4 stroke-[3]" />}
            {model.isClaimable ? `Day ${model.activeDay} Ready to Claim` : "Claimed today"}
          </span>
          {model.shieldsRemaining > 0 && (
            <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-800">
              <Shield className="h-4 w-4" />
              {model.shieldsRemaining} shield{model.shieldsRemaining === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-hand text-base font-bold text-[#5f4a37]">
              {model.isClaimable ? "Today you can earn" : "Come back tomorrow to earn"}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-[#8b3513]">
              <Coins className="h-7 w-7 fill-amber-300 text-amber-600" />
              <span className="font-hand text-3xl font-black leading-none">
                {model.isClaimable ? model.todayReward.coins.toLocaleString() : model.nextReward.coins.toLocaleString()} Coins
              </span>
            </div>
          </div>
          <span className="hidden rotate-[-4deg] font-hand text-lg font-black text-[#365eaa] sm:block">
            Keep it going!
          </span>
        </div>

        <div className="mt-4">
          {model.isClaimable ? (
            <button
              type="button"
              onClick={model.claim}
              disabled={model.isClaiming}
              aria-label={`Claim +${model.todayReward.coins} coins`}
              className="streak-claim-button min-h-[50px] w-full rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
            >
              {model.isClaiming ? "Claiming reward…" : `Claim +${model.todayReward.coins.toLocaleString()} coins`}
            </button>
          ) : (
            <div className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-100 px-4 text-sm font-black text-emerald-800">
              <Check className="h-5 w-5 stroke-[3]" />
              Today’s reward is safely claimed
            </div>
          )}
        </div>

        {model.claimError && (
          <div role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
            {model.claimError}
          </div>
        )}
      </div>
    </section>
  );
}

interface NextMilestoneCardProps {
  model: StreakExpeditionModel;
  compact?: boolean;
}

export function NextMilestoneCard({ model, compact = false }: NextMilestoneCardProps) {
  const milestoneProgress = Math.min(100, (model.completedDays / model.nextMilestone.day) * 100);

  return (
    <section className={`streak-panel flex h-full flex-col ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="streak-eyebrow">Next milestone</p>
          <h3 className="mt-1 font-hand text-2xl font-black text-[var(--streak-ink)]">
            {model.nextMilestone.title}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--streak-border)] bg-[var(--streak-control)] px-3 py-1.5 text-xs font-black text-[var(--streak-muted)]">
          <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          {model.daysToNextMilestone} {model.daysToNextMilestone === 1 ? "day" : "days"} remaining
        </span>
      </div>

      <div className={`mt-4 grid flex-1 items-center gap-4 ${compact ? "grid-cols-[110px_1fr]" : "grid-cols-[150px_1fr]"}`}>
        <div className="streak-art-well grid place-items-center rounded-2xl">
          <PremiumRewardChest
            type={model.nextMilestone.chest}
            size={compact ? 100 : 138}
            className="transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.03]"
          />
        </div>
        <div>
          <span className="inline-flex rounded-full bg-orange-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm">
            Day {model.nextMilestone.day}
          </span>
          <p className="mt-2 text-sm font-bold text-[var(--streak-muted)]">
            {model.completedDays} / {model.nextMilestone.day} days
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--streak-track)] ring-1 ring-[var(--streak-border)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${milestoneProgress}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            />
          </div>
          <p className="mt-2 text-xs font-bold text-[var(--streak-muted)]">Also unlocks: {model.nextMilestone.special}</p>
        </div>
      </div>
    </section>
  );
}

export function FinalRewardCard({ compact = false }: { compact?: boolean }) {
  const finalReward = EXPEDITION_MILESTONES[3];
  return (
    <section className={`streak-final-card relative overflow-hidden ${compact ? "p-4" : "p-5"}`}>
      <div className="relative z-10 flex h-full flex-col items-center text-center">
        <span className="rounded-full bg-amber-300 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-950 shadow-md">
          Final reward · Day 30
        </span>
        <div className={`${compact ? "my-3" : "my-4"}`}>
          <PremiumRewardChest
            type="diamond"
            size={compact ? 138 : 162}
            className="transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.03]"
          />
        </div>
        <h3 className="font-hand text-2xl font-black text-white">Ultimate Vault</h3>
        <p className="mt-1 font-display text-3xl text-amber-300">{finalReward.coins.toLocaleString()} Coins</p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
          <Crown className="h-4 w-4 text-amber-300" />
          Champion crown + shield
        </p>
      </div>
    </section>
  );
}

interface MilestoneRailProps {
  model: StreakExpeditionModel;
  mobile?: boolean;
}

export function MilestoneRail({ model, mobile = false }: MilestoneRailProps) {
  const checkpoints = [
    { day: 1, title: "Base Camp", chest: null, coins: STREAK_REWARDS_SCHEDULE[0].coins },
    ...EXPEDITION_MILESTONES.map((milestone) => ({
      day: milestone.day,
      title: milestone.title,
      chest: milestone.chest,
      coins: milestone.coins,
    })),
  ];

  return (
    <section className="streak-panel p-4 sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="streak-eyebrow">Your expedition journey</p>
          <h3 className="font-hand text-xl font-black text-[var(--streak-ink)]">30 days. Four grand chests.</h3>
        </div>
        {mobile && <span className="text-xs font-bold text-[var(--streak-muted)]">Swipe to explore</span>}
      </div>

      <div className={mobile ? "overflow-x-auto pb-2" : ""}>
        <div className={`relative flex items-start ${mobile ? "min-w-[650px] gap-3" : "justify-between gap-3"}`}>
          <div className="absolute left-[7%] right-[7%] top-[51px] h-1 rounded-full bg-[var(--streak-track)]" />
          <div
            className="absolute left-[7%] top-[51px] h-1 rounded-full bg-gradient-to-r from-emerald-400 to-amber-400"
            style={{ width: `${Math.min(86, model.progressPercent * 0.86)}%` }}
          />

          {checkpoints.map((checkpoint) => {
            const complete = model.completedDays >= checkpoint.day;
            const isNext = checkpoint.day === model.nextMilestone.day && !complete;
            return (
              <div key={checkpoint.day} className={`${mobile ? "w-[118px]" : "min-w-0 flex-1"} relative z-10 flex flex-col items-center text-center`}>
                <div className={`grid h-[104px] w-[104px] place-items-center rounded-full border-2 ${complete ? "border-emerald-300 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.25)]" : isNext ? "border-amber-400 bg-amber-400/10 shadow-[0_0_24px_rgba(245,158,11,0.3)]" : "border-[var(--streak-border)] bg-[var(--streak-control)]"}`}>
                  {checkpoint.chest ? (
                    <PremiumRewardChest type={checkpoint.chest} size={98} />
                  ) : complete ? (
                    <Check className="h-9 w-9 text-emerald-500 stroke-[3]" />
                  ) : (
                    <Flame className="h-9 w-9 fill-orange-300 text-orange-600" />
                  )}
                </div>
                <p className="mt-2 text-xs font-black text-[var(--streak-ink)]">Day {checkpoint.day}</p>
                <p className="truncate text-[11px] font-bold text-[var(--streak-muted)]">{checkpoint.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-300">
                  <Coins className="h-3 w-3" />
                  +{checkpoint.coins.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function UpcomingRewards({ rewards }: { rewards: StreakScheduledDay[] }) {
  return (
    <section className="streak-panel p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-300" />
        <h3 className="font-hand text-xl font-black text-[var(--streak-ink)]">Upcoming daily rewards</h3>
      </div>
      {rewards.length > 0 ? (
        <div className="grid grid-cols-5 gap-2">
          {rewards.map((reward) => (
            <div key={reward.day} className="streak-reward-tile min-w-0 rounded-xl px-2 py-3 text-center">
              <p className="text-[11px] font-black text-[var(--streak-muted)]">Day {reward.day}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300">
                <Coins className="h-3.5 w-3.5 shrink-0" />
                +{reward.coins.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-[var(--streak-control)] px-4 py-3 text-sm font-bold text-[var(--streak-muted)]">
          You reached the final day. Claim the vault to begin a new expedition.
        </p>
      )}
    </section>
  );
}

export function ConsistencyCard() {
  return (
    <section className="streak-panel flex items-center gap-4 p-4 sm:p-5">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30">
        <Target className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-hand text-xl font-black text-[var(--streak-ink)]">Stay consistent for bigger rewards</h3>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--streak-muted)]">
          Claim daily rewards and reach milestone chests to unlock exclusive prizes.
        </p>
      </div>
    </section>
  );
}

export function ExpeditionSpoils({ totalCoins }: { totalCoins: number }) {
  return (
    <section className="streak-spoils flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl px-5 py-3 text-center">
      <span className="flex items-center gap-2 font-hand text-xl font-black text-[var(--streak-ink)]">
        <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-300" />
        Expedition Grand Spoils
      </span>
      <span className="flex items-center gap-1.5 text-sm font-black text-[var(--streak-ink)]">
        <Coins className="h-4 w-4 text-amber-600 dark:text-amber-300" />
        {totalCoins.toLocaleString()} coins
      </span>
      <span className="flex items-center gap-1.5 text-sm font-black text-[var(--streak-ink)]">
        <Gift className="h-4 w-4 text-orange-600 dark:text-orange-300" />
        4 grand chests
      </span>
      <span className="flex items-center gap-1.5 text-sm font-black text-[var(--streak-ink)]">
        <Crown className="h-4 w-4 text-amber-600 dark:text-amber-300" />
        Champion crown + shield
      </span>
    </section>
  );
}

export function ExpeditionFooter({ model, mobile = false }: { model: StreakExpeditionModel; mobile?: boolean }) {
  return (
    <div className={`grid gap-3 ${mobile ? "grid-cols-1" : "grid-cols-[auto_1fr]"}`}>
      <div className="streak-panel flex min-h-[58px] items-center gap-3 px-4 py-3">
        <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-300" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--streak-muted)]">Best streak</p>
          <p className="text-sm font-black text-[var(--streak-ink)]">{model.longestStreak} {model.longestStreak === 1 ? "day" : "days"}</p>
        </div>
      </div>
      <div className="streak-panel flex min-h-[58px] items-center gap-3 px-4 py-3">
        <Lightbulb className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
        <p className="text-xs font-semibold leading-relaxed text-[var(--streak-muted)]">
          Missing a day resets your streak to Day 1 unless a streak shield protects it.
        </p>
      </div>
    </div>
  );
}

export function CountdownPill({ model }: { model: StreakExpeditionModel }) {
  return (
    <div className="streak-countdown flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-2">
      <Clock3 className="h-6 w-6 text-amber-600 dark:text-amber-300" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--streak-muted)]">
          {model.isClaimable ? "Claim before reset" : "Next reward in"}
        </p>
        <p className="font-mono text-base font-black tracking-wide text-[var(--streak-ink)]">{model.timeUntilReset}</p>
      </div>
    </div>
  );
}
