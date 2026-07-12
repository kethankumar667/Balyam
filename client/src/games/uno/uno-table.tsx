import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSpring, animated } from "@react-spring/web";
import type { UnoCard, UnoColor } from "@shared/types";
import { UnoCardFace, UnoCardBack, WildColorPicker } from "./uno-shared";
import { getCardLabel, CARD_DISPLAY } from "./helpers/deck";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import Avatar from "../rummy/Avatar";

/**
 * Watches `state.lastAction` for a Reverse/Skip resolving, plays the
 * matching sound, and returns which one just happened for ~650ms — long
 * enough to trigger `UnoDirectionArc`'s `uno-flourish-pulse` (index.css).
 * Text-matched against the engine's own `lastAction` strings ("Reverse!
 * Playing clockwise.", "Skip! Next player skipped.") rather than a
 * dedicated event field, since lastAction already exists on the wire and
 * is exactly this kind of "something just happened" signal (see
 * UnoActionToast, which watches the same field for its banner). Fires for
 * every player at the table, not just the one who played the card — a
 * skip/reverse is a shared table event, matching Volume 8 §22-23.
 */
export function useUnoEventFlourish(lastAction: string | null): "reverse" | "skip" | null {
  const { play: playSound } = useAudio();
  const [flourish, setFlourish] = useState<"reverse" | "skip" | null>(null);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (lastAction && lastAction !== prev.current) {
      if (lastAction.startsWith("Reverse!")) {
        setFlourish("reverse");
        prev.current = lastAction;
        playSound(AUDIO.UNO_REVERSE);
        const t = window.setTimeout(() => setFlourish(null), 650);
        return () => window.clearTimeout(t);
      }
      if (lastAction.startsWith("Skip!")) {
        setFlourish("skip");
        prev.current = lastAction;
        playSound(AUDIO.UNO_SKIP);
        const t = window.setTimeout(() => setFlourish(null), 650);
        return () => window.clearTimeout(t);
      }
    }
    prev.current = lastAction;
  }, [lastAction, playSound]);

  return flourish;
}

// ---------------------------------------------------------------------
// Always-visible timer tag ("⏰ 00:45" in the reference), distinct from
// TurnTimeWarning (which only appears in the final ≤10s as a full-screen
// urgency pulse — kept as-is and layered on top of this for that moment).
// ---------------------------------------------------------------------

export function UnoTimerBadge({ deadline }: { deadline: number | null }) {
  const secondsLeft = useTurnSecondsLeft(deadline);
  if (deadline == null) return null;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const urgent = secondsLeft <= 10;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black tabular-nums shadow-md"
      style={{
        background: "#FFF9F0",
        border: `2px solid ${urgent ? "#DC2626" : "#6D4323"}`,
        color: urgent ? "#DC2626" : "#6D4323",
        transform: "rotate(-2deg)",
      }}
    >
      <span aria-hidden>⏰</span>
      <span>
        {mm}:{ss}
      </span>
    </div>
  );
}

/**
 * Circular-table board redesign (see PLAN_REVIEW_REPORT.md §9, 2026-07-11
 * "Phase 4 — table redesign" entry). Matches the layout/behaviour of the
 * reference mobile-UNO table view — oval mat, opponents arranged around the
 * top arc, curved direction indicator, own hand as a tilted card fan — using
 * Bhalyam's existing assets only:
 *   - Real card art: the already-built `UnoCardFace`/`UnoCardBack` SVGs.
 *   - Avatars: the shared initials-on-gradient `Avatar` (no custom character
 *     illustration system exists in this codebase — see the design-scope
 *     note in the implementation log).
 *   - Palette/texture: Bhalyam's own cream/gold/wood tones, approximated
 *     with CSS gradients rather than painted art (no delivered illustration
 *     asset exists for the table mat yet — `lobby-prop-uno`/`corner-uno` in
 *     illustrations.ts are still null).
 * Every piece here is presentation-only — it consumes the exact same
 * `UnoBoardModel` the panel-based layout did; no hook/engine changes.
 */

// ---------------------------------------------------------------------
// Seat ring — positions N opponents across the upper arc of the mat,
// leaving the bottom for the local player. Percentage-based (not the
// fixed-pixel radius uno-deal.tsx uses for its one-shot deal animation)
// so it scales with the table container instead of the viewport.
// ---------------------------------------------------------------------

