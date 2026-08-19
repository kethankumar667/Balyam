import React from "react";
import type { GameKind } from "@shared/types";
import { ChampionCrownIcon, SwordsClashIcon, TournamentCupIcon } from "../../design-system/icons";

interface TournamentGameArtworkProps {
  game: GameKind | string;
  className?: string;
}

/**
 * Rich vector illustration scenes for tournament card headers and hero banners.
 * Pure SVG vectors ensure instant rendering, zero layout shift, crisp sharpness at all DPIs,
 * and adaptive color accents for both light and dark themes.
 */
export const TournamentGameArtwork: React.FC<TournamentGameArtworkProps> = ({
  game,
  className = "",
}) => {
  const norm = (game || "").toLowerCase();

  if (norm === "uno") {
    return (
      <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-rose-950/80 via-amber-950/60 to-zinc-950 flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 400 200"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="unoGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="unoRedCard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
            <linearGradient id="unoYellowCard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="unoBlueCard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id="unoGreenCard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>
          </defs>

          {/* Ambient background glow */}
          <circle cx="200" cy="100" r="140" fill="url(#unoGlow)" />

          {/* Card 1: Blue (Left tilt) */}
          <g transform="translate(110, 30) rotate(-22)">
            <rect x="0" y="0" width="70" height="110" rx="10" fill="url(#unoBlueCard)" stroke="#FFFFFF" strokeWidth="2.5" />
            <ellipse cx="35" cy="55" rx="22" ry="34" fill="#0284C7" transform="rotate(-15 35 55)" />
            <text x="35" y="65" fill="#FFFFFF" fontSize="32" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">7</text>
          </g>

          {/* Card 2: Green (Mild tilt) */}
          <g transform="translate(150, 20) rotate(-8)">
            <rect x="0" y="0" width="70" height="110" rx="10" fill="url(#unoGreenCard)" stroke="#FFFFFF" strokeWidth="2.5" />
            <ellipse cx="35" cy="55" rx="22" ry="34" fill="#16A34A" transform="rotate(-10 35 55)" />
            <text x="35" y="65" fill="#FFFFFF" fontSize="30" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">⇄</text>
          </g>

          {/* Card 3: Red (Center right) */}
          <g transform="translate(195, 20) rotate(10)">
            <rect x="0" y="0" width="70" height="110" rx="10" fill="url(#unoRedCard)" stroke="#FFFFFF" strokeWidth="2.5" />
            <ellipse cx="35" cy="55" rx="22" ry="34" fill="#B91C1C" transform="rotate(10 35 55)" />
            <text x="35" y="65" fill="#FFFFFF" fontSize="32" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">2</text>
          </g>

          {/* Card 4: Yellow Wild Card (Foreground) */}
          <g transform="translate(230, 35) rotate(26)">
            <rect x="0" y="0" width="70" height="110" rx="10" fill="url(#unoYellowCard)" stroke="#FFFFFF" strokeWidth="3" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.5))" />
            <ellipse cx="35" cy="55" rx="24" ry="36" fill="#0F172A" transform="rotate(10 35 55)" />
            <path d="M20 40 A18 18 0 0 1 50 40 Z" fill="#EF4444" />
            <path d="M50 40 A18 18 0 0 1 50 70 Z" fill="#3B82F6" />
            <path d="M50 70 A18 18 0 0 1 20 70 Z" fill="#22C55E" />
            <path d="M20 70 A18 18 0 0 1 20 40 Z" fill="#EAB308" />
            <text x="35" y="62" fill="#FEF08A" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">+4</text>
          </g>

          {/* Floating game sparks */}
          <circle cx="90" cy="50" r="3" fill="#FBBF24" opacity="0.8" />
          <circle cx="310" cy="60" r="2.5" fill="#F43F5E" opacity="0.7" />
          <circle cx="280" cy="140" r="3.5" fill="#38BDF8" opacity="0.6" />
          <circle cx="120" cy="150" r="2" fill="#4ADE80" opacity="0.7" />
        </svg>
      </div>
    );
  }

  if (norm === "ludo") {
    return (
      <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-amber-950/80 via-emerald-950/60 to-zinc-950 flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 400 200"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="ludoGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EAB308" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="200" cy="100" r="140" fill="url(#ludoGlow)" />

          {/* Ludo Board Quadrant 3D tilt */}
          <g transform="translate(120, 25) rotate(-6)">
            <rect x="0" y="0" width="160" height="150" rx="16" fill="#1E293B" stroke="#475569" strokeWidth="3" />
            {/* Red Yard */}
            <rect x="10" y="10" width="60" height="60" rx="8" fill="#DC2626" />
            <circle cx="25" cy="25" r="7" fill="#FEF2F2" />
            <circle cx="55" cy="25" r="7" fill="#FEF2F2" />
            <circle cx="25" cy="55" r="7" fill="#FEF2F2" />
            <circle cx="55" cy="55" r="7" fill="#FEF2F2" />
            {/* Green Yard */}
            <rect x="90" y="10" width="60" height="60" rx="8" fill="#16A34A" />
            <circle cx="105" cy="25" r="7" fill="#FEF2F2" />
            <circle cx="135" cy="25" r="7" fill="#FEF2F2" />
            <circle cx="105" cy="55" r="7" fill="#FEF2F2" />
            <circle cx="135" cy="55" r="7" fill="#FEF2F2" />
            {/* Yellow Yard */}
            <rect x="10" y="80" width="60" height="60" rx="8" fill="#CA8A04" />
            <circle cx="25" cy="95" r="7" fill="#FEF2F2" />
            <circle cx="55" cy="95" r="7" fill="#FEF2F2" />
            <circle cx="25" cy="125" r="7" fill="#FEF2F2" />
            <circle cx="55" cy="125" r="7" fill="#FEF2F2" />
            {/* Blue Yard */}
            <rect x="90" y="80" width="60" height="60" rx="8" fill="#2563EB" />
            <circle cx="105" cy="95" r="7" fill="#FEF2F2" />
            <circle cx="135" cy="95" r="7" fill="#FEF2F2" />
            <circle cx="105" cy="125" r="7" fill="#FEF2F2" />
            <circle cx="135" cy="125" r="7" fill="#FEF2F2" />
            {/* Center Home Diamond */}
            <polygon points="80,55 105,75 80,95 55,75" fill="#F8FAFC" />
            <circle cx="80" cy="75" r="4" fill="#DC2626" />
          </g>

          {/* 3D Dice Isometric floating */}
          <g transform="translate(270, 75) rotate(18)">
            {/* Top Face */}
            <polygon points="0,0 28,-14 56,0 28,14" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1.5" />
            <circle cx="28" cy="0" r="3" fill="#DC2626" />
            {/* Left Face */}
            <polygon points="0,0 28,14 28,48 0,34" fill="#E2E8F0" stroke="#0F172A" strokeWidth="1.5" />
            <circle cx="14" cy="18" r="2.5" fill="#0F172A" />
            <circle cx="14" cy="30" r="2.5" fill="#0F172A" />
            {/* Right Face */}
            <polygon points="28,14 56,0 56,34 28,48" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.5" />
            <circle cx="42" cy="18" r="2.5" fill="#0F172A" />
            <circle cx="42" cy="30" r="2.5" fill="#0F172A" />
            <circle cx="35" cy="24" r="2.5" fill="#0F172A" />
          </g>

          {/* Red & Yellow Player Tokens */}
          <g transform="translate(90, 80)">
            <ellipse cx="20" cy="45" rx="16" ry="6" fill="rgba(0,0,0,0.5)" />
            <path d="M12 40 C12 30 16 22 16 16 C16 12 18 10 20 10 C22 10 24 12 24 16 C24 22 28 30 28 40 Z" fill="#EF4444" stroke="#FEE2E2" strokeWidth="1.5" />
            <circle cx="20" cy="10" r="6" fill="#F87171" stroke="#FEE2E2" strokeWidth="1" />
          </g>
        </svg>
      </div>
    );
  }

  if (norm === "rummy") {
    return (
      <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-emerald-950 via-stone-900 to-zinc-950 flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 400 200"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="rummyFelt" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="200" cy="100" r="140" fill="url(#rummyFelt)" />

          {/* Card 1: 10 Spades */}
          <g transform="translate(100, 35) rotate(-24)">
            <rect x="0" y="0" width="65" height="105" rx="8" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
            <text x="12" y="24" fill="#0F172A" fontSize="14" fontWeight="bold">10</text>
            <text x="12" y="38" fill="#0F172A" fontSize="12">♠</text>
            <text x="32" y="65" fill="#0F172A" fontSize="30" textAnchor="middle">♠</text>
          </g>

          {/* Card 2: Jack Spades */}
          <g transform="translate(135, 25) rotate(-12)">
            <rect x="0" y="0" width="65" height="105" rx="8" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
            <text x="12" y="24" fill="#0F172A" fontSize="16" fontWeight="bold">J</text>
            <text x="12" y="38" fill="#0F172A" fontSize="12">♠</text>
            <rect x="18" y="42" width="29" height="42" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
            <text x="32" y="68" fill="#0F172A" fontSize="22" textAnchor="middle">⚔️</text>
          </g>

          {/* Card 3: Queen Spades */}
          <g transform="translate(175, 20) rotate(0)">
            <rect x="0" y="0" width="65" height="105" rx="8" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
            <text x="12" y="24" fill="#0F172A" fontSize="16" fontWeight="bold">Q</text>
            <text x="12" y="38" fill="#0F172A" fontSize="12">♠</text>
            <rect x="18" y="42" width="29" height="42" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
            <text x="32" y="68" fill="#0F172A" fontSize="22" textAnchor="middle">👑</text>
          </g>

          {/* Card 4: King Spades */}
          <g transform="translate(215, 25) rotate(12)">
            <rect x="0" y="0" width="65" height="105" rx="8" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
            <text x="12" y="24" fill="#0F172A" fontSize="16" fontWeight="bold">K</text>
            <text x="12" y="38" fill="#0F172A" fontSize="12">♠</text>
            <rect x="18" y="42" width="29" height="42" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
            <text x="32" y="68" fill="#0F172A" fontSize="22" textAnchor="middle">🤴</text>
          </g>

          {/* Card 5: Ace Spades (Pure Sequence finisher) */}
          <g transform="translate(255, 35) rotate(24)">
            <rect x="0" y="0" width="65" height="105" rx="8" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.5))" />
            <text x="12" y="24" fill="#DC2626" fontSize="16" fontWeight="900">A</text>
            <text x="12" y="38" fill="#DC2626" fontSize="12">♥</text>
            <text x="32" y="68" fill="#DC2626" fontSize="36" textAnchor="middle">♥</text>
          </g>

          {/* Pure Sequence Badge */}
          <g transform="translate(150, 155)">
            <rect x="0" y="0" width="100" height="24" rx="12" fill="#047857" stroke="#34D399" strokeWidth="1.5" />
            <text x="50" y="16" fill="#ECFDF5" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">PURE RUN ✓</text>
          </g>
        </svg>
      </div>
    );
  }

  // Generic fallback / Hand Cricket / Chess
  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-amber-950/70 via-stone-900 to-zinc-950 flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 400 200"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="200" cy="100" r="130" fill="#F59E0B" opacity="0.15" />
        <g transform="translate(160, 40)">
          <path d="M40 10 L60 30 L60 80 L40 100 L20 80 L20 30 Z" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2" opacity="0.8" />
          <circle cx="40" cy="55" r="16" fill="#78350F" />
          <text x="40" y="62" fill="#FDE68A" fontSize="18" fontWeight="bold" textAnchor="middle">⚔️</text>
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Golden Championship Trophy vector graphic for Hero banners.
 */
