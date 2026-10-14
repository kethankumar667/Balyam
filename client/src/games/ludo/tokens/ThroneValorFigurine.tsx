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
 * 3. Throne of Valor
 * 3D golden high-backed monarch lion throne with rich velvet seat and backrest.
 */
export function ThroneValorFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;
  const velvetGradId = `velvetGrad_${uid}`;

  return (
    <g className="figurine-throne-valor">
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="30%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        <radialGradient id={velvetGradId} cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor={main} />
          <stop offset="60%" stopColor={dark} />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Stepped Plinth */}
      <polygon points="-24,46 -20,38 20,38 24,46" fill="#1E293B" stroke={`url(#${goldGradId})`} strokeWidth="1" />

      {/* Gold Throne Base & Seat Cushion */}
      <rect x="-16" y="20" width="32" height="18" rx="3" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="1" />
      <rect x="-12" y="18" width="24" height="10" rx="2" fill={`url(#${velvetGradId})`} />

      {/* High Throne Backrest Arch */}
      <path
        d="M -15 20 L -15 -18 Q 0 -36 15 -18 L 15 20 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1.2"
      />
      {/* Velvet Backrest Inlay */}
      <path
        d="M -10 18 L -10 -12 Q 0 -28 10 -12 L 10 18 Z"
        fill={`url(#${velvetGradId})`}
      />

      {/* Carved Lion Heads on Armrests */}
      <circle cx="-16" cy="20" r="4.5" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />
      <circle cx="16" cy="20" r="4.5" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />

      {/* Top Royal Crest */}
      <polygon points="-5,-30 0,-38 5,-30" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.6" />
      <circle cx="0" cy="-26" r="2.2" fill="#10B981" />
    </g>
  );
}
