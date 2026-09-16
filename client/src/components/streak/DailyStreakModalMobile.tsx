import { motion } from "framer-motion";
import { ArrowLeft, Crown, X } from "lucide-react";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import {
  CountdownPill,
  ExpeditionFooter,
  ExpeditionSpoils,
  FinalRewardCard,
  MilestoneRail,
  NextMilestoneCard,
  TodayRewardCard,
  UpcomingRewards,
  useStreakExpedition,
} from "./StreakExpeditionShared";

interface DailyStreakModalMobileProps {
  onClose: () => void;
  onBack?: () => void;
}

export function DailyStreakModalMobile({ onClose, onBack }: DailyStreakModalMobileProps) {
  const model = useStreakExpedition();

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
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28 }}
      transition={bhalyamSpring}
      className="streak-expedition relative z-50 flex h-[100dvh] w-full flex-col overflow-hidden text-[var(--streak-ink)]"
    >
      <header className="streak-header sticky top-0 z-20 border-b border-[var(--streak-border)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label={onBack ? "Back to today's reward" : "Close streak rewards"}
            className="streak-icon-button grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 id="streak-expedition-mobile-title" className="truncate font-hand text-2xl font-black leading-none text-[var(--streak-ink)]">
                Rewards Expedition
              </h2>
              <Crown className="h-5 w-5 shrink-0 -rotate-6 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold text-[var(--streak-muted)]">
              Keep your streak. Unlock bigger rewards.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close streak rewards"
            className="streak-icon-button grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">
          <CountdownPill model={model} />
        </div>
      </header>

      <div className="streak-scrollbar flex-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <TodayRewardCard model={model} compact />

        <div className="mt-3">
          <NextMilestoneCard model={model} compact />
        </div>

        <div className="mt-3">
          <MilestoneRail model={model} mobile />
        </div>

        <div className="mt-3">
          <UpcomingRewards rewards={model.upcomingRewards} />
        </div>

        <div className="mt-3">
          <FinalRewardCard compact />
        </div>

        <div className="mt-3">
          <ExpeditionSpoils totalCoins={model.totalCoins} />
        </div>

        <div className="mt-3">
          <ExpeditionFooter model={model} mobile />
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalMobile;
