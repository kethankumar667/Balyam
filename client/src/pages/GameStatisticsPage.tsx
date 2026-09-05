import { Link, useOutletContext } from "react-router-dom";
import {
  BarChart3,
  Trophy,
  Flame,
  Clock,
  Gamepad2,
  ArrowRight,
  Shield,
  Heart,
  Zap,
  Target,
  Smile,
  FileEdit,
  Download,
  ChevronRight,
  Sparkles,
  Award,
} from "lucide-react";
import { useRoomStore } from "../store/roomStore";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import CountUp from "../components/CountUp";
import CareerMetrics from "../features/profile/CareerMetrics";
import FavoriteGames from "../features/profile/FavoriteGames";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";

import type { GameKind } from "@shared/types";

interface GameBreakdown {
  game: GameKind;
  label: string;
  icon: string;
  tagline: string;
  specialStat: string;
}

const GAME_BREAKDOWNS: GameBreakdown[] = [
  { game: "ludo", label: "Ludo Lounge", icon: "🎲", tagline: "Roll, capture & race home", specialStat: "TOKENS HOME" },
  { game: "rummy", label: "Classic Rummy", icon: "🎴", tagline: "Pure sequences & neat melds", specialStat: "PURE RUNS" },
  { game: "handcricket", label: "Hand Cricket", icon: "🏏", tagline: "Childhood finger-cricket thrill", specialStat: "BEST RUNS" },
  { game: "uno", label: "UNO Blast", icon: "🃏", tagline: "Reverse, draw four & shout UNO", specialStat: "WILD PLAYS" },
  { game: "snl", label: "Snakes & Ladders", icon: "🐍", tagline: "Climb ladders, dodge the snakes", specialStat: "LADDERS CLIMBED" },
  { game: "dotsboxes", label: "Dots & Boxes", icon: "⏹", tagline: "Corner the grid and own boxes", specialStat: "BOXES CAPTURED" },
];

/**
 * Data, the Edit Profile / Avatar Picker modals, and the `<ProfileLayout>`
 * sidebar all live one level up now, in ProfileFamilyLayout — see that
 * file's header comment for why. This page only renders its own content and
 * reads what it needs via `useOutletContext`.
 */
