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
 * 14. Samurai Shogun (Kabuto Helmet & Golden Kuwagata Horns)
 * 3D black-lacquered Kabuto war helmet with majestic golden Kuwagata antler horns,
 * tiered neck guard (shikoro) with seat-colored silk cord lacing, and ceremonial crest.
 */
export function SamuraiShogunFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const lacquerGradId = `lacquerGrad_${uid}`;
  const goldGradId = `goldGrad_${uid}`;
  const silkGradId = `silkGrad_${uid}`;

  return (
    <g className="figurine-samurai-shogun">
      <defs>
        {/* Glossy Black Urushi Lacquer Gradient */}
        <linearGradient id={lacquerGradId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="30%" stopColor="#1E293B" />
          <stop offset="70%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Polished Brass/Gold Kuwagata Horns */}
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#EAB308" />
          <stop offset="70%" stopColor="#CA8A04" />
          <stop offset="100%" stopColor="#713F12" />
        </linearGradient>

        {/* Seat-colored silk cord lacing */}
        <linearGradient id={silkGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={main} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Tiered Neck Guard (Shikoro) - 3 Tiered Planks */}
      {/* Tier 3 (Bottom) */}
      <path
        d="M -26 34 Q 0 42 26 34 L 28 39 Q 0 47 -28 39 Z"
        fill={`url(#${lacquerGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="0.8"
      />
      {/* Tier 2 (Middle) */}
      <path
        d="M -24 28 Q 0 35 24 28 L 26 33 Q 0 40 -26 33 Z"
        fill={`url(#${silkGradId})`}
        stroke="#0F172A"
        strokeWidth="0.8"
      />
      {/* Tier 1 (Top) */}
      <path
        d="M -22 22 Q 0 28 22 22 L 24 27 Q 0 33 -24 27 Z"
        fill={`url(#${lacquerGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="0.8"
      />

      {/* Main Dome Bowl (Hachi) */}
      <path
        d="M -20 22 C -23 -2, 23 -2, 20 22 Z"
        fill={`url(#${lacquerGradId})`}
        stroke="#0F172A"
        strokeWidth="1.2"
      />

      {/* Hachi Rib Ridges */}
      <path d="M 0 22 L 0 0" stroke="#64748B" strokeWidth="0.8" opacity="0.6" />
      <path d="M -10 21 Q -7 10 -5 0" stroke="#64748B" strokeWidth="0.8" opacity="0.6" />
      <path d="M 10 21 Q 7 10 5 0" stroke="#64748B" strokeWidth="0.8" opacity="0.6" />

      {/* Fukikaeshi (Curved Wing Flaps on Sides) */}
      {/* Left Wing */}
      <path
        d="M -20 18 Q -28 10 -26 0 Q -18 8 -18 18 Z"
        fill={`url(#${lacquerGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />
      {/* Right Wing */}
      <path
        d="M 20 18 Q 28 10 26 0 Q 18 8 18 18 Z"
        fill={`url(#${lacquerGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1"
      />

      {/* Golden Kuwagata Horns (Wide Curved Antlers) */}
      {/* Left Horn */}
      <path
        d="M -3 3 Q -15 -20 -30 -35 Q -22 -32 -18 -24 Q -7 -9 0 -2 Z"
        fill={`url(#${goldGradId})`}
        stroke="#713F12"
        strokeWidth="1"
      />
      {/* Right Horn */}
      <path
        d="M 3 3 Q 15 -20 30 -35 Q 22 -32 18 -24 Q 7 -9 0 -2 Z"
        fill={`url(#${goldGradId})`}
        stroke="#713F12"
        strokeWidth="1"
      />

      {/* Center Crest Disc (Maedate - Sun Disc with seat color) */}
      <circle cx="0" cy="2" r="6.5" fill={`url(#${goldGradId})`} stroke="#713F12" strokeWidth="1" />
      <circle cx="0" cy="2" r="4.2" fill={main} stroke="#FFFFFF" strokeWidth="0.6" />

      {/* Brow Visor (Mabisashi) */}
      <path
        d="M -16 12 Q 0 8 16 12 Q 13 16 0 14 Q -13 16 -16 12 Z"
        fill={`url(#${lacquerGradId})`}
        stroke={`url(#${goldGradId})`}
        strokeWidth="0.8"
      />
    </g>
  );
}
