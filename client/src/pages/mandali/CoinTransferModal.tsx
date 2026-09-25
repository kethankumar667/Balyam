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
      <div className="bg-album-raised border border-album-line rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-album-line">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-album-foilfill/10 border border-album-foil/40 flex items-center justify-center text-album-foil">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 id="coin-modal-title" className="text-base font-semibold text-album-ink">
                Mandali Coin Transfer
              </h2>
              <p className="text-[13px] text-album-ink3 font-medium">
                Transfer or request coins with fellow clan members
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-album-ink3 hover:text-album-ink transition-colors focus-visible:ring-2 focus-visible:ring-album-focus"
            aria-label="Close transfer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-album-success/10 border border-album-success/40 text-album-success flex items-center gap-3 text-[13px] sm:text-[15px] font-bold">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-album-danger/10 border border-album-danger/40 text-album-danger flex items-center gap-2.5 text-[13px] font-bold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode Selector (Send vs Request) */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-album-field border border-album-line">
          <button
            type="button"
            onClick={() => {
              setType("SEND");
              setErrorMessage(null);
            }}
            className={`min-h-[44px] rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-album-focus focus-visible:outline-none ${
              type === "SEND"
                ? "bg-album-foilfill text-album-onfoil shadow-md scale-[1.02]"
                : "text-album-ink2 hover:text-album-ink"
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
            className={`min-h-[44px] rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-album-focus focus-visible:outline-none ${
              type === "REQUEST"
                ? "bg-album-foilfill text-album-onfoil shadow-md scale-[1.02]"
                : "text-album-ink2 hover:text-album-ink"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Request Coins</span>
            {isCoolingDown && (
              <span className="w-2 h-2 rounded-full bg-album-danger flex-shrink-0" title="Cooldown active" />
            )}
          </button>
        </div>

        {/* Wallet Balance Display */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-album-foilfill/10 border border-album-foil/40 text-[13px]">
          <span className="font-semibold text-album-ink2 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-album-foil" />
            Your Wallet Balance:
          </span>
          <span className="font-semibold text-album-ink text-[15px]">
            {numericBalance.toLocaleString()} coins
          </span>
        </div>

        {otherMembers.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-album-ink3 font-medium">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No other active members in this Mandali yet to transfer coins with.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recipient Selector */}
            <div>
              <label htmlFor="member-select" className="block text-[13px] font-bold text-album-ink mb-1.5">
                {type === "SEND" ? "Send to Member" : "Request from Member"}
              </label>
              <select
                id="member-select"
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-album-page border border-album-line text-album-ink text-[13px] font-semibold focus:border-album-foil focus:outline-none focus:ring-2 focus:ring-album-focus transition-colors"
              >
                {otherMembers.map((m) => (
                  <option key={m.playerId} value={m.playerId}>
                    {m.displayName} ({m.role})
                  </option>
                ))}
              </select>

              {type === "REQUEST" && (
                <p className="text-[13px] text-album-ink3 mt-1.5 flex items-center gap-1.5 font-medium">
                  <Send className="w-3.5 h-3.5 text-album-foil flex-shrink-0" />
                  <span>
                    Posts a payable request card in chat — coins transfer when{" "}
                    <strong className="text-album-ink">@{targetName}</strong> taps Pay.
                  </span>
                </p>
              )}
            </div>

            {/* Amount Section — Redesigned according to the condition */}
            <div>
              <span className="block text-[13px] font-bold text-album-ink mb-1.5">
                {type === "SEND" ? "Transfer Amount" : "Request Amount"}
              </span>

              {type === "REQUEST" ? (
                <div className="space-y-2.5">
                  <div className="p-4 rounded-2xl bg-album-foilfill/10 border border-album-foil/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-base font-semibold text-album-ink">
                        <Coins className="w-5 h-5 text-album-foil" />
                        {MANDALI_COIN_AMOUNT} coins
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold bg-album-foilfill/20 text-album-foil border border-album-foil/40">
                        Fixed Clan Request
                      </span>
                    </div>

                    <div className="text-[13px] text-album-ink2 flex items-start gap-1.5 pt-2 border-t border-album-foil/40 leading-relaxed font-medium">
                      <Info className="w-4 h-4 text-album-foil flex-shrink-0 mt-0.5" />
                      <span>Coin requests are always 100 coins to keep clan support balanced.</span>
                    </div>
                  </div>

                  {!effectiveChannelId && (
                    <div className="p-3 rounded-xl bg-album-danger/10 border border-album-danger/40 text-album-danger text-[13px] font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>No active chat channel found to post your request card.</span>
                    </div>
                  )}

                  {/* A timer, not a live region: the countdown changes every second and must not be read out each time. */}
                  <div
                    role={isCoolingDown ? "timer" : undefined}
                    className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold ${
                      isCoolingDown
                        ? "bg-album-danger/10 border-album-danger/40 text-album-danger"
                        : "bg-album-field border-album-line text-album-ink2"
                    }`}
                  >
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {isCoolingDown ? (
                      <span>
                        You can request coins again in{" "}
                        <span className="font-semibold tabular-nums">{formatCountdown(cooldownRemainingMs)}</span>
                      </span>
                    ) : (
                      <span>You can request coins once every {COOLDOWN_HOURS} hours.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="p-4 rounded-2xl bg-album-foilfill/10 border border-album-foil/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-base font-semibold text-album-ink">
                        <Coins className="w-5 h-5 text-album-foil" />
                        {MANDALI_COIN_AMOUNT} coins
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold bg-album-field text-album-ink">
                        Fixed for every transfer
                      </span>
                    </div>

                    <div className="text-[13px] text-album-ink2 flex items-start gap-1.5 pt-2 border-t border-album-foil/40 leading-relaxed font-medium">
                      <Info className="w-4 h-4 text-album-foil flex-shrink-0 mt-0.5" />
                      <span>Transfers are fixed at 100 coins to keep clan economy balanced and safe.</span>
                    </div>

                    {isBalanceSufficient && (
                      <div className="text-[13px] text-album-ink2 pt-1.5 border-t border-album-foil/40 flex items-center justify-between font-medium">
                        <span>Balance after send:</span>
                        <span className="font-semibold text-album-ink">
                          {(numericBalance - effectiveAmount).toLocaleString()} coins
                        </span>
                      </div>
                    )}
                  </div>

                  {!isBalanceSufficient && (
                    <p className="text-[13px] text-album-danger font-semibold mt-1.5 flex items-center gap-1.5">
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
                <label htmlFor="transfer-note" className="block text-[13px] font-bold text-album-ink">
                  {type === "SEND" ? "Note (Optional)" : "Reason for Request (Optional)"}
                </label>
                <span className="text-[13px] text-album-ink3 tabular-nums">
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
                    ? "e.g. Thanks for last night's game!"
                    : "e.g. For Sunday's Ludo night"
                }
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-album-page border border-album-line text-album-ink text-[13px] font-medium placeholder:text-album-ink3 focus:border-album-foil focus:outline-none focus:ring-2 focus:ring-album-focus transition-colors"
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
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-album-foilfill hover:brightness-105 text-album-onfoil font-semibold text-[15px] flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-album-focus focus-visible:outline-none"
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
