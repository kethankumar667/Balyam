import { motion } from "framer-motion";
import { ArrowLeft, Crown, Gift, X } from "lucide-react";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import {
  ConsistencyCard,
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
      className="streak-expedition relative z-50 flex max-h-[calc(100dvh-2rem)] w-[min(96vw,1480px)] flex-col overflow-hidden rounded-[30px] border border-[var(--streak-border)] text-[var(--streak-ink)] shadow-[0_30px_100px_-28px_rgba(0,0,0,0.8)]"
    >
      <header className="streak-header relative flex items-center justify-between gap-4 border-b border-[var(--streak-border)] px-5 py-4 lg:px-7">
        <div className="flex min-w-0 items-center gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to today's reward"
              className="streak-icon-button grid h-12 w-12 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30">
              <Gift className="h-6 w-6" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="streak-expedition-title" className="truncate font-hand text-3xl font-black leading-none text-[var(--streak-ink)] lg:text-4xl">
                Rewards Expedition
              </h2>
              <Crown className="h-7 w-7 shrink-0 -rotate-6 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--streak-muted)]">
              Play daily. Keep your streak. Unlock bigger rewards.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden min-h-[48px] items-center gap-2 rounded-2xl border border-[var(--streak-border)] bg-[var(--streak-control)] px-4 text-sm font-black text-[var(--streak-ink)] lg:flex">
            <Gift className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            Today’s reward: +{model.todayReward.coins.toLocaleString()}
          </div>
          <CountdownPill model={model} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close streak rewards"
            className="streak-icon-button grid h-12 w-12 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="streak-scrollbar overflow-y-auto px-5 py-5 lg:px-7 lg:py-6">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-4">
            <TodayRewardCard model={model} />
          </div>
          <div className="col-span-7 lg:col-span-5">
            <NextMilestoneCard model={model} />
          </div>
          <div className="col-span-5 lg:col-span-3">
            <FinalRewardCard />
          </div>
        </div>

        <div className="mt-4">
          <MilestoneRail model={model} />
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-7">
            <UpcomingRewards rewards={model.upcomingRewards} />
          </div>
          <div className="col-span-5">
            <ConsistencyCard />
          </div>
        </div>

        <div className="mt-4">
          <ExpeditionSpoils totalCoins={model.totalCoins} />
        </div>

        <div className="mt-4">
          <ExpeditionFooter model={model} />
        </div>
      </div>
    </motion.div>
  );
}

export default DailyStreakModalDesktop;
