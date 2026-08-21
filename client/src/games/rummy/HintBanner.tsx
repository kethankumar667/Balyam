import { motion } from "framer-motion";
import { Lightbulb, X, Sparkles, AlertCircle } from "lucide-react";
import type { RummyHint } from "./hintEngine";

interface HintBannerProps {
  hint: RummyHint | null;
  onDismiss: () => void;
  onApplyHighlight?: () => void;
  isMobile?: boolean;
}

export default function HintBanner({
  hint,
  onDismiss,
  isMobile = false,
}: HintBannerProps) {
  if (!hint) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: isMobile ? 12 : -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isMobile ? 12 : -12, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`z-40 rounded-2xl border shadow-xl backdrop-blur-md transition-all ${
        isMobile
          ? "fixed bottom-24 left-3 right-3 p-3.5 bg-slate-900/95 border-amber-500/40 text-white"
          : "relative mx-auto max-w-xl mb-3 px-4 py-3 bg-slate-900/90 border-amber-500/50 text-white"
      }`}
      role="region"
      aria-label="Tactical Move Hint"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-amber-300">
                {hint.title}
              </span>
              {hint.actionType === "declare" && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Ready
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 leading-snug font-medium">
              {hint.description}
            </p>
            {hint.reason && (
              <p className="text-[11px] text-slate-400 italic">
                {hint.reason}
              </p>
            )}
            {hint.jokerTip && (
              <p className="text-[10px] text-amber-400/90 font-semibold pt-0.5">
                💡 {hint.jokerTip}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss Hint"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
