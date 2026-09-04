import { getApiBaseUrl, getSocket } from "../../lib/socket";
import type { GameKind, RoomPhase } from "@shared/types";

export interface RoomLivenessResult {
  alive: boolean;
  game?: GameKind;
  phase?: RoomPhase;
  reason?: string;
}

/**
 * Fast room liveness check used by reconnect/rejoin affordances.
 * Returns alive: true only when the room exists in memory on the server and is active.
 * If a playerId is supplied, also verifies that the player's seat is still valid.
 *
 * Checks HTTP REST endpoint GET /api/rooms/:code/alive first,
 * falling back to Socket.IO "room:checkAlive" event if connected.
 */
export async function checkRoomAlive(
  code: string,
  playerId?: string,
): Promise<RoomLivenessResult> {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) {
    return { alive: false, reason: "INVALID_CODE" };
  }

  // 1. Try REST HTTP endpoint
  try {
    const baseUrl = getApiBaseUrl();
    const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
    const url = `${baseUrl}/api/rooms/${encodeURIComponent(normalized)}/alive${query}`;

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller ? controller.signal : undefined,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as RoomLivenessResult;
      return {
        alive: data.alive === true,
        game: data.game,
        phase: data.phase,
        reason: data.reason,
      };
    }
    if (response.status === 404) {
      return { alive: false, reason: "NOT_FOUND" };
    }
  } catch {
    // REST lookup timed out or network error; fall back to socket
  }

  // 2. Fall back to socket if connected
  try {
    const socket = getSocket();
    if (socket && socket.connected) {
      return await new Promise<RoomLivenessResult>((resolve) => {
        const timer = setTimeout(() => {
          resolve({ alive: false, reason: "SOCKET_TIMEOUT" });
        }, 2000);

        socket.emit("room:checkAlive", normalized, (res) => {
          clearTimeout(timer);
          resolve(res || { alive: false, reason: "NO_RESPONSE" });
        });
      });
    }
  } catch {
    // Socket emit failed
  }

  return { alive: false, reason: "UNREACHABLE" };
}
