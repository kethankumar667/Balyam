import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

interface DailyStreakModalMobileProps {
  onClose: () => void;
}

export function DailyStreakModalMobile({ onClose }: DailyStreakModalMobileProps) {
  const { state, isClaiming, claimToday, timeUntilReset, updateTimeRemaining } =
    useStreakStore();

  const currentStreak = state?.currentStreak ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;
  const shieldsRemaining = state?.shieldsRemaining ?? 0;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];

  // Determine which week the user is currently in (1..4)
  const currentWeekIndex = Math.min(Math.floor((activeDay - 1) / 7), 3);
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

  const weekMilestones = [
    { week: 0, day: 7, name: "Bronze Chest", icon: Gift, color: "text-amber-500", border: "border-amber-500/40", bg: "from-amber-500/15 to-orange-500/10" },
    { week: 1, day: 14, name: "Silver Chest", icon: Gift, color: "text-slate-300", border: "border-slate-400/40", bg: "from-slate-400/15 to-zinc-800/20" },
    { week: 2, day: 21, name: "Gold Chest", icon: Gift, color: "text-yellow-400", border: "border-yellow-400/40", bg: "from-yellow-400/15 to-amber-600/10" },
    { week: 3, day: 30, name: "Diamond Crown", icon: Crown, color: "text-cyan-400", border: "border-cyan-400/40", bg: "from-cyan-400/15 to-violet-600/15" },
  ];

  const currentMilestone = weekMilestones[selectedWeek];
  const displayedDays = viewAll ? schedule : getWeekDays(selectedWeek);

  return (
    <motion.div
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
                 bg-[var(--chrome-panel)]/95 backdrop-blur-2xl border-t border-white/15 dark:border-white/10
                 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] overflow-hidden pb-safe"
    >
      {/* Top Tactile Grab Handle */}
      <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
        <div className="w-12 h-1.5 rounded-full bg-[var(--chrome-border)]/80 hover:bg-[var(--chrome-border)] transition-colors" />
      </div>

      {/* Header Bar */}
      <div className="px-5 pb-3 flex items-center justify-between border-b border-[var(--chrome-hairline)]">
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-amber-500/20 to-orange-500/30 text-orange-500 border border-amber-500/40 shadow-xs">
            <Flame className="w-5 h-5 fill-orange-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[var(--chrome-ink)] tracking-tight">
                Daily Streak
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40 font-mono font-black">
                🔥 {currentStreak} Days
              </span>
            </div>
            <p className="text-xs text-[var(--chrome-ink-soft)] font-medium">
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
          className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center
                     text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]
                     hover:bg-[var(--chrome-control)] cursor-pointer transition-colors
                     focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status Bar */}
      <div className="px-5 py-2.5 bg-[var(--chrome-control)]/70 flex items-center justify-between text-xs font-semibold">
        {/* Next Reset Countdown */}
        <div className="flex items-center gap-1.5 text-[var(--chrome-ink-soft)]">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Reset in:</span>
          <span className="font-mono font-bold text-[var(--chrome-ink)]">
            {timeUntilReset}
          </span>
        </div>

        {/* Protection Shields */}
        <div className="flex items-center gap-1.5 text-sky-500 font-bold">
          <Shield className="w-4 h-4 fill-sky-500/20" />
          <span>{shieldsRemaining} Shield{shieldsRemaining !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Week Selector Tab Bar */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {["Week 1", "Week 2", "Week 3", "Week 4+"].map((label, idx) => {
          const isSelected = !viewAll && selectedWeek === idx;
          const isWeekActive = Math.min(Math.floor((activeDay - 1) / 7), 3) === idx;

          return (
            <button
              type="button"
              key={label}
              onClick={() => handleTabChange(idx)}
              className={`relative flex-1 min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none text-center
                         focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                           isSelected
                             ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25"
                             : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
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
          className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none
                     focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                       viewAll
                         ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                         : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                     }`}
        >
          All 30
        </button>
      </div>

      {/* Milestone Peek Banner (for selected week) */}
      {!viewAll && currentMilestone && (
        <div className="px-4 pt-2">
          <div
            className={`p-3 rounded-2xl border bg-gradient-to-r ${currentMilestone.bg} ${currentMilestone.border} flex items-center justify-between text-xs shadow-xs`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-black/20 text-white">
                <currentMilestone.icon className={`w-4 h-4 ${currentMilestone.color}`} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--chrome-ink-soft)] block">
                  Week {selectedWeek + 1} Grand Reward
                </span>
                <span className="font-black text-[var(--chrome-ink)] text-sm">
                  Day {currentMilestone.day}: {currentMilestone.name}
                </span>
              </div>
            </div>
            <span className="font-mono font-black text-amber-500 dark:text-amber-400 text-sm">
              +{schedule[currentMilestone.day - 1]?.coins.toLocaleString()} Coins
            </span>
          </div>
        </div>
      )}

      {/* Scrollable Day Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className={`grid ${viewAll ? "grid-cols-5 sm:grid-cols-6 gap-2" : "grid-cols-4 sm:grid-cols-7 gap-2.5"}`}>
          {displayedDays.map((item) => {
            const isToday = isClaimable && item.day === activeDay;
            const isMilestone = Boolean(item.milestoneChest);
            const isClaimed = item.status === "CLAIMED";

            let bgClass =
              "bg-[var(--chrome-control)]/70 border-[var(--chrome-border)]/80 text-[var(--chrome-ink-soft)]";

            if (isClaimed) {
              bgClass =
                "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 shadow-xs";
            } else if (isToday) {
              bgClass =
                "bg-gradient-to-b from-amber-500/25 via-orange-500/20 to-yellow-500/20 border-amber-400 text-amber-500 shadow-md ring-2 ring-amber-400/50 scale-[1.02] z-10";
            } else if (item.day === 30) {
              bgClass =
                "bg-gradient-to-b from-cyan-500/15 via-violet-500/15 to-purple-500/20 border-cyan-400/50 text-cyan-400";
            } else if (isMilestone) {
              bgClass =
                "bg-gradient-to-b from-purple-500/15 to-indigo-500/15 border-purple-500/40 text-purple-400";
            }

            return (
              <div
                key={item.day}
                className={`relative min-h-[64px] rounded-2xl border p-2 flex flex-col items-center justify-between select-none
                            ${bgClass}`}
              >
                {/* Day Header */}
                <span className={`text-[10px] font-black uppercase tracking-wider ${isToday ? "text-amber-500" : ""}`}>
                  Day {item.day}
                </span>

                {/* Reward Center */}
                <div className="my-1 flex items-center justify-center">
                  {isClaimed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  ) : item.day === 30 ? (
                    <Crown className={`w-5 h-5 text-cyan-400 ${isToday ? "animate-bounce drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : ""}`} />
                  ) : isMilestone ? (
                    <Gift className={`w-5 h-5 ${isToday ? "text-amber-400 animate-bounce drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "text-purple-400"}`} />
                  ) : (
                    <Coins className={`w-4 h-4 text-amber-500 ${isToday ? "animate-pulse" : "opacity-80"}`} />
                  )}
                </div>

                {/* Coin Value */}
                <span className="text-xs font-black font-mono tracking-tight">
                  {item.coins >= 1000 ? `${item.coins / 1000}k` : item.coins}
                </span>

                {/* Pulsing Highlight on Active Claimable Day */}
                {isToday && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-tr from-amber-600 to-yellow-400 shadow-sm" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Action Footer (Thumb reachable, >= 44x44px) */}
      <div className="p-4 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]/95 backdrop-blur-xl">
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
                <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
                <span>Claim Day {activeDay} Reward (+{schedule[activeDay - 1]?.coins ?? 100} Coins)</span>
              </>
            )}
          </motion.button>
        ) : (
          <div className="min-h-[52px] py-3 px-4 rounded-2xl bg-[var(--chrome-control)] text-center text-xs font-bold text-[var(--chrome-ink-soft)] flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Today's reward claimed! Next unlock in {timeUntilReset}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;
