import { useEffect, useState } from "react";

/**
 * Tracks whether the tab/app is currently backgrounded (Page Visibility API
 * + window blur/focus as a belt-and-braces fallback for browsers that don't
 * fire visibilitychange reliably on every platform), so local gameplay
 * progression — client-driven animation sequences, in-flight drag gestures,
 * auto-pass safety nets — can pause while the player can't see the screen.
 *
 * No existing platform pattern does this: `lib/turnNotifier.ts` and
 * `services/AudioManager.ts` both listen to visibilitychange too, but only
 * for the tab-title flash and the music channel respectively — neither
 * touches gameplay state. This is the first hook aimed at gameplay
 * progression itself. Server-authoritative games never *need* the server
 * told about this (RoomManager already has its own 90s disconnect grace
 * period for the case the underlying socket actually drops) — this is
 * purely about not letting the CLIENT queue up or complete stale local
 * actions while hidden, and about giving animation sequences a clean pause
 * point instead of secretly finishing off-screen and popping to their end
 * state the instant the tab returns.
 *
 * `resumedAt` changes to a fresh `Date.now()` every time the tab regains
 * visibility (not just a boolean flip) — key an effect off it to run a
 * one-shot "we're back" action even across repeated background/foreground
 * cycles where `isBackgrounded` alone wouldn't produce a new dependency.
 */
export function useBackgroundPause(): { isBackgrounded: boolean; resumedAt: number | null } {
  const [isBackgrounded, setIsBackgrounded] = useState<boolean>(() =>
    typeof document !== "undefined" ? document.hidden : false,
  );
  const [resumedAt, setResumedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    function onVisibilityChange(): void {
      const hidden = document.hidden;
      setIsBackgrounded(hidden);
      if (!hidden) setResumedAt(Date.now());
    }
    function onBlur(): void {
      setIsBackgrounded(true);
    }
    function onFocus(): void {
      // Only treat focus as "resumed" when the document actually isn't
      // hidden — some platforms fire focus/blur independently of
      // visibilitychange (e.g. clicking a devtools panel shouldn't count
      // as backgrounding the page).
      if (!document.hidden) {
        setIsBackgrounded(false);
        setResumedAt(Date.now());
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return { isBackgrounded, resumedAt };
}
