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
  Gamepad2,
  Swords,
  Bot,
  User,
  Shield,
  Zap,
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
        <span className="bg-emerald-950/90 text-emerald-300 border-2 border-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.3)] text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5 shrink-0">
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          <span>Victory</span>
        </span>
      );
    }
    if (result === "LOSS") {
      return (
        <span className="bg-rose-950/90 text-rose-300 border-2 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)] text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5 shrink-0">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Defeat</span>
        </span>
      );
    }
    return (
      <span className="bg-blue-950/90 text-blue-300 border-2 border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.3)] text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5 shrink-0">
        <Equal className="w-3.5 h-3.5 text-blue-400" />
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
      {/* ── Left Column: Matches Table / Battle Cards ── */}
      <div className="lg:col-span-8 space-y-4">
        {/* Filter Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0c1424] to-[#121c33] p-3 sm:p-4 rounded-2xl border-2 border-white/10 shadow-lg">
          {/* Outcome Filter Pills (3D Chunky Supercell Style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setFilterResult("ALL")}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "ALL"
                  ? "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 border-b-4 border-amber-800 shadow-[0_3px_0_rgba(180,83,9,1)] active:border-b-0 active:translate-y-1"
                  : "bg-black/40 text-stone-300 border border-white/10 hover:bg-black/60"
              }`}
            >
              All Matches
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("WIN")}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "WIN"
                  ? "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-stone-950 border-b-4 border-emerald-800 shadow-[0_3px_0_rgba(4,120,87,1)] active:border-b-0 active:translate-y-1"
                  : "bg-black/40 text-stone-300 border border-white/10 hover:bg-black/60"
              }`}
            >
              Wins
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("LOSS")}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "LOSS"
                  ? "bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 text-stone-950 border-b-4 border-rose-800 shadow-[0_3px_0_rgba(190,18,60,1)] active:border-b-0 active:translate-y-1"
                  : "bg-black/40 text-stone-300 border border-white/10 hover:bg-black/60"
              }`}
            >
              Losses
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("DRAW")}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer inline-flex items-center justify-center ${
                filterResult === "DRAW"
                  ? "bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 text-stone-950 border-b-4 border-blue-800 shadow-[0_3px_0_rgba(30,58,138,1)] active:border-b-0 active:translate-y-1"
                  : "bg-black/40 text-stone-300 border border-white/10 hover:bg-black/60"
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
                className="bg-black/50 border-2 border-white/15 rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs font-black text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner appearance-none pr-8 font-mono"
              >
                <option value="ALL" className="bg-[#0c1424] text-white">📅 All Time</option>
                <option value="TODAY" className="bg-[#0c1424] text-white">Today</option>
                <option value="WEEK" className="bg-[#0c1424] text-white">This Week</option>
                <option value="MONTH" className="bg-[#0c1424] text-white">This Month</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-amber-400">
                ⌄
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedGame || "ALL"}
                onChange={(e) => onSelectGame(e.target.value === "ALL" ? undefined : (e.target.value as GameKind))}
                className="bg-black/50 border-2 border-white/15 rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs font-black text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner appearance-none pr-8 font-mono"
              >
                <option value="ALL" className="bg-[#0c1424] text-white">🍸 All Games</option>
                <option value="handcricket" className="bg-[#0c1424] text-white">Hand Cricket</option>
                <option value="ludo" className="bg-[#0c1424] text-white">Ludo</option>
                <option value="rummy" className="bg-[#0c1424] text-white">Rummy</option>
                <option value="snl" className="bg-[#0c1424] text-white">Snakes & Ladders</option>
                <option value="uno" className="bg-[#0c1424] text-white">UNO Blast</option>
                <option value="dotsboxes" className="bg-[#0c1424] text-white">Dots & Boxes</option>
                <option value="connect4" className="bg-[#0c1424] text-white">Connect 4</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-amber-400">
                ⌄
              </span>
            </div>
          </div>
        </div>

        {/* Matches Container */}
        <div className="rounded-3xl overflow-hidden">
          {loading ? (
            <div className="p-6 bg-[#0c1424] border-2 border-white/10 rounded-3xl">
              <MatchHistorySkeleton count={5} />
            </div>
          ) : displayedMatches.length === 0 ? (
            <div className="p-10 text-center text-xs text-stone-300 font-bold bg-[#0c1424] border-2 border-white/10 rounded-3xl shadow-xl space-y-2">
              <p className="text-sm font-black text-white">No matches found matching the selected filters.</p>
              <p className="text-stone-400">Jump into a game lounge to forge your clash history!</p>
            </div>
          ) : (
            <div className="space-y-3.5">
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

                const cardBorder =
                  m.result === "WIN"
                    ? "border-emerald-500/50 hover:border-emerald-400"
                    : m.result === "LOSS"
                      ? "border-rose-500/50 hover:border-rose-400"
                      : "border-blue-500/50 hover:border-blue-400";

                const cardGradient =
                  m.result === "WIN"
                    ? "from-[#0a1e16] via-[#0d1626] to-[#080d19]"
                    : m.result === "LOSS"
                      ? "from-[#220a10] via-[#140e1f] to-[#080d19]"
                      : "from-[#0a152e] via-[#0b1222] to-[#080d19]";

                return (
                  <div
                    key={m.matchId}
                    className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-r ${cardGradient} border-2 ${cardBorder} shadow-lg transition-all duration-300 hover:shadow-2xl relative overflow-hidden`}
                  >
                    {/* Top row: Game info + Result Badge */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/15 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                          {info.icon}
                        </div>
                        <div>
                          <h4 className="font-black text-sm sm:text-base text-white leading-tight tracking-tight">
                            {info.name}
                          </h4>
                          <span className="text-[11px] font-mono text-stone-300 font-bold">
                            {info.mode}
                          </span>
                        </div>
                      </div>
                      <div>{getResultBadge(m.result)}</div>
                    </div>

                    {/* Middle Face-off: Player vs Opponent & Score */}
                    <div className="bg-black/50 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                      {/* Left Participant (You) */}
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xs font-black text-amber-300 shrink-0">
                          👑
                        </div>
                        <div>
                          <span className="text-xs font-black text-white block">You</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">Lounge Seat</span>
                        </div>
                      </div>

                      {/* Center Score & VS Emblem */}
                      <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#080d1a] border border-white/15 shadow-md">
                        <span className="text-[10px] font-black uppercase text-amber-400 font-mono tracking-widest">
                          VS
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono text-white tracking-wider">
                          {scoreDisplay}
                        </span>
                      </div>

                      {/* Right Participant (Opponent) */}
                      <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                        <div className="text-right">
                          <span className="text-xs font-black text-white block">
                            {isMultiBot ? "Bots Lobby" : (opponent?.name || "Opponent")}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono font-bold">
                            {isMultiBot ? "Multiplayer" : (opponent?.isBot ? "Bot" : "Rival Player")}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-xs font-black text-stone-300 shrink-0">
                          {isMultiBot ? "🤖" : (opponent?.isBot ? "🤖" : "🟣")}
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Time, Duration & Action button */}
                    <div className="flex items-center justify-between pt-3 mt-1 text-xs text-stone-300">
                      <div className="flex items-center gap-4 font-mono text-[11px]">
                        <span>{formattedDate}</span>
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          {durationStr}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onViewMatchDetail && onViewMatchDetail(m.matchId)}
                        className="text-xs font-black uppercase tracking-wider text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-4 py-2 min-h-[44px] rounded-xl transition cursor-pointer inline-flex items-center justify-center shadow-xs"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Bar (3D Supercell style) */}
        <div className="flex items-center justify-center gap-2 pt-3">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border-2 border-white/10 bg-black/40 text-stone-300 disabled:opacity-30 flex items-center justify-center text-xs hover:bg-black/60 transition cursor-pointer shadow-md"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl font-black font-mono text-xs transition cursor-pointer flex items-center justify-center ${
                currentPage === page
                  ? "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 border-b-4 border-amber-800 shadow-[0_3px_0_rgba(180,83,9,1)] active:border-b-0"
                  : "bg-black/40 text-stone-300 border-2 border-white/10 hover:bg-black/60"
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
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border-2 border-white/10 bg-black/40 text-stone-300 disabled:opacity-30 flex items-center justify-center text-xs hover:bg-black/60 transition cursor-pointer shadow-md"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Right Column Rail: Most Played + Streaks + MVP ── */}
      <div className="lg:col-span-4 space-y-4">
        {/* Card 1: Most Played Games (Game Mastery Cartridges) */}
        <div className="bg-gradient-to-br from-[#0c1424] via-[#121c33] to-[#090e1c] border-2 border-amber-500/30 rounded-3xl p-5 space-y-3.5 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <h3 className="font-black text-sm text-white uppercase tracking-wider">
              Most Played Games
            </h3>
          </div>

          {mostPlayedList.length > 0 ? (
            <div className="space-y-3">
              {mostPlayedList.map((item, index) => {
                const info = GAME_INFO[item.game] || { name: item.game, icon: "🎮" };
                return (
                  <div
                    key={item.game}
                    className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-400/50 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-lg shrink-0 shadow-inner">
                        {info.icon}
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-white group-hover:text-amber-300 transition">
                          {info.name}
                        </h4>
                        <span className="text-[11px] text-amber-400 font-mono font-bold">
                          {item.matchesPlayed} {item.matchesPlayed === 1 ? "Match" : "Matches"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-stone-400 font-mono">
                      #{index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center space-y-1.5">
              <p className="text-xs text-stone-300 font-bold">
                No matches recorded yet.
              </p>
              <p className="text-[11px] text-stone-400 font-medium">
                Jump into any lounge game to track your most played titles!
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Longest Win Streak (Clash Royale Fire Streak) */}
        <div className="bg-gradient-to-br from-[#1c0f0a] via-[#151224] to-[#0c1424] border-2 border-orange-500/40 rounded-3xl p-5 flex items-center justify-between shadow-2xl relative overflow-hidden">
          {/* Flame Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-orange-500/20 blur-2xl pointer-events-none" />

          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-400">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <span>Longest Win Streak</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono drop-shadow-sm pt-0.5">
              {bestStreak} {bestStreak === 1 ? "Win" : "Wins"}
            </div>
            <div className="text-[11px] text-stone-300 font-mono font-bold">
              {bestStreak > 0
                ? `Current streak: ${currentStreak} ${currentStreak === 1 ? "win" : "wins"}`
                : "Win consecutive rounds to forge a streak!"}
            </div>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 text-3xl flex items-center justify-center shrink-0 shadow-[0_4px_0_rgba(194,65,12,1)] relative z-10">
            🏆
          </div>
        </div>

        {/* Card 3: Best Performance (Golden MVP Trophy) */}
        <div className="bg-gradient-to-br from-[#0c1424] via-[#121c33] to-[#090e1c] border-2 border-amber-500/30 rounded-3xl p-5 space-y-3 shadow-2xl">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300 border-b border-white/10 pb-3">
            <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Best Performance</span>
          </div>

          {bestWinMatch && bestWinInfo ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-xl flex items-center justify-center shrink-0 border border-amber-500/40">
                  {bestWinInfo.icon}
                </div>
                <div>
                  <h4 className="font-black text-xs text-white">
                    {bestWinInfo.name}
                  </h4>
                  <span className="text-[11px] text-stone-300 font-mono font-bold">
                    {bestWinSubtext}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block">
                  Victory
                </span>
                <span className="text-[10px] text-stone-400 font-mono block mt-1">
                  {formatMatchDateTime(bestWinMatch.finishedAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-3 text-center space-y-1">
              <p className="text-xs text-stone-300 font-bold">
                No victories recorded yet.
              </p>
              <p className="text-[11px] text-stone-400 font-medium">
                Play a match to establish your personal best performance!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
