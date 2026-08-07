/**
 * Game-event toast (capture / home / win / forfeit / passed turn).
 *
 * Positioned BELOW the board header rather than at the viewport top — at
 * `top-6` it sat directly on top of the turn banner and the Rules/Leave/
 * fullscreen controls, hiding them for its whole 3.2s life. It also used
 * `whitespace-nowrap`, so a long player name could push it past the viewport
 * edge; it now wraps inside a capped width instead.
 */
export default function Toast({
  text,
  emoji,
  color,
}: {
  text: string;
  emoji: string;
  color?: string;
}) {
  const accent = color ?? "#E0AE3B";
  return (
    <div
      className="ludo-toast-in pointer-events-none fixed left-1/2 z-40 flex items-center gap-2 rounded-2xl px-3 py-1.5 shadow-2xl"
      style={{
        // Clears the one-row header on both shells (and any notch), and now
        // also the roster strip — so it lands in the seam between the roster
        // and the board rather than over either. `pointer-events-none` is the
        // real guarantee though: wherever it ends up on an unusual viewport,
        // it can no longer swallow a tap meant for the board underneath.
        top: "calc(env(safe-area-inset-top, 0px) + 4.75rem)",
        // Narrower than before. This is a passing status line, not a dialog;
        // at 30rem a short message like "Pintu couldn't move" stretched a
        // dark slab across most of the board's width.
        maxWidth: "min(78vw, 22rem)",
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(148,163,184,0.28)",
        boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 0 2px ${accent}`,
      }}
      role="status"
      aria-live="polite"
    >
      <span
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none"
        style={{ background: `${accent}2e`, border: `1.5px solid ${accent}` }}
        aria-hidden
      >
        {emoji}
      </span>
      <span className="text-sm font-semibold text-slate-100 leading-snug">{text}</span>
    </div>
  );
}
