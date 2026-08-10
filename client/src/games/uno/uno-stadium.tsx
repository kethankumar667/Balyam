import { useEffect, useRef, useState } from "react";
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
): Record<string, StadiumSeatPos> {
  const pos: Record<string, StadiumSeatPos> = {};

  // Spotlight seat (top center — positioned at 14% to sit under top banner)
  if (seating.spotlight) {
    pos[seating.spotlight] = { left: "50%", top: "14%" };
  }

  // Right column seats
  const rightCount = seating.right.length;
  if (rightCount === 1) {
    pos[seating.right[0]] = { left: "82%", top: "46%" };
  } else if (rightCount === 2) {
    pos[seating.right[0]] = { left: "78%", top: "28%" }; // Top-Right
    pos[seating.right[1]] = { left: "78%", top: "64%" }; // Bottom-Right
  } else if (rightCount >= 3) {
    pos[seating.right[0]] = { left: "76%", top: "22%" }; // Top-Right
    pos[seating.right[1]] = { left: "84%", top: "46%" }; // Mid-Right
    pos[seating.right[2]] = { left: "76%", top: "68%" }; // Bottom-Right
  }

  // Left column seats (seating.left is closest-to-self-first: bottom-to-top)
  const leftCount = seating.left.length;
  if (leftCount === 1) {
    pos[seating.left[0]] = { left: "18%", top: "46%" };
  } else if (leftCount === 2) {
    pos[seating.left[0]] = { left: "22%", top: "64%" }; // Bottom-Left
    pos[seating.left[1]] = { left: "22%", top: "28%" }; // Top-Left
  } else if (leftCount >= 3) {
    pos[seating.left[0]] = { left: "24%", top: "68%" }; // Bottom-Left
    pos[seating.left[1]] = { left: "16%", top: "46%" }; // Mid-Left
    pos[seating.left[2]] = { left: "24%", top: "22%" }; // Top-Left
  }

  // Self seat (YOU)
  if (selfId) {
    pos[selfId] = { left: "18%", top: "84%" };
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
  return STADIUM_ACCENTS[Math.abs(h) % STADIUM_ACCENTS.length];
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

  const colorGlow = isBlue
    ? "radial-gradient(ellipse 65% 65% at 50% 48%, rgba(37,99,235,0.85), rgba(30,58,138,0.45) 50%, rgba(20,5,5,0.95) 85%)"
    : isGreen
    ? "radial-gradient(ellipse 65% 65% at 50% 48%, rgba(22,163,74,0.85), rgba(20,83,45,0.45) 50%, rgba(20,5,5,0.95) 85%)"
    : isYellow
    ? "radial-gradient(ellipse 65% 65% at 50% 48%, rgba(234,179,8,0.85), rgba(161,98,7,0.45) 50%, rgba(20,5,5,0.95) 85%)"
    : "radial-gradient(ellipse 65% 65% at 50% 48%, rgba(220,38,38,0.85), rgba(127,29,29,0.45) 50%, rgba(20,5,5,0.95) 85%)";

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ containerType: "inline-size" }}>
      {/* Warm active-color centre bloom — dynamically shifts when active color changes. */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        aria-hidden
        style={{
          background: colorGlow,
        }}
      />
      {/* Faint tiled UNO-card watermark. */}
      <StadiumWatermark />
      {/* Top-down stage light over the spotlight seat. */}
      <div
        className="absolute pointer-events-none"
        aria-hidden
        style={{
          width: "38%",
          height: "22%",
          left: "50%",
          top: "1%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at center, rgba(255,236,180,0.35), transparent 72%)",
          filter: "blur(8px)",
          animation: "uno-flourish-pulse 3.6s ease-in-out infinite",
        }}
      />
      <StadiumRings />
      {children}
      {/* Red-tinted vignette — darkens the corners without dimming the
          bright centre. */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ boxShadow: "inset 0 0 16cqw 3cqw rgba(70,8,8,0.55)" }}
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
            <text x="66" y="67" fontSize="9" fontWeight="900" fontStyle="italic" fill="#7a0f0f" textAnchor="middle" fontFamily="'Nunito','Poppins',sans-serif">UNO</text>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#uno-watermark)" />
    </svg>
  );
}

