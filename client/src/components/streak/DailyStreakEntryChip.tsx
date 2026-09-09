import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { useStreakStore } from "../../store/streakStore";
import { Tooltip } from "../../design-system/dls/Tooltip";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

export function DailyStreakEntryChip() {
  const { state, openClaimModal, openExpeditionModal, fetchStreak } = useStreakStore();

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  const currentStreak = state?.currentStreak ?? 0;
  const isClaimable = state?.isClaimableToday ?? false;

  const tooltipLabel = isClaimable
    ? `Daily Login Streak: ${currentStreak} days — Reward Ready to Claim!`
    : `Daily Login Streak: ${currentStreak} days`;

  const handleClick = () => {
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    if (state?.isClaimableToday) {
      openClaimModal();
    } else {
      openExpeditionModal();
    }
  };

  return (
    <Tooltip content={tooltipLabel} side="bottom">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={bhalyamSpring}
        onClick={handleClick}
        aria-label={tooltipLabel}
        title={tooltipLabel}
        className={`group relative min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-full border flex items-center gap-2 select-none
                   transition-all duration-300 cursor-pointer flex-shrink-0 focus-visible:outline-hidden focus-visible:ring-2
                   focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f172a]
                   ${
                     isClaimable
                       ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-amber-500/70 shadow-[0_0_20px_-4px_rgba(245,158,11,0.45)] text-amber-500 dark:text-amber-300"
                       : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)] hover:border-amber-500/40 hover:bg-[var(--chrome-control-hi)] shadow-sm"
                   }`}
      >
        {/* Ambient Ember Aura (when claimable) */}
        {isClaimable && (
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-500/30 blur-xs -z-10 animate-pulse pointer-events-none" />
        )}

        {/* Animated Flame Icon */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={
              isClaimable
                ? {
                    scale: [1, 1.15, 1],
                    rotate: [-3, 3, -3],
                  }
                : currentStreak > 0
                  ? { scale: [1, 1.05, 1] }
                  : {}
            }
            transition={{
              repeat: Infinity,
              duration: isClaimable ? 1.8 : 3,
              ease: "easeInOut",
            }}
          >
            <Flame
              className={`w-4 h-4 transition-all duration-300 ${
                isClaimable
                  ? "text-orange-500 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                  : currentStreak > 0
                    ? "text-orange-500 fill-orange-500/30"
                    : "text-zinc-400 group-hover:text-amber-500"
              }`}
            />
          </motion.div>

          {isClaimable && (
            <span className="absolute -inset-1 rounded-full bg-orange-400/25 blur-xs animate-ping pointer-events-none" />
          )}
        </div>

        {/* Streak Count Number */}
        <span className="text-[13px] font-black tracking-tight font-mono">
          {currentStreak}
        </span>

        {/* Claim Ready Pulsing Beacon Dot */}
        <AnimatePresence>
          {isClaimable && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={bhalyamSpring}
              className="absolute -top-1 -right-1 flex h-3.5 w-3.5"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-gradient-to-tr from-amber-600 to-yellow-400 ring-2 ring-[var(--chrome-panel)] shadow-sm" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
}

export default DailyStreakEntryChip;
