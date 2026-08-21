import React from "react";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import { LevelSparkleIcon } from "../../design-system/icons";
import SeatAvatar from "../../components/profile/SeatAvatar";
import CountUp from "../../components/CountUp";
import { Sparkles, Trophy, Gamepad2 } from "lucide-react";

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
  const memberDate = new Date(profile.joinedAt).toLocaleDateString(undefined, {
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
      <div className="rounded-2xl p-3 sm:p-3.5 bg-gradient-to-r from-stone-900/95 via-zinc-900/90 to-stone-900/95 border border-stone-800/90 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-0.5 shadow-sm">
              <div className="w-full h-full bg-stone-950 rounded-[10px] overflow-hidden flex items-center justify-center">
                <SeatAvatar
                  avatar={effectiveAvatar}
                  name={effectiveName}
                  className="w-full h-full rounded-[10px]"
                  textClassName="text-lg font-black"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[8px] font-black font-mono px-1.5 py-0.1 rounded-full border border-stone-900 shadow">
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
          <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
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
    <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-stone-900/95 via-zinc-900/90 to-stone-900/95 border border-stone-800/80 text-white shadow-2xl relative overflow-hidden">
      {/* Radiant Glowing Flare */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full sm:w-auto">
          {/* Avatar with Gilded Rim & Level Badge */}
          <div className="relative group flex-shrink-0">
            <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-stone-950 rounded-[22px] overflow-hidden flex items-center justify-center select-none">
                <SeatAvatar
                  avatar={effectiveAvatar}
                  name={effectiveName}
                  className="w-full h-full rounded-[22px]"
                  textClassName="text-3xl sm:text-4xl font-black"
                />
              </div>
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[11px] font-black font-mono px-3 py-0.5 rounded-full border-2 border-stone-900 shadow-xl tracking-wider whitespace-nowrap">
              <CountUp end={profile.level} prefix="LVL " duration={1.2} />
            </div>
          </div>

          {/* Identity & Level Progression */}
          <div className="flex-1 text-center sm:text-left space-y-2 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate max-w-[220px] sm:max-w-md">
                  {effectiveName}
                </h1>
                {onEditName && (
                  <button
                    onClick={onEditName}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold transition underline underline-offset-2 font-mono min-h-[32px] px-1 cursor-pointer"
                    aria-label="Edit display name"
                  >
                    Edit
                  </button>
                )}
              </div>
              <span className="text-xs text-stone-400 font-mono block">
                • {isMember ? `Member since ${memberDate}` : "Guest Player"}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="w-full max-w-md mx-auto sm:mx-0 pt-0.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-stone-300 font-mono w-full">
                <span className="flex items-center gap-1.5 font-bold text-amber-400 whitespace-nowrap">
                  <LevelSparkleIcon size={13} className="text-amber-400" />
                  <CountUp end={profile.experiencePoints} duration={1.8} separator="," /> Lifetime XP
                </span>
                <span className="text-stone-400 whitespace-nowrap text-[11px]">
                  Next: {nextLevelXp} XP
                </span>
              </div>
              <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800 shadow-inner w-full">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Memory & Game Card */}
        <div className="hidden lg:flex flex-col items-center justify-center p-3 px-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shrink-0 text-center min-w-[135px]">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-1">
            {favoriteGame && favoriteGame !== "none" ? <Gamepad2 className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
            {badgeLabel || "Favorite Game"}
          </span>
          <span className="text-xs font-bold text-white capitalize mt-0.5 truncate max-w-[120px]">
            {favoriteGame && favoriteGame !== "none" ? favoriteGame : "Discovering..."}
          </span>
        </div>
      </div>
    </div>
  );
}
