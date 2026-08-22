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
          <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#EA580C] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#EA580C]" />
                YOUR BEST RUN
              </span>
              <span className="text-[9px] font-black bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] px-2 py-0.5 rounded-full uppercase">
                HOT STREAK
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {bestStreak > 0 ? (
                <span><CountUp end={bestStreak} duration={1.2} /> in a row</span>
              ) : (
                "Ready for streak"
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium leading-snug">
              {bestStreak > 0 ? "Unstoppable momentum across lounge rooms!" : "Your first streak starts with your first win."}
            </p>
          </div>

          {/* Story Card 2: Signature Game */}
          <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#16A34A] uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-[#16A34A]" />
                SIGNATURE GAME
              </span>
              <span className="text-[9px] font-black bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] px-2 py-0.5 rounded-full uppercase">
                FAVORITE
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white capitalize truncate">
              {signatureGame || "Not Discovered Yet"}
            </div>
            <p className="text-xs text-slate-400 font-medium leading-snug">
              {totalMatches > 0 ? `${totalMatches} total match appearances` : "Play a few games to discover your signature table."}
            </p>
          </div>

          {/* Story Card 3: Longest Battle */}
          <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#0891B2] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0891B2]" />
                LONGEST BATTLE
              </span>
              <span className="text-[9px] font-black bg-[#ECFEFF] text-[#0891B2] border border-[#CFFAFE] px-2 py-0.5 rounded-full uppercase">
                TENACITY
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {longestMatch > 0 ? (
                <span><CountUp end={longestMatch} duration={1.5} /> min</span>
              ) : (
                "First round soon"
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium leading-snug">
              {longestMatch > 15 ? "True endurance in a nerve-racking finish!" : "Every game builds your legacy."}
            </p>
          </div>

          {/* Story Card 4: Comeback Moments */}
          <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#9333EA] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#9333EA]" />
                COMEBACK MOMENTS
              </span>
              <span className="text-[9px] font-black bg-[#FAF5FF] text-[#9333EA] border border-[#F3E8FF] px-2 py-0.5 rounded-full uppercase">
                RESILIENT
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              <CountUp end={recoveries} duration={1.2} /> recoveries
            </div>
            <p className="text-xs text-slate-400 font-medium leading-snug">
              Turned the tide after reconnecting or tough spots.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: 4 Stats Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Games Played */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0 shadow-2xs">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              GAMES PLAYED
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight my-0.5">
              <CountUp end={totalMatches} duration={1.2} />
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate">
              {stats?.wins || 0}W • {stats?.losses || 0}L • {stats?.draws || 0}D
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] flex items-center justify-center shrink-0 shadow-2xs">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              WIN RATE
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#16A34A] leading-tight my-0.5">
              <CountUp end={stats?.winRate || 0} suffix="%" duration={1.2} />
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate">
              {stats?.wins || 0} total victories
            </span>
          </div>
        </div>

        {/* Current Run */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] flex items-center justify-center shrink-0 shadow-2xs">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              CURRENT RUN
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#EA580C] leading-tight my-0.5">
              <CountUp end={stats?.currentWinStreak || 0} duration={1.2} />
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate">
              Best streak: {bestStreak} in a row
            </span>
          </div>
        </div>

        {/* Total Play Time */}
        <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
              TOTAL PLAY TIME
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#EA580C] leading-tight my-0.5">
              <CountUp end={stats?.totalPlayTimeMinutes || 0} duration={1.2} separator="," />{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">min</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate">
              Avg {stats?.averageMatchMinutes || 0} min / game
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Game Breakdown & Memories ── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
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
                className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-3.5 shadow-xs hover:border-amber-500/40 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 shadow-2xs border border-[#F3EFE9] dark:border-[#252D4A]">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {item.label}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {item.tagline}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-[#16A34A] bg-[#F0FDF4] dark:bg-[#16A34A]/10 px-2 py-0.5 rounded-md border border-[#DCFCE7] dark:border-[#16A34A]/30 shrink-0">
                    {winRate}% Win
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#F3EFE9] dark:border-[#202740] text-center">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                      WINS
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {wins}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                      MATCHES
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {matches}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider truncate">
                      {item.specialStat}
                    </span>
                    <span className="text-xs font-black text-[#EA580C]">
                      0
                    </span>
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
      <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-[#EDE9FE] via-[#F3E8FF] to-[#EDE9FE] dark:from-[#261E47] dark:via-[#1E1738] dark:to-[#261E47] border border-[#DDD6FE] dark:border-[#3D3168] flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#2F2656] text-amber-500 flex items-center justify-center shrink-0 shadow-md text-2xl">
            🏆
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              Level up your childhood memories
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Join tournaments, challenge players, and win amazing rewards!
            </p>
          </div>
        </div>

        <Link
          to="/tournaments"
          className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold shadow-md transition whitespace-nowrap"
        >
          <span>Explore Tournaments</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
