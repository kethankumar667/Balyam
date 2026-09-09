import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowLeft,
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

export function DailyStreakModalDesktop({ onClose, onBack }: DailyStreakModalDesktopProps) {
  const { state, isClaiming, claimToday } = useStreakStore();

  const currentStreak = state?.currentStreak ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];

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
  const [inspectMilestone, setInspectMilestone] = useState<MilestoneChestDetail | null>(null);

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
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
                Rewards Expedition
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                Day {completedDays} of 30
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              4 Grand Milestone Chests along the monthly road
            </p>
          </div>
        </div>

        {/* Status Chip & Close Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-xs font-black text-amber-200 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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
          {/* THE EXPEDITION HIGHWAY: Positioned at the base across waypoint nodes */}
          <div className="absolute top-[166px] left-[4%] right-[4%] h-2.5 rounded-full bg-slate-950 border border-white/10 shadow-inner z-0 overflow-hidden p-0.5">
            {/* Luminous Animated Beam */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-cyan-400 shadow-[0_0_16px_rgba(245,158,11,0.9)]"
            />
          </div>

          {/* STATIONS ROW (Grid of 5 Expeditions: Start, Bronze, Silver, Gold, Diamond Finale) */}
          <div className="relative z-10 grid grid-cols-12 gap-3 items-stretch">
            {/* 1. START CHECKPOINT (Day 1) — 2 cols */}
            <div className="col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl transition-all">
              {/* Top Tag */}
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10">
                START
              </span>

              {/* Start Artwork */}
              <div className="h-[76px] flex items-center justify-center my-1">
                <div
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${
                    completedDays >= 1
                      ? "bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/40"
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
                  <span className="text-[10px] font-black text-emerald-400">Claimed</span>
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
                  onClick={() => {
                    HapticsManager.trigger("subtle");
                    AudioManager.play(AUDIO.UI_CLICK);
                    setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
                  }}
                  className={`col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl cursor-pointer transition-all hover:scale-105 ${
                    isNext
                      ? "bg-gradient-to-b from-amber-500/15 via-amber-950/20 to-transparent border border-amber-400/50 shadow-[0_0_28px_rgba(205,127,50,0.25)]"
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
                  <div className="h-[76px] flex items-center justify-center my-1">
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

                  {/* Waypoint Node (Centered directly on the highway line) */}
                  <div className="my-1.5 flex items-center justify-center z-10 relative">
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
                      <span className="text-[10px] font-black text-emerald-400">Claimed</span>
                    ) : isNext ? (
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                        {daysToNextMilestone}d away
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Locked</span>
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
                  onClick={() => {
                    HapticsManager.trigger("subtle");
                    AudioManager.play(AUDIO.UI_CLICK);
                    setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
                  }}
                  className={`col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl cursor-pointer transition-all hover:scale-105 ${
                    isNext
                      ? "bg-gradient-to-b from-slate-300/15 via-slate-800/20 to-transparent border border-slate-300/50 shadow-[0_0_28px_rgba(203,213,225,0.25)]"
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
                  <div className="h-[76px] flex items-center justify-center my-1">
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

                  {/* Waypoint Node */}
                  <div className="my-1.5 flex items-center justify-center z-10 relative">
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
                      <span className="text-[10px] font-black text-emerald-400">Claimed</span>
                    ) : isNext ? (
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                        {daysToNextMilestone}d away
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Locked</span>
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
                  onClick={() => {
                    HapticsManager.trigger("subtle");
                    AudioManager.play(AUDIO.UI_CLICK);
                    setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
                  }}
                  className={`col-span-2 relative flex flex-col items-center justify-between text-center p-2 rounded-2xl cursor-pointer transition-all hover:scale-105 ${
                    isNext
                      ? "bg-gradient-to-b from-yellow-500/15 via-yellow-950/20 to-transparent border border-yellow-400/50 shadow-[0_0_28px_rgba(250,204,21,0.25)]"
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
                  <div className="h-[76px] flex items-center justify-center my-1">
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

                  {/* Waypoint Node */}
                  <div className="my-1.5 flex items-center justify-center z-10 relative">
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
                      <span className="text-[10px] font-black text-emerald-400">Claimed</span>
                    ) : isNext ? (
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                        {daysToNextMilestone}d away
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Locked</span>
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
                  onClick={() => {
                    HapticsManager.trigger("subtle");
                    AudioManager.play(AUDIO.UI_CLICK);
                    setInspectMilestone(inspectMilestone?.day === chest.day ? null : chest);
                  }}
                  className="col-span-4 relative p-3.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-103
                             bg-gradient-to-b from-[#101935] via-[#131b38] to-[#0c1020]
                             border-cyan-400/80 shadow-[0_0_32px_rgba(56,189,248,0.35)] ring-1 ring-cyan-300/40"
                >
                  {/* Top Badge Ribbon */}
                  <span className="px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-sm flex items-center gap-1">
                    <Crown className="w-3 h-3 text-slate-950" />
                    GRAND FINALE · DAY 30
                  </span>

                  {/* Grand Diamond Chest */}
                  <div className="h-[76px] flex items-center justify-center my-1">
                    <StreakHeroArtwork type="diamond" size={78} />
                  </div>

                  {/* High-Impact Reward Numbers */}
                  <div className="h-[38px] flex flex-col justify-center w-full">
                    <div className="text-xl font-black font-mono bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-md leading-tight">
                      10,000 COINS
                    </div>
                    <div className="text-[10px] font-bold text-cyan-200 mt-0.5">
                      Monthly Champion Crown + Shield
                    </div>
                  </div>

                  {/* Grand Spoils Banner */}
                  <div className="mt-2 pt-1.5 border-t border-cyan-400/25 w-full flex items-center justify-center gap-1.5 text-[10px] font-black text-amber-200">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>35,800 Total Coins Available</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 3. Floating Tap-To-Inspect Popover Tooltip */}
        <AnimatePresence>
          {inspectMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-sm w-full p-4 rounded-2xl
                         bg-[#0e1424]/98 border-2 border-amber-400 text-white shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400" />
                  {inspectMilestone.title} (Day {inspectMilestone.day})
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
                  {inspectMilestone.contains.map((item: string) => (
                    <li key={item} className="flex items-center gap-2 text-slate-200">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
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

        {/* 4. Integrated Seamless Bottom Action Bar */}
        <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Tap any milestone chest along the road to inspect guaranteed loot.</span>
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
                <Sparkles className="w-4 h-4 fill-slate-950/20" />
                <span>Claim Day {todayDay} (+{todayReward.coins})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                className="min-h-[44px] px-6 py-2 rounded-xl font-black text-xs uppercase tracking-wider
                           bg-white/10 hover:bg-white/20 text-white border border-white/15
                           shadow-sm cursor-pointer active:scale-95 transition-all
                           flex items-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <ArrowLeft className="w-4 h-4 text-amber-300" />
                <span>Back to Today</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;

