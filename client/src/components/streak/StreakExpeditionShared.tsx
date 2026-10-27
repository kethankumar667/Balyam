import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
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
  shieldsGrantedBy,
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

const MILESTONE_NAMES = ["Bronze Chest", "Silver Chest", "Gold Chest", "Ultimate Vault"];
export const EXPEDITION_MILESTONES: readonly ExpeditionMilestone[] =
  ([7, 14, 21, 30] as const).map((day, index) => {
    const reward = STREAK_REWARDS_SCHEDULE[day - 1];
    return {
      day, title: MILESTONE_NAMES[index],
      chest: ({ 7: "bronze", 14: "silver", 21: "gold", 30: "diamond" } as const)[day],
      coins: reward.coins,
      special: `${reward.specialRewardTitle} ${reward.specialRewardType === "title" ? "title" : reward.specialRewardType === "badge" ? "badge" : ""}${shieldsGrantedBy(reward) ? " + shield" : ""}`.trim(),
    };
  });

export interface StreakExpeditionModel {
  activeDay: number;
  completedDays: number;
  currentStreak: number;
  longestStreak: number;
  shieldsRemaining: number;
  isClaimable: boolean;
  /** A member who registered today: nothing to claim until the streak starts tomorrow (UTC). */
  isHeldForFirstDay: boolean;
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
  // Registered today: nothing has been claimed, and nothing is "today's" yet — Day 1 is tomorrow's.
  const isHeldForFirstDay = Boolean(state?.firstClaimAt);
  const completedDays = !state || isHeldForFirstDay ? 0 : isClaimable ? Math.max(0, activeDay - 1) : activeDay;
  const todayReward = scheduledReward(activeDay, schedule);
  const nextDay = activeDay === 30 ? 1 : activeDay + 1;
  const nextReward = isHeldForFirstDay ? todayReward : scheduledReward(nextDay, schedule);
  const nextMilestone =
    EXPEDITION_MILESTONES.find((milestone) => milestone.day > completedDays) ??
    EXPEDITION_MILESTONES[EXPEDITION_MILESTONES.length - 1];
  const daysToNextMilestone = Math.max(0, nextMilestone.day - completedDays);
  const progressPercent = Math.min(100, (completedDays / 30) * 100);

