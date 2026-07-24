import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
  useSpring as useMotionSpring,
} from "framer-motion";
import type { Transition } from "framer-motion";
import { useSpring, animated, to } from "@react-spring/web";
import type { UnoCard, UnoColor, UnoPublicState } from "@shared/types";
import { UnoCardFace, UnoCardBack, WildColorPicker } from "./uno-shared";
import { getCardLabel, CARD_DISPLAY } from "./helpers/deck";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import Avatar from "../rummy/Avatar";

/** Swatch dots for the discard pile's "chosen colour" indicator — same
 *  hex values as uno-shared.tsx's UNO_BODY (kept local rather than
 *  imported since that map is module-private there and this is a tiny,
 *  self-contained decorative use). */
const WILD_COLOR_SWATCH: Record<UnoColor, string> = {
  R: "#D22B27",
  G: "#3AA03A",
  B: "#1C6DD0",
  Y: "#E8B100",
};

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
// urgency pulse). The two used to render simultaneously whenever it was
// your own turn with ≤10s left — two countdowns of the same number in two
// different screen corners, a real duplication bug, not just a style nit.
// Fixed by having this badge cede the moment: once TurnTimeWarning's own
// window opens (myTurn && secondsLeft <= 10), this badge hides so only
// the more prominent urgent pill shows. For an opponent's turn
// (TurnTimeWarning never activates) this badge keeps counting down as the
// sole indicator, unchanged.
// ---------------------------------------------------------------------

export function UnoTimerBadge({ deadline, myTurn }: { deadline: number | null; myTurn: boolean }) {
  const secondsLeft = useTurnSecondsLeft(deadline);
  if (deadline == null) return null;
  if (myTurn && secondsLeft <= 10 && secondsLeft > 0) return null;
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
// "Fired at" reaction — comedic per-seat flourish whenever a special-
// power card actually lands on someone (Skip, Draw Two, Draw Four,
// Stack absorb, Seven Swap, Zero Rotate, a caught UNO). Driven by
// `UnoPublicState.lastHit` (exact target id(s) + kind, set server-side —
// see UnoEngine's per-branch `hit:` assignments) rather than text-parsed
// from the toast, so it's reliably anchored even with duplicate names.
// ---------------------------------------------------------------------

type UnoHit = NonNullable<UnoPublicState["lastHit"]>;

/** One line of flavour per hit kind — emoji + label (some read the
 *  card-count) + accent colour for the badge chip. Kept light/funny per
 *  request: this is a table full of friends ribbing each other, not a
 *  scoreboard. */
const HIT_FLAVOR: Record<UnoHit["kind"], { emoji: string; label: (count?: number) => string; bg: string }> = {
  skip: { emoji: "⏭️", label: () => "SKIPPED!", bg: "linear-gradient(135deg,#F0765A,#D6472B)" },
  draw2: { emoji: "😵", label: (c) => `+${c ?? 2} OOF!`, bg: "linear-gradient(135deg,#F7B84A,#E6821E)" },
  draw4: { emoji: "🤯", label: (c) => `+${c ?? 4} YIKES!`, bg: "linear-gradient(135deg,#EF5DA8,#C22D74)" },
  stack: { emoji: "📚", label: (c) => `+${c ?? 0} STACKED!`, bg: "linear-gradient(135deg,#B084F0,#7C3AED)" },
  swap: { emoji: "🔄", label: () => "SWAPPED!", bg: "linear-gradient(135deg,#4ADE80,#16A34A)" },
  rotate: { emoji: "🌀", label: () => "ROTATED!", bg: "linear-gradient(135deg,#60A5FA,#2563EB)" },
  catch: { emoji: "🚨", label: (c) => `CAUGHT! +${c ?? 2}`, bg: "linear-gradient(135deg,#F87171,#DC2626)" },
};

/** Per-kind hold duration for `useUnoHitReaction` below. Every kind still
 *  using the plain `UnoHitBadge` holds for the badge's own ~1.5s pop
 *  animation; `draw2`/`draw4`/`skip`/`catch`/`stack` now drive their own
 *  cinematics (`animations/card/`), whose internal timelines run
 *  longer — the hold here must outlast each one or the component
 *  unmounts mid-sequence and GSAP's cleanup cuts the tail. */
const HIT_HOLD_MS: Partial<Record<UnoHit["kind"], number>> = {
  draw2: 1700,
  draw4: 2300,
  skip: 1800,
  catch: 1700,
  stack: 2100,
};
const DEFAULT_HIT_HOLD_MS = 1500;

/** Watches `lastHit` for a genuinely new value (stringified comparison —
 *  the server rebuilds the object fresh on every `getPublicState()` call,
 *  so reference equality would false-positive on every unrelated
 *  broadcast) and returns it for its kind's hold duration (see
 *  `HIT_HOLD_MS`), long enough for its reaction animation to play out
 *  fully. */
export function useUnoHitReaction(lastHit: UnoPublicState["lastHit"]): UnoHit | null {
  const [active, setActive] = useState<UnoHit | null>(null);
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    const key = lastHit ? JSON.stringify(lastHit) : null;
    if (key && key !== prevKey.current) {
      prevKey.current = key;
      setActive(lastHit);
      const holdMs = (lastHit && HIT_HOLD_MS[lastHit.kind]) ?? DEFAULT_HIT_HOLD_MS;
      const t = window.setTimeout(() => setActive(null), holdMs);
      return () => window.clearTimeout(t);
    }
    prevKey.current = key;
  }, [lastHit]);

  return active;
}

