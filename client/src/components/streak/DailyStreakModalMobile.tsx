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

interface DailyStreakModalMobileProps {
  onClose: () => void;
}

interface MilestoneMeta {
  day: number;
  title: string;
  badge: string;
  coins: number;
  perk: string;
}

const MILESTONES: MilestoneMeta[] = [
  {
    day: 7,
    title: "Bronze Chest",
    badge: "Bronze Tier",
    coins: 1000,
    perk: "'Early Bird' Title",
  },
  {
    day: 14,
    title: "Silver Chest",
    badge: "Silver Tier",
    coins: 2500,
    perk: "Exclusive Emojis",
  },
  {
    day: 21,
    title: "Gold Chest",
    badge: "Gold Tier",
    coins: 5000,
    perk: "Solar Flare Frame",
  },
  {
    day: 30,
    title: "Diamond Crown",
    badge: "Diamond Tier",
    coins: 10000,
    perk: "Champion + Shield",
  },
];

export function DailyStreakModalMobile({ onClose }: DailyStreakModalMobileProps) {
  const { state, isClaiming, claimToday, timeUntilReset, updateTimeRemaining } =
    useStreakStore();

  const currentStreak = state?.currentStreak ?? 0;
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

  // Progression calculation
  const completedDays = isClaimable ? Math.max(0, todayDay - 1) : todayDay;
  const progressPercent = Math.min(100, Math.round((completedDays / 30) * 100));

  // Next milestone
  const nextMilestone =
    MILESTONES.find((m) => m.day > completedDays) ?? MILESTONES[3];
  const daysToNextMilestone = Math.max(0, nextMilestone.day - completedDays);

  // Determine which week the user is currently in (0..3)
  const currentWeekIndex = Math.min(Math.floor((todayDay - 1) / 7), 3);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeekIndex);
  const [viewAll, setViewAll] = useState<boolean>(false);

  // Tick the countdown timer every second
  useEffect(() => {
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  const handleTabChange = (weekIdx: number) => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    setViewAll(false);
    setSelectedWeek(weekIdx);
  };

  const handleToggleViewAll = () => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    setViewAll(!viewAll);
  };

  const handleClaim = () => {
    HapticsManager.trigger("reward");
    AudioManager.play(AUDIO.REWARD_COIN);
    void claimToday();
  };

  // Week ranges: W1 (1-7), W2 (8-14), W3 (15-21), W4 (22-30)
  const getWeekDays = (weekIdx: number) => {
    const start = weekIdx * 7 + 1;
    const end = weekIdx === 3 ? 30 : (weekIdx + 1) * 7;
    return schedule.filter((s) => s.day >= start && s.day <= end);
  };

  const weekMilestone = MILESTONES[selectedWeek];
  const displayedDays = viewAll ? schedule : getWeekDays(selectedWeek);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Login Streak Challenge & Rewards"
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_e, info) => {
        if (info.offset.y > 100) {
          AudioManager.play(AUDIO.UI_POPUP_CLOSE);
          onClose();
        }
      }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={bhalyamSpring}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col rounded-t-[32px]
                 bg-[var(--chrome-panel)] border-t-2 border-[var(--chrome-border)]
                 shadow-[0_-12px_40px_rgba(0,0,0,0.3)] overflow-hidden pb-safe"
    >
      {/* 1. Top Tactile Grab Handle */}
      <div className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600">
        <div className="w-12 h-1.5 rounded-full bg-white/50 hover:bg-white/70 transition-colors" />
      </div>

      {/* 2. Header Bar — High Energy Hook */}
      <div className="relative px-4 pt-1.5 pb-3 flex items-center justify-between bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.4), transparent 35%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/20 border-2 border-white/50 shadow-inner">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white tracking-tight">
                LOGIN STREAK CHALLENGE
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/25 text-amber-200 border border-amber-300/40 font-mono font-black">
                🔥 {currentStreak} Days
              </span>
            </div>
            <p className="text-[11px] text-white/90 font-medium">
              Claim daily rewards to unlock Grand Chests
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            AudioManager.play(AUDIO.UI_POPUP_CLOSE);
            onClose();
          }}
          aria-label="Close Streak Modal"
          className="relative min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center
                     text-white hover:bg-white/20 cursor-pointer transition-colors
                     focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 3. Cycle Journey Progress Bar */}
      <div className="px-4 py-2 bg-[var(--chrome-control)] border-b border-[var(--chrome-hairline)]">
        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--chrome-ink-soft)] mb-1">
          <span className="flex items-center gap-1 text-[var(--chrome-ink)] font-black">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Day {completedDays} of 30 ({progressPercent}%)
          </span>
          <span className="text-amber-800 dark:text-amber-300 font-bold">
            {nextMilestone.title} in {daysToNextMilestone}d
          </span>
        </div>

        <div className="relative w-full h-2 bg-[var(--chrome-panel)] rounded-full border border-[var(--chrome-border)] overflow-visible">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 shadow-sm"
          />

          {MILESTONES.map((m) => {
            const pinPercent = (m.day / 30) * 100;
            const isPassed = completedDays >= m.day;
            const isNext = nextMilestone.day === m.day && !isPassed;

            return (
              <div
                key={m.day}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `${pinPercent}%` }}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    isPassed
                      ? "bg-emerald-500 border-white text-white shadow-xs"
                      : isNext
                      ? "bg-amber-500 border-white text-white scale-125 ring-1 ring-amber-400 animate-pulse"
                      : "bg-[var(--chrome-control)] border-[var(--chrome-border)]"
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-2 h-2 stroke-[3]" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-current" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* DOMINANT HERO REWARD CARD */}
        {isClaimable ? (
          /* READY TO CLAIM HERO */
          <div className="relative p-4.5 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_8px_24px_-4px_rgba(245,158,11,0.5)] overflow-hidden border-2 border-amber-300/40 text-center">
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 75% 25%, rgba(255,255,255,0.4), transparent 45%)",
              }}
            />

            <div className="relative flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-200" />
                Today's Reward · Day {activeDay}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/25 text-amber-200">
                Ready to Claim
              </span>
            </div>

            <div className="relative my-1 flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/60 flex items-center justify-center shadow-md mb-1.5"
              >
                <Coins className="w-7 h-7 text-amber-200 fill-amber-300" />
              </motion.div>

              <span className="text-3xl font-black font-mono tracking-tight drop-shadow-md">
                +{todayReward.coins.toLocaleString()}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-100 mt-0.5">
                Coins Ready To Claim
              </span>

              {todayReward.specialRewardTitle && (
                <div className="mt-2 px-2.5 py-1 rounded-xl bg-black/20 border border-white/30 text-[11px] font-bold flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Includes: {todayReward.specialRewardTitle}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CLAIMED REWARD + MOTIVATION */
          <div className="space-y-2.5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-amber-500/10 to-emerald-500/20 border-2 border-emerald-500/40 text-[var(--chrome-ink)] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      +{todayReward.coins.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      COINS CLAIMED TODAY ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--chrome-ink-soft)] font-medium">
                    Day {activeDay} secured! Your streak is burning hot.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Split Teaser Strip: Tomorrow Preview & Next Chest */}
        <div className="grid grid-cols-2 gap-2">
          {/* Tomorrow Preview */}
          <div className="p-2.5 rounded-2xl bg-[var(--chrome-control)] border-2 border-[var(--chrome-border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--chrome-ink-soft)] mb-1">
              <span className="flex items-center gap-1 text-amber-800 dark:text-amber-300">
                <Zap className="w-3 h-3 text-amber-500" />
                Tomorrow (D{tomorrowDay})
              </span>
            </div>
            <div className="text-sm font-black font-mono text-[var(--chrome-ink)] flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
              +{tomorrowReward.coins.toLocaleString()} Coins
            </div>
            <div className="text-[10px] text-[var(--chrome-ink-soft)] flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              In {timeUntilReset}
            </div>
          </div>

          {/* Next Grand Chest */}
          <div className="p-2.5 rounded-2xl bg-[var(--chrome-control)] border-2 border-[var(--chrome-border)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-[var(--chrome-ink-soft)] mb-1">
              <span className="flex items-center gap-1 text-violet-700 dark:text-violet-300">
                <Gift className="w-3 h-3 text-violet-500" />
                Next Chest
              </span>
            </div>
            <div className="text-xs font-black text-[var(--chrome-ink)] truncate">
              {nextMilestone.title}
            </div>
            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
              +{nextMilestone.coins.toLocaleString()} ({daysToNextMilestone}d left)
            </div>
          </div>
        </div>

        {/* 6. Week Selector Tabs */}
        <div className="pt-1 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["Week 1", "Week 2", "Week 3", "Week 4+"].map((label, idx) => {
            const isSelected = !viewAll && selectedWeek === idx;
            const isWeekActive = Math.min(Math.floor((todayDay - 1) / 7), 3) === idx;

            return (
              <button
                type="button"
                key={label}
                onClick={() => handleTabChange(idx)}
                className={`relative flex-1 min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none text-center border-2
                           focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                             isSelected
                               ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-500 text-white shadow-sm"
                               : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]"
                           }`}
              >
                <span>{label}</span>
                {isWeekActive && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleToggleViewAll}
            className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none border-2
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                         viewAll
                           ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                           : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]"
                       }`}
          >
            All 30
          </button>
        </div>

        {/* 7. Milestone Highlight Banner (for active/selected week) */}
        {!viewAll && weekMilestone && (
          <div className="p-2.5 rounded-2xl border-2 border-violet-400/50 bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-white/20 border border-white/30">
                {weekMilestone.day === 30 ? (
                  <Crown className="w-4 h-4 text-cyan-200" />
                ) : (
                  <Gift className="w-4 h-4 text-yellow-200" />
                )}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-white/80 block">
                  Week {selectedWeek + 1} Grand Chest
                </span>
                <span className="font-black text-xs">
                  Day {weekMilestone.day}: {weekMilestone.title}
                </span>
              </div>
            </div>
            <span className="font-mono font-black text-xs text-amber-200">
              +{weekMilestone.coins.toLocaleString()} Coins
            </span>
          </div>
        )}

        {/* 8. Day Grid — Nodes with EXPLICIT COINS (NO "?") */}
        <div
          className={`grid ${
            viewAll ? "grid-cols-5 gap-x-1.5 gap-y-3" : "grid-cols-4 sm:grid-cols-7 gap-x-2 gap-y-3"
          }`}
        >
          {displayedDays.map((item) => {
            const isToday = isClaimable && item.day === activeDay;
            const isMilestone = Boolean(item.milestoneChest);
            const isClaimed = item.status === "CLAIMED";
            const isLocked = item.status === "LOCKED";
            const isCrown = item.day === 30;

            let nodeStyle =
              "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]";
            if (isClaimed) {
              nodeStyle =
                "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-xs";
            } else if (isToday) {
              nodeStyle =
                "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-200 text-white shadow-sm scale-110";
            } else if (isCrown) {
              nodeStyle =
                "bg-gradient-to-br from-cyan-400 to-violet-600 border-cyan-200 text-white shadow-xs";
            } else if (isMilestone) {
              nodeStyle =
                "bg-gradient-to-br from-violet-400 to-violet-600 border-violet-200 text-white shadow-xs";
            }

            return (
              <div
                key={item.day}
                className="relative flex flex-col items-center gap-1 select-none"
              >
                <span
                  className={`text-[9px] font-black uppercase tracking-wider ${
                    isToday ? "text-amber-800 dark:text-amber-300" : "text-[var(--chrome-ink-soft)]"
                  }`}
                >
                  D{item.day}
                </span>

                <span
                  className={`relative w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-transform ${nodeStyle}`}
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
                    <Coins className="w-4 h-4" />
                  )}

                  {isToday && (
                    <span className="absolute -inset-1 rounded-2xl border-2 border-amber-400 animate-ping opacity-60" />
                  )}
                </span>

                {/* REWARD AMOUNT — ALWAYS VISIBLE (NO MYSTERY ?) */}
                <span
                  className={`text-[10px] font-black font-mono tracking-tight ${
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
              </div>
            );
          })}
        </div>

        {/* Protection Shield Indicator */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-[var(--chrome-ink-soft)]">
          <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold">
            <Shield className="w-3.5 h-3.5 fill-sky-500/20" />
            <span>{shieldsRemaining} Streak Shield{shieldsRemaining !== 1 ? "s" : ""} Active</span>
          </div>
          <span>Cycle {cycleCount + 1}</span>
        </div>
      </div>

      {/* 9. Bottom Sticky Action Footer */}
      <div className="p-4 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]">
        {isClaimable ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
            disabled={isClaiming}
            className="group relative w-full min-h-[52px] py-3.5 px-6 rounded-2xl font-black text-base
                       bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white
                       shadow-[0_8px_24px_-4px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-2.5
                       overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400
                       before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full
                       before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent
                       before:transition-transform before:duration-700"
          >
            {isClaiming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Claiming Reward…
              </span>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-yellow-200 animate-spin" />
                <span>CLAIM +{todayReward.coins.toLocaleString()} COINS NOW</span>
              </>
            )}
          </motion.button>
        ) : (
          <div className="min-h-[52px] py-2.5 px-4 rounded-2xl bg-[var(--chrome-control)] border-2 border-[var(--chrome-border)] text-center flex flex-col items-center justify-center">
            <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              COME BACK TOMORROW FOR +{tomorrowReward.coins.toLocaleString()} COINS
            </span>
            <span className="text-[10px] text-[var(--chrome-ink-soft)] font-mono font-medium mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Unlocks at 00:00 UTC (in {timeUntilReset})
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;

