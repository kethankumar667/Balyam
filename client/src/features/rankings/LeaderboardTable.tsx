import { useState } from "react";
import type { LeaderboardEntry, LeaderboardMetric } from "@shared/ranking/PlayerRank";
import { RANK_TIERS } from "@shared/ranking/RankingRules";
import type { GameKind } from "@shared/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  total: number;
  selectedMetric: LeaderboardMetric;
  selectedGame?: GameKind;
  onSelectMetric: (m: LeaderboardMetric) => void;
  onSelectGame: (g?: GameKind) => void;
  onAddFriend?: (playerId: string) => void;
}

export default function LeaderboardTable({
  entries,
  total,
  selectedMetric,
  selectedGame,
  onSelectMetric,
  onSelectGame,
  onAddFriend,
}: LeaderboardTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    return e.displayName.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="font-mono font-bold text-xs text-stone-400">#{rank}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-900/60 dark:bg-zinc-900/60 border border-stone-800 dark:border-zinc-800 rounded-xl p-3">
        {/* Metric Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {(
            [
              { id: "rating", label: "⭐ Rating" },
              { id: "wins", label: "🏆 Wins" },
              { id: "winRate", label: "📊 Win Rate" },
              { id: "matchesPlayed", label: "🎮 Matches" },
              { id: "level", label: "🎖️ Level" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMetric(m.id)}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                selectedMetric === m.id
                  ? "bg-amber-500 text-zinc-950 font-bold shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-stone-950 dark:bg-zinc-950 border border-stone-800 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 w-full md:w-48 font-mono"
        />
      </div>

      {/* Game Selector Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => onSelectGame(undefined)}
          className={`px-3 py-1 rounded-full border transition shrink-0 ${
            !selectedGame
              ? "bg-stone-100 text-stone-950 border-stone-100 font-bold"
              : "border-stone-800 text-stone-400 hover:text-stone-200"
          }`}
        >
          All Games
        </button>
        {(["ludo", "uno", "rummy", "handcricket", "chess", "carrom", "snl", "dotsboxes"] as GameKind[]).map((g) => (
          <button
            key={g}
            onClick={() => onSelectGame(g)}
            className={`px-3 py-1 rounded-full border transition shrink-0 capitalize ${
              selectedGame === g
                ? "bg-amber-500 text-zinc-950 border-amber-500 font-bold"
                : "border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Leaderboard Content */}
      {filtered.length === 0 ? (
        <div className="bg-stone-900/40 dark:bg-zinc-900/40 border border-stone-800 dark:border-zinc-800 rounded-xl p-8 text-center text-stone-500 text-xs">
          No ranking records found matching your filters.
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4 text-center">Tier</th>
                  <th className="py-3 px-4 text-center">Rating</th>
                  <th className="py-3 px-4 text-center">Wins</th>
                  <th className="py-3 px-4 text-center">Win Rate</th>
                  <th className="py-3 px-4 text-center">Matches</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-200">
                {filtered.map((item) => {
                  const tierCfg = RANK_TIERS[item.tier] || RANK_TIERS.Bronze;
                  return (
                    <tr key={item.playerId} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-4 text-center">{getRankBadge(item.rank)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 font-sans">
                          <span className="text-xl">{item.avatar || "👤"}</span>
                          <div>
                            <span className="font-bold text-stone-100 block">{item.displayName}</span>
                            <span className="text-[10px] font-mono text-stone-500">LVL {item.level}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          style={{
                            borderColor: `${tierCfg.color}66`,
                            backgroundColor: `${tierCfg.color}15`,
                            color: tierCfg.color,
                          }}
                        >
                          {tierCfg.badge} {item.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-400">{item.rating}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">{item.wins}</td>
                      <td className="py-3 px-4 text-center font-bold text-sky-400">{item.winRate}%</td>
                      <td className="py-3 px-4 text-center text-stone-400">{item.matchesPlayed}</td>
                      <td className="py-3 px-4 text-right">
                        {onAddFriend && (
                          <button
                            onClick={() => onAddFriend(item.playerId)}
                            className="bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 text-[11px] px-2.5 py-1 rounded transition"
                          >
                            + Friend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-2.5">
            {filtered.map((item) => {
              const tierCfg = RANK_TIERS[item.tier] || RANK_TIERS.Bronze;
              return (
                <div
                  key={item.playerId}
                  className="bg-stone-900/90 dark:bg-zinc-900/90 border border-stone-800 dark:border-zinc-800 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center">{getRankBadge(item.rank)}</div>
                      <span className="text-2xl">{item.avatar || "👤"}</span>
                      <div>
                        <span className="font-bold text-sm text-stone-100 block">{item.displayName}</span>
                        <span className="text-[11px] font-mono text-stone-500">LVL {item.level}</span>
                      </div>
                    </div>

                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono"
                      style={{
                        borderColor: `${tierCfg.color}66`,
                        backgroundColor: `${tierCfg.color}15`,
                        color: tierCfg.color,
                      }}
                    >
                      {tierCfg.badge} {item.tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-800/80 text-center font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Rating</span>
                      <span className="font-bold text-amber-400">{item.rating}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Wins</span>
                      <span className="font-bold text-emerald-400">{item.wins}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Win Rate</span>
                      <span className="font-bold text-sky-400">{item.winRate}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Matches</span>
                      <span className="font-bold text-stone-300">{item.matchesPlayed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
