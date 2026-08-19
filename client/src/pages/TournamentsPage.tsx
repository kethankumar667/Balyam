import React, { useEffect, useState, useMemo } from "react";
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
import { TournamentTrustStrip } from "../features/tournaments/TournamentTrustStrip";
import { EmptyStateIllustration } from "../design-system/premium";

import type { Tournament, TournamentHistoryItem } from "@shared/tournaments/Tournament";
import type { TournamentBracket as TournamentBracketType } from "@shared/tournaments/Bracket";
import type { Season, PlayerSeasonStats } from "@shared/seasons/Season";
import type { SeasonRewardTier } from "@shared/seasons/SeasonRewards";
import type { GameKind } from "@shared/types";

import { ArrowLeftIcon } from "../components/auth/authIcons";
import { GameCategoryIcon } from "../design-system/icons";

import { useAuthStore } from "../store/authStore";
import MemberLockedGate from "../components/auth/MemberLockedGate";

export default function TournamentsPage() {
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName) || (isMember ? "Member" : "Guest");
  const currentAvatar = useRoomStore((s) => s.avatarId);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  const [activeTab, setActiveTab] = useState<"tournaments" | "season" | "leaderboard" | "history">("tournaments");
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("all");

  // State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedBracket, setSelectedBracket] = useState<TournamentBracketType | null>(null);

  const [season, setSeason] = useState<Season | null>(null);
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats | null>(null);
  const [seasonRewards, setSeasonRewards] = useState<Array<SeasonRewardTier & { unlocked: boolean; claimed: boolean }>>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<Array<PlayerSeasonStats & { displayName: string; avatar?: string; rank: number }>>([]);
  const [tournamentHistory, setTournamentHistory] = useState<TournamentHistoryItem[]>([]);

  if (!isMember) {
    return <MemberLockedGate feature="tournaments" />;
  }

  const loadData = async () => {
    if (!effectivePlayerId) return;
    try {
      const [tRes, sRes, sPlayerRes, sLbRes, hRes] = await Promise.all([
        apiFetch(`/api/tournaments`).then((r) => r.json()).catch(() => ({ tournaments: [] })),
        apiFetch(`/api/seasons/current`).then((r) => r.json()).catch(() => ({ season: null })),
        apiFetch(`/api/seasons/player/${effectivePlayerId}`).then((r) => r.json()).catch(() => ({ stats: null, rewards: [] })),
        apiFetch(`/api/seasons/leaderboard`).then((r) => r.json()).catch(() => ({ leaderboard: [] })),
        apiFetch(`/api/tournaments/player/${effectivePlayerId}/history`).then((r) => r.json()).catch(() => ({ history: [] })),
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

  // Filtered Tournaments List
  const filteredTournaments = useMemo(() => {
    if (selectedGameFilter === "all") return tournaments;
    return tournaments.filter((t) => t.game.toLowerCase() === selectedGameFilter.toLowerCase());
  }, [tournaments, selectedGameFilter]);

  // Featured tournament for Hero banner
  const featuredTournament = tournaments[0];

  return (
    <AppLayout>
      <div className="min-h-full py-6 sm:py-10 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto space-y-8">
        {/* 1. Header Bar: Breadcrumb Navigation & Global Leaderboards */}
        <div className="flex items-center justify-between border-b border-[var(--auth-card-edge)] dark:border-stone-800/80 pb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs sm:text-sm font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] dark:text-stone-300 dark:hover:text-stone-100 transition"
            aria-label="Back to Lounge"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Lounge
          </Link>
          <div className="flex items-center gap-3 text-xs sm:text-sm font-black">
            <Link
              to="/leaderboard"
              className="text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300 transition underline underline-offset-4 min-h-[44px] py-2 inline-flex items-center gap-1.5"
            >
              <span>🏆 Global Leaderboards</span>
            </Link>
          </div>
        </div>

        {/* 2. Featured Tournament Hero Banner */}
        <TournamentHeroBanner
          tournament={featuredTournament}
          onEnterArena={(id) => handleViewBracket(id)}
        />

        {/* 3. Category Tab Bar */}
        <div className="space-y-4">
          <div
            className="flex items-center gap-2 border-b border-[var(--auth-card-edge)] dark:border-stone-800/80 pb-3 overflow-x-auto text-xs font-bold scrollbar-none"
            role="tablist"
            aria-label="Tournament navigation sections"
          >
            <button
              role="tab"
              aria-selected={activeTab === "tournaments"}
              onClick={() => setActiveTab("tournaments")}
              className={`px-4 sm:px-5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl transition shrink-0 cursor-pointer ${
                activeTab === "tournaments"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] dark:bg-stone-900/60 dark:text-stone-400 hover:text-[var(--auth-ink)] dark:hover:text-stone-200 border border-[var(--auth-card-edge)] dark:border-stone-800"
              }`}
            >
              <span>🏟️ Active Tournaments</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                {tournaments.length}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "season"}
              onClick={() => setActiveTab("season")}
              className={`px-4 sm:px-5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl transition shrink-0 cursor-pointer ${
                activeTab === "season"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] dark:bg-stone-900/60 dark:text-stone-400 hover:text-[var(--auth-ink)] dark:hover:text-stone-200 border border-[var(--auth-card-edge)] dark:border-stone-800"
              }`}
            >
              <span>🌴 Season Pass & Rewards</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "leaderboard"}
              onClick={() => setActiveTab("leaderboard")}
              className={`px-4 sm:px-5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl transition shrink-0 cursor-pointer ${
                activeTab === "leaderboard"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] dark:bg-stone-900/60 dark:text-stone-400 hover:text-[var(--auth-ink)] dark:hover:text-stone-200 border border-[var(--auth-card-edge)] dark:border-stone-800"
              }`}
            >
              <span>🏆 Season Rankings</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                {seasonLeaderboard.length}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              className={`px-4 sm:px-5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-2xl transition shrink-0 cursor-pointer ${
                activeTab === "history"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] dark:bg-stone-900/60 dark:text-stone-400 hover:text-[var(--auth-ink)] dark:hover:text-stone-200 border border-[var(--auth-card-edge)] dark:border-stone-800"
              }`}
            >
              <span>🎖️ Trophy Room</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                {tournamentHistory.length}
              </span>
            </button>
          </div>

          {/* Secondary Game Filter Chips (when activeTab is tournaments) */}
          {activeTab === "tournaments" && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
              <span className="text-[var(--auth-ink-soft)] dark:text-stone-400 text-[11px] uppercase font-bold shrink-0 mr-1">
                Filter:
              </span>
              {[
                { id: "all", label: "All Games" },
                { id: "uno", label: "UNO" },
                { id: "ludo", label: "Ludo" },
                { id: "rummy", label: "Rummy" },
                { id: "handcricket", label: "Hand Cricket" },
                { id: "chess", label: "Chess" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedGameFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-xl transition shrink-0 font-bold flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                    selectedGameFilter === filter.id
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                      : "bg-stone-500/10 dark:bg-stone-900/40 text-[var(--auth-ink-soft)] dark:text-stone-400 hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)] dark:border-stone-800"
                  }`}
                >
                  {filter.id !== "all" && <GameCategoryIcon game={filter.id} size={14} />}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Tab 1: Tournaments Grid */}
        {activeTab === "tournaments" && (
          filteredTournaments.length === 0 ? (
            <EmptyStateIllustration
              type="tournaments"
              title="No Tournaments Running Right Now"
              description="Our automated bracket engine schedules regular knockout tournaments. Check back shortly!"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map((t) => (
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

        {/* 5. Tab 2: Season Pass & Rewards */}
        {activeTab === "season" && season && seasonStats && (
          <SeasonDashboard
            season={season}
            stats={seasonStats}
            rewards={seasonRewards}
            onClaimReward={handleClaimSeasonReward}
          />
        )}

        {/* 6. Tab 3: Season Leaderboard */}
        {activeTab === "leaderboard" && (
          <SeasonLeaderboard leaderboard={seasonLeaderboard} />
        )}

        {/* 7. Tab 4: Trophy Room (My History) */}
        {activeTab === "history" && (
          <TournamentHistory history={tournamentHistory} />
        )}

        {/* 8. Bottom Trust & Value Strip */}
        <TournamentTrustStrip />

        {/* 9. Bracket Viewer Dialog Modal */}
        {selectedTournament && selectedBracket && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bracketModalTitle"
          >
            <div className="bg-[var(--auth-card)] dark:bg-zinc-900 border border-[var(--auth-card-edge)] dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-5xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--auth-card-edge)] dark:border-zinc-800 pb-4">
                <div className="space-y-1">
                  <h3 id="bracketModalTitle" className="font-black text-xl text-[var(--auth-ink)] dark:text-stone-100">
                    {selectedTournament.title}
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                    <GameCategoryIcon game={selectedTournament.game} size={14} />
                    Single Elimination Knockout Bracket • {selectedTournament.game.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedTournament(null);
                    setSelectedBracket(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-stone-500/10 hover:bg-stone-500/20 text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] dark:text-stone-400 dark:hover:text-stone-200 flex items-center justify-center text-lg font-bold transition cursor-pointer min-h-[44px]"
                  aria-label="Close bracket modal"
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
                className="w-full bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold py-3.5 rounded-2xl text-xs sm:text-sm transition cursor-pointer min-h-[44px]"
              >
                Close Bracket Viewer
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
