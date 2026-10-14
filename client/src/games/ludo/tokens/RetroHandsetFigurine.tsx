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
 * 16. Retro Handset (indestructible retro brick phone)
 * 3D collectible retro cell phone with iconic dark blue casing, silver faceplate bezel,
 * green-backlit monochrome LCD screen running tiny pixel Snake, rubber keypad, and indestructible aura.
 */
export function RetroHandsetFigurine({ uid, color, main, dark, movable }: FigurineProps) {
  const caseGradId = `caseGrad_${uid}`;
  const bezelGradId = `bezelGrad_${uid}`;
  const lcdGradId = `lcdGrad_${uid}`;
  const keyGradId = `keyGrad_${uid}`;

  return (
    <g className="figurine-retro-handset">
      <defs>
        {/* Iconic Dark Navy Matte Phone Casing */}
        <linearGradient id={caseGradId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="40%" stopColor="#172554" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Silver Curved Faceplate Bezel */}
        <linearGradient id={bezelGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Nostalgic Monochrome Green-Backlit LCD Screen */}
        <linearGradient id={lcdGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BBF7D0" />
          <stop offset="50%" stopColor="#86EFAC" />
          <stop offset="100%" stopColor="#4ADE80" />
        </linearGradient>

        {/* Rubber Keypad Buttons */}
        <linearGradient id={keyGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      <TokenAuraPedestal uid={uid} color={color} main={main} dark={dark} movable={movable} />

      {/* Main Chunky Phone Body with Rounded Corners */}
      <rect
        x="-18"
        y="-32"
        width="36"
        height="64"
        rx="9"
        fill={`url(#${caseGradId})`}
        stroke="#0F172A"
        strokeWidth="1.5"
      />

      {/* Inner Faceplate Bezel (Silver contoured collar) */}
      <path
        d="M -15 -27 Q 0 -30 15 -27 Q 16 0 14 26 Q 0 28 -14 26 Q -16 0 -15 -27 Z"
        fill={`url(#${bezelGradId})`}
        stroke="#334155"
        strokeWidth="0.8"
      />

      {/* Earpiece Speaker Slot */}
      <rect x="-6" y="-24" width="12" height="2" rx="1" fill="#0F172A" />

      {/* Green LCD Screen Recess & Display */}
      <rect
        x="-12"
        y="-19"
        width="24"
        height="18"
        rx="2"
        fill="#052E16"
        stroke="#166534"
        strokeWidth="0.8"
      />
      <rect
        x="-11"
        y="-18"
        width="22"
        height="16"
        rx="1"
        fill={`url(#${lcdGradId})`}
      />

      {/* Pixel Snake Art on Screen! */}
      {/* Snake body blocks */}
      <rect x="-8" y="-12" width="2" height="2" fill="#064E3B" />
      <rect x="-6" y="-12" width="2" height="2" fill="#064E3B" />
      <rect x="-4" y="-12" width="2" height="2" fill="#064E3B" />
      <rect x="-4" y="-14" width="2" height="2" fill="#064E3B" />
      <rect x="-2" y="-14" width="2" height="2" fill="#064E3B" />
      <rect x="0" y="-14" width="2" height="2" fill="#064E3B" />
      <rect x="0" y="-16" width="2" height="2" fill="#064E3B" />
      {/* Snake food dot */}
      <rect x="5" y="-10" width="2" height="2" fill="#064E3B" />

      {/* Main Navi Key / Selection Bar (Seat colored accent) */}
      <rect
        x="-7"
        y="1"
        width="14"
        height="3.5"
        rx="1.5"
        fill={main}
        stroke="#0F172A"
        strokeWidth="0.6"
      />
      {/* C / Clear Buttons on sides */}
      <rect x="-13" y="1" width="4.5" height="3" rx="1" fill={`url(#${keyGradId})`} />
      <rect x="8.5" y="1" width="4.5" height="3" rx="1" fill={`url(#${keyGradId})`} />

      {/* 3x4 Rubber Numeric Keypad */}
      {/* Row 1: 1, 2, 3 */}
      <circle cx="-9" cy="8" r="1.8" fill={`url(#${keyGradId})`} />
      <circle cx="0" cy="8" r="1.8" fill={`url(#${keyGradId})`} />
      <circle cx="9" cy="8" r="1.8" fill={`url(#${keyGradId})`} />

      {/* Row 2: 4, 5, 6 */}
      <circle cx="-9" cy="13" r="1.8" fill={`url(#${keyGradId})`} />
      <circle cx="0" cy="13" r="1.8" fill={`url(#${keyGradId})`} />
      <circle cx="9" cy="13" r="1.8" fill={`url(#${keyGradId})`} />

      {/* Row 3: 7, 8, 9 */}
      <circle cx="-9" cy="18" r="1.8" fill={`url(#${keyGradId})`} />
      <circle cx="0" cy="18" r="1.8" fill={`url(#${keyGradId})`} />
      <circle cx="9" cy="18" r="1.8" fill={`url(#${keyGradId})`} />

      {/* Row 4: *, 0, # */}
      <circle cx="-8" cy="23" r="1.5" fill={`url(#${keyGradId})`} />
      <circle cx="0" cy="23" r="1.5" fill={`url(#${keyGradId})`} />
      <circle cx="8" cy="23" r="1.5" fill={`url(#${keyGradId})`} />

      {/* Microphone Hole on Bottom */}
      <circle cx="-5" cy="28" r="0.8" fill="#0F172A" />

      {/* Specular Highlight along Left Edge */}
      <path
        d="M -16 -26 Q -17 0 -15 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        opacity="0.4"
      />
    </g>
  );
}
