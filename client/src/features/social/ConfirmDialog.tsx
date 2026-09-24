import { useCallback, useRef, useState, type ReactNode } from "react";
import Modal from "../../components/Modal";
import { errorMessage } from "../../lib/errorMessage";

interface ConfirmDialogProps {
  /** Prefix for the aria ids, so two dialogs on a page never share one. */
  idPrefix: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Shown on the confirm button while `onConfirm` is running. */
  busyLabel: string;
  /** Shown when `onConfirm` rejects without an `Error` message of its own. */
  fallbackError: string;
  /** Runs on confirm. A rejection is shown inside the dialog, which stays open. */
  onConfirm: () => Promise<void>;
  /** Called when the dialog should go away: cancelled, or confirmed successfully. */
  onClose: () => void;
  /** For dialogs that need a choice first (e.g. a report reason). */
  confirmDisabled?: boolean;
  children?: ReactNode;
}

/**
 * A confirm-or-cancel dialog for one destructive action.
 *
 * Two behaviours here were bugs once and are the reason this is shared rather
 * than copied per dialog:
 *
 *  - The confirm button is never `disabled` while it works — it is `aria-busy`
 *    and ignores clicks instead. A disabled button drops keyboard focus, and
 *    focus falling out of an open dialog is what a screen-reader user hears as
 *    "nothing happened".
 *  - `Modal`'s focus trap re-runs whenever its `onClose` changes identity. This
 *    hands it one stable function (reading the latest values through refs), so
 *    the "Removing…" re-render cannot move focus.
 *
 * A failure keeps the dialog open with the reason visible; it is never a silent
 * no-op.
 */
export default function ConfirmDialog({
  idPrefix,
  title,
  description,
  confirmLabel,
  busyLabel,
  fallbackError,
  onConfirm,
  onClose,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusyRef = useRef(isBusy);
  isBusyRef.current = isBusy;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleDismiss = useCallback(() => {
    if (isBusyRef.current) return;
    onCloseRef.current();
  }, []);

  const handleConfirm = async () => {
    if (isBusy || confirmDisabled) return;
    setIsBusy(true);
    setError(null);
    try {
      await onConfirm();
      onCloseRef.current();
    } catch (err: unknown) {
      setError(errorMessage(err, fallbackError));
    } finally {
      setIsBusy(false);
    }
  };

  const titleId = `${idPrefix}-modal-title`;
  const descriptionId = `${idPrefix}-modal-desc`;

  return (
    <Modal
      open
      onClose={handleDismiss}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descriptionId}
      panelClassName="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 max-w-sm w-full mx-auto space-y-4 shadow-xl"
    >
      <div className="space-y-2">
        <h3 id={titleId} className="text-base font-extrabold text-[var(--auth-ink)]">
          {title}
        </h3>
        <p id={descriptionId} className="text-xs text-[var(--auth-ink-soft)] leading-relaxed">
          {description}
        </p>
      </div>

      {children}

      {error && (
        <p
          role="alert"
          className="text-xs font-mono text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={handleDismiss}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)] text-xs font-mono font-bold text-[var(--auth-ink)] hover:bg-[var(--auth-field-edge)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={confirmDisabled}
          aria-busy={isBusy}
          aria-disabled={isBusy}
          onClick={handleConfirm}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-mono font-bold transition shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
