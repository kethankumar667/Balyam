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
 * 9. Neo Valkyrie
 * Anti-gravity hover drone with dual cyan plasma thrusters and holographic ground ring.
 */
export function NeoValkyrieFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const chromeGradId = `chromeGrad_${uid}`;
  const plasmaGradId = `plasmaGrad_${uid}`;

  return (
    <g className="figurine-neo-valkyrie">
      <defs>
        <linearGradient id={chromeGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#E2E8F0" />
          <stop offset="60%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        <radialGradient id={plasmaGradId} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#CFFAFE" />
          <stop offset="45%" stopColor={main} />
          <stop offset="85%" stopColor={dark} />
          <stop offset="100%" stopColor="#082F49" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Holographic Concentric Grid on Floor */}
      <ellipse cx="0" cy="48" rx="26" ry="7" fill="none" stroke="#06B6D4" strokeWidth="1" strokeDasharray="4 2" />

      {/* Floating Anti-Grav Propulsion Ring (Hovering above plinth) */}
      <ellipse cx="0" cy="34" rx="26" ry="6.5" fill="none" stroke={`url(#${plasmaGradId})`} strokeWidth="3" />
      <ellipse cx="0" cy="33.5" rx="25.5" ry="6" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />

      {/* Aerodynamic Chrome Body */}
      <path
        d="M -16 26 L -9 -6 Q 0 -18 9 -6 L 16 26 Q 0 34 -16 26 Z"
        fill={`url(#${chromeGradId})`}
        stroke="#0891B2"
        strokeWidth="1"
      />

      {/* Stabilizer Winglets */}
      <polygon points="-16,24 -26,14 -19,10 -13,15" fill="#1E293B" stroke="#06B6D4" strokeWidth="1" />
      <polygon points="16,24 26,14 19,10 13,15" fill="#1E293B" stroke="#06B6D4" strokeWidth="1" />

      {/* Glowing Visor Plasma Sphere */}
      <ellipse cx="0" cy="4" rx="7" ry="4.5" fill={`url(#${plasmaGradId})`} stroke="#E0F2FE" strokeWidth="0.8" />
      <line x1="-7" y1="4" x2="7" y2="4" stroke="#FFFFFF" strokeWidth="0.8" />

      {/* Top Beacon Antenna */}
      <line x1="0" y1="-14" x2="0" y2="-24" stroke="#06B6D4" strokeWidth="1.5" />
      <circle cx="0" cy="-25" r="2.2" fill="#38BDF8" />
    </g>
  );
}
