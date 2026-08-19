import React, { useState } from "react";
import type { Season, PlayerSeasonStats } from "@shared/seasons/Season";
import type { SeasonRewardTier } from "@shared/seasons/SeasonRewards";
import { ChampionCrownIcon } from "../../design-system/icons";

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
      <div className="bg-gradient-to-tr from-amber-950/40 via-stone-900/90 to-zinc-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full inline-block">
              Active Championship Season
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-100 tracking-tight">
              {season.name}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 font-sans leading-relaxed">
              Climb competitive tiers, advance in knockout brackets, and unlock exclusive seasonal rewards.
            </p>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-center min-w-[150px] shrink-0 shadow-inner">
            <span className="text-[10px] text-stone-400 font-mono uppercase font-bold block">
              Season Ends In
            </span>
            <span className="text-xl font-black font-mono text-amber-400">{timeRemaining}</span>
          </div>
        </div>

        {/* Season XP & Level Bar */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 space-y-2 relative z-10">
          <div className="flex justify-between items-center text-xs font-mono text-stone-200">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <ChampionCrownIcon size={15} /> Season Level {stats.seasonLevel} • Tier: {stats.seasonRankTier}
            </span>
            <span className="font-bold">{stats.seasonXP} Total Season XP</span>
          </div>
          <div className="h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${Math.min(100, (stats.seasonXP / 2500) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Season Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono text-xs">
        <div className="bg-[var(--auth-card)] dark:bg-stone-900/80 border border-[var(--auth-card-edge)] dark:border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[var(--auth-ink-soft)] dark:text-stone-400 font-bold block uppercase">Season Matches</span>
          <span className="text-2xl font-black text-[var(--auth-ink)] dark:text-stone-100 mt-1 block">{stats.seasonMatches}</span>
        </div>
        <div className="bg-[var(--auth-card)] dark:bg-stone-900/80 border border-[var(--auth-card-edge)] dark:border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[var(--auth-ink-soft)] dark:text-stone-400 font-bold block uppercase">Season Wins</span>
          <span className="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-1 block">{stats.seasonWins}</span>
        </div>
        <div className="bg-[var(--auth-card)] dark:bg-stone-900/80 border border-[var(--auth-card-edge)] dark:border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[var(--auth-ink-soft)] dark:text-stone-400 font-bold block uppercase">Win Rate</span>
          <span className="text-2xl font-black text-sky-500 dark:text-sky-400 mt-1 block">{stats.seasonWinRate}%</span>
        </div>
        <div className="bg-[var(--auth-card)] dark:bg-stone-900/80 border border-[var(--auth-card-edge)] dark:border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-[var(--auth-ink-soft)] dark:text-stone-400 font-bold block uppercase">Championship Titles</span>
          <span className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-1 block">👑 {stats.tournamentWins}</span>
        </div>
      </div>

      {/* Seasonal Rewards Ladder */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--auth-ink)] dark:text-stone-200">
            Seasonal Tier Rewards Track
          </h3>
          <span className="text-xs font-mono text-amber-500 dark:text-amber-400 font-bold">
            {rewards.filter((r) => r.claimed).length} / {rewards.length} Claimed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {rewards.map((reward) => (
            <div
              key={reward.tierId}
              className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                reward.claimed
                  ? "bg-stone-500/5 dark:bg-stone-950/40 border-[var(--auth-card-edge)] dark:border-stone-800/60 opacity-60"
                  : reward.unlocked
                  ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10"
                  : "bg-[var(--auth-card)] dark:bg-stone-900/80 border-[var(--auth-card-edge)] dark:border-stone-800"
              }`}
            >
              <div className="space-y-1.5 text-center">
                <span className="text-4xl block mb-2">{reward.icon}</span>
                <span className="text-xs font-black text-[var(--auth-ink)] dark:text-stone-100 block">{reward.name}</span>
                <span className="text-[10px] font-mono text-[var(--auth-ink-soft)] dark:text-stone-400 block">{reward.title}</span>
                <span className="text-[10px] font-mono font-bold text-amber-500 dark:text-amber-400 block">
                  Req: {reward.minSeasonXP} XP
                </span>
              </div>

              {reward.claimed ? (
                <div className="text-center text-[10px] font-mono font-bold text-stone-500 bg-stone-200/60 dark:bg-stone-900/60 py-2 rounded-xl border border-stone-300 dark:border-stone-800">
                  ✓ CLAIMED
                </div>
              ) : reward.unlocked ? (
                <button
                  onClick={() => handleClaim(reward.tierId)}
                  disabled={claimingId === reward.tierId}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs py-2 rounded-xl transition shadow active:scale-[0.99] cursor-pointer min-h-[36px]"
                >
                  {claimingId === reward.tierId ? "Claiming..." : `Claim +${reward.bonusXP} XP`}
                </button>
              ) : (
                <div className="text-center text-[10px] font-mono text-stone-400 dark:text-stone-500 bg-stone-200/50 dark:bg-stone-950/60 py-2 rounded-xl border border-stone-300 dark:border-stone-800">
                  🔒 LOCKED
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
