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
  Crown,
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

interface DailyStreakModalDesktopProps {
  onClose: () => void;
}

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

  // Milestone helpers
  const getMilestoneVisuals = (day: number) => {
    switch (day) {
      case 7:
        return {
          title: "Bronze Chest",
          badge: "Bronze Tier",
          glow: "from-amber-600/30 via-orange-800/20 to-amber-950/40 border-amber-500/60 shadow-[0_0_24px_rgba(217,119,6,0.3)]",
          text: "text-amber-500 dark:text-amber-400",
        };
      case 14:
        return {
          title: "Silver Chest",
          badge: "Silver Tier",
          glow: "from-slate-200/25 via-slate-400/20 to-zinc-900/50 border-slate-300/60 shadow-[0_0_24px_rgba(203,213,225,0.3)]",
          text: "text-slate-300 dark:text-slate-200",
        };
      case 21:
        return {
          title: "Gold Chest",
          badge: "Gold Tier",
          glow: "from-yellow-400/30 via-amber-500/20 to-amber-950/50 border-yellow-400/70 shadow-[0_0_28px_rgba(234,179,8,0.35)]",
          text: "text-yellow-400 dark:text-yellow-300",
        };
      case 30:
        return {
          title: "Diamond Crown Chest",
          badge: "Diamond Crown",
          glow: "from-cyan-400/35 via-violet-500/30 to-fuchsia-950/60 border-cyan-400/70 shadow-[0_0_32px_rgba(34,211,238,0.4)]",
          text: "text-cyan-400 dark:text-cyan-300",
        };
      default:
        return {
          title: "Daily Supply",
          badge: "Daily",
          glow: "from-amber-500/15 to-orange-500/15 border-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.15)]",
          text: "text-amber-500",
        };
    }
  };

  const inspectedVisuals = getMilestoneVisuals(activeInspected?.day ?? 1);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Login Streak & Milestones"
      initial={{ scale: 0.94, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 12 }}
      transition={bhalyamSpring}
      className="relative z-50 w-full max-w-5xl rounded-3xl bg-[var(--chrome-panel)]/95
                 backdrop-blur-2xl border border-white/15 dark:border-white/10
                 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6),0_0_40px_rgba(245,158,11,0.15)]
                 overflow-hidden flex flex-col"
    >
      {/* Ambient Atmospheric Radial Gradient */}
      <div
        className="absolute inset-0 pointer-events-none -z-10 opacity-70 dark:opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245, 158, 11, 0.18), transparent 70%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(139, 92, 246, 0.08), transparent 60%)",
        }}
      />

      {/* Header Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--chrome-hairline)] bg-[var(--chrome-control)]/70 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-amber-500/25 to-orange-500/35 text-orange-500 border border-amber-500/50 shadow-[0_0_16px_rgba(245,158,11,0.3)]">
            <Flame className="w-6 h-6 fill-orange-500 animate-pulse" />
            <span className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-xs -z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-[var(--chrome-ink)] tracking-tight">
                30-Day Daily Login Streak
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40 font-mono shadow-xs">
                🔥 {currentStreak} Days
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] border border-[var(--chrome-border)] font-bold">
                Cycle {cycleCount + 1}
              </span>
            </div>
            <p className="text-xs text-[var(--chrome-ink-soft)] font-medium">
              Log in daily to claim escalating coin grants and unlock 4 Grand Milestone Chests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* UTC Countdown Ticker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--chrome-panel)]/80 border border-[var(--chrome-border)] text-xs font-bold text-[var(--chrome-ink)] shadow-xs">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-[var(--chrome-ink-soft)]">Reset in:</span>
            <span className="font-mono text-amber-500 dark:text-amber-400 font-black">{timeUntilReset}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Streak Modal"
            className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center
                       text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]
                       hover:bg-[var(--chrome-control)] cursor-pointer transition-colors
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[var(--chrome-hairline)]">
        {/* Left 2 Cols: 30-Day Grid */}
        <div className="lg:col-span-2 p-6 overflow-y-auto max-h-[530px]">
          {/* Calendar Header with Quick Legend */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--chrome-ink-soft)]">
                Streak Calendar — Cycle {cycleCount + 1}
              </h3>
              <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Day {isClaimable ? activeDay : Math.min(activeDay, 30)} of 30
              </span>
            </div>

            {/* Micro Legend */}
            <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--chrome-ink-soft)]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Claimed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Today
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Chest
              </span>
            </div>
          </div>

          {/* 30-Day Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
            {schedule.map((item) => {
              const isToday = isClaimable && item.day === activeDay;
              const isMilestone = Boolean(item.milestoneChest);
              const isSelected = inspectedDay === item.day;
              const isClaimed = item.status === "CLAIMED";
              const isLocked = item.status === "LOCKED";

              let cardStyle =
                "bg-[var(--chrome-control)]/70 border-[var(--chrome-border)]/70 text-[var(--chrome-ink-soft)] hover:border-zinc-400/50 hover:bg-[var(--chrome-control-hi)]";

              if (isClaimed) {
                cardStyle =
                  "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 hover:border-emerald-400 shadow-xs";
              } else if (isToday) {
                cardStyle =
                  "bg-gradient-to-b from-amber-500/25 via-orange-500/20 to-yellow-500/20 border-amber-400 text-amber-500 ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--chrome-panel)] shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.02] z-10";
              } else if (item.day === 30) {
                cardStyle =
                  "bg-gradient-to-b from-cyan-500/15 via-violet-500/15 to-purple-500/20 border-cyan-400/50 text-cyan-400 hover:border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.2)]";
              } else if (isMilestone) {
                cardStyle =
                  "bg-gradient-to-b from-purple-500/15 to-indigo-500/15 border-purple-500/40 text-purple-400 hover:border-purple-300 shadow-xs";
              }

              return (
                <motion.button
                  type="button"
                  key={item.day}
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={bhalyamSpring}
                  onClick={() => handleSelectDay(item.day)}
                  className={`group relative min-h-[74px] rounded-2xl border p-2 flex flex-col items-center justify-between transition-all select-none text-left cursor-pointer
                             focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400
                             ${cardStyle} ${isSelected ? "ring-2 ring-purple-500 ring-offset-1 ring-offset-[var(--chrome-panel)]" : ""}`}
                >
                  {/* Top Bar: Day Number & Chest Pill */}
                  <div className="w-full flex items-center justify-between text-[10px] font-black uppercase">
                    <span className={isToday ? "text-amber-500 font-extrabold" : ""}>
                      D{item.day}
                    </span>
                    {item.day === 30 ? (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/25 text-cyan-300 font-black tracking-wider">
                        CROWN
                      </span>
                    ) : isMilestone ? (
                      <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/25 text-purple-300 font-black tracking-wider">
                        CHEST
                      </span>
                    ) : null}
                  </div>

                  {/* Icon Center */}
                  <div className="my-0.5">
                    {isClaimed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    ) : item.day === 30 ? (
                      <Crown className={`w-5 h-5 text-cyan-400 ${isToday ? "animate-bounce drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" : ""}`} />
                    ) : isMilestone ? (
                      <Gift className={`w-5 h-5 ${isToday ? "text-amber-400 animate-bounce drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" : "text-purple-400 group-hover:scale-110 transition-transform"}`} />
                    ) : isLocked ? (
                      <Coins className="w-4 h-4 text-[var(--chrome-ink-soft)] opacity-70 group-hover:text-amber-500 transition-colors" />
                    ) : (
                      <Coins className={`w-4 h-4 text-amber-500 ${isToday ? "animate-pulse" : ""}`} />
                    )}
                  </div>

                  {/* Coin Amount */}
                  <span className="text-xs font-black font-mono tracking-tight">
                    {item.coins.toLocaleString()}
                  </span>

                  {/* Active Beacon */}
                  {isToday && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-gradient-to-tr from-amber-600 to-yellow-400 shadow-sm" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Milestone Inspector & CTA */}
        <div className="p-6 flex flex-col justify-between bg-[var(--chrome-control)]/30 backdrop-blur-sm">
          <div>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-center shadow-xs">
                <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                  Longest Streak
                </span>
                <span className="text-lg font-black text-[var(--chrome-ink)] font-mono">
                  {longestStreak} Days
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-center shadow-xs">
                <span className="block text-[10px] font-black uppercase text-[var(--chrome-ink-soft)]">
                  Shields Active
                </span>
                <span className="text-lg font-black text-sky-500 font-mono flex items-center justify-center gap-1.5">
                  <Shield className="w-4 h-4 fill-sky-500/20" />
                  {shieldsRemaining}
                </span>
              </div>
            </div>

            {/* Interactive Day / Milestone Inspector Card */}
            <div
              className={`relative p-4.5 rounded-2xl border transition-all duration-300 bg-gradient-to-b ${inspectedVisuals.glow} mb-5 overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-xs text-[var(--chrome-ink)]">
                  Day {activeInspected?.day} Inspection
                </span>
                <span className={`text-xs font-black uppercase tracking-wider ${inspectedVisuals.text}`}>
                  {inspectedVisuals.badge}
                </span>
              </div>

              <h4 className="text-lg font-black text-[var(--chrome-ink)] mb-1 flex items-center gap-2">
                {activeInspected?.day === 30 ? (
                  <Crown className="w-5 h-5 text-cyan-400" />
                ) : activeInspected?.milestoneChest ? (
                  <Gift className="w-5 h-5 text-amber-400" />
                ) : (
                  <Coins className="w-5 h-5 text-amber-500" />
                )}
                {inspectedVisuals.title}
              </h4>

              <p className="text-xs text-[var(--chrome-ink-soft)] mb-3 leading-relaxed">
                {activeInspected?.description}
              </p>

              {/* Reward Highlights */}
              <div className="p-2.5 rounded-xl bg-black/20 dark:bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--chrome-ink-soft)]">Reward Coins:</span>
                <span className="font-black text-amber-400 font-mono text-sm flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  +{activeInspected?.coins.toLocaleString()}
                </span>
              </div>

              {activeInspected?.specialRewardTitle && (
                <div className="mt-2 p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-purple-300 flex-shrink-0" />
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-purple-300">
                      Bonus Unlock
                    </span>
                    <span className="font-black text-[var(--chrome-ink)]">
                      {activeInspected.specialRewardTitle}
                    </span>
                  </div>
                </div>
              )}

              {/* Milestone Quick Switcher */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] mb-1.5">
                  Explore Milestone Chests
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[7, 14, 21, 30].map((mDay) => (
                    <button
                      type="button"
                      key={mDay}
                      onClick={() => handleSelectDay(mDay)}
                      className={`py-1 px-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
                        inspectedDay === mDay
                          ? "bg-white/20 dark:bg-white/15 text-[var(--chrome-ink)] ring-1 ring-white/30 shadow-xs"
                          : "bg-black/10 dark:bg-black/30 text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
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
                    <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
                    <span>Claim Day {activeDay} (+{schedule[activeDay - 1]?.coins ?? 100} Coins)</span>
                  </>
                )}
              </motion.button>
            ) : (
              <div className="min-h-[54px] p-3 rounded-2xl bg-[var(--chrome-panel)] border border-[var(--chrome-border)] text-center flex flex-col justify-center">
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
