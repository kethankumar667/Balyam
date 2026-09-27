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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition shadow-md whitespace-nowrap"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Play a Game</span>
          </Link>
        </div>
      </div>

      {/* ── 5 Horizontal Summary Stat Power Tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Matches */}
        <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-purple-400 via-purple-600 to-purple-900 shadow-[0_5px_0_rgba(88,28,135,0.8),0_8px_16px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1">
          <div className="h-full bg-gradient-to-b from-[#18152e] via-[#100e21] to-[#0a0815] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-purple-300/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-purple-500 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(88,28,135,1)]">
                <Gamepad2 className="w-5 h-5 text-purple-100" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/40">
                Matches
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-purple-200/80 block truncate">
                Total Matches
              </span>
              <span className="text-2xl font-black text-white block leading-tight tracking-tight my-0.5">
                {effectiveTotalMatches}
              </span>
              <span className="text-[11px] text-purple-300/70 font-mono font-medium block">
                All-time record
              </span>
            </div>
          </div>
        </div>

        {/* Wins */}
        <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-900 shadow-[0_5px_0_rgba(6,95,70,0.8),0_8px_16px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1">
          <div className="h-full bg-gradient-to-b from-[#0e241e] via-[#091713] to-[#050e0c] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-emerald-300/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(6,95,70,1)]">
                <Trophy className="w-5 h-5 text-emerald-100" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                Wins
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200/80 block truncate">
                Victories
              </span>
              <span className="text-2xl font-black text-emerald-400 block leading-tight tracking-tight my-0.5">
                {effectiveWins}
              </span>
              <span className="text-[11px] text-emerald-300/70 font-mono font-medium block">
                {effectiveWinRate}% Win rate
              </span>
            </div>
          </div>
        </div>

        {/* Losses */}
        <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-rose-400 via-rose-600 to-rose-900 shadow-[0_5px_0_rgba(159,18,57,0.8),0_8px_16px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1">
          <div className="h-full bg-gradient-to-b from-[#240e15] via-[#17090e] to-[#0d0508] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-rose-300/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(159,18,57,1)]">
                <XCircle className="w-5 h-5 text-rose-100" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                Defeats
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-rose-200/80 block truncate">
                Defeats
              </span>
              <span className="text-2xl font-black text-rose-400 block leading-tight tracking-tight my-0.5">
                {effectiveLosses}
              </span>
              <span className="text-[11px] text-rose-300/70 font-mono font-medium block">
                {effectiveLossRate}% Loss rate
              </span>
            </div>
          </div>
        </div>

        {/* Draws */}
        <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900 shadow-[0_5px_0_rgba(30,58,138,0.8),0_8px_16px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1">
          <div className="h-full bg-gradient-to-b from-[#111e38] via-[#0b1426] to-[#060b17] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-blue-300/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(30,58,138,1)]">
                <Equal className="w-5 h-5 text-blue-100" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-500/40">
                Draws
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-200/80 block truncate">
                Tied Rounds
              </span>
              <span className="text-2xl font-black text-blue-400 block leading-tight tracking-tight my-0.5">
                {effectiveDraws}
              </span>
              <span className="text-[11px] text-blue-300/70 font-mono font-medium block">
                {effectiveDrawRate}% Tied
              </span>
            </div>
          </div>
        </div>

        {/* Total Play Time */}
        <div className="group relative rounded-3xl p-1 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 shadow-[0_5px_0_rgba(180,83,9,0.8),0_8px_16px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1">
          <div className="h-full bg-gradient-to-b from-[#261c10] via-[#1a1309] to-[#0f0b05] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border-t border-amber-300/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-[0_2px_0_rgba(180,83,9,1)]">
                <Clock className="w-5 h-5 text-stone-950" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                Time
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-200/80 block truncate">
                Total Play Time
              </span>
              <span className="text-2xl font-black text-amber-400 block leading-tight tracking-tight my-0.5">
                {playTimeStr}
              </span>
              <span className="text-[11px] text-amber-300/70 font-mono font-medium block">
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
              className="bg-[#0c1424] border-2 border-white/10 rounded-3xl p-5 animate-pulse flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-slate-800 rounded" />
                  <div className="w-20 h-3 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="w-16 h-7 bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="p-8 text-center bg-[#0c1424] border-2 border-rose-500/30 rounded-3xl space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl mx-auto border border-rose-500/40">
            ⚠️
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">Couldn't load match history</h3>
            <p className="text-xs text-stone-300 max-w-sm mx-auto font-medium">
              We had trouble communicating with the server. Please check your connection and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 text-stone-950 font-black uppercase tracking-wider text-xs border-b-4 border-orange-800 active:border-b-0 shadow-md transition cursor-pointer min-h-[44px]"
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

      {/* Match Detail Modal (Holographic Battle Scorecard) */}
      {(activeDetailItem || selectedMatchDetail) && (
        <Modal
          open={Boolean(activeDetailItem || selectedMatchDetail)}
          onClose={handleCloseDetailModal}
          ariaLabel="Match Scorecard Details"
          panelClassName="bg-gradient-to-b from-[#0e1628] to-[#070b14] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl max-w-lg w-full text-left text-white"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                  🎮
                </div>
                <div>
                  <h3 className="font-black text-sm text-white capitalize tracking-tight">
                    {selectedMatchDetail?.game ?? activeDetailItem?.game} Match Details
                  </h3>
                  <span className="text-xs text-amber-400 font-mono font-bold">
                    Room #{selectedMatchDetail?.roomCode ?? activeDetailItem?.roomCode}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border font-mono ${
                  (selectedMatchDetail?.result ?? activeDetailItem?.result) === "WIN"
                    ? "bg-emerald-950/90 text-emerald-400 border-emerald-500/60"
                    : (selectedMatchDetail?.result ?? activeDetailItem?.result) === "LOSS"
                    ? "bg-rose-950/90 text-rose-400 border-rose-500/60"
                    : "bg-blue-950/90 text-blue-400 border-blue-500/60"
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
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-300 font-mono">
                Participants & Scorecard
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(selectedMatchDetail?.participants ?? activeDetailItem?.participants ?? []).map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center text-sm">
                        {p.avatar ? "👦" : "👤"}
                      </div>
                      <div>
                        <span className="font-black text-xs text-white block">
                          {p.name} {p.isBot && "(Bot)"}
                        </span>
                        {p.isWinner && (
                          <span className="text-[10px] text-amber-400 font-black font-mono block">
                            Winner 🏆
                          </span>
                        )}
                      </div>
                    </div>
                    {p.score !== undefined && (
                      <span className="font-black text-sm text-white font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        {p.score} pts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Authoritative Timeline / Match Stats */}
            {selectedMatchDetail && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-stone-200 space-y-1.5 font-mono">
                <div className="font-black text-amber-400 uppercase tracking-wider">Match Timeline Summary</div>
                <div className="flex justify-between">
                  <span className="text-stone-300">Total Moves:</span>
                  <span className="font-bold text-white">{selectedMatchDetail.movesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-300">Timeline Events:</span>
                  <span className="font-bold text-white">{selectedMatchDetail.timelineEventsCount}</span>
                </div>
              </div>
            )}

            {detailLoading && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-amber-400 font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Loading detailed scorecard timeline...</span>
              </div>
            )}

            {detailFetchError && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span className="truncate">Could not load detailed scorecard timeline.</span>
                </div>
                <button
                  type="button"
                  onClick={() => activeDetailItem && fetchMatchDetail(activeDetailItem.matchId)}
                  disabled={detailLoading}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] transition flex items-center gap-1.5 cursor-pointer flex-shrink-0 disabled:opacity-50 min-h-[44px]"
                  aria-label="Retry loading match details"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${detailLoading ? "animate-spin" : ""}`} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="w-full py-3 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 font-black uppercase tracking-wider text-xs border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 shadow-md cursor-pointer transition"
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
