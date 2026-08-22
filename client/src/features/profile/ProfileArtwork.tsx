import React from "react";

/**
 * Pure SVG vector illustrations for the BHALYAM Player Profile.
 * Zero external asset dependencies, fully theme-aware and responsive.
 */

export function ProfileHeroArtwork({ className = "w-44 h-32" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="profileGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id="heroHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goldShield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="cardGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      {/* Ambient Radial Flare */}
      <circle cx="120" cy="90" r="80" fill="url(#heroHalo)" />

      {/* Floating Left Card */}
      <g transform="translate(40, 45) rotate(-14)" filter="url(#profileGlow)">
        <rect width="32" height="46" rx="6" fill="url(#cardGradLeft)" stroke="#E9D5FF" strokeWidth="1.5" />
        <circle cx="16" cy="23" r="8" fill="#FFFFFF" fillOpacity="0.25" />
        <text x="16" y="27" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">
          ♠
        </text>
      </g>

      {/* Floating Right Dice */}
      <g transform="translate(160, 40) rotate(16)" filter="url(#profileGlow)">
        <rect width="28" height="28" rx="6" fill="#F43F5E" stroke="#FECDD3" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="2" fill="#FFFFFF" />
        <circle cx="19" cy="9" r="2" fill="#FFFFFF" />
        <circle cx="14" cy="14" r="2" fill="#FFFFFF" />
        <circle cx="9" cy="19" r="2" fill="#FFFFFF" />
        <circle cx="19" cy="19" r="2" fill="#FFFFFF" />
      </g>

      {/* Central Golden Crest / Shield */}
      <g transform="translate(85, 35)" filter="url(#profileGlow)">
        <path
          d="M 35 5 L 65 18 L 65 52 Q 35 78 35 78 Q 5 52 5 18 Z"
          fill="#18181B"
          stroke="url(#goldShield)"
          strokeWidth="3"
        />
        <path
          d="M 35 12 L 58 22 L 58 48 Q 35 68 35 68 Q 12 48 12 22 Z"
          fill="url(#goldShield)"
          fillOpacity="0.25"
        />
        {/* Crown Icon */}
        <path
          d="M 23 48 L 26 32 L 31 38 L 35 28 L 39 38 L 44 32 L 47 48 Z"
          fill="#FDE047"
          stroke="#D97706"
          strokeWidth="1.5"
        />
        <circle cx="35" cy="44" r="3.5" fill="#18181B" />
      </g>

      {/* Sparkles */}
      <g fill="#FDE047" opacity="0.9">
        <path d="M 30 35 Q 30 40 25 40 Q 30 40 30 45 Q 30 40 35 40 Q 30 40 30 35 Z" />
        <path d="M 210 35 Q 210 40 205 40 Q 210 40 210 45 Q 210 40 215 40 Q 210 40 210 35 Z" />
        <path d="M 120 145 Q 120 149 116 149 Q 120 149 120 153 Q 120 149 124 149 Q 120 149 120 145 Z" />
      </g>
    </svg>
  );
}

