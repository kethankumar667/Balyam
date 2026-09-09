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
  Star,
  ChevronRight,
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

export type RewardRarity = "common" | "rare" | "epic" | "legendary";

export function getRewardRarity(day: number, coins: number): {
  rarity: RewardRarity;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  textColor: string;
  glowShadow: string;
  gradient: string;
} {
  if (day === 30 || coins >= 10000) {
    return {
      rarity: "legendary",
      label: "Legendary",
      badgeBg: "bg-amber-500/20 border-amber-400/50",
      badgeText: "text-amber-800 dark:text-amber-300",
      borderColor: "border-amber-400 dark:border-amber-400/80",
      textColor: "text-amber-800 dark:text-amber-300",
      glowShadow: "shadow-[0_0_18px_rgba(245,158,11,0.55)]",
      gradient: "from-amber-400 via-yellow-500 to-rose-500",
    };
  }
  if (day === 7 || day === 14 || day === 21 || coins >= 2500) {
    return {
      rarity: "epic",
      label: "Epic",
      badgeBg: "bg-purple-500/20 border-purple-400/50",
      badgeText: "text-purple-800 dark:text-purple-300",
      borderColor: "border-purple-400 dark:border-purple-500/80",
      textColor: "text-purple-800 dark:text-purple-300",
      glowShadow: "shadow-[0_0_16px_rgba(168,85,247,0.45)]",
      gradient: "from-violet-500 via-purple-600 to-indigo-600",
    };
  }
  if (coins >= 600) {
    return {
      rarity: "rare",
      label: "Rare",
      badgeBg: "bg-sky-500/20 border-sky-400/50",
      badgeText: "text-sky-800 dark:text-sky-300",
      borderColor: "border-sky-400 dark:border-sky-500/70",
      textColor: "text-sky-800 dark:text-sky-300",
      glowShadow: "shadow-[0_0_12px_rgba(14,165,233,0.35)]",
      gradient: "from-sky-500 to-blue-600",
    };
  }
  return {
    rarity: "common",
    label: "Common",
    badgeBg: "bg-emerald-500/20 border-emerald-400/50",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    borderColor: "border-emerald-400/60 dark:border-emerald-500/60",
    textColor: "text-emerald-800 dark:text-emerald-300",
    glowShadow: "shadow-[0_0_10px_rgba(16,185,129,0.25)]",
    gradient: "from-emerald-500 to-teal-600",
  };
}

export function getStreakRank(streak: number): {
  title: string;
  icon: string;
  badgeClass: string;
  mascot: { name: string; emoji: string; desc: string };
} {
  if (streak >= 30) {
    return {
      title: "Monthly Legend",
      icon: "👑",
      badgeClass: "bg-amber-500/25 text-amber-200 border-amber-300/50",
      mascot: { name: "Celestial Crown Spirit", emoji: "👑🔥", desc: "Immortal Streak Mastery" },
    };
  }
  if (streak >= 21) {
    return {
      title: "Diamond Champion",
      icon: "💎",
      badgeClass: "bg-cyan-500/25 text-cyan-200 border-cyan-300/50",
      mascot: { name: "Solar Flare Spirit", emoji: "☀️🔥", desc: "Unstoppable Momentum" },
    };
  }
  if (streak >= 14) {
    return {
      title: "Gold Warrior",
      icon: "🥇",
      badgeClass: "bg-yellow-500/25 text-yellow-200 border-yellow-300/50",
      mascot: { name: "Blazing Fire Spirit", emoji: "✨🔥✨", desc: "Blazing Strong" },
    };
  }
  if (streak >= 7) {
    return {
      title: "Silver Challenger",
      icon: "🥈",
      badgeClass: "bg-slate-300/25 text-slate-100 border-slate-200/50",
      mascot: { name: "Spark Spirit", emoji: "⚡🔥", desc: "Heating Up Fast" },
    };
  }
  return {
    title: "Bronze Explorer",
    icon: "🥉",
    badgeClass: "bg-amber-700/30 text-amber-200 border-amber-500/40",
    mascot: { name: "Tiny Flame", emoji: "🔥", desc: "Beginning the Quest" },
  };
}

export interface MilestoneChestDetail {
  day: number;
  title: string;
  tier: string;
  coins: number;
  perk: string;
  contains: string[];
  gradient: string;
  border: string;
}

