import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { buildMatchXpBreakdown } from "../../lib/xpGain";
import { useXpGainStore } from "../../store/xpGainStore";
import { MatchXPBreakdownCard } from "./MatchXPBreakdownCard";

/**
 * The "XP earned this match" card, shown for a few seconds after a match that paid XP.
 *
 * It is a quiet corner card, not a dialog: it never blocks the result screen or takes focus, it announces
 * itself politely to screen readers, and it leaves on its own (or on tap). The numbers are the player's real
 * XP before and after the match (see `buildMatchXpBreakdown`). A level-up is not shown here: that has its own,
 * bigger moment (LevelUpAscension), and the watcher does not raise both for the same match.
 */

const VISIBLE_MS = 12_000;

export function XpGainToast() {
  const moment = useXpGainStore((s) => s.moment);
  const clear = useXpGainStore((s) => s.clear);
  const reduceMotion = useReducedMotion() ?? false;
  const breakdown = useMemo(() => (moment ? buildMatchXpBreakdown(moment.previousXp, moment.newXp) : null), [moment]);

  useEffect(() => {
    if (!moment) return undefined;
    const id = window.setTimeout(clear, VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [moment?.key, clear]);

  return (
    <AnimatePresence>
      {moment && breakdown ? (
        <motion.div
          key={moment.key}
          role="status"
          aria-live="polite"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[70] mx-auto max-w-[380px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0 sm:w-[360px]"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <MatchXPBreakdownCard breakdown={breakdown} />
          <button
            type="button"
            onClick={clear}
            aria-label="Dismiss XP earned"
            className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-stone-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default XpGainToast;