export function ProfileEmptyMatchesArtwork({ className = "w-36 h-36" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="matchEmptyHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="75" fill="url(#matchEmptyHalo)" />

      {/* Match Table */}
      <ellipse cx="100" cy="130" rx="65" ry="25" fill="#27272A" stroke="#52525B" strokeWidth="2" />
      <ellipse cx="100" cy="125" rx="55" ry="18" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />

      {/* Board Game Grid Lines */}
      <path d="M 70 125 L 130 125" stroke="#71717A" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M 100 112 L 100 138" stroke="#71717A" strokeWidth="1" strokeDasharray="3 3" />

      {/* Dice & Tokens */}
      <rect x="75" y="112" width="18" height="18" rx="4" fill="#F43F5E" transform="rotate(-15 75 112)" />
      <circle cx="82" cy="118" r="1.5" fill="#FFFFFF" />
      <circle cx="86" cy="123" r="1.5" fill="#FFFFFF" />

      <circle cx="120" cy="122" r="7" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
      <text x="120" y="125" textAnchor="middle" fill="#78350F" fontSize="9" fontWeight="900">★</text>

      {/* Trophy Outline in Background */}
      <path
        d="M 90 70 L 110 70 L 110 85 Q 100 95 90 85 Z"
        fill="#3F3F46"
        fillOpacity="0.3"
        stroke="#71717A"
        strokeWidth="1.5"
      />
      <circle cx="100" cy="62" r="4" fill="#A1A1AA" />
    </svg>
  );
}

export function ProfileResilienceArtwork({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 16 3 L 27 7 L 27 16 Q 16 29 16 29 Q 5 16 5 7 Z"
        fill="#38BDF8"
        fillOpacity="0.15"
        stroke="#38BDF8"
        strokeWidth="2"
      />
      <path
        d="M 16 9 L 18 14 L 23 15 L 19 19 L 20 24 L 16 21 L 12 24 L 13 19 L 9 15 L 14 14 Z"
        fill="#38BDF8"
      />
    </svg>
  );
}

export function MatchHistoryEmptyArtwork({ className = "w-36 h-36" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft Glow */}
      <circle cx="80" cy="80" r="65" fill="#FEF3C7" fillOpacity="0.5" />

      {/* Little Star Sparkles */}
      <path d="M 35 45 Q 35 48 32 48 Q 35 48 35 51 Q 35 48 38 48 Q 35 48 35 45 Z" fill="#F59E0B" opacity="0.8" />
      <path d="M 125 35 Q 125 38 122 38 Q 125 38 125 41 Q 125 38 128 38 Q 125 38 125 35 Z" fill="#F59E0B" opacity="0.8" />
      <path d="M 135 105 Q 135 108 132 108 Q 135 108 135 111 Q 135 108 138 108 Q 135 108 135 105 Z" fill="#F59E0B" opacity="0.8" />
      <path d="M 28 108 Q 28 111 25 111 Q 28 111 28 114 Q 28 111 31 111 Q 28 111 28 108 Z" fill="#F59E0B" opacity="0.8" />

      {/* Flying Paper Plane & Trail */}
      <path d="M 25 65 Q 40 45 60 52" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="3 3" />
      <g transform="translate(20, 60) rotate(-20) scale(0.6)">
        <path d="M 0 0 L 24 10 L 0 20 L 6 10 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
      </g>

      {/* Dotted Arch Trail on Right */}
      <path d="M 115 65 Q 135 80 120 100" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Notebook Shadow */}
      <rect x="52" y="38" width="62" height="84" rx="8" fill="#FDE68A" fillOpacity="0.4" transform="rotate(3 80 80)" />

      {/* Notebook Body */}
      <rect
        x="48"
        y="34"
        width="64"
        height="86"
        rx="8"
        fill="#FFFDF9"
        stroke="#D97706"
        strokeWidth="2"
      />

      {/* Inner Notebook Page Line Border */}
      <rect
        x="54"
        y="40"
        width="52"
        height="74"
        rx="5"
        fill="#FFFFFF"
        stroke="#FCD34D"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />

      {/* Spiral Bindings on Left */}
      <g stroke="#92400E" strokeWidth="1.8" strokeLinecap="round">
        <path d="M 44 44 C 48 44 52 46 52 48 C 52 50 48 52 44 52" />
        <path d="M 44 56 C 48 56 52 58 52 60 C 52 62 48 64 44 64" />
        <path d="M 44 68 C 48 68 52 70 52 72 C 52 74 48 76 44 76" />
        <path d="M 44 80 C 48 80 52 82 52 84 C 52 86 48 88 44 88" />
        <path d="M 44 92 C 48 92 52 94 52 96 C 52 98 48 100 44 100" />
        <path d="M 44 104 C 48 104 52 106 52 108 C 52 110 48 112 44 112" />
      </g>

      {/* Gamepad Outline Drawn on Notebook */}
      <g transform="translate(64, 62) scale(0.65)" stroke="#D97706" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Gamepad Body */}
        <path d="M 6 14 C 6 6 12 4 25 4 C 38 4 44 6 44 14 C 44 26 40 38 34 38 C 30 38 27 32 25 32 C 23 32 20 38 16 38 C 10 38 6 26 6 14 Z" />
        {/* D-pad */}
        <path d="M 13 14 L 19 14 M 16 11 L 16 17" strokeWidth="2" />
        {/* Action Buttons */}
        <circle cx="33" cy="12" r="1.5" fill="#D97706" />
        <circle cx="37" cy="15" r="1.5" fill="#D97706" />
      </g>
    </svg>
  );
}

