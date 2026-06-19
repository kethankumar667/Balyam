import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@shared/types";

/**
 * Bottom-right floating toast that surfaces incoming chat messages from other
 * players. Mounts at the Room level so every game (Rummy, Ludo, SnL, Hand
 * Cricket, RPS, Uno) gets the same notification regardless of whether its
 * inline chat panel is visible — during fullscreen gameplay the side rail is
 * hidden, so without this users would miss messages entirely.
 *
 * Design choices:
 *   - Self messages are skipped (the sender doesn't need to be notified).
 *   - Only the latest message is shown at a time; rapid-fire chat replaces
 *     the existing toast rather than stacking, which keeps the in-game UI
 *     uncluttered.
 *   - Auto-dismisses after 4 seconds. Tapping/clicking dismisses immediately.
 *   - Body text is clamped to a couple of lines and the toast is small
 *     enough to never block game controls.
 */
export default function ChatMessageToast({
  messages,
  selfId,
}: {
  messages: ChatMessage[];
  selfId: string | null;
}) {
  const lastSeenIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const [visible, setVisible] = useState<ChatMessage | null>(null);

  useEffect(() => {
    // On first render, mark whatever is already in the store as "seen" so we
    // don't toast historical messages when the user navigates into the room.
    if (!initializedRef.current) {
      initializedRef.current = true;
      const last = messages[messages.length - 1];
      lastSeenIdRef.current = last?.id ?? null;
      return;
    }
    const latest = messages[messages.length - 1];
    if (!latest) return;
    if (latest.id === lastSeenIdRef.current) return;
    lastSeenIdRef.current = latest.id;
    if (latest.playerId === selfId) return; // skip own messages
    setVisible(latest);
  }, [messages, selfId]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(null), 4000);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        right: "1rem",
        maxWidth: "min(92vw, 22rem)",
      }}
    >
      <button
        type="button"
        onClick={() => setVisible(null)}
        className="pointer-events-auto w-full text-left rounded-xl shadow-2xl px-3.5 py-2.5 flex items-start gap-2.5 animate-[fadeIn_200ms_ease-out]"
        style={{
          background: "linear-gradient(180deg, #1f2937 0%, #0f172a 100%)",
          border: "1px solid rgba(234,90,31,0.55)",
          boxShadow:
            "0 18px 30px -10px rgba(0,0,0,0.55), 0 0 0 1px rgba(234,90,31,0.18) inset",
        }}
        aria-label={`New message from ${visible.playerName}`}
      >
        <span
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
          style={{ background: "#EA5A1F", color: "#fff" }}
        >
          {visible.playerName.slice(0, 1).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase tracking-wider font-extrabold text-amber-300/90">
            {visible.playerName}
          </span>
          <span className="block text-sm text-amber-50 leading-snug line-clamp-2 break-words">
            {visible.text}
          </span>
        </span>
        <span
          className="flex-shrink-0 text-amber-200/70 text-xs font-bold"
          aria-hidden
        >
          ✕
        </span>
      </button>
    </div>
  );
}
