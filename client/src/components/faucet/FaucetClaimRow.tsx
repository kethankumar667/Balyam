import { useEffect } from "react";
import { Gift } from "lucide-react";
import { formatCountdown, useFaucetStore } from "../../store/faucetStore";
import { useFaucetCountdown } from "../../hooks/useFaucetCountdown";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

/**
 * The free-coins claim as a full-width row inside the wallet drawer.
 *
 * On a phone the header has no room for another chip, so this is where the
 * faucet lives: the wallet is where a player already goes to think about coins.
 * Same store and same countdown as the header chip, so the two cannot disagree.
 * Renders nothing for a player who has no faucet (a guest).
 */
export function FaucetClaimRow({ className = "" }: { className?: string }) {
  const hasStatus = useFaucetStore((s) => s.status !== null);
  const fetchStatus = useFaucetStore((s) => s.fetchStatus);
  const claim = useFaucetStore((s) => s.claim);
  const message = useFaucetStore((s) => s.message);
  const { isEligible, isWaiting, isReady, isClaiming, remainingSeconds, amount } = useFaucetCountdown();

  // The header chip normally loads this; a drawer opened somewhere without the header asks for itself.
  useEffect(() => {
    if (!hasStatus) void fetchStatus();
  }, [hasStatus, fetchStatus]);

  if (!isEligible) return null;

  const handleClaim = () => {
    if (!isReady) return;
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    void claim();
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 ${className}`}
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
        <Gift className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-ink-hi dark:text-text-hi">Free coins</p>
        <p className="text-xs text-ink-mid dark:text-text-mid" aria-live="polite">
          {isWaiting ? `Next in ${formatCountdown(remainingSeconds)}` : message ?? `${amount} coins every 4 hours`}
        </p>
      </div>
      <button
        type="button"
        onClick={handleClaim}
        aria-disabled={!isReady}
        className={`min-h-[44px] min-w-[44px] flex-shrink-0 rounded-full px-4 text-sm font-black transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
          isReady
            ? "cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500"
            : "cursor-default bg-zinc-500/20 text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {isClaiming ? "Claiming…" : isWaiting ? formatCountdown(remainingSeconds) : `Claim ${amount}`}
      </button>
    </div>
  );
}

export default FaucetClaimRow;
