import { useEffect } from "react";
import { Coins, Gift } from "lucide-react";
import { GoldCoin } from "./CoinRain";
import { RewardChest } from "./RewardChest";
import { formatCountdown, useFaucetStore } from "../../store/faucetStore";
import { useFaucetCountdown } from "../../hooks/useFaucetCountdown";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";

/**
 * The free-coins claim as a full-width row inside the wallet drawer.
 *
 * This is where the faucet's WAIT lives, at every screen width: the wallet is where a player already goes to think
 * about coins, and a countdown sitting in the header all day was noise. The header chip (`md` and up) only appears
 * when a claim is ready, and on a phone a dot on the wallet chip says the same. Same store and same countdown as
 * that chip, so the two cannot disagree.
 * Renders nothing for a player who has no faucet (a guest).
 */
export function FaucetClaimRow({ className = "", variant = "compact" }: { className?: string; variant?: "compact" | "wallet" }) {
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

  if (variant === "compact") return (
    <div className={`relative overflow-hidden flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 ${className}`}>
      <Coins aria-hidden="true" className="h-6 w-6 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-black text-ink-hi dark:text-text-hi">Free coins</p>
        <p className="mt-0.5 text-xs tabular-nums text-ink-mid dark:text-text-mid">{isWaiting ? `Next in ${formatCountdown(remainingSeconds)}` : message ?? `${amount} coins every 4 hours`}</p>
      </div>
      <button type="button" onClick={handleClaim} aria-disabled={!isReady} className={`min-h-11 min-w-11 rounded-full px-4 text-sm font-black focus-visible:ring-2 focus-visible:ring-amber-600 ${isReady ? "bg-amber-500 text-amber-950" : "bg-stone-500/20 text-stone-600 dark:text-stone-300"}`}>
        {isClaiming ? "Claiming…" : isWaiting ? formatCountdown(remainingSeconds) : `Claim ${amount}`}
      </button>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-amber-500/15"><div className="h-full origin-left bg-amber-500/70 transition-transform duration-1000 motion-reduce:transition-none" style={{ transform: `scaleX(${waited})` }} /></div>
    </div>
  );

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition-colors ${
        isReady ? "border-amber-400 bg-gradient-to-br from-[#FFF9DF] to-[#FFE9AA] dark:from-[#383020] dark:to-[#241F18]" : "border-amber-400/40 bg-amber-500/[0.07]"
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-amber-800 dark:text-amber-200" aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-100">Coin Drop <span className="sr-only">— Free coins</span></p>
      </div>
      <p className="mt-1 text-[11px] text-stone-700 dark:text-stone-300">{amount} coins every 4 hours</p>
      <div className="relative mt-2 min-h-[142px]">
        <div className="relative z-10 w-1/2 pt-3">
          <p className="text-4xl font-black text-amber-900 dark:text-amber-200 tabular-nums">+{amount}</p>
          <p className="mt-2 text-[9px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            {isReady ? "Ready to claim!" : isWaiting ? "Next reward in" : "Checking reward"}
          </p>
          <p className="mt-0.5 text-xs text-ink-mid dark:text-text-mid tabular-nums">
            {isWaiting ? `Next in ${formatCountdown(remainingSeconds)}` : message ?? "A little boost for your next table."}
          </p>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-3 flex w-[54%] flex-col items-center">
          <GoldCoin size={22} className="absolute left-2 top-2 -rotate-12" />
          <GoldCoin size={22} className="absolute right-5 top-0 rotate-12" />
          <RewardChest />
          <p className="text-center font-script text-lg leading-tight text-amber-950 dark:text-amber-200">Small Rewards<br />Big Joys!</p>
        </div>
      </div>
        <button
          type="button"
          onClick={handleClaim}
          aria-disabled={!isReady}
          className={`relative mt-3 min-h-[44px] w-full rounded-xl px-4 text-sm font-black tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 ${
            isReady
              ? "cursor-pointer bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-md shadow-amber-900/20 hover:from-amber-200 border border-amber-500"
              : "cursor-default bg-zinc-500/20 text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {isClaiming ? "Claiming…" : isWaiting ? formatCountdown(remainingSeconds) : `Claim ${amount} Coins`}
        </button>
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
