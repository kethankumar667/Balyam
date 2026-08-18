import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";
import { getApiBaseUrl } from "../lib/socket";

import TournamentCard from "../features/tournaments/TournamentCard";
import TournamentBracket from "../features/tournaments/TournamentBracket";
import SeasonDashboard from "../features/tournaments/SeasonDashboard";
import SeasonLeaderboard from "../features/tournaments/SeasonLeaderboard";
import TournamentHistory from "../features/tournaments/TournamentHistory";

import type { Tournament, TournamentHistoryItem } from "@shared/tournaments/Tournament";
import type { TournamentBracket as TournamentBracketType } from "@shared/tournaments/Bracket";
import type { Season, PlayerSeasonStats } from "@shared/seasons/Season";
import type { SeasonRewardTier } from "@shared/seasons/SeasonRewards";

import { ArrowLeftIcon } from "../components/auth/authIcons";

export default function TournamentsPage() {
  const userId = useAuthStore((s) => s.userId);
  const currentName = useRoomStore((s) => s.playerName) || "Player";
  const currentAvatar = useRoomStore((s) => s.avatarId);

  const effectivePlayerId = useMemo(() => {
    return userId || (typeof window !== "undefined" ? localStorage.getItem("mpg.playerId") || "guest_player_1" : "guest_player_1");
  }, [userId]);

  const [activeTab, setActiveTab] = useState<"tournaments" | "season" | "leaderboard" | "history">("tournaments");

  // State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedBracket, setSelectedBracket] = useState<TournamentBracketType | null>(null);

  const [season, setSeason] = useState<Season | null>(null);
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats | null>(null);
  const [seasonRewards, setSeasonRewards] = useState<Array<SeasonRewardTier & { unlocked: boolean; claimed: boolean }>>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<Array<PlayerSeasonStats & { displayName: string; avatar?: string; rank: number }>>([]);
  const [tournamentHistory, setTournamentHistory] = useState<TournamentHistoryItem[]>([]);

  const loadData = async () => {
    const baseUrl = getApiBaseUrl();
    try {
      const [tRes, sRes, sPlayerRes, sLbRes, hRes] = await Promise.all([
        fetch(`${baseUrl}/api/tournaments`).then((r) => r.json()),
        fetch(`${baseUrl}/api/seasons/current`).then((r) => r.json()),
        fetch(`${baseUrl}/api/seasons/player/${effectivePlayerId}`).then((r) => r.json()),
        fetch(`${baseUrl}/api/seasons/leaderboard`).then((r) => r.json()),
        fetch(`${baseUrl}/api/tournaments/player/${effectivePlayerId}/history`).then((r) => r.json()),
      ]);

      if (tRes.tournaments) setTournaments(tRes.tournaments);
      if (sRes.season) setSeason(sRes.season);
      if (sPlayerRes.stats) setSeasonStats(sPlayerRes.stats);
      if (sPlayerRes.rewards) setSeasonRewards(sPlayerRes.rewards);
      if (sLbRes.leaderboard) setSeasonLeaderboard(sLbRes.leaderboard);
      if (hRes.history) setTournamentHistory(hRes.history);
    } catch (err) {
      console.warn("Could not load tournament/season data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectivePlayerId]);

  const handleRegister = async (tournamentId: string) => {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: effectivePlayerId,
          displayName: currentName,
          avatar: currentAvatar,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to register:", err);
    }
  };

  const handleCheckIn = async (tournamentId: string) => {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/tournaments/${tournamentId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: effectivePlayerId }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to check in:", err);
    }
  };

  const handleViewBracket = async (tournamentId: string) => {
    const baseUrl = getApiBaseUrl();
    try {
      const t = tournaments.find((item) => item.id === tournamentId);
      if (!t) return;
      setSelectedTournament(t);

      // If bracket not generated yet and status is not draft, start tournament for simulation
      let bRes = await fetch(`${baseUrl}/api/tournaments/${tournamentId}/bracket`);
      if (!bRes.ok && t.status === "REGISTRATION_OPEN") {
        await fetch(`${baseUrl}/api/tournaments/${tournamentId}/start`, { method: "POST" });
        bRes = await fetch(`${baseUrl}/api/tournaments/${tournamentId}/bracket`);
      }

      if (bRes.ok) {
        const data = await bRes.json();
        setSelectedBracket(data.bracket);
      }
    } catch (err) {
      console.error("Failed to load bracket:", err);
    }
  };

  const handleClaimSeasonReward = async (tierId: string) => {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/seasons/player/${effectivePlayerId}/claim/${tierId}`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to claim seasonal reward:", err);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Lounge
            </Link>
            <div className="flex items-center gap-3 text-xs font-bold">
              <Link
                to="/leaderboard"
                className="text-amber-400 hover:text-amber-300 transition underline underline-offset-2"
              >
                🏆 Global Leaderboards
              </Link>
            </div>
          </div>

          {/* Page Hero */}
          <div className="bg-stone-900/90 dark:bg-zinc-900/90 border border-stone-800 dark:border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  BHALYAM Esports & Competitions
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-stone-100 dark:text-zinc-100 tracking-tight">
                  Tournaments & Championship Seasons
                </h1>
                <p className="text-xs text-stone-400 font-mono">
                  Enter single-elimination brackets, advance through rounds, and earn exclusive trophies.
                </p>
              </div>

              {season && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center sm:text-right">
                  <span className="text-[10px] font-mono text-amber-300 block font-bold">CURRENT SEASON</span>
                  <span className="text-sm font-black font-mono text-stone-100">{season.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-800/60 dark:border-zinc-800/60 pb-3 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab("tournaments")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "tournaments"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🏟️ Active Tournaments ({tournaments.length})
            </button>
            <button
              onClick={() => setActiveTab("season")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "season"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🌴 Season Pass & Rewards
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "leaderboard"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🏆 Season Rankings ({seasonLeaderboard.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "history"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🎖️ Trophy Room ({tournamentHistory.length})
            </button>
          </div>

          {/* Tab 1: Tournaments List */}
          {activeTab === "tournaments" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  currentPlayerId={effectivePlayerId}
                  onRegister={handleRegister}
                  onCheckIn={handleCheckIn}
                  onViewBracket={handleViewBracket}
                />
              ))}
            </div>
          )}

          {/* Tab 2: Season Pass & Rewards */}
          {activeTab === "season" && season && seasonStats && (
            <SeasonDashboard
              season={season}
              stats={seasonStats}
              rewards={seasonRewards}
              onClaimReward={handleClaimSeasonReward}
            />
          )}

          {/* Tab 3: Season Leaderboard */}
          {activeTab === "leaderboard" && (
            <SeasonLeaderboard leaderboard={seasonLeaderboard} />
          )}

          {/* Tab 4: Trophy Room (My History) */}
          {activeTab === "history" && (
            <TournamentHistory history={tournamentHistory} />
          )}

          {/* Bracket Modal */}
          {selectedTournament && selectedBracket && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bracketModalTitle"
            >
              <div className="bg-stone-900 dark:bg-zinc-900 border border-stone-800 dark:border-zinc-800 rounded-3xl p-6 max-w-5xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 id="bracketModalTitle" className="font-bold text-lg text-stone-100">
                      {selectedTournament.title}
                    </h3>
                    <span className="text-xs font-mono text-amber-400">
                      Single Elimination Bracket • {selectedTournament.game}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTournament(null);
                      setSelectedBracket(null);
                    }}
                    className="text-stone-400 hover:text-stone-200 text-base font-bold px-2 py-1"
                    aria-label="Close bracket"
                  >
                    ✕
                  </button>
                </div>

                <TournamentBracket
                  tournament={selectedTournament}
                  bracket={selectedBracket}
                />

                <button
                  onClick={() => {
                    setSelectedTournament(null);
                    setSelectedBracket(null);
                  }}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Close Bracket Viewer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
