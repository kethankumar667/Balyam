import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BHALYAM_GAMES,
  GAME_CATEGORIES,
  isLocked,
  type BhalyamGameCard,
  type GameTag,
} from "./data";

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

/**
 * Edge-fade mask for the scrolling track.
 *
 * 28px is wide enough to read as a fade rather than a clipped edge, and
 * narrow enough that it never swallows a whole label. Returns an empty style
 * when nothing overflows, so a track that fits shows no fade at all.
 */
function maskFor(edges: { left: boolean; right: boolean }): React.CSSProperties {
  if (!edges.left && !edges.right) return {};
  const stops = [
    edges.left ? "transparent 0, #000 28px" : "#000 0",
    edges.right ? "#000 calc(100% - 28px), transparent 100%" : "#000 100%",
  ].join(", ");
  const image = `linear-gradient(to right, ${stops})`;
  // Both spellings: WebkitMaskImage is still required on Safari/iOS, which
  // is most of the audience reporting this.
  return { maskImage: image, WebkitMaskImage: image };
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
   * Measured rather than assumed. A static fade on the right is a lie the
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
    { id: "all", label: "All" },
    ...GAME_CATEGORIES.map((c) => ({ id: c.id as CategorySelection, label: c.label })),
  ];
  const activeIndex = Math.max(
    0,
    segments.findIndex((s) => s.id === value.category),
  );

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

  return (
    <div className={className}>
      <div
        role="radiogroup"
        aria-label="Filter games"
        className="flex w-full rounded-full p-1
                   bg-[#FCF8EF] border-2 border-[#E8D8BE]
                   shadow-[0_2px_8px_-4px_rgba(74,44,22,0.35)]"
      >
        {/* The track scrolls rather than wrapping: six labels do not fit on a
            375px phone, and a segmented control that breaks onto two lines
            stops reading as one control. */}
        <div
          ref={trackRef}
          className="flex w-full items-stretch gap-0.5 overflow-x-auto
                     sm:overflow-visible sm:[mask-image:none]
                     scroll-smooth overscroll-x-contain
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          /* The affordance: the segment at a scrollable edge dissolves
             instead of ending flush, which reads as "this continues" the way
             a hard edge reads as "this is the end". Applied per-edge from
             measured scroll state, so it never claims content that is not
             there. Cleared from `sm` up, where every segment fits.

             Chosen over the obvious chevron button for two reasons: a button
             inside `role="radiogroup"` that is not a `radio` breaks the
             roving-tabindex contract this control depends on, and a control
             that must be TAPPED to reveal content is a worse answer than one
             that shows the content is there. */
          style={maskFor(edges)}
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
                            transition-colors duration-200 ease-out
                            focus:outline-none focus-visible:ring-2
                            focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCF8EF]
                            focus-visible:ring-[#1D2C4A]
                            ${
                              active
                                ? "text-[#FCF8EF] font-extrabold"
                                : "text-[#3F2F24] font-bold hover:bg-[#F1E4CC]"
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
                    className="absolute inset-0 rounded-full bg-[#1D2C4A]"
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
  );
}
