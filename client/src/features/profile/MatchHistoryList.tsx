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
  connect4: { name: "Connect 4", icon: "🟡", mode: "1v1 Match" },
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
      return "Recent Match";
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.round(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const computeMatchScore = (m: MatchHistoryItem): string => {
    const myParticipant = m.participants.find((p) => !p.isBot) || m.participants[0];
    const opponent = m.participants.find((p) => p !== myParticipant);

    if (myParticipant?.score !== undefined && opponent?.score !== undefined) {
      return `${myParticipant.score} - ${opponent.score}`;
    }
    if (myParticipant?.score !== undefined) {
      return `${myParticipant.score} pts`;
    }
    if (m.result === "WIN") {
      return "1st Place";
    }
    if (m.result === "DRAW") {
      return "Draw";
    }
    if (m.participants.length > 2) {
      return m.result === "LOSS" ? `${m.participants.length}th Place` : "Finalist";
    }
    return "2nd Place";
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

  // Real most played games list derived directly from telemetry stats
  const mostPlayedList = Object.entries(stats?.perGame || {})
    .filter(([_, s]) => (s?.matchesPlayed || 0) > 0)
    .sort((a, b) => (b[1]?.matchesPlayed || 0) - (a[1]?.matchesPlayed || 0))
    .slice(0, 4)
    .map(([g, s]) => ({ game: g, matchesPlayed: s?.matchesPlayed || 0 }));

  // Best win match calculation from actual match history
  const bestWinMatch = matches.find((m) => m.result === "WIN");
  const bestWinInfo = bestWinMatch ? (GAME_INFO[bestWinMatch.game] || { name: bestWinMatch.game, icon: "🎮" }) : null;
  const bestWinMyParticipant = bestWinMatch ? (bestWinMatch.participants.find((p) => !p.isBot) || bestWinMatch.participants[0]) : null;
  const bestWinOpponent = bestWinMatch ? bestWinMatch.participants.find((p) => p !== bestWinMyParticipant) : null;
  let bestWinSubtext = "Victory";
  if (bestWinMyParticipant?.score !== undefined && bestWinOpponent?.score !== undefined) {
    bestWinSubtext = `Score: ${bestWinMyParticipant.score} - ${bestWinOpponent.score}`;
  } else if (bestWinMyParticipant?.score !== undefined) {
    bestWinSubtext = `${bestWinMyParticipant.score} points`;
  } else if (bestWinOpponent?.name) {
    bestWinSubtext = `Won vs ${bestWinOpponent.name}`;
  }

  const bestStreak = stats?.bestWinStreak ?? 0;
  const currentStreak = stats?.currentWinStreak ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── Left Column: Matches Table / Cards ── */}
      <div className="lg:col-span-8 space-y-4">
        {/* Filter Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Outcome Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setFilterResult("ALL")}
              className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "ALL"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm font-black"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              All Matches
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("WIN")}
              className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "WIN"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm font-black"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              Wins
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("LOSS")}
              className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "LOSS"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm font-black"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
            >
              Losses
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("DRAW")}
              className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "DRAW"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm font-black"
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
                className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs appearance-none pr-8"
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
                className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs appearance-none pr-8"
              >
                <option value="ALL">🍸 All Games</option>
                <option value="handcricket">Hand Cricket</option>
                <option value="ludo">Ludo</option>
                <option value="rummy">Rummy</option>
                <option value="snl">Snakes & Ladders</option>
                <option value="uno">UNO Blast</option>
                <option value="dotsboxes">Dots & Boxes</option>
                <option value="connect4">Connect 4</option>
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
            <>
              {/* Mobile View: High-Impact Battle Cards (sm:hidden) */}
              <div className="sm:hidden space-y-3 p-3">
                {displayedMatches.map((m) => {
                  const info = GAME_INFO[m.game] || {
                    name: m.game,
                    icon: "🎮",
                    mode: "Multiplayer",
                  };
                  const opponent = m.participants.find((p) => p.isBot) || m.participants[1] || m.participants[0];
                  const isMultiBot = m.participants.length > 2;
                  const durationStr = formatDuration(m.durationMs || 480000);
                  const formattedDate = formatMatchDateTime(m.finishedAt || Date.now());

                  const scoreDisplay = computeMatchScore(m);

                  return (
                    <div
                      key={m.matchId}
                      className="rounded-2xl p-4 bg-stone-50/80 dark:bg-[#182138] border border-stone-200/80 dark:border-white/10 space-y-3 shadow-xs hover:border-amber-500/40 transition"
                    >
                      {/* Top row: Game icon & name + Result badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-stone-200 dark:border-slate-700 shadow-2xs">
                            {info.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                              {info.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {info.mode}
                            </span>
                          </div>
                        </div>
                        {getResultBadge(m.result)}
                      </div>

                      {/* Middle row: Opponent matchup & Score */}
                      <div className="flex items-center justify-between bg-white dark:bg-[#111728] p-2.5 rounded-xl border border-stone-200/60 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">VS</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-xs">
                              {isMultiBot ? "🤖" : (opponent?.avatar ? "👦" : "🟣")}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {isMultiBot ? "Bots Lobby" : (opponent?.name || "Opponent")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Result</span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                            {scoreDisplay}
                          </span>
                        </div>
                      </div>

                      {/* Bottom row: Date & Duration + 44px Details button */}
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>{formattedDate}</span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {durationStr}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onViewMatchDetail && onViewMatchDetail(m.matchId)}
                          className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline px-3 py-2 min-h-[44px] rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 transition cursor-pointer inline-flex items-center justify-center"
                        >
                          View Intel →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet View: Full Table (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
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
                      const opponent = m.participants.find((p) => p.isBot) || m.participants[1] || m.participants[0];
                      const isMultiBot = m.participants.length > 2;
                      const durationStr = formatDuration(m.durationMs || 480000);
                      const formattedDate = formatMatchDateTime(m.finishedAt || Date.now());

                      const scoreDisplay = computeMatchScore(m);

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
                                  {isMultiBot ? "vs Bots" : (opponent?.name || "Opponent")}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {isMultiBot ? "" : (opponent?.isBot ? "Bot" : "Player")}
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
                              type="button"
                              onClick={() => onViewMatchDetail && onViewMatchDetail(m.matchId)}
                              className="text-xs font-bold text-[#EA580C] hover:underline px-3 py-2 min-h-[44px] rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 transition cursor-pointer inline-flex items-center justify-center"
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
            </>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[#EFEBE4] dark:border-[#222A44] bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 disabled:opacity-40 flex items-center justify-center text-xs hover:bg-slate-50 transition cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                currentPage === page
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs font-black"
                  : "bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50"
              }`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[#EFEBE4] dark:border-[#222A44] bg-white dark:bg-[#151A2E] text-slate-600 dark:text-slate-300 disabled:opacity-40 flex items-center justify-center text-xs hover:bg-slate-50 transition cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
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

          {mostPlayedList.length > 0 ? (
            <div className="space-y-3">
              {mostPlayedList.map((item) => {
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
          ) : (
            <div className="py-4 text-center space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                No matches recorded yet.
              </p>
              <p className="text-[11px] text-slate-400">
                Jump into any lounge game to track your most played titles!
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Longest Win Streak */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Flame className="w-4 h-4 text-[#EA580C]" />
              <span>Longest Win Streak</span>
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-0.5">
              {bestStreak} {bestStreak === 1 ? "Win" : "Wins"}
            </div>
            <div className="text-[10px] text-slate-400">
              {bestStreak > 0
                ? `Current streak: ${currentStreak} ${currentStreak === 1 ? "win" : "wins"}`
                : "Win consecutive rounds to forge a streak!"}
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

          {bestWinMatch && bestWinInfo ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-base flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900/40">
                  {bestWinInfo.icon}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    {bestWinInfo.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {bestWinSubtext}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="bg-[#F0FDF4] dark:bg-[#16A34A]/10 text-[#16A34A] border border-[#DCFCE7] dark:border-[#16A34A]/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                  Victory
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {formatMatchDateTime(bestWinMatch.finishedAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                No victories recorded yet.
              </p>
              <p className="text-[11px] text-slate-400">
                Play a match to establish your personal best performance!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
