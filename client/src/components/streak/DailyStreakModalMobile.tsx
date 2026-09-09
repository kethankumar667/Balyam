import { useEffect } from "react";
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
} from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { bhalyamSpring } from "../../lib/motion";

interface DailyStreakModalMobileProps {
  onClose: () => void;
}

export function DailyStreakModalMobile({ onClose }: DailyStreakModalMobileProps) {
  const { state, isClaiming, claimToday, timeUntilReset, updateTimeRemaining } =
    useStreakStore();

  // Tick the countdown timer every second
  useEffect(() => {
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  const currentStreak = state?.currentStreak ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;
  const shieldsRemaining = state?.shieldsRemaining ?? 0;
  const activeDay = state?.activeDayInCycle ?? 1;
  const schedule = state?.schedule ?? [];

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={bhalyamSpring}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col rounded-t-[32px]
                 bg-[var(--chrome-panel)] border-t border-[var(--chrome-border)]
                 shadow-2xl overflow-hidden pb-safe"
    >
      {/* Top Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-12 h-1.5 rounded-full bg-[var(--chrome-border)]" />
      </div>

      {/* Header Bar */}
      <div className="px-5 pb-3 flex items-center justify-between border-b border-[var(--chrome-hairline)]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/15 text-orange-500 border border-orange-500/30">
            <Flame className="w-6 h-6 fill-orange-500/40" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--chrome-ink)] tracking-tight flex items-center gap-1.5">
              Daily Streak
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 font-mono">
                {currentStreak} Days
              </span>
            </h2>
            <p className="text-xs text-[var(--chrome-ink-soft)] font-medium">
              Claim rewards daily to build your streak
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Streak Modal"
          className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center
                     text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]
                     hover:bg-[var(--chrome-control)] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Info Status Strip */}
      <div className="px-5 py-2.5 bg-[var(--chrome-control)] flex items-center justify-between text-xs font-semibold">
        {/* Next Reset Countdown */}
        <div className="flex items-center gap-1.5 text-[var(--chrome-ink-soft)]">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Next Reset:</span>
          <span className="font-mono font-bold text-[var(--chrome-ink)]">
            {timeUntilReset}
          </span>
        </div>

        {/* Protection Shields */}
        <div className="flex items-center gap-1.5 text-sky-500 font-bold">
          <Shield className="w-4 h-4" />
          <span>{shieldsRemaining} Shield{shieldsRemaining !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Scrollable Calendar Grid (5 rows x 6 cols or 30 days) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {schedule.map((item) => {
            const isToday = isClaimable && item.day === activeDay;
            const isMilestone = Boolean(item.milestoneChest);

            let bgClass = "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]";
            if (item.status === "CLAIMED") {
              bgClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";
            } else if (isToday) {
              bgClass =
                "bg-gradient-to-b from-amber-500/20 to-orange-500/25 border-amber-500 text-amber-500 shadow-md ring-2 ring-amber-500/40";
            } else if (isMilestone) {
              bgClass = "bg-purple-500/10 border-purple-500/30 text-purple-400";
            }

            return (
              <div
                key={item.day}
                className={`relative min-h-[58px] rounded-xl border p-2 flex flex-col items-center justify-between select-none
                            ${bgClass}`}
              >
                {/* Day Header */}
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Day {item.day}
                </span>

                {/* Reward Center */}
                <div className="my-1 flex items-center justify-center">
                  {item.status === "CLAIMED" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : isMilestone ? (
                    <Gift className={`w-5 h-5 ${isToday ? "text-amber-400 animate-bounce" : "text-purple-400"}`} />
                  ) : (
                    <Coins className={`w-4 h-4 ${isToday ? "text-amber-500 animate-pulse" : "text-amber-500/80"}`} />
                  )}
                </div>

                {/* Coin Value */}
                <span className="text-[11px] font-black font-mono">
                  {item.coins >= 1000 ? `${item.coins / 1000}k` : item.coins}
                </span>

                {/* Pulsing Highlight on Active Claimable Day */}
                {isToday && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Footer (Thumb reachable, >= 44x44px) */}
      <div className="p-4 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]">
        {isClaimable ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => void claimToday()}
            disabled={isClaiming}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl font-black text-base
                       bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white
                       shadow-lg shadow-amber-500/30 cursor-pointer flex items-center justify-center gap-2
                       focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {isClaiming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Claiming Reward…
              </span>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Claim Day {activeDay} Reward (+{schedule[activeDay - 1]?.coins ?? 100} Coins)
              </>
            )}
          </motion.button>
        ) : (
          <div className="min-h-[48px] py-3 px-4 rounded-2xl bg-[var(--chrome-control)] text-center text-xs font-bold text-[var(--chrome-ink-soft)] flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Today's reward claimed! Next unlock in {timeUntilReset}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;
