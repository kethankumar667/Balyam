import { useEffect } from "react";
import { Hourglass } from "lucide-react";
import { useCarryOverStore } from "../../store/carryOverStore";
import { useAuthStore } from "../../store/authStore";
import { CoinAmount } from "../economy/CoinAmount";

/**
 * Where a signed-in player's guest coins stand, in the wallet.
 *
 * Shows nothing unless a guest was brought over and the top-up is still on its way, so it is a
 * status that goes away, not a permanent banner. The sign-up bonus is part of the same payment,
 * so there is no separate bonus state to show.
 */
export function CarryOverCard({ className = "" }: { className?: string }) {
  const isMember = useAuthStore((s) => s.isMember);
  const status = useCarryOverStore((s) => s.status);
  const fetchStatus = useCarryOverStore((s) => s.fetchStatus);

  useEffect(() => {
    if (isMember) void fetchStatus();
  }, [isMember, fetchStatus]);

  if (!isMember || !status || status.carriedAmount === null) return null;
  if (!(status.carriedAmount > 0 && !status.carriedPaid)) return null;

  return (
    <section
      aria-label="Coins from your guest account"
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <Hourglass className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-ink-hi dark:text-text-hi">Coming from your guest account</p>
          <CoinAmount amount={String(status.carriedAmount)} size="md" className="tabular-nums text-amber-700 dark:text-amber-300" />
          <p className="text-xs text-ink-mid dark:text-text-mid">Your guest coins plus the sign-up bonus reach your wallet within a day.</p>
        </div>
      </div>
    </section>
  );
}

export default CarryOverCard;
