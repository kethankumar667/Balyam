/**
 * BHALYAM Mandali — Coin Transfer & Request Modal
 *
 * Allows verified clan members to send or request virtual coins directly
 * between their BHALYAM Wallets inside a Mandali lounge.
 *
 * Rules:
 * - Strictly NO usage of Sparkles from lucide-react. Uses Coins, Send, ArrowUpRight, ArrowDownLeft, Users, CheckCircle2, AlertCircle, X.
 * - Dual theme support: Light and Dark mode compliant.
 * - Minimum 44x44px touch targets on all interactive controls.
 * - WCAG 2.1 AA focus rings.
 */

import React, { useEffect, useState } from "react";
import { Coins, Send, ArrowUpRight, ArrowDownLeft, Users, CheckCircle2, AlertCircle, X, Clock, Info } from "lucide-react";
import type { MandaliMember, CoinTransferType } from "@shared/mandali/types.js";
import { MANDALI_COIN_AMOUNT, MANDALI_COIN_REQUEST_COOLDOWN_MS } from "@shared/mandali/coinRules.js";
import { useWallet } from "../../hooks/useEconomy";
import { useCountdown } from "../../hooks/useCountdown";
import { formatCountdown } from "../../lib/formatCountdown";
import { useMandaliStore } from "../../store/mandaliStore";

interface CoinTransferModalProps {
  mandaliId: string;
  /** Needed only for REQUEST mode — the payable coin-request card posts
   * into this channel. SEND mode ignores it (a direct transfer isn't a
   * chat card). */
  channelId?: string;
  members: MandaliMember[];
  currentUserId: string | null;
  preselectedMemberId?: string;
  initialType?: CoinTransferType;
  onClose: () => void;
}

const COOLDOWN_HOURS = MANDALI_COIN_REQUEST_COOLDOWN_MS / (60 * 60 * 1000);

