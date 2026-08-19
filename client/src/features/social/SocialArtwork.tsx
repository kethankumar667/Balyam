import React from "react";

/**
 * Pure SVG vector illustrations for the BHALYAM Social Hub.
 * Zero external asset dependencies, fully theme-aware and responsive.
 */

export function SocialHeroArtwork({ className = "w-48 h-36" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="socialGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="badgeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Gradients */}
        <radialGradient id="hubHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#6366F1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="crestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="purpleShield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="cardGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#BE185D" />
        </linearGradient>
      </defs>

      {/* Ambient Radial Halo */}
      <circle cx="140" cy="100" r="90" fill="url(#hubHalo)" />

      {/* Background Connecting Network Lines */}
      <path
        d="M 60 120 Q 140 60 220 120"
        stroke="#C084FC"
        strokeWidth="2"
        strokeDasharray="4 4"
        strokeOpacity="0.4"
      />
      <path
        d="M 80 80 Q 140 140 200 80"
        stroke="#FBBF24"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        strokeOpacity="0.35"
      />

      {/* Left Player Avatar Circle */}
      <g transform="translate(45, 75)">
        <circle cx="25" cy="25" r="26" fill="#18181B" stroke="#8B5CF6" strokeWidth="2.5" />
        <circle cx="25" cy="25" r="22" fill="#3B0764" />
        {/* Simple Avatar Icon */}
        <circle cx="25" cy="19" r="8" fill="#E9D5FF" />
        <path d="M 12 37 Q 25 28 38 37" fill="#C084FC" />
        {/* Online Indicator */}
        <circle cx="39" cy="39" r="5.5" fill="#10B981" stroke="#18181B" strokeWidth="2" />
      </g>

      {/* Right Player Avatar Circle */}
      <g transform="translate(185, 75)">
        <circle cx="25" cy="25" r="26" fill="#18181B" stroke="#EC4899" strokeWidth="2.5" />
        <circle cx="25" cy="25" r="22" fill="#500724" />
        {/* Simple Avatar Icon */}
        <circle cx="25" cy="19" r="8" fill="#FBCFE8" />
        <path d="M 12 37 Q 25 28 38 37" fill="#F472B6" />
        {/* In-Game Indicator */}
        <circle cx="39" cy="39" r="5.5" fill="#F59E0B" stroke="#18181B" strokeWidth="2" />
      </g>

      {/* Top Floating Card Stack */}
      <g transform="translate(65, 30) rotate(-12)" filter="url(#socialGlow)">
        <rect width="32" height="44" rx="5" fill="url(#cardGrad1)" stroke="#BAE6FD" strokeWidth="1.5" />
        <circle cx="16" cy="22" r="7" fill="#FFFFFF" fillOpacity="0.25" />
        <text x="16" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">
          ★
        </text>
      </g>
      <g transform="translate(180, 25) rotate(14)" filter="url(#socialGlow)">
        <rect width="32" height="44" rx="5" fill="url(#cardGrad2)" stroke="#FBCFE8" strokeWidth="1.5" />
        <circle cx="16" cy="22" r="7" fill="#FFFFFF" fillOpacity="0.25" />
        <text x="16" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">
          ♦
        </text>
      </g>

      {/* Center Squad Emblem / Crest */}
      <g transform="translate(105, 55)" filter="url(#badgeGlow)">
        {/* Shield Backing */}
        <path
          d="M 35 5 L 65 18 L 65 50 Q 35 78 35 78 Q 5 50 5 18 Z"
          fill="url(#purpleShield)"
          stroke="#E9D5FF"
          strokeWidth="2.5"
        />
        {/* Inner Golden Crest */}
        <path
          d="M 35 12 L 58 22 L 58 48 Q 35 68 35 68 Q 12 48 12 22 Z"
          fill="url(#crestGrad)"
          stroke="#FDE68A"
          strokeWidth="1.5"
        />
        {/* Center Crown / Swords Motif */}
        <path
          d="M 23 44 L 26 28 L 31 34 L 35 25 L 39 34 L 44 28 L 47 44 Z"
          fill="#1E1B4B"
        />
        <circle cx="35" cy="40" r="3.5" fill="#FDE047" />
      </g>

      {/* Sparkling Ambient Stars */}
      <g fill="#FDE047" opacity="0.9">
        <path d="M 35 45 Q 35 50 30 50 Q 35 50 35 55 Q 35 50 40 50 Q 35 50 35 45 Z" />
        <path d="M 245 45 Q 245 50 240 50 Q 245 50 245 55 Q 245 50 250 50 Q 245 50 245 45 Z" />
        <path d="M 140 160 Q 140 164 136 164 Q 140 164 140 168 Q 140 164 144 164 Q 140 164 140 160 Z" />
      </g>

      {/* Bottom Pedestal Label */}
      <g transform="translate(95, 150)">
        <rect width="90" height="24" rx="12" fill="#18181B" stroke="#A855F7" strokeWidth="1.5" />
        <text
          x="45"
          y="16"
          textAnchor="middle"
          fill="#F5D0FE"
          fontSize="10"
          fontWeight="900"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.08em"
        >
          ⚔️ SQUAD LOUNGE
        </text>
      </g>
    </svg>
  );
}