/** Resolves any seated player id to felt percentage coordinates — the
 *  self plate's fixed bottom-centre slot (both shells use the identical
 *  `left-1/2 bottom-[3%]` position for it) or an opponent's
 *  `computeSeatPosition` seat. Returns null for an id that isn't
 *  currently seated (e.g. someone who left mid-hit-animation). */
export function resolveSeatPosition(
  targetId: string,
  selfId: string | null,
  opponents: string[]
): { left: string; top: string } | null {
  if (targetId === selfId) return { left: "50%", top: "93%" };
  const idx = opponents.indexOf(targetId);
  if (idx === -1) return null;
  return computeSeatPosition(idx, opponents.length);
}

/** The actual comedic badge — bouncy pop-in, brief hold, fade. Callers
 *  wrap this in an absolutely-positioned div at `resolveSeatPosition`'s
 *  coordinates for each of `hit.targetIds`. */
export function UnoHitBadge({ hit }: { hit: UnoHit }) {
  const flavor = HIT_FLAVOR[hit.kind];
  return (
    <div className="uno-hit-pop pointer-events-none flex flex-col items-center" aria-hidden>
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white font-black text-[13px] uppercase tracking-wide whitespace-nowrap shadow-lg"
        style={{ background: flavor.bg, border: "2px solid rgba(255,255,255,0.75)" }}
      >
        <span className="text-base leading-none">{flavor.emoji}</span>
        {flavor.label(hit.count)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// The oval mat itself.
// ---------------------------------------------------------------------

/** Faint five-point stars scattered across the felt — the reference's
 *  watermark. Each is a fixed-size SVG at a percentage position so the
 *  stars never distort with the table's aspect ratio (a single stretched
 *  viewBox would). Kept very low-opacity so they read as a texture, not
 *  decoration competing with the cards. */
const STAR_PATH =
  "M12 1.6l2.94 6.36 6.96.72-5.2 4.66 1.46 6.86L12 23.2l-6.12 3.66 1.46-6.86-5.2-4.66 6.96-.72z";
const FELT_STARS: ReadonlyArray<{ x: number; y: number; s: number }> = [
  { x: 13, y: 24, s: 15 }, { x: 84, y: 19, s: 20 }, { x: 50, y: 11, s: 12 },
  { x: 24, y: 72, s: 17 }, { x: 76, y: 74, s: 15 }, { x: 91, y: 50, s: 13 },
  { x: 8, y: 52, s: 13 }, { x: 62, y: 84, s: 16 }, { x: 40, y: 44, s: 11 },
];

function UnoFeltStars() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {FELT_STARS.map((st, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={st.s}
          height={st.s}
          className="absolute"
          style={{ left: `${st.x}%`, top: `${st.y}%`, transform: "translate(-50%,-50%)" }}
        >
          <path d={STAR_PATH} fill="rgba(255,255,255,0.055)" />
        </svg>
      ))}
    </div>
  );
}

/**
 * The play surface — a dark-walnut wood frame with a brass bevel around a
 * star-watermarked red felt (the reference's table). Rounded-rectangle, not
 * the old oval, matching the reference. Seats/piles are positioned by the
 * caller as absolute children of this box (percentage math unchanged from
 * the oval version — see computeSeatPosition), layered above the felt.
 */
export function UnoTableMat({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full h-full"
      style={{
        borderRadius: "9% / 15%",
        background: "linear-gradient(158deg, #6d4626 0%, #4a2c16 60%, #3a2210 100%)",
        padding: "2.3%",
        boxShadow: "0 34px 66px -22px rgba(0,0,0,0.72)",
      }}
    >
      {/* Brass bevel ring between wood frame and felt */}
      <div
        className="absolute inset-[1.1%] pointer-events-none z-[1]"
        style={{
          borderRadius: "8% / 13.5%",
          boxShadow:
            "inset 0 0 0 3px rgba(228,192,110,0.9), inset 0 0 0 6px rgba(120,80,36,0.85), inset 0 2px 10px rgba(0,0,0,0.35)",
        }}
        aria-hidden
      />
      {/* Red felt */}
      <div
        className="absolute inset-[2.3%] overflow-hidden"
        style={{
          borderRadius: "7.6% / 12.6%",
          background:
            "radial-gradient(ellipse at 50% 42%, #C62D22 0%, #A81E17 58%, #8A130D 100%)",
          boxShadow: "inset 0 8px 30px rgba(58,6,4,0.5), inset 0 0 70px rgba(58,6,4,0.32)",
          // Scopes the emboss watermark's cqw font-size to THIS box's own
          // width, so it stays proportional to the felt regardless of the
          // caller's viewport-driven sizing (RummyBoardDesktop-style
          // aspect-ratio + max-w/max-h caps).
          containerType: "inline-size",
        }}
      >
        <UnoFeltStars />
        {/* Embossed table branding — pressed into the felt (light + dark
            offset text-shadows either side, near-transparent fill) rather
            than printed on top, so it reads as material, not decoration
            fighting the cards for attention. */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            fontSize: "9cqw",
            fontWeight: 900,
            fontStyle: "italic",
            letterSpacing: "-0.03em",
            color: "rgba(255,255,255,0.045)",
            textShadow: "1px 1px 0 rgba(0,0,0,0.1), -1px -1px 0 rgba(255,255,255,0.04)",
          }}
          aria-hidden
        >
          UNO
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// Direction indicator — a large dashed ring around the centre pile,
// mirrored when direction is -1.
//
// v1 was one big SVG with a square 200x200 viewBox stretched to
// `w-full h-full` of the felt — SVG's default `preserveAspectRatio`
// scaled it to the felt's HEIGHT on a wide desktop table, ballooning it
// across the middle and overlapping opponent seats. v2 fixed the overlap
// by shrinking to two tiny fixed-size icons on the side rails, which
// undercorrected. v3 brought back a proper ring (kept here, unchanged —
// confirmed good by the user) but its flow-direction arrows were drawn
// as raw `<path>` triangles INSIDE the same `preserveAspectRatio="none"`
// SVG as the ring — fine for a stroke (a dashed line reads the same
// however it's stretched) but wrong for a filled shape: on a wide
// desktop felt the non-uniform x/y scale flattened what should have
// been clean up/down chevrons into lopsided, sideways-reading blobs.
//
// v4 (this version) separates the two concerns: the ring stays exactly
// as-is (`viewBox="0 0 100 100"` + `preserveAspectRatio="none"` +
// `vectorEffect="non-scaling-stroke"`, matching `computeSeatPosition`'s
// own percentage system). The two flow arrows move OUTSIDE that
// stretched SVG entirely — each is its own small, normally-proportioned
// icon (`DirFlowChevron`, true 1:1 aspect, never stretched), positioned
// via percentage `left`/`top` at the ring's true leftmost/rightmost
// points. Those two points are the mathematically special case where a
// non-uniform x/y scale can't introduce any distortion: the tangent to
// ANY axis-aligned ellipse at its left/right extremes is always exactly
// vertical, before or after independent x/y scaling — so a simple
// up/down chevron there is always geometrically correct, regardless of
// the felt's aspect ratio.
// ---------------------------------------------------------------------

/** A single small, cleanly-proportioned flow chevron — never lives
 *  inside a non-uniformly-stretched SVG, so it always renders crisp. */
function DirFlowChevron({ pointDown }: { pointDown: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      style={{ transform: pointDown ? undefined : "rotate(180deg)" }}
      aria-hidden
    >
      <path
        d="M4 8 L12 16 L20 8"
        fill="none"
        stroke="#F7DA8B"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))" }}
      />
    </svg>
  );
}

