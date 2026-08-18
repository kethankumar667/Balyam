import React from "react";
import { Link } from "react-router-dom";
import { STARTER_QUESTS, type OnboardingMilestone } from "@shared/onboarding/PlayerJourney";
import { SURFACES } from "../../design-system/dls";
import { journeyTracker } from "./PlayerJourneyTracker";

interface GettingStartedCardProps {
  onDismiss?: () => void;
  className?: string;
}

export const GettingStartedCard: React.FC<GettingStartedCardProps> = ({
  onDismiss,
  className = "",
}) => {
  const state = journeyTracker.getState();
  const percentage = journeyTracker.getCompletionPercentage();
  const completedCount = state.completedMilestones.length;
  const totalCount = STARTER_QUESTS.length;

  return (
    <div
      className={`${SURFACES.cardElevated} p-5 sm:p-6 rounded-3xl border border-amber-500/30 relative overflow-hidden shadow-2xl ${className}`}
    >
      {/* Radiant Glow */}
      <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header with Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <h3 className="text-base sm:text-lg font-black text-stone-100 dark:text-zinc-100 tracking-tight">
              Starter Missions
            </h3>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              +{STARTER_QUESTS.reduce((acc, q) => acc + q.xpReward, 0)} Total XP
            </span>
          </div>
          <p className="text-xs text-stone-400 font-mono">
            Complete your first steps in BHALYAM to unlock early XP & badges.
          </p>
        </div>

        {/* Progress Pill & Optional Dismiss */}
        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="text-xs font-bold text-amber-400">
              {completedCount} / {totalCount}
            </span>
            <span className="text-[10px] text-stone-500 block">
              {percentage}% Complete
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-stone-500 hover:text-stone-300 transition text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center shrink-0"
              aria-label="Dismiss starter missions"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-stone-900 rounded-full h-2 mb-4 overflow-hidden border border-stone-800 relative z-10">
        <div
          className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Quest Item Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 relative z-10">
        {STARTER_QUESTS.map((quest) => {
          const isComplete = journeyTracker.isMilestoneComplete(quest.id);

          return (
            <div
              key={quest.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition ${
                isComplete
                  ? "bg-emerald-950/20 border-emerald-500/30 opacity-80"
                  : "bg-stone-900/60 hover:bg-stone-900 border-stone-800"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl flex-shrink-0">{quest.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold truncate block ${
                        isComplete ? "text-emerald-400 line-through" : "text-stone-200"
                      }`}
                    >
                      {quest.title}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400/90 font-bold flex-shrink-0">
                      +{quest.xpReward} XP
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-stone-500 truncate">
                    {quest.description}
                  </p>
                </div>
              </div>

              {/* Action / Done Indicator */}
              <div className="flex-shrink-0">
                {isComplete ? (
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                ) : quest.actionRoute ? (
                  <Link
                    to={quest.actionRoute}
                    onClick={() => journeyTracker.markMilestone(quest.id)}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-mono text-[11px] font-bold px-3 min-h-[44px] inline-flex items-center justify-center rounded-xl border border-stone-700 transition"
                  >
                    {quest.actionText}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
