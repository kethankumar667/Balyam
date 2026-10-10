import { useEffect } from "react";
import { Coins } from "lucide-react";
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
  const openClaimModal = useFaucetStore((s) => s.openClaimModal);
  const message = useFaucetStore((s) => s.message);
  const cooldownMs = useFaucetStore((s) => s.status?.cooldownMs ?? 0);
  const { isEligible, isWaiting, isReady, isClaiming, remainingSeconds, amount } = useFaucetCountdown();

  // The header chip normally loads this; a drawer opened somewhere without the header asks for itself.
  useEffect(() => {
    if (!hasStatus) void fetchStatus();
  }, [hasStatus, fetchStatus]);

  if (!isEligible) return null;

  // How far through the wait they are, so the row shows time passing instead of only a number.
  const waited = isWaiting && cooldownMs > 0 ? Math.min(1, Math.max(0, 1 - (remainingSeconds * 1_000) / cooldownMs)) : isReady ? 1 : 0;

  const handleClaim = () => {
    if (!isReady) return;
    HapticsManager.trigger("subtle");
    AudioManager.play(AUDIO.UI_CLICK);
    openClaimModal();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-3 transition-colors ${
        isReady ? "border-amber-500/60 bg-amber-500/15" : "border-amber-500/25 bg-amber-500/[0.07]"
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/25 ${
            isReady ? "motion-safe:animate-glow-pulse" : ""
          }`}
        >
          <Coins className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-tight text-ink-hi dark:text-text-hi">Free coins</p>
          <p className="mt-0.5 text-xs text-ink-mid dark:text-text-mid tabular-nums" aria-live="polite">
            {isWaiting ? `Next in ${formatCountdown(remainingSeconds)}` : message ?? `${amount} coins every 4 hours`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClaim}
          aria-disabled={!isReady}
          className={`min-h-[44px] min-w-[44px] flex-shrink-0 rounded-full px-4 text-sm font-black tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
            isReady
              ? "cursor-pointer bg-amber-500 text-amber-950 shadow-md shadow-amber-900/20 hover:bg-amber-400"
              : "cursor-default bg-zinc-500/20 text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {isClaiming ? "Claiming…" : isWaiting ? formatCountdown(remainingSeconds) : `Claim ${amount}`}
        </button>
      </div>
      {/* The wait, drawn as a track filling toward the next claim. Decorative: the countdown above says the same in words. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-amber-500/15">
        <div
          className="h-full origin-left bg-amber-500/70 transition-transform duration-1000 ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${waited})` }}
        />
      </div>
    </div>
  );
}

export default FaucetClaimRow;
