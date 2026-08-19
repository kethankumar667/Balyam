import React from "react";
import type { PlayerRank, XPProgression } from "@shared/ranking/PlayerRank";
import { RANK_TIERS } from "@shared/ranking/RankingRules";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import { RankTierIcon, StreakFlameIcon, LevelSparkleIcon, ShieldNavIcon } from "../../design-system/icons";
import { PREMIUM_RANK_COLORS, GLASSMORPHISM } from "../../design-system/premium";

interface RankShowcaseCardProps {
  rank: PlayerRank;
  progression: XPProgression;
  stats?: PlayerStats;
}

export const RankShowcaseCard: React.FC<RankShowcaseCardProps> = ({
  rank,
  progression,
  stats,
}) => {
  const tierKey = (rank.tier.toLowerCase() || "bronze") as keyof typeof PREMIUM_RANK_COLORS;
  const token = PREMIUM_RANK_COLORS[tierKey] || PREMIUM_RANK_COLORS.bronze;
  const tierConfig = RANK_TIERS[rank.tier] || RANK_TIERS.Bronze;

  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.elevatedCard} relative overflow-hidden shadow-2xl border transition-all duration-300`}
      style={{ borderColor: `${token.primary}66` }}
    >
      {/* Radiating Tier Aura Backdrop */}
      <div
        className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-700 animate-pulse"
        style={{ backgroundColor: token.primary }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: token.secondary }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
        {/* Tier Emblem & Competitive Standings */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Animated 3D-effect Shield Container */}
          <div className="relative group">
            <div
              className="p-3.5 rounded-3xl bg-stone-950/90 border shadow-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{
                borderColor: `${token.primary}88`,
                boxShadow: `0 0 32px ${token.aura}`,
              }}
            >
              <RankTierIcon tier={rank.tier} size={72} />
            </div>
            <span
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase px-3 py-0.5 rounded-full border shadow-xl bg-stone-950 text-stone-100 font-mono tracking-widest"
              style={{ borderColor: token.primary, color: token.light }}
            >
              {rank.tier}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono text-stone-100 dark:text-zinc-100 tracking-tight">
                {rank.rating}
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                Competitive Rating
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 text-xs font-mono text-stone-300">
              <span className="flex items-center gap-1">
                <ShieldNavIcon size={14} className="text-amber-400" />
                Global Rank: <strong className="text-amber-400">#{rank.globalRank}</strong>
              </span>
              <span>• Top {rank.percentile}% of lounge</span>
            </div>

            {/* Tier Progress Bar */}
            <div className="w-full sm:w-64 pt-2 space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-stone-400">
                <span>Tier Progress</span>
                <span className="font-bold text-stone-200">{rank.tierProgressPercent}%</span>
              </div>
              <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800 shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-700 shadow-md"
                  style={{
                    width: `${rank.tierProgressPercent}%`,
                    backgroundColor: token.primary,
                    boxShadow: `0 0 12px ${token.primary}`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Level XP Progress & Win Streak Pill */}
        <div className="flex flex-col items-center lg:items-end space-y-3 w-full lg:w-auto">
          {/* Level Progress */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 w-full sm:w-72 space-y-2 shadow-lg">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <LevelSparkleIcon size={14} className="text-amber-400" />
                Level {progression.currentLevel}
              </span>
              <span className="text-stone-400 text-[11px]">
                {progression.currentXP} / {progression.nextLevelXP} XP
              </span>
            </div>
            <div className="h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                style={{ width: `${progression.levelProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Streaks Banner */}
          {stats && (
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 text-xs font-mono">
              <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-amber-300 flex items-center gap-1.5 shadow">
                <StreakFlameIcon size={14} className="text-amber-400" />
                <span>Win Streak: <strong>{stats.currentWinStreak}</strong> (Best: {stats.bestWinStreak})</span>
              </div>
              <div className="bg-sky-500/10 border border-sky-500/30 px-3.5 py-1.5 rounded-xl text-sky-300 flex items-center gap-1 shadow">
                <span>Play Streak: <strong>{stats.currentPlayStreak}d</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
