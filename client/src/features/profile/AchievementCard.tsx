import React from "react";
import type { Achievement } from "@shared/profile/Achievements";
import { AchievementRarityBadge, type AchievementRarity } from "../../design-system/icons";
import { PREMIUM_RARITY_COLORS } from "../../design-system/premium";
import { Sparkles, CheckCircle2 } from "lucide-react";

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
          ? "bg-[var(--auth-card)] border-2 border-amber-500/30 hover:border-amber-500/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
          : "bg-[var(--auth-field)] border border-[var(--auth-field-edge)] opacity-70 hover:opacity-90"
      }`}
    >
      {/* Subtle rarity backdrop shimmer */}
      {achievement.unlocked && (
        <div
          className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none group-hover:opacity-35 transition-opacity"
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
              className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border shadow-xs flex items-center gap-1"
              style={{
                borderColor: `${colorToken.primary}66`,
                backgroundColor: `${colorToken.primary}22`,
                color: colorToken.primary,
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              UNLOCKED
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold text-[var(--auth-ink-soft)] bg-[var(--auth-card)] px-2 py-0.5 rounded-md border border-[var(--auth-card-edge)]">
              {achievement.currentProgress} / {achievement.targetValue}
            </span>
          )}
        </div>

        <div>
          <h3 className="font-extrabold text-sm text-[var(--auth-ink)] group-hover:text-amber-500 transition-colors">
            {achievement.title}
          </h3>
          <p className="text-xs text-[var(--auth-ink-soft)] leading-snug mt-0.5">
            {achievement.description}
          </p>
        </div>
      </div>

      {/* Progress Bar for Locked */}
      {!achievement.unlocked && (
        <div className="mt-3 pt-2 border-t border-[var(--auth-field-edge)] space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-bold text-[var(--auth-ink-soft)]">
            <span>Progress</span>
            <span>{achievement.progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-[var(--auth-card)] rounded-full overflow-hidden border border-[var(--auth-card-edge)]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
              style={{ width: `${achievement.progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
