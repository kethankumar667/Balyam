import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "../../lib/useTheme";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { BHALYAM_GAMES, isLocked } from "../../components/bhalyam/data";
import { gamesForWay, type PlayWay } from "./playWay";
import { Pawn, WayArt } from "./WayArt";
import { Die, useDieRoller, wayForFace, type DieFace } from "./Die";

/**
 * "Who's around today?" — the first question a returning player is asked.
 *
 * Two choices, not a menu, and never a gate: the page below is fully usable
 * with neither chosen. Picking one narrows the game grid to what fits (see
 * `playWay.ts`) and the choice is remembered, so someone who always plays
 * alone lands on the right list.
 *
 * ── The idea: two game-box lids and one pawn ──────────────────────────
 * Each choice is the lid of a game box, drawn with the real game art it will
 * show (see `WayArt`): a crowd for "together", one quiet corner for "alone".
 * The player's piece is a gold pawn that waits in the caption until a choice is
 * made, then hops into that box's empty slot. "Show all games" sends it home. The
 * pawn is what marks the choice, so selection is a shape arriving, not only a
 * colour change.
 *
 * ── Semantics ─────────────────────────────────────────────────────────
 * `radiogroup`, same reasoning as `CategoryFilter`: the choices are mutually
 * exclusive, and a radio group brings the keyboard contract people expect (one
 * tab stop, arrows to move and select). A radio cannot be un-picked, so the way
 * back to the full list is the explicit "Show all games" button, not a second
 * tap on the chosen card. All the art is decorative and hidden from assistive
 * tech; the text names the choice and `aria-checked` carries the state.
 *
 * ── Why no "Join with a code" button here ─────────────────────────────
 * The hero directly above already carries it. Two buttons with one intent
 * within a screen of each other is noise; this section only changes what the
 * grid shows.
 */

interface WayTone {
  /** Border + fill of the chosen box. */
  selected: string;
  /** Hover border of an unchosen box. */
  hover: string;
  /** The coloured light behind the art, when chosen and when not. */
  glowOn: string;
  glowOff: string;
  /** The "17 games" pill. */
  pill: string;
}

interface WayOption {
  id: PlayWay;
  title: string;
  hint: string;
  /** Light then dark, written out in full so Tailwind can see every class. */
  light: WayTone;
  dark: WayTone;
}

const WAY_OPTIONS: readonly WayOption[] = [
  {
    id: "friends",
    title: "Play together",
    hint: "Friends, family or bots",
    light: {
      selected: "bg-amber-50 border-amber-600",
      hover: "hover:border-amber-500/60",
      glowOn: "bg-amber-300/70",
      glowOff: "bg-amber-300/20",
      pill: "bg-amber-500/15 text-amber-900",
    },
    dark: {
      selected: "bg-amber-500/10 border-amber-400/80",
      hover: "hover:border-amber-400/40",
      glowOn: "bg-amber-400/30",
      glowOff: "bg-amber-400/10",
      pill: "bg-amber-400/15 text-amber-200",
    },
  },
  {
    id: "solo",
    title: "Play alone",
    hint: "One-player games",
    light: {
      selected: "bg-emerald-50 border-emerald-700",
      hover: "hover:border-emerald-500/60",
      glowOn: "bg-emerald-300/70",
      glowOff: "bg-emerald-300/20",
      pill: "bg-emerald-600/15 text-emerald-900",
    },
    dark: {
      selected: "bg-emerald-500/10 border-emerald-400/80",
      hover: "hover:border-emerald-400/40",
      glowOn: "bg-emerald-400/30",
      glowOff: "bg-emerald-400/10",
      pill: "bg-emerald-400/15 text-emerald-200",
    },
  },
];

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function gamesLabel(count: number): string {
  return `${count} game${count === 1 ? "" : "s"}`;
}

/** The rule is said out loud, so the die is a game and not a trick. */
const DIE_RULE = "Even plays together, odd plays alone.";

function panelCopy(way: PlayWay | null, count: number, rolling: boolean): { lead: string; detail: string } {
  if (rolling) {
    return { lead: "Rolling the die", detail: DIE_RULE };
  }
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
    detail: `Pick a box, or roll the die. ${DIE_RULE}`,
  };
}

