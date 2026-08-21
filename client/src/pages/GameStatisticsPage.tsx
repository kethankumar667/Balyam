import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Trophy, Flame, Clock, Gamepad2, ArrowRight, Sparkles, Shield, Heart, Zap } from "lucide-react";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import ProfileLayout from "../components/layout/ProfileLayout";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import CountUp from "../components/CountUp";
import { ProfileSkeleton } from "../design-system/dls";
import CareerMetrics from "../features/profile/CareerMetrics";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";

interface GameBreakdown {
  game: string;
  label: string;
  icon: string;
  tagline: string;
  played: number;
  wins: number;
  winRate: number;
  specialStat: string;
  specialValue: string;
}

const GAME_BREAKDOWNS: GameBreakdown[] = [
  { game: "ludo", label: "Ludo Lounge", icon: "🎲", tagline: "Roll, capture & race home", played: 0, wins: 0, winRate: 0, specialStat: "Tokens Home", specialValue: "0" },
  { game: "rummy", label: "Classic Rummy", icon: "🎴", tagline: "Pure sequences & neat melds", played: 0, wins: 0, winRate: 0, specialStat: "Pure Runs", specialValue: "0" },
  { game: "handcricket", label: "Hand Cricket", icon: "🏏", tagline: "Childhood finger-cricket thrill", played: 0, wins: 0, winRate: 0, specialStat: "Best Runs", specialValue: "0" },
  { game: "uno", label: "UNO Blast", icon: "🃏", tagline: "Reverse, draw four & shout UNO", played: 0, wins: 0, winRate: 0, specialStat: "Wild Plays", specialValue: "0" },
  { game: "snl", label: "Snakes & Ladders", icon: "🐍", tagline: "Climb ladders, dodge the snakes", played: 0, wins: 0, winRate: 0, specialStat: "Ladders Climbed", specialValue: "0" },
  { game: "dotsboxes", label: "Dots & Boxes", icon: "⏹", tagline: "Corner the grid and own boxes", played: 0, wins: 0, winRate: 0, specialStat: "Boxes Captured", specialValue: "0" },
];

