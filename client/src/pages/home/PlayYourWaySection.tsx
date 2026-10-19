import { useId, useMemo, useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, User, Users, type LucideIcon } from "lucide-react";
import { useTheme } from "../../lib/useTheme";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { BHALYAM_GAMES, isLocked } from "../../components/bhalyam/data";
import { gamesForWay, type PlayWay } from "./playWay";

/**
 * "Who's around today?" — the first question a returning player is asked.
 *
 * Two choices, not a menu, and never a gate: the page below is fully usable
 * with neither chosen. Picking one narrows the game grid to what fits (see
 * `playWay.ts`) and the choice is remembered, so someone who always plays
 * alone lands on the right list.
 *
 * ── Semantics ─────────────────────────────────────────────────────────
 * `radiogroup`, same reasoning as `CategoryFilter`: the choices are mutually
 * exclusive, and a radio group brings the keyboard contract people expect (one
 * tab stop, arrows to move and select). A radio cannot be un-picked, so the way
 * back to the full list is the explicit "Show all games" button, not a second
 * tap on the chosen card.
 *
 * ── Why no "Join with a code" button here ─────────────────────────────
 * The hero directly above already carries it. Two buttons with one intent
 * within a screen of each other is noise; this section only changes what the
 * grid shows.
 *
 * Selection is never colour alone: the chosen card gets a heavier border, a
 * filled check, and `aria-checked`.
 */

interface WayTone {
  /** Border + fill of the chosen card. */
  selected: string;
  /** Hover border of an unchosen card. */
  hover: string;
  /** Icon tile. */
  icon: string;
  /** Filled check badge on the chosen card. */
  check: string;
}

interface WayOption {
  id: PlayWay;
  title: string;
  hint: string;
  Icon: LucideIcon;
  /** Light then dark, written out in full so Tailwind can see every class. */
  light: WayTone;
  dark: WayTone;
}

const WAY_OPTIONS: readonly WayOption[] = [
  {
    id: "friends",
    title: "Play together",
    hint: "Friends, family or bots",
    Icon: Users,
    light: {
      selected: "bg-amber-50 border-amber-600",
      hover: "hover:border-amber-500/60",
      icon: "bg-amber-500/15 text-amber-800 border-amber-500/30",
      check: "bg-amber-600 text-white",
    },
    dark: {
      selected: "bg-amber-500/10 border-amber-400/80",
      hover: "hover:border-amber-400/40",
      icon: "bg-amber-500/15 text-amber-400 border-amber-400/30",
      check: "bg-amber-400 text-amber-950",
    },
  },
  {
    id: "solo",
    title: "Play alone",
    hint: "One-player games",
    Icon: User,
    light: {
      selected: "bg-emerald-50 border-emerald-700",
      hover: "hover:border-emerald-500/60",
      icon: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
      check: "bg-emerald-700 text-white",
    },
    dark: {
      selected: "bg-emerald-500/10 border-emerald-400/80",
      hover: "hover:border-emerald-400/40",
      icon: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
      check: "bg-emerald-400 text-emerald-950",
    },
  },
];

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function gamesLabel(count: number): string {
  return `${count} game${count === 1 ? "" : "s"}`;
}

function panelCopy(way: PlayWay | null, count: number): { lead: string; detail: string } {
  if (way === "friends") {
    return {
      lead: `${gamesLabel(count)} for a table`,
      detail: "Host a room and share its code. Add bots in the lobby if nobody is free.",
    };
  }
  if (way === "solo") {
    return {
      lead: `${gamesLabel(count)} for one`,
      detail: "Start right away. No room, no waiting.",
    };
  }
  return {
    lead: "Not sure yet?",
    detail: "Pick one and the games below narrow to fit.",
  };
}