export interface SeatPosition {
  left: string;
  top: string;
  /** Which way this seat's card fan should stack, so it reads as fanning
   *  away from the seat rather than off the edge of the table. */
  fanDir: "left" | "right" | "up";
}

export function computeSeatPosition(index: number, total: number): SeatPosition {
  const n = Math.max(1, total);
  // Sweep from just under 180° (upper-left) to just over 0° (upper-right),
  // passing through 90° (top-centre) at the midpoint.
  const angleDeg = 180 - ((index + 1) / (n + 1)) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const RADIUS_X = 42;
  const RADIUS_Y = 46;
  const left = 50 + Math.cos(angleRad) * RADIUS_X;
  const top = 54 - Math.sin(angleRad) * RADIUS_Y;
  const fanDir = angleDeg > 115 ? "left" : angleDeg < 65 ? "right" : "up";
  return { left: `${left}%`, top: `${top}%`, fanDir };
}

// ---------------------------------------------------------------------
// The oval mat itself.
// ---------------------------------------------------------------------

export function UnoTableMat({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full h-full rounded-full"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #E8B96B 0%, #D9A05B 55%, #B9793A 100%)",
        boxShadow:
          "inset 0 0 0 10px rgba(109,67,35,0.35), inset 0 10px 46px rgba(46,26,10,0.35), 0 24px 60px -18px rgba(0,0,0,0.55)",
      }}
    >
      <div
        className="absolute inset-[9%] rounded-full"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, #FBF3E3 0%, #F0DFC0 100%)",
          boxShadow: "inset 0 4px 20px rgba(109,67,35,0.28)",
        }}
      />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// Curved direction indicator — two arcs, mirrored when direction is -1.
// Flips instantly and correctly since UnoEngine.stepIndex (Foundation
// phase) made `direction` an accurate signal for the first time.
// ---------------------------------------------------------------------