export const MILESTONES_CATALOG: MilestoneChestDetail[] = [
  {
    day: 7,
    title: "Bronze Chest",
    tier: "Epic Milestone",
    coins: 1000,
    perk: "'Early Bird' Title",
    contains: ["1,000 Gold Coins", "'Early Bird' Profile Title", "+10% Weekend XP Bonus"],
    gradient: "from-amber-600 via-orange-600 to-amber-700",
    border: "border-amber-500/50",
  },
  {
    day: 14,
    title: "Silver Chest",
    tier: "Epic Milestone",
    coins: 2500,
    perk: "Flame & Crown Emojis",
    contains: ["2,500 Gold Coins", "Exclusive Animated Emojis", "Silver Lounge Flair"],
    gradient: "from-slate-400 via-slate-500 to-zinc-700",
    border: "border-slate-300/50",
  },
  {
    day: 21,
    title: "Gold Chest",
    tier: "Epic Milestone",
    coins: 5000,
    perk: "Solar Flare Frame",
    contains: ["5,000 Gold Coins", "'Solar Flare' Avatar Frame", "Prestige Entrance Glow"],
    gradient: "from-yellow-400 via-amber-500 to-amber-700",
    border: "border-yellow-400/60",
  },
  {
    day: 30,
    title: "Diamond Crown",
    tier: "Legendary Finale",
    coins: 10000,
    perk: "Champion + Shield",
    contains: [
      "10,000 Gold Coins",
      "'Monthly Champion' Crown Badge",
      "1x Streak Protection Shield",
      "Double Wheel Spin Voucher",
    ],
    gradient: "from-cyan-400 via-sky-500 to-violet-600",
    border: "border-cyan-300/70",
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

  // Next milestone calculation with Near-Miss psychology
  const nextMilestone =
    MILESTONES_CATALOG.find((m) => m.day > completedDays) ?? MILESTONES_CATALOG[3];
  const daysToNextMilestone = Math.max(0, nextMilestone.day - completedDays);
  const percentCloser = Math.round(
    ((completedDays) / (nextMilestone.day)) * 100
  );

  // Total earnable coins & remaining coins
  const totalCycleCoins = 35800;
  const claimedCoins = schedule
    .filter((s) => s.status === "CLAIMED")
    .reduce((sum, s) => sum + s.coins, 0);
  const remainingCoins = Math.max(0, totalCycleCoins - claimedCoins);
  const remainingChests = [7, 14, 21].filter((d) => d > completedDays).length;
  const remainingDiamond = completedDays < 30 ? 1 : 0;

  // Streak status & companion mascot
  const streakRank = getStreakRank(currentStreak);

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

  const inspectedRarity = getRewardRarity(
    activeInspected.day,
    activeInspected.coins
  );

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
                 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.4)]
                 overflow-hidden flex flex-col"
    >
      {/* 1. Header Banner — Upgraded Hook & Companion Mascot */}
      <div className="relative px-6 py-4.5 flex items-center justify-between bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 overflow-hidden">
        {/* Ambient Radiant Depth Effect */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.45), transparent 40%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.25), transparent 45%)",
          }}
        />

        <div className="relative flex items-center gap-4">
          {/* Dynamic Streak Mascot Evolution */}
          <div className="relative group">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-13 h-13 rounded-2xl flex items-center justify-center bg-white/20 border-2 border-white/50 shadow-lg cursor-pointer"
              title={`Streak Companion: ${streakRank.mascot.name}`}
            >
              <span className="text-2xl select-none">{streakRank.mascot.emoji}</span>
            </motion.div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center text-[8px] font-black text-emerald-950">
              ✓
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                LOGIN STREAK CHALLENGE
              </h2>
              {/* Status Rank Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border font-mono shadow-sm flex items-center gap-1 ${streakRank.badgeClass}`}>
                <span>{streakRank.icon}</span>
                <span>{streakRank.title}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-black/25 text-amber-200 border border-amber-300/40 font-mono shadow-sm">
                🔥 {currentStreak} Days
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/40 font-bold">
                Cycle {cycleCount + 1}
              </span>
            </div>
            <p className="text-xs text-white/95 font-semibold mt-0.5">
              Complete 30 Days · Earn 35,800+ Coins · Unlock 4 Grand Chests · Become Monthly Legend
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

      {/* 2. Total Earnable Coins & Near-Miss Psychology Bar */}
      <div className="px-6 py-2.5 bg-[var(--chrome-control)] border-b border-[var(--chrome-hairline)] flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-3 font-semibold text-[var(--chrome-ink)]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)]">
            <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-[var(--chrome-ink-soft)] text-[11px]">Remaining in Cycle:</span>
            <span className="font-mono font-black text-amber-800 dark:text-amber-300">
              {remainingCoins.toLocaleString()} Coins
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[var(--chrome-ink-soft)]">
            <span>•</span>
            <span>{remainingChests} Grand Chests</span>
            <span>•</span>
            <span>{remainingDiamond} Diamond Crown</span>
          </div>
        </div>

        {/* Near-Miss Motivation */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {daysToNextMilestone === 0
              ? "All Cycle Milestones Reached!"
              : `Only ${daysToNextMilestone} Day${daysToNextMilestone === 1 ? "" : "s"} Until ${nextMilestone.title} (${percentCloser}% Closer than Day 0!)`}
          </span>
        </div>
      </div>

      {/* 3. Epic Milestone Progress Track: Start ─── D7 ─── D14 ─── D21 ─── D30 ★ */}
      <div className="px-6 py-3 bg-[var(--chrome-panel)] border-b border-[var(--chrome-hairline)]">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--chrome-ink-soft)] mb-2">
          <span className="text-[var(--chrome-ink)] font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Milestone Quest: Day {completedDays} / 30 ({progressPercent}% Complete)
          </span>
          <span className="text-[11px] text-[var(--chrome-ink-soft)] font-medium">
            Next Tier Target: <span className="font-black text-amber-800 dark:text-amber-300">{nextMilestone.title}</span>
          </span>
        </div>

        <div className="relative w-full h-3 bg-[var(--chrome-control)] rounded-full border border-[var(--chrome-border)] overflow-visible">
          {/* Glowing Fill Bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 shadow-sm"
          />

          {/* Epic Milestone Points */}
          {MILESTONES_CATALOG.map((m) => {
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
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isPassed
                      ? "bg-emerald-500 border-white text-white shadow-md"
                      : isNext
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 border-white text-white scale-125 ring-3 ring-amber-400/50 shadow-lg animate-pulse"
                      : "bg-[var(--chrome-panel)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] group-hover:scale-110"
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : m.day === 30 ? (
                    <Crown className="w-3.5 h-3.5" />
                  ) : (
                    <Gift className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={`text-[9px] font-black uppercase mt-1 ${
                    isPassed
                      ? "text-emerald-700 dark:text-emerald-400"
                      : isNext
                      ? "text-amber-800 dark:text-amber-300 font-bold"
                      : "text-[var(--chrome-ink-soft)]"
                  }`}
                >
                  D{m.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main Split View: Left Hero Center & Right Progression Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--chrome-hairline)] flex-1 overflow-hidden">
        {/* LEFT COLUMN: Dominant Hero Centerpiece & D30 Anchor (5 cols) */}
        <div className="lg:col-span-5 p-5 flex flex-col justify-between bg-[var(--chrome-control)] overflow-y-auto space-y-4">
          <div className="space-y-3.5">
            {/* 1. DOMINANT ACTIVE REWARD CARD */}
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

                <div className="relative flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/25 text-white border border-white/40 flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                    Today's Reward · Day {activeDay}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/25 text-amber-200">
                    Ready to Claim
                  </span>
                </div>

                <div className="relative my-2 py-1 flex flex-col items-center justify-center text-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1], rotate: [0, 4, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/60 flex items-center justify-center shadow-lg mb-2 backdrop-blur-xs"
                  >
                    <Coins className="w-9 h-9 text-amber-200 fill-amber-300 drop-shadow" />
                  </motion.div>

                  <span className="text-4xl lg:text-5xl font-black font-mono tracking-tight drop-shadow-md">
                    +{todayReward.coins.toLocaleString()}
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-100 mt-0.5">
                    Coins Ready To Claim
                  </span>

                  {todayReward.specialRewardTitle && (
                    <div className="mt-2.5 px-3 py-1 rounded-xl bg-black/25 border border-white/30 text-xs font-bold flex items-center gap-2">
                      <Gift className="w-4 h-4 text-yellow-300" />
                      <span>Includes: {todayReward.specialRewardTitle}</span>
                    </div>
                  )}
                </div>

                {/* Direct Hero CTA Button */}
                <div className="relative mt-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="group relative w-full min-h-[54px] py-3.5 px-6 rounded-2xl font-black text-base
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
                {/* CLAIMED REWARD CARD WITH GREEN PULSE */}
                <div className="p-4.5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/20 border-2 border-emerald-500/40 text-[var(--chrome-ink)] shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                      <Check className="w-7 h-7 stroke-[3]" />
                      <span className="absolute -inset-1 rounded-2xl border-2 border-emerald-400 animate-ping opacity-40" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          +{todayReward.coins.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          COINS CLAIMED TODAY ✓
                        </span>
                      </div>
                      <p className="text-xs text-[var(--chrome-ink-soft)] font-medium mt-0.5">
                        Day {activeDay} completed! Your streak is burning hot.
                      </p>
                    </div>
                  </div>
                </div>

                {/* TOMORROW'S REWARD TEASER CARD */}
                <div className="relative p-4.5 rounded-3xl bg-[var(--chrome-panel)] border-2 border-amber-400/50 shadow-md shadow-amber-500/10 overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Tomorrow's Reward · Day {tomorrowDay}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[var(--chrome-ink-soft)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      In {timeUntilReset}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <div className="text-2xl font-black font-mono text-[var(--chrome-ink)] flex items-center gap-1.5">
                        <Coins className="w-5 h-5 text-amber-500 fill-amber-500" />
                        +{tomorrowReward.coins.toLocaleString()}{" "}
                        <span className="text-xs font-bold text-[var(--chrome-ink-soft)]">Coins</span>
                      </div>
                      <p className="text-xs text-[var(--chrome-ink-soft)] mt-0.5">
                        Return tomorrow to keep your {currentStreak + 1}-day streak alive!
                      </p>
                    </div>

                    {tomorrowReward.milestoneChest && (
                      <div className="px-2.5 py-1.5 rounded-2xl bg-violet-100 dark:bg-violet-500/20 border border-violet-400/40 text-violet-700 dark:text-violet-300 text-center shrink-0">
                        <Gift className="w-4 h-4 mx-auto mb-0.5" />
                        <span className="text-[9px] font-black uppercase block">Grand Chest</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. TURN D30 INTO THE HERO: ULTIMATE REWARD BEACON */}
            <div className="relative p-4 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-sky-500/15 to-violet-600/25 border-2 border-cyan-400/50 shadow-md shadow-cyan-500/15 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Day 30 Ultimate Grand Finale
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Legendary Tier
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                {/* Golden Ring Rotating Crown */}
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
                  <Crown className="w-8 h-8 text-white drop-shadow-md animate-bounce" />
                  <span className="absolute -inset-1 rounded-2xl border-2 border-amber-300/80 animate-spin opacity-40" />
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-[var(--chrome-ink)]">
                      +10,000
                    </span>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase">
                      Coins
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--chrome-ink-soft)] font-medium leading-snug">
                    Includes <span className="font-bold text-[var(--chrome-ink)]">'Monthly Champion' Crown Badge</span> + 1x Streak Shield
                  </p>
                </div>
              </div>

              {/* Perfect Month Incentive */}
              <div className="mt-2.5 pt-2 border-t border-cyan-400/30 flex items-center justify-between text-[10px]">
                <span className="text-[var(--chrome-ink-soft)] font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Perfect Month Bonus: 35,800 Total Coins
                </span>
                <span className="font-black text-cyan-800 dark:text-cyan-300 font-mono">
                  {Math.max(0, 30 - completedDays)}d away
                </span>
              </div>
            </div>

            {/* 3. Actionable Status Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border-2 border-[var(--chrome-border)] flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                    Next Grand Chest
                  </span>
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1 mt-0.5">
                    <Gift className="w-3.5 h-3.5 text-amber-500" />
                    {nextMilestone.title}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-bold text-[var(--chrome-ink-soft)]">
                  <span className="text-[var(--chrome-ink)] font-black">{daysToNextMilestone} days</span> left (+{nextMilestone.coins.toLocaleString()})
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border-2 border-[var(--chrome-border)] flex flex-col justify-between">
                <div>
                  <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                    Streak Shields
                  </span>
                  <span className="text-xs font-black text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-0.5">
                    <Shield className="w-3.5 h-3.5 fill-sky-500/20" />
                    {shieldsRemaining} Active
                  </span>
                </div>
                <span className="mt-1 text-[10px] text-[var(--chrome-ink-soft)]">
                  Streak loss protection
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[var(--chrome-ink-soft)] text-center pt-2 border-t border-[var(--chrome-hairline)]">
            Best Record: <span className="font-black text-[var(--chrome-ink)] font-mono">{longestStreak} Days</span>
          </div>
        </div>

        {/* RIGHT COLUMN: 30-Day Rewards Ladder with Rarity Colors & Chest Previews (7 cols) */}
        <div className="lg:col-span-7 p-5 overflow-y-auto max-h-[660px] bg-[var(--chrome-panel)] flex flex-col justify-between space-y-4">
          <div>
            {/* Header & Rarity Legend */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                  30-Day Rewards Matrix
                </h3>
                <p className="text-[11px] text-[var(--chrome-ink-soft)]">
                  Tier-colored rarity rewards across your monthly challenge
                </p>
              </div>

              {/* Rarity Legend */}
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-400/40">
                  Common
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-400/40">
                  Rare
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-400/40">
                  Epic
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/40">
                  Legendary
                </span>
              </div>
            </div>

            {/* 30-Day Grid: 5 Rows of 6 Days with Rarity Tiers */}
            <div className="space-y-3">
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

                        const rarity = getRewardRarity(item.day, item.coins);

                        let nodeVisualClass =
                          `bg-[var(--chrome-control)] ${rarity.borderColor} text-[var(--chrome-ink-soft)]`;
                        if (isClaimed) {
                          nodeVisualClass =
                            "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-[0_4px_12px_rgba(16,185,129,0.4)]";
                        } else if (isToday) {
                          nodeVisualClass =
                            "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-200 text-white shadow-[0_4px_16px_rgba(245,158,11,0.55)] scale-110";
                        } else if (isCrown) {
                          nodeVisualClass =
                            `bg-gradient-to-br ${rarity.gradient} ${rarity.borderColor} text-white ${rarity.glowShadow} scale-105`;
                        } else if (isMilestone) {
                          nodeVisualClass =
                            `bg-gradient-to-br ${rarity.gradient} ${rarity.borderColor} text-white ${rarity.glowShadow}`;
                        } else if (isLocked) {
                          nodeVisualClass = `bg-[var(--chrome-control)] ${rarity.borderColor} text-[var(--chrome-ink-soft)] opacity-85`;
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
                              className={`relative w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-transform ${nodeVisualClass} ${
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

                            {/* REWARD AMOUNT WITH RARITY TIER COLOR */}
                            <span
                              className={`text-[11px] font-black font-mono tracking-tight ${
                                isClaimed
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : isToday
                                  ? "text-amber-800 dark:text-amber-300 font-bold"
                                  : rarity.textColor
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

          {/* 5. 4 GRAND MILESTONE CHEST CARDS WITH FULL "CONTAINS" PREVIEW */}
          <div className="pt-3 border-t border-[var(--chrome-hairline)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                Grand Milestone Chests & Contents Preview
              </span>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                Guaranteed Collectibles
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {MILESTONES_CATALOG.map((m) => {
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
                      <span className="text-[9px] font-black uppercase text-[var(--chrome-ink-soft)]">
                        Day {m.day}
                      </span>
                      {isClaimed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                      ) : m.day === 30 ? (
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Gift className="w-3.5 h-3.5 text-violet-500" />
                      )}
                    </div>
                    <span className="text-xs font-black text-[var(--chrome-ink)] block truncate">
                      {m.title}
                    </span>
                    <span className="text-[11px] font-black font-mono text-amber-800 dark:text-amber-300 block mt-0.5">
                      +{m.coins.toLocaleString()} Coins
                    </span>
                    <div className="mt-1 pt-1 border-t border-[var(--chrome-border)]/50">
                      <span className="text-[9px] font-bold text-[var(--chrome-ink-soft)] block truncate">
                        Contains:
                      </span>
                      <span className="text-[9px] text-[var(--chrome-ink)] block truncate">
                        {m.contains[1]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inspected Day Reward Breakdown Drawer */}
          <div className="p-3 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md font-mono font-black border text-[11px] ${inspectedRarity.badgeBg} ${inspectedRarity.badgeText}`}>
                D{activeInspected.day} · {inspectedRarity.label}
              </span>
              <div>
                <span className="font-bold text-[var(--chrome-ink)] block">
                  {activeInspected.description}
                </span>
                {activeInspected.specialRewardTitle && (
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                    ⭐ Guaranteed Bonus: {activeInspected.specialRewardTitle}
                  </span>
                )}
              </div>
            </div>
            <span className="font-black font-mono text-sm text-[var(--chrome-ink)] shrink-0 ml-2">
              +{activeInspected.coins.toLocaleString()} Coins
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;

