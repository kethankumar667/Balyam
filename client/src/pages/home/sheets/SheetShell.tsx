import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { bhalyamSpring } from "../../../lib/motion";

/**
 * `SheetShell` factors out the common chrome (scrim, slide-in spring, ESC
 * close, body-scroll lock, header bar with logo+close, scrollable body).
 * `ProfileSheet` and `MenuSheet` each compose it with their own content —
 * different dialogs, same animation language.
 */
export function SheetShell({
  open,
  onClose,
  ariaLabel,
  children,
  titleLeft,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  titleLeft: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            /* `auth-shell` brings the token set that flips panel AND ink
               together. Without it the dark tuning forced this panel light
               while the inherited ink stayed light too — cream on cream,
               measured at 1.04:1. */
            className="auth-shell fixed top-0 right-0 bottom-0 z-[71] w-[86vw] max-w-[380px] sm:max-w-[420px]
                       bg-[var(--auth-card)] border-l border-[var(--auth-card-edge)]
                       text-[var(--auth-ink)] shadow-[-12px_0_36px_-12px_rgba(0,0,0,0.55)]
                       flex flex-col"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 18px)" }}
          >
            <div className="flex items-center justify-between px-5 pb-4 border-b border-[var(--auth-card-edge)]">
              <div className="flex items-center gap-2 min-w-0">{titleLeft}</div>
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.92 }}
                aria-label="Close"
                className="w-10 h-10 rounded-full inline-flex items-center justify-center
                           bg-[var(--auth-field)] border border-[var(--auth-card-edge)]
                           text-[var(--auth-ink)] flex-shrink-0 cursor-pointer
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {children}
            </div>
            <div className="px-5 py-4 border-t border-[#E8D8BE] text-[11px] text-[#7B5024] flex items-center justify-between">
              <span className="font-semibold">© {new Date().getFullYear()} BHALYAM</span>
              <span className="font-semibold">v1.0</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function SheetAction({
  icon,
  label,
  hint,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ x: 2 }}
      transition={bhalyamSpring}
      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-left
                  focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                  ${primary
                    ? "bhalyam-gold-leaf text-bhalyam-wood-dark border border-bhalyam-gold-dark shadow-[0_6px_14px_-4px_rgba(228,177,40,0.55)]"
                    : "bg-white border border-[#E8D8BE] text-[#2A221B] hover:bg-[#FFF8EE]"}`}
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${primary ? "bg-[#FFF6DC] text-bhalyam-wood-dark" : "bg-[#FFF8EE] text-[#2A221B] border border-[#E8D8BE]"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-[15px] leading-tight">{label}</span>
        {hint && (
          <span
            className={`block text-[11px] mt-0.5 font-semibold ${
              primary ? "text-[#7B5024]" : "text-[#7B5024]"
            }`}
          >
            {hint}
          </span>
        )}
      </span>
      <ArrowRight className="w-4 h-4 text-current opacity-60 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}