/**
 * The pawn's home base, a corner of a Ludo board: four coloured spots with the
 * piece waiting in the middle. When the pawn has gone to a box the spots light up,
 * so an empty base is as clear a signal as an occupied one.
 */
const HOME_SPOTS = ["#E04A3F", "#F2C230", "#2E9E5B", "#3567C7"] as const;

function HomeBase({ occupied, isDark }: { occupied: boolean; isDark: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid h-11 w-11 shrink-0 grid-cols-2 gap-1 rounded-xl border p-1.5 ${
        isDark ? "border-white/15 bg-white/5" : "border-[#D9C7A8] bg-[#FFFDF7]"
      }`}
    >
      {HOME_SPOTS.map((colour) => (
        <span
          key={colour}
          className="rounded-full transition-opacity duration-300"
          style={{ backgroundColor: colour, opacity: occupied ? 0.3 : 0.85 }}
        />
      ))}
      {occupied && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Pawn />
        </span>
      )}
    </span>
  );
}

/** The empty "home" a pawn can stand in. Always drawn, so an empty box still invites a piece. */
function Slot({ occupied, isDark, className }: { occupied: boolean; isDark: boolean; className: string }) {
  return (
    <span className={`flex items-end justify-center ${className}`} aria-hidden="true">
      <span className="relative flex h-full w-full items-end justify-center">
        <span
          className={`absolute bottom-0 h-8 w-8 rounded-full border-2 border-dashed transition-opacity duration-200 ${
            isDark ? "border-white/30" : "border-[#C9B48F]"
          } ${occupied ? "opacity-0" : "opacity-100"}`}
        />
        {occupied && <Pawn />}
      </span>
    </span>
  );
}

export function PlayYourWaySection({
  way,
  onChangeWay,
  rollFace,
}: {
  way: PlayWay | null;
  onChangeWay: (next: PlayWay | null) => void;
  /** Picks the die's outcome. Defaults to a fair random face; tests inject one. */
  rollFace?: () => DieFace;
}) {
  const { play } = useAudio();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Which box is being pointed at or focused. Its moving parts run, so the box
  // answers a hand (or a keyboard) and not only a click.
  const [peeked, setPeeked] = useState<PlayWay | null>(null);
  const roller = useDieRoller(rollFace);

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

  /** "Roll to decide": the die lands, and the pawn goes to the box the face names. */
  async function decide() {
    play(AUDIO.UI_CLICK);
    const face = await roller.roll();
    if (face === null) return; // a roll was already running
    onChangeWay(wayForFace(face));
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

  const copy = panelCopy(way, way === null ? 0 : counts[way], roller.rolling);

  return (
    <section className="mb-8 sm:mb-10" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="bhalyam-display text-[#1D2C4A] dark:text-white leading-tight"
        style={{ fontSize: "clamp(22px, 5.5vw, 32px)" }}
      >
        Who&apos;s around today?
      </h2>
      <p className={`font-script mb-3 mt-0.5 text-[20px] leading-snug sm:mb-4 sm:text-[22px] ${isDark ? "text-amber-300" : "text-[#7B2F0E]"}`}>
        Pick a seat and we&apos;ll set the board.
      </p>

      <div role="radiogroup" aria-labelledby={headingId} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {WAY_OPTIONS.map((option, index) => {
          const selected = option.id === way;
          const dimmed = way !== null && !selected;
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
              onPointerEnter={() => setPeeked(option.id)}
              onPointerLeave={() => setPeeked(null)}
              onFocus={() => setPeeked(option.id)}
              onBlur={() => setPeeked(null)}
              className={`group relative isolate flex min-h-[132px] w-full items-stretch overflow-hidden rounded-3xl border-2 text-left cursor-pointer
                          transition-[border-color,background-color,transform,box-shadow] duration-300 ease-out
                          hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none
                          xl:min-h-[184px]
                          focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
                          ${isDark ? "text-white focus-visible:ring-offset-[#0A0F1D]" : "text-[#6D4323] focus-visible:ring-offset-[#FAF2DF]"}
                          ${
                            selected
                              ? `${tone.selected} ${
                                  isDark
                                    ? "shadow-[0_18px_34px_-16px_rgba(0,0,0,0.85)]"
                                    : "shadow-[0_18px_34px_-16px_rgba(109,67,35,0.5)]"
                                }`
                              : `${tone.hover} ${
                                  isDark
                                    ? "bg-[#131926] border-white/10 shadow-[0_10px_22px_-14px_rgba(0,0,0,0.8)]"
                                    : "bg-[#FFFDF7] border-[#ECD9BA] shadow-[0_10px_22px_-14px_rgba(109,67,35,0.4)]"
                                }`
                          }`}
            >
              {/* A coloured light behind the art: the box is lit when it is chosen. */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -right-6 top-1/2 -z-10 h-44 w-44 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-500 ${
                  selected ? tone.glowOn : tone.glowOff
                }`}
              />
              {/* The lid's inner edge, the way a printed game box has a second rule inside the first. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[5px] rounded-[1.1rem] border border-current opacity-[0.12]"
              />

              <span className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pl-5 pr-1 sm:pl-6">
                <span
                  className={`bhalyam-display block text-[20px] leading-tight xl:text-[24px] ${
                    isDark ? "text-white" : "text-[#1D2C4A]"
                  }`}
                >
                  {option.title}
                </span>
                <span
                  className={`block text-[13px] font-medium leading-snug sm:text-[14px] ${
                    isDark ? "text-zinc-300" : "text-[#6B5E52]"
                  }`}
                >
                  {option.hint}
                </span>
                <span
                  className={`mt-2 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums ${tone.pill}`}
                >
                  {gamesLabel(counts[option.id])}
                </span>
              </span>

              <WayArt way={option.id} selected={selected} dimmed={dimmed} active={selected || peeked === option.id} />

              <Slot
                occupied={selected}
                isDark={isDark}
                className="absolute right-3 top-3 z-20 h-10 w-9 sm:right-4 sm:top-4"
              />
            </button>
          );
        })}
      </div>

      <div
        // The phone height is reserved: the caption's copy runs 1 to 3 lines across
        // "not sure", "rolling" and each choice, and without a floor the page below
        // jumped once when the die left the hand and again when it landed.
        className={`mt-3 flex min-h-[124px] flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-3 py-2 sm:mt-4 sm:min-h-[64px] ${
          isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
        }`}
      >
        <HomeBase occupied={way === null} isDark={isDark} />

        {/* `min-w-[12rem]`: with the pawn and "Show all games" on the same row the
            text was left about 100px on a phone and wrapped to five lines. At this
            width the button drops to its own line instead. */}
        <div aria-live="polite" aria-atomic="true" className="min-w-[12rem] flex-1">
          {/* Keyed on the text and fade-in only. An exit-then-enter swap kept the
              FIRST tap's snapshot when a second tap landed mid-exit, so the panel
              could show a stale count. A fresh mount always carries current values. */}
          <motion.div
            key={`${way ?? "none"}|${copy.lead}`}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
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
        </div>

        {way === null && (
          <button
            type="button"
            onClick={() => void decide()}
            disabled={roller.rolling}
            aria-label="Roll the die to pick for me"
            className={`ml-14 flex min-h-[44px] items-center gap-2 rounded-full border px-3 pr-4 text-[13px] font-bold cursor-pointer sm:ml-0
                        transition-[background-color,transform] duration-150 active:scale-95 motion-reduce:transform-none disabled:cursor-wait
                        focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          isDark
                            ? "border-amber-300/60 text-amber-200 hover:bg-amber-300/10"
                            : "border-[#1D2C4A]/40 text-[#1D2C4A] hover:bg-white/70"
                        }`}
          >
            <Die face={roller.face} tumbling={roller.rolling} className="h-7 w-7" />
            Roll to decide
          </button>
        )}

        {way !== null && (
          <button
            type="button"
            onClick={() => {
              play(AUDIO.UI_CLICK);
              onChangeWay(null);
            }}
            className={`ml-14 min-h-[44px] rounded-lg px-2 text-[13px] font-bold underline underline-offset-4 cursor-pointer sm:ml-0
                        focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500
                        ${isDark ? "text-amber-300 hover:text-amber-200" : "text-[#7B2F0E] hover:text-[#5A250B]"}`}
          >
            Show all games
          </button>
        )}
      </div>
    </section>
  );
}
