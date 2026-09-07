import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, X, Check, ShieldAlert, Sparkles } from "lucide-react";
import { CoinAmount } from "./CoinAmount";
import { EconomyActionButton, type EconomyActionButtonState } from "./EconomyActionButton";
import { EconomyStatusBanner } from "./EconomyStatusBanner";
import { getVoucherStatus, redeemRewardVoucher, type VoucherStatusView, EconomyClientError } from "../../lib/economyApi";
import { useAuthStore } from "../../store/authStore";
import { savePendingVoucher, clearPendingVoucher } from "./pendingVoucher";

export interface VoucherRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: string, voucherAmount: string) => void;
  /** Pre-filled voucher code (e.g. preserved during guest signup redirect) */
  initialCode?: string;
  /** Optional prize amount known before verification round-trip */
  initialAmount?: string;
  /** When true, renders celebratory auto-claim greeting copy & gilded ticket UI */
  isAutoClaimPrompt?: boolean;
}

/**
 * Gilded Voucher Unseal & Redemption Modal.
 * Allows registered members to claim guest reward bearer vouchers.
 *
 * Special Flows:
 * 1. Guest Click: When an unauthenticated guest clicks "Claim Coins", their voucher
 *    code is securely stored in pending session storage and they are navigated to `/signup`.
 * 2. Post-Signup Auto-Claim: Upon arriving on the home page as a member, this modal
 *    pops up with the code pre-filled and verified, requiring only a single click on
 *    "Claim Coins" to deposit the prize into their permanent account wallet.
 */
export const VoucherRedemptionModal: React.FC<VoucherRedemptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCode,
  initialAmount,
  isAutoClaimPrompt = false,
}) => {
  const navigate = useNavigate();
  const isMember = useAuthStore((s) => s.isMember || s.kind === "member" || s.kind === "admin" || s.kind === "super_admin");
  const [voucherCode, setVoucherCode] = useState<string>(initialCode || "");
  const [buttonState, setButtonState] = useState<EconomyActionButtonState>("idle");
  const [verifiedVoucher, setVerifiedVoucher] = useState<VoucherStatusView | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redeemedAmount, setRedeemedAmount] = useState<string | null>(null);

  const isAutoMode = Boolean(isAutoClaimPrompt || initialCode);

  const resetState = () => {
    setVoucherCode(initialCode || "");
    setButtonState("idle");
    setVerifiedVoucher(null);
    setErrorMessage(null);
    setRedeemedAmount(null);
  };

  const handleClose = () => {
    if (isAutoMode) {
      clearPendingVoucher();
    }
    resetState();
    onClose();
  };

  // Auto-verify prefilled voucher on open
  useEffect(() => {
    if (isOpen && initialCode) {
      const cleanCode = initialCode.trim();
      setVoucherCode(cleanCode);
      setButtonState("loading");
      setErrorMessage(null);

      getVoucherStatus(cleanCode)
        .then((res) => {
          setVerifiedVoucher(res.voucher);
          setButtonState("idle");
        })
        .catch((err) => {
          setErrorMessage(
            err instanceof EconomyClientError
              ? err.message
              : "This voucher code is invalid or has already been redeemed.",
          );
          setButtonState("error");
        });
    } else if (!isOpen) {
      resetState();
    }
  }, [isOpen, initialCode]);

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      savePendingVoucher(cleanCode, verifiedVoucher?.coinAmount || initialAmount);
      handleClose();
      navigate("/signup");
      return;
    }

    setButtonState("loading");
    setErrorMessage(null);

    try {
      const res = await redeemRewardVoucher(cleanCode);
      clearPendingVoucher();
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
          aria-label={isAutoMode ? "Claim Your Reward Voucher" : "Redeem Reward Voucher"}
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
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-ink-hi dark:text-text-hi tracking-tight">
                    {isAutoMode ? "Claim Your Match Coins!" : "Redeem Reward Voucher"}
                  </h3>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    {isAutoMode ? "✨ Welcome to BHALYAM Club" : "Claim guest match winnings"}
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
                    <span className="font-bold">Member Account Required:</span> Guest players must{" "}
                    <Link
                      to="/signup"
                      onClick={() => {
                        if (voucherCode.trim()) {
                          savePendingVoucher(voucherCode.trim(), verifiedVoucher?.coinAmount || initialAmount);
                        }
                        handleClose();
                      }}
                      className="font-bold underline decoration-amber-600 dark:decoration-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition"
                    >
                      register or sign in
                    </Link>{" "}
                    to deposit unsealed voucher coins into their permanent wallet.
                  </div>
                </div>
              )}

              {redeemedAmount ? (
                /* Success State */
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3.5 bg-emerald-500/10 rounded-3xl border border-emerald-500/25">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-ink-hi dark:text-text-hi">
                      🎉 Coins Added to Wallet!
                    </h4>
                    <p className="text-xs text-ink-lo dark:text-text-lo max-w-xs">
                      Your match winnings are now safely deposited in your permanent member account.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/60 dark:bg-black/30 border border-emerald-500/20">
                    <span className="text-xs text-ink-lo dark:text-text-lo font-medium">Deposited:</span>
                    <CoinAmount amount={redeemedAmount} size="lg" className="text-emerald-700 dark:text-emerald-400 font-black" />
                  </div>
                  <EconomyActionButton
                    variant="primary"
                    size="md"
                    onClick={handleClose}
                    className="w-full mt-2"
                  >
                    Let's Play!
                  </EconomyActionButton>
                </div>
              ) : isAutoMode ? (
                /* ── Celebratory Auto-Claim Flow for Newly Signed Up Members ── */
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 leading-relaxed text-center">
                    <p className="font-medium">
                      Your victory voucher is locked and verified! Claim your prize now to add these coins directly to your new permanent account.
                    </p>
                  </div>

                  <div className="relative rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent p-5 space-y-3 text-center shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5" /> REWARD VOUCHER READY
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> VERIFIED
                      </span>
                    </div>

                    <div className="py-2">
                      <CoinAmount
                        amount={verifiedVoucher ? verifiedVoucher.coinAmount : (initialAmount || "...")}
                        size="xl"
                        className="font-black text-amber-600 dark:text-amber-400 justify-center scale-125"
                      />
                      <span className="text-[11px] text-ink-lo dark:text-text-lo block mt-2 font-medium">
                        Unclaimed match winnings
                      </span>
                    </div>

                    <div className="rounded-xl border border-amber-500/30 bg-black/5 dark:bg-black/40 p-2.5 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400 block">
                          Voucher Code
                        </span>
                        <code className="font-mono text-xs sm:text-sm font-black text-ink-hi dark:text-text-hi tracking-wider">
                          {voucherCode}
                        </code>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        Auto-filled
                      </span>
                    </div>
                  </div>

                  {errorMessage && (
                    <EconomyStatusBanner
                      status="failed"
                      title="Redemption Failed"
                      description={errorMessage}
                    />
                  )}

                  <div className="space-y-2 pt-1">
                    <EconomyActionButton
                      variant="primary"
                      size="lg"
                      state={buttonState}
                      onClick={handleRedeem}
                      disabled={buttonState === "loading"}
                      className="w-full h-12 text-sm font-black shadow-lg shadow-amber-500/30 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      Claim Coins
                    </EconomyActionButton>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2 text-xs font-semibold text-ink-lo dark:text-text-lo hover:text-ink-hi dark:hover:text-text-hi transition text-center cursor-pointer"
                    >
                      I'll claim later
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Standard Manual Code Entry Flow ── */
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
                        disabled={verifiedVoucher.status !== "ACTIVE"}
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
