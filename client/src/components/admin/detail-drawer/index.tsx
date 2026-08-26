import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Elements a Tab stop can land on, for the focus trap's boundary. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const WIDTH_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

export default function DetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = "md",
  className = "",
}: DetailDrawerProps) {
  // ADMIN-A11Y-004: the panel itself, and what to hand focus back to on
  // close. `openerRef` is captured from whatever the DOM says is focused
  // the moment the drawer opens — not passed in by the caller — so it
  // correctly covers every way a drawer gets triggered (a clicked row, a
  // keyboard-activated one, an action button) with no per-call-site wiring.
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Move focus in on open, trap Tab/Shift+Tab inside while open, restore
  // focus to whatever opened the drawer on close.
  useEffect(() => {
    if (!isOpen) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    // Scoped to the BODY, not the whole panel: the header's own close (X)
    // button is a focusable element too, and being first in document order
    // it would otherwise win this search every time — landing initial focus
    // on "dismiss" instead of on the actual content someone opened the
    // drawer to look at. The close button stays reachable via Tab (it's
    // still inside panelRef, used below for the trap), it just isn't the
    // preferred FIRST stop. No content, or content with nothing focusable
    // (a read-only detail view), falls back to the title — never to the
    // close button.
    const firstFocusable = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? titleRef.current)?.focus();

    const trapTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        // Nothing to land on but the title itself — keep focus there
        // rather than letting Tab escape to the page behind the drawer.
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!panelRef.current.contains(active)) {
        // Focus drifted outside the panel (e.g. a prior render moved it) —
        // pull it back in rather than letting Tab continue from wherever
        // it landed.
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trapTab);

    return () => {
      window.removeEventListener("keydown", trapTab);
      // This cleanup only ever runs for an effect that was set up while
      // isOpen was true (the `if (!isOpen) return;` above never registers
      // one otherwise), so reaching here always means this open session is
      // ending — by unmount or by isOpen flipping false. NOT gated on
      // whether panelRef still contains the active element: by the time a
      // useEffect cleanup runs after `if (!isOpen) return null` has
      // unmounted the panel, React has already nulled panelRef.current
      // during commit, before this cleanup fires — checking it here would
      // always read as "focus wasn't inside" and silently never restore.
      openerRef.current?.focus();
    };
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 dark:bg-black/80 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`w-screen ${WIDTH_CLASSES[width]} bg-[var(--chrome-panel)] border-l border-[var(--chrome-border)] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right ${className}`}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[var(--chrome-border)] flex items-start justify-between gap-4 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  ref={titleRef}
                  id={titleId}
                  tabIndex={-1}
                  className="text-base sm:text-lg font-black text-[var(--chrome-ink)] tracking-tight truncate rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400"
                >
                  {title}
                </h2>
                {badge && <div className="flex-shrink-0">{badge}</div>}
              </div>
              {subtitle && (
                <p className="text-xs text-[var(--chrome-ink-soft)] mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] rounded-xl transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div ref={bodyRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
            {children}
          </div>

          {/* Footer Actions */}
          {footer && (
            <div className="p-4 sm:p-6 border-t border-[var(--chrome-border)] bg-[var(--chrome-control)]/50 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
