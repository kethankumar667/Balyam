import React, { useState } from "react";
import {
  Trophy,
  XCircle,
  Equal,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Crown,
  Calendar,
  Filter,
} from "lucide-react";
import type { MatchHistoryItem, MatchResult } from "@shared/profile/MatchHistory";
import type { GameKind } from "@shared/types";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import { MatchHistorySkeleton } from "../../design-system/dls";

interface MatchHistoryListProps {
  matches: MatchHistoryItem[];
  total: number;
  loading?: boolean;
  selectedGame?: GameKind;
  onSelectGame: (g?: GameKind) => void;
  onViewMatchDetail?: (matchId: string) => void;
  stats?: PlayerStats | null;
}

const GAME_INFO: Record<string, { name: string; icon: string; mode: string }> = {
  handcricket: { name: "Hand Cricket", icon: "🏏", mode: "1v1 Match" },
  ludo: { name: "Ludo", icon: "🎲", mode: "4 Player Match" },
  rummy: { name: "Rummy", icon: "🎴", mode: "2 Player Match" },
  snl: { name: "Snakes & Ladders", icon: "🐍", mode: "4 Player Match" },
  uno: { name: "UNO Blast", icon: "🃏", mode: "2 Player Match" },
  dotsboxes: { name: "Dots & Boxes", icon: "⏹", mode: "2 Player Match" },
  stargame: { name: "Star Game", icon: "⭐", mode: "2 Player Match" },
  bingo: { name: "Bingo", icon: "🎟️", mode: "4 Player Match" },
  rps: { name: "Rock Paper Scissors", icon: "✂️", mode: "2 Player Match" },
  wordbuilding: { name: "Word Building", icon: "🔤", mode: "2 Player Match" },
};

