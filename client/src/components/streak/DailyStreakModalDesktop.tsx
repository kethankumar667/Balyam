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

interface DailyStreakModalDesktopProps {
  onClose: () => void;
  onBack?: () => void;
}

export function DailyStreakModalDesktop({ onClose, onBack }: DailyStreakModalDesktopProps) {
  const model = useStreakExpedition();
  const reduce = useReducedMotion();

  const handleBack = () => {
    AudioManager.play(AUDIO.UI_CLICK);
    onBack?.();
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-expedition-title"
      initial={reduce ? false : { scale: 0.97, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { scale: 0.97, opacity: 0, y: 16 }}
      transition={reduce ? { duration: 0 } : bhalyamSpring}
      className="streak-expedition relative z-50 flex max-h-[92dvh] w-[min(94vw,1000px)] flex-col overflow-hidden rounded-[26px] border border-[var(--streak-border)] text-[var(--streak-ink)] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
    >
      <header className="streak-header relative flex items-center justify-between gap-3 border-b border-[var(--streak-border)] px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to today's reward"
              className="streak-icon-button grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div aria-hidden="true" className="streak-highlight-medal grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
              <Crown className="h-7 w-7" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 id="streak-expedition-title" className="font-display text-2xl leading-tight text-[var(--streak-ink)]">
                Rewards Expedition
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--streak-muted)]">
              Little moments. Legendary rewards.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CountdownPill model={model} compact />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close streak rewards"
            className="streak-icon-button grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="streak-scrollbar flex-1 overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-12 gap-3 items-stretch">
          <div className="col-span-6 lg:col-span-5 flex flex-col">
            <TodayRewardCard model={model} compact />
          </div>
          <div className="col-span-6 lg:col-span-7 flex flex-col">
            <NextMilestoneCard model={model} compact />
          </div>
        </div>

        <div>
          <MilestoneRail model={model} compact />
        </div>

        <div>
          <ExpeditionCompactFooter model={model} />
        </div>
        <p className="pb-1 text-center font-script text-xl text-[var(--streak-muted)]">Childhood Never Ends</p>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;
