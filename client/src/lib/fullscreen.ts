/**
 * Tiny cross-browser fullscreen + orientation-lock helper.
 *
 * Why a wrapper at all:
 *   - Fullscreen API has webkit-prefixed forms (older Safari, some Android
 *     WebViews). One call site shouldn't need to know.
 *   - The Screen Orientation lock API is even messier — different browsers
 *     accept different forms ("landscape" vs the ScreenOrientation type).
 *     We just try, swallow rejections, and move on.
 *
 * Callers MUST invoke `enterFullscreen` from a real user gesture (click /
 * touch handler). Browsers reject the promise otherwise — and silently,
 * which is why our return type is just boolean "did it work?" rather than
 * trying to propagate the rejection.
 *
 * iOS iPhone: `requestFullscreen` is not implemented on Safari iPhone
 * (iPad is fine). `isFullscreenSupported()` will return false, and callers
 * should fall back to a one-liner "scroll to hide URL bar" tip.
 */

type WebkitDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type WebkitEl = Element & {
  webkitRequestFullscreen?: () => Promise<void>;
};

type OrientationLock = ScreenOrientation & {
  lock?: (orientation: "landscape" | "portrait" | "any" | "natural") => Promise<void>;
};

export function isFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as WebkitEl;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as WebkitDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

/**
 * Phone-class device test, used to decide whether an orientation lock is
 * appropriate at all.
 *
 * Locking is only ever right on a phone. On a tablet held in landscape,
 * forcing a "portrait" game into portrait is worse than leaving it alone —
 * the player chose that grip and the boards are responsive. On desktop the
 * lock throws anyway.
 *
 * Measured on the SHORT side so the answer does not flip when the device
 * rotates: a phone is still a phone in landscape.
 */
export function isPhoneClass(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return coarsePointer && shortSide < 768;
}

/**
 * Tries to enter fullscreen and (optionally) lock to a target orientation.
 * Must be called from a user gesture. Returns true if fullscreen succeeded —
 * orientation lock is best-effort and never blocks the return value (it
 * fails on desktop and many browsers without throwing).
 *
 * Do NOT hardcode a per-game list here — `GAME_PREFERRED_ORIENTATION` in
 * `shared/catalog.ts` is the single source of truth, and the list this
 * comment used to carry had already drifted out of sync with it (it claimed
 * UNO was portrait when the catalog declares it landscape). Resolve the
 * argument with `getGamePreferredOrientation(slug)`.
 *
 * The lock is only attempted on phone-class devices (see `isPhoneClass`);
 * tablets and desktops get fullscreen with their orientation left alone.
 */
export async function enterFullscreen(
  orientation: "landscape" | "portrait" | "any" = "any",
): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as WebkitEl;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    } else {
      return false;
    }
  } catch {
    return false;
  }

  // Orientation lock — best effort. Will throw on desktop (no orientation
  // to lock), on iOS (unsupported), and sometimes on Android Firefox.
  // None of that should fail the fullscreen call.
  //
  // Phone-class only: a tablet or laptop must keep the orientation its owner
  // is holding it in. On Android Chrome this lock overrides even the OS-level
  // rotation-lock setting, which is exactly the "auto rotation" behaviour we
  // want for a landscape table — and exactly why it must not fire elsewhere.
  if ((orientation === "landscape" || orientation === "portrait") && isPhoneClass()) {
    try {
      const orient = (screen.orientation as OrientationLock | undefined);
      if (orient?.lock) {
        await orient.lock(orientation);
      }
    } catch {
      // ignore
    }
  }

  // Always reveal the top of the page once fullscreen kicks in — otherwise
  // a mid-page scroll position carries over and the player sees a slice of
  // the body instead of the game header.
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    // ignore
  }

  return true;
}

/**
 * Release any orientation lock we asserted.
 *
 * Browsers drop the lock on their own when the document leaves fullscreen, so
 * this is belt-and-braces — but the webkit paths are less reliable about it,
 * and a phone left stuck in forced landscape after leaving a room is a bug
 * the player cannot undo from inside the app.
 */
export function unlockOrientation(): void {
  if (typeof screen === "undefined") return;
  try {
    (screen.orientation as ScreenOrientation & { unlock?: () => void } | undefined)?.unlock?.();
  } catch {
    // ignore — unsupported on iOS and desktop Safari
  }
}

export async function exitFullscreen(): Promise<void> {
  if (typeof document === "undefined") return;
  unlockOrientation();
  const d = document as WebkitDoc;
  try {
    if (d.exitFullscreen) {
      await d.exitFullscreen();
    } else if (d.webkitExitFullscreen) {
      await d.webkitExitFullscreen();
    }
  } catch {
    // ignore — user may have already exited via system gesture
  }
}

/**
 * Subscribe to fullscreen changes (user-initiated exit included).
 * Returns an unsubscribe function. Listens to both standard and webkit
 * events so React state stays in sync regardless of how the user exited.
 */
export function onFullscreenChange(listener: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("fullscreenchange", listener);
  document.addEventListener("webkitfullscreenchange", listener);
  return () => {
    document.removeEventListener("fullscreenchange", listener);
    document.removeEventListener("webkitfullscreenchange", listener);
  };
}
