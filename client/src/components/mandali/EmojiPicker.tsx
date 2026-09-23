/**
 * BHALYAM Mandali — Emoji Picker
 *
 * A small, dependency-free picker for the chat composer. The composer had a
 * smiley button that did nothing; this is what it opens. Curated on purpose
 * (a few dozen the group actually uses) rather than the full Unicode set.
 *
 * Positioning is the caller's job — wrap it in a `relative` container and it
 * opens upward from the bottom-right, above the composer.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Closes on Escape and on an outside tap/click.
 */

import { useEffect, useRef } from "react";

const EMOJI_GROUPS: ReadonlyArray<{ label: string; emojis: readonly string[] }> = [
  { label: "Smileys", emojis: ["😀", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩", "🥳", "😏", "😜", "🤔", "😴", "😭", "😡", "😱"] },
  { label: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "🤞", "👌", "👋", "🫡"] },
  { label: "Play", emojis: ["🎮", "🎲", "🏏", "🃏", "🎯", "🏆", "🥇", "👑", "🔥", "⚡", "💥", "🎉", "🎊", "🪙", "💰", "🚀"] },
  { label: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "✨", "⭐"] },
];

/** Inserts `emoji` at the input's caret (replacing any selection), respecting `maxLength`. Returns null if it would not fit. */
export function insertAtCaret(
  input: HTMLInputElement | null,
  value: string,
  emoji: string,
  maxLength: number
): { next: string; caret: number } | null {
  const start = input?.selectionStart ?? value.length;
  const end = input?.selectionEnd ?? start;
  const next = value.slice(0, start) + emoji + value.slice(end);
  if (next.length > maxLength) return null;
  return { next, caret: start + emoji.length };
}

export interface EmojiPickerProps {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** Span the whole width of the (relative) parent instead of a fixed-width popover — for phones. */
  fullWidth?: boolean;
}

export default function EmojiPicker({ open, onSelect, onClose, fullWidth = false }: EmojiPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target || panelRef.current?.contains(target)) return;
      // The trigger button toggles the picker itself; don't fight it by closing here too.
      if ((target as HTMLElement).closest?.("[data-emoji-trigger]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji picker"
      className={`absolute bottom-full mb-2 z-30 max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-2 ${
        fullWidth ? "left-2.5 right-2.5" : "right-0 w-[min(20rem,calc(100vw-1.5rem))]"
      }`}
    >
      {EMOJI_GROUPS.map((group) => (
        <section key={group.label} aria-label={group.label} className="mb-1.5 last:mb-0">
          <h3 className="px-1.5 pt-1 pb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {group.label}
          </h3>
          <div className="grid grid-cols-6 sm:grid-cols-7">
            {group.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelect(emoji)}
                aria-label={`Insert ${emoji}`}
                className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-0 flex items-center justify-center text-xl rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-110 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
