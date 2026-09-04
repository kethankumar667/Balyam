import React from "react";
import { AlertTriangle, Users } from "lucide-react";
import { ECONOMY_MAX_APPROVED_SEAT_COUNT } from "@shared/catalog";

export interface UnsupportedSeatCountCardProps {
  seatCount: number;
  isHost?: boolean;
  className?: string;
}

/**
 * UnsupportedSeatCountCard Component.
 *
 * Rendered in the lobby whenever a table's seat count exceeds Economy V1's
 * supported capacity (max 5 seats).
 *
 * In accordance with Economy Safety Standards:
 *   1. Hides prize-pool commitment card entirely.
 *   2. Hides payout schedule breakdown entirely.
 *   3. Displays a truthful, actionable corrective message explaining the limit.
 *   4. Instructs the host exactly how many players/bots need to be removed.
 */
export const UnsupportedSeatCountCard: React.FC<UnsupportedSeatCountCardProps> = ({
  seatCount,
  isHost = false,
  className = "",
}) => {
  const excess = Math.max(0, seatCount - ECONOMY_MAX_APPROVED_SEAT_COUNT);

  return (
    <div
      id="unsupported-seat-count-card"
      role="alert"
      aria-live="polite"
      className={`relative rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-[#FFFDF8] to-[#FFF8EE] dark:from-amber-950/40 dark:via-[#131926] dark:to-[#0F1420] p-4 sm:p-5 shadow-sm overflow-hidden select-none ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
              <span>Unsupported Table Size</span>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 lowercase">
                ({seatCount} seats)
              </span>
            </h2>

            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
              <Users className="w-3 h-3" aria-hidden="true" />
              <span>Max {ECONOMY_MAX_APPROVED_SEAT_COUNT} Seats Supported</span>
            </span>
          </div>

          <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-medium">
            The game economy currently supports tables of 1 to {ECONOMY_MAX_APPROVED_SEAT_COUNT} players. Prize pool commitments, payouts, and match launch are unavailable for tables exceeding {ECONOMY_MAX_APPROVED_SEAT_COUNT} players.
          </p>

          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 pt-0.5">
            {isHost
              ? `Please remove ${excess} player${excess > 1 ? "s" : ""} or bot${excess > 1 ? "s" : ""} to enable match start.`
              : `Waiting for host to adjust table capacity to ${ECONOMY_MAX_APPROVED_SEAT_COUNT} or fewer players.`}
          </p>
        </div>
      </div>
    </div>
  );
};
