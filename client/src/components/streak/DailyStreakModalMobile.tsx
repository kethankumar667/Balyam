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
    { week: 0, day: 7, name: "Bronze Chest", icon: Gift },
    { week: 1, day: 14, name: "Silver Chest", icon: Gift },
    { week: 2, day: 21, name: "Gold Chest", icon: Gift },
    { week: 3, day: 30, name: "Diamond Crown", icon: Crown },
  ];

  const currentMilestone = weekMilestones[selectedWeek];
  const currentMilestoneDay = schedule.find((s) => s.day === currentMilestone?.day);
  const currentMilestoneLocked = currentMilestoneDay?.status === "LOCKED";
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
                 bg-[var(--chrome-panel)] border-t-2 border-[var(--chrome-border)]
                 shadow-[0_-12px_40px_rgba(0,0,0,0.3)] overflow-hidden pb-safe"
    >
      {/* Top Tactile Grab Handle */}
      <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500">
        <div className="w-12 h-1.5 rounded-full bg-white/50 hover:bg-white/70 transition-colors" />
      </div>

      {/* Hero Header Bar — bold flame gradient */}
      <div className="relative px-5 pt-2 pb-3 flex items-center justify-between bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.3), transparent 35%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="relative w-10 h-10 rounded-full flex items-center justify-center bg-white/25 border-2 border-white/50">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Daily Streak
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/40 font-mono font-black">
                🔥 {currentStreak} Days
              </span>
            </div>
            <p className="text-xs text-white/90 font-semibold">
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

      {/* Status Bar */}
      <div className="px-5 py-2.5 bg-[var(--chrome-control)] flex items-center justify-between text-xs font-semibold">
        {/* Next Reset Countdown */}
        <div className="flex items-center gap-1.5 text-[var(--chrome-ink-soft)]">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Reset in:</span>
          <span className="font-mono font-bold text-[var(--chrome-ink)]">
            {timeUntilReset}
          </span>
        </div>

        {/* Protection Shields */}
        <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
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
              className={`relative flex-1 min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none text-center border-2
                         focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                           isSelected
                             ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-500 text-white shadow-md shadow-amber-500/25"
                             : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
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
          className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none border-2
                     focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${
                       viewAll
                         ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/25"
                         : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                     }`}
        >
          All 30
        </button>
      </div>

      {/* Milestone Peek Banner (for selected week) — amount hidden until reached */}
      {!viewAll && currentMilestone && (
        <div className="px-4 pt-2">
          <div className="p-3 rounded-2xl border-2 border-violet-400 dark:border-violet-500/50 bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/20 border border-white/30">
                <currentMilestone.icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/75 block">
                  Week {selectedWeek + 1} Grand Reward
                </span>
                <span className="font-black text-sm">
                  Day {currentMilestone.day}: {currentMilestoneLocked ? "???" : currentMilestone.name}
                </span>
              </div>
            </div>
            {currentMilestoneLocked ? (
              <span className="flex items-center gap-1 font-mono font-black text-sm text-white/85">
                <Lock className="w-3.5 h-3.5" />
                Locked
              </span>
            ) : (
              <span className="font-mono font-black text-sm">
                +{schedule[currentMilestone.day - 1]?.coins.toLocaleString()} Coins
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Day Grid — circular gamified nodes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className={`grid ${viewAll ? "grid-cols-5 sm:grid-cols-6 gap-x-2 gap-y-4" : "grid-cols-4 sm:grid-cols-7 gap-x-2 gap-y-4"}`}>
          {displayedDays.map((item) => {
            const isToday = isClaimable && item.day === activeDay;
            const isMilestone = Boolean(item.milestoneChest);
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
              <div
                key={item.day}
                className="relative flex flex-col items-center gap-1 select-none"
              >
                <span className={`text-[9px] font-black uppercase tracking-wider ${isToday ? "text-amber-800 dark:text-amber-300" : "text-[var(--chrome-ink-soft)]"}`}>
                  D{item.day}
                </span>

                <span
                  className={`relative w-11 h-11 rounded-full border-2 flex items-center justify-center transition-transform ${nodeStyle}`}
                >
                  {isClaimed ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : isCrown ? (
                    <Crown className="w-5 h-5" />
                  ) : isMilestone ? (
                    <Gift className="w-5 h-5" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 opacity-70" />
                  ) : (
                    <Coins className="w-4 h-4" />
                  )}

                  {isToday && (
                    <span className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-60" />
                  )}
                </span>

                <span className="text-[10px] font-black font-mono tracking-tight text-[var(--chrome-ink)]">
                  {isLocked ? "?" : item.coins >= 1000 ? `${item.coins / 1000}k` : item.coins}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Action Footer (Thumb reachable, >= 44x44px) */}
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
                <Sparkles className="w-5 h-5 text-yellow-200" />
                <span>Claim Day {activeDay} Reward (+{schedule[activeDay - 1]?.coins ?? 100} Coins)</span>
              </>
            )}
          </motion.button>
        ) : (
          <div className="min-h-[52px] py-3 px-4 rounded-2xl bg-[var(--chrome-control)] border-2 border-[var(--chrome-border)] text-center text-xs font-bold text-[var(--chrome-ink-soft)] flex items-center justify-center gap-2">
            <Check className="w-4 h-4 stroke-[3] text-emerald-600 dark:text-emerald-400" />
            <span>Today's reward claimed! Next unlock in {timeUntilReset}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;
