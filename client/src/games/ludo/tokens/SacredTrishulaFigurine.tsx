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
 * 15. Sacred Trishula (Divine Trident with Damru & Flame Tip)
 * 3D polished golden sacred trident with razor spearhead, gracefully curved outer prongs,
 * sacred Damru hourglass drum with binding cords, and seat-colored divine flame.
 */
export function SacredTrishulaFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const goldGradId = `goldGrad_${uid}`;
  const flameGradId = `flameGrad_${uid}`;
  const damruGradId = `damruGrad_${uid}`;

  return (
    <g className="figurine-sacred-trishula">
      <defs>
        {/* Divine Polished Gold Gradient */}
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FDE047" />
          <stop offset="55%" stopColor="#EAB308" />
          <stop offset="80%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Sacred Eternal Aura Flame */}
        <linearGradient id={flameGradId} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={dark} />
          <stop offset="40%" stopColor={main} />
          <stop offset="80%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* Sandalwood/Brass Damru Gradient */}
        <linearGradient id={damruGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="30%" stopColor="#D97706" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Stepped Temple Base Pedestal */}
      <ellipse cx="0" cy="34" rx="20" ry="8" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="1" />
      <ellipse cx="0" cy="31" rx="16" ry="6" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />
      <ellipse cx="0" cy="27" rx="12" ry="4.5" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />

      {/* Golden Shaft */}
      <rect x="-3" y="2" width="6" height="26" rx="2" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />
      {/* Shaft Grip Rings */}
      <ellipse cx="0" cy="18" rx="4.5" ry="1.8" fill={`url(#${goldGradId})`} stroke="#FFFBEB" strokeWidth="0.6" />
      <ellipse cx="0" cy="10" rx="4.5" ry="1.8" fill={`url(#${goldGradId})`} stroke="#FFFBEB" strokeWidth="0.6" />

      {/* Sacred Damru (Hourglass Drum) Mounted on Shaft */}
      <path
        d="M -9 11 L -1 16 L -9 21 L 9 21 L 1 16 L 9 11 Z"
        fill={`url(#${damruGradId})`}
        stroke="#78350F"
        strokeWidth="0.8"
      />
      {/* Damru Binding Cords with Seat Color */}
      <line x1="-8" y1="11" x2="8" y2="21" stroke={main} strokeWidth="0.8" />
      <line x1="-8" y1="21" x2="8" y2="11" stroke={main} strokeWidth="0.8" />
      {/* Damru Beads */}
      <circle cx="-11" cy="18" r="1.5" fill="#FEF08A" stroke="#78350F" strokeWidth="0.5" />
      <circle cx="11" cy="14" r="1.5" fill="#FEF08A" stroke="#78350F" strokeWidth="0.5" />

      {/* Trishula Head Base Mount Collar */}
      <ellipse cx="0" cy="2" rx="7" ry="3" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.8" />

      {/* Outer Prongs (Curved Barbed Horns) */}
      {/* Left Prong */}
      <path
        d="M -4 2 Q -22 -2 -24 -24 Q -22 -14 -16 -12 Q -12 -10 -3 -5 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1"
      />
      {/* Left Prong Spear Tip Barbs */}
      <polygon points="-24,-24 -20,-17 -25,-16" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.5" />

      {/* Right Prong */}
      <path
        d="M 4 2 Q 22 -2 24 -24 Q 22 -14 16 -12 Q 12 -10 3 -5 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1"
      />
      {/* Right Prong Spear Tip Barbs */}
      <polygon points="24,-24 20,-17 25,-16" fill={`url(#${goldGradId})`} stroke="#78350F" strokeWidth="0.5" />

      {/* Central Razor Spear Blade */}
      <path
        d="M -4 0 L -6 -20 L 0 -44 L 6 -20 L 4 0 Z"
        fill={`url(#${goldGradId})`}
        stroke="#78350F"
        strokeWidth="1.2"
      />
      {/* Central Blade Ridge Line */}
      <line x1="0" y1="0" x2="0" y2="-43" stroke="#FFFBEB" strokeWidth="0.9" />

      {/* Divine Flame Tip Hovering on Apex (Seat Colored) */}
      <path
        d="M 0 -44 Q -6 -50 0 -58 Q 6 -50 0 -44 Z"
        fill={`url(#${flameGradId})`}
        opacity="0.95"
      />
      <circle cx="0" cy="-51" r="2" fill="#FFFFFF" opacity="0.8" />
    </g>
  );
}
