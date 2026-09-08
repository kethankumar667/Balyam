import { useEffect, useState } from "react";

export interface PreflightRotatePromptProps {
  /** The active preflight attempt's own deadline (ms epoch) — drives the countdown. */
  deadline: number;
}

/**
 * "Rotate your device" prompt for the ONE window it was previously missing
 * from entirely: the match-start preflight, before the round has begun.
 *
 * Every other rotate prompt in this codebase (Rummy's and UNO's own
 * `rotation-sync.tsx`) only renders once `phase === "playing"` — the
 * in-round deal-gate. A host clicking "Start Game" challenges every other
 * human seat to confirm within a short server-enforced window; a mobile
 * player sitting in the lobby holding their phone in its natural portrait
 * orientation had no way to know anything was expected of them during that
 * window at all, so it quietly expired and they saw an unexplained "Start
 * timed out" — see `usePlayerCapability`'s own doc comment for the full
 * root-cause trail. This is deliberately game-agnostic (styled with the
 * app's own amber brand color, not any one game's palette) since it is
 * driven by `usePlayerCapability`, which applies to every game with an
 * orientation requirement.
 */
export default function PreflightRotatePrompt({ deadline }: PreflightRotatePromptProps) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    setRemainingMs(Math.max(0, deadline - Date.now()));
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    }, 200);
    return () => window.clearInterval(id);
  }, [deadline]);

  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-6 text-center"
      style={{ background: "linear-gradient(180deg, #3a2408 0%, #1a1204 100%)" }}
      role="alertdialog"
      aria-modal="true"
      aria-label="Rotate your device to start the match"
    >
      <div className="space-y-4 max-w-xs">
        <div className="text-6xl animate-pulse" aria-hidden>
          📱↻
        </div>
        <div className="text-lg font-extrabold uppercase tracking-wider text-amber-200">
          Rotate your device
        </div>
        <div className="text-sm text-amber-100/80">
          The match is starting — turn your phone sideways to landscape so
          you're ready.
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1.5"
          role="timer"
          aria-live="polite"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-amber-300/80">
            Starting in
          </span>
          <span className="font-mono text-base font-black tabular-nums text-amber-100">
            {seconds}s
          </span>
        </div>
      </div>
    </div>
  );
}