  const upcomingRewards = useMemo(() => {
    const rewards: StreakScheduledDay[] = [];
    for (let day = isHeldForFirstDay ? activeDay : activeDay + 1; day <= 30 && rewards.length < 5; day += 1) {
      rewards.push(scheduledReward(day, schedule));
    }
    return rewards;
  }, [activeDay, isHeldForFirstDay, schedule]);

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
    isHeldForFirstDay,
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
  const stripStart = Math.min(24, Math.max(1, model.activeDay - 3));
  return (
    <section className={`streak-paper relative flex w-full flex-1 flex-col overflow-hidden ${compact ? "p-5" : "p-6"}`}>
      <div className="flex items-center gap-4">
        <div role="group" aria-label={`${model.currentStreak}-day streak`} className="streak-day-seal relative flex h-[100px] w-[100px] shrink-0 flex-col items-center justify-center gap-1 rounded-full px-2 text-center font-sans">
          <Flame aria-hidden="true" className="mx-auto h-6 w-6 fill-orange-400 text-orange-600" />
          <span className="text-3xl font-semibold leading-none tracking-tight text-[#194b3b] tabular-nums">{model.currentStreak}</span>
          <span className="whitespace-nowrap text-[10px] font-semibold leading-[14px] tracking-normal text-[#315348]">Day streak</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#725633]">Your daily reward</p>
          <h3 className="mt-1 font-display text-xl leading-tight text-[#204d37]">
            {model.isClaimable ? `Day ${model.activeDay} Ready` : model.isHeldForFirstDay ? "Starts tomorrow" : "Today secured!"}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 font-display text-2xl text-[#854a12]">
            <Coins aria-hidden="true" className="h-5 w-5 shrink-0 text-[#a56b15]" />
            +{model.todayReward.coins.toLocaleString()} Coins
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#66563e]">
            {model.isHeldForFirstDay ? "Your first grant awaits" : model.isClaimable ? "A little treasure, every day" : "Daily reward claimed"}
          </p>
        </div>
      </div>

      {model.isClaimable ? (
        <button type="button" onClick={model.claim} disabled={model.isClaiming}
          aria-label={`Claim +${model.todayReward.coins} coins`}
          className="streak-claim-button mt-4 min-h-11 w-full rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider disabled:cursor-wait disabled:opacity-70">
          {model.isClaiming ? "Claiming..." : `Claim +${model.todayReward.coins.toLocaleString()} coins`}
        </button>
      ) : (
        <p className="mt-4 flex items-center justify-center gap-2 border-y border-[#c4a878]/60 py-2.5 text-xs font-semibold text-[#574730]">
          <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
          {model.isHeldForFirstDay ? "First reward in" : "Next reward in"}
          <span className="font-mono font-bold">{model.timeUntilReset}</span>
        </p>
      )}
      <ol aria-label="Nearby daily rewards" className="mt-auto flex justify-between gap-1 pt-4">
        {Array.from({ length: 7 }, (_, index) => {
          const day = stripStart + index;
          const complete = day <= model.completedDays;
          return <li key={day} aria-current={day === model.activeDay ? "step" : undefined} className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#66563e]">
            <span className={`grid h-7 w-7 place-items-center rounded-full border ${complete ? "border-[#588369] bg-[#e0ecce] text-[#285237]" : day === model.activeDay ? "border-[#b47a19] bg-[#f5d689] text-[#68430b]" : "border-[#cbb892] bg-[#ecdfc2] text-[#756447]"}`}>
              {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : day}
            </span>
            <span>Day {day}<span className="sr-only">{complete ? ", claimed" : ", not claimed"}</span></span>
          </li>;
        })}
      </ol>
      {model.claimError && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-bold text-red-800">{model.claimError}</p>}
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
    <section className={`streak-panel streak-chest-showcase relative flex w-full flex-1 flex-col overflow-hidden ${compact ? "p-4" : "p-6"}`}>
      <div className="relative z-10 grid flex-1 grid-cols-[minmax(0,1fr)_125px] items-center gap-2 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="min-w-0">
          <p className="streak-eyebrow">{model.daysToNextMilestone ? "Next milestone" : "Cycle complete"}</p>
          <h3 className="mt-2 font-display text-2xl text-[var(--streak-ink)]">
            {model.nextMilestone.title}
          </h3>
          <p className="mt-1 text-xs font-bold text-[var(--streak-muted)]">{model.daysToNextMilestone ? `${model.daysToNextMilestone} ${model.daysToNextMilestone === 1 ? "day" : "days"} left to unlock` : "All waypoints reached!"}</p>
          <p className="mt-4 flex items-center gap-1.5 font-display text-xl text-amber-800 dark:text-amber-300"><Coins aria-hidden="true" className="h-5 w-5 shrink-0" />+{model.nextMilestone.coins.toLocaleString()} Coins</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-[var(--streak-muted)]">{model.nextMilestone.special}</p>
        </div>
        <div className="streak-chest-pedestal relative grid h-[145px] place-items-center lg:h-[155px]">
          <PremiumRewardChest type={model.nextMilestone.chest} size={compact ? 145 : 165} scale={2.3} className="relative z-10 max-w-full scale-[.8] lg:scale-100" />
        </div>
      </div>
      <div className="relative z-10 mt-3">
        <div className="mb-2 flex justify-between text-xs font-bold text-[var(--streak-muted)]"><span>{model.completedDays} / {model.nextMilestone.day} days completed</span><span>{Math.floor(milestoneProgress)}%</span></div>
        <div role="progressbar" aria-label="Next milestone progress" aria-valuemin={0} aria-valuemax={model.nextMilestone.day} aria-valuenow={model.completedDays} className="h-2.5 overflow-hidden rounded-full border border-[var(--streak-border)] bg-[var(--streak-track)]">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-500" style={{ width: `${milestoneProgress}%` }} />
        </div>
        <details className="streak-preview mt-2">
          <summary tabIndex={0} className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-[var(--streak-ink)]"><Gift aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-300" />Preview rewards <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4" /></summary>
          <ul className="space-y-2 border-t border-[var(--streak-border)] py-3 text-xs text-[var(--streak-muted)]">
            {EXPEDITION_MILESTONES.map((reward) => <li key={reward.day}><strong className="text-[var(--streak-ink)]">Day {reward.day} · {reward.coins.toLocaleString()} coins</strong><br />{reward.special}</li>)}
          </ul>
        </details>
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
        <div className={`${compact ? "my-2" : "my-3"} relative flex items-center justify-center w-full`}>
          {/* Ambient cosmic aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/35 via-violet-500/35 to-amber-400/30 blur-2xl pointer-events-none animate-pulse" />
          <PremiumRewardChest
            type="diamond"
            size={compact ? 160 : 205}
            scale={1.48}
            className="relative z-10 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.05]"
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
  compact?: boolean;
}

export function MilestoneRail({ model, mobile = false, compact = false }: MilestoneRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const artId = useId().replace(/:/g, "");
  const checkpoints = [
    { day: 1, title: "Base Camp", chest: null, coins: STREAK_REWARDS_SCHEDULE[0].coins },
    ...EXPEDITION_MILESTONES.map((milestone) => ({
      day: milestone.day,
      title: milestone.title,
      chest: milestone.chest,
      coins: milestone.coins,
    })),
  ];

  // Checkpoints are equally spaced visually, but represent unequal spans of days.
  const segment = Math.max(0, checkpoints.findIndex((point) => point.day >= model.activeDay) - 1);
  const from = checkpoints[segment];
  const to = checkpoints[segment + 1];
  const position = model.activeDay === 1 ? 0 : (segment + (model.activeDay - from.day) / (to.day - from.day)) / 4;
  const move = (direction: number) => scrollRef.current?.scrollBy({ left: direction * 240, behavior: reduce ? "instant" : "smooth" });

  return (
    <section className={`streak-panel overflow-hidden ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="streak-eyebrow">One day. One step. More treasure.</p>
          <h3 className="mt-1 font-display text-lg text-[var(--streak-ink)]">30-Day Milestone Journey</h3>
        </div>
        {mobile && <div className="flex shrink-0 gap-1">
          <button type="button" aria-label="Previous waypoints" onClick={() => move(-1)} className="streak-icon-button grid h-11 w-11 place-items-center rounded-full"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Next waypoints" onClick={() => move(1)} className="streak-icon-button grid h-11 w-11 place-items-center rounded-full"><ChevronRight className="h-5 w-5" /></button>
        </div>}
      </div>
      <div ref={scrollRef} role="region" aria-label="Expedition waypoint map" tabIndex={mobile ? 0 : undefined} className="streak-scrollbar mt-1 overflow-x-auto pb-1">
        <div className={`streak-journey-map relative h-[230px] ${mobile ? "min-w-[670px]" : "min-w-[600px]"}`}>
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-[175px] w-full" viewBox="0 0 1000 175" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`${artId}-rock`} x2="0" y2="1"><stop stopColor="var(--streak-island-edge)" /><stop offset="1" stopColor="var(--streak-rock)" /></linearGradient>
              <linearGradient id={`${artId}-grass`} x2="0" y2="1"><stop stopColor="var(--streak-grass-hi)" /><stop offset="1" stopColor="var(--streak-grass)" /></linearGradient>
              <g id={`${artId}-pine`}><path d="M0 0v28" stroke="#655039" strokeWidth="3" /><path d="m0-17-12 24h24ZM0-7-16 24h32Z" fill="var(--streak-pine)" /><path d="M0-17V17H16L7 1H12Z" fill="var(--streak-pine-hi)" /></g>
              <g id={`${artId}-island`}>
                <ellipse cy="52" rx="81" ry="12" fill="var(--streak-map-shadow)" opacity=".4" />
                <path d="M-80 10-65 41-37 52-15 44 9 59 38 40 63 43 80 10Z" fill={`url(#${artId}-rock)`} />
                <path d="m-42 24 11 17m42-15L9 59m42-35-13 16" stroke="var(--streak-rock)" strokeWidth="3" opacity=".6" />
                <ellipse rx="80" ry="25" cy="9" fill="var(--streak-island-edge)" />
                <ellipse rx="75" ry="23" cy="3" fill={`url(#${artId}-grass)`} />
                <path d="M-59 2Q-28-19 1-8T56 6" fill="none" stroke="var(--streak-grass-hi)" strokeWidth="2" opacity=".7" />
                <use href={`#${artId}-pine`} x="-55" y="-16" /><use href={`#${artId}-pine`} x="49" y="-12" transform="translate(10 1) scale(.8)" />
                <path d="m-29 5 6-4 7 5-3 6h-12Zm65 7 5-4 8 3-1 6H35Z" fill="#bbad84" opacity=".7" />
              </g>
            </defs>
            <path d="M0 140Q120 120 230 143T460 144T740 146T1000 135M0 156Q200 140 340 158T680 158T1000 153" fill="none" stroke="var(--streak-water-line)" strokeWidth="1.5" opacity=".45" />
            <path d="M100 99C190 99 200 58 300 58S410 99 500 99 610 58 700 58 800 99 900 99" fill="none" stroke="var(--streak-route)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
            {[100, 300, 500, 700, 900].map((x, index) => <use key={x} href={`#${artId}-island`} x={x} y={index % 2 ? 74 : 108} />)}
          </svg>
          <div className="absolute top-0 z-20 -translate-x-1/2 rounded-full border border-amber-500 bg-[#f8df94] px-3 py-1 text-[10px] font-black text-[#5b3a10] shadow-md" style={{ left: `${10 + position * 80}%` }}>
            {model.isHeldForFirstDay ? "Start here" : `You · Day ${model.activeDay}`}
            <span aria-hidden="true" className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-amber-500 bg-[#f8df94]" />
            <span aria-hidden="true" className="absolute left-1/2 top-[calc(100%+5px)] h-12 border-l border-dashed border-amber-500" />
            <span aria-hidden="true" className="absolute left-1/2 top-[calc(100%+50px)] h-3 w-3 -translate-x-1/2 rotate-45 border border-amber-500 bg-[#f8df94] shadow-[0_0_12px_#fbbf24]" />
          </div>
          <ol aria-label="Milestone rewards" className="relative grid h-full grid-cols-5">
          {checkpoints.map((checkpoint, index) => {
            const complete = model.completedDays >= checkpoint.day;
            return (
              <li key={checkpoint.day} className="relative flex min-w-0 flex-col items-center text-center" style={{ paddingTop: index % 2 ? 32 : 66 }}>
                <div className="relative grid h-[70px] w-[78px] place-items-center">
                  {checkpoint.chest ? <PremiumRewardChest type={checkpoint.chest} size={78} scale={1.8} /> :
                    <div aria-hidden="true" className="streak-base-camp"><span /><span /></div>}
                  {complete && <span className="absolute -right-1 top-0 grid h-5 w-5 place-items-center rounded-full border border-[#b8efc0] bg-[#26754c] text-white"><Check aria-hidden="true" className="h-3 w-3" /><span className="sr-only">Claimed</span></span>}
                </div>
                <div className="streak-waypoint-label mt-5 rounded-xl px-2 py-1.5">
                  <p className="text-xs font-black text-[var(--streak-ink)]">Day {checkpoint.day}</p>
                  <p className="text-[11px] font-semibold text-[var(--streak-muted)]">{checkpoint.title}</p>
                  <p className="mt-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">+{checkpoint.coins.toLocaleString()} coins</p>
                </div>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
      {mobile && <p className="mt-2 text-center text-[11px] text-[var(--streak-muted)]">Swipe or use the arrows to explore all 5 waypoints</p>}
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
            <div key={reward.day} className={`streak-reward-tile min-w-0 rounded-xl px-2 py-2.5 text-center ${reward.milestoneChest ? "ring-1 ring-amber-400/40 bg-amber-500/5" : ""}`}>
              <p className="text-[11px] font-black text-[var(--streak-muted)]">Day {reward.day}</p>
              {reward.milestoneChest && (
                <div className="mx-auto my-1 flex h-6 w-6 items-center justify-center">
                  <PremiumRewardChest type={reward.milestoneChest} size={24} />
                </div>
              )}
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

export function ExpeditionCompactFooter({ model }: { model: StreakExpeditionModel }) {
  const chestsClaimed = EXPEDITION_MILESTONES.filter((reward) => reward.day <= model.completedDays).length;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <section className="streak-panel p-4">
        <h3 className="flex items-center gap-2 font-display text-sm"><Trophy aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-300" />Expedition stats</h3>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between gap-2"><dt className="text-[var(--streak-muted)]">Longest streak</dt><dd className="font-bold">{model.longestStreak} {model.longestStreak === 1 ? "day" : "days"}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--streak-muted)]">Chests this cycle</dt><dd className="font-bold">{chestsClaimed} / 4</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--streak-muted)]">Cycle reward pool</dt><dd className="font-bold">{model.totalCoins.toLocaleString()} coins</dd></div>
        </dl>
      </section>
      <section className="streak-panel p-4">
        <h3 className="flex items-center gap-2 font-display text-sm"><Gift aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-300" />Reward highlights</h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="streak-highlight-medal grid h-14 w-14 shrink-0 place-items-center rounded-xl"><Crown aria-hidden="true" className="h-8 w-8" /></div>
          <div className="text-xs"><p className="font-bold">Monthly Champion</p><p className="mt-1 leading-relaxed text-[var(--streak-muted)]">Day 30 badge + a streak shield</p></div>
        </div>
        <p className="mt-2 text-[11px] text-[var(--streak-muted)]">Titles, reactions & a frame along the way.</p>
      </section>
      <section className="streak-panel p-4">
        <h3 className="flex items-center gap-2 font-display text-sm"><Shield aria-hidden="true" className="h-4 w-4 text-sky-700 dark:text-sky-300" />Streak protection</h3>
        <div className="mt-3 flex items-center gap-3"><Shield aria-hidden="true" className="h-10 w-10 shrink-0 fill-sky-500/15 text-sky-700 dark:text-sky-300" /><p className="text-xs font-bold">{model.shieldsRemaining} {model.shieldsRemaining === 1 ? "shield" : "shields"} available</p></div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--streak-muted)]">A shield protects a missed day. Without one, your streak starts again at Day 1.</p>
      </section>
    </div>
  );
}

export function CountdownPill({ model, compact = false }: { model: StreakExpeditionModel; compact?: boolean }) {
  return (
    <div className={`streak-countdown flex items-center gap-2 rounded-xl ${compact ? "min-h-[38px] px-2.5 py-1" : "min-h-[48px] px-4 py-2"}`}>
      <Clock3 className={`${compact ? "h-4 w-4" : "h-6 w-6"} text-amber-600 dark:text-amber-300`} />
      <div>
        <p className="text-[9px] font-black uppercase tracking-wider text-[var(--streak-muted)] leading-none">
          {model.isClaimable ? "Reset in" : model.isHeldForFirstDay ? "Opens in" : "Next reward"}
        </p>
        <p className={`font-mono ${compact ? "text-sm" : "text-base"} font-black tracking-wide text-[var(--streak-ink)] leading-tight`}>
          {model.timeUntilReset}
        </p>
      </div>
    </div>
  );
}
