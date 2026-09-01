import { useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Medal, Crown, Flame, ShieldCheck, ArrowUpRight, Search } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";

interface LeaderboardEntry {
  rank: number;
  name: string;
  rating: number;
  winRate: string;
  streak: number;
  tier: "Grandmaster" | "Master" | "Diamond" | "Gold";
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Kethan_GM", rating: 2840, winRate: "84.2%", streak: 12, tier: "Grandmaster" },
  { rank: 2, name: "Aditi_Pro", rating: 2795, winRate: "81.0%", streak: 8, tier: "Grandmaster" },
  { rank: 3, name: "Vikram_HC", rating: 2710, winRate: "78.4%", streak: 5, tier: "Grandmaster" },
  { rank: 4, name: "Rahul_King", rating: 2540, winRate: "74.1%", streak: 3, tier: "Master" },
  { rank: 5, name: "Sneha_Ace", rating: 2490, winRate: "72.8%", streak: 4, tier: "Master" },
  { rank: 6, name: "Priya_Uno", rating: 2380, winRate: "69.5%", streak: 2, tier: "Diamond" },
  { rank: 7, name: "Arjun_Ludo", rating: 2310, winRate: "67.0%", streak: 1, tier: "Diamond" },
  { rank: 8, name: "Deepak_Snake", rating: 2190, winRate: "64.2%", streak: 0, tier: "Gold" },
];

export default function LeaderboardPage() {
  const { isSuperAdmin, capabilities } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");

  if (!isSuperAdmin && !capabilities.unlockAllFeatures) {
    return (
      <ComingSoonGate
        title="Global Leaderboards"
        subtitle="Rankings, Quests & Grandmaster Tiers"
        description="Global rankings and competitive ladder systems are currently being calibrated. Soon you'll be able to compare ratings with friends, climb division ranks, and claim weekly rewards."
        icon={Trophy}
        iconBgGradient="from-yellow-500 via-amber-500 to-amber-600"
        accentColor="text-yellow-400"
        features={[
          "Global & Game-Specific Rank Ladders",
          "Daily Skill Quests & Bonus XP Multipliers",
          "Grandmaster Tier Badges & Hall of Fame",
          "Head-to-Head Player Comparison",
        ]}
      />
    );
  }

  const filtered = MOCK_LEADERBOARD.filter((entry) => {
    const matchesTier = selectedTier === "All" || entry.tier === selectedTier;
    const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTier && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        {/* Super Admin Unlock Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-500">
                  ⚡ Super Admin Sandbox Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                  Feature Unlocked
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
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition"
            >
              Admin Ratings Panel →
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--chrome-ink)] flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-500" />
              Global Skill Leaderboards
            </h1>
            <p className="text-xs sm:text-sm text-[var(--chrome-ink-soft)] mt-1">
              Top Ranked Players, Grandmaster Division & MMR Ratings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--chrome-ink-soft)]" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl text-xs bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Tier Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["All", "Grandmaster", "Master", "Diamond", "Gold"].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedTier === tier
                  ? "bg-amber-500 text-zinc-950 font-extrabold shadow-sm"
                  : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] border border-[var(--chrome-border)]"
              }`}
            >
              {tier === "Grandmaster" ? "👑 Grandmaster" : tier}
            </button>
          ))}
        </div>

        {/* Leaderboard Table Card / Empty State */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-[var(--chrome-panel)] border border-[var(--chrome-border)] rounded-3xl space-y-4">
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
              className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm transition cursor-pointer min-h-[44px]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
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
                  {filtered.map((p) => (
                    <tr key={p.rank} className="hover:bg-[var(--chrome-control)]/50 transition-colors">
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
                      <td className="py-3.5 px-4 font-bold text-[var(--chrome-ink)]">
                        {p.name}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
