import React from "react";
import {
  Gamepad2,
  Trophy,
  Flame,
  Zap,
  Crown,
  Award,
  Sparkles,
  Star,
  Shield,
  Users,
  Medal,
} from "lucide-react";
import type { Achievement } from "@shared/profile/Achievements";
import { EmptyStateIllustration } from "../../design-system/premium";

interface AchievementsPanelProps {
  achievements: Achievement[];
}

export default function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completionPct = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  const renderBadgeIcon = (ach: Achievement) => {
    switch (ach.id) {
      case "first_match":
        return (
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Gamepad2 className="w-5 h-5" />
          </div>
        );
      case "first_win":
        return (
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Trophy className="w-5 h-5" />
          </div>
        );
      case "three_streak":
        return (
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Flame className="w-5 h-5" />
          </div>
        );
      case "five_streak":
        return (
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Zap className="w-5 h-5" />
          </div>
        );
      case "ten_wins":
        return (
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Crown className="w-5 h-5" />
          </div>
        );
      case "fifty_wins":
        return (
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Medal className="w-5 h-5" />
          </div>
        );
      case "hundred_wins":
        return (
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      case "fifty_matches":
        return (
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 border border-teal-100 dark:border-teal-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Star className="w-5 h-5" />
          </div>
        );
      default:
        if (ach.category === "resilience") {
          return (
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              <Shield className="w-5 h-5" />
            </div>
          );
        }
        if (ach.category === "social") {
          return (
            <div className="w-11 h-11 rounded-2xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
          );
        }
        return (
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
        );
    }
  };

  if (!achievements || achievements.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl">
        <EmptyStateIllustration
          type="achievements"
          title="No Achievements In This Category"
          description="Try selecting another category or play multiplayer matches to unlock milestones."
          actionText="Explore Games"
          onAction={() => {
            if (typeof window !== "undefined") window.location.href = "/games";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Player Achievements ({unlockedCount} / {achievements.length} Unlocked)
          </h2>
        </div>
        <span className="text-xs font-bold text-[#EA580C] bg-[#FFF7ED] dark:bg-amber-950/30 border border-[#FFEDD5] dark:border-amber-900/50 px-3 py-1 rounded-full">
          {completionPct}% Completed
        </span>
      </div>

      {/* 4-column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-3.5 shadow-xs hover:border-amber-500/40 transition flex flex-col justify-between ${
              ach.unlocked ? "border-amber-500/30 ring-1 ring-amber-500/20" : ""
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                {renderBadgeIcon(ach)}
                {ach.unlocked ? (
                  <span className="text-[10px] font-mono font-black bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] px-2.5 py-0.5 rounded-full uppercase">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {ach.currentProgress} / {ach.targetValue}
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  {ach.title}
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-snug mt-1 min-h-[32px]">
                  {ach.description}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="pt-2 border-t border-[#F3EFE9] dark:border-[#202740] space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span className="uppercase">Progress</span>
                <span>{ach.progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                  style={{ width: `${ach.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