export const CoinTransferModal: React.FC<CoinTransferModalProps> = ({
  mandaliId,
  channelId,
  members,
  currentUserId,
  preselectedMemberId,
  initialType = "SEND",
  onClose,
}) => {
  const { balance, refetch: refetchWallet } = useWallet();
  const {
    transferCoins,
    createCoinRequest,
    isSubmitting,
    coinRequestCooldownEndsAt,
    fetchCoinRequestCooldown,
    channels = [],
    activeChannelId: storeActiveChannelId,
  } = useMandaliStore();
  const cooldownRemainingMs = useCountdown(coinRequestCooldownEndsAt);

  // Fallback to active channel or first text channel in the lounge if channelId isn't explicitly passed
  const effectiveChannelId =
    channelId ||
    storeActiveChannelId ||
    channels.find((c) => c.type === "TEXT")?.channelId ||
    channels[0]?.channelId;

  // The database enforces the limit; this just makes sure the countdown shown
  // here starts from the server's clock rather than a stale local guess.
  useEffect(() => {
    void fetchCoinRequestCooldown();
  }, [fetchCoinRequestCooldown]);

  const otherMembers = members.filter(
    (m) => m.playerId !== currentUserId && m.state === "ACTIVE"
  );

  const [type, setType] = useState<CoinTransferType>(initialType);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    preselectedMemberId || (otherMembers.length > 0 ? otherMembers[0].playerId : "")
  );
  const [note, setNote] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const numericBalance = balance ? parseInt(balance, 10) : 0;
  const effectiveAmount = MANDALI_COIN_AMOUNT;

  const isBalanceSufficient = type === "REQUEST" || effectiveAmount <= numericBalance;
  const isCoolingDown = type === "REQUEST" && cooldownRemainingMs > 0;
  const targetMember = otherMembers.find((m) => m.playerId === selectedRecipientId);
  const targetName = targetMember?.displayName || "Member";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedRecipientId) {
      setErrorMessage("Please select a member.");
      return;
    }

    if (isCoolingDown) return;

    if (type === "SEND" && effectiveAmount > numericBalance) {
      setErrorMessage(`Insufficient coins. Your balance is ${numericBalance.toLocaleString()} coins.`);
      return;
    }

    if (type === "SEND") {
      const res = await transferCoins(mandaliId, {
        toPlayerId: selectedRecipientId,
        amount: effectiveAmount,
        type: "SEND",
        note: note.trim() || undefined,
      });
      if (res.success) {
        refetchWallet();
        setSuccessMessage(`Successfully transferred ${effectiveAmount.toLocaleString()} coins to @${targetName}!`);
        setTimeout(onClose, 1600);
      } else {
        setErrorMessage(res.error || "Transfer failed. Please try again.");
      }
      return;
    }

    // REQUEST mode posts an actual payable card into the channel — the
    // designated member (selectedRecipientId here is who's being ASKED,
    // i.e. the payer) taps "Pay" on it to complete the transfer.
    if (!effectiveChannelId) {
      setErrorMessage("Open this from within a channel to request coins.");
      return;
    }
    const res = await createCoinRequest(mandaliId, effectiveChannelId, selectedRecipientId, effectiveAmount);
    if (res.success) {
      setSuccessMessage(`Requested ${effectiveAmount.toLocaleString()} coins from @${targetName}!`);
      setTimeout(onClose, 1600);
    } else {
      setErrorMessage(res.error || "Could not create the coin request. Please try again.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 id="coin-modal-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                Mandali Coin Transfer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Transfer or request coins with fellow clan members
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Close transfer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 flex items-center gap-2.5 text-xs font-bold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode Selector (Send vs Request) */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setType("SEND");
              setErrorMessage(null);
            }}
            className={`min-h-[44px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
              type === "SEND"
                ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Send Coins</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("REQUEST");
              setErrorMessage(null);
            }}
            className={`min-h-[44px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
              type === "REQUEST"
                ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Request Coins</span>
            {isCoolingDown && (
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" title="Cooldown active" />
            )}
          </button>
        </div>

        {/* Wallet Balance Display */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-500" />
            Your Wallet Balance:
          </span>
          <span className="font-mono font-extrabold text-slate-900 dark:text-amber-400 text-sm">
            {numericBalance.toLocaleString()} coins
          </span>
        </div>

        {otherMembers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No other active members in this Mandali yet to transfer coins with.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recipient Selector */}
            <div>
              <label htmlFor="member-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {type === "SEND" ? "Send to Member" : "Request from Member"}
              </label>
              <select
                id="member-select"
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
              >
                {otherMembers.map((m) => (
                  <option key={m.playerId} value={m.playerId}>
                    {m.displayName} ({m.role})
                  </option>
                ))}
              </select>

              {type === "REQUEST" && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 font-medium">
                  <Send className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>
                    Posts a payable request card in chat — coins transfer when{" "}
                    <strong className="text-slate-700 dark:text-slate-300">@{targetName}</strong> taps Pay.
                  </span>
                </p>
              )}
            </div>

            {/* Amount Section — Redesigned according to the condition */}
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {type === "SEND" ? "Transfer Amount" : "Request Amount"}
              </span>

              {type === "REQUEST" ? (
                <div className="space-y-2.5">
                  <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-amber-300">
                        <Coins className="w-5 h-5 text-amber-500" />
                        {MANDALI_COIN_AMOUNT} coins
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        Fixed Clan Request
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5 pt-2 border-t border-amber-500/20 leading-relaxed font-medium">
                      <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>Coin requests are always 100 coins to keep clan support balanced.</span>
                    </div>
                  </div>

                  {!effectiveChannelId && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>No active chat channel found to post your request card.</span>
                    </div>
                  )}

                  {/* A timer, not a live region: the countdown changes every second and must not be read out each time. */}
                  <div
                    role={isCoolingDown ? "timer" : undefined}
                    className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                      isCoolingDown
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                        : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {isCoolingDown ? (
                      <span>
                        You can request coins again in{" "}
                        <span className="font-mono font-extrabold tabular-nums">{formatCountdown(cooldownRemainingMs)}</span>
                      </span>
                    ) : (
                      <span>You can request coins once every {COOLDOWN_HOURS} hours.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-amber-300">
                        <Coins className="w-5 h-5 text-amber-500" />
                        {MANDALI_COIN_AMOUNT} coins
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Fixed for every transfer
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5 pt-2 border-t border-amber-500/20 leading-relaxed font-medium">
                      <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>Transfers are fixed at 100 coins to keep clan economy balanced and safe.</span>
                    </div>

                    {isBalanceSufficient && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1.5 border-t border-amber-500/15 flex items-center justify-between font-medium">
                        <span>Balance after send:</span>
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">
                          {(numericBalance - effectiveAmount).toLocaleString()} coins
                        </span>
                      </div>
                    )}
                  </div>

                  {!isBalanceSufficient && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Not enough coins — you have {numericBalance.toLocaleString()}.</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Note (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="transfer-note" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {type === "SEND" ? "Note (Optional)" : "Reason for Request (Optional)"}
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                  {note.length}/80
                </span>
              </div>
              <input
                id="transfer-note"
                type="text"
                maxLength={80}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  type === "SEND"
                    ? "e.g. GG in Ludo death match!"
                    : "e.g. Need entry fee for squad match!"
                }
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !!successMessage ||
                !isBalanceSufficient ||
                isCoolingDown ||
                (type === "REQUEST" && !effectiveChannelId)
              }
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Processing..."
                  : isCoolingDown
                  ? `Available in ${formatCountdown(cooldownRemainingMs)}`
                  : type === "SEND"
                  ? `Send ${effectiveAmount} Coins`
                  : `Request ${effectiveAmount} Coins`}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
