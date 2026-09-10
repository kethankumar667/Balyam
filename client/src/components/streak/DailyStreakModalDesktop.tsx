import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  X,
  ArrowLeft,
  Flame,
  Clock,
  Shield,
  Gift,
  Coins,
  Check,
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
import { StreakHeroArtwork } from "./StreakHeroArtwork";

interface DailyStreakModalDesktopProps {
  onClose: () => void;
  onBack?: () => void;
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

// Horizontal center-point (% of the highway's width) for each fixed
// checkpoint tile, derived from their grid-cols-12 spans below (Day 1 /
// Bronze / Silver / Gold each take 2 cols, Diamond takes the last 4) — used
// to anchor the inspect popover under whichever chest was actually tapped,
// instead of always centering it regardless of which one that was.
const CHECKPOINT_ANCHOR_PCT: Record<number, number> = {
  7: 25,
  14: 41.7,
  21: 58.3,
  30: 83.3,
};

export function DailyStreakModalDesktop({ onClose, onBack }: DailyStreakModalDesktopProps) {
  const { state, isClaiming, claimToday, timeUntilReset, updateTimeRemaining } = useStreakStore();
  const reduce = useReducedMotion();

  const currentStreak = state?.currentStreak ?? 0;
  const longestStreak = state?.longestStreak ?? 0;
  const shieldsRemaining = state?.shieldsRemaining ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];

  // Countdown ticks locally; the store's own `nextResetAt` doesn't change
  // between ticks so this only needs to run while the modal is mounted.
  useEffect(() => {
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  const todayDay = isClaimable ? activeDay : Math.min(activeDay, 30);
  const todayReward =
    schedule.find((s) => s.day === todayDay) ??
    (STREAK_REWARDS_SCHEDULE[todayDay - 1] as StreakScheduledDay) ?? {
      day: 1,
      coins: 100,
      description: "Day 1 Welcome Reward",
      status: "CLAIMABLE",
    };

  const nextDayNum = (todayDay % 30) + 1;
  const nextReward =
    STREAK_REWARDS_SCHEDULE.find((s) => s.day === nextDayNum) ?? STREAK_REWARDS_SCHEDULE[0];

  const completedDays = isClaimable ? Math.max(0, todayDay - 1) : todayDay;
  const progressPercent = Math.min(100, Math.round((completedDays / 30) * 100));

  const nextMilestone =
    MILESTONES_CATALOG.find((m) => m.day > completedDays) ?? MILESTONES_CATALOG[3];
  const daysToNextMilestone = Math.max(0, nextMilestone.day - completedDays);

  const defaultMilestoneIdx = Math.max(
    0,
    MILESTONES_CATALOG.findIndex((m) => m.day >= completedDays)
  );
  // Carries the tapped chest's own horizontal anchor so the popover opens
  // under it instead of always dead-center regardless of which one it was.
  const [inspectMilestone, setInspectMilestone] = useState<{
    detail: MilestoneChestDetail;
    anchorPct: number;
  } | null>(null);

  const openInspector = (detail: MilestoneChestDetail) => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    setInspectMilestone((prev) =>
      prev?.detail.day === detail.day
        ? null
        : { detail, anchorPct: CHECKPOINT_ANCHOR_PCT[detail.day] ?? 50 }
    );
  };

  // The next handful of individual daily rewards after today — restores
  // visibility of the escalating day-to-day curve that only showing the 4
  // milestone chests otherwise hides for the ~26 non-milestone days.
  const upcomingDays = useMemo(() => {
    const days: StreakScheduledDay[] = [];
    for (let d = todayDay + 1; d <= 30 && days.length < 4; d++) {
      const found =
        schedule.find((s) => s.day === d) ?? (STREAK_REWARDS_SCHEDULE[d - 1] as StreakScheduledDay);
      if (found) days.push(found);
    }
    return days;
  }, [schedule, todayDay]);

  // Tomorrow's immediate reward — crucial for retention loop psychology
  const tomorrowReward = useMemo(() => {
    const nextDay = todayDay + 1;
    if (nextDay > 30) return null;
    return (
      schedule.find((s) => s.day === nextDay) ??
      (STREAK_REWARDS_SCHEDULE[nextDay - 1] as StreakScheduledDay)
    );
  }, [schedule, todayDay]);

  // Computed, not hand-typed, so it can never silently drift from the real
  // schedule the way a hardcoded total would.
  const totalCoinsAvailable = useMemo(
    () => STREAK_REWARDS_SCHEDULE.reduce((sum, r) => sum + r.coins, 0),
    []
  );

  const handleClaim = () => {
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COIN);
    void claimToday();
  };

