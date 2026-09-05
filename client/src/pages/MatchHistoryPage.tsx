import { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { History, Gamepad2, Trophy, XCircle, Equal, Clock, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/playerIdentity";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import MatchHistoryList from "../features/profile/MatchHistoryList";
import Modal from "../components/Modal";
import EmptyState from "../components/games/EmptyState";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";

import type { MatchHistoryItem, MatchDetailRecord } from "@shared/profile/MatchHistory";
import type { GameKind } from "@shared/types";

/**
 * Data, the Edit Profile / Avatar Picker modals, and the `<ProfileLayout>`
 * sidebar all live one level up now, in ProfileFamilyLayout — see that
 * file's header comment for why. This page only renders its own content and
 * reads what it needs via `useOutletContext`; the match list itself stays a
 * page-local fetch since it depends on `selectedGame`, which nothing else
 * in the profile section needs.
 */
export default function MatchHistoryPage() {
  const { profile, stats, isMember, effectivePlayerId } = useOutletContext<ProfileFamilyOutletContext>();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [selectedGame, setSelectedGame] = useState<GameKind | undefined>();
  const [activeDetailItem, setActiveDetailItem] = useState<MatchHistoryItem | null>(null);
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<MatchDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFetchError, setDetailFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!effectivePlayerId) return;

    let cancelled = false;

    async function fetchMatches() {
      setLoading(true);
      setFetchError(false);
      try {
        const res = await apiFetch(
          `/api/profile/${effectivePlayerId}/matches${selectedGame ? `?game=${selectedGame}` : ""}`
        );
        if (cancelled) return;
        if (!res.ok) throw new Error("Match fetch failed");
        const matchRes = await res.json();
        if (matchRes?.matches && matchRes.matches.length > 0) {
          setMatches(matchRes.matches);
          setTotalMatches(matchRes.total || matchRes.matches.length);
        } else {
          setMatches([]);
          setTotalMatches(0);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Could not load match history:", err);
          setFetchError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMatches();
    return () => {
      cancelled = true;
    };
  }, [effectivePlayerId, selectedGame, retryCount]);

  const fetchMatchDetail = useCallback(async (matchId: string) => {
    if (detailLoading) return;
    setDetailLoading(true);
    setDetailFetchError(false);
    try {
      const res = await apiFetch(`/api/profile/${effectivePlayerId}/matches/${matchId}`);
      if (!res.ok) throw new Error("Match detail fetch failed");
      const data = await res.json();
      if (data?.match) {
        setSelectedMatchDetail(data.match);
      } else {
        throw new Error("Invalid match payload");
      }
    } catch {
      setDetailFetchError(true);
    } finally {
      setDetailLoading(false);
    }
  }, [detailLoading, effectivePlayerId]);

  const handleOpenMatchDetail = useCallback((matchId: string) => {
    const summary = matches.find((m) => m.matchId === matchId) ?? null;
    setActiveDetailItem(summary);
    setSelectedMatchDetail(null);
    setDetailFetchError(false);
    fetchMatchDetail(matchId);
  }, [fetchMatchDetail, matches]);

  const handleCloseDetailModal = useCallback(() => {
    setActiveDetailItem(null);
    setSelectedMatchDetail(null);
    setDetailFetchError(false);
    setDetailLoading(false);
  }, []);

  if (!isMember) {
    return <MemberLockedGate feature="profile" />;
  }

  if (!profile) return null;

  const effectiveTotalMatches = stats?.totalMatches ?? totalMatches ?? matches.length;
  const effectiveWins = stats?.wins !== undefined ? stats.wins : 0;
  const effectiveLosses = stats?.losses !== undefined ? stats.losses : 0;
  const effectiveDraws = stats?.draws !== undefined ? stats.draws : 0;
  const effectiveWinRate = effectiveTotalMatches > 0 ? (stats?.winRate ?? Math.round((effectiveWins / effectiveTotalMatches) * 100)) : 0;
  const effectiveLossRate = effectiveTotalMatches > 0 ? Math.round((effectiveLosses / effectiveTotalMatches) * 100) : 0;
  const effectiveDrawRate = effectiveTotalMatches > 0 ? Math.round((effectiveDraws / effectiveTotalMatches) * 100) : 0;
  const totalMins = stats?.totalPlayTimeMinutes ?? 0;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const playTimeStr = `${hours}h ${mins}m`;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#EA580C]" />
            <span>Match History</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Review match records, scorecards, opponent details, and match durations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/games"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition shadow-md whitespace-nowrap"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Play a Game</span>
          </Link>
        </div>
      </div>

      {/* ── 5 Horizontal Summary Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Matches */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-purple-500/25 dark:via-transparent dark:to-purple-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/10 group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200/40 dark:border-purple-800/40">
                Matches
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block truncate">
                Total Matches
              </span>
              <span className="text-2xl font-black text-stone-900 dark:text-white block leading-tight tracking-tight my-0.5">
                {effectiveTotalMatches}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block">
                All-time record
              </span>
            </div>
          </div>
        </div>

        {/* Wins */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-emerald-500/25 dark:via-transparent dark:to-emerald-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/40 dark:border-emerald-800/40">
                Wins
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block truncate">
                Victories
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block leading-tight tracking-tight my-0.5">
                {effectiveWins}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block">
                {effectiveWinRate}% Win rate
              </span>
            </div>
          </div>
        </div>

        {/* Losses */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-rose-500/25 dark:via-transparent dark:to-rose-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/10 group-hover:scale-105 transition-transform">
                <XCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/40 dark:border-rose-800/40">
                Defeats
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block truncate">
                Defeats
              </span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block leading-tight tracking-tight my-0.5">
                {effectiveLosses}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block">
                {effectiveLossRate}% Loss rate
              </span>
            </div>
          </div>
        </div>

        {/* Draws */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-blue-500/25 dark:via-transparent dark:to-blue-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/10 group-hover:scale-105 transition-transform">
                <Equal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200/40 dark:border-blue-800/40">
                Draws
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block truncate">
                Tied Rounds
              </span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block leading-tight tracking-tight my-0.5">
                {effectiveDraws}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block">
                {effectiveDrawRate}% Tied
              </span>
            </div>
          </div>
        </div>

        {/* Total Play Time */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/25 dark:via-transparent dark:to-amber-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/40 dark:border-amber-800/40">
                Time
              </span>
            </div>
            <div>
              <span className="text-xs text-stone-500 dark:text-slate-400 font-medium block truncate">
                Total Play Time
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block leading-tight tracking-tight my-0.5">
                {playTimeStr}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block">
                Across all games
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Match History List / Loading / Error / Empty State ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 animate-pulse flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="w-16 h-7 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="p-8 text-center bg-white dark:bg-[#151A2E] border border-rose-500/20 rounded-3xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-xl mx-auto">
            ⚠️
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Couldn't load match history</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We had trouble communicating with the server. Please check your connection and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-5 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-sm transition cursor-pointer min-h-[44px]"
          >
            Retry
          </button>
        </div>
      ) : matches.length === 0 && !selectedGame ? (
        <EmptyState
          title="No matches played yet"
          description="Play games with friends or bots to build your match history."
          resetLabel="Explore Games"
          onReset={() => navigate("/games")}
        />
      ) : (
        <MatchHistoryList
          matches={matches}
          total={totalMatches}
          selectedGame={selectedGame}
          onSelectGame={(g) => setSelectedGame(g)}
          onViewMatchDetail={handleOpenMatchDetail}
          stats={stats}
        />
      )}

      {/* Match Detail Modal */}
      {(activeDetailItem || selectedMatchDetail) && (
        <Modal
          open={Boolean(activeDetailItem || selectedMatchDetail)}
          onClose={handleCloseDetailModal}
          ariaLabel="Match Scorecard Details"
          panelClassName="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 shadow-2xl max-w-lg w-full text-left"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEBE4] dark:border-[#222A44] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎮</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                    {selectedMatchDetail?.game ?? activeDetailItem?.game} Match Details
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    #{selectedMatchDetail?.roomCode ?? activeDetailItem?.roomCode}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  (selectedMatchDetail?.result ?? activeDetailItem?.result) === "WIN"
                    ? "bg-[#F0FDF4] text-[#16A34A]"
                    : (selectedMatchDetail?.result ?? activeDetailItem?.result) === "LOSS"
                    ? "bg-[#FEF2F2] text-[#DC2626]"
                    : "bg-[#EFF6FF] text-[#2563EB]"
                }`}
              >
                {(selectedMatchDetail?.result ?? activeDetailItem?.result) === "WIN"
                  ? "Victory"
                  : (selectedMatchDetail?.result ?? activeDetailItem?.result) === "LOSS"
                  ? "Defeat"
                  : "Draw"}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Participants & Scorecard
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(selectedMatchDetail?.participants ?? activeDetailItem?.participants ?? []).map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-[#F3EFE9] dark:border-[#252D4A]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                        {p.avatar ? "👦" : "👤"}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {p.name} {p.isBot && "(Bot)"}
                        </span>
                        {p.isWinner && (
                          <span className="text-[10px] text-amber-500 font-bold block">
                            Winner 🏆
                          </span>
                        )}
                      </div>
                    </div>
                    {p.score !== undefined && (
                      <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                        {p.score} pts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Authoritative Timeline / Match Stats */}
            {selectedMatchDetail && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="font-bold text-amber-900 dark:text-amber-300">Match Timeline Summary</div>
                <div className="flex justify-between">
                  <span>Total Moves:</span>
                  <span className="font-mono font-bold">{selectedMatchDetail.movesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timeline Events:</span>
                  <span className="font-mono font-bold">{selectedMatchDetail.timelineEventsCount}</span>
                </div>
              </div>
            )}

            {detailLoading && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Loading detailed scorecard timeline...</span>
              </div>
            )}

            {detailFetchError && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span className="truncate">Could not load detailed scorecard timeline.</span>
                </div>
                <button
                  type="button"
                  onClick={() => activeDetailItem && fetchMatchDetail(activeDetailItem.matchId)}
                  disabled={detailLoading}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer flex-shrink-0 disabled:opacity-50"
                  aria-label="Retry loading match details"
                >
                  <RefreshCw className={`w-3 h-3 ${detailLoading ? "animate-spin" : ""}`} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleCloseDetailModal}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md cursor-pointer hover:from-amber-600 hover:to-orange-600 transition"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
