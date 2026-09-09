import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Flame,
  Clock,
  Shield,
  Gift,
  Coins,
  Check,
  Sparkles,
  Crown,
  Lock,
  Zap,
  Trophy,
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import {
  STREAK_REWARDS_SCHEDULE,
  type StreakScheduledDay,
} from "@shared/streak-types";

interface DailyStreakModalDesktopProps {
  onClose: () => void;
}

const DAYS_PER_ROW = 6;

interface MilestoneMeta {
  day: number;
  title: string;
  badge: string;
  coins: number;
  perk: string;
  cardGradient: string;
  textColor: string;
}

const MILESTONES: MilestoneMeta[] = [
  {
    day: 7,
    title: "Bronze Chest",
    badge: "Bronze Tier",
    coins: 1000,
    perk: "'Early Bird' Title",
    cardGradient: "from-amber-600 to-orange-700",
    textColor: "text-amber-400",
  },
  {
    day: 14,
    title: "Silver Chest",
    badge: "Silver Tier",
    coins: 2500,
    perk: "Exclusive Emoji Pack",
    cardGradient: "from-slate-500 to-slate-700",
    textColor: "text-slate-300",
  },
  {
    day: 21,
    title: "Gold Chest",
    badge: "Gold Tier",
    coins: 5000,
    perk: "Solar Flare Frame",
    cardGradient: "from-amber-500 to-yellow-600",
    textColor: "text-yellow-300",
  },
  {
    day: 30,
    title: "Diamond Crown",
    badge: "Diamond Tier",
    coins: 10000,
    perk: "Monthly Champion + Shield",
    cardGradient: "from-cyan-500 via-sky-600 to-violet-600",
    textColor: "text-cyan-300",
  },
];