export const TournamentTrophyArtwork: React.FC<{ size?: number; className?: string }> = ({
  size = 180,
  className = "",
}) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_12px_24px_rgba(245,158,11,0.35)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="goldCup" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="goldRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#292524" />
            <stop offset="100%" stopColor="#0C0A09" />
          </linearGradient>
          <radialGradient id="sparkle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Halo behind Cup */}
        <circle cx="100" cy="85" r="65" fill="#F59E0B" opacity="0.2" />

        {/* Trophy Handles (Left and Right) */}
        <path
          d="M60 55 C35 55 35 95 65 105 C62 95 58 85 62 65 Z"
          fill="url(#goldCup)"
          stroke="#FDE68A"
          strokeWidth="2"
        />
        <path
          d="M140 55 C165 55 165 95 135 105 C138 95 142 85 138 65 Z"
          fill="url(#goldCup)"
          stroke="#FDE68A"
          strokeWidth="2"
        />

        {/* Trophy Chalice Body */}
        <path
          d="M60 45 C60 100 82 120 100 120 C118 120 140 100 140 45 Z"
          fill="url(#goldCup)"
          stroke="#FDE68A"
          strokeWidth="2"
        />

        {/* Top Rim */}
        <ellipse cx="100" cy="45" rx="40" ry="10" fill="url(#goldRim)" stroke="#F59E0B" strokeWidth="2" />
        <ellipse cx="100" cy="45" rx="34" ry="6" fill="#78350F" opacity="0.6" />

        {/* Trophy Stem */}
        <path d="M92 120 L88 150 L112 150 L108 120 Z" fill="url(#goldCup)" stroke="#D97706" strokeWidth="1.5" />
        <ellipse cx="100" cy="148" rx="18" ry="5" fill="url(#goldRim)" />

        {/* Trophy Base Tier 1 */}
        <polygon points="76,152 124,152 130,165 70,165" fill="url(#goldCup)" stroke="#92400E" strokeWidth="1.5" />

        {/* Trophy Base Pedestal (Marble/Mahogany block) */}
        <rect x="65" y="165" width="70" height="22" rx="4" fill="url(#baseGrad)" stroke="#F59E0B" strokeWidth="1.5" />
        {/* Brass Plaque */}
        <rect x="75" y="170" width="50" height="12" rx="2" fill="url(#goldCup)" stroke="#FEF3C7" strokeWidth="0.8" />
        <text x="100" y="179" fill="#451A03" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="monospace">BHALYAM 1ST</text>

        {/* Star Sparkles */}
        <polygon points="135,45 138,52 145,55 138,58 135,65 132,58 125,55 132,52" fill="#FFFFFF" />
        <polygon points="65,90 67,95 72,97 67,99 65,104 63,99 58,97 63,95" fill="#FEF08A" />
      </svg>
    </div>
  );
};

/**
 * Illustrated Championship feature card for Sidebar or Secondary Hub.
 */
export const TournamentPodiumCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 via-stone-900/40 to-stone-950/80 border border-amber-500/25 relative overflow-hidden space-y-3 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <TournamentCupIcon size={16} />
        </div>
        <div>
          <h4 className="text-xs font-black text-stone-100 dark:text-zinc-100 uppercase tracking-wide">
            Championship Arena
          </h4>
          <span className="text-[10px] text-amber-400 font-mono">Knockout Brackets</span>
        </div>
      </div>
      <p className="text-[11px] text-stone-400 dark:text-zinc-400 leading-relaxed font-sans">
        Compete in scheduled tournaments to earn double XP, exclusive championship trophies, and climb the Hall of Fame.
      </p>
      <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-stone-400 border-t border-stone-800/80">
        <span className="flex items-center gap-1 text-amber-400 font-bold">
          <ChampionCrownIcon size={12} /> Double XP Active
        </span>
        <span className="text-emerald-400 font-bold">Fair Play 100%</span>
      </div>
    </div>
  );
};
