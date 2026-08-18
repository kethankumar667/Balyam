import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { UnoCardBack } from "./uno-shared";
import { UnoTableCenter, type UnoTableCenterProps } from "./uno-table";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import Avatar from "../rummy/Avatar";
import QrCodeModal from "../../components/QrCodeModal";
import { CheckIcon, ChatIcon, ClockIcon, CrownIcon, DiceIcon, GearIcon, StarIcon } from "./uno-icons";

/**
 * "Stadium" chrome — the dark-maroon, grid-seated mobile UNO redesign
 * (reference: max-players/8-seat landscape mockup). Deliberately a
 * SEPARATE visual system from uno-table.tsx/uno-scene.tsx's wood-table +
 * ivory-button look, which UnoBoardDesktop.tsx still uses unchanged: this
 * file is imported ONLY by UnoBoardMobile.tsx. Only two genuinely game-
 * mechanical pieces are reused rather than reimplemented — UnoTableCenter
 * (draw/discard pile behaviour, drag-drop target) and UnoCardBack (the
 * face-down card art) — everything else here is presentation.
 */

// ---------------------------------------------------------------------
// Seating — maps the server's rotation-order `playerOrder` array onto the
// reference's fixed 1-top + 3-right + 3-left + self-bottom grid, for any
// player count from 2 to the game's 8-player cap (registry.ts).
//
// The reference's own seat numbers (1 top, 2-4 right top→bottom, 5 self,
// 6-8 left bottom→top, wrapping back to 1) trace one full clockwise lap
// starting right after the local player. So: walk `playerOrder` forward
// from self, excluding self — the first `leftCount` opponents encountered
// become the LEFT column (closest-to-self first, i.e. bottom-most), the
// next one is the spotlight seat, and the rest (up to 3) become the RIGHT
// column (closest-to-spotlight first, i.e. top-most) — closing the loop
// back at self. `leftCount`/`rightCount` split the remaining opponents as
// evenly as possible, capped at 3 per side (max 8 players = 1 + 3 + 1 + 3).
// ---------------------------------------------------------------------

export interface StadiumSeating {
  spotlight: string | null;
  /** Closest-to-spotlight first (rendered top-to-bottom as-is). */
  right: string[];
  /** Closest-to-self first (rendered bottom-to-top, i.e. reversed). */
  left: string[];
}

export function computeStadiumSeating(playerOrder: string[], selfId: string | null): StadiumSeating {
  const empty: StadiumSeating = { spotlight: null, right: [], left: [] };
  if (!selfId) return empty;
  const n = playerOrder.length;
  const selfIdx = playerOrder.indexOf(selfId);
  if (selfIdx === -1) return empty;
  const afterSelf: string[] = [];
  for (let i = 1; i < n; i++) afterSelf.push(playerOrder[(selfIdx + i) % n]);
  const total = afterSelf.length;
  if (total === 0) return empty;
  const remaining = total - 1;
  const leftCount = Math.min(3, Math.floor(remaining / 2));
  const rightCount = Math.min(3, remaining - leftCount);
  const left = afterSelf.slice(0, leftCount);
  const spotlight = afterSelf[leftCount] ?? null;
  const right = afterSelf.slice(leftCount + 1, leftCount + 1 + rightCount);
  return { spotlight, right, left };
}

/** Reference-matching seat number badges: 1 = spotlight, 2..(1+right.length)
 *  = right column top-to-bottom, next = self, remaining = left column
 *  bottom-to-top (continuing the same clockwise lap). */
export function computeSeatNumbers(seating: StadiumSeating, selfId: string | null): Record<string, number> {
  const numbers: Record<string, number> = {};
  let n = 1;
  if (seating.spotlight) numbers[seating.spotlight] = n++;
  for (const id of seating.right) numbers[id] = n++;
  if (selfId) numbers[selfId] = n++;
  for (const id of seating.left) numbers[id] = n++;
  return numbers;
}

/** Evenly spaces 0-3 seats down a side rail between the spotlight and self
 *  slots, so a 1- or 2-opponent side isn't stranded at the top. */
function sideTops(count: number, top: number, bottom: number): string[] {
  if (count === 0) return [];
  if (count === 1) return [`${(top + bottom) / 2}%`];
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, i) => `${top + step * i}%`);
}

export interface StadiumSeatPos {
  left: string;
  top: string;
}

/**
 * Seat ring geometry.
 *
 * "edge" — seats pinned to the screen edges. Right for a short landscape
 * PHONE, where the edges are only a few hundred px from the pile anyway.
 *
 * "ring" — seats on an ellipse drawn AROUND the pile, which is what the
 * reference actually shows. On a desktop the edge layout falls apart: at
 * 1920px the columns land at x≈40 and x≈1880 while the pile sits at 960, so
 * ~700px of empty felt opens up on either side and the table stops reading as
 * a table. The ring keeps every seat in one glance-able group.
 */
export type StadiumLayout = "edge" | "ring";

