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

import React, { useState } from "react";
import { Coins, Send, ArrowUpRight, ArrowDownLeft, Users, CheckCircle2, AlertCircle, X } from "lucide-react";
import type { MandaliMember, CoinTransferType } from "@shared/mandali/types.js";
import { useWallet } from "../../hooks/useEconomy";
import { useMandaliStore } from "../../store/mandaliStore";

interface CoinTransferModalProps {
  mandaliId: string;
  members: MandaliMember[];
  currentUserId: string | null;
  preselectedMemberId?: string;
  onClose: () => void;
}

const PRESET_AMOUNTS = [50, 100, 250, 500];

export const CoinTransferModal: React.FC<CoinTransferModalProps> = ({
  mandaliId,
  members,
  currentUserId,
  preselectedMemberId,
  onClose,
}) => {
  const { balance, refetch: refetchWallet } = useWallet();
  const { transferCoins, isSubmitting } = useMandaliStore();

  const otherMembers = members.filter(
    (m) => m.playerId !== currentUserId && m.state === "ACTIVE"
  );

  const [type, setType] = useState<CoinTransferType>("SEND");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    preselectedMemberId || (otherMembers.length > 0 ? otherMembers[0].playerId : "")
  );
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const numericBalance = balance ? parseInt(balance, 10) : 0;
  const effectiveAmount = customAmount ? parseInt(customAmount, 10) || 0 : amount;

  const isBalanceSufficient = type === "REQUEST" || effectiveAmount <= numericBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedRecipientId) {
      setErrorMessage("Please select a member.");
      return;
    }

    if (effectiveAmount <= 0) {
      setErrorMessage("Please choose a valid coin amount greater than 0.");
      return;
    }

    if (type === "SEND" && effectiveAmount > numericBalance) {
      setErrorMessage(`Insufficient coins. Your balance is ${numericBalance.toLocaleString()} coins.`);
      return;
    }

    const res = await transferCoins(mandaliId, {
      toPlayerId: selectedRecipientId,
      amount: effectiveAmount,
      type,
      note: note.trim() || undefined,
    });

    if (res.success) {
      refetchWallet();
      const targetName =
        otherMembers.find((m) => m.playerId === selectedRecipientId)?.displayName || "Member";
      setSuccessMessage(
        type === "SEND"
          ? `Successfully transferred ${effectiveAmount.toLocaleString()} coins to @${targetName}!`
          : `Requested ${effectiveAmount.toLocaleString()} coins from @${targetName}!`
      );
      setTimeout(() => {
        onClose();
      }, 1600);
    } else {
      setErrorMessage(res.error || "Transfer failed. Please try again.");
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
            className={`min-h-[44px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
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
            className={`min-h-[44px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              type === "REQUEST"
                ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Request Coins</span>
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
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {otherMembers.map((m) => (
                  <option key={m.playerId} value={m.playerId}>
                    {m.displayName} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Amount (Coins)
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setAmount(amt);
                      setCustomAmount("");
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-bold border transition-all ${
                      !customAmount && amount === amt
                        ? "bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-300 font-extrabold"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    🪙 {amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="10"
                max="50000"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Or enter custom amount..."
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              {type === "SEND" && !isBalanceSufficient && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1">
                  Exceeds your current balance of {numericBalance.toLocaleString()} coins.
                </p>
              )}
            </div>

            {/* Note (Optional) */}
            <div>
              <label htmlFor="transfer-note" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Note (Optional)
              </label>
              <input
                id="transfer-note"
                type="text"
                maxLength={80}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. GG in Ludo death match!"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !!successMessage || !isBalanceSufficient || effectiveAmount <= 0}
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Processing..."
                  : type === "SEND"
                  ? `Send ${effectiveAmount.toLocaleString()} Coins`
                  : `Request ${effectiveAmount.toLocaleString()} Coins`}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
