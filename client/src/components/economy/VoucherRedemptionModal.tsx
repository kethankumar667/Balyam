import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, X, Check, AlertCircle, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { CoinAmount } from "./CoinAmount";
import { EconomyActionButton, type EconomyActionButtonState } from "./EconomyActionButton";
import { EconomyStatusBanner } from "./EconomyStatusBanner";
import { getVoucherStatus, redeemRewardVoucher, type VoucherStatusView, EconomyClientError } from "../../lib/economyApi";
import { useAuthStore } from "../../store/authStore";

export interface VoucherRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: string, voucherAmount: string) => void;
}

/**
 * Gilded Voucher Unseal & Redemption Modal.
 * Allows registered members to claim guest reward bearer vouchers.
 *
 * Security Invariants:
 * - NEVER logs or persists raw voucher codes in storage, telemetry, or URLs.
 * - Enforces bearer-voucher oracle protection (merged generic safe error messages).
 * - Verified server-authoritative wallet balance updates.
 */
export const VoucherRedemptionModal: React.FC<VoucherRedemptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isMember = useAuthStore((s) => s.isMember);
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [buttonState, setButtonState] = useState<EconomyActionButtonState>("idle");
  const [verifiedVoucher, setVerifiedVoucher] = useState<VoucherStatusView | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redeemedAmount, setRedeemedAmount] = useState<string | null>(null);

  const resetState = () => {
    setVoucherCode("");
    setButtonState("idle");
    setVerifiedVoucher(null);
    setErrorMessage(null);
    setRedeemedAmount(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = voucherCode.trim();
    if (!cleanCode) return;

    setButtonState("loading");
    setErrorMessage(null);
    setVerifiedVoucher(null);

    try {
      const res = await getVoucherStatus(cleanCode);
      setVerifiedVoucher(res.voucher);
      setButtonState("idle");
    } catch (err) {
      setErrorMessage(
        err instanceof EconomyClientError
          ? err.message
          : "This voucher code is invalid or has already been redeemed.",
      );
      setButtonState("error");
    }
  };

  const handleRedeem = async () => {
    const cleanCode = voucherCode.trim();
    if (!cleanCode) return;

    if (!isMember) {
      setErrorMessage("Only registered member accounts can redeem reward vouchers.");
      setButtonState("error");
      return;
    }

    setButtonState("loading");
    setErrorMessage(null);

    try {
      const res = await redeemRewardVoucher(cleanCode);
      setRedeemedAmount(res.voucher.coinAmount);
      setButtonState("success");
      onSuccess?.(res.newBalance, res.voucher.coinAmount);
    } catch (err) {
      setErrorMessage(
        err instanceof EconomyClientError
          ? err.message
          : "Unable to redeem voucher. It may have already been used.",
      );
      setButtonState("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
          role="dialog"
          aria-modal="true"
          aria-label="Redeem Reward Voucher"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white dark:bg-[#131824] border border-amber-600/30 dark:border-amber-400/20 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Ticket className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-hi dark:text-text-hi">
                    Redeem Reward Voucher
                  </h3>
                  <span className="text-[11px] text-ink-lo dark:text-text-lo">
                    Claim guest match winnings
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close modal"
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-lo hover:text-ink-hi dark:text-text-lo dark:hover:text-text-hi hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4">
              {!isMember && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Member Account Required:</span> Guest players must register or sign in to deposit unsealed voucher coins into their permanent wallet.
                  </div>
                </div>
              )}

              {redeemedAmount ? (
                /* Success State */
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/25">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
                    <Sparkles className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h4 className="text-lg font-extrabold text-ink-hi dark:text-text-hi">
                    Voucher Redeemed!
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-lo dark:text-text-lo">Credited:</span>
                    <CoinAmount amount={redeemedAmount} size="lg" className="text-emerald-700 dark:text-emerald-400 font-black" />
                  </div>
                  <p className="text-xs text-ink-lo dark:text-text-lo max-w-xs">
                    Coins have been credited directly to your authoritative wallet ledger.
                  </p>
                  <EconomyActionButton
                    variant="primary"
                    size="md"
                    onClick={handleClose}
                    className="w-full mt-2"
                  >
                    Done
                  </EconomyActionButton>
                </div>
              ) : (
                /* Input & Confirmation Flow */
                <form onSubmit={handleInspect} className="space-y-4">
                  <div>
                    <label
                      htmlFor="voucher-code-input"
                      className="block text-xs font-bold uppercase tracking-wider text-ink-mid dark:text-text-mid mb-1.5"
                    >
                      Bearer Voucher Code
                    </label>
                    <input
                      id="voucher-code-input"
                      type="text"
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Enter voucher code (e.g. VOUCH-XXXX)"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck="false"
                      className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-black/5 dark:bg-black/20 text-ink-hi dark:text-text-hi font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {errorMessage && (
                    <EconomyStatusBanner
                      status="failed"
                      title="Redemption Failed"
                      description={errorMessage}
                    />
                  )}

                  {verifiedVoucher && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800 dark:text-amber-400">
                          Verified Voucher
                        </span>
                        <div className="text-xs text-ink-lo dark:text-text-lo">
                          Status: <span className="font-semibold text-ink-hi dark:text-text-hi">{verifiedVoucher.status}</span>
                        </div>
                      </div>
                      <CoinAmount amount={verifiedVoucher.coinAmount} size="md" className="font-bold" />
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <EconomyActionButton
                      variant="secondary"
                      size="md"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </EconomyActionButton>

                    {verifiedVoucher ? (
                      <EconomyActionButton
                        variant="primary"
                        size="md"
                        state={buttonState}
                        onClick={handleRedeem}
                        disabled={!isMember || verifiedVoucher.status !== "ACTIVE"}
                        className="flex-1"
                      >
                        Claim Coins
                      </EconomyActionButton>
                    ) : (
                      <EconomyActionButton
                        variant="primary"
                        size="md"
                        type="submit"
                        state={buttonState}
                        onClick={handleInspect}
                        disabled={!voucherCode.trim()}
                        className="flex-1"
                      >
                        Verify Code
                      </EconomyActionButton>
                    )}
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VoucherRedemptionModal;
