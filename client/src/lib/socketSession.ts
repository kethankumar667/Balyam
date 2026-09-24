import type { SessionAuthenticateResult } from "@shared/social/Session";
import { getSocket } from "./socket";
import { currentAccessToken, useAuthStore } from "../store/authStore";
import { currentGuestToken, subscribeGuestId } from "./playerIdentity";

/**
 * Tells the server which person this browser is, on the ONE shared socket.
 *
 * The server forgets a connection's identity when it drops and expires it after
 * 30 minutes, so the credential is presented on every (re)connect, whenever the
 * signed-in user or the device's guest identity changes, and on a timer that
 * stays comfortably inside the server's window.
 *
 * It only ever presents a credential the browser ALREADY holds. Reading
 * `getPlayerCredential()` here would mint a guest identity for every visitor
 * the moment the page loads — including people who only glanced at the landing
 * page — so a guest who has no token yet simply has no socket identity until
 * something else creates one, at which point `subscribeGuestId` fires.
 *
 * The payload is the token and nothing else; who the server decides you are
 * comes from verifying it, never from anything sent alongside.
 */

/** Well inside the server's 30-minute session, so one missed refresh is survivable. */
export const SESSION_REFRESH_MS = 20 * 60 * 1000;
export const RETRY_DELAY_MS = 6_000;
export const MAX_RETRIES = 3;
const ACK_TIMEOUT_MS = 10_000;

type Outcome = "skipped" | "timeout" | SessionAuthenticateResult;

/** Refusals worth trying again: the server was busy or broke, not "your token is wrong". */
function isTransient(outcome: Outcome): boolean {
  if (outcome === "timeout") return true;
  if (outcome === "skipped" || outcome.ok) return false;
  return outcome.error === "INTERNAL" || outcome.error === "RATE_LIMITED";
}

function presentCredential(): Promise<Outcome> {
  const socket = getSocket();
  if (!socket.connected) return Promise.resolve("skipped");

  const token = currentAccessToken() ?? currentGuestToken();
  if (!token) {
    socket.emit("session:end");
    return Promise.resolve("skipped");
  }
  return new Promise<Outcome>((resolve) => {
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit("session:authenticate", { token }, (err: Error | null, res?: SessionAuthenticateResult) => {
        resolve(err || !res ? "timeout" : res);
      });
  });
}

/**
 * Starts keeping the socket's identity in step with this browser's. Returns the
 * cleanup. Safe to call once, from the app root.
 */
export function installSocketSession(): () => void {
  const socket = getSocket();
  let stopped = false;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const present = async (): Promise<void> => {
    clearTimeout(retryTimer);
    const outcome = await presentCredential();
    if (stopped) return;
    if (!isTransient(outcome)) {
      retries = 0;
      return;
    }
    if (retries >= MAX_RETRIES) return;
    retries += 1;
    retryTimer = setTimeout(() => void present(), RETRY_DELAY_MS);
  };

  const onIdentityChange = (): void => {
    retries = 0;
    void present();
  };

  socket.on("connect", onIdentityChange);
  const stopAuth = useAuthStore.subscribe((state, prev) => {
    if (state.userId !== prev.userId) onIdentityChange();
  });
  const stopGuest = subscribeGuestId(onIdentityChange);
  const refreshTimer = setInterval(onIdentityChange, SESSION_REFRESH_MS);
  void present();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearInterval(refreshTimer);
    socket.off("connect", onIdentityChange);
    stopAuth();
    stopGuest();
  };
}
