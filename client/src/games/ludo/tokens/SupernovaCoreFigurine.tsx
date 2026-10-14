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
 * 11. Supernova Core
 * Subatomic stellar fusion plasma star bound by 4 titanium magnetic containment pylons.
 */
export function SupernovaCoreFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const chromeGradId = `chromeGrad_${uid}`;
  const plasmaGradId = `plasmaGrad_${uid}`;

  return (
    <g className="figurine-supernova-core">
      <defs>
        <linearGradient id={chromeGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#CBD5E1" />
          <stop offset="70%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        <radialGradient id={plasmaGradId} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor={main} />
          <stop offset="75%" stopColor={dark} />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Magnetic Containment Field Ring */}
      <circle
        cx="0"
        cy="15"
        r="18"
        fill="none"
        stroke="#E879F9"
        strokeWidth="1.2"
        strokeDasharray="4 2"
        opacity="0.8"
      />

      {/* Glowing Star Plasma Sphere */}
      <circle cx="0" cy="15" r="14" fill={`url(#${plasmaGradId})`} />
      <circle cx="0" cy="15" r="7" fill="#FFFFFF" opacity="0.9" />

      {/* 4 Titanium Magnetic Pylons */}
      <polygon points="-22,15 -17,11 -17,19" fill={`url(#${chromeGradId})`} stroke="#A855F7" strokeWidth="0.8" />
      <polygon points="22,15 17,11 17,19" fill={`url(#${chromeGradId})`} stroke="#A855F7" strokeWidth="0.8" />
      <polygon points="0,-7 -4,-2 4,-2" fill={`url(#${chromeGradId})`} stroke="#A855F7" strokeWidth="0.8" />
      <polygon points="0,37 -4,32 4,32" fill={`url(#${chromeGradId})`} stroke="#A855F7" strokeWidth="0.8" />
    </g>
  );
}
