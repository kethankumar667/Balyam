import { useEffect, type ReactNode, type RefObject } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

/**
 * The shared dialog shell BHALYAM did not have.
 *
 * ── What existed before this ───────────────────────────────────────────
 * 87 `fixed inset-0` overlays across 67 files, 40 with `role="dialog"`, only
 * 4 with a real focus trap (independently reimplemented, near-identically,
 * each time), 0 with focus restoration, and 15 distinct backdrop opacities /
 * 5 blur steps with no shared rule for which to use. This is that shared
 * rule, built on `useFocusTrap` — the extraction of the one pattern that was
 * already correct in those 4 places, plus the one piece none of them had.
 *
 * ── What it deliberately does not do ───────────────────────────────────
 * It is not a migration of all 87 overlays — see `MODAL-SYSTEM-AUDIT.md` for
 * which ones move onto this in this pass and which remain tracked debt. A
 * `<PassPhoneGate>`-style full-screen intermission or a bottom sheet with
 * its own drag gesture are deliberately NOT this component; `<Modal>` is for
 * a centred dialog with a backdrop, which is what the majority of the 87 are.
 */
export interface ModalProps {
  open: boolean;
  /** Escape and the backdrop both call this. Omit for a non-dismissible dialog. */
  onClose?: () => void;
  children: ReactNode;
  /** Focus this on open instead of the first focusable element — e.g. the
   *  safe/non-destructive action, so a keyboard user's first keystroke can't
   *  land on something destructive by accident. */
  initialFocusRef?: RefObject<HTMLElement>;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** Plain string label when the dialog has no visible heading to point
   *  `aria-labelledby` at. Prefer `ariaLabelledBy` when a heading exists. */
  ariaLabel?: string;
  /** Closing the backdrop click is the default; a first-run or consent
   *  dialog that must be answered, not dismissed, sets this false. */
  closeOnBackdropClick?: boolean;
  /** Bottom sheet on mobile, centred dialog from `md:` up — the pattern
   *  `AGENTS.md` §6.1 requires for mobile ("bottom sheets and fullscreen
   *  dialogs, not floating windows"). Off by default: most of this app's
   *  dialogs are small enough to just centre at every width. */
  mobileSheet?: boolean;
  /** Stacking above the standard 50 — for a dialog that must win over any
   *  other dialog it could conceivably coexist with (e.g. a first-run gate
   *  that can fire while a deep link has already opened something else). */
  zIndex?: number;
  className?: string;
  panelClassName?: string;
  panelStyle?: React.CSSProperties;
}

/**
 * The one backdrop treatment, replacing 15 distinct opacities and 5 blur
 * steps: `bg-black/80` and `backdrop-blur-md` were already the single
 * most-used value of each (24 and 44 occurrences respectively) — the
 * de facto standard the rest were drifting around, made the actual one.
 */
const BACKDROP = "bg-black/80 backdrop-blur-md";

export default function Modal({
  open,
  onClose,
  children,
  initialFocusRef,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaLabel,
  closeOnBackdropClick = true,
  mobileSheet = false,
  zIndex,
  className = "",
  panelClassName = "",
  panelStyle,
}: ModalProps) {
  const { containerRef } = useFocusTrap<HTMLDivElement>({ open, onClose, initialFocusRef });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const align = mobileSheet ? "items-end md:items-center" : "items-center";

  return (
    <div
      className={`fixed inset-0 z-50 flex ${align} justify-center p-4 ${BACKDROP} ${className}`}
      style={zIndex !== undefined ? { zIndex } : undefined}
      onMouseDown={(e) => {
        if (closeOnBackdropClick && onClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        className={panelClassName}
        style={panelStyle}
      >
        {children}
      </div>
    </div>
  );
}
