import { useState } from "react";
import { Link } from "react-router-dom";
import { Swords, Trophy, Play, Users, Sparkles, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";

interface Matchup {
  id: string;
  round: string;
  player1: { name: string; score: number; winner?: boolean };
  player2: { name: string; score: number; winner?: boolean };
  status: "completed" | "live" | "upcoming";
}

const INITIAL_MATCHES: Matchup[] = [
  {
    id: "m1",
    round: "Semi-Final A",
    player1: { name: "Aditi_Pro", score: 142, winner: true },
    player2: { name: "Rahul_King", score: 98 },
    status: "completed",
  },
  {
    id: "m2",
    round: "Semi-Final B",
    player1: { name: "Sneha_Ace", score: 110 },
    player2: { name: "Vikram_HC", score: 135, winner: true },
    status: "completed",
  },
  {
    id: "m3",
    round: "Grand Finals",
    player1: { name: "Aditi_Pro", score: 0 },
    player2: { name: "Vikram_HC", score: 0 },
    status: "live",
  },
];

export default function TournamentsPage() {
  const { isSuperAdmin, capabilities } = useAuthStore();
  const [matches, setMatches] = useState<Matchup[]>(INITIAL_MATCHES);
  const [activeGame, setActiveGame] = useState<"handcricket" | "ludo">("handcricket");

  if (!isSuperAdmin && !capabilities.unlockAllFeatures) {
    return (
      <ComingSoonGate
        title="Tournament Arena"
        subtitle="Competitive Brackets & Seasonal Cups"
        description="The official BHALYAM tournament system is currently under development. Soon you'll be able to enter live knockout brackets, compete in seasonal championships, and win arena trophies."
        icon={Swords}
        iconBgGradient="from-amber-600 via-yellow-500 to-amber-500"
        accentColor="text-amber-400"
        features={[
          "Daily Knockout & Round-Robin Brackets",
          "Seasonal Championship Leaderboards",
          "Exclusive Champion Badges & Arena Titles",
          "Automated Match Scheduling & Live Spectating",
        ]}
      />
    );
  }

  const simulateFinals = () => {
    const s1 = Math.floor(Math.random() * 80) + 70;
    const s2 = Math.floor(Math.random() * 80) + 70;
    setMatches((prev) =>
      prev.map((m) =>
        m.id === "m3"
          ? {
              ...m,
              status: "completed",
              player1: { ...m.player1, score: s1, winner: s1 > s2 },
              player2: { ...m.player2, score: s2, winner: s2 >= s1 },
            }
          : m,
      ),
    );
  };

  const resetTournament = () => {
    setMatches(INITIAL_MATCHES);
  };

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
                You have full access to test, simulate, and preview Tournament Arenas before public release.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/dashboard"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition"
            >
              Admin Console →
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--chrome-ink)] flex items-center gap-3">
              <Swords className="w-7 h-7 text-amber-500" />
              Tournament Arena Simulator
            </h1>
            <p className="text-xs sm:text-sm text-[var(--chrome-ink-soft)] mt-1">
              Live Knockout Cup & Seasonal Championship Bracket Engine
            </p>
          </div>

          <div role="group" aria-label="Tournament games" className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={activeGame === "handcricket"}
              aria-label="Select Hand Cricket Tournament Cup"
              onClick={() => setActiveGame("handcricket")}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer ${
                activeGame === "handcricket"
                  ? "bg-amber-500 text-zinc-950 font-extrabold shadow-sm"
                  : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] border border-[var(--chrome-border)]"
              }`}
            >
              🏏 Hand Cricket Cup
            </button>
            <button
              type="button"
              aria-pressed={activeGame === "ludo"}
              aria-label="Select Ludo Masters Tournament Cup"
              onClick={() => setActiveGame("ludo")}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer ${
                activeGame === "ludo"
                  ? "bg-amber-500 text-zinc-950 font-extrabold shadow-sm"
                  : "bg-[var(--chrome-control)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] border border-[var(--chrome-border)]"
              }`}
            >
              🎲 Ludo Masters
            </button>
          </div>
        </div>

        {/* Tournament Bracket Card */}
        <div className="rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-amber-500" aria-hidden="true" />
              <h2 className="text-base font-bold text-[var(--chrome-ink)]">
                Season 1 Championship: Knockout Finals
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetTournament}
                aria-label="Reset tournament bracket"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--chrome-border)] text-xs font-semibold text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={simulateFinals}
                aria-label="Simulate tournament finals match"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 text-xs font-black shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Simulate Match</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matches.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl border p-4 space-y-3 transition ${
                  m.status === "live"
                    ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-[var(--chrome-border)] bg-[var(--chrome-control)]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[var(--chrome-ink-soft)]">{m.round}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      m.status === "live"
                        ? "bg-amber-500 text-zinc-950 animate-pulse"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${
                      m.player1.winner
                        ? "bg-emerald-500/15 font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] font-semibold"
                    }`}
                  >
                    <span>{m.player1.name}</span>
                    <span className="font-mono">{m.player1.score} pts</span>
                  </div>

                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs ${
                      m.player2.winner
                        ? "bg-emerald-500/15 font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-[var(--chrome-panel)] text-[var(--chrome-ink)] font-semibold"
                    }`}
                  >
                    <span>{m.player2.name}</span>
                    <span className="font-mono">{m.player2.score} pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
