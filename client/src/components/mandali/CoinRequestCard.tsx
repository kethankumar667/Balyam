/**
 * BHALYAM Mandali — Coin Request Card
 *
 * Renders inline in the chat feed for a `kind: "COIN_REQUEST"` message.
 * The designated payer taps "Pay X Coins" to complete the transfer in real
 * time; everyone else sees the same card update to FUNDED once it lands.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { Coins, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { MandaliMessage, MandaliCoinRequest, MandaliMember } from "@shared/mandali/types.js";

export interface CoinRequestCardProps {
  message: MandaliMessage;
  request?: MandaliCoinRequest;
  selfId: string | null;
  members: MandaliMember[];
  onPay: (requestId: string) => Promise<{ success: boolean; error?: string }>;
}

function displayNameFor(members: MandaliMember[], playerId: string): string {
  return members.find((m) => m.playerId === playerId)?.displayName ?? "Member";
}

export default function CoinRequestCard({ message, request, selfId, members, onPay }: CoinRequestCardProps) {
  const [isPaying, setIsPaying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!request) {
    // The message landed before the coin-request record resolved (or this
    // is a stale/legacy card) — degrade to the plain text bubble rather
    // than showing a broken card.
    return (
      <div className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800/80 text-sm text-slate-700 dark:text-slate-300">
        {message.content}
      </div>
    );
  }

  const requesterName = displayNameFor(members, request.requesterIdentityId);
  const isDesignatedPayer = selfId === request.payerIdentityId;
  const isExpired = request.status === "OPEN" && request.expiresAt <= Date.now();

  const statusBadge =
    request.status === "FUNDED" ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Paid
      </span>
    ) : request.status === "CANCELLED" ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-500/10 border border-slate-500/30 rounded-full px-2.5 py-1">
        <XCircle className="w-3.5 h-3.5" />
        Cancelled
      </span>
    ) : isExpired || request.status === "EXPIRED" ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-full px-2.5 py-1">
        <Clock className="w-3.5 h-3.5" />
        Expired
      </span>
    ) : null;

  const handlePay = async () => {
    setIsPaying(true);
    setLocalError(null);
    const result = await onPay(request.id);
    setIsPaying(false);
    if (!result.success) {
      setLocalError(result.error ?? "Could not complete the payment.");
    }
  };

  return (
    <div className="max-w-sm rounded-2xl overflow-hidden border border-amber-500/30 bg-white dark:bg-slate-900/90 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <Coins className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Coin Request</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{requesterName} is requesting coins</p>
        </div>
      </div>

      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{request.amount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">coins</p>
        </div>
        {statusBadge}
      </div>

      {localError && (
        <p className="px-4 pb-2 text-xs text-rose-600 dark:text-rose-400" role="alert">
          {localError}
        </p>
      )}

      <div className="px-4 pb-4">
        {request.status === "OPEN" && !isExpired ? (
          isDesignatedPayer ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying}
              className="w-full min-h-[44px] rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              {isPaying ? "Paying…" : `Pay ${request.amount} Coins`}
            </button>
          ) : (
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 py-1">
              Waiting for {displayNameFor(members, request.payerIdentityId)} to pay
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}
