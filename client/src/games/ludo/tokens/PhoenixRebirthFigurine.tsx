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
 * 6. Phoenix Rebirth
 * Majestic golden solar firebird spreading multi-layered flaming wings from an ash nest.
 */
export function PhoenixRebirthFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const fireGradId = `fireGrad_${uid}`;
  const goldGradId = `goldGrad_${uid}`;

  return (
    <g className="figurine-phoenix-rebirth">
      <defs>
        <linearGradient id={fireGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="30%" stopColor="#F97316" />
          <stop offset="70%" stopColor={main} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>

        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="40%" stopColor="#FDE047" />
          <stop offset="80%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Ash Nest Plinth */}
      <path
        d="M -18 44 Q 0 49 18 44 Q 10 36 0 38 Q -10 36 -18 44 Z"
        fill="#1C1917"
        stroke="#EA580C"
        strokeWidth="1"
      />

      {/* Soaring Firebird Torso */}
      <path
        d="M 0 38 Q -7 20 0 -2 Q 7 20 0 38 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1"
      />

      {/* Spreading Fire Wings */}
      <path
        d="M -4 10 Q -28 -4 -32 -22 Q -18 -15 -6 0"
        fill={`url(#${fireGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />
      <path
        d="M 4 10 Q 28 -4 32 -22 Q 18 -15 6 0"
        fill={`url(#${fireGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />

      {/* Head & Beak */}
      <polygon points="0,-12 -2.5,-6 2.5,-6" fill={`url(#${goldGradId})`} />
      {/* Crown Flame Plume */}
      <path
        d="M 0 -8 Q -6 -22 0 -28 Q 6 -22 0 -8"
        fill={`url(#${fireGradId})`}
        stroke="#FFFFFF"
        strokeWidth="0.5"
      />
      <circle cx="0" cy="-28" r="1.5" fill="#FFFFFF" />
    </g>
  );
}
