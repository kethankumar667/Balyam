import React, { useState } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import type { PlayerProfile } from "@shared/profile/PlayerProfile";

function SafeLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  const hasRouter = useInRouterContext();
  if (hasRouter) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}
import SeatAvatar from "../../components/profile/SeatAvatar";
import CountUp from "../../components/CountUp";
import { BarChart2, Star, Trophy, Award, Copy, Check, ShieldCheck, Zap } from "lucide-react";
import { useIdentityPresentation } from "../../store/authStore";
import { MiniclipLevelBadge, LevelRoadmapModal } from "../../components/progression";
import { getLevelTier, getLevelTitle } from "@shared/progression/MiniclipProgression";

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
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const tier = getLevelTier(profile.level);
  const levelTitle = getLevelTitle(profile.level);
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

  const handleCopyTag = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(profile.playerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (compact) {
    return (
      <div className="rounded-2xl p-3 sm:p-4 bg-gradient-to-r from-[#0d1424] via-[#141e34] to-[#0a0f1d] border-2 border-amber-500/40 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-0.5 shadow-[0_0_16px_rgba(245,158,11,0.5)]">
              <div className="w-full h-full bg-[#080d1a] rounded-[14px] overflow-hidden flex items-center justify-center">
                <SeatAvatar
                  avatar={effectiveAvatar}
                  name={effectiveName}
                  className="w-full h-full rounded-[14px]"
                  textClassName="text-lg font-black"
                />
              </div>
            </div>
            {/* Presence Dot */}
            <span
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[#080d1a] shadow-[0_0_8px_rgba(52,211,153,0.9)]"
              title="Online in Lounge"
            />
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-[8px] font-black font-mono px-1.5 py-0.5 rounded-md border border-amber-600 shadow-md">
              LVL {profile.level}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                {effectiveName}
              </h2>
              {onEditName && (
                <button
                  type="button"
                  onClick={onEditName}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold transition underline font-mono px-2 py-1 min-h-[44px] inline-flex items-center cursor-pointer"
                  aria-label="Edit display name"
                >
                  Edit
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-300 font-mono flex items-center gap-1.5">
              <span>{membershipSubtitle}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{profile.experiencePoints} XP</span>
            </p>
          </div>
        </div>

        {/* Compact Level XP Bar */}
        <div className="w-full sm:w-48 space-y-1 shrink-0">
          <div className="flex justify-between text-[10px] font-mono text-stone-300">
            <span className="font-bold text-amber-300">Level {profile.level}</span>
            <span className="text-amber-400 font-black">{progressPct}%</span>
          </div>
          <div className="h-2 bg-black/70 rounded-full overflow-hidden border border-white/20 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-[#0c1322] via-[#131d33] to-[#080d19] border-2 border-amber-500/40 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Background Ambient Glowing Orbs */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-yellow-500/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Decorative Metallic Corner Studs */}
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
      <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
      <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-amber-400/50 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />

      {/* Left: Avatar + Identity + XP Progress */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 w-full md:w-auto relative z-10">
        {/* Large 3D Avatar with Metallic Golden Bevel Frame */}
        <div className="relative group shrink-0">
          <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-3xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-1.5 shadow-[0_8px_0_rgba(180,83,9,0.9),0_12px_24px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-[#090e1b] rounded-[18px] overflow-hidden flex items-center justify-center select-none shadow-inner border border-amber-300/40">
              <SeatAvatar
                avatar={effectiveAvatar}
                name={effectiveName}
                className="w-full h-full rounded-[18px]"
                textClassName="text-3xl sm:text-4xl font-black text-white drop-shadow"
              />
            </div>
          </div>
          {/* Presence Online Dot */}
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-400 ring-3 ring-[#0c1322] shadow-[0_0_10px_rgba(52,211,153,0.9)]"
            title="Online in Lounge"
          />
          {/* Level Crown Shield */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-stone-950 text-[10px] font-black font-mono px-3 py-0.5 rounded-full border-2 border-amber-700 shadow-[0_3px_0_rgba(180,83,9,1)] whitespace-nowrap uppercase tracking-wider">
            LVL {profile.level}
          </div>
        </div>

        {/* Identity & Level Info */}
        <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate max-w-[220px] sm:max-w-md drop-shadow-sm">
              {effectiveName}
            </h1>
            <span className="text-amber-500/60 text-sm hidden sm:inline">·</span>
            {onEditName && (
              <button
                type="button"
                onClick={onEditName}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer hover:underline min-h-[44px] px-2 inline-flex items-center"
                aria-label="Edit display name"
              >
                Edit
              </button>
            )}
            <span className="text-amber-500/60 text-sm hidden sm:inline">·</span>
            <span className="text-xs text-amber-200/90 font-mono bg-amber-500/15 border border-amber-400/30 px-3 py-1 rounded-full shadow-inner">
              {membershipSubtitle}
            </span>
            <span className="text-amber-500/60 text-sm hidden sm:inline">·</span>
            <button
              type="button"
              onClick={() => setIsRoadmapOpen(true)}
              className="text-xs font-black font-mono px-3 py-1.5 min-h-[44px] rounded-full border shadow-sm cursor-pointer hover:brightness-110 active:scale-95 transition inline-flex items-center gap-1.5"
              style={{
                color: tier.themeColor,
                borderColor: `${tier.themeColor}88`,
                backgroundColor: `${tier.themeColor}25`,
              }}
              title="Click to view Level Roadmap"
            >
              <MiniclipLevelBadge level={profile.level} size="xs" showTooltip={false} />
              <span>{levelTitle}</span>
            </button>
          </div>

          {/* Player Tag Chip (#PLAYER_ID) */}
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={handleCopyTag}
              className="text-[11px] font-mono font-bold text-stone-300 hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 px-3 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              title="Click to copy Player Tag"
            >
              <span className="text-amber-400 font-black">#</span>
              <span>{profile.playerId.slice(0, 14)}...</span>
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-stone-400 stroke-[2.5]" />
              )}
            </button>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Verified Seat</span>
            </span>
          </div>

          {/* Chunky Supercell XP Capsule Bar */}
          <div className="w-full max-w-md mx-auto sm:mx-0 pt-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-200 font-mono w-full">
              <span className="flex items-center gap-1.5 font-black text-amber-400 whitespace-nowrap">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <CountUp end={profile.experiencePoints} duration={1.5} separator="," /> Lifetime XP
              </span>
              <span className="text-stone-300 whitespace-nowrap text-xs font-bold font-mono">
                Next: <span className="text-amber-300">{nextLevelXp} XP</span>
              </span>
            </div>
            <div className="h-3.5 bg-black/80 rounded-full overflow-hidden border-2 border-amber-500/40 shadow-inner p-0.5 w-full">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] relative overflow-hidden"
                style={{ width: `${progressPct}%` }}
              >
                {/* Shiny gloss overlay line */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Favorite Game Card & Chunky 3D Action Buttons */}
      <div className="flex flex-col items-center sm:items-end gap-3.5 shrink-0 relative z-10 w-full sm:w-auto">
        {favoriteGame !== undefined && favoriteGame !== "none" ? (
          <div className="flex items-center gap-3 p-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border-2 border-amber-500/40 text-center min-w-[160px] shadow-md backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-[0_2px_0_rgba(180,83,9,1)] shrink-0">
              <Trophy className="w-5 h-5 text-stone-950" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 font-mono block">
                {badgeLabel || "FAVORITE"}
              </span>
              <span className="text-xs font-black text-white capitalize truncate max-w-[130px] block">
                {favoriteGame}
              </span>
            </div>
          </div>
        ) : null}

        {/* 3D Chunky Action Buttons (Supercell Tactile Style) */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end">
          <button
            type="button"
            onClick={() => setIsRoadmapOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 text-xs font-black uppercase tracking-wider border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition shadow-[0_4px_10px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <Award className="w-4 h-4 text-stone-950" />
            <span>Level Road</span>
          </button>
          <SafeLink
            to="/profile/statistics"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white text-xs font-black uppercase tracking-wider border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 border border-white/10 transition shadow-md cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span>Statistics</span>
          </SafeLink>
        </div>
      </div>

      <LevelRoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
        experiencePoints={profile.experiencePoints}
        playerId={profile.playerId}
      />
    </div>
  );
}
