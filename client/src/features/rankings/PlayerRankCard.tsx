import type { PlayerRank, XPProgression } from "@shared/ranking/PlayerRank";
import { RANK_TIERS } from "@shared/ranking/RankingRules";
import type { PlayerStats } from "@shared/profile/PlayerStats";

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
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: tierConfig.color }}
      />

      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        {/* Tier Badge & Rating */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg border border-stone-700/50 relative"
            style={{
              background: `linear-gradient(135deg, ${tierConfig.color}22, ${tierConfig.color}55)`,
              borderColor: `${tierConfig.color}88`,
            }}
          >
            {tierConfig.badge}
            <span
              className="absolute -bottom-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow bg-stone-950 text-stone-100"
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
              <span className="text-xs text-stone-400 font-mono">Rating</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
              <span>Global Rank: <strong className="text-amber-400">#{rank.globalRank}</strong></span>
              <span>• Top {rank.percentile}%</span>
            </div>

            {/* Tier Progress */}
            <div className="w-48 sm:w-56 pt-1 space-y-1">
              <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                <span>Tier Progress</span>
                <span>{rank.tierProgressPercent}%</span>
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
        <div className="flex-1 w-full md:max-w-xs space-y-3 bg-stone-950/60 dark:bg-zinc-950/60 border border-stone-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-300">Level {progression.currentLevel}</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                LVL {progression.currentLevel}
              </span>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {progression.currentXP} / {progression.nextLevelXP} XP
            </span>
          </div>

          <div className="h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progression.levelProgressPercent}%` }}
            />
          </div>

          {/* Win & Play Streaks */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-center font-mono text-xs border-t border-stone-800/80">
              <div className="bg-stone-900/60 rounded-lg p-1.5 border border-stone-800">
                <span className="text-[10px] text-stone-500 block">Win Streak</span>
                <span className="font-bold text-amber-400">
                  🔥 {stats.currentWinStreak || 0} <span className="text-[10px] text-stone-500">(Best: {stats.bestWinStreak || 0})</span>
                </span>
              </div>
              <div className="bg-stone-900/60 rounded-lg p-1.5 border border-stone-800">
                <span className="text-[10px] text-stone-500 block">Play Streak</span>
                <span className="font-bold text-sky-400">
                  ⚡ {stats.currentPlayStreak || 0} <span className="text-[10px] text-stone-500">(Best: {stats.bestPlayStreak || 0})</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
