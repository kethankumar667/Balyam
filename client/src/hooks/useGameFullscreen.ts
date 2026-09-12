import { useCallback, useEffect, useRef, useState } from "react";
import type { BhalyamGameSlug } from "@shared/catalog";
import { getGamePreferredOrientation } from "@shared/catalog";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
  onFullscreenChange,
} from "../lib/fullscreen";

export interface GameFullscreenModel {
  /** Live fullscreen state, kept in sync with user-initiated exits too. */
  isFullscreen: boolean;
  /** False on iPhone Safari, where the Fullscreen API does not exist at all. */
  isSupported: boolean;
  /**
   * True when the platform CAN go fullscreen, the game wants it, and we are
   * not there — i.e. the browser refused our silent attempt and only a fresh
   * user gesture can get us in. Drives the tap-to-enter prompt.
   */
  needsGesture: boolean;
  /** Call from inside a click/touch handler. Safe to call when already fullscreen. */
  requestFullscreen: () => void;
}

/**
 * Fullscreen + orientation policy for a game, in one place.
 *
 * WHY A HOOK: the Fullscreen API only grants a request made inside a user
 * gesture, and the room's own "the match started" signal is a SOCKET EVENT,
 * not a gesture. That is why the previous implementation only ever worked for
 * the host (who clicked "Start Game") and silently failed for every other
 * player at the table. Getting this right means attaching the attempt to
 * whatever gesture each surface actually has — "I'm Ready" in the room lobby,
 * the Start button on a retro page — and then having a fallback for when even
 * that is refused. Both halves live here so the room and the five retro pages
 * cannot drift apart.
 *
 * The orientation itself comes from `GAME_PREFERRED_ORIENTATION` in
 * `shared/catalog.ts`; nothing here decides per-game behaviour.
 */
export function useGameFullscreen({
  slug,
  wantsFullscreen,
  enterOnFirstGesture = false,
}: {
  /** Undefined while the room state is still loading. */
  slug: BhalyamGameSlug | undefined;
  /** True once the surface actually wants the screen — i.e. play has begun. */
  wantsFullscreen: boolean;
  /**
   * Take the player's first tap on this surface as the gesture.
   *
   * For the retro arcade pages, which have no Start button to hang this on:
   * their engines boot straight into a keypad-driven menu on mount, so the
   * first tap IS the player starting to play. Fires at most once per mount,
   * so a player who deliberately leaves fullscreen is not dragged back in on
   * their next tap.
   */
  enterOnFirstGesture?: boolean;
}): GameFullscreenModel {
  const isSupported = isFullscreenSupported();
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive());

  useEffect(() => onFullscreenChange(() => setIsFullscreen(isFullscreenActive())), []);

  const requestFullscreen = useCallback(() => {
    if (!slug || !isSupported || isFullscreenActive()) return;
    // Not awaited: awaiting inside a click handler is what pushes the call
    // out of the browser's user-activation window on slower devices.
    void enterFullscreen(getGamePreferredOrientation(slug));
  }, [slug, isSupported]);

  const attemptedFirstGestureRef = useRef(false);
  useEffect(() => {
    if (!enterOnFirstGesture || !slug || !isSupported) return;
    if (attemptedFirstGestureRef.current) return;

    const onFirstPointerDown = () => {
      attemptedFirstGestureRef.current = true;
      requestFullscreen();
    };
    // `once` retires the listener after the first tap whether or not the
    // browser actually granted the request — retrying on every subsequent tap
    // would fight a player who chose to leave fullscreen.
    window.addEventListener("pointerdown", onFirstPointerDown, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstPointerDown);
  }, [enterOnFirstGesture, slug, isSupported, requestFullscreen]);

  /**
   * Release the screen when the player navigates away from the game entirely.
   *
   * Unmount only — deliberately NOT when `wantsFullscreen` goes false, because
   * that flips on every finished → rematch cycle, and dropping the player out
   * of fullscreen between rounds is worse than leaving them in it.
   */
  const hasEnteredRef = useRef(false);
  useEffect(() => {
    if (isFullscreen) hasEnteredRef.current = true;
  }, [isFullscreen]);
  useEffect(() => {
    return () => {
      if (hasEnteredRef.current && isFullscreenActive()) void exitFullscreen();
    };
  }, []);

  return {
    isFullscreen,
    isSupported,
    needsGesture: isSupported && wantsFullscreen && !isFullscreen,
    requestFullscreen,
  };
}