/** Concentric ripple rings radiating from the pile — brighter and more
 *  numerous than the earlier dark cut, matching the reference's arena. */
function StadiumRings() {
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
          stroke="#FF7A4A"
          strokeWidth="0.35"
          opacity={0.34 - i * 0.04}
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

/**
 * Turn-direction ring — two tapered arcs chasing each other around the pile.
 *
 * The SVG works in PIXEL user units (`viewBox="0 0 w h"`), which is the whole
 * point. The previous version stretched a 100×100 viewBox across the board
 * with `preserveAspectRatio="none"`: on a 1920×950 desktop that scaled 19.2×
 * horizontally against 9.5× vertically, smearing the arcs into a flat oval and
 * the arrowheads into big clip-art triangles. Working in px means the ring can
 * be a wide ELLIPSE (which is what suits a wide table, and what the reference
 * shows) while the arrowheads stay exactly the shape they were drawn.
 */
export function StadiumDirectionArc({
  direction,
  width,
  height,
}: {
  direction: 1 | -1;
  width: number;
  height: number;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.44;
  const rx = r;
  const ry = r;
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
          <linearGradient id="uno-arrow-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFD46B" />
            <stop offset="55%" stopColor="#FF9A2E" />
            <stop offset="100%" stopColor="#FF6A15" />
          </linearGradient>
        </defs>
        <g opacity="0.4" style={{ filter: "blur(2px)" }}>
          <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} />
          <g transform={`rotate(180 ${cx} ${cy})`}>
            <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} />
          </g>
        </g>
        <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} glow />
        <g transform={`rotate(180 ${cx} ${cy})`}>
          <StadiumArrowArc cx={cx} cy={cy} rx={rx} ry={ry} glow />
        </g>
      </svg>
    </div>
  );
}

/** One arc sweeping clockwise from ~8 o'clock over the top to ~2 o'clock,
 *  with a filled arrowhead sitting ON the path, rotated to the ELLIPSE's
 *  tangent there (not a circle's — they differ once rx ≠ ry, and using the
 *  wrong one makes the head visibly skew off the path). */
