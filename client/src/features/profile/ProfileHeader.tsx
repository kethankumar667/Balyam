import React from "react";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import SeatAvatar from "../../components/profile/SeatAvatar";
import CountUp from "../../components/CountUp";
import { BarChart2, Star, Trophy } from "lucide-react";

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
  const memberDate = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const nextLevelXp = profile.level * 100;
  const currentLevelXp = (profile.level - 1) * 100;
  const progressInLevel = Math.max(0, profile.experiencePoints - currentLevelXp);
  const progressPct = Math.min(100, Math.round((progressInLevel / 100) * 100));
  const effectiveName = (name ?? profile.displayName ?? "").trim() || (isMember ? "Member" : "Guest");
  const effectiveAvatar = avatar !== undefined ? avatar ?? undefined : profile.avatar;

  if (compact) {
    return (
      <div className="rounded-2xl p-3 sm:p-3.5 bg-[#1B1531] border border-[#2D254C] text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-0.5 shadow-sm">
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
              className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1B1531] shadow-xs"
              title="Online in Lounge"
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-zinc-950 text-[8px] font-black font-mono px-1.5 py-0.1 rounded-md border border-stone-900 shadow">
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
              {isMember ? `Member since ${memberDate}` : "Guest Player"} •{" "}
              <span className="text-amber-400 font-bold">{profile.experiencePoints} XP</span>
            </p>
          </div>
        </div>

        {/* Compact Level XP Bar */}
        <div className="w-full sm:w-44 space-y-0.5 shrink-0">
          <div className="flex justify-between text-[10px] font-mono text-stone-400">
            <span>Level {profile.level}</span>
            <span className="text-amber-400 font-bold">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-[#120D23] rounded-full overflow-hidden border border-[#2A2147]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6 sm:p-7 bg-[#1C1635] border border-[#2E264F] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Background Decorative Radial Gradient */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Left: Avatar + Identity + XP Progress */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 w-full md:w-auto relative z-10">
        {/* Large Circular Avatar */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-gradient-to-br from-amber-700 to-amber-900 rounded-full overflow-hidden flex items-center justify-center select-none shadow-inner">
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
            className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#1C1635] shadow-xs"
            title="Online in Lounge"
          />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#FBBF24] text-stone-950 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-md border border-stone-900 shadow-md whitespace-nowrap">
            LVL {profile.level}
          </div>
        </div>

        {/* Identity & Level Info */}
        <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate max-w-[200px] sm:max-w-md">
              {effectiveName}
            </h1>
            <span className="text-slate-500 text-sm">·</span>
            {onEditName && (
              <button
                onClick={onEditName}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer"
                aria-label="Edit display name"
              >
                Edit
              </button>
            )}
            <span className="text-slate-500 text-sm">·</span>
            <span className="text-xs text-slate-400 font-medium">
              {isMember ? `Member since ${memberDate}` : "Guest Player"}
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full max-w-md mx-auto sm:mx-0 pt-0.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-300 font-mono w-full">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 whitespace-nowrap">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <CountUp end={profile.experiencePoints} duration={1.5} separator="," /> Lifetime XP
              </span>
              <span className="text-slate-400 whitespace-nowrap text-xs">
                Next: {nextLevelXp} XP
              </span>
            </div>
            <div className="h-2 bg-[#120D23] rounded-full overflow-hidden border border-[#2A2147] shadow-inner w-full">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Favorite Game Card (Overview) or Level/Progress Action (Personal) */}
      {favoriteGame !== undefined || badgeLabel !== undefined ? (
        <div className="flex flex-col items-center justify-center p-3.5 px-5 rounded-2xl bg-[#281F42] border border-[#3E3263] shrink-0 text-center min-w-[145px] shadow-sm relative z-10">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-1.5 shadow-2xs">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            {badgeLabel || "FAVORITE GAME"}
          </span>
          <span className="text-xs font-bold text-white capitalize mt-0.5 truncate max-w-[120px]">
            {favoriteGame && favoriteGame !== "none" ? favoriteGame : "Discovering..."}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center sm:items-end gap-3 shrink-0 relative z-10 w-full sm:w-auto">
          <div className="w-full sm:w-44 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white">Level {profile.level}</span>
              <span className="text-amber-400 font-black">{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-[#120D23] rounded-full overflow-hidden border border-[#2A2147] w-full">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <a
            href="/profile/statistics"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#281F42] hover:bg-[#342956] border border-[#3E3263] text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span>View Progress</span>
          </a>
        </div>
      )}
    </div>
  );
}
