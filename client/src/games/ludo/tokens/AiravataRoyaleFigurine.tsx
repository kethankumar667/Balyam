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
 * 7. Airavata Royale
 * Gilded ceremonial Indian temple elephant with jeweled howdah palanquin and lotus pedestal.
 */
export function AiravataRoyaleFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;
  const howdahGradId = `howdahGrad_${uid}`;

  return (
    <g className="figurine-airavata-royale">
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        <radialGradient id={howdahGradId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={main} />
          <stop offset="70%" stopColor={dark} />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Lotus Dais Petals */}
      <ellipse cx="0" cy="42" rx="24" ry="7" fill={`url(#${goldGradId})`} />
      <path d="M -18 42 Q -24 34 -18 28 Q -14 36 -18 42 Z" fill="#F43F5E" />
      <path d="M 18 42 Q 24 34 18 28 Q 14 36 18 42 Z" fill="#F43F5E" />

      {/* Elephant Body & Sturdy Legs */}
      <ellipse cx="0" cy="22" rx="18" ry="14" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="1" />
      <rect x="-14" y="26" width="6.5" height="12" rx="2" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />
      <rect x="7.5" y="26" width="6.5" height="12" rx="2" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />

      {/* Ceremonial Caparison (Jhool) draped over back */}
      <path
        d="M -11 16 Q 0 20 11 16 L 9 28 Q 0 32 -9 28 Z"
        fill={`url(#${howdahGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />

      {/* Head & Raised Fortune Trunk */}
      <circle cx="-10" cy="10" r="9" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />
      <path
        d="M -15 10 Q -24 4 -20 -8 Q -15 -12 -13 -6 Q -17 0 -11 3"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="0.8"
      />

      {/* Ivory Tusks with Gold Caps */}
      <path d="M -12 14 Q -20 16 -18 22" stroke="#FFFBEB" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="-18" cy="22" r="1.2" fill={`url(#${goldGradId})`} />

      {/* Jeweled Howdah (Palanquin) on Back */}
      <polygon points="-8,14 8,14 6,2 -6,2" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="1" />
      <path d="M -7 2 Q 0 -6 7 2 Z" fill={`url(#${howdahGradId})`} stroke={`url(#${goldGradId})`} strokeWidth="0.8" />
      <circle cx="0" cy="-2" r="2.2" fill="#10B981" />
    </g>
  );
}
