import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * A centered modal overlay used by the gameplay callouts (ball result, wicket,
 * milestone, achievement, powerplay, over summary). Focus-managed: focuses the
 * panel on mount, Escape and backdrop click dismiss, and the entrance animation
 * is disabled under prefers-reduced-motion (see theme.css). Never blocks input
 * for long — callers auto-dismiss.
 */
export interface CenterOverlayProps {
  children: ReactNode;
  onDismiss: () => void;
  labelId: string;
  className?: string;
}

export function CenterOverlay({ children, onDismiss, labelId, className }: CenterOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "ck-anim-fade-up w-full max-w-[360px] rounded-3xl border border-[#D9BE82] bg-[#F7E8C4] p-6 shadow-2xl outline-none",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
