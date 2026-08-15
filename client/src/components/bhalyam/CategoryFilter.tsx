import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BHALYAM_GAMES,
  GAME_CATEGORIES,
  isLocked,
  type BhalyamGameCard,
  type GameTag,
} from "./data";
import { useTheme } from "../../lib/useTheme";

/**
 * Game filter — a segmented control.
 *
 * One continuous track holding every filter, with the active one carrying a
 * sliding thumb. Chosen over the previous row of separate chips because the
 * options are mutually exclusive: separate pills read as "toggle any number
 * of these", a single track reads as "pick one of these", which is what the
 * control actually does.
 *
 * ── Semantics ─────────────────────────────────────────────────────────
 * `radiogroup` / `radio`, not `tablist` and not a row of `aria-pressed`
 * buttons. Tabs promise panels that do not exist here. Toggle buttons
 * promise independent on/off states. A radio group is the one that says
 * "exactly one of these is chosen", and it brings the keyboard contract
 * users already expect: one tab stop for the group, arrows to move within
 * it, Home/End to jump to the ends.
 *
 * ── Colour tokens ─────────────────────────────────────────────────────
 * Every hex is one the dark-mode block in index.css already remaps
 * (`.bg-[#FCF8EF]`, `.border-[#E8D8BE]`, …). That list is an allowlist, not
 * a pattern: a hex outside it silently keeps its light value on dark
 * parchment. Do not add one here without adding it there.
 *
 * The active thumb is #1D2C4A, the same ink navy the page already uses for
 * its section headings ("Pick a game", "Ready to play"). Two reasons: cream
 * on it measures 13.11:1, and it is a colour the page already owns, so the
 * control reads as part of the page rather than as a brown block dropped on
 * top of it. The brand orange #E95D21 is not usable here — cream on orange
 * is 3.27:1, well under the 4.5:1 floor.
 *
 * `bg-[#1D2C4A]` is safe in dark mode: the allowlist remaps `.text-[#1D2C4A]`
 * only, so the fill stays navy while heading TEXT flips to cream.
 *
 * Selection is never signalled by colour alone — the thumb is a filled
 * shape, the label goes heavier, and `aria-checked` carries it for anyone
 * not looking at colour at all.
 */

export type CategorySelection = GameTag | "all";

/** One selection at a time. "all" clears it. */
export interface GameFilter {
  category: CategorySelection;
}

/** Games carrying a tag, in catalogue order. */
export function gamesWithTag(tag: GameTag, includeLocked = true): BhalyamGameCard[] {
  return BHALYAM_GAMES.filter(
    (g) => g.tags.includes(tag) && (includeLocked || !isLocked(g)),
  );
}

/** Games matching the current selection. */
export function filterGames(filter: GameFilter, includeLocked = true): BhalyamGameCard[] {
  return BHALYAM_GAMES.filter(
    (g) =>
      (filter.category === "all" || g.tags.includes(filter.category)) &&
      (includeLocked || !isLocked(g)),
  );
}

/** How many games carry a tag. */
export function countIn(id: CategorySelection): number {
  return id === "all" ? BHALYAM_GAMES.length : gamesWithTag(id).length;
}

interface Segment {
  id: CategorySelection;
  label: string;
}