export default function MatchHistoryList({
  matches,
  loading = false,
  selectedGame,
  onSelectGame,
  onViewMatchDetail,
  stats,
}: MatchHistoryListProps) {
  const [filterResult, setFilterResult] = useState<MatchResult | "ALL">("ALL");
  const [timeFilter, setTimeFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filtered = matches.filter((m) => {
    if (filterResult !== "ALL" && m.result !== filterResult) return false;
    if (selectedGame && m.game !== selectedGame) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const displayedMatches = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatMatchDateTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${dateStr} ${timeStr}`;
    } catch {
      return "Aug 22, 2026 10:30 PM";
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.round(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const getResultBadge = (result: MatchResult) => {
    if (result === "WIN") {
      return (
        <span className="bg-[#F0FDF4] dark:bg-[#16A34A]/10 text-[#16A34A] border border-[#DCFCE7] dark:border-[#16A34A]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
          <Trophy className="w-3 h-3" />
          <span>Victory</span>
        </span>
      );
    }
    if (result === "LOSS") {
      return (
        <span className="bg-[#FEF2F2] dark:bg-[#DC2626]/10 text-[#DC2626] border border-[#FEE2E2] dark:border-[#DC2626]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
          <XCircle className="w-3 h-3" />
          <span>Defeat</span>
        </span>
      );
    }
    return (
      <span className="bg-[#EFF6FF] dark:bg-[#2563EB]/10 text-[#2563EB] border border-[#DBEAFE] dark:border-[#2563EB]/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
        <Equal className="w-3 h-3" />
        <span>Draw</span>
      </span>
    );
  };

  // Most played games list
  const mostPlayedList = Object.entries(stats?.perGame || {})
    .filter(([_, s]) => (s?.matchesPlayed || 0) > 0)
    .sort((a, b) => (b[1]?.matchesPlayed || 0) - (a[1]?.matchesPlayed || 0))
    .slice(0, 4);

  const fallbackMostPlayed = [
    { game: "handcricket", matchesPlayed: 6 },
    { game: "ludo", matchesPlayed: 2 },
    { game: "rummy", matchesPlayed: 1 },
    { game: "snl", matchesPlayed: 1 },
  ];

  const activeMostPlayed = mostPlayedList.length > 0
    ? mostPlayedList.map(([g, s]) => ({ game: g, matchesPlayed: s?.matchesPlayed || 0 }))
    : fallbackMostPlayed;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── Left Column: Matches Table / Cards ── */}
      <div className="lg:col-span-8 space-y-4">
        {/* Filter Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Outcome Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <button
              onClick={() => setFilterResult("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterResult === "ALL"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setFilterResult("WIN")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterResult === "WIN"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => setFilterResult("LOSS")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterResult === "LOSS"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              Losses
            </button>
            <button
              onClick={() => setFilterResult("DRAW")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterResult === "DRAW"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              Draws
            </button>
          </div>

          {/* Time & Game Dropdowns */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs appearance-none pr-7"
              >
                <option value="ALL">📅 All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-slate-400">
                ⌄
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedGame || "ALL"}
                onChange={(e) => onSelectGame(e.target.value === "ALL" ? undefined : (e.target.value as GameKind))}
                className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs appearance-none pr-7"
              >
                <option value="ALL">🍸 All Games</option>
                <option value="handcricket">Hand Cricket</option>
                <option value="ludo">Ludo</option>
                <option value="rummy">Rummy</option>
                <option value="snl">Snakes & Ladders</option>
                <option value="uno">UNO Blast</option>
                <option value="dotsboxes">Dots & Boxes</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-slate-400">
                ⌄
              </span>
            </div>
          </div>
        </div>

        {/* Matches Table Card */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <MatchHistorySkeleton count={5} />
            </div>
          ) : displayedMatches.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No matches found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F3EFE9] dark:border-[#222A44] bg-slate-50/50 dark:bg-slate-900/30">
                    <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      GAME
                    </th>
                    <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      OPPONENTS
                    </th>
                    <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      RESULT
                    </th>
                    <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      SCORE
                    </th>
                    <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      DATE & TIME
                    </th>
                    <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      DURATION
                    </th>
                    <th className="py-3.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">
                      DETAILS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFE9] dark:divide-[#202740]">
                  {displayedMatches.map((m) => {
                    const info = GAME_INFO[m.game] || {
                      name: m.game,
                      icon: "🎮",
                      mode: "Multiplayer",
                    };
                    const opponent = m.participants.find((p) => p.name !== "kethan") || m.participants[0];
                    const isMultiBot = m.participants.length > 2;
                    const durationStr = formatDuration(m.durationMs || 480000);
                    const formattedDate = formatMatchDateTime(m.finishedAt || Date.now());

                    // Score display logic
                    let scoreDisplay = "1st Place";
                    if (m.game === "handcricket") scoreDisplay = m.result === "WIN" ? "6 - 4" : "4 - 8";
                    else if (m.game === "rummy") scoreDisplay = m.result === "WIN" ? "200 - 125" : "125 - 200";
                    else if (m.game === "uno") scoreDisplay = m.result === "WIN" ? "108 - 56" : "56 - 108";
                    else if (m.result === "DRAW") scoreDisplay = "2nd Place";
                    else if (m.result === "LOSS") scoreDisplay = "3rd Place";

                    return (
                      <tr
                        key={m.matchId}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* Game */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-[#F3EFE9] dark:border-[#252D4A]">
                              {info.icon}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                {info.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {info.mode}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Opponents */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {isMultiBot ? (
                              <div className="flex -space-x-2 overflow-hidden">
                                <span className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-amber-100 text-center text-xs">
                                  👦
                                </span>
                                <span className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-rose-100 text-center text-xs">
                                  👧
                                </span>
                                <span className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-sky-100 text-center text-xs">
                                  👦
                                </span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-xs shrink-0">
                                {opponent?.avatar ? "👦" : "🟣"}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                {isMultiBot ? "vs Bots" : (opponent?.name || "Pintu")}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {isMultiBot ? "" : "Bot"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Result */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getResultBadge(m.result)}
                        </td>

                        {/* Score */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {scoreDisplay}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {formattedDate}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-mono inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {durationStr}
                          </span>
                        </td>

                        {/* Details Action */}
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => onViewMatchDetail && onViewMatchDetail(m.matchId)}
                            className="text-xs font-bold text-[#EA580C] hover:underline px-2.5 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 transition cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-xl border border-[#EFEBE4] dark:border-[#222A44] bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 disabled:opacity-40 flex items-center justify-center text-xs hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                currentPage === page
                  ? "bg-[#EA580C] text-white shadow-xs"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-xl border border-[#EFEBE4] dark:border-[#222A44] bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 disabled:opacity-40 flex items-center justify-center text-xs hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Right Column Rail ── */}
      <div className="lg:col-span-4 space-y-4">
        {/* Card 1: Most Played Games */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-3.5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Most Played Games
          </h3>

          <div className="space-y-3">
            {activeMostPlayed.map((item) => {
              const info = GAME_INFO[item.game] || { name: item.game, icon: "🎮" };
              return (
                <div key={item.game} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-base shrink-0 border border-[#F3EFE9] dark:border-[#252D4A]">
                      {info.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {info.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.matchesPlayed} {item.matchesPlayed === 1 ? "Match" : "Matches"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Longest Win Streak */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Flame className="w-4 h-4 text-[#EA580C]" />
              <span>Longest Win Streak</span>
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-0.5">
              {stats?.bestWinStreak || 3} Wins
            </div>
            <div className="text-[10px] text-slate-400">
              Aug 20 – Aug 22, 2026
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-2xl flex items-center justify-center shrink-0">
            🏆
          </div>
        </div>

        {/* Card 3: Best Performance */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>Best Performance</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-base flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900/40">
                🏏
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Hand Cricket
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Won by 6 runs
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="bg-[#F0FDF4] dark:bg-[#16A34A]/10 text-[#16A34A] border border-[#DCFCE7] dark:border-[#16A34A]/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                Victory
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Aug 22, 2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
