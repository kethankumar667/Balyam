import { useEffect } from "react";
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
  Award,
} from "lucide-react";
import { useRoomStore } from "../store/roomStore";
import { useScorecardStore } from "../store/scorecardStore";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import CountUp from "../components/CountUp";
import CareerMetrics from "../features/profile/CareerMetrics";
import FavoriteGames from "../features/profile/FavoriteGames";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";

import type { GameKind } from "@shared/types";
import type { AllGameSlug } from "@shared/profile/Scorecard";
import { getGameMetricSchema } from "@shared/profile/MetricRegistry";
import { formatGameMetricValue } from "../lib/metricFormatters";

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
  { game: "connect4", label: "Connect 4", icon: "🟡", tagline: "Drop discs & connect four in a row", specialStat: "LINES CONNECTED" },
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

  const { profile, stats, achievements, recentMatches, isMember, openEditModal, openAvatarModal, effectivePlayerId } =
    useOutletContext<ProfileFamilyOutletContext>();

  const archive = useScorecardStore((s) => s.archive);
  const fetchScorecards = useScorecardStore((s) => s.fetchScorecards);

  useEffect(() => {
    if (effectivePlayerId && !archive) {
      fetchScorecards(effectivePlayerId);
    }
  }, [effectivePlayerId, archive, fetchScorecards]);

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
    <div className="space-y-6 sm:space-y-8">
      {/* ── Section 1: Page Header & Storytelling Highlights (Supercell Battle Stats HQ) ── */}
      <div className="relative rounded-3xl p-0.5 bg-linear-to-b from-amber-400/60 via-amber-600/30 to-amber-700/60 dark:from-amber-400/40 dark:via-amber-600/20 dark:to-amber-900/40 shadow-[0_8px_0_rgba(180,83,9,0.5)]">
        <div className="rounded-[22px] bg-linear-to-b from-[#FFFDF8] to-[#F7EEDD] dark:from-[#1A2238] dark:to-[#0F1626] p-5 sm:p-6 border border-amber-300/50 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-amber-950 font-black text-2xl shadow-[0_4px_0_rgba(180,83,9,0.9)] border-2 border-amber-200 shrink-0">
              <BarChart3 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  PLAYER TELEMETRY
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  REAL-TIME RECORD
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
                <span>Gaming Story &amp; Table Mastery</span>
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 font-medium mt-0.5">
                Signature style, longest marathons, unbroken streaks, and Miniclip-grade mastery logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/profile/matches"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider bg-linear-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all shadow-[0_4px_0_rgba(180,83,9,0.6)] cursor-pointer"
            >
              <span>View Match Logs</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Hero Story Cards (Supercell Battle Honor Medallions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Story Card 1: Your Best Run */}
        <div className="relative rounded-3xl p-0.5 bg-linear-to-b from-orange-400/80 via-orange-500/30 to-orange-700/80 shadow-[0_6px_0_rgba(194,65,12,0.6)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#FFFDF9] to-[#FFF3E6] dark:from-[#211818] dark:to-[#140E0E] rounded-[22px] p-5 space-y-3 border border-orange-300/40 dark:border-orange-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  </div>
                  YOUR BEST RUN
                </span>
                <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase shadow-xs">
                  HOT STREAK
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white mt-3 tracking-tight">
                {bestStreak > 0 ? (
                  <span className="text-orange-600 dark:text-orange-400">
                    <CountUp end={bestStreak} duration={1.2} /> in a row
                  </span>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500 text-lg">Ready for streak</span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-orange-200/60 dark:border-orange-900/30">
              <p className="text-xs text-stone-600 dark:text-orange-200/70 font-bold leading-snug">
                {bestStreak > 0 ? "Unstoppable momentum across lounge rooms!" : "Your first streak starts with your first win."}
              </p>
            </div>
          </div>
        </div>

        {/* Story Card 2: Signature Game */}
        <div className="relative rounded-3xl p-0.5 bg-linear-to-b from-emerald-400/80 via-emerald-500/30 to-emerald-700/80 shadow-[0_6px_0_rgba(4,120,87,0.6)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#F7FCF9] to-[#E9F7EF] dark:from-[#11221B] dark:to-[#0A1410] rounded-[22px] p-5 space-y-3 border border-emerald-300/40 dark:border-emerald-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Gamepad2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  SIGNATURE GAME
                </span>
                <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase shadow-xs">
                  FAVORITE
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white capitalize truncate mt-3 tracking-tight">
                {signatureGame ? (
                  <span className="text-emerald-600 dark:text-emerald-400">{signatureGame}</span>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500 text-lg">Discovering</span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/30">
              <p className="text-xs text-stone-600 dark:text-emerald-200/70 font-bold leading-snug">
                {totalMatches > 0 ? `${totalMatches} match appearances` : "Play games to discover your signature table."}
              </p>
            </div>
          </div>
        </div>

        {/* Story Card 3: Longest Battle */}
        <div className="relative rounded-3xl p-0.5 bg-linear-to-b from-cyan-400/80 via-cyan-500/30 to-cyan-700/80 shadow-[0_6px_0_rgba(14,116,144,0.6)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#F6FBFC] to-[#E5F5F8] dark:from-[#0E2028] dark:to-[#071217] rounded-[22px] p-5 space-y-3 border border-cyan-300/40 dark:border-cyan-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  LONGEST BATTLE
                </span>
                <span className="text-[9px] font-black bg-cyan-500 text-white px-2 py-0.5 rounded-full uppercase shadow-xs">
                  TENACITY
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white mt-3 tracking-tight">
                {longestMatch > 0 ? (
                  <span className="text-cyan-600 dark:text-cyan-400">
                    <CountUp end={longestMatch} duration={1.5} /> min
                  </span>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500 text-lg">First round soon</span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-cyan-200/60 dark:border-cyan-900/30">
              <p className="text-xs text-stone-600 dark:text-cyan-200/70 font-bold leading-snug">
                {longestMatch > 15 ? "True endurance in a nerve-racking finish!" : "Every game builds your lounge legacy."}
              </p>
            </div>
          </div>
        </div>

        {/* Story Card 4: Comeback Moments */}
        <div className="relative rounded-3xl p-0.5 bg-linear-to-b from-purple-400/80 via-purple-500/30 to-purple-700/80 shadow-[0_6px_0_rgba(126,34,206,0.6)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#FAF7FD] to-[#F1E8FB] dark:from-[#1D1429] dark:to-[#100A18] rounded-[22px] p-5 space-y-3 border border-purple-300/40 dark:border-purple-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  COMEBACK MOMENTS
                </span>
                <span className="text-[9px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full uppercase shadow-xs">
                  RESILIENT
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-3 tracking-tight">
                <CountUp end={recoveries} duration={1.2} /> recoveries
              </div>
            </div>
            <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/30">
              <p className="text-xs text-stone-600 dark:text-purple-200/70 font-bold leading-snug">
                Turned the tide after reconnecting or tough spots.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: 4 Core Telemetry Tiles (Supercell 3D Power Tiles) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Games Played */}
        <div className="group relative rounded-3xl p-0.5 bg-linear-to-b from-amber-400/70 via-amber-500/30 to-amber-700/70 shadow-[0_6px_0_rgba(180,83,9,0.7)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#FFFDF9] to-[#FBF2E3] dark:from-[#1E2538] dark:to-[#111728] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-amber-300/40 dark:border-amber-500/20">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-xs">
                <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                PLAYED
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-stone-500 dark:text-slate-400 block truncate uppercase tracking-wider">
                Games Played
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 leading-tight tracking-tight my-1">
                <CountUp end={totalMatches} duration={1.2} />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-black pt-1 border-t border-amber-200/50 dark:border-amber-900/30">
                <span className="text-emerald-600 dark:text-emerald-400">{stats?.wins || 0}W</span>
                <span className="text-stone-300 dark:text-stone-600">•</span>
                <span className="text-rose-500 dark:text-rose-400">{stats?.losses || 0}L</span>
                <span className="text-stone-300 dark:text-stone-600">•</span>
                <span className="text-amber-500 dark:text-amber-400">{stats?.draws || 0}D</span>
              </div>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="group relative rounded-3xl p-0.5 bg-linear-to-b from-emerald-400/70 via-emerald-500/30 to-emerald-700/70 shadow-[0_6px_0_rgba(4,120,87,0.7)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#F7FCF9] to-[#E8F8EE] dark:from-[#11241C] dark:to-[#091510] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-emerald-300/40 dark:border-emerald-500/20">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-xs">
                <Target className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ACCURACY
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-stone-500 dark:text-slate-400 block truncate uppercase tracking-wider">
                Win Percentage
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-tight tracking-tight my-1">
                <CountUp end={stats?.winRate || 0} suffix="%" duration={1.2} />
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300/80 block truncate pt-1 border-t border-emerald-200/50 dark:border-emerald-900/30">
                {stats?.wins || 0} total victories
              </span>
            </div>
          </div>
        </div>

        {/* Current Run */}
        <div className="group relative rounded-3xl p-0.5 bg-linear-to-b from-orange-400/70 via-orange-500/30 to-orange-700/70 shadow-[0_6px_0_rgba(194,65,12,0.7)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#FFFDF9] to-[#FCEFE6] dark:from-[#261814] dark:to-[#170E0B] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-orange-300/40 dark:border-orange-500/20">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40 flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-full border border-orange-500/30">
                MOMENTUM
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-stone-500 dark:text-slate-400 block truncate uppercase tracking-wider">
                Current Run
              </span>
              <div className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 leading-tight tracking-tight my-1">
                <CountUp end={stats?.currentWinStreak || 0} duration={1.2} />
              </div>
              <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300/80 block truncate pt-1 border-t border-orange-200/50 dark:border-orange-900/30">
                Best streak: {bestStreak} in a row
              </span>
            </div>
          </div>
        </div>

        {/* Total Play Time */}
        <div className="group relative rounded-3xl p-0.5 bg-linear-to-b from-amber-400/70 via-amber-500/30 to-amber-700/70 shadow-[0_6px_0_rgba(180,83,9,0.7)] hover:-translate-y-1 transition-all duration-200">
          <div className="h-full bg-linear-to-b from-[#FFFDF8] to-[#F8EFE0] dark:from-[#211E16] dark:to-[#13110C] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between border border-amber-300/40 dark:border-amber-500/20">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                DURATION
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-stone-500 dark:text-slate-400 block truncate uppercase tracking-wider">
                Total Play Time
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 leading-tight tracking-tight my-1">
                <CountUp end={stats?.totalPlayTimeMinutes || 0} duration={1.2} separator="," />{" "}
                <span className="text-xs font-bold text-stone-400 dark:text-slate-400">min</span>
              </div>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300/80 block truncate pt-1 border-t border-amber-200/50 dark:border-amber-900/30">
                Avg {stats?.averageMatchMinutes || 0} min / game
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Game Breakdown & Memories (Miniclip 8 Ball Pool Table Mastery) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-amber-950 font-black shadow-[0_3px_0_rgba(180,83,9,0.8)] border border-amber-300">
              🎮
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Table Mastery &amp; Nostalgic Records</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                Miniclip-grade cue &amp; table records across all 7 traditional lounge disciplines
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-block text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
            7 GAMES TRACKED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_BREAKDOWNS.map((item) => {
            const gameStats = stats?.perGame?.[item.game];
            const matches = gameStats?.matchesPlayed || 0;
            const wins = gameStats?.wins || 0;
            const winRate = gameStats?.winRate || 0;

            const gameSchema = getGameMetricSchema(item.game);
            const gameCard = archive?.games?.[item.game as AllGameSlug];
            const bestScore = gameCard ? Object.values(gameCard.modes)[0]?.bestScore : undefined;
            const secondaryRecord = gameCard ? Object.values(gameCard.modes)[0]?.secondaryMetrics : undefined;

            // Signature metric calculation: use real game-specific metric if available, otherwise format best score or win count
            const metricDef = gameSchema.secondaryMetrics[0] || gameSchema.primaryRankMetric;
            const metricVal = secondaryRecord?.[metricDef.key] ?? bestScore;
            const formattedMetric = metricVal != null
              ? formatGameMetricValue(metricVal, metricDef.format)
              : wins > 0
              ? `${wins}`
              : "-";
            const statTitle = metricDef.shortLabel || metricDef.label || item.specialStat;

            return (
              <div
                key={item.game}
                className="group relative rounded-3xl p-0.5 bg-linear-to-b from-stone-300 via-stone-400/40 to-stone-500/70 dark:from-slate-700 dark:via-slate-800/40 dark:to-slate-950 shadow-[0_6px_0_rgba(15,23,42,0.8)] hover:-translate-y-1 transition-all duration-200"
              >
                <div className="bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] rounded-[22px] p-5 space-y-4 border border-stone-200/80 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl shrink-0 shadow-[0_4px_0_rgba(180,83,9,0.8)] border-2 border-amber-200 group-hover:scale-105 transition-transform">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm text-stone-900 dark:text-white truncate tracking-tight">
                          {item.label}
                        </h3>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 font-bold truncate">
                          {item.tagline}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-black text-emerald-950 bg-linear-to-b from-emerald-400 to-emerald-500 px-3 py-1 rounded-full border-b-2 border-emerald-700 shadow-xs shrink-0 uppercase tracking-wider">
                      {winRate}% WIN
                    </span>
                  </div>

                  {/* Thick Miniclip XP Capsule Bar with Gloss */}
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-stone-200 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-stone-300/80 dark:border-slate-800">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 via-amber-400 to-amber-500 rounded-full transition-all duration-500 shadow-xs"
                        style={{ width: `${Math.max(winRate, 3)}%` }}
                      />
                    </div>
                  </div>

                  {/* 3-Column Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-stone-200/80 dark:border-white/10 text-center">
                    <div className="bg-stone-100/70 dark:bg-slate-900/60 p-2 rounded-xl border border-stone-200/50 dark:border-white/5">
                      <span className="text-[9px] font-black text-stone-500 dark:text-slate-400 block uppercase tracking-wider">
                        WINS
                      </span>
                      <span className="text-xs font-black text-stone-900 dark:text-white">
                        {wins}
                      </span>
                    </div>
                    <div className="bg-stone-100/70 dark:bg-slate-900/60 p-2 rounded-xl border border-stone-200/50 dark:border-white/5">
                      <span className="text-[9px] font-black text-stone-500 dark:text-slate-400 block uppercase tracking-wider">
                        MATCHES
                      </span>
                      <span className="text-xs font-black text-stone-900 dark:text-white">
                        {matches}
                      </span>
                    </div>
                    <div className="bg-amber-500/10 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
                      <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 block uppercase tracking-wider truncate" title={statTitle}>
                        {statTitle}
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {formattedMetric}
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
          className="w-full py-3.5 min-h-[44px] inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-stone-950 bg-linear-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 shadow-[0_4px_0_rgba(180,83,9,0.7)] transition-all cursor-pointer"
        >
          <span>Explore All 7 Lounge Games</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </Link>
      </div>

      {/* ── Section 4: Your Game Journey & Play Style (Supercell Career Telemetry) ── */}
      {stats && <CareerMetrics stats={stats} recentMatches={recentMatches} />}

      {/* ── Section 5: Middle Row (Recent Battles & Trophy Road) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Recent Activity (Supercell Battle Arena) */}
        <div className="h-full flex flex-col justify-between bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] border-2 border-stone-300 dark:border-slate-700/80 border-b-4 border-b-stone-400 dark:border-b-slate-900 rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_6px_0_rgba(15,23,42,0.8)]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/40">
                <span className="text-sm">⚡</span>
              </div>
              <h3 className="font-black text-sm text-stone-900 dark:text-white tracking-tight uppercase">
                Recent Lounge Battles
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 font-medium mt-1">
              Live records of your most recent multiplayer bouts and score triumphs.
            </p>
          </div>

          <div className="py-6 text-center space-y-3 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center mx-auto mb-2 shadow-[0_4px_0_rgba(180,83,9,0.8)] border-2 border-amber-200">
              <Gamepad2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h4 className="font-black text-sm text-stone-900 dark:text-white">
              {totalMatches > 0 ? "Battle log ready for review" : "Your lounge journey starts now"}
            </h4>
            <p className="text-xs text-stone-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed font-medium">
              {totalMatches > 0
                ? "Dive into deep telemetry, turn-by-turn scorecards, and opponent history."
                : "Challenge bots or invite friends to your favorite nostalgic tabletop games!"}
            </p>
          </div>

          <div className="pt-2">
            <Link
              to={totalMatches > 0 ? "/profile/matches" : "/games"}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-linear-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all shadow-[0_4px_0_rgba(180,83,9,0.7)] cursor-pointer"
            >
              <span>{totalMatches > 0 ? "Open Complete Battle Logs" : "Launch Quick Play"}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Achievements Card (Supercell Trophy Road Preview) */}
        <div className="h-full flex flex-col justify-between bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] border-2 border-stone-300 dark:border-slate-700/80 border-b-4 border-b-stone-400 dark:border-b-slate-900 rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_6px_0_rgba(15,23,42,0.8)]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center font-black shadow-xs border border-amber-300">
                  <Award className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="font-black text-sm text-stone-900 dark:text-white uppercase tracking-tight">
                  Trophy Road ({unlockedCount}/25)
                </h3>
              </div>
              <Link
                to="/profile/achievements"
                className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline p-1 cursor-pointer min-h-[44px] inline-flex items-center"
              >
                All 25 badges →
              </Link>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 font-medium mt-1">
              Milestones and trophies earned across your gaming journey.
            </p>
          </div>

          <div className="space-y-3 my-2">
            {recentAchievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-white/80 dark:bg-slate-900/80 border-2 border-stone-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 border border-amber-300 shadow-[0_2px_0_rgba(180,83,9,0.8)] font-black">
                      {ach.id.includes("streak") ? (
                        <Flame className="w-4 h-4 text-stone-950 fill-stone-950" />
                      ) : ach.id.includes("win") ? (
                        <Trophy className="w-4 h-4 text-stone-950" />
                      ) : (
                        <span className="text-sm">🎲</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-stone-900 dark:text-white">
                        {ach.title}
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium leading-snug">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-black text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                    {ach.currentProgress} / {ach.targetValue}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-2 bg-stone-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-linear-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300 shadow-xs"
                      style={{ width: `${ach.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-black text-stone-600 dark:text-slate-400 shrink-0">
                    {ach.progressPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              to="/profile/achievements"
              className="w-full py-3 min-h-[44px] inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl border-b-4 border-stone-300 dark:border-slate-900 active:border-b-0 active:translate-y-1 transition shadow-xs cursor-pointer"
            >
              <span>View All 25 Achievements</span>
              <ArrowRight className="w-4 h-4 text-amber-500 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section 6: Bottom Row (Favorite Games + Personalize Your Lounge) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Favorite Games */}
        <div className="h-full flex flex-col justify-between bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] border-2 border-stone-300 dark:border-slate-700/80 border-b-4 border-b-stone-400 dark:border-b-slate-900 rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_6px_0_rgba(15,23,42,0.8)]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/40">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <h3 className="font-black text-sm text-stone-900 dark:text-white uppercase tracking-tight">
                  Favorite Games
                </h3>
              </div>
              <Link
                to="/favorites"
                className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline p-1 cursor-pointer min-h-[44px] inline-flex items-center"
              >
                View all →
              </Link>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 font-medium mt-1">
              Your most frequented gaming lounges and table records.
            </p>
          </div>
          {stats && <FavoriteGames stats={stats} />}
        </div>

        {/* Personalize Your Lounge Card */}
        <div className="h-full flex flex-col justify-between bg-linear-to-b from-[#FFFDF9] to-[#F7EDE0] dark:from-[#172033] dark:to-[#0D1322] border-2 border-stone-300 dark:border-slate-700/80 border-b-4 border-b-stone-400 dark:border-b-slate-900 rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_6px_0_rgba(15,23,42,0.8)]">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200/80 dark:border-white/10">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/40">
                <Award className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-sm text-stone-900 dark:text-white uppercase tracking-tight">
                Personalize Your Lounge
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 font-medium mt-1">
              Customize your identity and manage your game data.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {/* Change Avatar */}
            <button
              onClick={openAvatarModal}
              className="w-full min-h-[44px] flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border-2 border-stone-200 dark:border-slate-800 border-b-4 border-b-stone-300 dark:border-b-slate-950 active:border-b-0 active:translate-y-1 transition text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Smile className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-stone-900 dark:text-white">
                    Change Avatar
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium">
                    Switch your persona in the avatar gallery
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Update Bio */}
            <button
              onClick={openEditModal}
              className="w-full min-h-[44px] flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border-2 border-stone-200 dark:border-slate-800 border-b-4 border-b-stone-300 dark:border-b-slate-950 active:border-b-0 active:translate-y-1 transition text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <FileEdit className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-stone-900 dark:text-white">
                    Update Bio
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium">
                    Tell others about your 90s game memories
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Privacy & Transparency */}
            <Link
              to="/privacy"
              className="w-full min-h-[44px] flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border-2 border-stone-200 dark:border-slate-800 border-b-4 border-b-stone-300 dark:border-b-slate-950 active:border-b-0 active:translate-y-1 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-stone-900 dark:text-white">
                    Privacy &amp; Transparency
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium">
                    Control your data and visibility
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-stone-600 dark:text-slate-300 bg-stone-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  DPDP Act
                </span>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Download My Data */}
            <button
              onClick={handleExportData}
              className="w-full min-h-[44px] flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border-2 border-stone-200 dark:border-slate-800 border-b-4 border-b-stone-300 dark:border-b-slate-950 active:border-b-0 active:translate-y-1 transition text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-stone-900 dark:text-white">
                    Download My Data
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium">
                    Export your data in JSON format
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-md">
                  JSON
                </span>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 7: Bottom Banner (Supercell Golden Championship Trophy) ── */}
      <div className="relative rounded-3xl p-0.5 bg-linear-to-r from-amber-400 via-amber-500 to-orange-500 shadow-[0_8px_0_rgba(180,83,9,0.7)]">
        <div className="rounded-[22px] p-6 sm:p-7 bg-linear-to-br from-stone-900 via-neutral-900 to-stone-950 dark:from-[#0b101e] dark:via-[#11192e] dark:to-[#070c16] border-2 border-amber-300/40 flex flex-col sm:flex-row items-center justify-between gap-5 text-white">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shrink-0 shadow-[0_4px_0_rgba(180,83,9,0.9)] border-2 border-amber-200 text-2xl font-black">
              🏆
            </div>
            <div>
              <h3 className="font-black text-base sm:text-xl text-white tracking-tight">
                Level Up Your Lounge Mastery
              </h3>
              <p className="text-xs sm:text-sm text-amber-100/80 mt-1 font-medium">
                Join high-stakes tournaments, challenge lounge veterans, and claim golden trophies!
              </p>
            </div>
          </div>

          <Link
            to="/tournaments"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-linear-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 shadow-[0_4px_0_rgba(180,83,9,0.8)] transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Explore Tournaments</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
