import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { QUICK_REACTIONS } from "@shared/reactions";
import { getSocket } from "../../lib/socket";
import { HapticsManager } from "../../services/HapticsManager";

/** Mirrors the server's audience budget (`AUDIENCE_REACTIONS_PER_WINDOW`), so a tap never lands on a dead button. */
const BURST = 3;
const WINDOW_MS = 4_000;

const LABELS: Record<string, string> = {
  "👍": "Thumbs up",
  "😂": "Laugh",
  "🔥": "Fire",
  "🎉": "Celebrate",
  "😮": "Wow",
  "💯": "Hundred",
  "👏": "Clap",
  "🤝": "Handshake",
};

export interface AudienceBarProps {
  onLeave: () => void;
}

/**
 * What someone watching a match from outside the table can do besides look: cheer, and only cheer.
 *
 * The row is the general cheering set (never a throwable or a nudge, which land on a player), never
 * aimed at anyone, and rate-limited the way the server limits it, so the buttons rest for a moment
 * after a burst instead of silently doing nothing. Leaving is always one tap away.
 */
export function AudienceBar({ onLeave }: AudienceBarProps) {
  const sent = useRef<number[]>([]);
  const [resting, setResting] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const cheer = useCallback((emoji: string) => {
    const now = Date.now();
    sent.current = sent.current.filter((t) => now - t < WINDOW_MS);
    if (sent.current.length >= BURST) return;
    sent.current.push(now);
    getSocket().emit("room:reaction", { emoji });
    HapticsManager.trigger("subtle");
    if (sent.current.length >= BURST) {
      setResting(true);
      timer.current = window.setTimeout(() => setResting(false), WINDOW_MS - (now - sent.current[0]));
    }
  }, []);

  return (
    <section
      aria-label="Audience"
      className="relative z-20 w-full max-w-2xl flex-shrink-0 rounded-2xl border border-amber-900/50 bg-black/70 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="m-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          You're watching
        </p>
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-amber-100 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Leave
        </button>
      </div>
      <div role="toolbar" aria-label="Cheer for the players" className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => cheer(emoji)}
            disabled={resting}
            aria-label={LABELS[emoji] ?? emoji}
            className="min-h-[44px] cursor-pointer rounded-xl bg-white/10 text-2xl transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