export function computeStadiumPositions(
  seating: StadiumSeating,
  selfId: string | null,
  layout: StadiumLayout = "edge",
  isMobile: boolean = false,
): Record<string, StadiumSeatPos> {
  const pos: Record<string, StadiumSeatPos> = {};

  if (isMobile) {
    // Mobile Portrait Seat Positioning (calibrated for portrait phone screens)
    if (seating.spotlight) {
      pos[seating.spotlight] = { left: "50%", top: "8%" };
    }
    const rightCount = seating.right.length;
    if (rightCount === 1) {
      pos[seating.right[0]] = { left: "78%", top: "40%" };
    } else if (rightCount === 2) {
      pos[seating.right[0]] = { left: "78%", top: "24%" };
      pos[seating.right[1]] = { left: "78%", top: "54%" };
    } else if (rightCount >= 3) {
      pos[seating.right[0]] = { left: "76%", top: "20%" };
      pos[seating.right[1]] = { left: "80%", top: "38%" };
      pos[seating.right[2]] = { left: "76%", top: "56%" };
    }

    const leftCount = seating.left.length;
    if (leftCount === 1) {
      pos[seating.left[0]] = { left: "22%", top: "40%" };
    } else if (leftCount === 2) {
      pos[seating.left[0]] = { left: "22%", top: "54%" };
      pos[seating.left[1]] = { left: "22%", top: "24%" };
    } else if (leftCount >= 3) {
      pos[seating.left[0]] = { left: "24%", top: "56%" };
      pos[seating.left[1]] = { left: "20%", top: "38%" };
      pos[seating.left[2]] = { left: "24%", top: "20%" };
    }

    if (selfId) {
      pos[selfId] = { left: "26%", top: "70%" };
    }
    return pos;
  }

  // Spotlight seat (top center — positioned at 9% to sit cleanly under top header)
  if (seating.spotlight) {
    pos[seating.spotlight] = { left: "50%", top: "9%" };
  }

  // Right column seats
  const rightCount = seating.right.length;
  if (rightCount === 1) {
    pos[seating.right[0]] = { left: "88%", top: "42%" };
  } else if (rightCount === 2) {
    pos[seating.right[0]] = { left: "78%", top: "15%" };
    pos[seating.right[1]] = { left: "88%", top: "54%" };
  } else if (rightCount >= 3) {
    pos[seating.right[0]] = { left: "75%", top: "15%" }; // Top-Right Shoulder (Khatarnak)
    pos[seating.right[1]] = { left: "91%", top: "37%" }; // Mid-Right Flank (Raftaar)
    pos[seating.right[2]] = { left: "84%", top: "62%" }; // Bottom-Right Hip (Bijli)
  }

  // Left column seats (seating.left is closest-to-self-first: bottom-to-top)
  const leftCount = seating.left.length;
  const l0 = seating.left[0];
  const l1 = seating.left[1];
  const l2 = seating.left[2];
  if (leftCount === 1 && l0) {
    pos[l0] = { left: "12%", top: "42%" };
  } else if (leftCount === 2) {
    if (l0) pos[l0] = { left: "14%", top: "56%" };
    if (l1) pos[l1] = { left: "22%", top: "15%" };
  } else if (leftCount >= 3) {
    if (l0) pos[l0] = { left: "16%", top: "62%" }; // Bottom-Left Hip (Jugadu)
    if (l1) pos[l1] = { left: "9%", top: "37%" }; // Mid-Left Flank (Baazi)
    if (l2) pos[l2] = { left: "25%", top: "15%" }; // Top-Left Shoulder (Chikki)
  }

  // Self seat (YOU) — on desktop centered at bottom; on mobile positioned at bottom-left
  if (selfId) {
    pos[selfId] = isMobile ? { left: "8%", top: "78%" } : { left: "50%", top: "75%" };
  }

  return pos;
}

export function stadiumSeatList(seating: StadiumSeating): Array<{ id: string; variant: "spotlight" | "side" }> {
  const seats: Array<{ id: string; variant: "spotlight" | "side" }> = [];
  if (seating.spotlight) seats.push({ id: seating.spotlight, variant: "spotlight" });
  for (const id of seating.right) seats.push({ id, variant: "side" });
  for (const id of seating.left) seats.push({ id, variant: "side" });
  return seats;
}

// ---------------------------------------------------------------------
// Avatar accent palette — deterministic per name, independent of
// uno-table.tsx's own (module-private) PLATE_ACCENTS, matching this
// file's local-decorative-palette convention (see uno-table.tsx's
// WILD_COLOR_SWATCH comment for the precedent).
// ---------------------------------------------------------------------

interface StadiumAccent {
  light: string;
  base: string;
  dark: string;
  border: string;
}
const STADIUM_ACCENTS: readonly StadiumAccent[] = [
  { light: "#F6C24B", base: "#E0982A", dark: "#A96A16", border: "#EAB308" }, // gold/yellow
  { light: "#C9A0F5", base: "#9B5FE0", dark: "#6B35A8", border: "#A855F7" }, // purple
  { light: "#5BC46B", base: "#2FA043", dark: "#1E7A30", border: "#10B981" }, // green
  { light: "#5AA9F0", base: "#2E7CD0", dark: "#1C57A0", border: "#3B82F6" }, // blue
  { light: "#F0708A", base: "#D23E5E", dark: "#A01C3A", border: "#EC4899" }, // pink
  { light: "#3FD0C4", base: "#17A79A", dark: "#0E7A70", border: "#06B6D4" }, // cyan
  { light: "#F5924B", base: "#E06E1E", dark: "#A84D0E", border: "#F97316" }, // orange
];
const SELF_STADIUM_ACCENT: StadiumAccent = { light: "#38bdf8", base: "#0284c7", dark: "#0369a1", border: "#38bdf8" };

function stadiumAccentFor(seed: string): StadiumAccent {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return STADIUM_ACCENTS[Math.abs(h) % STADIUM_ACCENTS.length] ?? STADIUM_ACCENTS[0]!;
}

// ---------------------------------------------------------------------
// Background — bright-red radial arena matching the reference: a lit
// centre bloom, a faint tiled UNO-card watermark, concentric ripple
// rings, and a soft red vignette pulling the edges down.
// ---------------------------------------------------------------------

/** Seamless full-bleed board surface. The page background already carries
 *  the bright-red radial gradient; this layers the material depth on top —
 *  a tiled UNO-card watermark, a warm centre bloom behind the pile, a
 *  top-down stage light over the spotlight seat, the concentric ripple
 *  rings, and a red-tinted vignette (kept light so the centre stays bright,
 *  unlike a heavy black inset which flattened the earlier dark cut). */
