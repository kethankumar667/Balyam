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
 *
 * Since the PWA work, the same trigger ALSO posts a system notification
 * (see `notifySystemTurn`): a title flash only reaches a backgrounded TAB,
 * and a tab is useless to a player who closed it or switched apps on the
 * phone. Notifications reach both, and focus/click dismisses everything.
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

/**
 * ─── System notifications ("It's your turn") ─────────────────────────────
 *
 * Posted when it becomes the local player's turn while the tab is hidden OR
 * the app is running as an installed PWA. Complements the title flash: the
 * flash only works for a still-open tab, the notification reaches a player
 * who has moved on entirely — the exact player a turn-based lounge loses
 * most.
 *
 * Rules that keep this from being spam:
 *   - Permission must already be "granted". This module NEVER asks —
 *     permission prompts are asked once, in context, from the UI (see
 *     useTurnNotifications), not as a side-effect of game state arriving.
 *   - Only one notification per turn: re-fires are suppressed until the
 *     turn changes away and back.
 *   - Auto-close in 8s so a missed turn does not stack stale notifications.
 *   - Clicking it focuses the room window and clears the title flash too.
 */

let lastNotifiedTurnKey: string | null = null;

export function notifySystemTurn(opts: {
  /** Unique per turn — room code + active player + a state nonce. */
  turnKey: string;
  title?: string;
  body?: string;
  roomCode?: string;
}): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // The player is looking right at the board; the on-screen "your turn" UI
  // is the correct channel and a notification would be noise.
  if (!document.hidden) return;
  // One notification per turn, ever. Turn keys include the room code, so
  // two rooms in two tabs each get their own single ping.
  if (opts.turnKey === lastNotifiedTurnKey) return;
  lastNotifiedTurnKey = opts.turnKey;

  try {
    const n = new Notification(opts.title ?? "Your turn — BHALYAM", {
      body: opts.body ?? "Your friends are waiting for your move.",
      icon: "/icons/logo-192.png",
      badge: "/icons/logo-192.png",
      tag: `bhalyam-turn-${opts.roomCode ?? "room"}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
      stopTitleFlash();
    };
    setTimeout(() => n.close(), 8000);
  } catch {
    // Some platforms throw on `new Notification` (Android Chrome requires a
    // service-worker registration, which the PWA shell provides, but this
    // must never break game state processing when it happens).
  }
}

/** Clear the one-per-turn guard (used when leaving a room). */
export function resetTurnNotifier(): void {
  lastNotifiedTurnKey = null;
  stopTitleFlash();
}