export function PlayYourWaySection({
  way,
  onChangeWay,
}: {
  way: PlayWay | null;
  onChangeWay: (next: PlayWay | null) => void;
}) {
  const { play } = useAudio();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const counts = useMemo(() => {
    const playable = BHALYAM_GAMES.filter((g) => !isLocked(g));
    return {
      friends: gamesForWay(playable, "friends").length,
      solo: gamesForWay(playable, "solo").length,
    } satisfies Record<PlayWay, number>;
  }, []);

  const activeIndex = way === null ? -1 : WAY_OPTIONS.findIndex((o) => o.id === way);

  function choose(next: PlayWay) {
    if (next === way) return;
    play(AUDIO.UI_TOGGLE);
    onChangeWay(next);
  }

  /** Arrow keys move focus and selection together, as a radio group should. */
  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = WAY_OPTIONS.length - 1;
    let next: number;
    switch (event.key) {
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
    event.preventDefault();
    choose(WAY_OPTIONS[next].id);
    optionRefs.current[next]?.focus();
  }

  const copy = panelCopy(way, way === null ? 0 : counts[way]);

  return (
    <section className="mb-8 sm:mb-10" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="bhalyam-display text-[#1D2C4A] dark:text-white leading-tight mb-3 sm:mb-4"
        style={{ fontSize: "clamp(22px, 5.5vw, 32px)" }}
      >
        Who&apos;s around today?
      </h2>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
        <div
          role="radiogroup"
          aria-labelledby={headingId}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {WAY_OPTIONS.map((option, index) => {
            const selected = option.id === way;
            const tone = isDark ? option.dark : option.light;
            return (
              <button
                key={option.id}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                // Roving tabindex: one tab stop for the group. With nothing
                // chosen yet, the first option takes it.
                tabIndex={selected || (activeIndex === -1 && index === 0) ? 0 : -1}
                onClick={() => choose(option.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={`group relative flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left cursor-pointer
                            transition-[border-color,background-color,transform] duration-200 ease-out
                            hover:-translate-y-px active:translate-y-0 active:scale-[0.985] motion-reduce:transform-none
                            focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
                            ${isDark ? "focus-visible:ring-offset-[#131926]" : "focus-visible:ring-offset-[#FFFDF7]"}
                            ${
                              selected
                                ? tone.selected
                                : `${tone.hover} ${
                                    isDark ? "bg-[#131926] border-white/10" : "bg-[#FFFDF7] border-[#ECD9BA]"
                                  }`
                            }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone.icon}`}
                  aria-hidden="true"
                >
                  <option.Icon className="h-6 w-6" />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`bhalyam-display block text-[18px] leading-tight ${
                      isDark ? "text-white" : "text-[#1D2C4A]"
                    }`}
                  >
                    {option.title}
                  </span>
                  <span
                    className={`mt-0.5 block text-[13px] font-medium leading-snug ${
                      isDark ? "text-zinc-300" : "text-[#6B5E52]"
                    }`}
                  >
                    {option.hint}
                  </span>
                </span>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected
                      ? `border-transparent ${tone.check}`
                      : isDark
                        ? "border-white/25"
                        : "border-[#D9C7A8]"
                  }`}
                  aria-hidden="true"
                >
                  {selected && (
                    <motion.span
                      initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                      className="flex"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                    </motion.span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`flex min-h-[76px] flex-col justify-center rounded-2xl border px-4 py-3 ${
            isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
          }`}
        >
          <div aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={way ?? "none"}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
              >
                <p
                  className={`text-[15px] font-bold leading-snug tabular-nums ${
                    isDark ? "text-white" : "text-[#1D2C4A]"
                  }`}
                >
                  {copy.lead}
                </p>
                <p
                  className={`mt-0.5 text-[13px] font-medium leading-snug ${
                    isDark ? "text-zinc-300" : "text-[#6B5E52]"
                  }`}
                >
                  {copy.detail}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {way !== null && (
            <button
              type="button"
              onClick={() => {
                play(AUDIO.UI_CLICK);
                onChangeWay(null);
              }}
              className={`mt-1 -ml-1 self-start min-h-[44px] rounded-lg px-1 text-[13px] font-bold underline underline-offset-4 cursor-pointer
                          focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500
                          ${isDark ? "text-amber-300 hover:text-amber-200" : "text-[#7B2F0E] hover:text-[#5A250B]"}`}
            >
              Show all games
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