export function SocialEmptyArtwork({ className = "w-36 h-36" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="emptyHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft Halo */}
      <circle cx="100" cy="100" r="75" fill="url(#emptyHalo)" />

      {/* Clubhouse / Lounge Table */}
      <ellipse cx="100" cy="130" rx="65" ry="25" fill="#27272A" stroke="#52525B" strokeWidth="2" />
      <ellipse cx="100" cy="125" rx="55" ry="18" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />

      {/* Gaming Dice on Table */}
      <rect x="75" y="112" width="20" height="20" rx="4" fill="#F43F5E" transform="rotate(-15 75 112)" />
      <circle cx="83" cy="118" r="1.5" fill="#FFFFFF" />
      <circle cx="88" cy="125" r="1.5" fill="#FFFFFF" />

      <rect x="105" y="110" width="20" height="20" rx="4" fill="#3B82F6" transform="rotate(12 105 110)" />
      <circle cx="115" cy="120" r="1.5" fill="#FFFFFF" />

      {/* Empty Seats Placeholder Outlines */}
      <circle cx="50" cy="85" r="16" fill="#3F3F46" fillOpacity="0.4" stroke="#71717A" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="150" cy="85" r="16" fill="#3F3F46" fillOpacity="0.4" stroke="#71717A" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="100" cy="65" r="18" fill="#A855F7" fillOpacity="0.3" stroke="#C084FC" strokeWidth="2" strokeDasharray="4 4" />

      {/* Plus Icons in Chairs */}
      <text x="50" y="90" textAnchor="middle" fill="#A1A1AA" fontSize="14" fontWeight="bold">+</text>
      <text x="150" y="90" textAnchor="middle" fill="#A1A1AA" fontSize="14" fontWeight="bold">+</text>
      <text x="100" y="71" textAnchor="middle" fill="#E9D5FF" fontSize="16" fontWeight="bold">+</text>
    </svg>
  );
}

export function SocialTipsArtwork({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="28" fill="#8B5CF6" fillOpacity="0.15" stroke="#8B5CF6" strokeWidth="2" />
      {/* Lightbulb / Idea Motif */}
      <path
        d="M 24 28 C 24 22 28 18 32 18 C 36 18 40 22 40 28 C 40 32 37 34 36 37 L 28 37 C 27 34 24 32 24 28 Z"
        fill="#FBBF24"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      <rect x="28" y="39" width="8" height="3" rx="1" fill="#71717A" />
      <line x1="32" y1="12" x2="32" y2="15" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="20" x2="21" y2="22" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="20" x2="43" y2="22" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
