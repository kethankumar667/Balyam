import React from "react";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import { LevelSparkleIcon } from "../../design-system/icons";
import { ProfileHeroArtwork } from "./ProfileArtwork";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { useAuthStore } from "../../store/authStore";

interface ProfileHeaderProps {
  profile: PlayerProfile;
  isMember?: boolean;
  onEditName?: () => void;
  /**
   * Live identity, straight from `roomStore` — overrides `profile.displayName`
   * / `profile.avatar` when given. `profile` is a REST snapshot fetched once
   * per page load, so it goes stale the moment the name/avatar changes via a
   * different save surface (Settings, the header's own profile sheet, sign-up)
   * while this page stays mounted. Optional so a caller with no live store
   * handy still gets sane behaviour from `profile` alone.
   */
  name?: string;
  avatar?: string | null;
}

export default function ProfileHeader({ profile, isMember = false, onEditName, name, avatar }: ProfileHeaderProps) {
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

  return (
    <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-stone-900/95 via-zinc-900/90 to-stone-900/95 border border-stone-800/80 text-white shadow-2xl relative overflow-hidden">
      {/* Radiant Glowing Flare */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full sm:w-auto">
          {/* Avatar with Gilded Rim & Level Badge */}
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-stone-950 rounded-[22px] overflow-hidden flex items-center justify-center select-none">
                <SeatAvatar
                  avatar={effectiveAvatar}
                  name={effectiveName}
                  className="w-full h-full rounded-[22px]"
                  textClassName="text-4xl sm:text-5xl font-black"
                />
              </div>
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[11px] font-black font-mono px-3 py-0.5 rounded-full border-2 border-stone-900 shadow-xl tracking-wider whitespace-nowrap">
              LVL {profile.level}
            </div>
          </div>

          {/* Identity & Level Progression */}
          <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate max-w-[220px] sm:max-w-md">
                  {effectiveName}
                </h1>
                {onEditName && (
                  <button
                    onClick={onEditName}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold transition underline underline-offset-2 font-mono min-h-[32px] px-1"
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
            <div className="w-full max-w-md mx-auto sm:mx-0 pt-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-stone-300 font-mono w-full">
                <span className="flex items-center gap-1.5 font-bold text-amber-400 whitespace-nowrap">
                  <LevelSparkleIcon size={13} className="text-amber-400" />
                  {profile.experiencePoints} Lifetime XP
                </span>
                <span className="text-stone-400 whitespace-nowrap text-[11px]">
                  Next: {nextLevelXp} XP
                </span>
              </div>
              <div className="h-2.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800 shadow-inner w-full">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Vector Artwork */}
        <div className="hidden sm:flex items-center justify-center flex-shrink-0">
          <ProfileHeroArtwork className="w-36 h-28 drop-shadow-xl" />
        </div>
      </div>
    </div>
  );
}