  const handleBack = () => {
    AudioManager.play(AUDIO.UI_CLICK);
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  const urgencyText =
    daysToNextMilestone === 0
      ? `🎉 ${nextMilestone.title} Unlocked!`
      : `${nextMilestone.title} Unlocks In ${daysToNextMilestone} ${daysToNextMilestone === 1 ? "Day" : "Days"}`;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="30-Day Rewards Journey"
      initial={{ scale: 0.94, opacity: 0, y: 14 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 14 }}
      transition={bhalyamSpring}
      className="relative z-50 w-full max-w-[920px] rounded-3xl
                 bg-gradient-to-b from-[#0c101c] via-[#0f1629] to-[#070b14]
                 border border-amber-500/30
                 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9),0_0_50px_rgba(245,158,11,0.08)]
                 backdrop-blur-2xl overflow-hidden flex flex-col select-none text-white"
    >
      {/* Top Ambient Subtle Radiance */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-12 w-64 h-64 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* 1. Integrated Luxury Header */}
      <div className="relative px-6 py-4 flex items-center justify-between border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10
                       text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5
                       cursor-pointer transition-all active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft className="w-4 h-4 text-amber-300" />
            <span>Today's Reward</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
                Rewards Expedition
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                Day {completedDays} / 30
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 font-mono flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {isClaimable ? "Today" : "Claimed"}: +{todayReward.coins.toLocaleString()}
              </span>
              {tomorrowReward && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/50 font-mono flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Tomorrow: +{tomorrowReward.coins.toLocaleString()} 🪙
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Chips & Close Button */}
        <div className="flex items-center gap-2.5">
          {/* Reset countdown — the single strongest same-day-return signal
              in any daily-reward system; a modal with no ticking clock reads
              as "browse whenever" instead of "claim before you lose today". */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-slate-200 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-mono tracking-wide">{timeUntilReset}</span>
          </div>

          {/* Streak shield count — makes the loss-protection mechanic
              visible so missing a day feels safe instead of catastrophic,
              instead of players quitting outright the first time a streak
              would otherwise reset to zero. */}
          {shieldsRemaining > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-xs font-black text-sky-300 shadow-inner">
              <Shield className="w-3.5 h-3.5 fill-sky-400/20" />
              <span>{shieldsRemaining}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-xs font-black text-amber-200 shadow-inner">
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>{urgencyText}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Streak Modal"
            className="min-h-[42px] min-w-[42px] rounded-full bg-white/10 hover:bg-white/20
                       text-slate-300 hover:text-white flex items-center justify-center
                       cursor-pointer transition-all active:scale-95
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. THE EXPEDITION QUEST STAGE (Open Panoramic Landscape, No Boxy Cards) */}
      <div className="relative px-6 py-6 flex flex-col justify-center z-10">
        {/* Subtle Ambient Nebulae */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-44 bg-amber-500/10 blur-3xl rounded-full" />
          <div className="absolute top-1/2 right-12 -translate-y-1/2 w-80 h-56 bg-cyan-500/10 blur-3xl rounded-full" />
        </div>

        <div className="relative w-full">
          {/* THE EXPEDITION HIGHWAY: Positioned at the base across waypoint nodes.
              Flag/crown bookends plus a moving shimmer on the filled portion
              give the road a sense of motion instead of reading as a static
              divider line. */}
          <div className="absolute top-[164px] left-[4%] right-[4%] flex items-center gap-1.5 z-0">
            <span className="text-sm shrink-0 -ml-0.5" aria-hidden="true">🏁</span>
            <div className="relative flex-1 h-3 rounded-full bg-slate-950 border border-white/10 shadow-inner overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={reduce ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
                className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-cyan-400 shadow-[0_0_16px_rgba(245,158,11,0.9)] overflow-hidden"
              >
                {!reduce && (
                  <motion.div
                    animate={{ x: ["-100%", "220%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                  />
                )}
              </motion.div>
            </div>
            <Crown className="w-4 h-4 text-amber-300 fill-amber-400/70 shrink-0" aria-hidden="true" />
          </div>

          {/* "You are here" marker — floats at today's exact proportional
              position along the road, independent of the 5 fixed checkpoint
              tiles. A player mid-week (e.g. Day 12, between Bronze and
              Silver) otherwise has no visual sense of where they actually
              stand on the road, only how far the nearest milestone is. */}
          <div
            className="absolute top-[142px] z-20 -translate-x-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `calc(4% + ${progressPercent * 0.92}%)` }}
          >
            <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-white text-slate-950 shadow-md mb-0.5 whitespace-nowrap">
              You · Day {todayDay}
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full bg-white border-2 border-amber-400 shadow-[0_0_8px_rgba(255,255,255,0.8)] ${
                reduce ? "" : "animate-pulse"
              }`}
            />
          </div>

          {/* STATIONS ROW (Grid of 5 Expeditions: Start, Bronze, Silver, Gold, Diamond Finale) */}
          <div className="relative z-10 grid grid-cols-12 gap-3 items-stretch">
            {/* 1. START CHECKPOINT (Day 1 - Base Camp) — 2 cols */}
            <div className="col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl transition-all">
              {/* Top Tag */}
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                BASE CAMP
              </span>

              {/* Start Artwork */}
              <div className="h-[76px] flex items-center justify-center my-1">
                <div
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${
                    completedDays >= 1
                      ? "bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-300 text-white shadow-emerald-500/50 ring-2 ring-emerald-400/40"
                      : "bg-amber-500 border-amber-300 text-white animate-pulse"
                  }`}
                >
                  <span className="text-2xl">🏁</span>
                </div>
              </div>

              {/* Reward Labels */}
              <div className="h-[38px] flex flex-col justify-center">
                <span className="text-xs font-black text-white block">Day 1</span>
                <span className="text-[11px] font-black text-emerald-400 font-mono">
                  +100 Coins
                </span>
              </div>

              {/* Waypoint Node (Centered directly on the highway line) */}
              <div className="my-1.5 flex items-center justify-center z-10 relative">
                {/* Opaque backing disc — masks the highway line behind this station */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-5 rounded-full bg-[#0f1629]" />
                </div>
                <div
                  className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-md ${
                    completedDays >= 1
                      ? "bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/50"
                      : "bg-slate-900 border-white/20 text-slate-400"
                  }`}
                >
                  {completedDays >= 1 ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span className="text-[10px] font-bold font-mono">1</span>
                  )}
                </div>
              </div>

              {/* Status Pill */}
              <div className="mt-1">
                {completedDays >= 1 ? (
                  <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">
                    Collected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-300">Ready</span>
                )}
              </div>
            </div>

            {/* 2. BRONZE CHEST (Day 7) — 2 cols */}
            {(() => {
              const chest = MILESTONES_CATALOG[0];
              const isPassed = completedDays >= chest.day;
              const isNext = nextMilestone.day === chest.day && !isPassed;

              return (
                <div
                  key={chest.day}
                  onClick={() => openInspector(chest)}
                  className={`col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl cursor-pointer transition-all hover:scale-105 ${
                    isNext
                      ? "bg-gradient-to-b from-amber-500/20 via-amber-950/25 to-transparent border border-amber-400/60 shadow-[0_0_24px_rgba(205,127,50,0.3)] ring-1 ring-amber-400/40"
                      : isPassed
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* Top Tag */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-[#CD7F32] text-white shadow-sm"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 7
                  </span>

                  {/* Chest Artwork (Floating completely unobstructed above the road) */}
                  <div className="h-[76px] flex items-center justify-center my-1 transition-transform hover:-translate-y-1">
                    <StreakHeroArtwork type="bronze" size={68} />
                  </div>

                  {/* Reward Labels */}
                  <div className="h-[38px] flex flex-col justify-center">
                    <span className="text-xs font-black text-white truncate block">
                      {chest.title}
                    </span>
                    <span className="text-xs font-black font-mono text-[#f59e0b]">
                      +{chest.coins.toLocaleString()}
                    </span>
                  </div>

                  {/* Goal Gradient Micro-Pill */}
                  <div className="my-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black font-mono bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-xs">
                      {Math.min(completedDays, 7)} / 7 DAYS
                    </span>
                  </div>

                  {/* Waypoint Node (Centered directly on the highway line) */}
                  <div className="my-1 flex items-center justify-center z-10 relative">
                    {/* Opaque backing disc — masks the highway line behind this station */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-5 rounded-full bg-[#0f1629]" />
                    </div>
                    <div
                      className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-md ${
                        isPassed
                          ? "bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/50"
                          : isNext
                          ? "bg-[#CD7F32] border-amber-300 text-white shadow-[0_0_12px_rgba(205,127,50,0.8)] animate-pulse"
                          : "bg-slate-900 border-white/20 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-bold font-mono">7</span>
                      )}
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="mt-1">
                    {isPassed ? (
                      <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">
                        Collected
                      </span>
                    ) : isNext ? (
                      <span className="text-[10px] font-black text-amber-300 bg-gradient-to-r from-amber-500/30 to-amber-600/30 px-2 py-0.5 rounded-full border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] flex items-center gap-1 justify-center">
                        <Lock className="w-2.5 h-2.5 text-amber-300" />
                        {daysToNextMilestone === 0 ? "Ready!" : `Opens in ${daysToNextMilestone}d`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 justify-center">
                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                        Day 7 Goal
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 3. SILVER CHEST (Day 14) — 2 cols */}
            {(() => {
              const chest = MILESTONES_CATALOG[1];
              const isPassed = completedDays >= chest.day;
              const isNext = nextMilestone.day === chest.day && !isPassed;

              return (
                <div
                  key={chest.day}
                  onClick={() => openInspector(chest)}
                  className={`col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl cursor-pointer transition-all hover:scale-105 ${
                    isNext
                      ? "bg-gradient-to-b from-slate-300/15 via-slate-800/20 to-transparent border border-slate-300/50 shadow-[0_0_14px_rgba(203,213,225,0.18)]"
                      : isPassed
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* Top Tag */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-slate-200 text-slate-950 font-black shadow-sm"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 14
                  </span>

                  {/* Chest Artwork */}
                  <div className="h-[76px] flex items-center justify-center my-1 transition-transform hover:-translate-y-1">
                    <StreakHeroArtwork type="silver" size={68} />
                  </div>

                  {/* Reward Labels */}
                  <div className="h-[38px] flex flex-col justify-center">
                    <span className="text-xs font-black text-white truncate block">
                      {chest.title}
                    </span>
                    <span className="text-xs font-black font-mono text-slate-200">
                      +{chest.coins.toLocaleString()}
                    </span>
                  </div>

                  {/* Goal Gradient Micro-Pill */}
                  <div className="my-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black font-mono bg-slate-500/20 text-slate-300 border border-slate-400/30 shadow-xs">
                      {Math.min(completedDays, 14)} / 14 DAYS
                    </span>
                  </div>

                  {/* Waypoint Node */}
                  <div className="my-1 flex items-center justify-center z-10 relative">
                    {/* Opaque backing disc — masks the highway line behind this station */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-5 rounded-full bg-[#0f1629]" />
                    </div>
                    <div
                      className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-md ${
                        isPassed
                          ? "bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/50"
                          : isNext
                          ? "bg-slate-300 border-white text-slate-950 shadow-[0_0_12px_rgba(203,213,225,0.8)] animate-pulse"
                          : "bg-slate-900 border-white/20 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-bold font-mono">14</span>
                      )}
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="mt-1">
                    {isPassed ? (
                      <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">
                        Collected
                      </span>
                    ) : isNext ? (
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                        {daysToNextMilestone === 0 ? "Ready!" : `Opens in ${daysToNextMilestone}d`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 justify-center">
                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                        Day 14 Goal
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 4. GOLD CHEST (Day 21) — 2 cols */}
            {(() => {
              const chest = MILESTONES_CATALOG[2];
              const isPassed = completedDays >= chest.day;
              const isNext = nextMilestone.day === chest.day && !isPassed;

              return (
                <div
                  key={chest.day}
                  onClick={() => openInspector(chest)}
                  className={`col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl cursor-pointer transition-all hover:scale-105 ${
                    isNext
                      ? "bg-gradient-to-b from-yellow-500/15 via-yellow-950/20 to-transparent border border-yellow-400/50 shadow-[0_0_14px_rgba(250,204,21,0.18)]"
                      : isPassed
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* Top Tag */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      isNext
                        ? "bg-yellow-400 text-slate-950 font-black shadow-sm"
                        : "bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    DAY 21
                  </span>

                  {/* Chest Artwork */}
                  <div className="h-[76px] flex items-center justify-center my-1 transition-transform hover:-translate-y-1">
                    <StreakHeroArtwork type="gold" size={68} />
                  </div>

                  {/* Reward Labels */}
                  <div className="h-[38px] flex flex-col justify-center">
                    <span className="text-xs font-black text-white truncate block">
                      {chest.title}
                    </span>
                    <span className="text-xs font-black font-mono text-yellow-300">
                      +{chest.coins.toLocaleString()}
                    </span>
                  </div>

                  {/* Goal Gradient Micro-Pill */}
                  <div className="my-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 shadow-xs">
                      {Math.min(completedDays, 21)} / 21 DAYS
                    </span>
                  </div>

                  {/* Waypoint Node */}
                  <div className="my-1 flex items-center justify-center z-10 relative">
                    {/* Opaque backing disc — masks the highway line behind this station */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-5 rounded-full bg-[#0f1629]" />
                    </div>
                    <div
                      className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-md ${
                        isPassed
                          ? "bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/50"
                          : isNext
                          ? "bg-yellow-400 border-amber-200 text-slate-950 shadow-[0_0_14px_rgba(250,204,21,0.85)] animate-pulse"
                          : "bg-slate-900 border-white/20 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-bold font-mono">21</span>
                      )}
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="mt-1">
                    {isPassed ? (
                      <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">
                        Collected
                      </span>
                    ) : isNext ? (
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                        {daysToNextMilestone === 0 ? "Ready!" : `Opens in ${daysToNextMilestone}d`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 justify-center">
                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                        Day 21 Goal
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 5. GRAND CLIMAX — DIAMOND CROWN VAULT (Day 30) — 4 cols */}
            {(() => {
              const chest = MILESTONES_CATALOG[3];
              const isPassed = completedDays >= chest.day;

              return (
                <div
                  key={chest.day}
                  onClick={() => openInspector(chest)}
                  className="group col-span-4 relative p-4 rounded-2xl border-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-[1.04] overflow-hidden
                             bg-gradient-to-b from-[#101935] via-[#131b38] to-[#0c1020]
                             border-cyan-300 shadow-[0_0_46px_rgba(56,189,248,0.5)] ring-2 ring-cyan-300/60"
                >
                  {/* Extra ambient wash behind the whole card */}
                  <div className="absolute inset-[-20%] bg-gradient-to-br from-cyan-500/15 via-violet-500/10 to-amber-400/15 blur-2xl pointer-events-none" />
                  {/* Hover shine sweep */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  {/* Top Badge Ribbon */}
                  <span className="relative px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-md flex items-center gap-1 font-mono">
                    <Crown className="w-3 h-3 text-slate-950" />
                    ULTIMATE VAULT · DAY 30
                  </span>

                  {/* Grand Diamond Chest */}
                  <div className="relative h-[96px] flex items-center justify-center mt-4 mb-1 transition-transform group-hover:scale-105">
                    <StreakHeroArtwork type="diamond" size={98} />
                  </div>

                  {/* High-Impact Reward Numbers */}
                  <div className="relative h-[38px] flex flex-col justify-center w-full">
                    <div className="text-2xl font-black font-mono text-yellow-300 drop-shadow-md leading-tight">
                      {chest.coins.toLocaleString()} COINS
                    </div>
                    <div className="text-[10px] font-bold text-cyan-200 mt-0.5">
                      Monthly Champion Crown + Shield
                    </div>
                  </div>

                  {/* Grand Spoils Banner */}
                  <div className="relative mt-2 pt-1.5 border-t border-cyan-400/25 w-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-black text-amber-200">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                      GRAND PRIZE POOL: {totalCoinsAvailable.toLocaleString()} COINS
                    </span>
                    <span className="text-cyan-300/80 font-semibold normal-case text-[9px]">
                      ≈ {Math.floor(totalCoinsAvailable / 100)} free room entries
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 3. Floating Tap-To-Inspect Popover Tooltip — anchored under
            whichever chest was actually tapped (via `anchorPct`), instead
            of always opening dead-center regardless of which one it was. */}
        <AnimatePresence>
          {inspectMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={reduce ? { duration: 0 } : undefined}
              className="absolute top-6 z-30 max-w-sm w-[calc(100%-2rem)] sm:w-full p-4 rounded-2xl
                         bg-[#0e1424]/98 border-2 border-amber-400 text-white shadow-2xl backdrop-blur-xl"
              style={{
                left: `${Math.min(Math.max(inspectMilestone.anchorPct, 20), 80)}%`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400" />
                  {inspectMilestone.detail.title} (Day {inspectMilestone.detail.day})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectMilestone(null);
                  }}
                  className="min-h-[28px] min-w-[28px] rounded-full hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-2.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-300/80 block mb-1.5">
                  Guaranteed Loot Inside:
                </span>
                <ul className="space-y-1.5 text-xs font-medium">
                  {inspectMilestone.detail.contains.map((item: string) => (
                    <li key={item} className="flex items-center gap-2 text-slate-200">
                      <Flame className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-white/10 text-right">
                <button
                  type="button"
                  onClick={() => setInspectMilestone(null)}
                  className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3b. Coming Up — the individual daily rewards for the next few
            days, not just the next milestone. Restores visibility of the
            escalating day-to-day curve for the ~26 non-milestone days that
            the checkpoint road otherwise hides entirely, which is exactly
            the stretch where "why bother today" retention drop-off happens. */}
        {upcomingDays.length > 0 && (
          <div className="mt-5 pt-3.5 border-t border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Coming Up
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {upcomingDays.map((d) => (
                <div
                  key={d.day}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold ${
                    d.milestoneChest
                      ? "bg-violet-500/10 border-violet-400/40 text-violet-200"
                      : "bg-white/5 border-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-[10px] font-black text-slate-400">D{d.day}</span>
                  <span className="font-mono">+{d.coins.toLocaleString()}</span>
                  {d.milestoneChest && <Gift className="w-3 h-3 text-violet-300" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Integrated Seamless Bottom Action Bar */}
        <div className="mt-5 pt-3.5 border-t border-white/10">
          {/* Campaign summary banner — replaces a footer that previously
              contributed almost nothing ("Tap any chest to inspect loot").
              This reframes the whole 30 days as one payoff, the way a
              season-pass screen sells the destination, not just the next
              step. */}
          <div className="mb-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-violet-500/15 to-cyan-500/15 border border-amber-400/30 flex items-center justify-center gap-2 text-center flex-wrap shadow-inner">
            <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-xs font-black text-amber-300 font-mono tracking-wide">★ EXPEDITION GRAND SPOILS:</span>
            <span className="text-xs font-black text-white font-mono">
              {totalCoinsAvailable.toLocaleString()} Coins
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-bold text-slate-200">4 Grand Chests</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-black text-cyan-300 flex items-center gap-1">
              <Crown className="w-3 h-3 text-cyan-300" />
              Champion Crown + Shield
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-2 flex-wrap">
              {longestStreak > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-200 font-bold text-[11px]">
                  <Trophy className="w-3 h-3 text-amber-300" />
                  Best: {longestStreak}d
                </span>
              )}
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${reduce ? "" : "animate-pulse"}`} />
              <span className="text-amber-200/90 font-medium flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                Tap any milestone chest to inspect guaranteed loot.
              </span>
            </div>

            <div>
            {isClaimable ? (
              <button
                type="button"
                onClick={handleClaim}
                disabled={isClaiming}
                className="min-h-[44px] px-6 py-2 rounded-xl font-black text-xs uppercase tracking-wider
                           bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300
                           text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.45)] cursor-pointer active:scale-95
                           flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <Flame className="w-4 h-4 fill-slate-950/20" />
                <span>Claim Day {todayDay} (+{todayReward.coins})</span>
              </button>
            ) : (
              // The header's "Today's Reward" button already gets a player
              // back to Screen 1 from anywhere on this screen — a second,
              // identical "Back to Today" action down here was pure
              // duplication. This slot now surfaces the one thing the
              // header button doesn't: exactly when the next reward opens.
              <div className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Claimed — next in</span>
                <span className="font-mono text-amber-300">{timeUntilReset}</span>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;

