import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let recoveryInstalled = false;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      /**
       * Never stop trying.
       *
       * This was `reconnectionAttempts: 10`. With socket.io's default
       * `reconnectionDelayMax` of 5s the backoff runs roughly
       * 0.5s, 1s, 2s, 4s, then 5s a further six times — about 37 seconds of
       * effort, after which the client emits `reconnect_failed` and NEVER
       * TRIES AGAIN for the life of the page.
       *
       * Any outage longer than that was unrecoverable without a manual
       * reload: switching from wifi to mobile data, walking out of range, a
       * phone locking for a minute. Restoring the network did nothing,
       * because nothing was still asking. That is the reported bug.
       *
       * There is no reason to give up. A disconnected socket that keeps
       * retrying every 5 seconds costs nothing when the tab is idle, and it
       * is the only thing that can put the player back in their game.
       */
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      /** Spread retries so a server restart is not hit by every client at once. */
      randomizationFactor: 0.5,
      timeout: 10_000,
    });
    installNetworkRecovery(socket);
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Reconnect the moment the device says it can, rather than waiting out a
 * backoff timer that started while it was still offline.
 *
 * Two triggers, because phones produce both:
 *
 *  - `online` fires on a wifi-to-mobile-data handoff. Without this the socket
 *    sits in a backoff wait of up to five seconds after connectivity is
 *    already back, and on the old config it might have exhausted its attempts
 *    entirely while the radio was switching.
 *
 *  - `visibilitychange` covers the case `online` cannot: mobile browsers
 *    freeze background tabs, including their timers. A phone locked for ten
 *    minutes wakes with no pending retry and no `online` event, because the
 *    network never actually changed from the browser's point of view.
 *
 * Both are cheap no-ops when the socket is already connected.
 */
function installNetworkRecovery(s: AppSocket): void {
  if (recoveryInstalled || typeof window === "undefined") return;
  recoveryInstalled = true;

  const kick = () => {
    if (!s.connected) s.connect();
  };

  window.addEventListener("online", kick);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick();
  });

  // Belt and braces: `reconnectionAttempts: Infinity` means this should never
  // fire, but if a future change caps attempts again, the socket must not be
  // left permanently dead with no way back.
  s.io.on("reconnect_failed", () => {
    window.setTimeout(kick, 3_000);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
