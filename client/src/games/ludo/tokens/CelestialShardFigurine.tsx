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
 * 10. Celestial Shard
 * Geometric multi-faceted gemstone suspended in spinning golden orbital gimbals.
 */
export function CelestialShardFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;
  const crystalGradId = `crystalGrad_${uid}`;

  return (
    <g className="figurine-celestial-shard">
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        <linearGradient id={crystalGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="30%" stopColor={main} />
          <stop offset="75%" stopColor={dark} />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Golden Orbital Gyro Rings */}
      <ellipse
        cx="0"
        cy="15"
        rx="24"
        ry="24"
        fill="none"
        stroke={`url(#${goldGradId})`}
        strokeWidth="2"
        transform="rotate(25 0 15)"
      />
      <ellipse
        cx="0"
        cy="15"
        rx="22"
        ry="9"
        fill="none"
        stroke={`url(#${goldGradId})`}
        strokeWidth="1.5"
        transform="rotate(-35 0 15)"
      />

      {/* Floating 3D Faceted Crystal Gemstone */}
      {/* Back Facets */}
      <polygon points="0,-15 -14,6 0,32" fill="#047857" opacity="0.9" />
      <polygon points="0,-15 14,6 0,32" fill="#065F46" opacity="0.9" />

      {/* Front Facets */}
      <polygon points="0,-15 -8,12 0,36" fill={`url(#${crystalGradId})`} />
      <polygon points="0,-15 8,12 0,36" fill="#6EE7B7" opacity="0.8" />
      <polygon points="-14,6 -8,12 0,36 0,32" fill={main} />
      <polygon points="14,6 8,12 0,36 0,32" fill={dark} />

      {/* Caustic Center Light Core */}
      <circle cx="0" cy="12" r="4" fill="#FFFFFF" opacity="0.8" />

      {/* Specular Bevel Edges */}
      <line x1="0" y1="-15" x2="0" y2="36" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
      <line x1="-14" y1="6" x2="14" y2="6" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.7" />
    </g>
  );
}
