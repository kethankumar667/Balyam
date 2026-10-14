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
 * 5. Draco Inferno
 * Sculpted miniature coiled magma dragon on a volcanic rock plinth with glowing gold horns.
 */
export function DracoInfernoFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const magmaGradId = `magmaGrad_${uid}`;
  const goldGradId = `goldGrad_${uid}`;

  return (
    <g className="figurine-draco-inferno">
      <defs>
        <linearGradient id={magmaGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="35%" stopColor={main} />
          <stop offset="70%" stopColor={dark} />
          <stop offset="100%" stopColor="#431407" />
        </linearGradient>

        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Volcanic Rock Plinth */}
      <polygon points="-24,45 -16,36 16,36 24,45" fill="#1C1917" stroke="#EA580C" strokeWidth="1" />

      {/* Coiled 3D Dragon Body (Obsidian & Magma) */}
      <path
        d="M -18 36 Q -25 15 -12 2 Q 0 -5 12 5 Q 24 15 16 36 Q 0 42 -18 36 Z"
        fill={`url(#${magmaGradId})`}
        stroke="#431407"
        strokeWidth="1.2"
      />

      {/* Folded Wings */}
      <path
        d="M -15 18 Q -30 2 -22 -6 Q -14 5 -10 12"
        fill={`url(#${magmaGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />
      <path
        d="M 15 18 Q 30 2 22 -6 Q 14 5 10 12"
        fill={`url(#${magmaGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />

      {/* Sculpted Dragon Head */}
      <path
        d="M -10 6 Q -14 -10 -4 -18 Q 6 -16 10 -4 Q 12 10 2 10 Z"
        fill="#7C2D12"
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />

      {/* Curved Golden Horns */}
      <path
        d="M -5 -16 Q -14 -28 -22 -24 Q -12 -16 -6 -12 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="0.8"
      />
      <path
        d="M 5 -16 Q 14 -28 22 -24 Q 12 -16 6 -12 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="0.8"
      />

      {/* Glowing Slit Eye */}
      <circle cx="-3" cy="-7" r="1.5" fill="#FEF08A" />
      <circle cx="5" cy="-7" r="1.5" fill="#FEF08A" />

      {/* Ember Breath Arc */}
      <path d="M -5 2 Q 0 6 5 2" stroke="#FDE047" strokeWidth="1.5" fill="none" />

      {/* Floating Ember Particles */}
      <circle cx="-16" cy="-8" r="1.2" fill="#F97316" />
      <circle cx="18" cy="-14" r="1" fill="#FBBF24" />
    </g>
  );
}