export function UnoDirectionArc({
  direction,
  flourish = false,
}: {
  direction: 1 | -1;
  /** Briefly pulses the arc when a Reverse/Skip resolves — see useUnoEventFlourish. */
  flourish?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`absolute inset-0 w-full h-full pointer-events-none ${flourish ? "uno-flourish-pulse" : ""}`}
      style={{ transform: direction === -1 ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <defs>
        <marker id="uno-dir-arrowhead" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#8B5E34" />
        </marker>
      </defs>
      <path
        d="M 26 66 A 96 96 0 0 1 96 10"
        fill="none"
        stroke="#8B5E34"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="2 7"
        markerEnd="url(#uno-dir-arrowhead)"
        opacity="0.5"
      />
      <path
        d="M 174 134 A 96 96 0 0 1 104 190"
        fill="none"
        stroke="#8B5E34"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="2 7"
        markerEnd="url(#uno-dir-arrowhead)"
        opacity="0.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------
// Table centre — draw pile + discard, replacing the old boxed DeckPanel
// with cards sitting directly on the mat.
// ---------------------------------------------------------------------

export interface UnoTableCenterProps {
  topCard: UnoCard;
  currentColor: UnoColor | null;
  deckCount: number;
}

export function UnoTableCenter({ topCard, currentColor, deckCount }: UnoTableCenterProps) {
  const wildTop = topCard.rank === "Wild" || topCard.rank === "Wild+4";
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-14 h-20 sm:w-16 sm:h-24">
        <UnoCardBack className="w-full h-full drop-shadow-lg" />
        <span className="absolute -bottom-1.5 -right-1.5 min-w-[1.4rem] h-5 px-1 flex items-center justify-center rounded-full bg-[#6D4323] text-[#F7E8C4] text-[10px] font-bold ring-2 ring-[#FFF9F0]">
          {deckCount}
        </span>
      </div>
      <div className="relative w-16 h-24 sm:w-20 sm:h-28">
        <div className="absolute inset-0 -rotate-[10deg] opacity-50" aria-hidden>
          <UnoCardBack className="w-full h-full" />
        </div>
        {/* `key={topCard.id}` forces a remount on every play, so the spring's
            `from` -> `to` run fires fresh each time — a proper 3D flip
            (face-down edge-on -> face-up) rather than the earlier
            uno-card-land CSS keyframe's flat scale/rotate settle. */}
        <UnoCardFlipFace key={topCard.id} card={topCard} />
        {wildTop && currentColor && (
          <div className="absolute -bottom-6 inset-x-0 text-center text-[10px] font-bold uppercase tracking-wide text-[#6E5E4D] whitespace-nowrap">
            → {CARD_DISPLAY[currentColor]?.label}
          </div>
        )}
      </div>
      <span className="sr-only">{getCardLabel(topCard)}</span>
    </div>
  );
}

/** React Spring-driven 3D flip for the discard pile's top card — remounted
 *  via `key={topCard.id}` by the caller so every new play triggers a fresh
 *  `from` -> `to` spring run. React Spring has no reduced-motion hook of its
 *  own, so this reuses Motion's `useReducedMotion` (same source UnoHandFan
 *  reads) rather than standing up a second matchMedia listener — the global
 *  CSS rule in index.css doesn't reach this component's WAAPI-level
 *  transform either way, same caveat as UnoHandFan's Motion animations. */
function UnoCardFlipFace({ card }: { card: UnoCard }) {
  const prefersReducedMotion = useReducedMotion();
  const springs = useSpring({
    from: { rotateY: prefersReducedMotion ? 0 : -110, opacity: prefersReducedMotion ? 1 : 0.5 },
    to: { rotateY: 0, opacity: 1 },
    config: { tension: 280, friction: 24 },
  });
  return (
    <animated.div
      className="absolute inset-0 rotate-[7deg]"
      style={{
        transform: springs.rotateY.to((r) => `perspective(500px) rotateY(${r}deg)`),
        opacity: springs.opacity,
      }}
    >
      <UnoCardFace card={card} className="w-full h-full drop-shadow-xl" />
    </animated.div>
  );
}

// ---------------------------------------------------------------------
// Opponent chip — avatar + name/count pill + directional card-back fan +
// optional catch affordance. Positioned by the caller via computeSeatPosition.
// ---------------------------------------------------------------------

export interface UnoPlayerChipProps {
  name: string;
  handSize: number;
  isTurn: boolean;
  fanDir: "left" | "right" | "up";
  canCatch?: boolean;
  onCatch?: () => void;
  /** Drops the name from the pill (avatar initials + colour already carry
   *  identity) and shrinks the avatar — at high player counts on a narrow
   *  viewport, adjacent seats' full-width name pills visually collide
   *  (confirmed at 8 players / 390px: name text overlapped illegibly).
   *  computeSeatPosition's percentage-based ellipse doesn't get narrower
   *  seat-to-seat gaps at high counts, but it does get *fewer pixels* of
   *  gap on a narrow viewport, so this is opt-in per shell rather than
   *  always-on. */
  compact?: boolean;
}

export function UnoPlayerChip({
  name,
  handSize,
  isTurn,
  fanDir,
  canCatch = false,
  onCatch,
  compact = false,
}: UnoPlayerChipProps) {
  const fanCount = Math.min(handSize, 6);
  const fanRow = fanDir === "left" ? "flex-row-reverse" : "flex-row";
  return (
    <div className="relative flex flex-col items-center gap-1">
      {fanCount > 0 && (
        <div className={`flex ${fanRow} items-end -mb-1`} aria-hidden>
          {Array.from({ length: fanCount }).map((_, i) => (
            <div
              key={i}
              className="w-5 h-7"
              style={{
                marginLeft: i === 0 ? 0 : fanDir === "left" ? 0 : -12,
                marginRight: fanDir === "left" && i > 0 ? -12 : 0,
                transform: `rotate(${(i - (fanCount - 1) / 2) * 8}deg)`,
              }}
            >
              <UnoCardBack className="w-full h-full drop-shadow-sm" />
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <Avatar name={name} size={compact ? 38 : 52} />
        {isTurn && (
          <>
            <div
              className="absolute -inset-1.5 rounded-full pointer-events-none animate-pulse"
              style={{ boxShadow: "0 0 0 3px #E6A11E, 0 0 14px 2px rgba(230,161,30,0.65)" }}
              aria-hidden
            />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none" aria-hidden>
              <span
                className="text-[8px] font-black uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full text-[#2B2118] whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #F7DA8B, #E6A11E)" }}
              >
                ▸ Playing
              </span>
            </div>
          </>
        )}
      </div>
      <div
        className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white flex items-center gap-1 whitespace-nowrap"
        style={{ background: "rgba(43,33,24,0.82)" }}
      >
        {!compact && <span className="truncate max-w-[6rem]">{name}</span>}
        <span className="opacity-70">{handSize}</span>
      </div>
      {canCatch && (
        <button
          onClick={onCatch}
          // min-h-[28px] — the visual pill stays compact (matches the
          // seat chip's scale) but the tap target itself clears WCAG 2.5.8's
          // 24x24px minimum with room to spare; a straight text-[9px]/py-0.5
          // pill (the original size here) landed around 13-15px tall, well
          // under it, for what's a real, meaningful tap action.
          className="mt-0.5 min-h-[28px] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white animate-pulse whitespace-nowrap"
          style={{ background: "#DC2626" }}
          aria-label={`Catch ${name} without UNO — they draw 2`}
        >
          Catch! +2
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Own hand — tilted, overlapping card fan (replaces HandPanel's flex-wrap
// grid for the circular-table layout; HandPanel itself is untouched and
// still used wherever the panel-based layout survives, e.g. GameOverPanel
// context or a future compact view).
// ---------------------------------------------------------------------

export interface UnoHandFanProps {
  sortedHand: UnoCard[];
  validMoveIds: Set<string>;
  selectedCardId: string | null;
  myTurn: boolean;
  phase: "playing" | "finished";
  onSelectCard: (cardId: string) => void;
  needsColorChoice: boolean;
  selectedWildColor: UnoColor | null;
  onPickColor: (color: UnoColor) => void;
}

export function UnoHandFan({
  sortedHand,
  validMoveIds,
  selectedCardId,
  myTurn,
  phase,
  onSelectCard,
  needsColorChoice,
  selectedWildColor,
  onPickColor,
}: UnoHandFanProps) {
  const n = sortedHand.length;
  // Framer Motion's own reduced-motion signal, not the global CSS rule
  // (index.css) — that rule only overrides CSS `animation`/`transition`
  // properties, and Motion's `layout`/spring transforms are JS/WAAPI-driven,
  // so the blanket rule doesn't reliably reach them. Same hook IllustrationSlot
  // already uses.
  const prefersReducedMotion = useReducedMotion();

  if (n === 0) {
    return <div className="text-center py-4 font-bold text-[#6E5E4D]">You win! 🎉</div>;
  }

  // Fan spread narrows as the hand grows so a full 7+ card hand doesn't
  // run off the table; overlap compensates by tightening simultaneously.
  const spreadDeg = Math.min(7, 46 / n);
  const overlapRem = n <= 5 ? 2.4 : n <= 9 ? 1.9 : 1.5;
  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 340, damping: 28 };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* AnimatePresence + layout: cards smoothly reflow into their new fan
          position when the hand changes (draw adds one, play removes one)
          instead of snapping, and a played/removed card animates out rather
          than vanishing instantly. initial={false} so mounting a fresh hand
          (page load, or the deal sequence handing off) doesn't replay an
          entrance animation for all 7 starting cards at once. */}
      <div className="flex items-end justify-center" style={{ minHeight: "8rem" }}>
        <AnimatePresence initial={false}>
          {sortedHand.map((card, i) => {
            const isSelected = card.id === selectedCardId;
            const isValid = validMoveIds.has(card.id);
            const isDisabled = !isValid && myTurn && phase === "playing";
            const offset = i - (n - 1) / 2;
            const rotate = offset * spreadDeg;
            const lift = isSelected ? -20 : Math.abs(offset) * Math.min(1.5, 10 / n);
            return (
              <motion.button
                key={card.id}
                layout
                onClick={() => (myTurn ? onSelectCard(card.id) : undefined)}
                disabled={isDisabled}
                aria-label={getCardLabel(card)}
                initial={{ opacity: 0, scale: 0.7, y: 24 }}
                animate={{ opacity: 1, scale: 1, rotate, y: lift }}
                exit={{ opacity: 0, scale: 0.6, y: -36, transition: { duration: 0.16 } }}
                transition={springTransition}
                className={`relative w-16 h-24 sm:w-[4.5rem] sm:h-[6.5rem] rounded-lg ${
                  isDisabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer hover:z-30"
                }`}
                style={{
                  marginLeft: i === 0 ? 0 : `-${overlapRem}rem`,
                  zIndex: isSelected ? 50 : i,
                }}
              >
                <div
                  className="w-full h-full rounded-lg"
                  style={{
                    boxShadow: isSelected
                      ? "0 0 0 3px #E6A11E, 0 10px 20px rgba(0,0,0,0.35)"
                      : "0 3px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  <UnoCardFace card={card} className="w-full h-full" />
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {needsColorChoice && (
        <div className="w-full max-w-xs">
          <WildColorPicker selectedWildColor={selectedWildColor} onPick={onPickColor} />
        </div>
      )}
    </div>
  );
}
