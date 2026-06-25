/**
 * Desktop-targeted "your turn" indication.
 *
 * Mobile players are nudged by the vibration motor (see `useTurnHaptics`).
 * Desktop has no motor and players routinely tab away to another window while
 * waiting for an opponent, so they need a different signal: a flashing browser
 * tab title that calls them back the moment it's their move. The original title
 * is restored as soon as the tab regains focus.
 *
 * The flash is intentionally a no-op while the tab is already focused — the
 * on-screen "your turn" UI each board renders already covers that case, and
 * flashing a title nobody can see would be wasted work.
 */

const FLASH_INTERVAL_MS = 1000;

let flashTimer: number | null = null;
let originalTitle: string | null = null;
let restoreBound = false;

function stopTitleFlash(): void {
  if (flashTimer != null) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  if (originalTitle != null) {
    document.title = originalTitle;
    originalTitle = null;
  }
}

function bindRestoreOnce(): void {
  if (restoreBound || typeof window === "undefined") return;
  restoreBound = true;
  const restore = (): void => {
    if (!document.hidden) stopTitleFlash();
  };
  document.addEventListener("visibilitychange", restore);
  window.addEventListener("focus", restore);
}

/**
 * Flash the browser tab title to grab a backgrounded desktop player's
 * attention when it becomes their turn. Safe to call repeatedly — a flash
 * already in progress is left running, and nothing happens while the tab is
 * focused or in a non-DOM (test) environment.
 */
export function notifyDesktopTurn(message = "🔔 Your turn — BHALYAM"): void {
  if (typeof document === "undefined") return;
  bindRestoreOnce();
  if (!document.hidden) return;
  if (flashTimer != null) return;

  originalTitle = document.title;
  let showingMessage = true;
  document.title = message;
  flashTimer = window.setInterval(() => {
    showingMessage = !showingMessage;
    document.title = showingMessage ? message : originalTitle ?? message;
  }, FLASH_INTERVAL_MS);
}
