import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import type { MandaliAroundPerson } from "@shared/mandali/types";
import { useTheme } from "../../lib/useTheme";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";
import { FALLBACK_AVATAR, getAvatarUrl } from "../../components/mandali/album/avatarUrl";
import { gameLabel } from "../../components/mandali/album/games";

/** How many faces fit before "+N". */
const FACES_MAX = 5;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export interface AroundSummary {
  /** The one line: who, and what they are doing. */
  lead: string;
  /** A match that can be watched from outside, when there is one. */
  watch: { code: string; name: string; game: string } | null;
}

/**
 * What the strip says. Null when nobody is around, which is also when the strip
 * is not drawn at all: a row that announces an empty room is worse than no row.
 *
 * The server lists people free to talk before people mid-match, so the first
 * person named is the most reachable. A Watch is only offered for a match the
 * server gave a watch code for (a room that takes an audience), so it can never
 * be a button that is refused.
 */
export function describeAround(people: readonly MandaliAroundPerson[]): AroundSummary | null {
  const [first] = people;
  if (!first) return null;

  const watchable = people.find((p) => p.presence === "in-game" && p.watchCode);
  const watch = watchable?.watchCode
    ? {
        code: watchable.watchCode,
        name: watchable.displayName,
        game: watchable.activeGame ? gameLabel(watchable.activeGame) : "",
      }
    : null;

  if (people.length > 1) {
    const others = people.length - 1;
    return { lead: `${first.displayName} and ${others} ${others === 1 ? "other" : "others"} are around`, watch };
  }
  if (first.presence === "in-game") {
    const game = first.activeGame ? gameLabel(first.activeGame) : "";
    return { lead: game ? `${first.displayName} is playing ${game}` : `${first.displayName} is in a game`, watch };
  }
  return { lead: `${first.displayName} is around`, watch };
}

/**
 * The home page's answer to its own question: who, among the people you already
 * play with, is here right now. Members only, never strangers (the server only
 * answers from the caller's own Mandalis), and hidden when nobody is around.
 *
 * Faces are decoration: the names are in the line beside them, so each image has
 * an empty alt and the row is read once, as text. The line, not colour, says who
 * is playing.
 */
export function AroundNowStrip({ people }: { people: readonly MandaliAroundPerson[] }) {
  const navigate = useNavigate();
  const { play } = useAudio();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();

  const summary = describeAround(people);
  const shown = people.slice(0, FACES_MAX);
  const hidden = people.length - shown.length;
  const ringClass = isDark ? "ring-[#131926]" : "ring-[#FFFDF7]";

  return (
    <AnimatePresence initial={false}>
      {summary && (
        <motion.section
          key="around"
          aria-label="Friends who are around"
          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
          className="overflow-hidden"
        >
          <div
            // Wraps: on a 375px phone five faces and the Watch button leave the line
            // about 60px, which broke "Bala and 6 others are around" into five lines.
            // Wrapped, the faces and the line share a row and Watch takes its own.
            className={`mb-3 flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl border px-4 py-3 ${
              isDark ? "bg-[#131926] border-white/10" : "bg-[#FFFDF7] border-[#ECD9BA]"
            }`}
          >
            <ul className="m-0 flex shrink-0 list-none -space-x-2 p-0" aria-hidden="true">
              {shown.map((person) => (
                <li key={person.playerId}>
                  <img
                    src={getAvatarUrl(person.avatar)}
                    alt=""
                    width={36}
                    height={36}
                    loading="lazy"
                    className={`h-9 w-9 rounded-full object-cover ring-2 ${ringClass} ${
                      isDark ? "bg-white/10" : "bg-[#F2E4CF]"
                    }`}
                    onError={(event) => {
                      const img = event.currentTarget;
                      if (!img.src.endsWith(FALLBACK_AVATAR)) img.src = FALLBACK_AVATAR;
                    }}
                  />
                </li>
              ))}
              {hidden > 0 && (
                <li
                  className={`flex h-9 min-w-9 items-center justify-center rounded-full px-1.5 text-xs font-bold ring-2 ${ringClass} ${
                    isDark ? "bg-white/10 text-zinc-200" : "bg-[#F2E4CF] text-[#5C4532]"
                  }`}
                >
                  +{hidden}
                </li>
              )}
            </ul>

            <p
              className={`m-0 min-w-[9rem] flex-1 text-[15px] font-bold leading-snug ${
                isDark ? "text-white" : "text-[#1D2C4A]"
              }`}
            >
              {summary.lead}
            </p>

            {summary.watch && (
              <button
                type="button"
                onClick={() => {
                  play(AUDIO.UI_CLICK);
                  navigate(`/watch/${summary.watch?.code}`);
                }}
                aria-label={
                  summary.watch.game
                    ? `Watch ${summary.watch.name} play ${summary.watch.game}`
                    : `Watch ${summary.watch.name}'s game`
                }
                className={`flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold cursor-pointer sm:w-auto
                            transition-[background-color,transform] duration-150 active:scale-95 motion-reduce:transform-none
                            focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                              isDark
                                ? "bg-amber-300 text-amber-950 hover:bg-amber-200 focus-visible:ring-offset-[#131926]"
                                : "bg-[#1D2C4A] text-white hover:bg-[#15213B] focus-visible:ring-offset-[#FFFDF7]"
                            }`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Watch
              </button>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
