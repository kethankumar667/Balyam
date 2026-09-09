import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Flame,
  Clock,
  Shield,
  Gift,
  Coins,
  CheckCircle2,
  Sparkles,
  Trophy,
  Award,
  Crown,
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { type StreakRewardItem } from "@shared/streak-types";

interface DailyStreakModalDesktopProps {
  onClose: () => void;
}

export function DailyStreakModalDesktop({ onClose }: DailyStreakModalDesktopProps) {
  const { state, isClaiming, claimToday, timeUntilReset, updateTimeRemaining } =
    useStreakStore();

  const [selectedMilestone, setSelectedMilestone] = useState<number>(7);

  // Tick countdown timer every second
  useEffect(() => {
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const currentStreak = state?.currentStreak ?? 0;
  const longestStreak = state?.longestStreak ?? 0;
  const cycleCount = state?.cycleCount ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;
  const shieldsRemaining = state?.shieldsRemaining ?? 0;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];

  const milestones: StreakRewardItem[] = schedule.filter((s) => Boolean(s.milestoneChest));
  const activeInspected =
    schedule.find((s) => s.day === selectedMilestone) ?? milestones[0];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Login Streak & Milestones"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={bhalyamSpring}
      className="relative z-50 w-full max-w-5xl rounded-3xl bg-[var(--chrome-panel)]
                 border border-[var(--chrome-border)] shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Header Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--chrome-hairline)] bg-[var(--chrome-control)]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-amber-500/20 to-orange-500/30 text-orange-500 border border-amber-500/40">
            <Flame className="w-6 h-6 fill-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[var(--chrome-ink)] tracking-tight">
                30-Day Daily Login Streak
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-500 border border-amber-500/30 font-mono">
                🔥 {currentStreak} Days
              </span>
            </div>
            <p className="text-xs text-[var(--chrome-ink-soft)] font-medium">
              Log in every day to claim escalating coins and unlock 4 Grand Milestone Chests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* UTC Countdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-xs font-bold text-[var(--chrome-ink)]">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Reset in:</span>
            <span className="font-mono text-amber-500 font-black">{timeUntilReset}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Streak Modal"
            className="w-10 h-10 rounded-full flex items-center justify-center
                       text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]
                       hover:bg-[var(--chrome-panel)] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[var(--chrome-hairline)]">
        {/* Left 2 Cols: 30-Day Matrix */}
        <div className="lg:col-span-2 p-6 overflow-y-auto max-h-[520px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
              Streak Calendar — Cycle {cycleCount + 1}
            </h3>
            <span className="text-xs font-bold text-[var(--chrome-ink-soft)]">
              Day {isClaimable ? activeDay : Math.min(activeDay, 30)} of 30
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
            {schedule.map((item) => {
              const isToday = isClaimable && item.day === activeDay;
              const isMilestone = Boolean(item.milestoneChest);

              let cardStyle =
                "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:border-zinc-500/50";
              if (item.status === "CLAIMED") {
                cardStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-500";
              } else if (isToday) {
                cardStyle =
                  "bg-gradient-to-b from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-amber-500 text-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/15";
              } else if (isMilestone) {
                cardStyle =
                  "bg-purple-500/10 border-purple-500/40 text-purple-400 hover:border-purple-400/80";
              }

              return (
                <button
                  type="button"
                  key={item.day}
                  onClick={() => {
                    if (isMilestone) setSelectedMilestone(item.day);
                  }}
                  className={`relative min-h-[72px] rounded-2xl border p-2 flex flex-col items-center justify-between transition-all select-none text-left
                              ${cardStyle} ${isMilestone ? "cursor-pointer" : "cursor-default"}`}
                >
                  {/* Top Day Number */}
                  <div className="w-full flex items-center justify-between text-[10px] font-black uppercase">
                    <span>D{item.day}</span>
                    {isMilestone && (
                      <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-400 font-bold">
                        CHEST
                      </span>
                    )}
                  </div>

                  {/* Icon Center */}
                  <div className="my-0.5">
                    {item.status === "CLAIMED" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : item.day === 30 ? (
                      <Crown className={`w-5 h-5 ${isToday ? "text-amber-400 animate-bounce" : "text-amber-500"}`} />
                    ) : isMilestone ? (
                      <Gift className={`w-5 h-5 ${isToday ? "text-amber-400 animate-bounce" : "text-purple-400"}`} />
                    ) : (
                      <Coins className={`w-4 h-4 ${isToday ? "text-amber-500 animate-pulse" : "text-amber-500/80"}`} />
                    )}
                  </div>

                  {/* Reward Amount */}
                  <span className="text-xs font-black font-mono">
                    {item.coins.toLocaleString()}
                  </span>

                  {/* Active Day Indicator */}
                  {isToday && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Milestone Inspector & Actions */}
        <div className="p-6 flex flex-col justify-between bg-[var(--chrome-control)]/40">
          <div>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-center">
                <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                  Longest Streak
                </span>
                <span className="text-lg font-black text-[var(--chrome-ink)] font-mono">
                  {longestStreak} Days
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-center">
                <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                  Shields Active
                </span>
                <span className="text-lg font-black text-sky-500 font-mono flex items-center justify-center gap-1">
                  <Shield className="w-4 h-4" />
                  {shieldsRemaining}
                </span>
              </div>
            </div>

            {/* Milestone Preview Card */}
            <div className="p-4 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] mb-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block mb-1">
                Milestone Chest Preview
              </span>
              <h4 className="text-base font-black text-[var(--chrome-ink)] mb-1 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-purple-400" />
                Day {activeInspected?.day ?? 7}: {activeInspected?.milestoneChest?.toUpperCase()} CHEST
              </h4>
              <p className="text-xs text-[var(--chrome-ink-soft)] mb-3">
                {activeInspected?.description}
              </p>

              {/* Milestone Quick Tabs */}
              <div className="flex items-center gap-1.5">
                {[7, 14, 21, 30].map((mDay) => (
                  <button
                    type="button"
                    key={mDay}
                    onClick={() => setSelectedMilestone(mDay)}
                    className={`flex-1 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      selectedMilestone === mDay
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                    }`}
                  >
                    Day {mDay}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Claim Area */}
          <div className="mt-4 pt-4 border-t border-[var(--chrome-hairline)]">
            {isClaimable ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void claimToday()}
                disabled={isClaiming}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl font-black text-base
                           bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white
                           shadow-lg shadow-amber-500/30 cursor-pointer flex items-center justify-center gap-2
                           focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {isClaiming ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Claiming Day {activeDay}…
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Claim Day {activeDay} (+{schedule[activeDay - 1]?.coins ?? 100} Coins)
                  </>
                )}
              </motion.button>
            ) : (
              <div className="min-h-[52px] p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-500 mb-0.5">
                  <CheckCircle2 className="w-4 h-4" />
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
