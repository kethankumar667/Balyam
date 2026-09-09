import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { Tooltip } from "../../design-system/dls";
import { bhalyamSpring } from "../../lib/motion";

export function DailyStreakEntryChip() {
  const { state, openModal, fetchStreak } = useStreakStore();

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  const currentStreak = state?.currentStreak ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;

  const tooltipLabel = isClaimable
    ? `Daily Login Streak: ${currentStreak} days — Reward Ready to Claim!`
    : `Daily Login Streak: ${currentStreak} days`;

  return (
    <Tooltip content={tooltipLabel} side="bottom">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={bhalyamSpring}
        onClick={openModal}
        aria-label={tooltipLabel}
        title={tooltipLabel}
        className={`relative min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-full border flex items-center gap-1.5 select-none
                   transition-all cursor-pointer flex-shrink-0 focus-visible:outline-hidden focus-visible:ring-2
                   focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111927]
                   ${
                     isClaimable
                       ? "bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] text-amber-500 dark:text-amber-400"
                       : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)]"
                   }`}
      >
        {/* Animated Flame Icon */}
        <div className="relative flex items-center justify-center">
          <Flame
            className={`w-4 h-4 transition-transform ${
              isClaimable
                ? "text-orange-500 fill-amber-400 animate-pulse"
                : currentStreak > 0
                  ? "text-orange-500 fill-orange-500/30"
                  : "text-zinc-400"
            }`}
          />
          {isClaimable && (
            <span className="absolute -inset-1 rounded-full bg-orange-400/20 blur-xs animate-ping" />
          )}
        </div>

        {/* Streak Count Number */}
        <span className="text-[13px] font-black tracking-tight font-mono">
          {currentStreak}
        </span>

        {/* Claim Ready Dot Badge */}
        <AnimatePresence>
          {isClaimable && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={bhalyamSpring}
              className="absolute -top-1 -right-1 flex h-3 w-3"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 ring-2 ring-[var(--chrome-panel)]" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
}

export default DailyStreakEntryChip;
