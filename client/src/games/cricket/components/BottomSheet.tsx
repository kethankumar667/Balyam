import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * A mobile bottom sheet. Focus-managed (focuses the panel on open, restores
 * focus to the opener on close), Escape and scrim-click dismiss, semantic
 * dialog. Slide-up entrance is disabled under prefers-reduced-motion.
 */
export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      panelRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    return undefined;
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "ck-anim-fade-up w-full max-w-[480px] rounded-t-3xl border-t border-[#D9BE82] bg-[#F7E8C4] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
          className,
        )}
      >
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#C8A66B]" />
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl text-[#3A2210]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFE2C7] text-[#6D4323] active:scale-95"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
