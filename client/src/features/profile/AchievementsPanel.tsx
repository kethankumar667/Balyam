import React from "react";
import type { Achievement } from "@shared/profile/Achievements";
import { AchievementRarityBadge, type AchievementRarity } from "../../design-system/icons";
import { EmptyStateIllustration } from "../../design-system/premium";

interface AchievementsPanelProps {
  achievements: Achievement[];
}

export default function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const getRarityForCategory = (ach: Achievement): AchievementRarity => {
    if (ach.id === "ten_tournament_wins" || ach.id === "season_champion") return "mythic";
    if (ach.id === "triple_crown" || ach.id === "tournament_champion" || ach.id === "lounge_legend") return "legendary";
    if (ach.id.includes("master") || ach.category === "resilience") return "epic";
    if (ach.category === "skill") return "rare";
    return "common";
  };

  if (!achievements || achievements.length === 0) {
    return (
      <div className="p-8 text-center bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl">
        <EmptyStateIllustration
          type="achievements"
          title="No Achievements Unlocked Yet"
          description="Jump into any match, roll sixes in Ludo, or declare in Rummy to earn badges & XP."
          actionText="Play First Match"
          onAction={() => {
            if (typeof window !== "undefined") window.location.href = "/games";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold font-mono text-[var(--auth-ink-soft)] uppercase tracking-wider">
          Player Achievements ({unlockedCount} / {achievements.length} Unlocked)
        </h2>
        <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
          {Math.round((unlockedCount / achievements.length) * 100)}% Completed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {achievements.map((ach) => {
          const rarity = getRarityForCategory(ach);

          return (
            <div
              key={ach.id}
              className={`border rounded-2xl p-4 flex flex-col justify-between transition relative overflow-hidden shadow-xs hover:shadow-md ${
                ach.unlocked
                  ? "bg-[var(--auth-card)] border-[var(--auth-card-edge)] hover:border-amber-500/50"
                  : "bg-[var(--auth-field)] border-[var(--auth-field-edge)] opacity-75"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <AchievementRarityBadge
                    icon={ach.icon}
                    rarity={rarity}
                    unlocked={ach.unlocked}
                    size={46}
                  />
                  {ach.unlocked ? (
                    <span className="text-[10px] font-mono font-black bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-[var(--auth-ink-soft)]">
                      {ach.currentProgress} / {ach.targetValue}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-[var(--auth-ink)]">
                    {ach.title}
                  </h3>
                  <p className="text-xs text-[var(--auth-ink-soft)] leading-snug mt-1">
                    {ach.description}
                  </p>
                </div>
              </div>

              {/* Progress bar for locked */}
              {!ach.unlocked && (
                <div className="mt-3.5 pt-2.5 border-t border-[var(--auth-field-edge)] space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold text-[var(--auth-ink-soft)]">
                    <span>Progress</span>
                    <span>{ach.progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-[var(--auth-card)] rounded-full overflow-hidden border border-[var(--auth-card-edge)] shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                      style={{ width: `${ach.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
