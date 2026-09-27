import React from "react";
import {
  Gamepad2,
  Trophy,
  Flame,
  Zap,
  Crown,
  Award,
  Star,
  Shield,
  Users,
  Medal,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { Achievement } from "@shared/profile/Achievements";
import { EmptyStateIllustration } from "../../design-system/premium";

interface AchievementsPanelProps {
  achievements: Achievement[];
  onSelectAchievement?: (ach: Achievement) => void;
}

export default function AchievementsPanel({ achievements, onSelectAchievement }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completionPct = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  const renderBadgeIcon = (ach: Achievement) => {
    switch (ach.id) {
      case "first_match":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-purple-500 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(88,28,135,1)]">
            <Gamepad2 className="w-6 h-6 text-purple-100" />
          </div>
        );
      case "first_win":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(6,95,70,1)]">
            <Trophy className="w-6 h-6 text-emerald-100" />
          </div>
        );
      case "three_streak":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(194,65,12,1)]">
            <Flame className="w-6 h-6 text-orange-100" />
          </div>
        );
      case "five_streak":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-sky-500 to-sky-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(3,105,161,1)]">
            <Zap className="w-6 h-6 text-sky-100" />
          </div>
        );
      case "ten_wins":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(180,83,9,1)]">
            <Crown className="w-6 h-6 text-stone-950" />
          </div>
        );
      case "fifty_wins":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(190,18,60,1)]">
            <Medal className="w-6 h-6 text-rose-100" />
          </div>
        );
      case "hundred_wins":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-purple-400 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(67,56,202,1)]">
            <Award className="w-6 h-6 text-purple-100" />
          </div>
        );
      case "fifty_matches":
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-teal-500 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(15,118,110,1)]">
            <Star className="w-6 h-6 text-teal-100" />
          </div>
        );
      default:
        if (ach.category === "resilience") {
          return (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(67,56,202,1)]">
              <Shield className="w-6 h-6 text-indigo-100" />
            </div>
          );
        }
        if (ach.category === "social") {
          return (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-pink-500 to-pink-700 text-white flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(190,24,93,1)]">
              <Users className="w-6 h-6 text-pink-100" />
            </div>
          );
        }
        return (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-[0_3px_0_rgba(180,83,9,1)]">
            <Award className="w-6 h-6 text-stone-950" />
          </div>
        );
    }
  };

  if (!achievements || achievements.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gradient-to-br dark:from-[#0c1424] dark:via-[#121c33] dark:to-[#090e1c] border-2 border-stone-200 dark:border-white/10 rounded-3xl shadow-lg">
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
      <div className="flex items-center justify-between bg-white dark:bg-gradient-to-r dark:from-[#0c1424] dark:to-[#121c33] p-4 rounded-2xl border-2 border-stone-200 dark:border-white/10 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-[0_2px_0_rgba(180,83,9,1)]">
            <Award className="w-4 h-4 text-stone-950" />
          </div>
          <h2 className="text-sm sm:text-base font-black text-stone-900 dark:text-white tracking-tight">
            Player Achievements ({unlockedCount} / {achievements.length} Unlocked)
          </h2>
        </div>
        <span className="text-xs font-black font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/50 px-3.5 py-1 rounded-full shadow-inner">
          {completionPct}% Completed
        </span>
      </div>

      {/* 4-column Supercell Trophy Road Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {achievements.map((ach) => {
          const isUnlocked = ach.unlocked;

          return (
            <div
              key={ach.id}
              role={onSelectAchievement ? "button" : undefined}
              tabIndex={onSelectAchievement ? 0 : undefined}
              onClick={() => onSelectAchievement?.(ach)}
              onKeyDown={(e) => {
                if (onSelectAchievement && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelectAchievement(ach);
                }
              }}
              className={`group relative rounded-3xl p-1 transition-all duration-300 text-left ${
                onSelectAchievement ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" : ""
              } ${
                isUnlocked
                  ? "bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_5px_0_rgba(180,83,9,0.8),0_10px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_5px_0_rgba(180,83,9,0.8),0_10px_20px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:shadow-[0_7px_0_rgba(180,83,9,1),0_14px_24px_rgba(245,158,11,0.3)]"
                  : "bg-gradient-to-b from-stone-200 via-stone-300 to-stone-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 shadow-[0_4px_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_0_rgba(0,0,0,0.6)] hover:-translate-y-0.5 opacity-90 hover:opacity-100"
              }`}
            >
              <div
                className={`h-full rounded-[22px] p-5 space-y-3.5 border-t flex flex-col justify-between relative overflow-hidden ${
                  isUnlocked
                    ? "bg-gradient-to-b from-[#FFFDF9] via-[#FAF3E2] to-[#F5ECE0] dark:from-[#241a0d] dark:via-[#161008] dark:to-[#0a0703] border-amber-300/80 dark:border-amber-300/40 text-stone-900 dark:text-white"
                    : "bg-white dark:bg-gradient-to-b dark:from-[#121c33] dark:via-[#0b1324] dark:to-[#060c18] border-stone-200 dark:border-white/10 text-stone-900 dark:text-white"
                }`}
              >
                {/* Subtle Ambient Light */}
                {isUnlocked && (
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />
                )}

                <div className="space-y-3 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="group-hover:scale-105 transition-transform">
                      {renderBadgeIcon(ach)}
                    </div>
                    {isUnlocked ? (
                      <span className="text-[10px] font-mono font-black bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-400 dark:border-emerald-500/60 border px-3 py-1 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>UNLOCKED</span>
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-black text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-black/60 border border-stone-200 dark:border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-inner">
                        <Lock className="w-3 h-3 text-stone-400" />
                        <span>{ach.currentProgress} / {ach.targetValue}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-stone-900 dark:text-white leading-tight tracking-tight">
                      {ach.title}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-300 font-medium leading-snug mt-1.5 min-h-[32px]">
                      {ach.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="pt-2 border-t border-stone-200 dark:border-white/10 space-y-1.5 relative z-10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-300 font-mono">
                    <span>Progress</span>
                    <span className={isUnlocked ? "text-amber-700 dark:text-amber-400 font-bold" : "text-stone-500 dark:text-stone-300"}>
                      {ach.progressPercent}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-stone-200 dark:bg-black/70 rounded-full overflow-hidden border border-stone-300 dark:border-white/15 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked
                          ? "bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                          : "bg-gradient-to-r from-stone-400 to-stone-500 dark:from-slate-600 dark:to-slate-400"
                      }`}
                      style={{ width: `${ach.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