function StadiumArrowArc({
  cx,
  cy,
  rx,
  ry,
  glow = false,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
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
  // to a point rather than a triangle stuck onto a blunt end. The gap is an
  // arc LENGTH, so convert it to degrees against this ellipse.
  const tailDeg = (a * 0.62 * 180) / (Math.PI * short);
  const end = at(ARC_TO - tailDeg);
  const tip = at(ARC_TO);
  const t = (ARC_TO * Math.PI) / 180;
  const tangentDeg = (Math.atan2(ry * Math.cos(t), -rx * Math.sin(t)) * 180) / Math.PI;
  const d = `M ${start.x} ${start.y} A ${rx} ${ry} 0 0 1 ${end.x} ${end.y}`;
  const paint = glow ? "url(#uno-arrow-grad)" : "#FF7A1A";
  return (
    <g fill={paint} stroke={paint}>
      <path d={d} fill="none" strokeWidth={w} strokeLinecap="round" />
      {/* Motion WITHOUT breaking the arc: a short lit segment travels along
          the solid stroke. Dashing the stroke itself (the first attempt)
          turned the ring into a dotted circle and killed the arrow read. */}
      {glow && (
        <path
          d={d}
          fill="none"
          stroke="#FFE9A8"
          strokeWidth={Math.max(1.4, w * 0.42)}
          strokeLinecap="round"
          opacity="0.9"
          className="uno-arc-comet"
          style={{ strokeDasharray: `${a * 1.6} ${rx * 4}`, ["--uno-arc-len" as string]: `${rx * 4}` }}
        />
      )}
      <g transform={`translate(${tip.x} ${tip.y}) rotate(${tangentDeg})`}>
        {/* Swept-back head — the notched tail is what makes it read as a
            game arrow rather than a plain triangle. */}
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

export interface StadiumOpponentSeatProps {
  name: string;
  handSize: number;
  seatNumber: number;
  isHost: boolean;
  isTurn: boolean;
  isConnected?: boolean;
  variant: "spotlight" | "side";
  /** Tiny-board mode (short landscape phones): hides the decorative mini
   *  card-back fan so three stacked side seats never collide vertically.
   *  The numeric hand count stays — it is the load-bearing information. */
  dense?: boolean;
  canCatch?: boolean;
  onCatch?: () => void;
}

export function StadiumOpponentSeat({
  name,
  handSize,
  seatNumber,
  isHost,
  isTurn,
  isConnected,
  variant,
  dense = false,
  canCatch = false,
  onCatch,
}: StadiumOpponentSeatProps) {
  const isSpotlight = variant === "spotlight";
  const tile = isSpotlight ? 64 : 52;
  const accent = stadiumAccentFor(name);
  const offline = isConnected === false;
  return (
    <div
      className="relative flex flex-col items-center gap-1"
      style={{
        // A disconnected player still gets a full seat — you need to see who
        // the table is waiting on — but recedes so live players read first.
        // A 12px corner dot alone was doing all this work.
        opacity: offline ? 0.55 : 1,
        filter: offline ? "grayscale(0.6)" : undefined,
        transition: "opacity 300ms, filter 300ms",
      }}
    >
      {/* One badge slot. "Reconnecting" outranks "Playing": if the table is
          stalled waiting on a dropped player, that is the thing to say. */}
      {offline ? (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full text-white whitespace-nowrap"
          style={{ background: "#B45309", boxShadow: "0 2px 5px rgba(0,0,0,0.35)" }}
        >
          Reconnecting
        </span>
      ) : isTurn ? (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full text-[#3a2410] whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,#F7DA8B,#E6A11E)", boxShadow: "0 2px 5px rgba(0,0,0,0.35)" }}
        >
          Playing
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          {isSpotlight && (
            <span
              className="absolute -inset-2 rounded-2xl animate-pulse pointer-events-none"
              style={{ boxShadow: "0 0 0 3px rgba(247,218,139,0.7), 0 0 18px 5px rgba(247,218,139,0.45)" }}
              aria-hidden
            />
          )}
          {/* Turn glow — independent of the spotlight ring above (that one
              marks a fixed SEAT position, not whose turn it is). Offset a
              touch further out so the two can layer without fighting when
              the spotlight seat's occupant is also the active player. */}
          {isTurn && (
            <span
              className="uno-seat-claim absolute -inset-2.5 rounded-2xl pointer-events-none"
              style={{ boxShadow: "0 0 0 3px #F7DA8B, 0 0 22px 6px rgba(247,218,139,0.55)" }}
              aria-hidden
            />
          )}
          {(isHost || isSpotlight) && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 leading-none text-[#F7DA8B] drop-shadow-md" aria-hidden title="Crown">
              <CrownIcon size={22} />
            </span>
          )}
          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              width: tile,
              height: tile,
              background: `linear-gradient(168deg, ${accent.light}, ${accent.dark})`,
              border: `3px solid ${isSpotlight ? "#F7DA8B" : accent.border}`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.5), 0 0 12px ${accent.border}60`,
            }}
          >
            <Avatar name={name} size={tile - 12} />
          </div>
          {offline && (
            <span
              className="uno-reconnect-dot absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-black/40"
              style={{ background: "#F59E0B" }}
              title="Reconnecting…"
              aria-label="Reconnecting"
            />
          )}
        </div>
        {/* Name pill (with seat-number badge) stacked over the card-count
            chip — the reference's dark-pill cluster beside each avatar. */}
        <div className="flex flex-col items-start gap-1 min-w-0">
          <div
            className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full min-w-0"
            style={{ background: "rgba(40,6,6,0.78)", border: "1px solid rgba(255,255,255,0.16)" }}
          >
            <span
              className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-black text-white"
              style={{ background: accent.base, border: "1.5px solid rgba(255,255,255,0.9)" }}
            >
              {seatNumber}
            </span>
            <span className="text-[13px] font-bold text-white truncate max-w-[5.5rem]">{name}</span>
          </div>
          <span
            className="px-2.5 py-0.5 rounded-md text-[13px] font-black text-white leading-none tabular-nums"
            style={{ background: "rgba(40,6,6,0.78)", border: "1px solid rgba(255,255,255,0.14)" }}
          >
            {handSize}
          </span>
        </div>
      </div>
      {!dense && <StadiumMiniFan count={handSize} compact={!isSpotlight} />}
      {canCatch && (
        <button
          onClick={onCatch}
          className="mt-0.5 min-h-[28px] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white animate-pulse whitespace-nowrap"
          style={{ background: "#DC2626", boxShadow: "0 3px 8px rgba(220,38,38,0.5)" }}
          aria-label={`Catch ${name} without UNO — they draw 2`}
        >
          Catch! +2
        </button>
      )}
    </div>
  );
}

function StadiumMiniFan({ count, compact }: { count: number; compact: boolean }) {
  if (count <= 0) return null;
  const shown = Math.min(count, 4);
  const w = compact ? 17 : 21;
  const h = compact ? 25 : 31;
  const overlap = compact ? -9 : -11;
  return (
    <div className="flex items-end" aria-hidden>
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          style={{
            width: w,
            height: h,
            marginLeft: i === 0 ? 0 : overlap,
            transform: `rotate(${(i - (shown - 1) / 2) * 8}deg)`,
          }}
        >
          <UnoCardBack className="w-full h-full drop-shadow-sm" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Self plate — bottom-centre avatar + "YOU" + seat number + card count,
// the stadium equivalent of uno-table.tsx's self UnoNamePlate slot.
// ---------------------------------------------------------------------

export function StadiumSelfPlate({
  name,
  seatNumber,
  handSize,
  isTurn,
}: {
  name: string;
  seatNumber: number;
  handSize: number;
  isTurn: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex-shrink-0">
        {/* Self avatar is always highlighted (gold glow), brighter on turn. */}
        <span
          key={isTurn ? "turn" : "idle"}
          className={`absolute -inset-1.5 rounded-2xl pointer-events-none ${isTurn ? "uno-seat-claim" : ""}`}
          style={{ boxShadow: isTurn ? "0 0 0 3px #F7DA8B, 0 0 20px 5px rgba(247,218,139,0.6)" : "0 0 0 2.5px rgba(247,218,139,0.75)" }}
          aria-hidden
        />
        <div
          className="rounded-2xl overflow-hidden flex items-center justify-center"
          style={{
            width: 58,
            height: 58,
            background: `linear-gradient(168deg, ${SELF_STADIUM_ACCENT.light}, ${SELF_STADIUM_ACCENT.dark})`,
            border: "3px solid #38bdf8",
            boxShadow: "0 4px 14px rgba(0,0,0,0.5), 0 0 16px rgba(56,189,248,0.75)",
          }}
        >
          <Avatar name={name} size={44} />
        </div>
        {/* YOU badge — gold pill overlapping the avatar's base. */}
        <span
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.14em] text-[#3a2410] whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,#F7DA8B,#E6A11E)", boxShadow: "0 2px 5px rgba(0,0,0,0.4)" }}
        >
          You
        </span>
      </div>
      <div className="flex flex-col items-start gap-1 min-w-0">
        <div
          className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full min-w-0"
          style={{ background: "rgba(40,6,6,0.78)", border: "1px solid rgba(255,255,255,0.16)" }}
        >
          <span
            className="flex-shrink-0 flex items-center justify-center w-[19px] h-[19px] rounded-full text-[10px] font-black text-white"
            style={{ background: SELF_STADIUM_ACCENT.base, border: "1.5px solid rgba(255,255,255,0.9)" }}
          >
            {seatNumber}
          </span>
          <span className="text-[15px] font-black text-white uppercase truncate max-w-[7rem]">{name}</span>
        </div>
        <span
          className="px-2.5 py-0.5 rounded-md text-[13px] font-black text-white leading-none tabular-nums"
          style={{ background: "rgba(40,6,6,0.78)", border: "1px solid rgba(255,255,255,0.14)" }}
        >
          {handSize}
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
      <UnoTableCenter {...props} showCaptions={true} />
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
      /* clipboard may be unavailable (insecure context) — code stays
         visible on the plate either way, so this is a nice-to-have. */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <>
      <div
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
        style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.18)" }}
      >
        <div className="flex flex-col leading-none">
          <span className="font-bold uppercase text-[7px] tracking-[0.18em] text-white/60">Room Code</span>
          <span className="font-mono font-black text-sm text-white tracking-wider">{code}</span>
        </div>
        <button
          onClick={copy}
          aria-label={copied ? "Room code copied" : "Copy room code"}
          title="Copy room code"
          className="flex items-center justify-center w-6 h-6 rounded-md text-white flex-shrink-0 cursor-pointer"
          style={{ background: copied ? "#2F9E44" : "rgba(255,255,255,0.15)" }}
        >
          {copied ? (
            <CheckIcon size={12} />
          ) : (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden>
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
          className="flex items-center justify-center w-6 h-6 rounded-md text-amber-300 hover:text-amber-200 flex-shrink-0 bg-white/15 transition cursor-pointer"
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

export function StadiumClassicModeBadge() {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white whitespace-nowrap"
      style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.2)" }}
    >
      <StarIcon size={11} />
      Classic Mode
    </div>
  );
}

/** Dark-theme sibling of the classic-mode badge above — same "off =
 *  classic, on = named chips" logic as uno-scene.tsx's UnoHouseRulesBadge,
 *  duplicated locally rather than imported since that one is styled with
 *  the wood-table `uno-wood-plate` class this shell no longer uses. */
const HOUSE_RULE_LABELS: Record<string, string> = {
  stackDrawCards: "Stack Draw Cards",
  jumpIn: "Jump-In",
  sevenSwap: "Seven Swap",
  zeroRotate: "Zero Rotate",
  keepDrawing: "Keep Drawing",
  forcePlay: "Force Play",
};

export function StadiumHouseRulesBadge({ rules }: { rules: Record<string, boolean> }) {
  const active = Object.keys(HOUSE_RULE_LABELS).filter((k) => rules[k]);
  if (active.length === 0) return null;
  const names = active.map((k) => HOUSE_RULE_LABELS[k]).join(", ");
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white whitespace-nowrap"
      style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.2)" }}
      title={`House rules active: ${names}`}
      aria-label={`House rules active: ${names}`}
    >
      <DiceIcon size={11} />
      {active.length} house rule{active.length === 1 ? "" : "s"}
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
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base transition active:scale-95 flex-shrink-0"
      style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.18)" }}
    >
      {children}
    </button>
  );
}

/** Gear icon → a tiny popover consolidating the two header controls the
 *  reference's 3-icon top-right (sound / settings / emoji) has no room
 *  for individually: fullscreen (needed — the board locks landscape) and
 *  the tutorial deck. Neither is a fabricated feature; both existed in
 *  the pre-redesign header and would otherwise have nowhere to live. */
export function StadiumSettingsMenu({
  isFullscreen,
  onToggleFullscreen,
  onOpenTutorial,
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenTutorial: () => void;
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
          className="absolute top-full right-0 mt-2 z-30 rounded-xl overflow-hidden shadow-xl min-w-[9.5rem]"
          style={{ background: "#241009", border: "1px solid rgba(255,255,255,0.18)" }}
        >
          <button
            role="menuitem"
            onClick={() => {
              onToggleFullscreen();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 text-xs font-bold text-white hover:bg-white/10"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onOpenTutorial();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 text-xs font-bold text-white hover:bg-white/10 border-t border-white/10"
          >
            How to Play
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Bottom-left HUD — Chat trigger (Emoji's square ReactionButton variant
// is rendered by the caller directly, uno-rail.tsx's exported component).
// ---------------------------------------------------------------------

export function StadiumChatButton({ onClick, unread }: { onClick: () => void; unread: number }) {
  return (
    <button
      onClick={onClick}
      className="relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-white"
      style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)" }}
      aria-label="Open chat and room panel"
    >
      <ChatIcon size={18} />
      <span className="text-[8px] font-black uppercase tracking-wide">Chat</span>
      {unread > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
          style={{ background: "#DC2626", color: "#fff" }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------
// Bottom-right HUD — persistent UNO declare button + turn timer pill.
// ---------------------------------------------------------------------

/**
 * The signature UNO call. Sized and weighted like the reference's, and — the
 * bug this replaces — still legible when disabled: `opacity-45` over a dark
 * red arena rendered it as a barely-visible ghost outline, so nobody could
 * tell whether the game's most important button even existed. Now it keeps a
 * solid (if unlit) body and states WHY it's off via tooltip + aria-label.
 */
export function StadiumUnoButton({
  enabled,
  onDeclare,
  handSize,
}: {
  enabled: boolean;
  onDeclare: () => void;
  /** Cards left in the local hand. Drives PROMINENCE, not availability. */
  handSize?: number;
}) {
  const label = enabled
    ? "Declare UNO — you have one card left"
    : "Declare UNO — lights up when you are down to one card";

  /*
   * The button earns its size instead of always taking it.
   *
   * At full weight it is 7.4rem of the arena's most valuable corner from the
   * first deal, when it cannot be pressed for another dozen turns — the same
   * dead slab whether you hold seven cards or one. It now stays small and
   * quiet while it is irrelevant, grows as you approach the call, and only
   * reaches full weight when it is actually live. Never hidden: a control
   * that appears from nowhere is worse than one that is merely quiet, and
   * a player has to be able to find it before they need it.
   */
  const armed = handSize == null || handSize <= 2;
  return (
    <button
      onClick={enabled ? onDeclare : undefined}
      disabled={!enabled}
      aria-label={label}
      title={label}
      className={`relative flex items-center justify-center rounded-full font-black italic tracking-tight transition-all duration-500 ${
        enabled ? "uno-call-ready active:scale-95 cursor-pointer" : "cursor-not-allowed"
      }`}
      style={{
        width: armed ? "7.2rem" : "5.4rem",
        height: armed ? "3.2rem" : "2.5rem",
        fontSize: armed ? "1.5rem" : "1.1rem",
        opacity: enabled ? 1 : 0.8,
        color: "#FFD700",
        background: "radial-gradient(circle at 35% 28%, #ff4d4d, #dc2626 55%, #991b1b 100%)",
        border: "3.5px solid #FFD700",
        boxShadow: enabled
          ? "0 4px 0 2px #500000, 0 8px 24px rgba(220,38,38,0.8), 0 0 28px rgba(255,215,0,0.9), inset 0 2px 4px rgba(255,255,255,0.5)"
          : "0 4px 0 2px #500000, 0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)",
        textShadow: "0 2px 4px rgba(0,0,0,0.7), 0 0 8px rgba(255,215,0,0.5)",
      }}
    >
      UNO
    </button>
  );
}

/**
 * Turn timer. Reference-weight: clock glyph beside a stacked label + a big
 * tabular countdown, with a draining ring so the remaining time reads
 * pre-attentively instead of requiring you to parse digits.
 *
 * Urgency is carried by colour AND the ring AND the number — never colour
 * alone, so it survives colour-blindness and greyscale.
 */
export function StadiumTurnTimerPill({ deadline, myTurn }: { deadline: number | null; myTurn: boolean }) {
  const secondsLeft = useTurnSecondsLeft(deadline);
  // The server publishes a deadline, not the turn length, so the ring
  // self-calibrates: the first tick of a new deadline becomes its "full".
  const [track, setTrack] = useState<{ key: number | null; total: number }>({ key: null, total: 1 });
  if (deadline !== track.key) setTrack({ key: deadline, total: Math.max(1, secondsLeft) });
  if (deadline == null) return null;
  const urgent = secondsLeft <= 10;
  const critical = secondsLeft <= 5;
  const pct = Math.max(0, Math.min(1, secondsLeft / Math.max(1, track.total)));
  const ring = critical ? "#FF4D4D" : urgent ? "#FFB020" : "#F7DA8B";
  const R = 16;
  const C = 2 * Math.PI * R;
  return (
    <div
      className={`flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-2xl whitespace-nowrap ${
        critical ? "uno-timer-critical" : ""
      }`}
      style={{
        background: urgent ? "rgba(140,16,16,0.92)" : "rgba(0,0,0,0.48)",
        border: `1.5px solid ${urgent ? "rgba(255,140,120,0.7)" : "rgba(255,255,255,0.22)"}`,
      }}
      role="timer"
      aria-label={`${myTurn ? "Your turn" : "Their turn"}, ${secondsLeft} seconds left`}
    >
      <div className="relative flex-shrink-0" style={{ width: 38, height: 38 }}>
        <svg width="38" height="38" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="19" cy="19" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />
          <circle
            cx="19"
            cy="19"
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
        <span className="absolute inset-0 flex items-center justify-center text-white/85" aria-hidden>
          <ClockIcon size={15} />
        </span>
      </div>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/70">
          {myTurn ? "Your Turn" : "Their Turn"}
        </span>
        <span className="text-[19px] font-black tabular-nums" style={{ color: ring }}>
          {secondsLeft}s
        </span>
      </div>
    </div>
  );
}
