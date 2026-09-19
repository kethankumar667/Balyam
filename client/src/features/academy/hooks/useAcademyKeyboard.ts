import { useEffect, type RefObject } from "react";

export interface UseAcademyKeyboardOptions {
  enabled?: boolean;
  /** The academy's own content; arrow keys are only honoured from inside it. */
  containerRef: RefObject<HTMLElement>;
  onNext: () => void;
  onPrev: () => void;
}

const EDITABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
].join(",");

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
}

function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
}

/**
 * Left/Right arrows step through the walkthrough. Nothing else is bound:
 *  - Escape and Tab belong to the shared Modal / `useFocusTrap` (a second
 *    Escape handler would fire `onClose` twice; preventing Tab breaks focus).
 *  - Bare letters (A/D) are not bound: the game underneath uses them
 *    (UNO draws with `d`) and single-key shortcuts violate WCAG 2.1.4.
 *
 * Scope rule: act only when the keydown target is inside the academy dialog or
 * is `document.body` (nothing focused), never while focus sits in some other
 * control, an editable field, or when a modifier key is held (Ctrl+D bookmark,
 * Alt+Arrow browser history).
 */
export function useAcademyKeyboard({
  enabled = true,
  containerRef,
  onNext,
  onPrev,
}: UseAcademyKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || hasModifier(e)) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (isEditableTarget(e.target)) return;

      const target = e.target;
      const isInScope =
        target === document.body ||
        (target instanceof Node && containerRef.current?.contains(target) === true);
      if (!isInScope) return;

      e.preventDefault();
      if (e.key === "ArrowRight") onNext();
      else onPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, containerRef, onNext, onPrev]);
}
