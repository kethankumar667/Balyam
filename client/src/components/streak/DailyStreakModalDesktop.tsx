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
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import type { StreakScheduledDay } from "@shared/streak-types";

interface DailyStreakModalDesktopProps {
  onClose: () => void;
}

const DAYS_PER_ROW = 6;

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

  const [inspectedDay, setInspectedDay] = useState<number>(() => {
    return isClaimable ? activeDay : Math.min(activeDay, 30);
  });

  // Tick countdown timer every second
  useEffect(() => {
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  const activeInspected =
    schedule.find((s) => s.day === inspectedDay) ??
    schedule.find((s) => s.day === activeDay) ??
    schedule[0];

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

  // Milestone tier visuals for the inspector card — bold, saturated, white-
  // on-color treatments (this is the rewards centerpiece of the app; it's
  // meant to compete visually with other gamified apps' streak screens, not
  // blend into the neutral chrome UI shell).
  const getMilestoneVisuals = (day: number) => {
    switch (day) {
      case 7:
        return {
          title: "Bronze Chest",
          badge: "Bronze Tier",
          card: "bg-gradient-to-br from-amber-500 to-orange-600",
        };
      case 14:
        return {
          title: "Silver Chest",
          badge: "Silver Tier",
          card: "bg-gradient-to-br from-slate-400 to-slate-600",
        };
      case 21:
        return {
          title: "Gold Chest",
          badge: "Gold Tier",
          card: "bg-gradient-to-br from-yellow-400 to-amber-600",
        };
      case 30:
        return {
          title: "Diamond Crown Chest",
          badge: "Diamond Crown",
          card: "bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-600",
        };
      default:
        return {
          title: "Daily Supply",
          badge: "Daily",
          card: "bg-gradient-to-br from-amber-400 to-orange-500",
        };
    }
  };

  const inspectedVisuals = getMilestoneVisuals(activeInspected?.day ?? 1);

  // Chunk the 30-day schedule into rows so each row can draw its own
  // connecting progress line behind the day nodes (board-game path feel).
  const rows: StreakScheduledDay[][] = [];
  for (let i = 0; i < schedule.length; i += DAYS_PER_ROW) {
    rows.push(schedule.slice(i, i + DAYS_PER_ROW));
  }
  const reachedDay = isClaimable ? activeDay : Math.max(activeDay - 1, 0);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Login Streak & Milestones"
      initial={{ scale: 0.94, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 12 }}
      transition={bhalyamSpring}
      className="relative z-50 w-full max-w-5xl rounded-3xl bg-[var(--chrome-panel)]
                 border-2 border-[var(--chrome-border)]
                 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)]
                 overflow-hidden flex flex-col"
    >
      {/* Hero Band — bold flame gradient, the visual centerpiece */}
      <div className="relative px-6 py-5 flex items-center justify-between bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.35), transparent 35%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.25), transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/25 border-2 border-white/50 shadow-inner">
            <Flame className="w-7 h-7 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                30-Day Daily Login Streak
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/25 text-white border border-white/50 font-mono">
                🔥 {currentStreak} Days
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/40 font-bold">
                Cycle {cycleCount + 1}
              </span>
            </div>
            <p className="text-xs text-white/90 font-semibold">
              Log in daily to claim escalating coin grants and unlock 4 Grand Milestone Chests
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/20 border border-white/40 text-xs font-bold text-white">
            <Clock className="w-4 h-4" />
            <span className="text-white/80">Reset in:</span>
            <span className="font-mono font-black">{timeUntilReset}</span>
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

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[var(--chrome-hairline)]">
        {/* Left 2 Cols: 30-Day Path */}
        <div className="lg:col-span-2 p-6 overflow-y-auto max-h-[530px] bg-[var(--chrome-panel)]">
          {/* Calendar Header with Quick Legend */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                Streak Calendar — Cycle {cycleCount + 1}
              </h3>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-400/40">
                Day {isClaimable ? activeDay : Math.min(activeDay, 30)} of 30
              </span>
            </div>

            {/* Micro Legend */}
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
                Chest
              </span>
            </div>
          </div>

          {/* Day Path — rows of connected circular nodes */}
          <div className="space-y-5">
            {rows.map((row, rowIdx) => {
              const rowReached = row[0].day <= Math.max(reachedDay, 1);
              return (
                <div key={rowIdx} className="relative">
                  {/* Connecting progress line, drawn behind the nodes */}
                  <div
                    className={`absolute top-7 left-7 right-7 h-1 rounded-full ${
                      rowReached ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-[var(--chrome-border)]/40"
                    }`}
                  />
                  <div className="relative flex items-start justify-between">
                    {row.map((item) => {
                      const isToday = isClaimable && item.day === activeDay;
                      const isMilestone = Boolean(item.milestoneChest);
                      const isSelected = inspectedDay === item.day;
                      const isClaimed = item.status === "CLAIMED";
                      const isLocked = item.status === "LOCKED";
                      const isCrown = item.day === 30;

                      let nodeStyle =
                        "bg-[var(--chrome-panel)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]";
                      if (isClaimed) {
                        nodeStyle = "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-[0_4px_12px_rgba(16,185,129,0.4)]";
                      } else if (isToday) {
                        nodeStyle = "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-200 text-white shadow-[0_4px_16px_rgba(245,158,11,0.55)] scale-110";
                      } else if (isCrown) {
                        nodeStyle = "bg-gradient-to-br from-cyan-400 to-violet-600 border-cyan-200 text-white shadow-[0_4px_14px_rgba(56,189,248,0.4)]";
                      } else if (isMilestone) {
                        nodeStyle = "bg-gradient-to-br from-violet-400 to-violet-600 border-violet-200 text-white shadow-[0_4px_14px_rgba(139,92,246,0.4)]";
                      }

                      return (
                        <button
                          type="button"
                          key={item.day}
                          onClick={() => handleSelectDay(item.day)}
                          className={`group relative flex flex-col items-center gap-1.5 cursor-pointer select-none
                                     focus-visible:outline-hidden`}
                          style={{ width: `${100 / DAYS_PER_ROW}%` }}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                            D{item.day}
                          </span>

                          <motion.span
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.94 }}
                            transition={bhalyamSpring}
                            className={`relative w-13 h-13 rounded-full border-2 flex items-center justify-center transition-transform
                                       ${nodeStyle} ${isSelected ? "ring-2 ring-offset-2 ring-offset-[var(--chrome-panel)] ring-violet-500" : ""}`}
                          >
                            {isClaimed ? (
                              <Check className="w-6 h-6 stroke-[3]" />
                            ) : isCrown ? (
                              <Crown className="w-6 h-6" />
                            ) : isMilestone ? (
                              <Gift className="w-6 h-6" />
                            ) : isLocked ? (
                              <Lock className="w-4.5 h-4.5 opacity-70" />
                            ) : (
                              <Coins className="w-5 h-5" />
                            )}

                            {isToday && (
                              <span className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-60" />
                            )}
                          </motion.span>

                          <span className="text-[11px] font-black font-mono tracking-tight text-[var(--chrome-ink)]">
                            {isLocked ? "?" : item.coins >= 1000 ? `${item.coins / 1000}k` : item.coins}
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

        {/* Right 1 Col: Milestone Inspector & CTA */}
        <div className="p-6 flex flex-col justify-between bg-[var(--chrome-control)]">
          <div>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border-2 border-[var(--chrome-border)] text-center">
                <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                  Longest Streak
                </span>
                <span className="text-lg font-black text-[var(--chrome-ink)] font-mono">
                  {longestStreak} Days
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border-2 border-[var(--chrome-border)] text-center">
                <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                  Shields Active
                </span>
                <span className="text-lg font-black text-sky-600 dark:text-sky-400 font-mono flex items-center justify-center gap-1.5">
                  <Shield className="w-4 h-4 fill-sky-500/20" />
                  {shieldsRemaining}
                </span>
              </div>
            </div>

            {/* Interactive Day / Milestone Inspector Card — bold solid tier gradient */}
            <div
              className={`relative p-4.5 rounded-2xl transition-colors duration-200 ${inspectedVisuals.card} mb-5 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)]`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
                  Day {activeInspected?.day} Inspection
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-white/90">
                  {inspectedVisuals.badge}
                </span>
              </div>

              {activeInspected?.status === "LOCKED" ? (
                <>
                  <h4 className="text-lg font-black mb-1 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Mystery Reward
                  </h4>
                  <p className="text-xs text-white/85 mb-3 leading-relaxed">
                    Come back on Day {activeInspected.day} to reveal what's waiting for you.
                  </p>
                  <div className="p-2.5 rounded-xl bg-black/15 border border-white/20 flex items-center justify-center gap-2 text-xs font-bold text-white/85">
                    <Lock className="w-3.5 h-3.5" />
                    Locked until Day {activeInspected.day}
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-black mb-1 flex items-center gap-2">
                    {activeInspected?.day === 30 ? (
                      <Crown className="w-5 h-5" />
                    ) : activeInspected?.milestoneChest ? (
                      <Gift className="w-5 h-5" />
                    ) : (
                      <Coins className="w-5 h-5" />
                    )}
                    {inspectedVisuals.title}
                  </h4>

                  <p className="text-xs text-white/85 mb-3 leading-relaxed">
                    {activeInspected?.description}
                  </p>

                  {/* Reward Highlights */}
                  <div className="p-2.5 rounded-xl bg-black/15 border border-white/20 flex items-center justify-between text-xs">
                    <span className="font-medium text-white/85">Reward Coins:</span>
                    <span className="font-black font-mono text-sm flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      +{activeInspected?.coins.toLocaleString()}
                    </span>
                  </div>

                  {activeInspected?.specialRewardTitle && (
                    <div className="mt-2 p-2.5 rounded-xl bg-black/15 border border-white/20 flex items-center gap-2 text-xs">
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-white/70">
                          Bonus Unlock
                        </span>
                        <span className="font-black">
                          {activeInspected.specialRewardTitle}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Milestone Quick Switcher */}
              <div className="mt-4 pt-3 border-t border-white/20">
                <span className="block text-[10px] font-black uppercase tracking-wider text-white/70 mb-1.5">
                  Explore Milestone Chests
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[7, 14, 21, 30].map((mDay) => (
                    <button
                      type="button"
                      key={mDay}
                      onClick={() => handleSelectDay(mDay)}
                      className={`py-1 px-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer text-center border ${
                        inspectedDay === mDay
                          ? "bg-white/25 border-white/50 text-white"
                          : "bg-transparent border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      D{mDay}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Claim Area */}
          <div className="pt-4 border-t border-[var(--chrome-hairline)]">
            {isClaimable ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClaim}
                disabled={isClaiming}
                className="group relative w-full min-h-[54px] py-3.5 px-6 rounded-2xl font-black text-base
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
                    Claiming Day {activeDay}…
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-yellow-200" />
                    <span>Claim Day {activeDay} (+{schedule[activeDay - 1]?.coins ?? 100} Coins)</span>
                  </>
                )}
              </motion.button>
            ) : (
              <div className="min-h-[54px] p-3 rounded-2xl bg-[var(--chrome-panel)] border-2 border-[var(--chrome-border)] text-center flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Today's Reward Claimed</span>
                </div>
                <span className="text-[11px] text-[var(--chrome-ink-soft)] font-medium">
                  Next reward unlocks at 00:00 UTC (in {timeUntilReset})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;
