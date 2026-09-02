/**
 * "It's your turn" notification pipeline, mounted once by Room.
 *
 * Watches game state; when the active turn moves to the local player while
 * the tab is hidden, fires the title flash (`notifyDesktopTurn`) and a
 * system notification (`notifySystemTurn`) for players who granted
 * permission.
 *
 * Permission is NEVER requested implicitly. The prompt is user-triggered
 * from the bell button this hook's `requestPermission` returns — asking at
 * "random moment the browser chose" gets denied, and a denial on most
 * platforms is permanent, so the ONE shot must be taken at a moment that
 * makes sense to the player.
 *
 * The turn key uses the state object itself as the nonce: engines emit a
 * fresh state per move, so `String(state)` identity via a WeakSet-free
 * counter is enough to distinguish "your turn again after someone else
 * moved" from "same turn, re-broadcast". (Socket state objects are new
 * per broadcast; a serialised key would need a field every engine shares,
 * which none does.)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomPublicState } from "@shared/types";
import { activeTurnPlayerId } from "../lib/activeTurn";
import { notifyDesktopTurn, notifySystemTurn, resetTurnNotifier } from "../lib/turnNotifier";

export function useTurnNotifications(
  roomState: RoomPublicState | null,
  gameState: unknown,
  selfId: string | null,
): {
  permission: NotificationPermission | "unsupported";
  requestPermission: () => void;
} {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  const requestPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    void Notification.requestPermission().then((p) => setPermission(p));
  }, []);

  // ─── Detect turn transitions to me ────────────────────────────────────
  // Room code + active player + per-state counter: every broadcast is a new
  // `gameState` object, so incrementing a ref per state gives a per-move
  // nonce without reading any engine-specific field.
  const stateCounterRef = useRef(0);
  useEffect(() => {
    if (gameState == null) return;
    stateCounterRef.current += 1;

    if (!roomState || roomState.phase !== "playing" || !selfId) return;
    const activePid = activeTurnPlayerId(gameState);
    if (!activePid) return;

    // Pass & Play: the host device owns every local seat, but the phone is
    // being handed around physically — nobody is "away", notify nobody.
    const activePlayer = roomState.players.find((p) => p.id === activePid);
    if (activePlayer?.isLocal) return;
    // A bot's turn resolves in milliseconds; pinging anyone about it is noise.
    if (activePlayer?.isBot) return;

    const isMe =
      activePid === selfId || // normal seat
      activePid === "__bingo_self__"; // Bingo's server-computed self flag

    if (!isMe) return;

    notifyDesktopTurn();
    notifySystemTurn({
      turnKey: `${roomState.code}:${activePid}:${stateCounterRef.current}`,
      title: "Your turn — BHALYAM",
      body: `${roomState.game.toUpperCase()} · room ${roomState.code} — your friends are waiting.`,
      roomCode: roomState.code,
    });
  }, [gameState, roomState, selfId]);

  // Leaving the room: clear the one-per-turn guard so a return to the same
  // room re-arms cleanly.
  useEffect(() => resetTurnNotifier, []);

  return { permission, requestPermission };
}
