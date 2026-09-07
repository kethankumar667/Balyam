import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Copy, Check, ShieldAlert, Sparkles } from "lucide-react";
import { CoinAmount } from "./CoinAmount";
import { savePendingVoucher } from "./pendingVoucher";

export interface VoucherWonModalProps {
  coinAmount: string;
  rawCode: string;
  onClose: () => void;
}

/**
 * Shown to a GUEST the moment they win a nonzero prize.
 * If the user clicks "Claim Coins", the voucher code and amount are safely preserved
 * in pending session storage, navigating them to the signup page. Upon completing signup
 * and landing on the home page, the auto-claim modal pops up with the code pre-filled.
 */
export function VoucherWonModal({ coinAmount, rawCode, onClose }: VoucherWonModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClaimCoins = () => {
    savePendingVoucher(rawCode, coinAmount);
    onClose();
    navigate("/signup");
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-won-title"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#151A2E] border-2 border-amber-500/40 shadow-2xl p-6 space-y-4 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <PartyPopper className="w-7 h-7" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h2 id="voucher-won-title" className="text-xl font-black text-slate-900 dark:text-white">
              You won a prize!
            </h2>
            <CoinAmount amount={coinAmount} size="xl" className="font-black text-amber-600 dark:text-amber-400 justify-center" />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            As a guest, your winnings are held as a reward code. Sign up for a free BHALYAM account and claim
            your coins directly into your permanent wallet!
          </p>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Your redemption code
            </span>
            <div className="flex items-center justify-center gap-2">
              <code className="font-mono text-sm font-bold text-slate-900 dark:text-white break-all select-all">
                {rawCode}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy redemption code"
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-rose-700 dark:text-rose-400 font-semibold text-left">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Copy this code or click Claim Coins below to deposit it into your permanent member wallet.</span>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleClaimCoins}
              className="w-full py-3 rounded-full font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              Claim Coins
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-full font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              I've saved it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default VoucherWonModal;
