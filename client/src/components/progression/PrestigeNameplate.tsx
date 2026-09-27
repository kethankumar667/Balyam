import React from "react";
import { Crown, Star, Award, Zap } from "lucide-react";
import { getLevelTier } from "@shared/progression/MiniclipProgression";
import type { LevelTier } from "@shared/progression/MiniclipProgression";
import { MiniclipLevelBadge } from "./MiniclipLevelBadge";

export interface PrestigeNameplateProps {
  name: string;
  level?: number;
  avatar?: string | null;
  isHost?: boolean;
  isCurrentTurn?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * High-Prestige Tier Nameplate for Multiplayer Lounges, Rosters & In-Game Seats.
 * Renders metallic border trims, tier corner laurels, and ambient seat glows
 * representing the player's Miniclip prestige level.
 */
export const PrestigeNameplate: React.FC<PrestigeNameplateProps> = ({
  name,
  level = 1,
  avatar,
  isHost = false,
  isCurrentTurn = false,
  className = "",
  compact = false,
}) => {
  const safeLevel = Math.max(1, Math.floor(level));
  const tier: LevelTier = getLevelTier(safeLevel);

  const getBorderClass = () => {
    switch (tier.name) {
      case "Celestial":
        return "border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.5)] bg-gradient-to-r from-cyan-950/40 via-stone-900 to-indigo-950/40";
      case "Emerald":
        return "border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.4)] bg-gradient-to-r from-emerald-950/40 via-stone-900 to-teal-950/40";
      case "Amethyst":
        return "border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.4)] bg-gradient-to-r from-purple-950/40 via-stone-900 to-fuchsia-950/40";
      case "Ruby":
        return "border-rose-500/80 shadow-[0_0_12px_rgba(239,68,68,0.4)] bg-gradient-to-r from-rose-950/40 via-stone-900 to-red-950/40";
      case "Gold":
        return "border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.4)] bg-gradient-to-r from-amber-950/40 via-stone-900 to-yellow-950/40";
      case "Cobalt":
        return "border-blue-400/60 shadow-[0_0_8px_rgba(59,130,246,0.3)] bg-stone-900/90";
      case "Silver":
        return "border-slate-400/60 shadow-[0_0_6px_rgba(148,163,184,0.25)] bg-stone-900/90";
      case "Bronze":
      default:
        return "border-amber-700/50 bg-stone-900/90";
    }
  };

  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 transition-all select-none ${getBorderClass()} ${
        isCurrentTurn ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-950" : ""
      } ${className}`}
    >
      {/* Level Badge Pin */}
      <MiniclipLevelBadge
        level={safeLevel}
        size={compact ? "xs" : "sm"}
        showTooltip={true}
        enableHoloTilt={false}
      />

      {/* Name and Tag */}
      <div className="flex flex-col min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white truncate max-w-[120px] font-sans">
            {name}
          </span>
          {isHost && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-black font-mono">
              HOST
            </span>
          )}
        </div>
        {!compact && (
          <span
            className="text-[9px] font-black uppercase font-mono tracking-wider truncate"
            style={{ color: tier.themeColor }}
          >
            {tier.name} • {tier.title}
          </span>
        )}
      </div>

      {/* Prestige Crown / Laurel Icon for high tiers */}
      {tier.hasCrown && (
        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 ml-auto" />
      )}
      {!tier.hasCrown && tier.hasLaurel && (
        <Award className="w-3.5 h-3.5 text-yellow-400 shrink-0 ml-auto" />
      )}
    </div>
  );
};

export default PrestigeNameplate;
