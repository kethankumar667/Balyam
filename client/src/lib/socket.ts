import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { logConn } from "./connectionLog";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionState =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "RECOVERED"
  | "FAILED";

let socket: AppSocket | null = null;
let recoveryInstalled = false;
let currentState: ConnectionState = "DISCONNECTED";
const stateListeners = new Set<(state: ConnectionState) => void>();

function setConnectionState(newState: ConnectionState): void {
  if (currentState === newState) return;
  currentState = newState;
  for (const listener of stateListeners) {
    try {
      listener(newState);
    } catch {
      // Ignore listener errors
    }
  }
}

export function getConnectionState(): ConnectionState {
  return currentState;
}

export function subscribeConnectionState(
  listener: (state: ConnectionState) => void,
): () => void {
  stateListeners.add(listener);
  listener(currentState);
  return () => {
    stateListeners.delete(listener);
  };
}

/**
 * React hook to observe socket connection lifecycle across any component/game.
 */
export function useConnectionState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(() => getConnectionState());

  useEffect(() => {
    return subscribeConnectionState(setState);
  }, []);

  return state;
}

/**
 * Mint a unique idempotency key / UUID per game move to prevent duplicate submissions.
 */
export function generateActionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getSocket(): AppSocket {
  if (typeof window === "undefined") {
    return {
      connected: false,
      emit: () => {},
      on: () => {},
      off: () => {},
      connect: () => {},
      disconnect: () => {},
      timeout: () => ({ emit: () => {} }),
      io: { on: () => {}, off: () => {} },
    } as unknown as AppSocket;
  }
  if (!socket) {
    setConnectionState("CONNECTING");
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      /**
       * Never stop trying.
       * Keeps retrying with jittered exponential backoff (0.5s - 5s).
       */
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10_000,
    });
    installTelemetry(socket);
    installNetworkRecovery(socket);
  }
  if (!socket.connected) {
    setConnectionState("CONNECTING");
    socket.connect();
  }
  return socket;
}

/**
 * Record socket telemetry and lifecycle transitions.
 */
function installTelemetry(s: AppSocket): void {
  logConn("init", SERVER_URL);

  s.on("connect", () => {
    const transport = s.io.engine?.transport?.name ?? "?";
    logConn("connect", `id=${s.id} transport=${transport}`);
    setConnectionState(currentState === "RECONNECTING" ? "RECOVERED" : "CONNECTED");
    if (currentState === "RECOVERED") {
      // Settle to CONNECTED after 1s
      setTimeout(() => {
        if (s.connected) setConnectionState("CONNECTED");
      }, 1000);
    }
  });

  let lastBootId: string | null = null;
  s.on("server:hello", (info) => {
    const restarted = lastBootId !== null && lastBootId !== info.bootId;
    logConn(
      restarted ? "SERVER RESTARTED" : "server_hello",
      `boot=${info.bootId} uptime=${info.uptimeSec}s${
        restarted ? " (rooms from the previous process are gone)" : ""
      }`,
    );
    lastBootId = info.bootId;
  });

  s.on("disconnect", (reason) => {
    logConn("disconnect", reason);
    setConnectionState("DISCONNECTED");
  });

  s.on("connect_error", (err) => {
    logConn("connect_error", err?.message);
    setConnectionState("RECONNECTING");
  });

  s.io.on("reconnect_attempt", (n) => {
    logConn("reconnect_attempt", `#${n}`);
    setConnectionState("RECONNECTING");
  });

  s.io.on("reconnect_error", (err) => {
    logConn("reconnect_error", err?.message);
    setConnectionState("RECONNECTING");
  });

  s.io.on("reconnect_failed", () => {
    logConn("reconnect_failed");
    setConnectionState("FAILED");
  });

  s.io.on("reconnect", (n) => {
    logConn("reconnect_ok", `after #${n}`);
    setConnectionState("RECOVERED");
    setTimeout(() => {
      if (s.connected) setConnectionState("CONNECTED");
    }, 1000);
  });
}

/**
 * Robust network lifecycle recovery covering Wi-Fi <-> 5G, app freeze, backgrounding, tab sleep.
 */
function installNetworkRecovery(s: AppSocket): void {
  if (recoveryInstalled || typeof window === "undefined") return;
  recoveryInstalled = true;

  const kick = () => {
    if (!s.connected) {
      logConn("kick", "not connected, dialling");
      setConnectionState("CONNECTING");
      s.connect();
      return;
    }
    // Probe with net:ping to verify half-open TCP connections
    s.timeout(3_000).emit("net:ping", (err: unknown) => {
      if (!err) {
        logConn("kick", "probe ok, socket healthy");
        setConnectionState("CONNECTED");
        return;
      }
      logConn("kick", "probe TIMED OUT, rebuilding transport");
      setConnectionState("RECONNECTING");
      s.disconnect();
      s.connect();
    });
  };

  window.addEventListener("online", () => {
    logConn("browser_online");
    kick();
  });

  window.addEventListener("offline", () => {
    logConn("browser_offline");
    setConnectionState("DISCONNECTED");
  });

  document.addEventListener("visibilitychange", () => {
    logConn("visibility", document.visibilityState);
    if (document.visibilityState === "visible") {
      kick();
    }
  });

  window.addEventListener("focus", () => {
    if (!s.connected) kick();
  });

  s.io.on("reconnect_failed", () => {
    window.setTimeout(kick, 3_000);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    setConnectionState("DISCONNECTED");
  }
}
