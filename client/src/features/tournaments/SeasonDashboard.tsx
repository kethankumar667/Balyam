import { useState } from "react";
import type { Season, PlayerSeasonStats } from "@shared/seasons/Season";
import type { SeasonRewardTier } from "@shared/seasons/SeasonRewards";

interface SeasonDashboardProps {
  season: Season;
  stats: PlayerSeasonStats;
  rewards: Array<SeasonRewardTier & { unlocked: boolean; claimed: boolean }>;
  onClaimReward: (tierId: string) => Promise<void>;
}

export default function SeasonDashboard({
  season,
  stats,
  rewards,
  onClaimReward,
}: SeasonDashboardProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const timeRemaining = formatSeasonRemaining(season.endsAt);

  const handleClaim = async (tierId: string) => {
    setClaimingId(tierId);
    try {
      await onClaimReward(tierId);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Season Hero Banner */}
      <div className="bg-gradient-to-tr from-amber-950/40 via-stone-900/90 to-zinc-900/90 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              Active Championship Season
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100 dark:text-zinc-100 tracking-tight">
              {season.name}
            </h2>
            <p className="text-xs text-stone-400 font-mono">
              Climb tiers, advance in brackets, and claim exclusive seasonal rewards.
            </p>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 text-center min-w-[140px]">
            <span className="text-[10px] text-stone-500 font-mono uppercase block">Season Ends In</span>
            <span className="text-lg font-black font-mono text-amber-400">{timeRemaining}</span>
          </div>
        </div>

        {/* Season XP & Level Bar */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-stone-300">
            <span className="font-bold text-amber-400">
              Season Level {stats.seasonLevel} • Tier: {stats.seasonRankTier}
            </span>
            <span>{stats.seasonXP} Total Season XP</span>
          </div>
          <div className="h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (stats.seasonXP / 2500) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Season Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4">
          <span className="text-[10px] text-stone-500 block">Season Matches</span>
          <span className="text-xl font-black text-stone-100">{stats.seasonMatches}</span>
        </div>
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4">
          <span className="text-[10px] text-stone-500 block">Season Wins</span>
          <span className="text-xl font-black text-emerald-400">{stats.seasonWins}</span>
        </div>
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4">
          <span className="text-[10px] text-stone-500 block">Win Rate</span>
          <span className="text-xl font-black text-sky-400">{stats.seasonWinRate}%</span>
        </div>
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4">
          <span className="text-[10px] text-stone-500 block">Tournament Titles</span>
          <span className="text-xl font-black text-amber-400">👑 {stats.tournamentWins}</span>
        </div>
      </div>

      {/* Seasonal Rewards Ladder */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
          Seasonal Tier Rewards Track
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {rewards.map((reward) => (
            <div
              key={reward.tierId}
              className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition ${
                reward.claimed
                  ? "bg-stone-950/40 border-stone-800/60 opacity-60"
                  : reward.unlocked
                  ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
                  : "bg-stone-900/80 border-stone-800"
              }`}
            >
              <div className="space-y-1 text-center">
                <span className="text-3xl block mb-1">{reward.icon}</span>
                <span className="text-xs font-bold text-stone-100 block">{reward.name}</span>
                <span className="text-[10px] font-mono text-stone-400 block">{reward.title}</span>
                <span className="text-[10px] font-mono text-amber-400 block">
                  Req: {reward.minSeasonXP} XP
                </span>
              </div>

              {reward.claimed ? (
                <div className="text-center text-[10px] font-mono font-bold text-stone-500 bg-stone-900/60 py-1.5 rounded-xl border border-stone-800">
                  ✓ CLAIMED
                </div>
              ) : reward.unlocked ? (
                <button
                  onClick={() => handleClaim(reward.tierId)}
                  disabled={claimingId === reward.tierId}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-black text-[11px] py-1.5 rounded-xl transition shadow active:scale-[0.99]"
                >
                  {claimingId === reward.tierId ? "Claiming..." : `Claim +${reward.bonusXP} XP`}
                </button>
              ) : (
                <div className="text-center text-[10px] font-mono text-stone-500 bg-stone-950/60 py-1.5 rounded-xl border border-stone-800">
                  LOCKED
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatSeasonRemaining(endsAt: number): string {
  const diffSec = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  return `${days}d ${hours}h`;
}
