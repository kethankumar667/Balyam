import React from "react";
import { Link } from "react-router-dom";
import { STARTER_QUESTS } from "@shared/onboarding/PlayerJourney";
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
      className={`
        bg-[#FDF5E4] dark:bg-[var(--surface-1)]
        border border-[#DFC98A] dark:border-[rgba(148,163,184,0.18)]
        p-5 sm:p-6 rounded-3xl relative overflow-hidden shadow-md
        ${className}
      `}
    >
      {/* Ambient Glow */}
      <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-amber-400/10 dark:bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header with Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🚀</span>
            <h3 className="text-base sm:text-lg font-black text-[#2A1F0E] dark:text-zinc-100 tracking-tight">
              Starter Missions
            </h3>
            <span className="bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/40 dark:border-amber-500/30">
              +{STARTER_QUESTS.reduce((acc, q) => acc + q.xpReward, 0)} Total XP
            </span>
          </div>
          <p className="text-xs text-[#8A6D4B] dark:text-slate-400 font-mono">
            Complete your first steps in BHALYAM to unlock early XP &amp; badges.
          </p>
        </div>

        {/* Progress Pill & Optional Dismiss */}
        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {completedCount} / {totalCount}
            </span>
            <span className="text-[10px] text-[#8A6D4B] dark:text-slate-500 block">
              {percentage}% Complete
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[#8A6D4B] dark:text-slate-500 hover:text-[#2A1F0E] dark:hover:text-slate-300 transition text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center shrink-0"
              aria-label="Dismiss starter missions"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-[#E8D9B8] dark:bg-[#182234] rounded-full h-2 mb-4 overflow-hidden border border-[#D4B97A]/40 dark:border-[rgba(148,163,184,0.12)] relative z-10">
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
                  ? "bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-400/30 dark:border-emerald-500/30 opacity-80"
                  : "bg-[#FAF0D7] dark:bg-[#182234]/60 border-[#DFC98A]/60 dark:border-[rgba(148,163,184,0.12)] hover:border-amber-400/70 dark:hover:border-amber-500/40"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl flex-shrink-0">{quest.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold truncate block ${
                        isComplete
                          ? "text-emerald-600 dark:text-emerald-400 line-through"
                          : "text-[#2A1F0E] dark:text-slate-100"
                      }`}
                    >
                      {quest.title}
                    </span>
                    <span className="text-[10px] font-mono text-amber-800 dark:text-amber-400 font-bold flex-shrink-0">
                      +{quest.xpReward} XP
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#8A6D4B] dark:text-slate-500 truncate">
                    {quest.description}
                  </p>
                </div>
              </div>

              {/* Action / Done Indicator */}
              <div className="flex-shrink-0">
                {isComplete ? (
                  <span className="w-6 h-6 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-400/35 dark:border-emerald-500/40 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                ) : quest.actionRoute ? (
                  <Link
                    to={quest.actionRoute}
                    onClick={() => journeyTracker.markMilestone(quest.id)}
                    className="bg-[#EDD98A] dark:bg-[#1E2A3A] hover:bg-amber-400/30 dark:hover:bg-[#243347] text-[#2A1F0E] dark:text-slate-200 font-mono text-[11px] font-bold px-3 min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[#C8A84B]/60 dark:border-[rgba(148,163,184,0.2)] hover:border-amber-500/70 dark:hover:border-amber-500/50 transition"
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
