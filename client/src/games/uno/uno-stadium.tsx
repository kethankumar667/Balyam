import { useEffect, useRef, useState } from "react";
import { UnoCardBack } from "./uno-shared";
import { UnoTableCenter, type UnoTableCenterProps } from "./uno-table";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import Avatar from "../rummy/Avatar";

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
function sideTops(count: number): string[] {
  if (count === 0) return [];
  if (count === 1) return ["40%"];
  const top = 18;
  const bottom = 62;
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, i) => `${top + step * i}%`);
}

export interface StadiumSeatPos {
  left: string;
  top: string;
}

/** Percentage coordinates (of the FULL board area, which is now the whole
 *  region between header and hand fan — the reference composition is
 *  full-bleed, seats hugging the screen edges) for every seated id, self
 *  included. Used both to place seats and as the anchor lookup for every
 *  special-card hit animation (see UnoBoardMobile.tsx). */
export function computeStadiumPositions(
  seating: StadiumSeating,
  selfId: string | null,
): Record<string, StadiumSeatPos> {
  const pos: Record<string, StadiumSeatPos> = {};
  if (seating.spotlight) pos[seating.spotlight] = { left: "50%", top: "16%" };
  const rightTops = sideTops(seating.right.length);
  seating.right.forEach((id, i) => {
    pos[id] = { left: "92%", top: rightTops[i] };
  });
  const leftTops = sideTops(seating.left.length);
  // `seating.left` is closest-to-self-first; rendering/positioning top-to-
  // bottom means the closest-to-self entry gets the LARGEST top% (bottom
  // slot), so read the tops array in reverse.
  const reversedTops = [...leftTops].reverse();
  seating.left.forEach((id, i) => {
    pos[id] = { left: "8%", top: reversedTops[i] };
  });
  // Anchor for hit animations targeting the local player — approximates
  // the self plate's new bottom-left slot (see UnoBoardMobile.tsx).
  if (selfId) pos[selfId] = { left: "14%", top: "88%" };
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
}
const STADIUM_ACCENTS: readonly StadiumAccent[] = [
  { light: "#5AA9F0", base: "#2E7CD0", dark: "#1C57A0" }, // blue
  { light: "#C9A0F5", base: "#9B5FE0", dark: "#6B35A8" }, // purple
  { light: "#F6C24B", base: "#E0982A", dark: "#A96A16" }, // gold
  { light: "#F0708A", base: "#D23E5E", dark: "#A01C3A" }, // rose
  { light: "#5BC46B", base: "#2FA043", dark: "#1E7A30" }, // green
  { light: "#F5924B", base: "#E06E1E", dark: "#A84D0E" }, // orange
  { light: "#3FD0C4", base: "#17A79A", dark: "#0E7A70" }, // teal
];
const SELF_STADIUM_ACCENT: StadiumAccent = { light: "#F6C24B", base: "#E0982A", dark: "#A96A16" };

function stadiumAccentFor(seed: string): StadiumAccent {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return STADIUM_ACCENTS[Math.abs(h) % STADIUM_ACCENTS.length];
}

// ---------------------------------------------------------------------
// Background — dark-maroon radial stadium + faint concentric rings,
// replacing UnoTableMat's wood-frame + red-felt look for this shell only.
// ---------------------------------------------------------------------

/** Seamless full-bleed board surface — the page background already carries
 *  the dark-maroon radial gradient, so this renders NO panel of its own
 *  (the first cut drew a rounded rectangle here, which read as a small
 *  centered card instead of the reference's edge-to-edge stadium). Layers
 *  a woven-felt texture, a soft top-down "stage light" over the spotlight
 *  seat, a pulled-in vignette that frames the pile, and a large barely-
 *  there embossed wordmark — the material depth the flat two-stop gradient
 *  didn't have on its own — underneath the existing concentric rings and
 *  whatever the caller renders on top. */
export function StadiumMat({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full" style={{ containerType: "inline-size" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1.5px, transparent 1.5px, transparent 4px)",
        mixBlendMode: "overlay",
      }} />
      <div
        className="absolute pointer-events-none"
        aria-hidden
        style={{
          width: "38%",
          height: "22%",
          left: "50%",
          top: "2%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at center, rgba(255,222,138,0.4), transparent 72%)",
          filter: "blur(8px)",
          animation: "uno-flourish-pulse 3.6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden
        style={{
          fontSize: "9cqw",
          fontWeight: 900,
          fontStyle: "italic",
          letterSpacing: "-0.03em",
          color: "rgba(255,255,255,0.045)",
          textShadow: "1px 1px 0 rgba(0,0,0,0.1), -1px -1px 0 rgba(255,255,255,0.04)",
        }}
      >
        UNO
      </div>
      <StadiumRings />
      {children}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ boxShadow: "inset 0 0 18cqw 2cqw rgba(0,0,0,0.45)" }}
      />
    </div>
  );
}

