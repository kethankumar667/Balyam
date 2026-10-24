import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Crown, X } from "lucide-react";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import {
  CountdownPill,
  ExpeditionCompactFooter,
  MilestoneRail,
  NextMilestoneCard,
  TodayRewardCard,
  useStreakExpedition,
} from "./StreakExpeditionShared";

interface DailyStreakModalMobileProps {
  onClose: () => void;
  onBack?: () => void;
}

export function DailyStreakModalMobile({ onClose, onBack }: DailyStreakModalMobileProps) {
  const model = useStreakExpedition();
  const reduce = useReducedMotion();

  const handleBack = () => {
    AudioManager.play(AUDIO.UI_CLICK);
    if (onBack) onBack();
    else onClose();
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-expedition-mobile-title"
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
      transition={reduce ? { duration: 0 } : bhalyamSpring}
      className="streak-expedition relative z-50 flex h-[100dvh] w-full flex-col overflow-hidden text-[var(--streak-ink)]"
    >
      <header className="streak-header sticky top-0 z-20 border-b border-[var(--streak-border)] px-4 pb-2.5 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          {onBack ? <button
            type="button"
            onClick={handleBack}
            aria-label="Back to today's reward"
            className="streak-icon-button grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </button> : <Crown aria-hidden="true" className="h-7 w-7 shrink-0 text-amber-700 dark:text-amber-300" />}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 id="streak-expedition-mobile-title" className="font-display text-lg leading-tight text-[var(--streak-ink)]">
                Rewards Expedition
              </h2>
            </div>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--streak-muted)]">
              Little moments. Legendary rewards.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close streak rewards"
            className="streak-icon-button grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2">
          <CountdownPill model={model} compact />
        </div>
      </header>

      <div className="streak-scrollbar flex-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 space-y-3">
        <TodayRewardCard model={model} compact />

        <div>
          <NextMilestoneCard model={model} compact />
        </div>

        <div>
          <MilestoneRail model={model} mobile compact />
        </div>

        <div>
          <ExpeditionCompactFooter model={model} />
        </div>
        <p className="py-2 text-center font-script text-xl text-[var(--streak-muted)]">Childhood Never Ends</p>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;
