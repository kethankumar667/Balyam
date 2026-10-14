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
 * 4. Signet of Empire
 * Heavy beveled golden signet ring bearing an embossed imperial seal crest.
 */
export function SignetEmpireFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;
  const sealGradId = `sealGrad_${uid}`;

  return (
    <g className="figurine-signet-empire">
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="30%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        <radialGradient id={sealGradId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={main} />
          <stop offset="70%" stopColor={dark} />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* 3D Ring Band */}
      <ellipse cx="0" cy="30" rx="22" ry="11" fill="none" stroke={`url(#${goldGradId})`} strokeWidth="7" />
      <ellipse cx="0" cy="29" rx="21" ry="10" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />

      {/* Signet Bezel Table */}
      <polygon
        points="-18,15 18,15 13,-10 -13,-10"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1.2"
      />

      {/* Inset Seal Gemstone (Seat Color) */}
      <ellipse cx="0" cy="2" rx="11" ry="7" fill={`url(#${sealGradId})`} stroke={`url(#${goldGradId})`} strokeWidth="1" />

      {/* Embossed Imperial Shield & Star */}
      <polygon points="0,-2 3.5,2 0,6 -3.5,2" fill="#FFFFFF" opacity="0.9" />
      <circle cx="-5" cy="2" r="1.2" fill={`url(#${goldGradId})`} />
      <circle cx="5" cy="2" r="1.2" fill={`url(#${goldGradId})`} />
    </g>
  );
}
