import React, { useState } from "react";
import { Link } from "react-router-dom";
import { STARTER_QUESTS } from "@shared/onboarding/PlayerJourney";
import { journeyTracker } from "./PlayerJourneyTracker";
import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";
import Modal from "../../components/Modal";

interface GettingStartedCardProps {
  onDismiss?: () => void;
  className?: string;
}

export const GettingStartedCard: React.FC<GettingStartedCardProps> = ({
  onDismiss,
  className = "",
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const state = journeyTracker.getState();
  const percentage = journeyTracker.getCompletionPercentage();
  const completedCount = state.completedMilestones.length;
  const totalCount = STARTER_QUESTS.length;
  const totalXP = STARTER_QUESTS.reduce((acc, q) => acc + q.xpReward, 0);

  // Find the next incomplete quest, or the last completed quest
  const activeQuest = STARTER_QUESTS.find(
    (q) => !journeyTracker.isMilestoneComplete(q.id)
  ) ?? STARTER_QUESTS[STARTER_QUESTS.length - 1];

  const isActiveComplete = activeQuest ? journeyTracker.isMilestoneComplete(activeQuest.id) : false;

  return (
    <>
      <div
        className={`
          bg-[#FDF5E4] dark:bg-[#0E1526]
          border border-[#DFC98A] dark:border-slate-800
          p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-sm
          ${className}
        `}
      >
        {/* Ambient Glow */}
        <div className="absolute -top-12 -left-12 w-36 h-36 rounded-full bg-amber-400/10 dark:bg-amber-500/10 blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">🚀</span>
            <h3 className="text-sm sm:text-base font-black text-[#1D2C4A] dark:text-zinc-100 tracking-tight">
              Starter Missions
            </h3>
            <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-amber-400/40 dark:border-amber-500/30">
              +{totalXP} XP
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-400">
              {completedCount} / {totalCount} completed
            </span>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-[#8A6D4B] dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 transition text-xs p-1 rounded-md cursor-pointer"
                aria-label="Dismiss starter missions card"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full bg-[#E8D9B8] dark:bg-slate-800 rounded-full h-2 mb-3 overflow-hidden border border-[#D4B97A]/40 dark:border-slate-700/50 relative z-10">
          <div
            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Compact Active Quest Snippet & "View all" trigger */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1 relative z-10">
          {activeQuest && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base flex-shrink-0">{activeQuest.icon}</span>
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="text-xs sm:text-[13px] font-bold text-[#1D2C4A] dark:text-slate-100 truncate">
                  {activeQuest.title}
                </span>
                {isActiveComplete ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    +{activeQuest.xpReward} XP · Completed
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-800 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                    +{activeQuest.xpReward} XP
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs font-black text-[#8A4E12] dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer ml-auto sm:ml-0"
          >
            <span>View all missions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full Starter Missions Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ariaLabel="Starter Missions"
        panelClassName="bhalyam-font relative w-full max-w-lg
                   max-h-[92dvh] overflow-y-auto
                   bg-[#FAF3E0] dark:bg-[#0E1526] text-stone-900 dark:text-slate-100
                   border-2 border-[#E8D8BE] dark:border-slate-800
                   rounded-3xl p-5 sm:p-6
                   shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8D8BE] dark:border-white/10 pb-3">
            <h3 className="text-lg font-black text-[#1D2C4A] dark:text-zinc-100 flex items-center gap-2">
              <span>🚀</span> Starter Missions
            </h3>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition cursor-pointer"
              aria-label="Close missions modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Header Summary */}
          <div className="p-4 rounded-2xl bg-[#FCF8EF] dark:bg-[#162035] border border-[#E8D8BE] dark:border-slate-700 flex items-center justify-between shadow-xs">
            <div>
              <h4 className="text-sm font-black text-[#1D2C4A] dark:text-amber-300">
                Early Explorer Journey
              </h4>
              <p className="text-xs font-semibold text-[#6B5E52] dark:text-slate-400 mt-0.5">
                Complete quests to level up and earn early XP rewards.
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-300 block">
                {completedCount} / {totalCount}
              </span>
              <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                {percentage}% Done
              </span>
            </div>
          </div>

          {/* Quest List */}
          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
            {STARTER_QUESTS.map((quest) => {
              const isComplete = journeyTracker.isMilestoneComplete(quest.id);

              return (
                <div
                  key={quest.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition ${
                    isComplete
                      ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-700/50 shadow-2xs"
                      : "bg-white dark:bg-[#18233A] border-[#E8D8BE] dark:border-slate-700/80 hover:border-amber-400"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{quest.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${
                          isComplete
                            ? "text-emerald-950 dark:text-emerald-100"
                            : "text-[#1D2C4A] dark:text-stone-100"
                        }`}>
                          {quest.title}
                        </span>
                        <span className={`text-[10px] font-mono font-bold flex-shrink-0 px-1.5 py-0.2 rounded ${
                          isComplete
                            ? "text-emerald-900 dark:text-emerald-300 bg-emerald-500/20"
                            : "text-amber-800 dark:text-amber-400 bg-amber-500/15"
                        }`}>
                          +{quest.xpReward} XP
                        </span>
                      </div>
                      <p className={`text-xs font-semibold mt-0.5 truncate ${
                        isComplete
                          ? "text-emerald-800 dark:text-emerald-400"
                          : "text-[#6B5E52] dark:text-slate-400"
                      }`}>
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 text-white dark:bg-emerald-500/30 dark:text-emerald-300 border border-emerald-600 dark:border-emerald-500/40 text-xs font-black font-mono shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    ) : quest.actionRoute ? (
                      <Link
                        to={quest.actionRoute}
                        onClick={() => {
                          journeyTracker.markMilestone(quest.id);
                          setModalOpen(false);
                        }}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-stone-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs inline-flex items-center justify-center transition cursor-pointer active:scale-95"
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
      </Modal>
    </>
  );
};