export function UnoDirectionArc({
  direction,
  flourish = false,
  spinTrigger = null,
}: {
  direction: 1 | -1;
  /** Briefly pulses the arc when a Reverse/Skip resolves — see useUnoEventFlourish. */
  flourish?: boolean;
  /** Non-null, changing key → the two flow chevrons spin a full turn —
   *  Reverse's "direction arrow spin" (animation #3). `key`-remounted per
   *  trigger so Framer Motion always replays from 0 rather than no-op'ing
   *  when consecutive triggers happen to share an end value. Skip does
   *  NOT spin the arrows (only Reverse does), hence a dedicated prop
   *  rather than reusing the existing `flourish` boolean. */
  spinTrigger?: string | null;
}) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${flourish ? "uno-flourish-pulse" : ""}`}
      style={{ transform: direction === -1 ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {/* The closed ring — standard "two arcs" SVG ellipse trick (start
            at the leftmost point, sweep to the rightmost point and back),
            so the geometry is always a true closed ellipse with no seam. */}
        <path
          d="M 29 48 A 21 20 0 1 0 71 48 A 21 20 0 1 0 29 48"
          fill="none"
          stroke="#F7DA8B"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="2.2 5"
          opacity="0.85"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Flow chevrons at the ring's true left/right extremes — right
          points down, left points up, reading as clockwise rotation
          (mirrored to counter-clockwise by this wrapper's scaleX(-1)
          above when direction is -1, same as every other table element). */}
      <motion.div
        key={`r-${spinTrigger ?? "static"}`}
        className="absolute"
        style={{ left: "71%", top: "48%", translateX: "-50%", translateY: "-50%" }}
        initial={false}
        animate={{ rotate: spinTrigger ? 360 : 0 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      >
        <DirFlowChevron pointDown />
      </motion.div>
      <motion.div
        key={`l-${spinTrigger ?? "static"}`}
        className="absolute"
        style={{ left: "29%", top: "48%", translateX: "-50%", translateY: "-50%" }}
        initial={false}
        animate={{ rotate: spinTrigger ? 360 : 0 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      >
        <DirFlowChevron pointDown={false} />
      </motion.div>
    </div>
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
  /** True while a hand card is being dragged (any card, anywhere) — shows
   *  the "Drop to play" affordance. Mirrors Rummy's Open Pile drop zone:
   *  a single "is a drag in flight" flag, not per-pixel hover tracking —
   *  there's only one drop target here, so that's all that's needed. */
  isDragging?: boolean;
  /** True when it's this player's turn and they haven't drawn yet — ported
   *  from Rummy's ClosedDeck: the pile itself is the primary way to draw
   *  (glowing to invite a tap), the "D" keyboard shortcut is the secondary
   *  one, matching Rummy's own draw-pile-tap-only design (no separate
   *  "Draw Card" button exists there either). */
  canDraw?: boolean;
  onDraw?: () => void;
}

/** A few colored cards scattered under the discard top — the "pile of
 *  already-played cards" look from the reference. Purely decorative (fixed
 *  angles/colours, not the real discard history, which isn't on the wire),
 *  so it's aria-hidden and sits behind the live top card. */
const DISCARD_SCATTER: ReadonlyArray<{ c: string; rot: number; x: number; y: number }> = [
  { c: "#3AA03A", rot: -24, x: -18, y: 4 },
  { c: "#1C6DD0", rot: 18, x: 16, y: 7 },
  { c: "#E8B100", rot: -6, x: -4, y: -9 },
];

function UnoDiscardScatter() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {DISCARD_SCATTER.map((cd, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-lg"
          style={{
            width: "86%",
            height: "90%",
            background: cd.c,
            border: "3px solid #fff",
            transform: `translate(-50%,-50%) translate(${cd.x}px,${cd.y}px) rotate(${cd.rot}deg)`,
            boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
          }}
        />
      ))}
    </div>
  );
}

export function UnoTableCenter({
  topCard,
  currentColor,
  deckCount,
  isDragging = false,
  canDraw = false,
  onDraw,
}: UnoTableCenterProps) {
  const wildTop = topCard.rank === "Wild" || topCard.rank === "Wild+4";
  return (
    <div className="flex items-center gap-5 sm:gap-7">
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          {/* Stacked thickness behind the top back — a real deck, not one card. */}
          <div className="absolute inset-0 rounded-lg translate-x-[3px] translate-y-[3px] rotate-2" aria-hidden>
            <UnoCardBack className="w-full h-full opacity-90 drop-shadow" />
          </div>
          <div className="absolute inset-0 rounded-lg translate-x-[1.5px] translate-y-[1.5px] rotate-1" aria-hidden>
            <UnoCardBack className="w-full h-full opacity-95 drop-shadow" />
          </div>
          <button
            onClick={onDraw}
            disabled={!canDraw}
            aria-label="Draw a card"
            title={canDraw ? "Draw a card (D)" : "Draw pile"}
            className={`relative w-14 h-20 sm:w-16 sm:h-24 rounded-lg transition ${
              canDraw ? "cursor-pointer hover:-translate-y-1" : "cursor-default"
            }`}
          >
            {canDraw && (
              <div
                className="absolute -inset-1.5 rounded-lg pointer-events-none animate-pulse"
                style={{ boxShadow: "0 0 0 3px #E6A11E, 0 0 14px 2px rgba(230,161,30,0.6)" }}
                aria-hidden
              />
            )}
            <UnoCardBack className="w-full h-full drop-shadow-lg" />
            <span className="absolute -bottom-1.5 -right-1.5 min-w-[1.4rem] h-5 px-1 flex items-center justify-center rounded-full bg-[#6D4323] text-[#F7E8C4] text-[10px] font-bold ring-2 ring-[#FFF9F0]">
              {deckCount}
            </span>
          </button>
        </div>
        {canDraw && (
          <div className="text-[9px] uppercase tracking-wide font-black text-[#FBE7A8] whitespace-nowrap drop-shadow">
            Tap to draw
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {/* data-uno-drop tags this as the discard drop zone, resolved via
            elementFromPoint from UnoHandFan's pointer-drag handlers — same
            pattern as Rummy's data-rummy-drop. Always present (unlike
            Rummy's conditional attribute) since there's only ever this one
            drop target — no risk of a stray resolveUnoDropTarget hit
            elsewhere, and it gives tooling/tests a stable selector at rest. */}
        <div
          className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg transition-shadow"
          data-uno-drop="discard"
          style={{
            boxShadow: isDragging
              ? "0 0 0 3px #E6A11E, 0 0 16px 4px rgba(230,161,30,0.5)"
              : undefined,
          }}
        >
          {/* Colour-matched ambient glow — painted first so the card art
              (below) covers its centre and only the blurred edge shows.
              Reads the active colour at a glance, before parsing the pip —
              wild cards glow once currentColor is picked, same as the
              chosen-colour pill below. */}
          {(topCard.color ?? currentColor) && (
            <div
              className="absolute -inset-3 rounded-xl pointer-events-none"
              style={{
                background: WILD_COLOR_SWATCH[(topCard.color ?? currentColor) as UnoColor],
                opacity: 0.5,
                filter: "blur(10px)",
              }}
              aria-hidden
            />
          )}
          <UnoDiscardScatter />
          <div className="absolute inset-0 -rotate-[10deg] opacity-50" aria-hidden>
            <UnoCardBack className="w-full h-full" />
          </div>
          {/* `key={topCard.id}` forces a remount on every play, so the spring's
              `from` -> `to` run fires fresh each time — a proper 3D flip
              (face-down edge-on -> face-up) rather than the earlier
              uno-card-land CSS keyframe's flat scale/rotate settle. */}
          <UnoCardFlipFace key={topCard.id} card={topCard} />
          {wildTop && currentColor && (
            <div
              className="absolute -bottom-9 inset-x-0 flex justify-center z-10"
              // A player who wasn't looking at the toast when a Wild landed
              // needs a SECOND, persistent place to find the chosen colour —
              // this pill (swatch dot + label, high-contrast dark chip) sits
              // right under the card for exactly that. Sized up per live
              // user feedback ("make the color indication pill also in big
              // size") — was a compact 11px chip, now a larger, harder-to-
              // miss badge matching the toast's own emphasis treatment.
            >
              <div
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[15px] font-black uppercase tracking-wide text-white whitespace-nowrap shadow-lg"
                style={{ background: "rgba(42,26,15,0.92)", border: "2px solid rgba(247,218,139,0.7)" }}
              >
                <span
                  className="w-4 h-4 rounded-full ring-2 ring-white/80"
                  style={{ background: WILD_COLOR_SWATCH[currentColor] }}
                  aria-hidden
                />
                {CARD_DISPLAY[currentColor]?.label}
              </div>
            </div>
          )}
        </div>
        {isDragging && (
          <div className="text-[9px] uppercase tracking-wide font-bold text-[#E6A11E] whitespace-nowrap">
            Drop to play
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
  // Wider swing (-170deg, near edge-on) and a lower-friction spring than the
  // original -110deg/friction:24 — the extra travel plus the natural
  // slight overshoot of an underdamped spring reads as a card actually
  // landing with some weight, not just sliding into place.
  const springs = useSpring({
    from: {
      rotateY: prefersReducedMotion ? 0 : -170,
      opacity: prefersReducedMotion ? 1 : 0.3,
      scale: prefersReducedMotion ? 1 : 0.8,
    },
    to: { rotateY: 0, opacity: 1, scale: 1 },
    config: { tension: 300, friction: 18 },
  });
  return (
    <animated.div
      className="absolute inset-0 rotate-[7deg]"
      style={{
        transform: to(
          [springs.rotateY, springs.scale],
          (r, s) => `perspective(600px) rotateY(${r}deg) scale(${s})`
        ),
        opacity: springs.opacity,
      }}
    >
      <UnoCardFace card={card} className="w-full h-full drop-shadow-2xl" />
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
  /** Undefined when unknown (e.g. no Player record resolved yet) — only
   *  renders the dot once we actually know a connection state, same
   *  optional-prop shape Rummy's own player-list connection dot assumes
   *  implicitly by always having `Player.isConnected` in scope. */
  isConnected?: boolean;
}

/** Glossy nameplate accent palette — the saturated banner colours in the
 *  reference (gold, purple, green, blue, teal, rose). Assigned deterministically
 *  per player name so a given player keeps the same plate colour all game. */
interface PlateAccent {
  light: string;
  base: string;
  dark: string;
  ring: string;
}
const PLATE_ACCENTS: ReadonlyArray<PlateAccent> = [
  { light: "#F6C24B", base: "#E0982A", dark: "#A96A16", ring: "#F7DA8B" }, // gold
  { light: "#B07CE8", base: "#8A4FD0", dark: "#5F2FA0", ring: "#D9BEF5" }, // purple
  { light: "#5BC46B", base: "#2FA043", dark: "#1E7A30", ring: "#B7E7BF" }, // green
  { light: "#3FD0C4", base: "#17A79A", dark: "#0E7A70", ring: "#B5EDE7" }, // teal
  { light: "#F0708A", base: "#D23E5E", dark: "#A01C3A", ring: "#F5BECB" }, // rose
];
/** The local player's plate is always the reference's blue, regardless of name. */
const SELF_ACCENT: PlateAccent = { light: "#5AA9F0", base: "#2E7CD0", dark: "#1C57A0", ring: "#BEDCF5" };

function accentFor(seed: string): PlateAccent {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PLATE_ACCENTS[Math.abs(h) % PLATE_ACCENTS.length];
}

/**
 * The glossy colored nameplate: an accent-gradient banner with a rounded
 * avatar tile and the player's name. No level/trophy badges — the game has
 * no such data, so rather than show invented numbers the plate carries only
 * what's real (identity + turn state). Used for both opponents (via
 * UnoPlayerChip) and the local player (isSelf) so the whole table shares one
 * plate language.
 */
export function UnoNamePlate({
  name,
  isTurn = false,
  isSelf = false,
  compact = false,
}: {
  name: string;
  isTurn?: boolean;
  isSelf?: boolean;
  compact?: boolean;
}) {
  const a = isSelf ? SELF_ACCENT : accentFor(name);
  // The signature "impossible to miss" turn cue, reused everywhere a plate
  // renders: a thicker gold ring plus a soft outer glow, pulsing — not just
  // the thin static ring this used to be. The gold stays fixed (not the
  // per-player accent colour) so "whose turn" reads as ONE consistent
  // language across every seat, the way UnoDraggableHandCard's playable-
  // card glow and the discard pile's colour glow do elsewhere on the table.
  const turnRing = isTurn
    ? `0 0 0 3px #F7DA8B, 0 0 18px 4px rgba(247,218,139,0.55), 0 6px 14px rgba(0,0,0,0.4)`
    : "0 5px 12px rgba(0,0,0,0.4)";
  const turnTag = isTurn ? (
    <span
      className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-full text-[#3a2410] whitespace-nowrap"
      style={{ background: "linear-gradient(135deg,#F7DA8B,#E6A11E)", boxShadow: "0 2px 5px rgba(0,0,0,0.35)" }}
    >
      {isSelf ? "Your Turn" : "Playing"}
    </span>
  ) : null;

  // Compact = an avatar-only glossy chip (no name banner). Used for crowded
  // seats — a phone can't fit 3+ full name banners around a small felt, and
  // the accent colour + avatar initials already carry identity there.
  if (compact) {
    const tile = 34;
    return (
      <div className="relative">
        {turnTag}
        <div
          className={`rounded-xl overflow-hidden flex items-center justify-center ${isTurn ? "animate-pulse" : ""}`}
          style={{
            width: tile,
            height: tile,
            background: `linear-gradient(168deg, ${a.light}, ${a.dark})`,
            border: "2px solid rgba(255,255,255,0.6)",
            boxShadow: turnRing,
          }}
        >
          <Avatar name={name} size={tile - 10} />
        </div>
      </div>
    );
  }

  const tile = 40;
  return (
    <div className="relative">
      {turnTag}
      <div
        className={`uno-plate-sheen flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-2xl ${isTurn ? "animate-pulse" : ""}`}
        style={{
          background: `linear-gradient(168deg, ${a.light}, ${a.base} 62%, ${a.dark})`,
          border: "1.5px solid rgba(255,255,255,0.55)",
          boxShadow: turnRing,
        }}
      >
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{ width: tile, height: tile, background: a.dark, border: "2px solid rgba(255,255,255,0.55)" }}
        >
          <Avatar name={name} size={tile - 12} />
        </div>
        <span
          className="relative font-black text-white uppercase tracking-wide truncate text-sm max-w-[7rem]"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          {name}
          {isSelf ? " (you)" : ""}
        </span>
      </div>
    </div>
  );
}

