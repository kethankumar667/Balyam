import React from "react";
import type { Achievement } from "@shared/profile/Achievements";
import { AchievementRarityBadge, type AchievementRarity } from "../../design-system/icons";
import { PREMIUM_RARITY_COLORS } from "../../design-system/premium";

interface AchievementCardProps {
  achievement: Achievement;
  onSelect?: (ach: Achievement) => void;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  onSelect,
}) => {
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
      onClick={() => onSelect?.(achievement)}
      className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden cursor-pointer group ${
        achievement.unlocked
          ? "bg-stone-900/90 dark:bg-zinc-900/90 border border-stone-850 dark:border-zinc-850 hover:border-stone-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          : "bg-stone-950/40 dark:bg-zinc-950/40 border border-stone-900 opacity-60 text-stone-500 hover:opacity-80"
      }`}
    >
      {/* Subtle rarity backdrop shimmer */}
      {achievement.unlocked && (
        <div
          className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none group-hover:opacity-30 transition-opacity"
          style={{ backgroundColor: colorToken.primary }}
        />
      )}

      <div className="space-y-3 relative z-10">
        <div className="flex items-start justify-between">
          <AchievementRarityBadge
            icon={achievement.icon}
            rarity={rarity}
            unlocked={achievement.unlocked}
            size={48}
          />
          {achievement.unlocked ? (
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow"
              style={{
                borderColor: `${colorToken.primary}66`,
                backgroundColor: `${colorToken.primary}22`,
                color: colorToken.primary,
              }}
            >
              UNLOCKED
            </span>
          ) : (
            <span className="text-[10px] font-mono text-stone-500">
              {achievement.currentProgress} / {achievement.targetValue}
            </span>
          )}
        </div>

        <div>
          <h3 className="font-bold text-sm text-stone-100 dark:text-zinc-100 group-hover:text-amber-300 transition-colors">
            {achievement.title}
          </h3>
          <p className="text-xs text-stone-400 dark:text-zinc-400 leading-snug mt-0.5">
            {achievement.description}
          </p>
        </div>
      </div>

      {/* Progress Bar for Locked */}
      {!achievement.unlocked && (
        <div className="mt-3 pt-2 border-t border-stone-800/50 space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-stone-500">
            <span>Progress</span>
            <span>{achievement.progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
            <div
              className="h-full bg-amber-500/70 rounded-full transition-all duration-300"
              style={{ width: `${achievement.progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
