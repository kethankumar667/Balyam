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
 * 2. Scepter of Radiance
 * Ceremonial monarch scepter with spiral golden ribbons and floating celestial sapphire orb.
 */
export function ScepterRadianceFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;
  const orbGradId = `orbGrad_${uid}`;

  return (
    <g className="figurine-scepter-radiance">
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="30%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        <radialGradient id={orbGradId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="35%" stopColor={main} />
          <stop offset="75%" stopColor={dark} />
          <stop offset="100%" stopColor="#082F49" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Scepter Plinth Base */}
      <polygon points="-16,45 -10,32 10,32 16,45" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="1" />

      {/* Scepter Shaft */}
      <rect x="-3.5" y="-3" width="7" height="38" rx="2" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="1" />
      {/* Spiral Golden Ribbons */}
      <path d="M -3.5 10 Q 0 14 3.5 10 M -3.5 22 Q 0 26 3.5 22" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.8" />

      {/* Filigree Wing Brackets */}
      <path
        d="M -5 -3 Q -22 -14 -15 -26 Q -8 -20 -3 -10"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1"
      />
      <path
        d="M 5 -3 Q 22 -14 15 -26 Q 8 -20 3 -10"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1"
      />

      {/* Floating Celestial Orb (Seat Color Tinted) */}
      <circle cx="0" cy="-18" r="11" fill={`url(#${orbGradId})`} stroke={`url(#${goldGradId})`} strokeWidth="1.2" />
      <ellipse cx="0" cy="-18" rx="14" ry="4" fill="none" stroke={`url(#${goldGradId})`} strokeWidth="1.2" />

      {/* Apex Crown Finial */}
      <polygon points="0,-34 -3.5,-29 3.5,-29" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />
      <circle cx="0,-34" r="1.5" fill="#FFFFFF" />
    </g>
  );
}
