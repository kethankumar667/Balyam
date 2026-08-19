import React from "react";
import type { PlayerSeasonStats } from "@shared/seasons/Season";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { GoldRankIcon, SilverRankIcon, BronzeRankIcon } from "../../design-system/icons";

interface SeasonLeaderboardProps {
  leaderboard: Array<PlayerSeasonStats & { displayName: string; avatar?: string; rank: number }>;
}

export default function SeasonLeaderboard({ leaderboard }: SeasonLeaderboardProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <GoldRankIcon size={26} />;
    if (rank === 2) return <SilverRankIcon size={26} />;
    if (rank === 3) return <BronzeRankIcon size={26} />;
    return <span className="font-mono font-black text-sm text-[var(--auth-ink-soft)] dark:text-stone-400">#{rank}</span>;
  };

  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] dark:border-stone-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[var(--auth-ink)] dark:text-stone-100 tracking-tight">
            Season Champions Board
          </h2>
          <p className="text-xs text-[var(--auth-ink-soft)] dark:text-stone-400 font-medium">
            Top ranked players across all active season championships.
          </p>
        </div>
        <span className="text-xs font-mono font-black px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-xl">
          TOP PLAYERS
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--auth-card-edge)] dark:border-stone-800/80 text-[11px] font-mono uppercase tracking-wider text-[var(--auth-ink-soft)] dark:text-stone-400">
              <th className="py-3.5 px-4 text-center">Rank</th>
              <th className="py-3.5 px-4">Player</th>
              <th className="py-3.5 px-4 text-center">Wins</th>
              <th className="py-3.5 px-4 text-center">Tourney Wins</th>
              <th className="py-3.5 px-4 text-center">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--auth-card-edge)] dark:divide-stone-800/60 text-[var(--auth-ink)] dark:text-stone-200">
            {leaderboard.map((item) => (
              <tr key={item.playerId} className="hover:bg-amber-500/5 dark:hover:bg-stone-800/40 transition-colors">
                <td className="py-3.5 px-4 text-center">{getRankBadge(item.rank)}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3 font-sans">
                    <SeatAvatar
                      avatar={item.avatar}
                      name={item.displayName}
                      className="w-8 h-8 rounded-xl flex-shrink-0"
                      textClassName="text-sm"
                    />
                    <div>
                      <span className="font-black text-sm text-[var(--auth-ink)] dark:text-stone-100 block">
                        {item.displayName}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase">
                    {item.seasonRankTier}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-500 dark:text-amber-400">{item.seasonXP}</td>
                <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.seasonWins}</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-500 dark:text-amber-400">👑 {item.tournamentWins}</td>
                <td className="py-3.5 px-4 text-center font-bold text-sky-600 dark:text-sky-400">{item.seasonWinRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
