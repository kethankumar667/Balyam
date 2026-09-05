import React from "react";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import SeatAvatar from "../../components/profile/SeatAvatar";
import CountUp from "../../components/CountUp";
import { BarChart2, Star, Trophy } from "lucide-react";
import { useIdentityPresentation } from "../../store/authStore";

interface ProfileHeaderProps {
  profile: PlayerProfile;
  isMember?: boolean;
  onEditName?: () => void;
  name?: string;
  avatar?: string | null;
  compact?: boolean;
  favoriteGame?: string;
  badgeLabel?: string;
}

export default function ProfileHeader({
  profile,
  isMember = false,
  onEditName,
  name,
  avatar,
  compact = false,
  favoriteGame,
  badgeLabel,
}: ProfileHeaderProps) {
  const identity = useIdentityPresentation();
  const memberDate = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const nextLevelXp = profile.level * 100;
  const currentLevelXp = (profile.level - 1) * 100;
  const progressInLevel = Math.max(0, profile.experiencePoints - currentLevelXp);
  const progressPct = Math.min(100, Math.round((progressInLevel / 100) * 100));
  const effectiveName =
    (name ?? profile.displayName ?? "").trim() ||
    (identity.isLocalFallback
      ? "Offline Demo Mode"
      : identity.isVerifiedMember || isMember
        ? "Member"
        : identity.label);
  const membershipSubtitle = identity.isLocalFallback
    ? "Offline Demo Mode"
    : identity.isVerifiedMember || isMember
      ? `Member since ${memberDate}`
      : "Guest Player";
  const effectiveAvatar = avatar !== undefined ? avatar ?? undefined : profile.avatar;

  if (compact) {
    return (
      <div className="rounded-2xl p-3 sm:p-4 bg-gradient-to-r from-stone-900 via-neutral-900 to-stone-950 dark:from-[#0e1526] dark:via-[#121a30] dark:to-[#090e1a] border border-amber-500/25 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-0.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <div className="w-full h-full bg-stone-950 rounded-full overflow-hidden flex items-center justify-center">
                <SeatAvatar
                  avatar={effectiveAvatar}
                  name={effectiveName}
                  className="w-full h-full rounded-full"
                  textClassName="text-lg font-black"
                />
              </div>
            </div>
            {/* Presence Dot */}
            <span
              className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-stone-900 shadow-xs"
              title="Online in Lounge"
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-[8px] font-black font-mono px-1.5 py-0.2 rounded-md border border-stone-900 shadow">
              LVL {profile.level}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white truncate">
                {effectiveName}
              </h2>
              {onEditName && (
                <button
                  onClick={onEditName}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold transition underline font-mono px-0.5 cursor-pointer"
                  aria-label="Edit display name"
                >
                  Edit
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-400 font-mono">
              {membershipSubtitle} •{" "}
              <span className="text-amber-400 font-bold">{profile.experiencePoints} XP</span>
            </p>
          </div>
        </div>

        {/* Compact Level XP Bar */}
        <div className="w-full sm:w-48 space-y-1 shrink-0">
          <div className="flex justify-between text-[10px] font-mono text-stone-300">
            <span>Level {profile.level}</span>
            <span className="text-amber-400 font-bold">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 dark:from-[#0b101e] dark:via-[#11192e] dark:to-[#070c16] border border-amber-500/25 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Background Subtle Ambient Lighting */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Left: Avatar + Identity + XP Progress */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 w-full md:w-auto relative z-10">
        {/* Large Circular Avatar */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-stone-950 rounded-full overflow-hidden flex items-center justify-center select-none shadow-inner">
              <SeatAvatar
                avatar={effectiveAvatar}
                name={effectiveName}
                className="w-full h-full rounded-full"
                textClassName="text-3xl font-black text-white"
              />
            </div>
          </div>
          {/* Presence Dot on Avatar */}
          <span
            className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-stone-900 shadow-xs"
            title="Online in Lounge"
          />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-md border border-stone-900 shadow-md whitespace-nowrap">
            LVL {profile.level}
          </div>
        </div>

        {/* Identity & Level Info */}
        <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate max-w-[220px] sm:max-w-md">
              {effectiveName}
            </h1>
            <span className="text-stone-500 text-sm">·</span>
            {onEditName && (
              <button
                onClick={onEditName}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer hover:underline"
                aria-label="Edit display name"
              >
                Edit
              </button>
            )}
            <span className="text-stone-500 text-sm">·</span>
            <span className="text-xs text-stone-300 font-mono bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
              {membershipSubtitle}
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full max-w-md mx-auto sm:mx-0 pt-0.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-300 font-mono w-full">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 whitespace-nowrap">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <CountUp end={profile.experiencePoints} duration={1.5} separator="," /> Lifetime XP
              </span>
              <span className="text-stone-400 whitespace-nowrap text-xs">
                Next: {nextLevelXp} XP
              </span>
            </div>
            <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner w-full">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Favorite Game Card (Overview) or Level/Progress Action (Personal) */}
      {favoriteGame !== undefined || badgeLabel !== undefined ? (
        <div className="flex flex-col items-center justify-center p-4 px-6 rounded-2xl bg-white/[0.05] border border-white/10 hover:border-amber-500/30 transition shrink-0 text-center min-w-[150px] shadow-sm relative z-10 backdrop-blur-xs">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2 shadow-xs">
            <Trophy className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 font-mono">
            {badgeLabel || "FAVORITE GAME"}
          </span>
          <span className="text-xs font-bold text-white capitalize mt-1 truncate max-w-[130px]">
            {favoriteGame && favoriteGame !== "none" ? favoriteGame : "Discovering..."}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center sm:items-end gap-3 shrink-0 relative z-10 w-full sm:w-auto">
          <div className="w-full sm:w-48 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white">Level {profile.level}</span>
              <span className="text-amber-400 font-black font-mono">{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10 w-full">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <a
            href="/profile/statistics"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span>View Statistics</span>
          </a>
        </div>
      )}
    </div>
  );
}