export default function GameStatisticsPage() {
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);

  const { profile, stats, achievements, isMember, openEditModal, openAvatarModal } =
    useOutletContext<ProfileFamilyOutletContext>();

  if (!isMember) {
    return <MemberLockedGate feature="profile" />;
  }

  if (!profile) return null;

  const handleExportData = () => {
    const exportPayload = {
      playerId: profile.playerId,
      displayName: currentName,
      avatar: currentAvatar,
      memberSince: new Date(profile.joinedAt).toISOString(),
      stats,
      achievements,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bhalyam_profile_${profile.playerId || "player"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Derive storytelling insights
  const totalMatches = stats?.totalMatches || 0;
  const signatureGame = stats?.favoriteGame && stats.favoriteGame !== "none"
    ? stats.favoriteGame
    : (totalMatches > 0 ? "Ludo" : undefined);

  const longestMatch = stats?.longestMatchMinutes || 0;
  const bestStreak = stats?.bestWinStreak || 0;
  const recoveries = stats?.recoveryCount || 0;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const recentAchievements = achievements.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ── Section 1: Page Header & Storytelling Highlights ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              <span>How Do I Play? — Gaming Story</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Your signature style, memorable streaks, game records, and childhood lounge tales
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/profile/matches"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
            >
              <span>View Match Logs</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
            </Link>
          </div>
        </div>

        {/* 4 Hero Story Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Story Card 1: Your Best Run */}
          <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-orange-500/25 dark:via-transparent dark:to-orange-500/10 shadow-xs hover:-translate-y-0.5 transition-transform duration-300">
            <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 space-y-2.5 border border-stone-200/60 dark:border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    YOUR BEST RUN
                  </span>
                  <span className="text-[9px] font-black bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40 px-2 py-0.5 rounded-full uppercase">
                    HOT STREAK
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mt-2">
                  {bestStreak > 0 ? (
                    <span><CountUp end={bestStreak} duration={1.2} /> in a row</span>
                  ) : (
                    "Ready for streak"
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium leading-snug">
                {bestStreak > 0 ? "Unstoppable momentum across lounge rooms!" : "Your first streak starts with your first win."}
              </p>
            </div>
          </div>

          {/* Story Card 2: Signature Game */}
          <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-emerald-500/25 dark:via-transparent dark:to-emerald-500/10 shadow-xs hover:-translate-y-0.5 transition-transform duration-300">
            <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 space-y-2.5 border border-stone-200/60 dark:border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-emerald-500" />
                    SIGNATURE GAME
                  </span>
                  <span className="text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full uppercase">
                    FAVORITE
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white capitalize truncate mt-2">
                  {signatureGame || "Discovering"}
                </div>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium leading-snug">
                {totalMatches > 0 ? `${totalMatches} match appearances` : "Play games to discover your signature table."}
              </p>
            </div>
          </div>

          {/* Story Card 3: Longest Battle */}
          <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-cyan-500/25 dark:via-transparent dark:to-cyan-500/10 shadow-xs hover:-translate-y-0.5 transition-transform duration-300">
            <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 space-y-2.5 border border-stone-200/60 dark:border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                    LONGEST BATTLE
                  </span>
                  <span className="text-[9px] font-black bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/40 px-2 py-0.5 rounded-full uppercase">
                    TENACITY
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mt-2">
                  {longestMatch > 0 ? (
                    <span><CountUp end={longestMatch} duration={1.5} /> min</span>
                  ) : (
                    "First round soon"
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium leading-snug">
                {longestMatch > 15 ? "True endurance in a nerve-racking finish!" : "Every game builds your legacy."}
              </p>
            </div>
          </div>

          {/* Story Card 4: Comeback Moments */}
          <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-purple-500/25 dark:via-transparent dark:to-purple-500/10 shadow-xs hover:-translate-y-0.5 transition-transform duration-300">
            <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 space-y-2.5 border border-stone-200/60 dark:border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-500" />
                    COMEBACK MOMENTS
                  </span>
                  <span className="text-[9px] font-black bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 px-2 py-0.5 rounded-full uppercase">
                    RESILIENT
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mt-2">
                  <CountUp end={recoveries} duration={1.2} /> recoveries
                </div>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium leading-snug">
                Turned the tide after reconnecting or tough spots.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: 4 Stats Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Games Played */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/25 dark:via-transparent dark:to-amber-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10 group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/40 dark:border-amber-800/40">
                Played
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 block truncate">
                Games Played
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white leading-tight tracking-tight my-1">
                <CountUp end={totalMatches} duration={1.2} />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-slate-500 font-medium">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats?.wins || 0}W</span>
                <span>•</span>
                <span className="text-rose-500 dark:text-rose-400 font-semibold">{stats?.losses || 0}L</span>
                <span>•</span>
                <span className="text-amber-500 dark:text-amber-400 font-semibold">{stats?.draws || 0}D</span>
              </div>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-emerald-500/25 dark:via-transparent dark:to-emerald-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10 group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/40 dark:border-emerald-800/40">
                Win Rate
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 block truncate">
                Win Percentage
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-tight tracking-tight my-1">
                <CountUp end={stats?.winRate || 0} suffix="%" duration={1.2} />
              </div>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block truncate">
                {stats?.wins || 0} total victories
              </span>
            </div>
          </div>
        </div>

        {/* Current Run */}
        <div className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-orange-500/25 dark:via-transparent dark:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5">
          <div className="h-full bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-stone-200/60 dark:border-white/5 transition">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/10 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-200/40 dark:border-orange-800/40">
                Streak
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 block truncate">
                Current Run
              </span>
              <div className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 leading-tight tracking-tight my-1">
                <CountUp end={stats?.currentWinStreak || 0} duration={1.2} />
              </div>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block truncate">
                Best streak: {bestStreak} in a row
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
                Duration
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 block truncate">
                Total Play Time
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 leading-tight tracking-tight my-1">
                <CountUp end={stats?.totalPlayTimeMinutes || 0} duration={1.2} separator="," />{" "}
                <span className="text-xs font-bold text-stone-400 dark:text-slate-400">min</span>
              </div>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium block truncate">
                Avg {stats?.averageMatchMinutes || 0} min / game
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Game Breakdown & Memories ── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <span className="text-amber-500">🎮</span>
          <span>Game Breakdown & Memories</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_BREAKDOWNS.map((item) => {
            const gameStats = stats?.perGame?.[item.game];
            const matches = gameStats?.matchesPlayed || 0;
            const wins = gameStats?.wins || 0;
            const winRate = gameStats?.winRate || 0;

            return (
              <div
                key={item.game}
                className="group relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-stone-700/30 dark:via-transparent dark:to-stone-800/20 shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all duration-300"
              >
                <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 space-y-3.5 border border-stone-200/60 dark:border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 shadow-xs border border-stone-200/80 dark:border-slate-700 group-hover:scale-105 transition-transform">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-stone-900 dark:text-white truncate">
                          {item.label}
                        </h3>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium truncate">
                          {item.tagline}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                      {winRate}% Win
                    </span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full h-1.5 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200/60 dark:border-white/5 text-center">
                    <div>
                      <span className="text-[9px] font-black text-stone-400 dark:text-slate-400 block uppercase tracking-wider">
                        WINS
                      </span>
                      <span className="text-xs font-bold text-stone-900 dark:text-white">
                        {wins}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-stone-400 dark:text-slate-400 block uppercase tracking-wider">
                        MATCHES
                      </span>
                      <span className="text-xs font-bold text-stone-900 dark:text-white">
                        {matches}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-stone-400 dark:text-slate-400 block uppercase tracking-wider truncate">
                        {item.specialStat}
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {wins > 0 ? wins * 2 : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Games Action */}
        <Link
          to="/games"
          className="w-full py-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-[#FFFBEB] dark:bg-amber-950/20 rounded-2xl border border-[#FDE68A] dark:border-amber-900/40 hover:bg-[#FEF3C7] transition cursor-pointer"
        >
          <span>View All Games</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#D97706]" />
        </Link>
      </div>

      {/* ── Section 4: Your Game Journey & Play Style ── */}
      {stats && <CareerMetrics stats={stats} />}

      {/* ── Section 5: Middle Row (Recent Activity + Achievements) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs self-start">
          <div className="flex items-center gap-2">
            <span className="text-purple-600">⭐</span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Recent Activity
            </h3>
          </div>
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-400 flex items-center justify-center mx-auto mb-2 opacity-80">
              <Gamepad2 className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              No recent matches yet
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Start playing games to see your activity here!
            </p>
            <div className="pt-2">
              <Link
                to="/games"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition shadow-sm"
              >
                Play a Game
              </Link>
            </div>
          </div>
        </div>

        {/* Achievements Card */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs self-start">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Achievements ({unlockedCount}/25)
              </h3>
            </div>
            <Link
              to="/profile/achievements"
              className="text-xs font-bold text-[#EA580C] hover:underline"
            >
              All 25 badges →
            </Link>
          </div>

          <div className="space-y-3">
            {recentAchievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] rounded-2xl p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                      {ach.id.includes("streak") ? (
                        <Flame className="w-4 h-4 text-amber-500" />
                      ) : ach.id.includes("win") ? (
                        <Trophy className="w-4 h-4 text-amber-500" />
                      ) : (
                        <span className="text-sm">🎲</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {ach.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                    {ach.currentProgress} / {ach.targetValue}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                      style={{ width: `${ach.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                    {ach.progressPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1">
            <Link
              to="/profile/achievements"
              className="w-full py-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition"
            >
              <span>View All Achievements</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section 6: Bottom Row (Favorite Games + Personalize Your Lounge) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Favorite Games */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs self-start">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Favorite Games
              </h3>
            </div>
            <Link
              to="/favorites"
              className="text-xs font-bold text-[#6D28D9] hover:underline"
            >
              View all →
            </Link>
          </div>
          {stats && <FavoriteGames stats={stats} />}
        </div>

        {/* Personalize Your Lounge Card */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs self-start">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Personalize Your Lounge</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Make your profile truly yours.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {/* Change Avatar */}
            <button
              onClick={openAvatarModal}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0">
                  <Smile className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Change Avatar
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Upload your favorite picture
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Update Bio */}
            <button
              onClick={openEditModal}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#9333EA] border border-[#F3E8FF] flex items-center justify-center shrink-0">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Update Bio
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Tell others about your 90s game memories
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Privacy & Transparency */}
            <Link
              to="/privacy"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Privacy & Transparency
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Control your data and visibility
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  DPDP Act
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Download My Data */}
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#252D4A] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Download My Data
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Export your data in JSON format
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  JSON
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 7: Bottom Banner (Level up your childhood memories) ── */}
      <div className="relative rounded-3xl p-0.5 bg-gradient-to-r from-amber-500/30 via-orange-500/20 to-purple-500/30 shadow-md">
        <div className="rounded-[22px] p-6 sm:p-7 bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 dark:from-[#0b101e] dark:via-[#11192e] dark:to-[#070c16] border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-5 text-white">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-lg text-2xl font-black">
              🏆
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                Level up your childhood memories
              </h3>
              <p className="text-xs text-stone-300 dark:text-slate-300 mt-0.5">
                Join high-stakes tournaments, challenge lounge veterans, and claim golden trophies!
              </p>
            </div>
          </div>

          <Link
            to="/tournaments"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <span>Explore Tournaments</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