/** Cream count tile — the beige "7" / "6" square at the trailing edge of an
 *  opponent's card-back fan in the reference. */
function UnoCountTile({ n, side, compact }: { n: number; side: "left" | "right"; compact: boolean }) {
  return (
    <span
      className={`self-center flex items-center justify-center rounded-md font-black ${
        compact ? "min-w-[1.05rem] h-5 text-[11px]" : "min-w-[1.35rem] h-6 text-[13px]"
      }`}
      style={{
        [side === "left" ? "marginRight" : "marginLeft"]: compact ? 3 : 5,
        padding: "0 4px",
        background: "linear-gradient(180deg,#FBF0D4,#E9D3A6)",
        color: "#7A5326",
        border: "1px solid #C9A96A",
        boxShadow: "0 2px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      {n}
    </span>
  );
}

/** An opponent's fanned face-down cards + count tile, stacking away from the
 *  seat (fanDir) so it reads as their held hand. */
function UnoOpponentBackFan({
  handSize,
  fanDir,
  compact,
}: {
  handSize: number;
  fanDir: "left" | "right" | "up";
  compact: boolean;
}) {
  const fanCount = Math.min(handSize, compact ? 4 : 6);
  const reverse = fanDir === "left";
  const overlap = compact ? -9 : -12;
  if (handSize <= 0) return null;
  return (
    <div className={`flex items-end -mb-1 ${reverse ? "flex-row-reverse" : "flex-row"}`} aria-hidden>
      {Array.from({ length: fanCount }).map((_, i) => (
        <div
          key={i}
          className={compact ? "w-4 h-6" : "w-5 h-7"}
          style={{
            marginLeft: i === 0 ? 0 : reverse ? 0 : overlap,
            marginRight: reverse && i > 0 ? overlap : 0,
            transform: `rotate(${(i - (fanCount - 1) / 2) * 7}deg)`,
          }}
        >
          <UnoCardBack className="w-full h-full drop-shadow-sm" />
        </div>
      ))}
      <UnoCountTile n={handSize} side={reverse ? "left" : "right"} compact={compact} />
    </div>
  );
}

export function UnoPlayerChip({
  name,
  handSize,
  isTurn,
  fanDir,
  canCatch = false,
  onCatch,
  compact = false,
  isConnected,
}: UnoPlayerChipProps) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      <UnoOpponentBackFan handSize={handSize} fanDir={fanDir} compact={compact} />
      <div className="relative">
        <UnoNamePlate name={name} isTurn={isTurn} compact={compact} />
        {isConnected === false && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-[#FFF9F0] z-20"
            style={{ background: "#F59E0B" }}
            title="Reconnecting…"
            aria-label="Reconnecting"
          />
        )}
      </div>
      {canCatch && (
        <button
          onClick={onCatch}
          // min-h-[28px] clears WCAG 2.5.8's 24×24px target minimum for what's
          // a real, meaningful tap action (catching an undeclared opponent).
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

// ---------------------------------------------------------------------
// Own hand — tilted, overlapping card fan (replaces HandPanel's flex-wrap
// grid for the circular-table layout; HandPanel itself is untouched and
// still used wherever the panel-based layout survives, e.g. GameOverPanel
// context or a future compact view).
//
// Drag-to-play: ported from Rummy's Pointer Events drag system
// (RummyBoardMobile.tsx's useCardPointerDrag/resolveDropTarget) — same
// gesture grammar (6px move threshold distinguishes a tap from a drag,
// setPointerCapture so the gesture tracks even if the finger leaves the
// card, elementFromPoint + a data-uno-drop attribute resolve the drop
// target), trimmed to UNO's simpler single-card/single-target case (no
// multi-select, no reorder lanes — UNO always plays exactly one card onto
// exactly one pile). Deliberately NOT extracted into a shared hook: this
// version is meaningfully smaller than Rummy's (no selection set, no
// per-target hover), and the two games' drop-target vocabularies don't
// overlap — duplicating ~30 lines beat forcing a shared abstraction across
// two genuinely different gesture grammars.
// ---------------------------------------------------------------------

function resolveUnoDropTarget(x: number, y: number): string | null {
  let el = document.elementFromPoint(x, y) as Element | null;
  while (el) {
    const dt = el.getAttribute("data-uno-drop");
    if (dt) return dt;
    el = el.parentElement;
  }
  return null;
}

function useUnoCardDrag(opts: {
  cardId: string;
  enabled: boolean;
  onDragStateChange: (dragging: boolean) => void;
  onDrop: (cardId: string, target: string | null) => void;
  onTap: (cardId: string) => void;
}) {
  const stRef = useRef<{ pointerId: number; x0: number; y0: number; dragging: boolean } | null>(
    null
  );
  return {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (!opts.enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stRef.current = { pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, dragging: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      if (!st || st.pointerId !== e.pointerId || st.dragging) return;
      const dist = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
      if (dist < 6) return;
      st.dragging = true;
      opts.onDragStateChange(true);
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      stRef.current = null;
      if (!st || st.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* element may already have lost capture */
      }
      if (st.dragging) {
        opts.onDragStateChange(false);
        opts.onDrop(opts.cardId, resolveUnoDropTarget(e.clientX, e.clientY));
      } else {
        opts.onTap(opts.cardId);
      }
    },
    onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
      const st = stRef.current;
      stRef.current = null;
      if (!st || st.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (st.dragging) opts.onDragStateChange(false);
    },
  };
}

/** Real mouse only — 3D tilt tracks a persistent cursor position, which
 *  doesn't exist on touch (no hover state to read between taps), so it'd
 *  read as jank rather than depth there. Same `(hover: hover) and
 *  (pointer: fine)` query UnoBoard.tsx's isDesktopLayout() already gates
 *  the shell split on, reused here rather than a second convention. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setFine(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return fine;
}

/** One hand card, wrapping useUnoCardDrag. Pulled out of UnoHandFan's map()
 *  because a custom hook (useUnoCardDrag calls useRef) can't be called
 *  inside a loop/callback — Rules of Hooks — it needs its own component's
 *  top level, same reason Rummy's DraggableHandCard exists as a component
 *  rather than inline JSX inside RummyBoardMobile's card map.
 *
 *  Rendered as a motion.div, not a motion.button: the outer element owns
 *  both the pointer-drag gesture AND keyboard access (role="button"
 *  tabIndex + Enter/Space → onTap) so Tab+Enter card selection — confirmed
 *  working pre-drag and worth not regressing — keeps working for players
 *  who aren't dragging. */
function UnoDraggableHandCard({
  card,
  isSelected,
  isValid,
  isDisabled,
  isDragged,
  canDrag,
  rotate,
  lift,
  marginLeft,
  zIndex,
  springTransition,
  onTap,
  onDragStart,
  onDragStop,
  onDrop,
}: {
  card: UnoCard;
  isSelected: boolean;
  /** True when this card is a legal move right now. Previously the only
   *  cue was the *absence* of the disabled dimming — no positive signal
   *  that a card is playable, just that the others aren't. Gives every
   *  legal card its own gold glow so "what can I play" reads at a glance
   *  instead of scanning for which ones AREN'T faded. */
  isValid: boolean;
  isDisabled: boolean;
  isDragged: boolean;
  canDrag: boolean;
  rotate: number;
  lift: number;
  marginLeft: number;
  zIndex: number;
  springTransition: Transition;
  onTap: () => void;
  onDragStart: () => void;
  onDragStop: () => void;
  onDrop: (target: string | null) => void;
}) {
  const dragHandlers = useUnoCardDrag({
    cardId: card.id,
    enabled: canDrag,
    onDragStateChange: (dragging) => (dragging ? onDragStart() : onDragStop()),
    onDrop: (_id, target) => onDrop(target),
    onTap,
  });

  // 3D tilt — the one deliberate "physical card" moment for this redesign
  // (see uno-table.tsx's header note on the background-image pass this
  // built on). Raw pointer offset -> spring-smoothed motion values -> a
  // couple of degrees of rotateX/rotateY, so the card reads as tilting
  // toward the cursor rather than snapping. Motion values, never useState,
  // for a value that updates on every pointer move (Rules of Hooks are
  // still respected: the hooks below always run; only whether the result
  // is ever non-zero — via tiltEnabled — is conditional).
  const finePointer = useFinePointer();
  const prefersReducedMotion = useReducedMotion();
  const tiltEnabled = finePointer && !prefersReducedMotion && !isDragged && !isDisabled;
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const tiltSpringX = useMotionSpring(tiltX, { stiffness: 300, damping: 22 });
  const tiltSpringY = useMotionSpring(tiltY, { stiffness: 300, damping: 22 });
  const rotateX = useTransform(tiltSpringY, [-0.5, 0.5], [9, -9]);
  const rotateY = useTransform(tiltSpringX, [-0.5, 0.5], [-9, 9]);
  const sheenBackground = useTransform([tiltSpringX, tiltSpringY], (latest) => {
    const [lx, ly] = latest as [number, number];
    return `radial-gradient(circle at ${50 + lx * 70}% ${50 + ly * 70}%, rgba(255,255,255,0.4), transparent 60%)`;
  });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!tiltEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    tiltX.set((e.clientX - rect.left) / rect.width - 0.5);
    tiltY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleMouseLeave() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return (
    <motion.div
      {...dragHandlers}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      layout
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={getCardLabel(card)}
      aria-disabled={isDisabled}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      }}
      initial={{ opacity: 0, scale: 0.7, y: 24 }}
      animate={{ opacity: isDragged ? 0.35 : 1, scale: 1, rotate, y: lift }}
      exit={{ opacity: 0, scale: 0.6, y: -36, transition: { duration: 0.16 } }}
      transition={springTransition}
      className={`relative w-16 h-24 sm:w-[4.5rem] sm:h-[6.5rem] rounded-lg ${
        isDisabled
          ? "opacity-45 cursor-not-allowed"
          : canDrag
            ? "cursor-grab hover:z-30"
            : "cursor-pointer hover:z-30"
      }`}
      style={{
        marginLeft: `${marginLeft}rem`,
        zIndex: isDragged ? 60 : zIndex,
        touchAction: canDrag ? "none" : undefined,
        perspective: 600,
      }}
    >
      <motion.div
        className="relative w-full h-full rounded-lg"
        style={{
          rotateX: tiltEnabled ? rotateX : 0,
          rotateY: tiltEnabled ? rotateY : 0,
          transformStyle: "preserve-3d",
          boxShadow: isSelected
            ? "0 0 0 3px #E6A11E, 0 10px 20px rgba(0,0,0,0.35)"
            : isValid && !isDisabled
              ? "0 0 0 2px rgba(230,161,30,0.85), 0 0 14px 2px rgba(230,161,30,0.45), 0 3px 8px rgba(0,0,0,0.25)"
              : "0 3px 8px rgba(0,0,0,0.25)",
        }}
      >
        <UnoCardFace card={card} className="w-full h-full" />
        {tiltEnabled && (
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ background: sheenBackground, mixBlendMode: "soft-light" }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

export interface UnoHandFanProps {
  sortedHand: UnoCard[];
  /** ids of cards that are actually playable right now — the caller
   *  (useUnoBoard's validMoveIds) already folds in both the normal-turn
   *  legality check AND Jump-In eligibility when it's not myTurn, so this
   *  is the single source of truth for isDisabled/canDrag/onTap below. */
  validMoveIds: Set<string>;
  selectedCardId: string | null;
  /** Kept for callers/turn-label context; hand interactivity itself is
   *  driven entirely by validMoveIds now (Jump-In can be legal off-turn). */
  myTurn: boolean;
  phase: "playing" | "finished";
  onSelectCard: (cardId: string) => void;
  needsColorChoice: boolean;
  selectedWildColor: UnoColor | null;
  onPickColor: (color: UnoColor) => void;
  /** Drop-to-play — dragging a card onto the discard pile plays it directly.
   *  Optional so any future caller of UnoHandFan can opt out. */
  onDropOnDiscard?: (cardId: string) => void;
  onDragStateChange?: (dragging: boolean) => void;
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
  onDropOnDiscard,
  onDragStateChange,
}: UnoHandFanProps) {
  const n = sortedHand.length;
  // Framer Motion's own reduced-motion signal, not the global CSS rule
  // (index.css) — that rule only overrides CSS `animation`/`transition`
  // properties, and Motion's `layout`/spring transforms are JS/WAAPI-driven,
  // so the blanket rule doesn't reliably reach them. Same hook IllustrationSlot
  // already uses.
  const prefersReducedMotion = useReducedMotion();
  // Which card (if any) is currently mid-drag — drives the fade + raised
  // z-index while lifted, same visual cue Rummy uses (opacity ~0.35).
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

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
            const isDisabled = !isValid && phase === "playing";
            const offset = i - (n - 1) / 2;
            const rotate = offset * spreadDeg;
            const lift = isSelected ? -20 : Math.abs(offset) * Math.min(1.5, 10 / n);
            return (
              <UnoDraggableHandCard
                key={card.id}
                card={card}
                isSelected={isSelected}
                isValid={isValid}
                isDisabled={isDisabled}
                isDragged={draggedCardId === card.id}
                canDrag={isValid && phase === "playing" && !!onDropOnDiscard}
                rotate={rotate}
                lift={lift}
                marginLeft={i === 0 ? 0 : -overlapRem}
                zIndex={isSelected ? 50 : i}
                springTransition={springTransition}
                onTap={() => (isValid ? onSelectCard(card.id) : undefined)}
                onDragStart={() => {
                  setDraggedCardId(card.id);
                  onDragStateChange?.(true);
                }}
                onDragStop={() => {
                  setDraggedCardId(null);
                  onDragStateChange?.(false);
                }}
                onDrop={(target) => {
                  if (target === "discard") onDropOnDiscard?.(card.id);
                }}
              />
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
