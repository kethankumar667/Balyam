import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { logConn } from "./connectionLog";

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
    installTelemetry(socket);
    installNetworkRecovery(socket);
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Record what the socket does, so a failure on someone's phone leaves
 * evidence instead of an anecdote. See lib/connectionLog.ts.
 */
function installTelemetry(s: AppSocket): void {
  logConn("init", SERVER_URL);
  s.on("connect", () => {
    // The transport matters: a session stuck on long-polling behaves very
    // differently from one on websocket, and carriers do block upgrades.
    const transport = s.io.engine?.transport?.name ?? "?";
    logConn("connect", `id=${s.id} transport=${transport}`);
  });
  // socket.io's reason string is the single most diagnostic value here:
  // "transport close" (network died) and "io server disconnect" (the server
  // hung up, and auto-reconnect is DISABLED) demand opposite fixes.
  s.on("disconnect", (reason) => logConn("disconnect", reason));
  s.on("connect_error", (err) => logConn("connect_error", err?.message));
  s.io.on("reconnect_attempt", (n) => logConn("reconnect_attempt", `#${n}`));
  s.io.on("reconnect_error", (err) => logConn("reconnect_error", err?.message));
  s.io.on("reconnect_failed", () => logConn("reconnect_failed"));
  s.io.on("reconnect", (n) => logConn("reconnect_ok", `after #${n}`));
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

  /**
   * Get back on the network, whatever state the socket thinks it is in.
   *
   * The naive version was `if (!s.connected) s.connect()`, and it did nothing
   * in the case that matters most. When a phone moves from wifi to mobile
   * data the old TCP connection dies silently: no close frame, no error. The
   * `online` event fires while `s.connected` is still `true`, so the check
   * skipped, and the socket sat on a dead transport until the heartbeat
   * eventually timed out tens of seconds later.
   *
   * So when the socket claims to be connected we do not believe it — we ask.
   * A `net:ping` with a short ack timeout is the only reliable way to tell a
   * live connection from a corpse. No answer means the transport is gone, and
   * a full disconnect/connect cycle is what rebuilds it; `connect()` alone is
   * a no-op on a socket that thinks it is already up.
   */
  const kick = () => {
    if (!s.connected) {
      logConn("kick", "not connected, dialling");
      s.connect();
      return;
    }
    s.timeout(3_000).emit("net:ping", (err: unknown) => {
      if (!err) {
        logConn("kick", "probe ok, socket healthy");
        return;
      }
      logConn("kick", "probe TIMED OUT, rebuilding transport");
      s.disconnect();
      s.connect();
    });
  };

  window.addEventListener("online", () => {
    logConn("browser_online");
    kick();
  });
  window.addEventListener("offline", () => logConn("browser_offline"));
  document.addEventListener("visibilitychange", () => {
    logConn("visibility", document.visibilityState);
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
