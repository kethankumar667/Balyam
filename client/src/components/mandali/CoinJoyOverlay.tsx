import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useMandaliJoyStore } from "../../store/mandaliJoyStore";
import { Heart, JoyBurst, RisingHearts } from "../faucet/CoinCelebrations";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

/** Long enough to read a name and an amount and enjoy the burst, short enough not to linger. */
export const JOY_VISIBLE_MS = 5_500;

const OVERLAY_Z = 85;

/**
 * The warm moment after a friend answers a coin request, wherever the player is in the app.
 *
 * Someone who ASKED gets the full burst, coins and hearts flying out from the middle with a banner
 * naming who sent how much: coins arriving from someone who loves you should feel like it. Someone
 * who PAID gets a quieter reply, hearts rising, because nothing arrived for them and it is not a
 * win, it is a kindness. Neither blocks anything: the banner never takes focus, and both clear
 * themselves. Under reduced motion the animation is skipped and the banner still says it all.
 */
export function CoinJoyOverlay() {
  const moment = useMandaliJoyStore((s) => s.moment);
  const clear = useMandaliJoyStore((s) => s.clear);
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!moment) return undefined;
    if (moment.kind === "received") {
      HapticsManager.trigger("reward");
      AudioManager.play(AUDIO.REWARD_COIN);
    } else {
      HapticsManager.trigger("subtle");
    }
    const id = window.setTimeout(clear, JOY_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [moment?.key, moment?.kind, clear]);

  if (!moment) return null;

  const name = moment.otherName ?? t("mandali.joy.friend");
  const amount = moment.amount.toLocaleString();
  const text =
    moment.kind === "received"
      ? t("mandali.joy.received", { name, amount })
      : t("mandali.joy.sent", { name, amount });

  return (
    <>
      {moment.kind === "received" ? <JoyBurst key={moment.key} zIndex={OVERLAY_Z} /> : <RisingHearts key={moment.key} zIndex={OVERLAY_Z} />}
      <div className="pointer-events-none fixed left-1/2 top-3 z-[86] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2">
        <motion.div
          key={moment.key}
          role="status"
          aria-live="polite"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -22, scale: 0.94 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-rose-300/70 bg-[#FFF7F3]/95 px-3.5 py-3 shadow-2xl shadow-rose-900/20 dark:border-rose-400/40 dark:bg-[#2A1820]/95"
        >
          <motion.span
            aria-hidden="true"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/15"
            animate={reduceMotion ? undefined : { scale: [1, 1.18, 1] }}
            transition={reduceMotion ? undefined : { duration: 1.1, repeat: 3, ease: "easeInOut" }}
          >
            <Heart size={26} color="#E5566B" />
          </motion.span>
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-[#4A2430] dark:text-rose-50">{text}</p>
          <button
            type="button"
            onClick={clear}
            aria-label={t("mandali.close")}
            className="-m-1 flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-[#4A2430]/70 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-100/80 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      </div>
    </>
  );
}

export default CoinJoyOverlay;
