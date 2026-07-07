import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/**
 * StickyNote — a small rubber-stamp / sticky-tab badge that pops onto a card
 * corner (e.g. the green "★ SELECTED" tab, or an opponent's name). Animated in
 * with a spring so selection feels tactile.
 */
const stickyNote = cva(
  "absolute z-[2] whitespace-nowrap rounded-[2px] px-1.5 py-px text-[8px] font-extrabold uppercase tracking-[0.05em] text-white font-kalam border border-white/25",
  {
    variants: {
      tone: {
        selected: "bg-hc-stamp",
        opponent: "bg-[#1d4ed8] border-transparent",
      },
      place: {
        top: "top-[-10px] left-1/2 -translate-x-1/2",
        corner: "top-[-8px] right-[-8px]",
      },
    },
    defaultVariants: { tone: "selected", place: "top" },
  },
);

export interface StickyNoteProps extends VariantProps<typeof stickyNote> {
  children: ReactNode;
  className?: string;
  show?: boolean;
}

export function StickyNote({ children, className, tone, place, show = true }: StickyNoteProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, rotate: 12, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className={cn(stickyNote({ tone, place }), className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default StickyNote;
