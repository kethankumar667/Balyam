import React from "react";
import { GLASSMORPHISM } from "./glassmorphism";
import { ChampionCrownIcon, LevelSparkleIcon } from "../icons";

interface RewardRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  earnedXP?: number;
  rewardName?: string;
}

export const RewardRevealModal: React.FC<RewardRevealModalProps> = ({
  isOpen,
  onClose,
  title = "Reward Unlocked!",
  subtitle = "Congratulations on your competitive achievement",
  badge = "👑",
  earnedXP,
  rewardName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewardModalTitle"
    >
      <div
        className={`max-w-md w-full rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.modal} shadow-2xl text-center space-y-6 relative overflow-hidden border border-amber-500/40`}
      >
        {/* Radiating Sunburst Aura */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Badge Showcase */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/30 to-amber-500/10 border-2 border-amber-400/80 flex items-center justify-center shadow-[0_0_36px_rgba(245,158,11,0.4)] animate-bounce duration-1000">
          <span className="text-5xl sm:text-6xl select-none">{badge}</span>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1">
            <LevelSparkleIcon size={14} className="text-amber-400" />
            {title}
          </span>
          {rewardName && (
            <h2 id="rewardModalTitle" className="text-xl sm:text-2xl font-black text-stone-100 dark:text-zinc-100 tracking-tight">
              {rewardName}
            </h2>
          )}
          <p className="text-xs text-stone-400 font-mono leading-relaxed">
            {subtitle}
          </p>
        </div>

        {earnedXP !== undefined && earnedXP > 0 && (
          <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-2xl">
            <ChampionCrownIcon size={18} className="text-amber-400" />
            <span className="text-sm font-black font-mono text-amber-300">
              +{earnedXP} Season & Lifetime XP
            </span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-98"
        >
          Claim & Continue
        </button>
      </div>
    </div>
  );
};
