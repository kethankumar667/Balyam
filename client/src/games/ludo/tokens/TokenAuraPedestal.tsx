import React from "react";
import type { LudoColor } from "@shared/types";

interface TokenAuraPedestalProps {
  uid: string;
  color: LudoColor;
  main: string;
  dark: string;
  movable?: boolean;
  auraIntensity?: number;
}

/**
 * 3D Illuminated Ground Dais & Seat-Color Aura Ring.
 *
 * This provides the foundational ground plane for all 16 inventive 3D figurines.
 * It immediately communicates the player's seat color (Red, Green, Yellow, Blue, etc.)
 * across the board, even when the figurine above is crafted from gold, obsidian, or chrome.
 */
export function TokenAuraPedestal({
  uid,
  main,
  dark,
  movable = false,
  auraIntensity = 1,
}: TokenAuraPedestalProps) {
  const auraGradId = `auraGrad_${uid}`;

  return (
    <g className="token-pedestal-root">
      <defs>
        <radialGradient id={auraGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={main} stopOpacity={0.8 * auraIntensity} />
          <stop offset="55%" stopColor={dark} stopOpacity={0.35 * auraIntensity} />
          <stop offset="100%" stopColor={dark} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Cast Contact Shadow */}
      <ellipse cx="0" cy="53" rx="32" ry="7.5" fill="#000000" opacity="0.45" />

      {/* Ground Floor Aura Disc (Seat Color) */}
      <ellipse cx="0" cy="50" rx="42" ry="12" fill={`url(#${auraGradId})`} />

      {/* Pulsing Selection Highlight Ring if movable */}
      {movable && (
        <>
          <ellipse
            cx="0"
            cy="50"
            rx="38"
            ry="11"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            opacity="0.8"
          >
            <animate attributeName="rx" values="32;42;32" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="ry" values="9;13;9" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.4s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="0" cy="50" rx="36" ry="10" fill="none" stroke={main} strokeWidth="2" opacity="0.9" />
        </>
      )}

      {/* Seat-colour dais. A solid disc, not a faint glow: the figurine above is often gold or
       *  chrome, so this is what tells players whose piece it is at board size. */}
      <ellipse cx="0" cy="51" rx="30" ry="8" fill={dark} />
      <ellipse cx="0" cy="48.5" rx="30" ry="8" fill={main} />
      <ellipse cx="0" cy="47" rx="23" ry="4.6" fill="#FFFFFF" opacity="0.2" />
      <ellipse cx="0" cy="48.5" rx="30" ry="8" fill="none" stroke="#F5C542" strokeWidth="1.2" opacity="0.9" />
    </g>
  );
}
