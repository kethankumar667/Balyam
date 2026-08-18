import type { PlayerRank, XPProgression } from "@shared/ranking/PlayerRank";
import { RANK_TIERS } from "@shared/ranking/RankingRules";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import { RankTierIcon, StreakFlameIcon, LevelSparkleIcon } from "../../design-system/icons";

interface PlayerRankCardProps {
  rank: PlayerRank;
  progression: XPProgression;
  stats?: PlayerStats;
}

export default function PlayerRankCard({ rank, progression, stats }: PlayerRankCardProps) {
  const tierConfig = RANK_TIERS[rank.tier] || RANK_TIERS.Bronze;

  return (
    <div className="bg-stone-900/90 dark:bg-zinc-900/90 border border-stone-800 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Background glow tailored to tier color */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: tierConfig.color }}
      />

      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        {/* Tier Shield & Rating */}
        <div className="flex items-center gap-4">
          <div className="relative flex flex-col items-center">
            <div className="p-1 rounded-2xl bg-stone-950/80 border border-stone-800 shadow-xl flex items-center justify-center">
              <RankTierIcon tier={rank.tier} size={54} />
            </div>
            <span
              className="mt-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow bg-stone-950 text-stone-100 font-mono tracking-wider"
              style={{ borderColor: tierConfig.color }}
            >
              {rank.tier}
            </span>
          </div>

          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-stone-100 dark:text-zinc-100">
                {rank.rating}
              </span>
              <span className="text-xs text-stone-400 font-mono uppercase tracking-wider font-bold">Rating</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
              <span>Global Rank: <strong className="text-amber-400">#{rank.globalRank}</strong></span>
              <span>• Top {rank.percentile}%</span>
            </div>

            {/* Tier Progress */}
            <div className="w-48 sm:w-56 pt-1 space-y-1">
              <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                <span>Tier Progress</span>
                <span className="font-bold text-stone-200">{rank.tierProgressPercent}%</span>
              </div>
              <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${rank.tierProgressPercent}%`,
                    backgroundColor: tierConfig.color,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Level, XP & Streaks */}
        <div className="flex flex-col items-center md:items-end space-y-3 w-full md:w-auto">
          {/* Level Progress */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 w-full sm:w-64 space-y-2">
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
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${progression.levelProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Streaks Banner */}
          {stats && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-amber-400 flex items-center gap-1.5">
                <StreakFlameIcon size={14} className="text-amber-400" />
                <span>Win Streak: <strong>{stats.currentWinStreak}</strong> (Best: {stats.bestWinStreak})</span>
              </div>
              <div className="bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-lg text-sky-400 flex items-center gap-1">
                <span>Play Streak: <strong>{stats.currentPlayStreak}d</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
