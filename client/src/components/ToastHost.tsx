import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, Sparkles, X } from "lucide-react";
import { toastStore, type ToastRecord } from "../lib/toastStore";

const ICONS: Record<ToastRecord["type"], React.ReactNode> = {
  success: <CheckCircle2 className="w-full h-full" />,
  error: <XCircle className="w-full h-full" />,
  warning: <AlertTriangle className="w-full h-full" />,
  info: <Info className="w-full h-full" />,
  default: <Sparkles className="w-full h-full" />,
};

const ACCENT_BAR: Record<ToastRecord["type"], string> = {
  success: "linear-gradient(180deg, #34D399 0%, #059669 100%)",
  error: "linear-gradient(180deg, #F87171 0%, #DC2626 100%)",
  warning: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
  info: "linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)",
  default: "linear-gradient(180deg, #F4C430 0%, #E4B128 45%, #B38918 100%)",
};

const ICON_COLOR: Record<ToastRecord["type"], string> = {
  success: "text-emerald-500",
  error: "text-rose-500",
  warning: "text-amber-500",
  info: "text-sky-500",
  default: "text-[#D49E24]",
};

/**
 * BHALYAM's own toast stack — no third-party toast library. A tiny
 * `useSyncExternalStore` subscription to `toastStore` plus framer-motion
 * (already used everywhere else for BHALYAM's motion language) renders a
 * card on the app's own `--chrome-panel` surface with a type-tinted accent
 * rail, so it reads as app chrome instead of a bolted-on widget.
 */
export default function ToastHost() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);

  return (
    <div
      className="fixed z-[999999] left-1/2 -translate-x-1/2 flex flex-col items-stretch gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-[380px]"
      style={{ top: "max(1rem, env(safe-area-inset-top, 1rem))" }}
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border pl-4 pr-2.5 py-3 flex items-start gap-2.5
                       bg-[var(--chrome-panel)] border-[var(--chrome-border)] text-[var(--chrome-ink)]
                       shadow-[0_16px_36px_-10px_rgba(0,0,0,0.4),0_0_0_1px_rgba(228,177,40,0.08)]"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: ACCENT_BAR[t.type] }}
            />
            <span className={`w-[18px] h-[18px] mt-0.5 flex-shrink-0 ${ICON_COLOR[t.type]}`}>
              {ICONS[t.type]}
            </span>
            <span className="flex-1 min-w-0 font-body font-bold text-[13px] leading-snug pt-0.5">
              {t.message}
            </span>
            <button
              type="button"
              onClick={() => toastStore.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="flex-shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer
                         bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink-soft)]
                         hover:bg-[var(--chrome-control-hi)] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