export default function GameStatisticsPage() {
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  if (!isMember) {
    return <MemberLockedGate feature="profile" />;
  }

  useEffect(() => {
    if (!identityReady || !effectivePlayerId) return;

    async function fetchData() {
      try {
        const [profRes, statsRes] = await Promise.all([
          apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (profRes?.profile) {
          setProfile(profRes.profile);
        } else {
          setProfile({
            playerId: effectivePlayerId ?? "",
            displayName: currentName || "Member",
            avatar: currentAvatar || undefined,
            joinedAt: Date.now() - 86400000 * 30,
            lastSeenAt: Date.now(),
            level: 1,
            experiencePoints: 0,
          });
        }

        if (statsRes?.stats) {
          setStats(statsRes.stats);
        }
      } catch (err) {
        console.warn("Could not load stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [identityReady, effectivePlayerId]);

  if (loading || !profile) {
    return (
      <ProfileLayout profile={null}>
        <ProfileSkeleton />
      </ProfileLayout>
    );
  }

  // Derive human storytelling insights
  const totalMatches = stats?.totalMatches || 0;
  const signatureGame = stats?.favoriteGame && stats.favoriteGame !== "none"
    ? stats.favoriteGame
    : (totalMatches > 0 ? "Ludo" : undefined);

  const longestMatch = stats?.longestMatchMinutes || 0;
  const bestStreak = stats?.bestWinStreak || 0;
  const recoveries = stats?.recoveryCount || 0;

  return (
    <ProfileLayout
      profile={profile}
      isMember={isMember}
      name={currentName}
      avatar={currentAvatar}
      favoriteGame={signatureGame}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--auth-card-edge)] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--auth-ink)] flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-500" />
              <span>How Do I Play? — Gaming Story</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--auth-ink-soft)] font-medium mt-0.5">
              Your signature style, memorable streaks, game records, and childhood lounge tales
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/profile/matches"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--auth-field)] border border-[var(--auth-field-edge)] text-[var(--auth-ink)] hover:border-amber-500 transition shadow-2xs"
            >
              <span>View Match Logs</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
            </Link>
          </div>
        </div>

        {/* ── Section 1: Storytelling Highlights (Story First, Numbers Second) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Story Card 1: Your Best Run */}
          <div className="bg-gradient-to-br from-amber-500/10 via-[var(--auth-card)] to-[var(--auth-card)] border border-amber-500/30 rounded-3xl p-5 space-y-2 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500" />
                Your Best Run
              </span>
              <span className="text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                HOT STREAK
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--auth-ink)]">
              {bestStreak > 0 ? (
                <span><CountUp end={bestStreak} duration={1.2} /> in a row</span>
              ) : (
                <span className="text-base text-[var(--auth-ink-soft)] font-sans font-bold">Ready for streak</span>
              )}
            </div>
            <p className="text-xs text-[var(--auth-ink-soft)] font-medium">
              {bestStreak > 0 ? "Unstoppable momentum across lounge rooms!" : "Your first streak starts with your first win."}
            </p>
          </div>

          {/* Story Card 2: Your Signature Game */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-[var(--auth-card)] to-[var(--auth-card)] border border-emerald-500/30 rounded-3xl p-5 space-y-2 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-emerald-500" />
                Signature Game
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase">
                FAVORITE
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--auth-ink)] capitalize truncate">
              {signatureGame || "Not discovered yet"}
            </div>
            <p className="text-xs text-[var(--auth-ink-soft)] font-medium">
              {totalMatches > 0 ? `${totalMatches} total match appearances` : "Play a few games to discover your signature table."}
            </p>
          </div>

          {/* Story Card 3: Your Longest Battle */}
          <div className="bg-gradient-to-br from-sky-500/10 via-[var(--auth-card)] to-[var(--auth-card)] border border-sky-500/30 rounded-3xl p-5 space-y-2 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-500" />
                Longest Battle
              </span>
              <span className="text-[10px] font-mono bg-sky-500/15 text-sky-600 dark:text-sky-300 font-bold px-2 py-0.5 rounded-full">
                TENACITY
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--auth-ink)]">
              {longestMatch > 0 ? (
                <span><CountUp end={longestMatch} duration={1.5} /> <span className="text-xs font-normal text-[var(--auth-ink-soft)]">min</span></span>
              ) : (
                <span className="text-lg text-[var(--auth-ink-soft)]">First round soon</span>
              )}
            </div>
            <p className="text-xs text-[var(--auth-ink-soft)] font-medium">
              {longestMatch > 15 ? "True endurance in a nerve-racking finish!" : "Every game builds your legacy."}
            </p>
          </div>

          {/* Story Card 4: Comeback Victories */}
          <div className="bg-gradient-to-br from-purple-500/10 via-[var(--auth-card)] to-[var(--auth-card)] border border-purple-500/30 rounded-3xl p-5 space-y-2 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-500" />
                Comeback Moments
              </span>
              <span className="text-[10px] font-mono bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                RESILIENT
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--auth-ink)]">
              <span><CountUp end={recoveries} duration={1.2} /> recoveries</span>
            </div>
            <p className="text-xs text-[var(--auth-ink-soft)] font-medium">
              Turned the tide after reconnecting or tough spots.
            </p>
          </div>
        </div>

        {/* ── Section 2: Overall Performance Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-amber-500" />
              Games Played
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--auth-ink)] my-2">
              <CountUp end={stats?.totalMatches || 0} duration={1.5} />
            </div>
            <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
              {stats?.wins || 0}W • {stats?.losses || 0}L • {stats?.draws || 0}D
            </span>
          </div>

          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-emerald-500" />
              Win Rate
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-500 my-2">
              <CountUp end={stats?.winRate || 0} suffix="%" duration={1.5} />
            </div>
            <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
              {stats?.wins || 0} total victories
            </span>
          </div>

          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Current Run
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500 my-2">
              <CountUp end={stats?.currentWinStreak || 0} duration={1.2} />
            </div>
            <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
              Best streak: {stats?.bestWinStreak || 0} in a row
            </span>
          </div>

          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-bold text-[var(--auth-ink-soft)] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Total Play Time
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500 my-2">
              <CountUp end={stats?.totalPlayTimeMinutes || 0} duration={1.5} /> <span className="text-xs font-normal text-[var(--auth-ink-soft)]">min</span>
            </div>
            <span className="text-[11px] text-[var(--auth-ink-soft)] font-mono font-medium">
              Avg {stats?.averageMatchMinutes || 0} min / game
            </span>
          </div>
        </div>

        {/* ── Section 3: Game-by-Game Breakdown Cards ── */}
        <div className="space-y-3">
          <h2 className="text-base font-extrabold text-[var(--auth-ink)] flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-amber-500" />
            <span>Game Breakdown & Memories</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAME_BREAKDOWNS.map((item) => (
              <div
                key={item.game}
                className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 space-y-3 shadow-xs hover:border-amber-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h3 className="font-extrabold text-sm text-[var(--auth-ink)]">{item.label}</h3>
                      <p className="text-[11px] text-[var(--auth-ink-soft)] font-medium">
                        {item.tagline}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {item.winRate}% Win
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--auth-card-edge)] text-center text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase">Wins</span>
                    <span className="font-black text-[var(--auth-ink)]">{item.wins}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase">Matches</span>
                    <span className="font-black text-[var(--auth-ink)]">{item.played}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase">{item.specialStat}</span>
                    <span className="font-black text-amber-600 dark:text-amber-400">{item.specialValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 4: Playing Journey & Highlights ── */}
        {stats && <CareerMetrics stats={stats} />}
      </div>
    </ProfileLayout>
  );
}
