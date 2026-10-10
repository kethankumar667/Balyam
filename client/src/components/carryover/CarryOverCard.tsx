import { useEffect } from "react";
import { Gift, Hourglass } from "lucide-react";
import { useCarryOverStore } from "../../store/carryOverStore";
import { useAuthStore } from "../../store/authStore";
import { CoinAmount } from "../economy/CoinAmount";

/**
 * Where a signed-in player's guest coins and welcome bonus stand, in the wallet.
 *
 * Shows nothing unless a guest was brought over, and nothing once everything has landed, so it is
 * a status that goes away, not a permanent banner. The welcome bonus has three honest states:
 * locked (play a match with friends), unlocked (claim it here; this is also how a bonus is claimed
 * when the match ended mid-session), and on its way (held, like every reward).
 */
export function CarryOverCard({ className = "" }: { className?: string }) {
  const isMember = useAuthStore((s) => s.isMember);
  const status = useCarryOverStore((s) => s.status);
  const fetchStatus = useCarryOverStore((s) => s.fetchStatus);
  const claimBonus = useCarryOverStore((s) => s.claimBonus);
  const isClaiming = useCarryOverStore((s) => s.isClaimingBonus);
  const message = useCarryOverStore((s) => s.bonusMessage);

  useEffect(() => {
    if (isMember) void fetchStatus();
  }, [isMember, fetchStatus]);

  if (!isMember || !status || status.carriedAmount === null) return null;

  const carriedInTransit = status.carriedAmount > 0 && !status.carriedPaid;
  const bonusOpen = status.bonusPending && !status.bonusPaid;
  if (!carriedInTransit && !bonusOpen) return null;

  return (
    <section
      aria-label="Coins from your guest account"
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 ${className}`}
    >
      {carriedInTransit && (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <Hourglass className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink-hi dark:text-text-hi">Coming from your guest account</p>
            <CoinAmount amount={String(status.carriedAmount)} size="md" className="tabular-nums text-amber-700 dark:text-amber-300" />
            <p className="text-xs text-ink-mid dark:text-text-mid">They reach your wallet within a day.</p>
          </div>
        </div>
      )}

      {bonusOpen && (
        <div className={`flex items-center gap-3 ${carriedInTransit ? "mt-3 border-t border-amber-500/20 pt-3" : ""}`}>
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <Gift className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink-hi dark:text-text-hi">Welcome bonus</p>
            <p className="text-xs text-ink-mid dark:text-text-mid" aria-live="polite">
              {message ??
                (status.bonusUnlocked
                  ? `Unlocked: ${status.bonusAmount.toLocaleString()} coins are yours to claim.`
                  : `Finish a match with friends to unlock ${status.bonusAmount.toLocaleString()} coins.`)}
            </p>
          </div>
          {status.bonusUnlocked && !message && (
            <button
              type="button"
              onClick={() => void claimBonus()}
              aria-disabled={isClaiming}
              className="min-h-[44px] min-w-[44px] flex-shrink-0 cursor-pointer rounded-full bg-amber-500 px-4 text-sm font-black text-amber-950 transition-colors hover:bg-amber-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
            >
              {isClaiming ? "Claiming…" : "Claim"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default CarryOverCard;
