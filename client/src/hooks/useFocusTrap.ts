import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Focus trap + Escape + focus restoration, extracted from the one pattern
 * that already existed correctly in four places in this codebase
 * (`LeaveRoomModal` is the cleanest copy) — Tab/Shift+Tab cycling inside the
 * container, Escape closing it, and an initial focus target. Those four
 * carried it independently, byte-for-byte close to identical; this is that
 * logic, once, plus the one piece none of the four had: **focus restoration**.
 *
 * ── Why restoration is not optional ────────────────────────────────────
 * Without it, a keyboard user who opened a dialog from a button loses their
 * place in the page the moment it closes — focus falls back to `<body>`,
 * and they have to re-find where they were by tabbing from the top. Every
 * dialog in this codebase before this hook had that gap. Measured:
 * `npm run design:components` — 4 files with a trap, 0 with restoration.
 *
 * ── Usage ─────────────────────────────────────────────────────────────
 *   const { containerRef } = useFocusTrap({ open, onClose });
 *   return open && (
 *     <div ref={containerRef} role="dialog" aria-modal="true">…</div>
 *   );
 *
 * Pass `initialFocusRef` when the safe/non-destructive control should get
 * focus rather than the first focusable element in DOM order (the reference
 * implementation focuses "Stay Here", not whichever button happens to be
 * first — deliberately, so a keyboard user's very first keystroke can't be
 * the destructive action by accident).
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
  initialFocusRef,
}: {
  open: boolean;
  /** Escape calls this. Omit for a dialog that must not be Escape-dismissible. */
  onClose?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
}): { containerRef: React.RefObject<T> } {
  const containerRef = useRef<T>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    (initialFocusRef?.current ?? containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR))
      ?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!onClose) return;
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !containerRef.current) return;

      const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore to the trigger, but only if it's still a real, attached
      // element — a re-render can have unmounted it between open and close.
      const toRestore = previouslyFocusedRef.current;
      if (toRestore && document.contains(toRestore)) toRestore.focus();
    };
  }, [open, onClose, initialFocusRef]);

  return { containerRef };
}
