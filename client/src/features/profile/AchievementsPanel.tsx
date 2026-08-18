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
      <div className="p-8 text-center bg-stone-900/60 border border-stone-800 rounded-3xl">
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
        <h2 className="text-xs font-bold text-stone-200 dark:text-zinc-200 uppercase tracking-wider">
          Player Achievements ({unlockedCount} / {achievements.length} Unlocked)
        </h2>
        <span className="text-xs font-mono font-semibold text-amber-400">
          {Math.round((unlockedCount / achievements.length) * 100)}% Completed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {achievements.map((ach) => {
          const rarity = getRarityForCategory(ach);

          return (
            <div
              key={ach.id}
              className={`border rounded-2xl p-4 flex flex-col justify-between transition relative overflow-hidden ${
                ach.unlocked
                  ? "bg-stone-900/90 dark:bg-zinc-900/90 border-stone-800 dark:border-zinc-800 shadow-lg"
                  : "bg-stone-950/40 dark:bg-zinc-950/40 border-stone-850 dark:border-zinc-850 opacity-60 text-stone-400"
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
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-stone-500">
                      {ach.currentProgress} / {ach.targetValue}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-stone-100 dark:text-zinc-100">
                    {ach.title}
                  </h3>
                  <p className="text-xs text-stone-400 dark:text-zinc-400 leading-snug mt-0.5">
                    {ach.description}
                  </p>
                </div>
              </div>

              {/* Progress bar for locked */}
              {!ach.unlocked && (
                <div className="mt-3 pt-2 border-t border-stone-800/50 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-stone-500">
                    <span>Progress</span>
                    <span>{ach.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className="h-full bg-amber-500/60 rounded-full transition-all duration-300"
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
