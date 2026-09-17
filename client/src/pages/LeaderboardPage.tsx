import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy, Flame, ShieldCheck, Search, Gamepad2, Medal } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";
import { apiJson } from "../lib/playerIdentity";
import { findAvatar } from "../lib/avatars";
import type { LeaderboardEntry as SharedLeaderboardEntry, RankTierName } from "@shared/ranking/PlayerRank";
import PodiumTopThree, { type PodiumCompetitor } from "../components/leaderboard/PodiumTopThree";
import ModeScorecardsLeaderboard from "../components/leaderboard/ModeScorecardsLeaderboard";

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  avatar?: string;
  rating: number;
  winRate: string;
  streak: number;
  tier: RankTierName;
}

export default function LeaderboardPage() {
  const { isSuperAdmin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"global" | "chrono">("global");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    try {
      const p = apiJson<{ entries: SharedLeaderboardEntry[]; total: number }>("/api/ranking/leaderboard");
      if (p && typeof p.then === "function") {
        p.then((data) => {
          if (active) {
            if (data?.entries && data.entries.length > 0) {
              const mapped: LeaderboardEntry[] = data.entries.map((e, idx) => ({
                rank: e.rank || idx + 1,
                playerId: e.playerId,
                name: e.displayName || e.playerId,
                avatar: e.avatar,
                rating: e.rating,
                winRate: `${Math.round((e.winRate || 0) * 100)}%`,
                streak: e.currentWinStreak || 0,
                tier: e.tier || "Gold",
              }));
              setEntries(mapped);
            } else {
              setEntries([]);
            }
            setLoading(false);
          }
        }).catch(() => {
          if (active) {
            setEntries([]);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    } catch {
      if (active) {
        setEntries([]);
        setLoading(false);
      }
    }

    return () => {
      active = false;
    };
  }, []);

  const filtered = entries.filter((entry) => {
    const matchesTier = selectedTier === "All" || entry.tier === selectedTier;
    const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const hasActiveFilter = searchTerm.trim().length > 0 || selectedTier !== "All";

  const podiumCompetitors: PodiumCompetitor[] = filtered.slice(0, 3).map((p) => ({
    rank: p.rank,
    playerId: p.playerId,
    name: p.name,
    avatar: p.avatar,
    scoreOrRating: p.rating,
    scoreLabel: `${p.rating} ELO`,
    tier: p.tier,
    winRate: p.winRate,
  }));

  return (
    <AppLayout>
      <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        {/* Super Admin Panel link — only visible when super admin is logged in */}
        {isSuperAdmin && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-500">
                    ⚡ Super Admin Mode
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                    Admin Tools
                  </span>
                </div>
                <p className="text-xs text-[var(--chrome-ink-soft)]">
                  You have full access to inspect, filter, and calibrate Global Ratings and ELO Rank Ladders.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/leaderboards"
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition min-h-[44px] flex items-center justify-center"
              >
                Admin Ratings Panel →
              </Link>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--chrome-ink)] flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-500" />
              Skill & Record Leaderboards
            </h1>
            <p className="text-xs sm:text-sm text-[var(--chrome-ink-soft)] mt-1">
              Global ELO Ratings, Division Ladders & Game Chrono-Scorecards
            </p>
          </div>

          {/* Primary View Switcher: Global MMR vs Game Chrono-Records */}
          <div className="flex items-center p-1 rounded-2xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("global")}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === "global"
                  ? "bg-amber-500 text-zinc-950 shadow-sm"
                  : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
              }`}
            >
              <Medal className="w-4 h-4" />
              <span>Global Standings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chrono")}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === "chrono"
                  ? "bg-amber-500 text-zinc-950 shadow-sm"
                  : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Game High Scores (Chrono-PB)</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: GLOBAL MMR RANKINGS */}
        {activeTab === "global" && (
          <div className="space-y-6">
            {/* Search & Tier Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Division Tier Filter Bar */}
              <div
                role="group"
                aria-label="Filter leaderboard by division tier"
                className="flex items-center gap-2 overflow-x-auto pb-1"
              >
                {["All", "Grandmaster", "Master", "Diamond", "Gold"].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={selectedTier === tier}
                    aria-label={`Filter by ${tier} division`}
                    onClick={() => setSelectedTier(tier)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer ${
                      selectedTier === tier
                        ? "bg-amber-500 text-zinc-950 font-extrabold shadow-sm"
                        : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] border border-[var(--chrome-border)]"
                    }`}
                  >
                    {tier === "Grandmaster" ? "👑 Grandmaster" : tier}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--chrome-ink-soft)]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search player..."
                  aria-label="Search players by name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pl-9 pr-3 py-2.5 min-h-[44px] rounded-xl text-xs bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Filtered 0 Matches State (when search or tier is active) */}
            {hasActiveFilter && filtered.length === 0 ? (
              <div
                role="status"
                aria-live="polite"
                className="p-8 text-center bg-[var(--chrome-panel)] border border-[var(--chrome-border)] rounded-3xl space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl mx-auto">
                  🏆
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--chrome-ink)]">No players found</h3>
                  <p className="text-xs text-[var(--chrome-ink-soft)] max-w-sm mx-auto">
                    No leaderboard entries match your current search term or division tier filter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedTier("All");
                  }}
                  className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Clear Filters
                </button>
              </div>
            ) : entries.length === 0 && !loading ? (
              /* Empty State when no competitors exist yet in database */
              <div
                role="status"
                aria-live="polite"
                className="py-16 px-4 text-center rounded-3xl border border-dashed border-[var(--chrome-border)] bg-[var(--chrome-panel)] space-y-3 max-w-md mx-auto"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-2xl font-mono font-black">
                  🏆
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-[var(--chrome-ink)]">
                    No Ranked Competitors Yet
                  </h3>
                  <p className="text-xs text-[var(--chrome-ink-soft)]">
                    Play multiplayer matches in any lounge arena to earn your initial ELO rating and climb the hall of fame!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 3D Holographic Podium for Top 3 Competitors */}
                {podiumCompetitors.length >= 2 && (
                  <PodiumTopThree competitors={podiumCompetitors} unit="ELO" />
                )}

                {/* Cybernetic Leaderboard Table */}
                <div className="rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" aria-label="Global Skill Leaderboard Table">
                      <thead className="border-b border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] font-mono uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3.5 px-4 font-bold">Rank</th>
                          <th className="py-3.5 px-4 font-bold">Player</th>
                          <th className="py-3.5 px-4 font-bold">Division</th>
                          <th className="py-3.5 px-4 font-bold">Rating (ELO)</th>
                          <th className="py-3.5 px-4 font-bold">Win Rate</th>
                          <th className="py-3.5 px-4 font-bold">Streak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--chrome-hairline)] font-medium">
                        {filtered.map((p) => {
                          const avatar = p.avatar ? findAvatar(p.avatar) : null;
                          return (
                            <tr key={p.playerId || p.rank} className="hover:bg-[var(--chrome-control)]/50 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-black">
                                {p.rank === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-zinc-950 font-black">
                                    1
                                  </span>
                                ) : p.rank === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-300 text-zinc-950 font-black">
                                    2
                                  </span>
                                ) : p.rank === 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black">
                                    3
                                  </span>
                                ) : (
                                  `#${p.rank}`
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 overflow-hidden shrink-0 flex items-center justify-center">
                                    {avatar ? (
                                      <img src={avatar.src} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] font-black text-amber-400">
                                        {p.name.slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-[var(--chrome-ink)]">
                                    {p.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    p.tier === "Grandmaster"
                                      ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                      : p.tier === "Master"
                                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                      : p.tier === "Diamond"
                                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                      : "bg-stone-500/20 text-stone-400"
                                  }`}
                                >
                                  {p.tier}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-500">
                                {p.rating}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[var(--chrome-ink)]">
                                {p.winRate}
                              </td>
                              <td className="py-3.5 px-4">
                                {p.streak > 0 ? (
                                  <span className="inline-flex items-center gap-1 font-mono font-bold text-orange-500">
                                    <Flame className="w-3.5 h-3.5 fill-current" />
                                    {p.streak}W
                                  </span>
                                ) : (
                                  <span className="text-[var(--chrome-ink-soft)] font-mono">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: GAME CHRONO-PB SCORECARDS */}
        {activeTab === "chrono" && (
          <ModeScorecardsLeaderboard />
        )}
      </div>
    </AppLayout>
  );
}