export default function CategoryFilter({
  value,
  onChange,
  className = "",
}: {
  value: GameFilter;
  onChange: (next: GameFilter) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  /**
   * Which edges have more track behind them.
   *
   * Six segments do not fit a 375px phone, so the track scrolls — and the
   * scrollbar is deliberately hidden (it would sit across the pills). That
   * left NOTHING on screen saying the row continued: players reported
   * believing Board & Cards was the last category, and the two behind it
   * were effectively unshipped.
   *
   * Measured rather than assumed. A static cue on the right is a lie the
   * moment you reach the end, and the count that fits changes with font
   * scaling and locale — the labels are translated now, so "Board & Cards"
   * is not the same width in Telugu as in English.
   */
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // 1px slack: sub-pixel layout means scrollLeft rarely hits the exact end.
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }, []);

  // Layout effect so the fade is correct on first paint rather than
  // appearing a frame later.
  useLayoutEffect(measure, [measure, value.category]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    // Font loading, orientation change and a language switch all change the
    // track width without a scroll or a re-render.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const segments: Segment[] = [
    { id: "all", label: "Trending" },
    ...GAME_CATEGORIES.map((c) => ({ id: c.id as CategorySelection, label: c.label })),
  ];
  const activeIndex = Math.max(
    0,
    segments.findIndex((s) => s.id === value.category),
  );

  /**
   * Scroll the track when the edge cue is tapped.
   *
   * It looked like a button, so people tapped it — and it was
   * `pointer-events-none`, so nothing happened. An affordance that invites a
   * tap and then ignores it is worse than no affordance at all.
   *
   * Moves by most of a viewport rather than a fixed pixel count, so it works
   * the same whether two labels are off-screen or five, and in any language.
   */
  const nudge = useCallback((side: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(80, el.clientWidth * 0.7);
    el.scrollBy({ left: side === "right" ? step : -step, behavior: "smooth" });
  }, []);

  /**
   * Keep the chosen segment on screen.
   *
   * Tapping a half-visible segment used to select it and leave it half
   * visible, so the sliding thumb ran off the edge and the control looked
   * like it had lost its selection. `inline: "nearest"` only scrolls when
   * the segment is actually clipped, so a segment already in view does not
   * jump under the user's finger.
   */
  useEffect(() => {
    refs.current[activeIndex]?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex, reduceMotion]);

  /**
   * Arrow keys move selection AND focus together, which is the radio-group
   * contract. Home/End jump to the ends. Wrapping is deliberate: with six
   * segments on a scrolling track, reaching the far end by holding one arrow
   * is slower than wrapping around.
   */
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = segments.length - 1;
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange({ category: segments[next].id });
    refs.current[next]?.focus();
  }

  const [theme] = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={className}>
      <div
        /* `relative` so the edge cues can be positioned against the track.
           They are SIBLINGS of the radiogroup's buttons, never children:
           anything inside `role="radiogroup"` that is not a `radio` breaks
           the roving-tabindex contract this control depends on. */
        className={`relative flex w-full rounded-full p-1.5 transition-all duration-300 ${
          isDark
            ? "bg-[#111927]/90 backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            : "bg-[#FCF8EF] border border-[#E4D1B5] shadow-[0_4px_16px_rgba(74,44,22,0.08),inset_0_1px_2px_rgba(255,255,255,0.9)]"
        }`}
      >
        <EdgeCue side="left" show={edges.left} onNudge={nudge} />
        <EdgeCue side="right" show={edges.right} onNudge={nudge} />
        <div role="radiogroup" aria-label="Filter games" className="flex w-full">
        {/* The track scrolls rather than wrapping: six labels do not fit on a
            375px phone, and a segmented control that breaks onto two lines
            stops reading as one control. */}
        <div
          ref={trackRef}
          className="flex w-full items-stretch gap-1 overflow-x-auto
                     sm:overflow-visible
                     scroll-smooth overscroll-x-contain scroll-px-12
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {segments.map((seg, i) => {
            const active = seg.id === value.category;
            return (
              <button
                key={seg.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                /* Roving tabindex: the group is one tab stop, arrows move
                   inside it. Without this, tabbing through the page would
                   stop six times on one control. */
                tabIndex={active ? 0 : -1}
                onClick={() => onChange({ category: seg.id })}
                onKeyDown={(e) => onKeyDown(e, i)}
                /* Below sm the six labels cannot fit, so segments keep their
                   natural width and the track scrolls. From sm up they grow
                   to fill it — `flex-auto` rather than `flex-1` so "All" does
                   not get the same width as "Board & Cards". */
                className={`relative flex-shrink-0 sm:flex-auto sm:flex-shrink
                            cursor-pointer rounded-full
                            px-4 min-h-[40px] flex items-center justify-center
                            text-[13px] whitespace-nowrap
                            transition-all duration-200 ease-out
                            focus:outline-none focus-visible:ring-2
                            focus-visible:ring-offset-2
                            ${
                              isDark
                                ? `focus-visible:ring-offset-[#111927] focus-visible:ring-amber-400 ${
                                    active
                                      ? "text-white font-black"
                                      : "text-zinc-300 font-bold hover:text-white hover:bg-white/10"
                                  }`
                                : `focus-visible:ring-offset-[#FCF8EF] focus-visible:ring-amber-500 ${
                                    active
                                      ? "text-white font-black"
                                      : "text-[#5C4532] font-extrabold hover:text-[#2A1D13] hover:bg-[#F2E4CF]"
                                  }`
                            }`}
              >
                {active && (
                  <motion.span
                    // Shared layoutId slides the thumb between segments
                    // instead of cross-fading it, which is what makes the
                    // control read as one moving selection rather than six
                    // independent lights.
                    layoutId="bhalyam-filter-thumb"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-[0_3px_14px_rgba(245,158,11,0.45)] border border-amber-300/40"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
                    }
                  />
                )}
                <span className="relative z-10">{seg.label}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The "there is more" cue at a scrollable edge.
 *
 * A mask-only fade shipped first and was invisible in practice: inactive
 * segments are bare dark text on the track's OWN cream, so fading them
 * toward transparent over that same cream only made the text a little
 * lighter. Nothing with a distinct shape was dissolving, so nothing read as
 * continuing. Correct behaviour, useless perception.
 *
 * Drawn as a real element instead: an opaque-to-transparent veil in the
 * track colour, with a chevron on it. The veil gives labels something solid
 * to pass UNDER, which is what makes a row read as scrollable; the chevron
 * names the direction for anyone who does not read the gradient.
 *
 * `pointer-events-none` throughout — the affordance must never eat a tap
 * meant for the segment beneath it, and the segments remain the only
 * interactive things in the control.
 */
function EdgeCue({
  side,
  show,
  onNudge,
}: {
  side: "left" | "right";
  show: boolean;
  onNudge: (side: "left" | "right") => void;
}) {
  const isRight = side === "right";
  return (
    <button
      type="button"
      /* Pointer-only convenience: keyboard users already move through the
         group with arrow keys, so announcing a second control would just be
         noise. Hidden from AT, unreachable by Tab, fully tappable. */
      aria-hidden
      tabIndex={-1}
      disabled={!show}
      onClick={() => onNudge(side)}
      /* The fade has to end in whatever colour the page actually is, so it
         reads as the strip running out rather than as a bar sitting on top of
         it. That colour differs by theme, which an inline gradient cannot
         express — it shipped as a cream smear across the dark page. Both the
         wash and the chevron now come from `bhalyam-strip-fade` in index.css,
         and `data-side` picks the direction. */
      data-side={side}
      className={`bhalyam-strip-fade absolute inset-y-1 z-10 flex w-12 items-center
                  transition-opacity duration-200 sm:hidden
                  ${isRight ? "right-1 justify-end rounded-r-full" : "left-1 justify-start rounded-l-full"}
                  ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <svg
        viewBox="0 0 24 24"
        width={16}
        height={16}
        fill="none"
        /* Inherits from the button so one token drives both themes. */
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isRight ? "mr-0.5" : "ml-0.5"}
        style={{ transform: isRight ? undefined : "rotate(180deg)" }}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