function StadiumRings() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      {[13, 20, 27, 34].map((r) => (
        <ellipse key={r} cx="50" cy="48" rx={r} ry={r * 0.9} fill="none" stroke="#F0603A" strokeWidth="0.3" opacity="0.28" />
      ))}
    </svg>
  );
}

/** Big flow arrows tracing the outer seat ring — the reference's clockwise
 *  (or, mirrored, counter-clockwise) turn-direction cue. Same left/right-
 *  extreme placement rationale as uno-table.tsx's UnoDirectionArc: the
 *  tangent to an axis-aligned ellipse at its true left/right points is
 *  always vertical regardless of independent x/y scaling, so a simple
 *  up/down chevron there never distorts. */
export function StadiumDirectionArc({ direction }: { direction: 1 | -1 }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ transform: direction === -1 ? "scaleX(-1)" : undefined }} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path
          d="M 6 48 A 44 42 0 1 0 94 48 A 44 42 0 1 0 6 48"
          fill="none"
          stroke="#F5B347"
          strokeWidth="1.4"
          strokeDasharray="3 7"
          opacity="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <StadiumFlowChevron left="94%" top="48%" pointDown />
      <StadiumFlowChevron left="6%" top="48%" pointDown={false} />
    </div>
  );
}

function StadiumFlowChevron({ left, top, pointDown }: { left: string; top: string; pointDown: boolean }) {
  return (
    <div className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          d={pointDown ? "M6 8 L12 16 L18 8" : "M6 16 L12 8 L18 16"}
          fill="none"
          stroke="#F5B347"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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
  return (
    <div className="relative flex flex-col items-center gap-1">
      {isTurn && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full text-[#3a2410] whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,#F7DA8B,#E6A11E)", boxShadow: "0 2px 5px rgba(0,0,0,0.35)" }}
        >
          Playing
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-shrink-0">
          {isSpotlight && (
            <span
              className="absolute -inset-2 rounded-2xl animate-pulse pointer-events-none"
              style={{ boxShadow: "0 0 0 3px rgba(196,120,230,0.6), 0 0 18px 5px rgba(196,120,230,0.4)" }}
              aria-hidden
            />
          )}
          {/* Turn glow — independent of the spotlight ring above (that one
              marks a fixed SEAT position, not whose turn it is). Offset a
              touch further out so the two can layer without fighting when
              the spotlight seat's occupant is also the active player. */}
          {isTurn && (
            <span
              className="absolute -inset-2.5 rounded-2xl animate-pulse pointer-events-none"
              style={{ boxShadow: "0 0 0 3px #F7DA8B, 0 0 22px 6px rgba(247,218,139,0.55)" }}
              aria-hidden
            />
          )}
          {isHost && (
            <span className="absolute -top-3 -left-1.5 z-10 text-base leading-none" aria-hidden title="Room host">
              👑
            </span>
          )}
          <div
            className="rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              width: tile,
              height: tile,
              background: `linear-gradient(168deg, ${accent.light}, ${accent.dark})`,
              border: "2.5px solid rgba(255,255,255,0.65)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
            }}
          >
            <Avatar name={name} size={tile - 12} />
          </div>
          {isConnected === false && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-black/40"
              style={{ background: "#F59E0B" }}
              title="Reconnecting…"
              aria-label="Reconnecting"
            />
          )}
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span
            className="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-black text-white"
            style={{ background: accent.base, border: "1.5px solid rgba(255,255,255,0.85)" }}
          >
            {seatNumber}
          </span>
          <span
            className="text-[13px] font-bold text-white truncate max-w-[5.5rem]"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
          >
            {name}
          </span>
        </div>
      </div>
      <span className="text-[15px] font-black text-white leading-none" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
        {handSize}
      </span>
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
    <div className="flex items-center gap-2">
      <div className="relative flex-shrink-0">
        {isTurn && (
          <span
            className="absolute -inset-1.5 rounded-2xl animate-pulse pointer-events-none"
            style={{ boxShadow: "0 0 0 3px #F7DA8B, 0 0 20px 5px rgba(247,218,139,0.55)" }}
            aria-hidden
          />
        )}
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            background: `linear-gradient(168deg, ${SELF_STADIUM_ACCENT.light}, ${SELF_STADIUM_ACCENT.dark})`,
            border: "2.5px solid #FFF6D8",
            boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
          }}
        >
          <Avatar name={name} size={40} />
        </div>
        <span
          className="absolute -bottom-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center"
          style={{ background: SELF_STADIUM_ACCENT.base, border: "1.5px solid rgba(255,255,255,0.85)" }}
        >
          {seatNumber}
        </span>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: "#F7DA8B" }}>
          You
        </span>
        <span className="text-sm font-black text-white uppercase truncate max-w-[6rem]">{name}</span>
        <span className="text-[13px] font-black text-white leading-none">{handSize}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Pile centre — wraps the existing UnoTableCenter (draw/discard mechanics
// untouched) with the reference's "DRAW PILE" / "DISCARD PILE" captions.
// ---------------------------------------------------------------------

export function StadiumPileCenter(props: UnoTableCenterProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-5 sm:gap-7 justify-center">
        <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/70 w-14 sm:w-16 text-center">
          Draw Pile
        </span>
        <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/70 w-16 sm:w-20 text-center">
          Discard Pile
        </span>
      </div>
      <UnoTableCenter {...props} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Top bar — room-code plate, classic-mode/house-rules badge, icon rail.
// ---------------------------------------------------------------------

export function StadiumRoomCodePlate({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
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
        className="flex items-center justify-center w-6 h-6 rounded-md text-white flex-shrink-0"
        style={{ background: copied ? "#2F9E44" : "rgba(255,255,255,0.15)" }}
      >
        {copied ? (
          <span className="text-[10px] font-black">✓</span>
        ) : (
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2.5" fill="currentColor" opacity="0.95" />
            <rect x="4" y="4" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function StadiumClassicModeBadge() {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white whitespace-nowrap"
      style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.2)" }}
    >
      <span aria-hidden>⭐</span>
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
      <span aria-hidden>🎲</span>
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
        ⚙️
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
      <span className="text-base leading-none" aria-hidden>💬</span>
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

export function StadiumUnoButton({ enabled, onDeclare }: { enabled: boolean; onDeclare: () => void }) {
  return (
    <button
      onClick={enabled ? onDeclare : undefined}
      disabled={!enabled}
      aria-label={enabled ? "Declare UNO — you have one card left" : "Declare UNO — enabled once you hold exactly one card"}
      className={`flex items-center justify-center rounded-full font-black italic text-lg tracking-tight text-white ${
        enabled ? "animate-pulse" : "cursor-not-allowed opacity-45"
      }`}
      style={{
        width: "5.6rem",
        height: "2.6rem",
        background: enabled
          ? "radial-gradient(circle at 35% 30%, #F97362, #E23122 55%, #B01212 100%)"
          : "linear-gradient(180deg,#7a2a24,#5a1c18)",
        border: "3px solid #FFF6E4",
        // Physical-button bevel: a short, solid "ledge" shadow under the rim
        // (reads as thickness, not just a flat gradient fill) plus the
        // existing soft ambient shadow further out.
        boxShadow: enabled
          ? "0 3px 0 1.5px #7a0f0f, 0 8px 18px rgba(176,18,18,0.55), inset 0 2px 3px rgba(255,255,255,0.35)"
          : "0 2px 0 1.5px #3a1512",
        textShadow: "0 2px 2px rgba(0,0,0,0.35)",
      }}
    >
      UNO
    </button>
  );
}

export function StadiumTurnTimerPill({ deadline, myTurn }: { deadline: number | null; myTurn: boolean }) {
  const secondsLeft = useTurnSecondsLeft(deadline);
  if (deadline == null) return null;
  const urgent = secondsLeft <= 10;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap"
      style={{
        background: urgent ? "rgba(220,38,38,0.88)" : "rgba(0,0,0,0.42)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.25)",
      }}
    >
      <span aria-hidden>⏰</span>
      <span>{myTurn ? "Your Turn" : "Their Turn"}</span>
      <span className="tabular-nums">{secondsLeft}s</span>
    </div>
  );
}
