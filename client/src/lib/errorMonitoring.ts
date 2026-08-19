import { telemetry } from "./observability";

let isInitialized = false;

/**
 * Initializes global error, unhandled promise, network, and crash monitoring.
 * Safe to call multiple times (idempotent).
 */
export function initErrorMonitoring(): void {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  // 1. Unhandled Javascript exceptions
  window.addEventListener("error", (event: ErrorEvent) => {
    telemetry.error("GlobalUncaughtError", event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // 2. Unhandled Promise Rejections
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const errorMessage =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
        ? reason
        : JSON.stringify(reason);

    telemetry.error("UnhandledPromiseRejection", errorMessage, {
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

/**
 * Attaches structured error monitoring to a Socket.IO client instance.
 */
export function monitorSocketErrors(socket: {
  on: (event: string, handler: (...args: any[]) => void) => void;
}): void {
  socket.on("connect_error", (err: Error) => {
    telemetry.network("socket_connect_error", {
      message: err.message,
      name: err.name,
    });
  });

  socket.on("reconnect_failed", () => {
    telemetry.network("socket_reconnect_failed", {
      message: "Socket reconnect failed after max attempts",
    });
  });

  socket.on("error", (err: unknown) => {
    telemetry.error("socket_error", err);
  });
}

/**
 * Attaches monitoring to a WebRTC PeerConnection.
 */
export function monitorPeerConnection(pc: RTCPeerConnection, peerId: string): void {
  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      telemetry.network("webrtc_peer_state_degraded", {
        peerId,
        state: pc.connectionState,
        iceState: pc.iceConnectionState,
      });
    }
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    if (pc.iceConnectionState === "failed") {
      telemetry.network("webrtc_ice_failed", {
        peerId,
        iceState: pc.iceConnectionState,
      });
    }
  });
}
