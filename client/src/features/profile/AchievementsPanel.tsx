import type { LucideIcon } from "lucide-react";
import {
  Award,
  CheckCircle2,
  Crosshair,
  Gamepad2,
  LockKeyhole,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import type { Achievement } from "@shared/profile/Achievements";

interface AchievementsPanelProps {
  achievements: Achievement[];
  onSelectAchievement?: (achievement: Achievement) => void;
}

const CATEGORY_ICON: Record<Achievement["category"], LucideIcon> = {
  progression: Gamepad2,
  skill: Crosshair,
  resilience: ShieldCheck,
  social: Users,
};

const CATEGORY_ACCENT: Record<Achievement["category"], string> = {
  progression: "bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300",
  skill: "bg-lamp-100 text-lamp-800 dark:bg-lamp-500/15 dark:text-lamp-300",
  resilience: "bg-violet-100 text-violet-800 dark:bg-violet-400/10 dark:text-violet-300",
  social: "bg-rose-100 text-rose-800 dark:bg-rose-400/10 dark:text-rose-300",
};

export default function AchievementsPanel({ achievements, onSelectAchievement }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-ink-hi">
          Player Achievements ({unlockedCount} / {achievements.length} Unlocked)
        </h4>
        <span className="hidden items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-lo sm:inline-flex">
          <Trophy className="h-3.5 w-3.5 text-lamp-600" aria-hidden="true" />
          Select for details
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {achievements.map((achievement) => {
          const Icon = CATEGORY_ICON[achievement.category] ?? Award;
          const progress = Math.min(100, Math.max(0, Math.round(achievement.progressPercent)));
          return (
            <button
              key={achievement.id}
              type="button"
              onClick={() => onSelectAchievement?.(achievement)}
              disabled={!onSelectAchievement}
              className={`relative min-h-[184px] overflow-hidden rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 ${
                achievement.unlocked
                  ? "border-lamp-500/45 bg-lamp-500/5 hover:border-lamp-500/80"
                  : "border-stone-300/80 bg-surface-0 hover:border-violet-400/60 dark:border-slate-700/80"
              } disabled:cursor-default`}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${CATEGORY_ACCENT[achievement.category]}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
                achievement.unlocked
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-stone-300 bg-surface-1 text-ink-lo dark:border-slate-600"
              }`}>
                {achievement.unlocked ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <LockKeyhole className="h-3 w-3" aria-hidden="true" />}
                {achievement.unlocked ? "Unlocked" : `${achievement.currentProgress}/${achievement.targetValue}`}
              </span>

              <span className="mt-4 block text-sm font-black text-ink-hi">{achievement.title}</span>
              <span className="mt-1 block min-h-10 text-xs leading-relaxed text-ink-mid">{achievement.description}</span>

              <span className="mt-4 block">
                <span className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-ink-lo">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </span>
                <span className="block h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={`${achievement.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <span className={`block h-full rounded-full ${achievement.unlocked ? "bg-lamp-500" : "bg-violet-500"}`} style={{ width: `${progress}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
