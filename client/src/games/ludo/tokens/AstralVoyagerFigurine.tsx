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
 * 12. Astral Voyager (Cosmic Astronaut Helmet)
 * 3D spherical exploration helmet with golden reflective bubble visor,
 * communication antenna, and seat-colored life-support collar.
 */
export function AstralVoyagerFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const visorGradId = `visorGrad_${uid}`;
  const suitGradId = `suitGrad_${uid}`;
  const collarGradId = `collarGrad_${uid}`;
  const rimGradId = `rimGrad_${uid}`;

  return (
    <g className="figurine-astral-voyager">
      <defs>
        {/* Iridescent Gold-Amber Reflective Visor Gradient */}
        <linearGradient id={visorGradId} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FCD34D" />
          <stop offset="55%" stopColor="#D97706" />
          <stop offset="80%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>

        {/* Space-Grade Composite Suit Matte Finish */}
        <linearGradient id={suitGradId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E2E8F0" />
          <stop offset="75%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Seat-colored life-support collar */}
        <linearGradient id={collarGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={dark} />
          <stop offset="50%" stopColor={main} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>

        {/* Metallic Collar Ring */}
        <linearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Shoulder Torso Base (Spacesuit chestplate) */}
      <path
        d="M -26 36 Q -28 26 -20 22 Q 0 20 20 22 Q 28 26 26 36 Q 0 42 -26 36 Z"
        fill={`url(#${suitGradId})`}
        stroke="#475569"
        strokeWidth="1.2"
      />

      {/* Life Support Collar Ring (Seat Colored) */}
      <ellipse cx="0" cy="22" rx="20" ry="7" fill={`url(#${rimGradId})`} />
      <ellipse cx="0" cy="20.5" rx="18" ry="5.5" fill={`url(#${collarGradId})`} stroke="#FFFFFF" strokeWidth="0.8" opacity="0.9" />

      {/* Helmet Shell Base */}
      <ellipse cx="0" cy="-4" rx="23" ry="24" fill={`url(#${suitGradId})`} stroke="#334155" strokeWidth="1.5" />

      {/* Side Comms Modules */}
      <rect x="-24.5" y="-9" width="4" height="10" rx="2" fill="#1E293B" stroke="#64748B" strokeWidth="0.8" />
      <rect x="20.5" y="-9" width="4" height="10" rx="2" fill="#1E293B" stroke="#64748B" strokeWidth="0.8" />
      
      {/* Side Antenna (Right) */}
      <line x1="22.5" y1="-9" x2="26" y2="-28" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="26" cy="-28" r="2" fill={main} stroke="#FFFFFF" strokeWidth="0.6" />

      {/* Visor Recessed Frame */}
      <ellipse cx="0" cy="-4" rx="19.5" ry="17.5" fill="#0F172A" />

      {/* Golden Spherical Visor Glass */}
      <ellipse cx="0" cy="-4" rx="18" ry="16" fill={`url(#${visorGradId})`} />

      {/* Curvature Horizon Reflection */}
      <path
        d="M -16 -4 Q 0 4 16 -4 Q 14 10 0 11 Q -14 10 -16 -4 Z"
        fill="#0284C7"
        opacity="0.35"
      />

      {/* Horizon Star Glint Reflection */}
      <ellipse cx="-7" cy="-11" rx="8" ry="3.5" fill="#FFFFFF" opacity="0.75" transform="rotate(-15, -7, -11)" />
      <ellipse cx="8" cy="4" rx="5" ry="1.8" fill="#FDE047" opacity="0.6" transform="rotate(20, 8, 4)" />

      {/* Oxygen Intake Grill on Chin */}
      <rect x="-6" y="11" width="12" height="3" rx="1.5" fill="#0F172A" stroke="#64748B" strokeWidth="0.5" />
      <line x1="-3" y1="12.5" x2="3" y2="12.5" stroke="#94A3B8" strokeWidth="0.6" />
    </g>
  );
}
