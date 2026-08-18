import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";

import PlayerRankCard from "../features/rankings/PlayerRankCard";
import LeaderboardTable from "../features/rankings/LeaderboardTable";
import ChallengesBoard from "../features/rankings/ChallengesBoard";
import RecentPlayersHub from "../features/rankings/RecentPlayersHub";
import { SkeletonLoader } from "../design-system/premium";

import type {
  PlayerRank,
  XPProgression,
  LeaderboardEntry,
  LeaderboardMetric,
} from "@shared/ranking/PlayerRank";
import type { PlayerChallenges } from "@shared/ranking/Challenges";
import type { RecentPlayer, FriendSummary } from "@shared/ranking/RecentPlayer";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { GameKind } from "@shared/types";

import { ArrowLeftIcon } from "../components/auth/authIcons";

export default function LeaderboardPage() {

  /**
   * Identity now comes from a credential the server verifies, not from a
   * string this page picks. The old line read `userId ||
   * localStorage.getItem("mpg.playerId") || "guest_player_1"` and put the
   * result in the URL of every request — which is how a stranger could read
   * and write another player's records, and why every guest who had never
   * joined a room shared the single profile `guest_player_1`.
   */
  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  const [activeTab, setActiveTab] = useState<"leaderboard" | "challenges" | "social">("leaderboard");

  // State
  const [rankData, setRankData] = useState<{ rank: PlayerRank; progression: XPProgression } | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | undefined>();
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<LeaderboardMetric>("rating");
  const [selectedGame, setSelectedGame] = useState<GameKind | undefined>();
  const [challenges, setChallenges] = useState<PlayerChallenges | null>(null);
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);

  const loadData = async () => {
    // Identity first: a request built on a null id is a request the server
    // now refuses, and rightly.
    if (!effectivePlayerId) return;
    try {
      const [rankRes, statsRes, lbRes, chalRes, recentRes, friendsRes] = await Promise.all([
        apiFetch(`/api/ranking/rank/${effectivePlayerId}`).then((r) => r.json()),
        apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => r.json()),
        apiFetch(
          `/api/ranking/leaderboard?metric=${selectedMetric}${selectedGame ? `&game=${selectedGame}` : ""}`
        ).then((r) => r.json()),
        apiFetch(`/api/ranking/challenges/${effectivePlayerId}`).then((r) => r.json()),
        apiFetch(`/api/ranking/recent/${effectivePlayerId}`).then((r) => r.json()),
        apiFetch(`/api/ranking/friends/${effectivePlayerId}`).then((r) => r.json()),
      ]);

      if (rankRes.rank && rankRes.progression) setRankData(rankRes);
      if (statsRes.stats) setPlayerStats(statsRes.stats);
      if (lbRes.entries) {
        setLeaderboardEntries(lbRes.entries);
        setLeaderboardTotal(lbRes.total);
      }
      if (chalRes.challenges) setChallenges(chalRes.challenges);
      if (recentRes.recent) setRecentPlayers(recentRes.recent);
      if (friendsRes.friends) setFriends(friendsRes.friends);
    } catch (err) {
      console.warn("Could not load full ranking data:", err);
    }
  };

  useEffect(() => {
    if (!identityReady) return;
    loadData();
  }, [identityReady, effectivePlayerId, selectedMetric, selectedGame]);

  const handleClaimReward = async (challengeId: string) => {
    try {
      const res = await apiFetch(`/api/ranking/challenges/${effectivePlayerId}/claim/${challengeId}`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to claim reward:", err);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    await apiFetch(`/api/ranking/friends/${effectivePlayerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    await loadData();
  };

  const handleRemoveFriend = async (friendId: string) => {
    await apiFetch(`/api/ranking/friends/${effectivePlayerId}/${friendId}`, {
      method: "DELETE",
    });
    await loadData();
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Lounge
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold">
              <Link
                to="/tournaments"
                className="text-amber-400 hover:text-amber-300 transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏟️ Tournaments & Seasons
              </Link>
              <Link
                to="/profile"
                className="text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                View Profile & History
              </Link>
            </div>
          </div>

          {/* Player's Live Rank Card */}
          {rankData && (
            <PlayerRankCard
              rank={rankData.rank}
              progression={rankData.progression}
              stats={playerStats}
            />
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-800/60 dark:border-zinc-800/60 pb-3 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-xl transition shrink-0 ${
                activeTab === "leaderboard"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🏆 Competitive Leaderboards
            </button>
            <button
              onClick={() => setActiveTab("challenges")}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-xl transition shrink-0 ${
                activeTab === "challenges"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🎯 Daily & Weekly Quests
            </button>
            <button
              onClick={() => setActiveTab("social")}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-xl transition shrink-0 ${
                activeTab === "social"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              👥 Recent Opponents & Friends ({recentPlayers.length})
            </button>
          </div>

          {/* Tab 1: Leaderboard */}
          {activeTab === "leaderboard" && (
            <LeaderboardTable
              entries={leaderboardEntries}
              total={leaderboardTotal}
              selectedMetric={selectedMetric}
              selectedGame={selectedGame}
              onSelectMetric={setSelectedMetric}
              onSelectGame={setSelectedGame}
              onAddFriend={handleAddFriend}
            />
          )}

          {/* Tab 2: Daily & Weekly Quests */}
          {activeTab === "challenges" && challenges && (
            <ChallengesBoard
              challenges={challenges}
              onClaimReward={handleClaimReward}
            />
          )}

          {/* Tab 3: Recent Players & Social Hub */}
          {activeTab === "social" && (
            <RecentPlayersHub
              recentPlayers={recentPlayers}
              friends={friends}
              onAddFriend={handleAddFriend}
              onRemoveFriend={handleRemoveFriend}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
