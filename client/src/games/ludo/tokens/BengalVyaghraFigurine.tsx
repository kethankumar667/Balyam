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
 * 8. Bengal Vyaghra
 * Crouching golden royal tiger predator with obsidian stripes and glowing emerald eyes.
 */
export function BengalVyaghraFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;

  return (
    <g className="figurine-bengal-vyaghra">
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="30%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Rock Outcrop Plinth */}
      <polygon points="-22,46 -15,36 15,36 22,46" fill="#1E293B" stroke={`url(#${goldGradId})`} strokeWidth="1" />

      {/* Crouching Tiger Body */}
      <path
        d="M -16 34 Q -22 18 -8 10 L 8 10 Q 22 18 16 34 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1"
      />

      {/* Tiger Stripes (Obsidian Black) */}
      <path d="M -8 26 L -5 16 M -3 28 L 0 17 M 3 28 L 6 17" stroke="#18181B" strokeWidth="1.6" />

      {/* Tiger Head */}
      <circle cx="-11" cy="5" r="7.5" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />
      {/* Ears */}
      <polygon points="-16,-2 -13,3 -17,5" fill="#78350F" />
      <polygon points="-6,-2 -9,3 -5,5" fill="#78350F" />

      {/* Glowing Emerald Eye */}
      <circle cx="-12" cy="4" r="1.5" fill="#10B981" />

      {/* Fangs & Whiskers */}
      <line x1="-16" y1="8" x2="-22" y2="7" stroke="#FFFBEB" strokeWidth="0.8" />
      <line x1="-16" y1="10" x2="-21" y2="11" stroke="#FFFBEB" strokeWidth="0.8" />
    </g>
  );
}
