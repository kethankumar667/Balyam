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
 * Tries to enter fullscreen and (optionally) lock to a target orientation.
 * Must be called from a user gesture. Returns true if fullscreen succeeded —
 * orientation lock is best-effort and never blocks the return value (it
 * fails on desktop and many browsers without throwing).
 *
 * Pass `orientation` per game:
 *   - "landscape" → Rummy (the only landscape table)
 *   - "portrait"  → Ludo, Snakes & Ladders, Hand Cricket, RPS, Uno
 *   - "any" / undefined → no orientation lock, fullscreen only
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
  if (orientation === "landscape" || orientation === "portrait") {
    try {
      const orient = (screen.orientation as OrientationLock | undefined);
      if (orient?.lock) {
        await orient.lock(orientation);
      }
    } catch {
      // ignore
    }
  }

  return true;
}

export async function exitFullscreen(): Promise<void> {
  if (typeof document === "undefined") return;
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