export function DailyStreakModalDesktop({ onClose }: DailyStreakModalDesktopProps) {
  const { state, isClaiming, claimToday, timeUntilReset, updateTimeRemaining } =
    useStreakStore();

  const currentStreak = state?.currentStreak ?? 0;
  const longestStreak = state?.longestStreak ?? 0;
  const cycleCount = state?.cycleCount ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;
  const shieldsRemaining = state?.shieldsRemaining ?? 0;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];

  // Today and Tomorrow indices & rewards
  const todayDay = isClaimable ? activeDay : Math.min(activeDay, 30);
  const todayReward =
    schedule.find((s) => s.day === todayDay) ??
    (STREAK_REWARDS_SCHEDULE[todayDay - 1] as StreakScheduledDay) ?? {
      day: 1,
      coins: 100,
      description: "Day 1 Welcome Reward",
      status: "CLAIMABLE",
    };

  const tomorrowDay = todayDay < 30 ? todayDay + 1 : 1;
  const tomorrowReward =
    schedule.find((s) => s.day === tomorrowDay) ??
    (STREAK_REWARDS_SCHEDULE[tomorrowDay - 1] as StreakScheduledDay) ?? {
      day: 2,
      coins: 120,
      description: "Day 2 Momentum Bonus",
      status: "LOCKED",
    };

  // Progression calculation: completed days in current cycle (0..30)
  const completedDays = isClaimable ? Math.max(0, todayDay - 1) : todayDay;
  const progressPercent = Math.min(100, Math.round((completedDays / 30) * 100));

  // Next milestone calculation
  const nextMilestone =
    MILESTONES.find((m) => m.day > completedDays) ?? MILESTONES[3];
  const daysToNextMilestone = Math.max(0, nextMilestone.day - completedDays);

  const [inspectedDay, setInspectedDay] = useState<number>(todayDay);

  // Tick countdown timer every second
  useEffect(() => {
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  const activeInspected =
    schedule.find((s) => s.day === inspectedDay) ??
    schedule.find((s) => s.day === todayDay) ??
    todayReward;

  const handleSelectDay = (day: number) => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    setInspectedDay(day);
  };

  const handleClaim = () => {
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COIN);
    void claimToday();
  };

  // Chunk the 30-day schedule into rows
  const rows: StreakScheduledDay[][] = [];
  for (let i = 0; i < schedule.length; i += DAYS_PER_ROW) {
    rows.push(schedule.slice(i, i + DAYS_PER_ROW));
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Login Streak Challenge & Rewards"
      initial={{ scale: 0.94, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 12 }}
      transition={bhalyamSpring}
      className="relative z-50 w-full max-w-5xl rounded-3xl bg-[var(--chrome-panel)]
                 border-2 border-[var(--chrome-border)]
                 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)]
                 overflow-hidden flex flex-col"
    >
      {/* 1. Header Banner — High-Energy Hook */}
      <div className="relative px-6 py-4.5 flex items-center justify-between bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.2), transparent 45%)",
          }}
        />

        <div className="relative flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/20 border-2 border-white/50 shadow-inner">
            <Flame className="w-7 h-7 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                LOGIN STREAK CHALLENGE
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-black/25 text-amber-200 border border-amber-300/40 font-mono shadow-sm">
                🔥 {currentStreak} Day Streak
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/40 font-bold">
                Cycle {cycleCount + 1}
              </span>
            </div>
            <p className="text-xs text-white/95 font-semibold mt-0.5">
              Claim up to 10,000 Coins · Unlock 4 Grand Chests · Complete 30 Days for Mega Reward
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/25 border border-white/30 text-xs font-bold text-white shadow-inner">
            <Clock className="w-4 h-4 text-amber-300" />
            <span className="text-white/80">Next Reset:</span>
            <span className="font-mono font-black text-amber-200">{timeUntilReset}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Streak Modal"
            className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center
                       text-white hover:bg-white/20 cursor-pointer transition-colors
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Full-Width 30-Day Cycle Journey Track */}
      <div className="px-6 py-3 bg-[var(--chrome-control)] border-b border-[var(--chrome-hairline)]">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--chrome-ink-soft)] mb-1.5">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-[var(--chrome-ink)] font-black uppercase tracking-wider text-[11px]">
              Cycle Journey Progress:
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-mono font-black">
              Day {completedDays} of 30 ({progressPercent}% Complete)
            </span>
          </div>
          <span className="text-[11px] font-semibold">
            {nextMilestone && (
              <>
                Next Grand Milestone:{" "}
                <span className="font-black text-amber-600 dark:text-amber-400">
                  {nextMilestone.title} ({daysToNextMilestone} day{daysToNextMilestone === 1 ? "" : "s"} away)
                </span>
              </>
            )}
          </span>
        </div>

        {/* Progress Bar with Milestone Pins */}
        <div className="relative w-full h-3 bg-[var(--chrome-panel)] rounded-full border border-[var(--chrome-border)] overflow-visible">
          {/* Animated Fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 shadow-sm"
          />

          {/* Milestone Pinpoints (Day 7, 14, 21, 30) */}
          {MILESTONES.map((m) => {
            const pinPercent = (m.day / 30) * 100;
            const isPassed = completedDays >= m.day;
            const isNext = nextMilestone.day === m.day && !isPassed;

            return (
              <button
                type="button"
                key={m.day}
                onClick={() => handleSelectDay(m.day)}
                title={`${m.title} (Day ${m.day}): +${m.coins.toLocaleString()} Coins`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex flex-col items-center cursor-pointer group"
                style={{ left: `${pinPercent}%` }}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isPassed
                      ? "bg-emerald-500 border-white text-white shadow-sm"
                      : isNext
                      ? "bg-amber-500 border-white text-white scale-125 ring-2 ring-amber-400/50 shadow-md animate-pulse"
                      : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]"
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : m.day === 30 ? (
                    <Crown className="w-3 h-3" />
                  ) : (
                    <Gift className="w-3 h-3" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Split View: Left Hero Center & Right Progression Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--chrome-hairline)] flex-1 overflow-hidden">
        {/* LEFT COLUMN: Hero Reward Centerpiece (5 cols) */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-[var(--chrome-control)] overflow-y-auto">
          <div className="space-y-4">
            {/* DOMINANT HERO REWARD CARD */}
            {isClaimable ? (
              /* READY TO CLAIM HERO CARD */
              <div className="relative p-5 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_12px_36px_-6px_rgba(245,158,11,0.5)] overflow-hidden border-2 border-amber-300/40">
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 75% 25%, rgba(255,255,255,0.45), transparent 45%)",
                  }}
                />

                {/* Top Status Header */}
                <div className="relative flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/25 text-white border border-white/40 flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                    Today's Reward · Day {activeDay}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/25 text-amber-200">
                    Ready to Claim
                  </span>
                </div>

                {/* Big Animated Centerpiece */}
                <div className="relative my-2 py-3 flex flex-col items-center justify-center text-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1], rotate: [0, 4, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/60 flex items-center justify-center shadow-lg mb-2.5 backdrop-blur-xs"
                  >
                    <Coins className="w-9 h-9 text-amber-200 fill-amber-300 drop-shadow" />
                  </motion.div>

                  <span className="text-4xl lg:text-5xl font-black font-mono tracking-tight drop-shadow-md">
                    +{todayReward.coins.toLocaleString()}
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-100 mt-1">
                    Coins Ready To Claim
                  </span>

                  {/* Special unlock indicator if milestone */}
                  {todayReward.specialRewardTitle && (
                    <div className="mt-3 px-3 py-1.5 rounded-xl bg-black/25 border border-white/30 text-xs font-bold flex items-center gap-2">
                      <Gift className="w-4 h-4 text-yellow-300" />
                      <span>Includes: {todayReward.specialRewardTitle}</span>
                    </div>
                  )}
                </div>

                {/* Direct Hero CTA Button */}
                <div className="relative mt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="group relative w-full min-h-[56px] py-4 px-6 rounded-2xl font-black text-base
                               bg-white text-orange-600 shadow-[0_8px_24px_rgba(0,0,0,0.2)] cursor-pointer
                               flex items-center justify-center gap-2.5 overflow-hidden
                               focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {isClaiming ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                        Claiming Coins…
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 animate-spin" />
                        <span className="tracking-wide">
                          CLAIM +{todayReward.coins.toLocaleString()} COINS NOW
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            ) : (
              /* ALREADY CLAIMED HERO CARD + TOMORROW PREVIEW */
              <div className="space-y-3">
                {/* CLAIMED BADGE CARD */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-amber-500/10 to-emerald-500/20 border-2 border-emerald-500/40 text-[var(--chrome-ink)] shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          +{todayReward.coins.toLocaleString()}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          COINS CLAIMED
                        </span>
                      </div>
                      <p className="text-xs text-[var(--chrome-ink-soft)] font-medium mt-0.5">
                        Day {activeDay} completed! Your streak is secured for today.
                      </p>
                    </div>
                  </div>
                </div>

                {/* TOMORROW'S REWARD TEASER CARD */}
                <div className="relative p-5 rounded-3xl bg-[var(--chrome-panel)] border-2 border-amber-400/50 shadow-md shadow-amber-500/10 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Tomorrow's Reward · Day {tomorrowDay}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[var(--chrome-ink-soft)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      In {timeUntilReset}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-3xl font-black font-mono text-[var(--chrome-ink)] flex items-center gap-1.5">
                        <Coins className="w-6 h-6 text-amber-500 fill-amber-500" />
                        +{tomorrowReward.coins.toLocaleString()}{" "}
                        <span className="text-sm font-bold text-[var(--chrome-ink-soft)]">Coins</span>
                      </div>
                      <p className="text-xs text-[var(--chrome-ink-soft)] mt-1">
                        Log in tomorrow to claim and maintain your {currentStreak + 1}-day streak!
                      </p>
                    </div>

                    {tomorrowReward.milestoneChest && (
                      <div className="px-3 py-2 rounded-2xl bg-violet-100 dark:bg-violet-500/20 border border-violet-400/40 text-violet-700 dark:text-violet-300 text-center shrink-0">
                        <Gift className="w-5 h-5 mx-auto mb-0.5" />
                        <span className="text-[10px] font-black uppercase block">Grand Chest</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ACTIONABLE STREAK & MILESTONE FEEDBACK */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Next Grand Chest Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--chrome-panel)] border-2 border-[var(--chrome-border)] flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                    Next Grand Chest
                  </span>
                  <span className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-1 mt-0.5">
                    <Gift className="w-4 h-4 text-amber-500" />
                    {nextMilestone.title}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-[var(--chrome-ink-soft)]">
                  <span className="text-[var(--chrome-ink)] font-black">{daysToNextMilestone} days</span> left (+{nextMilestone.coins.toLocaleString()} Coins)
                </div>
              </div>

              {/* Streak Shield Status */}
              <div className="p-3.5 rounded-2xl bg-[var(--chrome-panel)] border-2 border-[var(--chrome-border)] flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                    Streak Shields
                  </span>
                  <span className="text-sm font-black text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-0.5">
                    <Shield className="w-4 h-4 fill-sky-500/20" />
                    {shieldsRemaining} Protected
                  </span>
                </div>
                <span className="mt-2 text-[10px] text-[var(--chrome-ink-soft)] leading-tight">
                  Protects your streak if you miss a day
                </span>
              </div>
            </div>

            {/* Inspected Day Preview Drawer */}
            <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] font-mono font-black text-[var(--chrome-ink)] border border-[var(--chrome-border)]">
                  D{activeInspected.day}
                </span>
                <div>
                  <span className="font-bold text-[var(--chrome-ink)] block">
                    {activeInspected.description}
                  </span>
                  {activeInspected.specialRewardTitle && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      ⭐ Bonus: {activeInspected.specialRewardTitle}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-black font-mono text-sm text-[var(--chrome-ink)] shrink-0 ml-2">
                +{activeInspected.coins.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[var(--chrome-ink-soft)] text-center pt-3 border-t border-[var(--chrome-hairline)]">
            Longest Streak Record: <span className="font-black text-[var(--chrome-ink)] font-mono">{longestStreak} Days</span>
          </div>
        </div>

        {/* RIGHT COLUMN: 30-Day Rewards Ladder Grid (7 cols) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto max-h-[620px] bg-[var(--chrome-panel)] flex flex-col justify-between">
          <div>
            {/* Header with Legend */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                  30-Day Rewards Schedule
                </h3>
                <p className="text-[11px] text-[var(--chrome-ink-soft)]">
                  All upcoming coin yields & milestones are fully visible
                </p>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--chrome-ink-soft)]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Claimed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Today
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  Milestone
                </span>
              </div>
            </div>

            {/* 30-Day Grid: 5 Rows of 6 Days */}
            <div className="space-y-4">
              {rows.map((row, rowIdx) => {
                return (
                  <div key={rowIdx} className="relative">
                    <div className="relative flex items-start justify-between">
                      {row.map((item) => {
                        const isToday = isClaimable && item.day === activeDay;
                        const isMilestone = Boolean(item.milestoneChest);
                        const isSelected = inspectedDay === item.day;
                        const isClaimed = item.status === "CLAIMED";
                        const isLocked = item.status === "LOCKED";
                        const isCrown = item.day === 30;

                        let nodeStyle =
                          "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]";
                        if (isClaimed) {
                          nodeStyle =
                            "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)]";
                        } else if (isToday) {
                          nodeStyle =
                            "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-200 text-white shadow-[0_4px_16px_rgba(245,158,11,0.55)] scale-110";
                        } else if (isCrown) {
                          nodeStyle =
                            "bg-gradient-to-br from-cyan-400 to-violet-600 border-cyan-200 text-white shadow-[0_4px_14px_rgba(56,189,248,0.4)]";
                        } else if (isMilestone) {
                          nodeStyle =
                            "bg-gradient-to-br from-violet-400 to-violet-600 border-violet-200 text-white shadow-[0_4px_14px_rgba(139,92,246,0.4)]";
                        }

                        return (
                          <button
                            type="button"
                            key={item.day}
                            onClick={() => handleSelectDay(item.day)}
                            className="group relative flex flex-col items-center gap-1 cursor-pointer select-none focus-visible:outline-hidden"
                            style={{ width: `${100 / DAYS_PER_ROW}%` }}
                          >
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider ${
                                isToday
                                  ? "text-amber-800 dark:text-amber-300 font-bold"
                                  : isSelected
                                  ? "text-violet-600 dark:text-violet-400 font-bold"
                                  : "text-[var(--chrome-ink-soft)]"
                              }`}
                            >
                              D{item.day}
                            </span>

                            <motion.span
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.94 }}
                              transition={bhalyamSpring}
                              className={`relative w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-transform ${nodeStyle} ${
                                isSelected
                                  ? "ring-2 ring-offset-2 ring-offset-[var(--chrome-panel)] ring-amber-500"
                                  : ""
                              }`}
                            >
                              {isClaimed ? (
                                <Check className="w-5 h-5 stroke-[3]" />
                              ) : isCrown ? (
                                <Crown className="w-5 h-5" />
                              ) : isMilestone ? (
                                <Gift className="w-5 h-5" />
                              ) : isLocked ? (
                                <Lock className="w-3.5 h-3.5 opacity-60" />
                              ) : (
                                <Coins className="w-4.5 h-4.5" />
                              )}

                              {isToday && (
                                <span className="absolute -inset-1 rounded-2xl border-2 border-amber-400 animate-ping opacity-60" />
                              )}
                            </motion.span>

                            {/* REWARD AMOUNT — ALWAYS VISIBLE (NO MYSTERY ?) */}
                            <span
                              className={`text-[11px] font-black font-mono tracking-tight ${
                                isClaimed
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : isToday
                                  ? "text-amber-800 dark:text-amber-300 font-bold"
                                  : isLocked
                                  ? "text-[var(--chrome-ink-soft)] opacity-85"
                                  : "text-[var(--chrome-ink)]"
                              }`}
                            >
                              +{item.coins >= 1000 ? `${item.coins / 1000}k` : item.coins}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4 GRAND MILESTONE CHEST HIGHLIGHT CARDS */}
          <div className="mt-6 pt-4 border-t border-[var(--chrome-hairline)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                4 Grand Milestone Chests
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Guaranteed Special Rewards
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {MILESTONES.map((m) => {
                const isClaimed = completedDays >= m.day;
                const isSelected = inspectedDay === m.day;

                return (
                  <button
                    type="button"
                    key={m.day}
                    onClick={() => handleSelectDay(m.day)}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                      isSelected
                        ? "border-amber-400 bg-amber-500/10 shadow-md"
                        : "border-[var(--chrome-border)] bg-[var(--chrome-control)] hover:border-amber-400/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                        Day {m.day}
                      </span>
                      {isClaimed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                      ) : m.day === 30 ? (
                        <Crown className="w-3.5 h-3.5 text-cyan-500" />
                      ) : (
                        <Gift className="w-3.5 h-3.5 text-violet-500" />
                      )}
                    </div>
                    <span className="text-xs font-black text-[var(--chrome-ink)] block truncate">
                      {m.title}
                    </span>
                    <span className="text-[11px] font-black font-mono text-amber-600 dark:text-amber-400 block mt-0.5">
                      +{m.coins.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-[var(--chrome-ink-soft)] block truncate mt-0.5">
                      {m.perk}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;
