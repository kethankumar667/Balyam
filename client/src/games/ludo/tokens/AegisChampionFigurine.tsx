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
 * 13. Aegis Champion (Spartan Corinthian Bronze Helmet)
 * 3D hammered bronze warrior helmet with majestic horsehair crest,
 * sharp nasal guard, flared cheek plates, and glowing warrior gaze.
 */
export function AegisChampionFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const bronzeGradId = `bronzeGrad_${uid}`;
  const crestGradId = `crestGrad_${uid}`;
  const eyeGlowId = `eyeGlow_${uid}`;

  return (
    <g className="figurine-aegis-champion">
      <defs>
        {/* Ancient Beaten Bronze Metallic Gradient */}
        <linearGradient id={bronzeGradId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="25%" stopColor="#CA8A04" />
          <stop offset="55%" stopColor="#A16207" />
          <stop offset="80%" stopColor="#713F12" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>

        {/* Horsehair Crest Plume with Seat-Color Accent */}
        <linearGradient id={crestGradId} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#7F1D1D" />
          <stop offset="40%" stopColor={main} />
          <stop offset="80%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#FEE2E2" />
        </linearGradient>

        {/* Warrior Eye Gaze */}
        <radialGradient id={eyeGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor={main} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Horsehair Crest Box Mount & Majestic Plume */}
      <path
        d="M -3 0 Q -24 -24 -20 -44 Q -4 -54 18 -46 Q 30 -38 24 -12 Q 10 -40 -3 -30 Z"
        fill={`url(#${crestGradId})`}
        stroke="#450A0A"
        strokeWidth="1.2"
      />
      {/* Transverse Crest Bristle Highlights */}
      <path
        d="M -18 -40 Q 0 -48 16 -42"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        opacity="0.6"
      />

      {/* Crest Bronze Spine Channel */}
      <path
        d="M -2 -2 Q -12 -20 -10 -35 Q 0 -40 10 -35 Q 12 -20 2 -2 Z"
        fill={`url(#${bronzeGradId})`}
        stroke="#451A03"
        strokeWidth="1"
      />

      {/* Main Bronze Helmet Dome */}
      <path
        d="M -22 18 C -24 -14, 24 -14, 22 18 C 18 34, -18 34, -22 18 Z"
        fill={`url(#${bronzeGradId})`}
        stroke="#451A03"
        strokeWidth="1.2"
      />

      {/* Cheek Guards and Nose Guard Cutouts */}
      {/* Left Cheek Plate */}
      <path
        d="M -22 15 L -20 34 L -8 32 L -10 18 Z"
        fill={`url(#${bronzeGradId})`}
        stroke="#451A03"
        strokeWidth="0.8"
      />
      {/* Right Cheek Plate */}
      <path
        d="M 22 15 L 20 34 L 8 32 L 10 18 Z"
        fill={`url(#${bronzeGradId})`}
        stroke="#451A03"
        strokeWidth="0.8"
      />

      {/* Corinthian Nasal Guard */}
      <polygon
        points="-3.5,6 3.5,6 2,27 -2,27"
        fill={`url(#${bronzeGradId})`}
        stroke="#451A03"
        strokeWidth="0.8"
      />

      {/* Almond Eye Cutouts (Deep Shadow) */}
      {/* Left Eye Slit */}
      <path d="M -17 12 Q -11 8 -5 13 Q -11 16 -17 12 Z" fill="#0F172A" />
      <circle cx="-11" cy="12" r="1.8" fill={`url(#${eyeGlowId})`} />

      {/* Right Eye Slit */}
      <path d="M 17 12 Q 11 8 5 13 Q 11 16 17 12 Z" fill="#0F172A" />
      <circle cx="11" cy="12" r="1.8" fill={`url(#${eyeGlowId})`} />

      {/* Beveled Brow Ridge */}
      <path
        d="M -20 6 Q -10 2 0 6 Q 10 2 20 6"
        fill="none"
        stroke="#FEF08A"
        strokeWidth="1.2"
        opacity="0.8"
      />

      {/* Bronze Crest Base Screws/Rivets */}
      <circle cx="-5" cy="-18" r="1" fill="#FEF08A" />
      <circle cx="5" cy="-18" r="1" fill="#FEF08A" />
    </g>
  );
}
