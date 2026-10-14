import React from "react";
import type { LudoColor } from "@shared/types";
import { TokenAuraPedestal } from "./TokenAuraPedestal";

interface FigurineProps {
  uid: string;
  color: LudoColor;
  main: string;
  dark: string;
  movable?: boolean;
}

/**
 * 1. Imperial Sovereign (Royal Crown)
 * 3D Coronation crown with velvet cushion, faceted jewels, and golden cross finial.
 */
export function ImperialCrownFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;
  const velvetGradId = `velvetGrad_${uid}`;
  const gemGradId = `gemGrad_${uid}`;

  return (
    <g className="figurine-imperial-crown">
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="80%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        <radialGradient id={velvetGradId} cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor={main} />
          <stop offset="60%" stopColor={dark} />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>

        <radialGradient id={gemGradId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FECDD3" />
          <stop offset="45%" stopColor="#E11D48" />
          <stop offset="90%" stopColor="#881337" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Velvet Cushion Body (Seat Colored) */}
      <ellipse cx="0" cy="28" rx="24" ry="12" fill={`url(#${velvetGradId})`} />
      <path
        d="M -22 30 C -24 5, 24 5, 22 30 Z"
        fill={`url(#${velvetGradId})`}
      />

      {/* Gold Beveled Rim Ring */}
      <ellipse cx="0" cy="30" rx="25" ry="9" fill="none" stroke={`url(#${goldGradId})`} strokeWidth="4.5" />
      <ellipse cx="0" cy="28.5" rx="24.5" ry="8.5" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.75" />

      {/* Crown Rim Gems */}
      <circle cx="-16" cy="31" r="2.2" fill="#10B981" />
      <circle cx="-8" cy="33.5" r="2.5" fill="#38BDF8" />
      <circle cx="0" cy="34" r="3" fill={`url(#${gemGradId})`} />
      <circle cx="8" cy="33.5" r="2.5" fill="#38BDF8" />
      <circle cx="16" cy="31" r="2.2" fill="#10B981" />

      {/* 3D Crown Spires & Arches */}
      <path
        d="M -24 28 Q -22 0 -12 -12 Q -8 5 0 2 Q 8 5 12 -12 Q 22 0 24 28"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1.2"
      />
      {/* Central Spire Arch */}
      <path
        d="M -9 26 Q -4 -25 0 -34 Q 4 -25 9 26 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1"
      />

      {/* Spire Pearls */}
      <circle cx="-12" cy="-12" r="3.2" fill="#FFFFFF" stroke="#D97706" strokeWidth="0.8" />
      <circle cx="12" cy="-12" r="3.2" fill="#FFFFFF" stroke="#D97706" strokeWidth="0.8" />
      <circle cx="0" cy="-34" r="4.2" fill={`url(#${gemGradId})`} stroke={`url(#${goldGradId})`} strokeWidth="1" />

      {/* Golden Cross Finial on Apex */}
      <path
        d="M -1.8 -48 L 1.8 -48 L 1.8 -44 L 5.5 -44 L 5.5 -40.5 L 1.8 -40.5 L 1.8 -35 L -1.8 -35 L -1.8 -40.5 L -5.5 -40.5 L -5.5 -44 L -1.8 -44 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="0.8"
      />

      {/* Specular Highlight Sparkle */}
      <polygon
        points="0,-39 1,-35 4,-35 1.5,-32.5 2.5,-29 0,-31 -2.5,-29 -1.5,-32.5 -4,-35 -1,-35"
        fill="#FFFFFF"
        opacity="0.9"
      />
    </g>
  );
}
