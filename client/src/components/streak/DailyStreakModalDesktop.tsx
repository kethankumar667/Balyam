import { motion } from "framer-motion";
import { ArrowLeft, Crown, Gift, X } from "lucide-react";
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

  const handleBack = () => {
    AudioManager.play(AUDIO.UI_CLICK);
    onBack?.();
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-expedition-title"
      initial={{ scale: 0.97, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.97, opacity: 0, y: 16 }}
      transition={bhalyamSpring}
      className="streak-expedition relative z-50 flex max-h-[min(92vh,620px)] w-[min(92vw,820px)] flex-col overflow-hidden rounded-[24px] border border-[var(--streak-border)] text-[var(--streak-ink)] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
    >
      <header className="streak-header relative flex items-center justify-between gap-3 border-b border-[var(--streak-border)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to today's reward"
              className="streak-icon-button grid h-9 w-9 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30">
              <Gift className="h-4 w-4" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 id="streak-expedition-title" className="truncate font-hand text-xl font-black leading-none text-[var(--streak-ink)]">
                Rewards Expedition
              </h2>
              <Crown className="h-4 w-4 shrink-0 -rotate-6 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="text-[11px] font-semibold text-[var(--streak-muted)] leading-tight">
              Play daily to unlock 4 grand chests & perks
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CountdownPill model={model} compact />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close streak rewards"
            className="streak-icon-button grid h-9 w-9 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="streak-scrollbar flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* Top Split: Today Status + Next Milestone Showcase */}
        <div className="grid grid-cols-12 gap-3 items-stretch">
          <div className="col-span-5 flex flex-col">
            <TodayRewardCard model={model} compact />
          </div>
          <div className="col-span-7 flex flex-col">
            <NextMilestoneCard model={model} compact />
          </div>
        </div>

        {/* Middle Waypoint Rail Track */}
        <div>
          <MilestoneRail model={model} compact />
        </div>

        {/* Bottom Streamlined Summary Bar */}
        <div>
          <ExpeditionCompactFooter model={model} />
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;

