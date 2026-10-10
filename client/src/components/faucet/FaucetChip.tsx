import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Gift } from "lucide-react";
import { formatCountdown, useFaucetStore } from "../../store/faucetStore";
import { useFaucetCountdown } from "../../hooks/useFaucetCountdown";
import { Tooltip } from "../../design-system/dls/Tooltip";
import { bhalyamSpring } from "../../lib/motion";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { FaucetClaimModal } from "./FaucetClaimModal";

/** How long the "+100" confirmation stays on the chip. */
const JUST_CLAIMED_VISIBLE_MS = 2_500;

/**
 * Header chip for the free-coins faucet, from the `sm` breakpoint up.
 *
 * Three looks: ready ("Free +100", gently pulsing), waiting (a countdown, not
 * pressable) and just paid ("+100"). Mounted for signed-in members only — a guest
 * has no faucet, so the header never shows them a control that cannot work.
 *
 * It is also the one place that loads the faucet status for the whole app: it stays
 * mounted (hidden by CSS) on a phone, where the header has no room for a sixth chip
 * and the claim lives in the wallet drawer (`FaucetClaimRow`) with a dot on the
 * wallet chip (`FaucetReadyDot`). All three read the same store.
 *
 * The countdown runs on the server's clock. Becoming "ready" on screen only
 * enables the button; the server still decides the claim, and if the two ever
 * disagree the server's answer replaces what is shown.
 */
export function FaucetChip() {
  const justClaimed = useFaucetStore((s) => s.justClaimed);
  const message = useFaucetStore((s) => s.message);
  const fetchStatus = useFaucetStore((s) => s.fetchStatus);
  const openClaimModal = useFaucetStore((s) => s.openClaimModal);
  const clearJustClaimed = useFaucetStore((s) => s.clearJustClaimed);
  const reset = useFaucetStore((s) => s.reset);
  const reducedMotion = useReducedMotion();
  const { isEligible, isWaiting, isReady, remainingSeconds, amount } = useFaucetCountdown();

  useEffect(() => {
    void fetchStatus();
    // Signing out unmounts the chip; the next account must not inherit this one's countdown.
    return () => reset();
  }, [fetchStatus, reset]);

  useEffect(() => {
    if (justClaimed === null) return undefined;
    const id = window.setTimeout(clearJustClaimed, JUST_CLAIMED_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [justClaimed, clearJustClaimed]);

  if (!isEligible) return null;

  const label = justClaimed !== null
    ? `+${justClaimed}`
    : isWaiting
      ? formatCountdown(remainingSeconds)
      : `Free +${amount}`;
  const tooltip = isWaiting
    ? `Next free coins in ${formatCountdown(remainingSeconds)}`
    : `Claim ${amount} free coins`;

  const handleClick = () => {
    if (!isReady) return;
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    openClaimModal();
  };

  return (
    <>
      <ClaimAnnouncement justClaimed={justClaimed} message={message} />
      {/* Mounted here because the chip is the one faucet control every signed-in page has, even on a phone where it is hidden. */}
      <FaucetClaimModal />
      <div className="hidden sm:contents">
        <Tooltip content={tooltip} side="bottom">
          <motion.button
            type="button"
            whileHover={isReady ? { scale: 1.05 } : undefined}
            whileTap={isReady ? { scale: 0.95 } : undefined}
            transition={bhalyamSpring}
            onClick={handleClick}
            aria-disabled={!isReady}
            aria-label={tooltip}
            className={`group relative min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-full border flex items-center justify-center gap-1.5 select-none
                       transition-colors duration-300 flex-shrink-0 focus-visible:outline-hidden focus-visible:ring-2
                       focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0f172a]
                       ${
                         isReady
                           ? "cursor-pointer bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border-emerald-500/70 text-emerald-700 dark:text-emerald-300 shadow-[0_0_18px_-4px_rgba(16,185,129,0.45)]"
                           : "cursor-default bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink)] shadow-sm"
                       }`}
          >
            <motion.span
              className="flex items-center"
              animate={isReady && !reducedMotion ? { rotate: [-6, 6, -6] } : { rotate: 0 }}
              transition={isReady && !reducedMotion ? { repeat: Infinity, duration: 2.4, ease: "easeInOut" } : undefined}
            >
              <Gift className={`w-4 h-4 ${isReady ? "text-emerald-600 dark:text-emerald-300" : "text-zinc-400"}`} aria-hidden="true" />
            </motion.span>

            <span className="text-[12px] font-black tracking-tight font-mono tabular-nums whitespace-nowrap">{label}</span>

            <AnimatePresence>
              {isReady && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={bhalyamSpring}
                  className="absolute -top-1 -right-1 flex h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  {!reducedMotion && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-[var(--chrome-panel)]" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </Tooltip>
      </div>
    </>
  );
}

/** What a screen reader hears when coins arrive or a claim is refused; the visible label is already changing. */
function ClaimAnnouncement({ justClaimed, message }: { justClaimed: number | null; message: string | null }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {justClaimed !== null ? `${justClaimed} coins added to your wallet` : (message ?? "")}
    </span>
  );
}

export default FaucetChip;
