import { useState } from "react";

export interface FullscreenGatePromptProps {
  /**
   * Take over the screen until the player taps, rather than just offering.
   *
   * Reserved for the only case that earns it: a landscape-only table on a
   * phone, where a portrait window genuinely cannot show the hand. A desktop
   * player is already on a wide screen, so blocking them out of a game they
   * could play windowed would be pure obstruction.
   */
  blocking: boolean;
  /** Enters fullscreen. Must run inside this component's own click handler. */
  onEnterFullscreen: () => void;
}

/**
 * The fallback for the one case the silent attempt cannot cover: a player
 * whose browser refused fullscreen because no user gesture was in flight.
 *
 * The room's "match started" signal is a socket event, so only the host — who
 * physically clicked "Start Game" — is inside the browser's user-activation
 * window when play begins. Everyone else needs a gesture of their own. We take
 * it on "I'm Ready" where we can (see `useGameFullscreen`), and this is what
 * catches the rest: a player who joined already-ready, whose activation window
 * expired while waiting, or whose browser simply declined.
 *
 * Two weights on purpose. A landscape game is genuinely unplayable in a
 * portrait window, so it blocks. A portrait game is merely nicer fullscreen,
 * so it gets a dismissible pill and never stands between the player and their
 * turn.
 */
export default function FullscreenGatePrompt({
  blocking,
  onEnterFullscreen,
}: FullscreenGatePromptProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  if (blocking) {
    return (
      <button
        type="button"
        onClick={onEnterFullscreen}
        className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center p-6 text-center"
        style={{ background: "linear-gradient(180deg, #3a2408 0%, #1a1204 100%)" }}
        aria-label="Tap to play fullscreen in landscape"
      >
        <span className="max-w-xs space-y-4">
          <span className="block text-6xl animate-pulse" aria-hidden>
            ⛶
          </span>
          <span className="block text-lg font-extrabold uppercase tracking-wider text-amber-200">
            Tap to Play Fullscreen
          </span>
          <span className="block text-sm text-amber-100/80">
            This game plays in landscape. Tap anywhere to go fullscreen and
            rotate.
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-400/40 bg-[#1a1204]/95 py-1.5 pl-4 pr-1.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={onEnterFullscreen}
          className="cursor-pointer text-xs font-bold uppercase tracking-wider text-amber-200 hover:text-amber-100"
        >
          Play fullscreen
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss fullscreen suggestion"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-amber-300/70 hover:bg-amber-500/15 hover:text-amber-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
