import type { PlayerSeasonStats } from "@shared/seasons/Season";

interface SeasonLeaderboardProps {
  leaderboard: Array<PlayerSeasonStats & { displayName: string; avatar?: string; rank: number }>;
}

export default function SeasonLeaderboard({ leaderboard }: SeasonLeaderboardProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="font-mono font-bold text-xs text-stone-400">#{rank}</span>;
  };

  if (leaderboard.length === 0) {
    return (
      <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs">
        No seasonal competitors registered yet. Play ranked multiplayer matches to join the board!
      </div>
    );
  }

  return (
    <div className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[10px]">
          <tr>
            <th className="py-3 px-4 w-12 text-center">Rank</th>
            <th className="py-3 px-4">Competitor</th>
            <th className="py-3 px-4 text-center">Tier</th>
            <th className="py-3 px-4 text-center">Season XP</th>
            <th className="py-3 px-4 text-center">Wins</th>
            <th className="py-3 px-4 text-center">Tourney Wins</th>
            <th className="py-3 px-4 text-center">Win Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800/60 text-stone-200">
          {leaderboard.map((item) => (
            <tr key={item.playerId} className="hover:bg-stone-800/40 transition">
              <td className="py-3 px-4 text-center">{getRankBadge(item.rank)}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5 font-sans">
                  <span className="text-xl">{item.avatar || "👤"}</span>
                  <span className="font-bold text-stone-100">{item.displayName}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {item.seasonRankTier}
                </span>
              </td>
              <td className="py-3 px-4 text-center font-bold text-amber-400">{item.seasonXP}</td>
              <td className="py-3 px-4 text-center font-bold text-emerald-400">{item.seasonWins}</td>
              <td className="py-3 px-4 text-center font-bold text-amber-400">{item.tournamentWins}</td>
              <td className="py-3 px-4 text-center font-bold text-sky-400">{item.seasonWinRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
