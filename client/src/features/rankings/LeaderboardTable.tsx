import { useState } from "react";
import type { LeaderboardEntry, LeaderboardMetric } from "@shared/ranking/PlayerRank";
import { RANK_TIERS } from "@shared/ranking/RankingRules";
import type { GameKind } from "@shared/types";
import { RankTierIcon, GameCategoryIcon, SearchNavIcon, AddFriendUserIcon } from "../../design-system/icons";

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
              { id: "level", label: "⚡ Level" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMetric(m.id)}
              className={`px-3 min-h-[44px] inline-flex items-center justify-center rounded-lg transition shrink-0 ${
                selectedMetric === m.id
                  ? "bg-amber-500 text-zinc-950 font-bold shadow"
                  : "bg-stone-900/80 text-stone-400 hover:text-stone-200 border border-stone-800"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search competitor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-56 min-h-[44px] bg-stone-950 border border-stone-800 rounded-lg px-3.5 py-2 pl-9 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/40"
          />
          <span className="absolute left-3 top-3.5 text-stone-500 pointer-events-none">
            <SearchNavIcon size={14} />
          </span>
        </div>
      </div>

      {/* Game Filters */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium pb-1.5 custom-scrollbar">
        <button
          type="button"
          onClick={() => onSelectGame(undefined)}
          className={`min-h-[44px] px-4 py-2 rounded-full transition shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            !selectedGame
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
              : "bg-stone-900/50 text-stone-400 border border-stone-800 hover:text-stone-200"
          }`}
        >
          All Games
        </button>
        {(["ludo", "rummy", "uno", "handcricket", "chess", "carrom", "snake"] as const).map(
          (g) => (
            <button
              key={g}
              type="button"
              onClick={() => onSelectGame(g)}
              className={`min-h-[44px] px-3.5 py-2 rounded-full transition shrink-0 uppercase text-[11px] font-mono flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                selectedGame === g
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "bg-stone-900/50 text-stone-400 border border-stone-800 hover:text-stone-200"
              }`}
            >
              <GameCategoryIcon game={g} size={16} />
              {g}
            </button>
          )
        )}
      </div>

      {/* Table / Card Views */}
      {filtered.length === 0 ? (
        <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs">
          No competitors found matching your criteria.
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                          style={{
                            borderColor: `${tierCfg.color}66`,
                            backgroundColor: `${tierCfg.color}15`,
                            color: tierCfg.color,
                          }}
                        >
                          <RankTierIcon tier={item.tier} size={14} />
                          {item.tier}
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
                            className="bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 text-[11px] px-2.5 py-1 rounded transition inline-flex items-center gap-1"
                          >
                            <AddFriendUserIcon size={12} />
                            Friend
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
                  className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 space-y-2 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-sans">
                      <span className="font-bold text-stone-400">{getRankBadge(item.rank)}</span>
                      <span className="text-lg">{item.avatar || "👤"}</span>
                      <div>
                        <span className="font-bold text-stone-100 block">{item.displayName}</span>
                        <span className="text-[10px] text-stone-500 font-mono">Level {item.level}</span>
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1"
                      style={{
                        borderColor: `${tierCfg.color}66`,
                        backgroundColor: `${tierCfg.color}15`,
                        color: tierCfg.color,
                      }}
                    >
                      <RankTierIcon tier={item.tier} size={12} />
                      {item.tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1 border-t border-stone-800/80 text-center text-[11px]">
                    <div>
                      <span className="text-[9px] text-stone-500 block">Rating</span>
                      <span className="font-bold text-amber-400">{item.rating}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-500 block">Wins</span>
                      <span className="font-bold text-emerald-400">{item.wins}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-500 block">Win Rate</span>
                      <span className="font-bold text-sky-400">{item.winRate}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-500 block">Matches</span>
                      <span className="text-stone-300">{item.matchesPlayed}</span>
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
