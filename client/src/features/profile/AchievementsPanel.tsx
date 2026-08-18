import type { Achievement } from "@shared/profile/Achievements";

interface AchievementsPanelProps {
  achievements: Achievement[];
}

export default function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

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
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`border rounded-xl p-4 flex flex-col justify-between transition ${
              ach.unlocked
                ? "bg-amber-500/10 border-amber-500/30 text-amber-100"
                : "bg-stone-900/40 dark:bg-zinc-900/40 border-stone-800 dark:border-zinc-800 opacity-60 text-stone-400"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{ach.icon}</span>
                {ach.unlocked ? (
                  <span className="text-[10px] font-bold bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-full">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-stone-500">
                    {ach.currentProgress} / {ach.targetValue}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-stone-100 dark:text-zinc-100">
                {ach.title}
              </h3>
              <p className="text-xs text-stone-400 dark:text-zinc-400 leading-snug">
                {ach.description}
              </p>
            </div>

            {/* Progress bar for locked */}
            {!ach.unlocked && (
              <div className="mt-3 pt-2 border-t border-stone-800/50">
                <div className="h-1 bg-stone-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500/60 rounded-full"
                    style={{ width: `${ach.progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
