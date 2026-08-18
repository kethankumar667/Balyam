import React from "react";
import type { Achievement } from "@shared/profile/Achievements";
import { AchievementRarityBadge, type AchievementRarity } from "../../design-system/icons";
import { PREMIUM_RARITY_COLORS, GLASSMORPHISM } from "../../design-system/premium";

interface AchievementRevealModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementRevealModal: React.FC<AchievementRevealModalProps> = ({
  achievement,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !achievement) return null;

  const getRarity = (ach: Achievement): AchievementRarity => {
    if (ach.id === "ten_tournament_wins" || ach.id === "season_champion") return "mythic";
    if (ach.id === "triple_crown" || ach.id === "tournament_champion" || ach.id === "lounge_legend") return "legendary";
    if (ach.id.includes("master") || ach.category === "resilience") return "epic";
    if (ach.category === "skill") return "rare";
    return "common";
  };

  const rarity = getRarity(achievement);
  const colorToken = PREMIUM_RARITY_COLORS[rarity];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achModalTitle"
    >
      <div
        className={`max-w-md w-full rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.modal} shadow-2xl text-center space-y-6 relative overflow-hidden border`}
        style={{ borderColor: `${colorToken.primary}88` }}
      >
        {/* Rarity ambient aura */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: colorToken.primary }}
        />

        {/* Badge Presentation */}
        <div className="flex justify-center">
          <AchievementRarityBadge
            icon={achievement.icon}
            rarity={rarity}
            unlocked={achievement.unlocked}
            size={72}
          />
        </div>

        <div className="space-y-1.5">
          <span
            className="text-[10px] font-mono font-black uppercase tracking-widest block"
            style={{ color: colorToken.primary }}
          >
            {rarity} Tier Achievement
          </span>
          <h2
            id="achModalTitle"
            className="text-xl sm:text-2xl font-black text-stone-100 dark:text-zinc-100 tracking-tight"
          >
            {achievement.title}
          </h2>
          <p className="text-xs text-stone-400 font-mono leading-relaxed max-w-sm mx-auto">
            {achievement.description}
          </p>
        </div>

        {/* Status Chip */}
        <div className="bg-stone-950/80 border border-stone-800 p-3 rounded-2xl flex items-center justify-between text-xs font-mono">
          <span className="text-stone-400">Status</span>
          {achievement.unlocked ? (
            <span className="text-emerald-400 font-bold">✓ Unlocked & Recorded</span>
          ) : (
            <span className="text-amber-400">
              In Progress ({achievement.currentProgress} / {achievement.targetValue})
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2.5 rounded-2xl text-xs transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
