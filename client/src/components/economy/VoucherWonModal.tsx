import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Copy, Check, ShieldAlert } from "lucide-react";
import { CoinAmount } from "./CoinAmount";

export interface VoucherWonModalProps {
  coinAmount: string;
  rawCode: string;
  onClose: () => void;
}

/**
 * Shown to a GUEST the moment they win a nonzero prize — the one and only
 * time their voucher's raw redemption code ever reaches a client (see
 * `shared/types.ts`'s `economy:voucherIssued` doc comment: the database
 * only ever stores a hash of this code, by design, so a guest who loses it
 * here has no other way to recover it).
 *
 * Deliberately does NOT persist `rawCode` anywhere (no localStorage, no
 * telemetry) — `VoucherRedemptionModal.tsx`'s own header states that
 * invariant for this exact class of data, and this modal holds to it too:
 * the code lives only in this component's own state until the player signs
 * up and redeems it, or navigates away and it is gone.
 */
export function VoucherWonModal({ coinAmount, rawCode, onClose }: VoucherWonModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
            As a guest, your winnings are held as a reward code. Sign up for a free BHALYAM account and redeem
            this code to add the coins to your wallet.
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
            <span>Copy this code now — it will not be shown again, and there is no other way to recover it.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              I've saved it
            </button>
            <Link
              to="/signup"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full font-bold text-xs text-white bg-[#EA580C] hover:bg-[#C2410C] transition text-center"
            >
              Sign Up Now
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default VoucherWonModal;
