/**
 * BHALYAM Mandali — Incoming Coin Request Banner
 *
 * The notification for the person who was ASKED for coins. It sits above the
 * hub (both layouts), appears live the moment a request is posted, survives a
 * page refresh (it is derived from the open requests addressed to you, not
 * from a one-off event), and lets you pay right there without hunting for the
 * card in the chat feed.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import type { MandaliCoinRequest, MandaliMember } from "@shared/mandali/types.js";

export interface IncomingCoinRequestBannerProps {
  /** Open, unexpired requests where the current user is the designated payer, oldest first. */
  requests: MandaliCoinRequest[];
  members: MandaliMember[];
  onPay: (requestId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function IncomingCoinRequestBanner({ requests, members, onPay }: IncomingCoinRequestBannerProps) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = requests[0];
  if (!current) return null;

  const requesterName =
    members.find((m) => m.playerId === current.requesterIdentityId)?.displayName ?? "A member";
  const isPaying = payingId === current.id;
  const others = requests.length - 1;

  const handlePay = async () => {
    setPayingId(current.id);
    setError(null);
    const result = await onPay(current.id);
    setPayingId(null);
    if (!result.success) setError(result.error ?? "Could not send the coins. Please try again.");
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex-shrink-0 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 px-4 py-2.5 shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Coins className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-bold truncate">
            {requesterName} asked you for {current.amount} coins
            {others > 0 ? ` (+${others} more)` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={isPaying}
          className="min-h-[44px] px-4 rounded-lg bg-slate-950 text-amber-400 font-extrabold text-xs sm:text-sm hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow flex items-center gap-1.5 flex-shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-400"
        >
          {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
          {isPaying ? "Sending…" : `Send ${current.amount} Coins`}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-900" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
