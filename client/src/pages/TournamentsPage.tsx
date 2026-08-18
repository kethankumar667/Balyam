import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import { useRoomStore } from "../store/roomStore";

import TournamentCard from "../features/tournaments/TournamentCard";
import TournamentBracket from "../features/tournaments/TournamentBracket";
import { TournamentHeroBanner } from "../features/tournaments/TournamentHeroBanner";
import SeasonDashboard from "../features/tournaments/SeasonDashboard";
import SeasonLeaderboard from "../features/tournaments/SeasonLeaderboard";
import TournamentHistory from "../features/tournaments/TournamentHistory";
import { EmptyStateIllustration, SkeletonLoader } from "../design-system/premium";

import type { Tournament, TournamentHistoryItem } from "@shared/tournaments/Tournament";
import type { TournamentBracket as TournamentBracketType } from "@shared/tournaments/Bracket";
import type { Season, PlayerSeasonStats } from "@shared/seasons/Season";
import type { SeasonRewardTier } from "@shared/seasons/SeasonRewards";

import { ArrowLeftIcon } from "../components/auth/authIcons";

export default function TournamentsPage() {
  const currentName = useRoomStore((s) => s.playerName) || "Player";
  const currentAvatar = useRoomStore((s) => s.avatarId);

  /**
   * Identity now comes from a credential the server verifies, not from a
   * string this page picks. The old line read `userId ||
   * localStorage.getItem("mpg.playerId") || "guest_player_1"` and put the
   * result in the URL of every request — which is how a stranger could read
   * and write another player's records, and why every guest who had never
   * joined a room shared the single profile `guest_player_1`.
   */
  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

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
    // Identity first: a request built on a null id is a request the server
    // now refuses, and rightly.
    if (!effectivePlayerId) return;
    try {
      const [tRes, sRes, sPlayerRes, sLbRes, hRes] = await Promise.all([
        apiFetch(`/api/tournaments`).then((r) => r.json()),
        apiFetch(`/api/seasons/current`).then((r) => r.json()),
        apiFetch(`/api/seasons/player/${effectivePlayerId}`).then((r) => r.json()),
        apiFetch(`/api/seasons/leaderboard`).then((r) => r.json()),
        apiFetch(`/api/tournaments/player/${effectivePlayerId}/history`).then((r) => r.json()),
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
    if (!identityReady) return;
    loadData();
  }, [identityReady, effectivePlayerId]);

  const handleRegister = async (tournamentId: string) => {
    try {
      const res = await apiFetch(`/api/tournaments/${tournamentId}/register`, {
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
    try {
      const res = await apiFetch(`/api/tournaments/${tournamentId}/checkin`, {
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
    try {
      const t = tournaments.find((item) => item.id === tournamentId);
      if (!t) return;
      setSelectedTournament(t);

      // If bracket not generated yet and status is not draft, start tournament for simulation
      let bRes = await apiFetch(`/api/tournaments/${tournamentId}/bracket`);
      if (!bRes.ok && t.status === "REGISTRATION_OPEN") {
        await apiFetch(`/api/tournaments/${tournamentId}/start`, { method: "POST" });
        bRes = await apiFetch(`/api/tournaments/${tournamentId}/bracket`);
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
    try {
      const res = await apiFetch(`/api/seasons/player/${effectivePlayerId}/claim/${tierId}`, {
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
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Lounge
            </Link>
            <div className="flex items-center gap-3 text-xs font-bold">
              <Link
                to="/leaderboard"
                className="text-amber-400 hover:text-amber-300 transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏆 Global Leaderboards
              </Link>
            </div>
          </div>

          {/* Page Hero */}
          <TournamentHeroBanner
            tournament={tournaments[0]}
            onEnterArena={(id) => handleViewBracket(id)}
          />

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-800/60 dark:border-zinc-800/60 pb-3 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab("tournaments")}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-xl transition shrink-0 ${
                activeTab === "tournaments"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🏟️ Active Tournaments ({tournaments.length})
            </button>
            <button
              onClick={() => setActiveTab("season")}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-xl transition shrink-0 ${
                activeTab === "season"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🌴 Season Pass & Rewards
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-xl transition shrink-0 ${
                activeTab === "leaderboard"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🏆 Season Rankings ({seasonLeaderboard.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-xl transition shrink-0 ${
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
            tournaments.length === 0 ? (
              <EmptyStateIllustration
                type="tournaments"
                title="No Tournaments Running Right Now"
                description="Our automated bracket engine schedules regular knockout tournaments. Check back shortly!"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    currentPlayerId={effectivePlayerId ?? undefined}
                    onRegister={handleRegister}
                    onCheckIn={handleCheckIn}
                    onViewBracket={handleViewBracket}
                  />
                ))}
              </div>
            )
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