export function StadiumMat({
  children,
  activeColor = "red",
}: {
  children: React.ReactNode;
  activeColor?: string;
}) {
  const isYellow = activeColor === "Y" || activeColor === "yellow";
  const isBlue = activeColor === "B" || activeColor === "blue";
  const isGreen = activeColor === "G" || activeColor === "green";

  // Rich, vibrant, 5-stop saturated felt gradients
  const colorGlow = isBlue
    ? "radial-gradient(ellipse 75% 70% at 50% 45%, #3B82F6 0%, #2563EB 26%, #1D4ED8 54%, #1E3A8A 80%, #0B132B 100%)"
    : isGreen
    ? "radial-gradient(ellipse 75% 70% at 50% 45%, #22C55E 0%, #16A34A 26%, #15803D 54%, #14532D 80%, #032010 100%)"
    : isYellow
    ? "radial-gradient(ellipse 75% 70% at 50% 45%, #FBBF24 0%, #F59E0B 26%, #D97706 54%, #92400E 80%, #301303 100%)"
    : "radial-gradient(ellipse 75% 70% at 50% 45%, #E62222 0%, #B81414 28%, #780E0E 58%, #3A0606 82%, #140202 100%)";

  const bloomGlow = isBlue
    ? "radial-gradient(ellipse at center, rgba(96,165,250,0.65) 0%, rgba(37,99,235,0.3) 50%, transparent 72%)"
    : isGreen
    ? "radial-gradient(ellipse at center, rgba(134,239,172,0.65) 0%, rgba(34,197,94,0.3) 50%, transparent 72%)"
    : isYellow
    ? "radial-gradient(ellipse at center, rgba(254,240,138,0.75) 0%, rgba(245,158,11,0.35) 50%, transparent 72%)"
    : "radial-gradient(ellipse at center, rgba(255,120,30,0.45) 0%, rgba(230,60,10,0.2) 50%, transparent 72%)";

  const ringStroke = isBlue
    ? "#60A5FA"
    : isGreen
    ? "#4ADE80"
    : isYellow
    ? "#FDE047"
    : "#FF7A4A";

  const vignetteColor = isBlue
    ? "inset 0 0 120px 40px rgba(5,10,35,0.7)"
    : isGreen
    ? "inset 0 0 120px 40px rgba(3,25,12,0.7)"
    : isYellow
    ? "inset 0 0 120px 40px rgba(35,14,3,0.7)"
    : "inset 0 0 120px 40px rgba(25,2,2,0.7)";

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none" style={{ containerType: "inline-size" }}>
      {/* Background radial felt */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        aria-hidden
        style={{ background: colorGlow }}
      />
      {/* Faint tiled UNO-card watermark */}
      <StadiumWatermark />
      {/* Center glowing circle */}
      <div
        className="absolute pointer-events-none transition-all duration-700"
        aria-hidden
        style={{
          width: "48%",
          height: "44%",
          left: "50%",
          top: "47%",
          transform: "translate(-50%, -50%)",
          background: bloomGlow,
          filter: "blur(16px)",
        }}
      />
      {/* Concentric rings */}
      <StadiumRings stroke={ringStroke} />
      
      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>

      {/* Soft color-matched vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-20 transition-all duration-700"
        aria-hidden
        style={{ boxShadow: vignetteColor }}
      />
    </div>
  );
}

/** Tiled, faintly-embossed UNO cards drifting across the felt — the
 *  reference's background pattern. Pure SVG <pattern>, no raster asset. */
function StadiumWatermark() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <pattern id="uno-watermark" width="132" height="132" patternUnits="userSpaceOnUse" patternTransform="rotate(-16)">
          <g opacity="0.05">
            <rect x="46" y="34" width="40" height="60" rx="7" fill="none" stroke="#fff" strokeWidth="2.5" />
            <ellipse cx="66" cy="64" rx="19" ry="11" fill="#fff" opacity="0.55" />
            <text x="66" y="67" fontSize="9" fontWeight="900" fontStyle="italic" fill="#ffffff" textAnchor="middle" fontFamily="'Nunito','Poppins',sans-serif">UNO</text>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#uno-watermark)" />
    </svg>
  );
}

/** Concentric ripple rings radiating from the pile — brighter and more
 *  numerous than the earlier dark cut, matching the reference's arena. */
function StadiumRings({ stroke = "#FF7A4A" }: { stroke?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      {[10, 16, 22, 28, 34, 40].map((r, i) => (
        <ellipse
          key={r}
          cx="50"
          cy="48"
          rx={r}
          ry={r * 0.92}
          fill="none"
          stroke={stroke}
          strokeWidth="0.35"
          opacity={0.34 - i * 0.04}
          strokeDasharray={i % 2 === 1 ? "1.5 2" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------
// Turn-direction arrows — two bold, glowing orange arcs forming a ring
// around the pile (the reference's signature rotation cue). `direction`
// flips the whole ring clockwise ↔ counter-clockwise, so a Reverse card
// visibly turns the arrows around. Fed by state.direction, which the
// engine flips on every Reverse.
// ---------------------------------------------------------------------

/** Angular span of each arc, in degrees (0° = 3 o'clock, growing clockwise
 *  because SVG's y axis points down). */
const ARC_FROM = 214;
const ARC_TO = 326;

export interface StadiumDirectionPalette {
  id: string;
  gradStops: [string, string, string];
  comet: string;
  glow: string;
  solid: string;
  streamGlow: string;
}

export const STADIUM_DIRECTION_PALETTES: Record<string, StadiumDirectionPalette> = {
  yellow: {
    // Ultra-high contrast Electric Sky Cyan to Royal Blue on bright yellow felt (complementary color)
    id: "yellow",
    gradStops: ["#E0F2FE", "#38BDF8", "#2563EB"],
    comet: "#FFFFFF",
    glow: "rgba(37, 99, 235, 0.95)",
    solid: "#2563EB",
    streamGlow: "rgba(56, 189, 248, 0.9)",
  },
  blue: {
    // Glowing Ice Cyan and Radiant Sky Blue on deep blue felt
    id: "blue",
    gradStops: ["#E0F2FE", "#67E8F9", "#38BDF8"],
    comet: "#FFFFFF",
    glow: "rgba(56, 189, 248, 0.9)",
    solid: "#38BDF8",
    streamGlow: "rgba(103, 232, 249, 0.85)",
  },
  green: {
    // Vivid Lemon-Lime to Emerald on green felt
    id: "green",
    gradStops: ["#FEF08A", "#86EFAC", "#22C55E"],
    comet: "#FFFFFF",
    glow: "rgba(74, 222, 128, 0.9)",
    solid: "#4ADE80",
    streamGlow: "rgba(134, 239, 172, 0.85)",
  },
  red: {
    // Brilliant Gold and Warm Amber on red felt
    id: "red",
    gradStops: ["#FFF066", "#FFAE19", "#FF5500"],
    comet: "#FFFBEB",
    glow: "rgba(255, 180, 50, 0.9)",
    solid: "#FF9A2E",
    streamGlow: "rgba(255, 180, 50, 0.85)",
  },
};

/**
 * Turn-direction ring — two tapered arcs chasing each other around the pile,
 * dynamically styled to contrast with the table's active card felt color.
 */
export function StadiumDirectionArc({
  direction,
  width,
  height,
  activeColor = "red",
}: {
  direction: 1 | -1;
  width: number;
  height: number;
  activeColor?: string;
}) {
  const isYellow = activeColor === "Y" || activeColor === "yellow";
  const isBlue = activeColor === "B" || activeColor === "blue";
  const isGreen = activeColor === "G" || activeColor === "green";
  const palKey = isYellow ? "yellow" : isBlue ? "blue" : isGreen ? "green" : "red";
  const pal = STADIUM_DIRECTION_PALETTES[palKey] ?? STADIUM_DIRECTION_PALETTES.red;

  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.45;
  const ry = height * 0.44;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width,
        height,
        left: "50%",
        top: "48%",
        // The mirror flips the ring for a Reverse; the -50% keeps it centred.
        transform: `translate(-50%, -50%) scaleX(${direction === -1 ? -1 : 1})`,
        transition: "transform 420ms cubic-bezier(0.34,1.3,0.64,1)",
      }}
      aria-hidden
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`uno-arrow-grad-${pal.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={pal.gradStops[0]} />
            <stop offset="55%" stopColor={pal.gradStops[1]} />
            <stop offset="100%" stopColor={pal.gradStops[2]} />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes unoDashFlow {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -120; }
          }
          .uno-orbit-stream {
            animation: unoDashFlow 3.2s linear infinite;
          }
        `}</style>
        {/* Animated Racetrack Particle Stream */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={`url(#uno-arrow-grad-${pal.id})`}
          strokeWidth={3.5}
          strokeDasharray="10 18"
          fill="none"
          className="uno-orbit-stream"
          opacity={0.85}
          style={{ filter: `drop-shadow(0 0 10px ${pal.streamGlow})` }}
        />
        <g opacity="0.45" style={{ filter: "blur(3px)" }}>
          <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} pal={pal} />
          <g transform={`rotate(180 ${cx} ${cy})`}>
            <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} pal={pal} />
          </g>
        </g>
        <g style={{ filter: `drop-shadow(0 2px 8px ${pal.glow})` }}>
          <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} pal={pal} glow />
          <g transform={`rotate(180 ${cx} ${cy})`}>
            <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} pal={pal} glow />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** One arc sweeping clockwise from ~8 o'clock over the top to ~2 o'clock,
 *  with a filled arrowhead sitting ON the path, rotated to the ELLIPSE's
 *  tangent there. */
function StadiumArrowArc({
  cx,
  cy,
  rx,
  ry,
  pal,
  glow = false,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  pal: StadiumDirectionPalette;
  glow?: boolean;
}) {
  const at = (deg: number) => {
    const t = (deg * Math.PI) / 180;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  };
  // Arrowheads and stroke scale off the SHORT radius, so they stay
  // proportionate whatever shape the table is.
  const short = Math.min(rx, ry);
  const a = Math.min(60, Math.max(15, short * 0.19));
  const w = Math.min(22, Math.max(5, short * 0.058));
  const start = at(ARC_FROM);
  // Stop the stroke short of the tip so the arrowhead reads as the arc coming
  // to a point rather than a triangle stuck onto a blunt end.
  const tailDeg = (a * 0.62 * 180) / (Math.PI * short);
  const end = at(ARC_TO - tailDeg);
  const tip = at(ARC_TO);
  const t = (ARC_TO * Math.PI) / 180;
  const tangentDeg = (Math.atan2(ry * Math.cos(t), -rx * Math.sin(t)) * 180) / Math.PI;
  const d = `M ${start.x} ${start.y} A ${rx} ${ry} 0 0 1 ${end.x} ${end.y}`;
  const paint = glow ? `url(#uno-arrow-grad-${pal.id})` : pal.solid;
  return (
    <g fill={paint} stroke={paint}>
      <path d={d} fill="none" strokeWidth={w} strokeLinecap="round" />
      {glow && (
        <path
          d={d}
          fill="none"
          stroke={pal.comet}
          strokeWidth={Math.max(1.6, w * 0.45)}
          strokeLinecap="round"
          opacity="0.95"
          className="uno-arc-comet"
          style={{ strokeDasharray: `${a * 1.6} ${rx * 4}`, ["--uno-arc-len" as string]: `${rx * 4}` }}
        />
      )}
      <g transform={`translate(${tip.x} ${tip.y}) rotate(${tangentDeg})`}>
        {/* Swept-back head — the notched tail makes it read as a game arrow */}
        <path d={`M ${a * 0.72} 0 L ${-a * 0.5} ${-a * 0.72} L ${-a * 0.24} 0 L ${-a * 0.5} ${a * 0.72} Z`} stroke="none" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------
// Opponent seat — avatar tile + seat-number badge + name + live card
// count + a small face-down fan, matching the reference's per-seat
// cluster. `variant="spotlight"` renders the larger top-centre seat.
// ---------------------------------------------------------------------

import { findAvatar } from "../../lib/avatars";
import { AVATAR_FILES } from "@shared/avatars";

const PALETTES: Array<[string, string]> = [
  ["#f59e0b", "#b45309"], // amber
  ["#10b981", "#047857"], // emerald
  ["#3b82f6", "#1d4ed8"], // blue
  ["#a855f7", "#6d28d9"], // purple
  ["#ec4899", "#9d174d"], // pink
  ["#06b6d4", "#0e7490"], // cyan
  ["#ef4444", "#991b1b"], // red
  ["#84cc16", "#3f6212"], // lime
];

function paletteFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(h) % PALETTES.length] ?? PALETTES[0]!;
}

function deterministicAvatar(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_FILES[Math.abs(h) % AVATAR_FILES.length] ?? AVATAR_FILES[0]!;
}

function initialsOf(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const p0 = parts[0] ?? "";
  const pLast = parts[parts.length - 1] ?? "";
  if (parts.length === 1) return p0.slice(0, 2).toUpperCase();
  return ((p0[0] ?? "") + (pLast[0] ?? "")).toUpperCase() || "?";
}

export function UnoSeatAvatar({
  avatar,
  name,
  size = 48,
}: {
  avatar?: string;
  name: string;
  size?: number;
}) {
  const chosenAvatar = avatar || deterministicAvatar(name);
  const option = findAvatar(chosenAvatar);
  const [imgFailed, setImgFailed] = useState(false);
  const initials = initialsOf(name);
  const [start, end] = paletteFor(name);

  useEffect(() => {
    setImgFailed(false);
  }, [chosenAvatar, option?.src]);

  if (option && !imgFailed) {
    return (
      <div className="w-full h-full overflow-hidden flex items-center justify-center relative">
        <img
          src={option.src}
          alt={name}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover select-none scale-[1.32] transform"
          style={{ objectPosition: "50% 20%" }}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center font-black select-none text-white drop-shadow-md"
      style={{
        background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

export interface StadiumOpponentSeatProps {
  name: string;
  avatar?: string;
  handSize: number;
  seatNumber: number;
  isHost: boolean;
  isTurn: boolean;
  isNextTurn?: boolean;
  isConnected?: boolean;
  variant: "spotlight" | "side";
  dense?: boolean;
  canCatch?: boolean;
  onCatch?: () => void;
  onReact?: (emoji: string) => void;
}

export function StadiumOpponentSeat({
  name,
  avatar,
  handSize,
  seatNumber,
  isHost,
  isTurn,
  isNextTurn = false,
  isConnected,
  variant,
  dense = false,
  canCatch = false,
  onCatch,
  onReact,
}: StadiumOpponentSeatProps) {
  const isSpotlight = variant === "spotlight";
  const tile = isSpotlight ? 68 : 58;
  const accent = stadiumAccentFor(name);
  const offline = isConnected === false;
  const [showWheel, setShowWheel] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showWheel) return;
    function onDown(e: MouseEvent) {
      if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
        setShowWheel(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [showWheel]);

  const THROW_ITEMS = ["🍅", "🩴", "🧨", "🎉", "⏰", "😂"];

  return (
    <div className="relative select-none">
      {/* Throw Reaction Popover Wheel */}
      {showWheel && onReact && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-full shadow-2xl animate-bounce"
          style={{ background: "rgba(25,8,8,0.95)", border: "2px solid rgba(247,218,139,0.8)", backdropFilter: "blur(12px)" }}
        >
          {THROW_ITEMS.map((item) => (
            <button
              key={item}
              onClick={(e) => {
                e.stopPropagation();
                onReact(item);
                setShowWheel(false);
              }}
              className="w-8 h-8 text-lg flex items-center justify-center hover:scale-125 active:scale-95 transition cursor-pointer"
              title={`Throw ${item} at ${name}`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Reconnecting / Playing / Next badge */}
      {offline ? (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full text-white whitespace-nowrap"
          style={{ background: "#B45309", boxShadow: "0 2px 5px rgba(0,0,0,0.35)" }}
        >
          Reconnecting
        </span>
      ) : isTurn ? (
        <span
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full text-[#3a2410] whitespace-nowrap shadow-md animate-pulse"
          style={{ background: "linear-gradient(135deg,#F7DA8B,#E6A11E)" }}
        >
          Playing
        </span>
      ) : isNextTurn ? (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full text-amber-200 whitespace-nowrap shadow-md border border-amber-400/50"
          style={{ background: "rgba(35,15,5,0.92)" }}
        >
          Next
        </span>
      ) : null}

      <div className="flex flex-col items-center">
        <div
          className="relative flex-shrink-0 flex flex-col items-center cursor-pointer group"
          onClick={() => onReact && setShowWheel((v) => !v)}
          title={`Click to throw an item at ${name}`}
        >
          {/* Spotlight aura */}
          {isSpotlight && (
            <span
              className="absolute -inset-2 rounded-2xl animate-pulse pointer-events-none"
              style={{ boxShadow: "0 0 0 3px rgba(247,218,139,0.7), 0 0 18px 5px rgba(247,218,139,0.45)" }}
              aria-hidden
            />
          )}
          {/* Turn glow */}
          {isTurn && (
            <span
              className="uno-seat-claim absolute -inset-2 rounded-2xl pointer-events-none"
              style={{ boxShadow: "0 0 0 3.5px #F7DA8B, 0 0 22px 6px rgba(247,218,139,0.65)" }}
              aria-hidden
            />
          )}
          {/* Next Turn subtle glow */}
          {isNextTurn && !isTurn && (
            <span
              className="absolute -inset-1.5 rounded-2xl pointer-events-none animate-pulse"
              style={{ boxShadow: "0 0 0 2px rgba(245,158,11,0.5), 0 0 12px 2px rgba(245,158,11,0.3)" }}
              aria-hidden
            />
          )}

          {/* Squircle Avatar Frame with Character Picture */}
          <div
            className={`rounded-2xl overflow-hidden flex items-center justify-center relative shadow-xl transition group-hover:scale-105 ${
              handSize <= 2 ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black/60 shadow-[0_0_20px_rgba(250,204,21,0.7)]" : ""
            }`}
            style={{
              width: tile,
              height: tile,
              background: `linear-gradient(168deg, ${accent.light}, ${accent.dark})`,
              border: `3px solid ${isSpotlight ? "#F7DA8B" : accent.border}`,
              boxShadow: `0 4px 14px rgba(0,0,0,0.6), 0 0 12px ${accent.border}70`,
            }}
          >
            <UnoSeatAvatar avatar={avatar} name={name} size={tile} />

            {/* Dynamic Emotion Badge Overlays */}
            {handSize <= 2 && (
              <span
                className="absolute -top-1.5 -right-1.5 z-20 text-xs filter drop-shadow animate-bounce"
                title="Confident / Winning"
              >
                👑
              </span>
            )}
            {handSize >= 8 && (
              <span
                className="absolute -top-1.5 -right-1.5 z-20 text-xs filter drop-shadow animate-pulse"
                title="Heavy Hand Burden"
              >
                😰
              </span>
            )}

            {/* Seat Number Badge on Avatar Top-Left */}
            <span
              className="absolute -top-1 -left-1 z-20 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white shadow-md"
              style={{ background: accent.base, border: "1.5px solid rgba(255,255,255,0.9)" }}
            >
              {seatNumber}
            </span>
          </div>

          {offline && (
            <span
              className="uno-reconnect-dot absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-black/40"
              style={{ background: "#F59E0B" }}
              title="Reconnecting…"
              aria-label="Reconnecting"
            />
          )}

          {/* Mini Fan fanning out from the base of the avatar */}
          {!dense && (
            <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 pointer-events-none z-10">
              <StadiumMiniFan count={handSize} compact={!isSpotlight} />
            </div>
          )}
        </div>

        {/* Dedicated Card Count Pill / Catch Button */}
        {canCatch ? (
          <button
            onClick={onCatch}
            className="mt-1 px-3 py-0.5 rounded-full text-[9px] font-black text-white uppercase tracking-wider bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 border border-white/80 shadow-[0_0_15px_rgba(239,68,68,0.95)] animate-bounce hover:scale-105 active:scale-95 cursor-pointer z-10 whitespace-nowrap"
          >
            CATCH! +2
          </button>
        ) : (
          <div
            className={`mt-1 flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider text-amber-100 shadow-md border ${
              handSize === 1 ? "animate-pulse" : ""
            }`}
            style={{
              background:
                handSize === 1
                  ? "linear-gradient(135deg, #DC2626, #991B1B)"
                  : handSize <= 2
                  ? "linear-gradient(135deg, #D97706, #78350F)"
                  : "rgba(20, 8, 8, 0.9)",
              borderColor:
                handSize === 1
                  ? "#FCA5A5"
                  : handSize <= 2
                  ? "#FCD34D"
                  : "rgba(247, 218, 139, 0.4)",
              backdropFilter: "blur(6px)",
              boxShadow:
                handSize === 1
                  ? "0 0 12px rgba(239, 68, 68, 0.85)"
                  : "0 2px 6px rgba(0,0,0,0.5)",
            }}
          >
            <span className="text-[8px]" aria-hidden>🎴</span>
            <span className="tabular-nums font-black text-white text-[10px]">
              {handSize} {handSize === 1 ? "CARD" : "CARDS"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StadiumMiniFan({ count, compact }: { count: number; compact: boolean }) {
  if (count <= 0) return null;
  const shown = Math.min(count, 4);
  const w = compact ? 18 : 22;
  const h = compact ? 26 : 32;
  const overlap = compact ? -10 : -12;
  return (
    <div className="flex items-end" aria-hidden>
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          style={{
            width: w,
            height: h,
            marginLeft: i === 0 ? 0 : overlap,
            transform: `rotate(${(i - (shown - 1) / 2) * 9}deg)`,
          }}
        >
          <UnoCardBack className="w-full h-full drop-shadow-md" />
        </div>
      ))}
    </div>
  );
}

export function StadiumSelfPlate({
  name,
  avatar,
  seatNumber,
  handSize,
  isTurn,
}: {
  name: string;
  avatar?: string;
  seatNumber: number;
  handSize: number;
  isTurn: boolean;
}) {
  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative flex-shrink-0 flex flex-col items-center">
        {/* Turn glow */}
        {isTurn && (
          <span
            className="uno-seat-claim absolute -inset-2 rounded-2xl pointer-events-none"
            style={{ boxShadow: "0 0 0 3.5px #F7DA8B, 0 0 24px 6px rgba(247,218,139,0.7)" }}
            aria-hidden
          />
        )}
        <div
          className="rounded-2xl overflow-hidden flex items-center justify-center relative shadow-xl"
          style={{
            width: 54,
            height: 54,
            background: `linear-gradient(168deg, ${SELF_STADIUM_ACCENT.light}, ${SELF_STADIUM_ACCENT.dark})`,
            border: `3px solid ${isTurn ? "#F7DA8B" : "#38bdf8"}`,
            boxShadow: "0 6px 16px rgba(0,0,0,0.6), 0 0 16px rgba(56,189,248,0.8)",
          }}
        >
          <UnoSeatAvatar avatar={avatar} name={name} size={54} />
        </div>
        {/* YOU badge — gold pill overlapping the avatar's base */}
        <span
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.14em] text-[#3a2410] whitespace-nowrap shadow-md z-20"
          style={{ background: "linear-gradient(135deg,#F7DA8B,#E6A11E)", border: "1px solid rgba(255,255,255,0.7)" }}
        >
          YOU
        </span>
      </div>
      {/* Self Card Count Pill */}
      <div
        className="mt-3 flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider text-amber-100 shadow-md border"
        style={{
          background: "rgba(20, 8, 8, 0.9)",
          borderColor: "rgba(247, 218, 139, 0.4)",
          backdropFilter: "blur(6px)",
        }}
      >
        <span className="text-[8px]" aria-hidden>🎴</span>
        <span className="tabular-nums font-black text-white text-[10px]">
          {handSize} {handSize === 1 ? "CARD" : "CARDS"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Pile centre — wraps the existing UnoTableCenter (draw/discard mechanics
// untouched). Reference caption placement: "DISCARD PILE" on a dark pill
// above the pile, "DRAW PILE" on a dark pill below the draw stack.
// ---------------------------------------------------------------------

/** Captions now live INSIDE UnoTableCenter, anchored to their own stack —
 *  this wrapper only forwards the caller's choice. Previously it stacked its
 *  own pills around the cluster, which put "Discard Pile" over the draw stack
 *  and "Draw Pile" on top of the "Tap to draw" cue. Callers on a short board
 *  should turn captions OFF: there the "Discard Pile" pill rides up into the
 *  spotlight seat's name pill. The "Tap to draw" cue is unaffected — it is an
 *  action affordance, not a caption, and stays whenever a draw is legal. */
export function StadiumPileCenter(props: UnoTableCenterProps) {
  return (
    <div className="relative flex flex-col items-center">
      <UnoTableCenter {...props} showCaptions={props.showCaptions ?? false} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Top bar — room-code plate, classic-mode/house-rules badge, icon rail.
// ---------------------------------------------------------------------

export function StadiumRoomCodePlate({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  function copy() {
    try {
      void navigator.clipboard?.writeText(code);
    } catch {
      /* clipboard fallback */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <>
      <div
        className="flex items-center gap-2 rounded-2xl px-3.5 py-1.5 shadow-lg select-none"
        style={{ background: "rgba(15,3,3,0.78)", border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex flex-col leading-none">
          <span className="font-extrabold uppercase text-[8px] tracking-[0.16em] text-white/60">Room Code</span>
          <span className="font-mono font-black text-sm text-white tracking-widest">{code}</span>
        </div>
        <button
          onClick={copy}
          aria-label={copied ? "Room code copied" : "Copy room code"}
          title="Copy room code"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-white flex-shrink-0 transition active:scale-95 cursor-pointer ml-1"
          style={{ background: copied ? "#2F9E44" : "rgba(255,255,255,0.14)" }}
        >
          {copied ? (
            <CheckIcon size={13} />
          ) : (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
              <rect x="9" y="9" width="11" height="11" rx="2.5" fill="currentColor" opacity="0.95" />
              <rect x="4" y="4" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowQr(true)}
          aria-label="Show QR Code"
          title="Show QR Code to join room"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-amber-300 hover:text-amber-200 flex-shrink-0 bg-white/14 transition active:scale-95 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18h3v3h-3z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {showQr && <QrCodeModal open={true} code={code} onClose={() => setShowQr(false)} />}
    </>
  );
}

export function StadiumClassicModeBadge({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap shadow-md select-none hover:brightness-125 transition cursor-pointer"
      style={{ background: "rgba(15,3,3,0.72)", border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}
      title="View Classic Mode rules"
    >
      <StarIcon size={12} className="text-amber-300" />
      Classic Mode
    </button>
  );
}

const HOUSE_RULE_LABELS: Record<string, { label: string; desc: string }> = {
  stackDrawCards: {
    label: "Stack Draw Cards",
    desc: "Respond to a +2 with another +2, or +4 with +4 to pass the penalty to the next player.",
  },
  jumpIn: {
    label: "Jump-In",
    desc: "Play an identical card (same color and rank) at any time out of turn.",
  },
  sevenSwap: {
    label: "Seven Swap",
    desc: "Playing a 7 allows you to swap your entire hand with any opponent.",
  },
  zeroRotate: {
    label: "Zero Rotate",
    desc: "Playing a 0 forces every player to pass their hand in the active turn direction.",
  },
  keepDrawing: {
    label: "Keep Drawing",
    desc: "Keep drawing cards from the pile until you find a playable match.",
  },
  forcePlay: {
    label: "Force Play",
    desc: "If you draw a playable card, you must play it immediately.",
  },
};

export function StadiumHouseRulesBadge({
  rules,
  onClick,
}: {
  rules: Record<string, boolean>;
  onClick?: () => void;
}) {
  const active = Object.keys(HOUSE_RULE_LABELS).filter((k) => rules[k]);
  if (active.length === 0) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap shadow-md select-none hover:brightness-125 transition cursor-pointer"
      style={{ background: "rgba(15,3,3,0.72)", border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }}
      title="View active house rules"
    >
      <DiceIcon size={12} className="text-amber-300" />
      {active.length} house rule{active.length === 1 ? "" : "s"}
    </button>
  );
}

export function StadiumHouseRulesModal({
  open,
  rules,
  onClose,
}: {
  open: boolean;
  rules: Record<string, boolean>;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white"
        style={{ background: "rgba(20,6,6,0.96)", border: "2px solid rgba(247,218,139,0.7)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <DiceIcon size={20} className="text-amber-400" />
            <h2 className="font-display text-lg tracking-wide text-amber-300">Room Rules & Modifiers</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(HOUSE_RULE_LABELS).map(([key, info]) => {
            const isEnabled = !!rules[key];
            return (
              <div
                key={key}
                className="flex items-start gap-3 p-3 rounded-2xl border transition"
                style={{
                  background: isEnabled ? "rgba(230,161,30,0.12)" : "rgba(255,255,255,0.03)",
                  borderColor: isEnabled ? "rgba(247,218,139,0.5)" : "rgba(255,255,255,0.08)",
                }}
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  style={{
                    background: isEnabled ? "#16A34A" : "#4B5563",
                    color: "#fff",
                  }}
                >
                  {isEnabled ? "✓" : "✕"}
                </span>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-white">{info.label}</span>
                  <span className="text-xs text-white/70 leading-relaxed">{info.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full font-black uppercase text-xs tracking-wider text-black bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 transition shadow-lg cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}

export interface FlyingReactionItem {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export function StadiumReactionProjectiles({
  projectiles,
}: {
  projectiles: FlyingReactionItem[];
}) {
  if (projectiles.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden>
      {projectiles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-throw-arc text-4xl select-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
          style={{
            ["--throw-start-x" as string]: `${p.startX}px`,
            ["--throw-start-y" as string]: `${p.startY}px`,
            ["--throw-target-x" as string]: `${p.targetX}px`,
            ["--throw-target-y" as string]: `${p.targetY}px`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}

export function StadiumIconButton({
  onClick,
  ariaLabel,
  title,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base transition-all duration-150 hover:scale-105 active:scale-95 flex-shrink-0 cursor-pointer shadow-md"
      style={{ background: "rgba(15,3,3,0.75)", border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
    >
      {children}
    </button>
  );
}

export function StadiumSettingsMenu({
  isFullscreen,
  onToggleFullscreen,
  onOpenTutorial,
  onLeave,
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenTutorial: () => void;
  onLeave?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <StadiumIconButton onClick={() => setOpen((v) => !v)} ariaLabel="Settings" title="Settings">
        <GearIcon size={16} />
      </StadiumIconButton>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 z-50 rounded-2xl overflow-hidden shadow-2xl min-w-[10.5rem]"
          style={{ background: "rgba(25,8,8,0.95)", border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(12px)" }}
        >
          <button
            role="menuitem"
            onClick={() => {
              onToggleFullscreen();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onOpenTutorial();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 border-t border-white/10 transition cursor-pointer"
          >
            How to Play
          </button>
          {onLeave && (
            <button
              role="menuitem"
              onClick={() => {
                onLeave();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 border-t border-white/10 transition cursor-pointer"
            >
              Leave Room
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Bottom-left HUD — Chat trigger
// ---------------------------------------------------------------------

export function StadiumChatButton({ onClick, unread }: { onClick: () => void; unread: number }) {
  return (
    <button
      onClick={onClick}
      className="relative w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-white transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
      style={{ background: "rgba(15,3,3,0.75)", border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
      aria-label="Open chat and room panel"
    >
      <ChatIcon size={18} />
      <span className="text-[8px] font-black uppercase tracking-wider text-white/90">Chat</span>
      {unread > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-md animate-bounce"
          style={{ background: "#DC2626", color: "#fff" }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------
// Bottom-right HUD — persistent 3D UNO button + turn timer pill.
// ---------------------------------------------------------------------

export function StadiumUnoButton({
  enabled,
  isPrimed = false,
  onDeclare,
}: {
  enabled: boolean;
  isPrimed?: boolean;
  onDeclare: () => void;
  handSize?: number;
}) {
  const label = enabled
    ? "Declare UNO — you have one card left!"
    : isPrimed
    ? "UNO button primed — tap before playing down to 1 card!"
    : "Declare UNO";

  return (
    <div className="relative flex flex-col items-center">
      {isPrimed && !enabled && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-[8px] font-black text-black uppercase tracking-wider whitespace-nowrap shadow-md pointer-events-none z-20">
          PRIMED FOR UNO
        </div>
      )}
      <button
        onClick={enabled ? onDeclare : undefined}
        disabled={!enabled}
        aria-label={label}
        title={label}
        className={`relative flex items-center justify-center rounded-[32px] font-black tracking-tight transition-all duration-300 ${
          enabled
            ? "uno-call-ready active:scale-95 cursor-pointer hover:brightness-110 animate-pulse"
            : isPrimed
            ? "cursor-pointer hover:scale-105 opacity-95"
            : "opacity-80 cursor-not-allowed"
        }`}
        style={{
          width: "8.5rem",
          height: "3.6rem",
          fontSize: "1.85rem",
          fontFamily: "'Righteous', 'Nunito', sans-serif",
          color: "#FFE600",
          background: isPrimed || enabled
            ? "radial-gradient(ellipse at 50% 25%, #FF3B30 0%, #D31010 60%, #8A0000 100%)"
            : "radial-gradient(ellipse at 50% 25%, #A81B1B 0%, #6E0505 60%, #3B0000 100%)",
          border: isPrimed || enabled ? "3.5px solid #FFD700" : "3.5px solid #6E4020",
          boxShadow: enabled
            ? "0 6px 0 2px #4A0000, 0 10px 25px rgba(220,38,38,0.85), 0 0 30px rgba(255,215,0,0.95), inset 0 2px 5px rgba(255,255,255,0.6)"
            : isPrimed
            ? "0 6px 0 2px #4A0000, 0 8px 18px rgba(220,38,38,0.6), 0 0 16px rgba(255,215,0,0.6), inset 0 2px 4px rgba(255,255,255,0.4)"
            : "0 6px 0 2px #4A0000, 0 6px 14px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2)",
          textShadow: "0 3px 0 #9E0000, 0 4px 8px rgba(0,0,0,0.8), 0 0 10px rgba(255,230,0,0.6)",
        }}
      >
        UNO
      </button>
    </div>
  );
}

export function StadiumTurnTimerPill({ deadline, myTurn }: { deadline: number | null; myTurn: boolean }) {
  const secondsLeft = useTurnSecondsLeft(deadline);
  const [track, setTrack] = useState<{ key: number | null; total: number }>({ key: null, total: 1 });
  if (deadline !== track.key) setTrack({ key: deadline, total: Math.max(1, secondsLeft) });
  if (deadline == null) return null;
  const urgent = secondsLeft <= 10;
  const critical = secondsLeft <= 5;
  const pct = Math.max(0, Math.min(1, secondsLeft / Math.max(1, track.total)));
  const ring = critical ? "#FF4D4D" : urgent ? "#FFB020" : "#F7DA8B";
  const R = 15;
  const C = 2 * Math.PI * R;
  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl whitespace-nowrap shadow-lg ${
        critical ? "uno-timer-critical animate-pulse" : ""
      }`}
      style={{
        background: urgent ? "rgba(140,16,16,0.92)" : "rgba(15,3,3,0.85)",
        border: `1.5px solid ${urgent ? "rgba(255,140,120,0.8)" : "rgba(255,255,255,0.2)"}`,
        backdropFilter: "blur(8px)",
      }}
      role="timer"
      aria-label={`${myTurn ? "Your turn" : "Their turn"}, ${secondsLeft} seconds left`}
    >
      <div className="relative flex-shrink-0" style={{ width: 36, height: 36 }}>
        <svg width="36" height="36" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r={R}
            fill="none"
            stroke={ring}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: "stroke-dashoffset 950ms linear, stroke 250ms" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-white/90 text-sm" aria-hidden>
          ⏱
        </span>
      </div>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/70">
          {myTurn ? "Your Turn" : "Their Turn"}
        </span>
        <span className="text-[18px] font-black tabular-nums" style={{ color: ring }}>
          {secondsLeft}s
        </span>
      </div>
    </div>
  );
}

export function StadiumPassButton({
  canPass,
  onPass,
}: {
  canPass: boolean;
  onPass: () => void;
}) {
  return (
    <button
      onClick={onPass}
      disabled={!canPass}
      className={`group relative flex items-center gap-2.5 px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wider transition-all duration-200 shadow-2xl select-none ${
        canPass
          ? "cursor-pointer hover:scale-105 active:scale-95 text-white hover:brightness-110"
          : "cursor-not-allowed opacity-50 text-white/60"
      }`}
      style={{
        background: "linear-gradient(135deg, #fb923c 0%, #ea580c 55%, #9a3412 100%)",
        border: "2px solid #fed7aa",
        boxShadow: "0 6px 20px rgba(234,88,12,0.65), 0 0 12px rgba(251,146,60,0.4), inset 0 1.5px 0 rgba(255,255,255,0.6)",
        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
      }}
      aria-label="Pass Turn"
      title="Pass your turn (P)"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden className="drop-shadow-sm">
        <path d="M5 4l10 8-10 8V4zM19 4v16h-2V4h2z" />
      </svg>
      <span className="font-extrabold tracking-wide">Pass Turn</span>
      <span className="font-mono text-[11px] font-bold bg-black/40 border border-white/40 rounded-md px-1.5 py-0.5 ml-1 text-white/95 shadow-inner">
        P
      </span>
    </button>
  );
}

export function StadiumSpeechBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6, y: -16 }}
      transition={{ type: "spring", stiffness: 450, damping: 24 }}
      className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap select-none"
    >
      <div className="relative px-3.5 py-1.5 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-stone-900 font-extrabold text-xs shadow-[0_6px_20px_rgba(0,0,0,0.7)] border-2 border-amber-300 flex items-center gap-1.5">
        <span>{text}</span>
        {/* Comic speech bubble tail */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-amber-100 filter drop-shadow-sm"
        />
      </div>
    </motion.div>
  );
}

export const QUICK_TAUNTS = [
  "Good luck! 🍀",
  "Don't you dare! 🛑",
  "UNO is mine! 🏆",
  "Oops! 😅",
  "Nice try! 😉",
  "Hurry up! ⏰",
  "GG! 👏",
];

export function QuickTauntTray({
  isOpen,
  onClose,
  onSendTaunt,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSendTaunt: (text: string) => void;
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-[90%] max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col gap-3"
        style={{
          background: "linear-gradient(145deg, #220808 0%, #110303 100%)",
          border: "2px solid rgba(247,218,139,0.7)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h3 className="font-display text-base font-bold text-[#F7DA8B]">Quick Taunts</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 text-sm font-black cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {QUICK_TAUNTS.map((taunt) => (
            <button
              key={taunt}
              onClick={() => {
                onSendTaunt(taunt);
                onClose();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black text-amber-100 bg-white/5 hover:bg-amber-500/20 border border-amber-400/20 hover:border-amber-400/60 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer text-left"
            >
              <span>{taunt}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
