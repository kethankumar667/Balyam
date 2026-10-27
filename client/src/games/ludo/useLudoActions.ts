import { useEffect, useRef, useState } from "react";
import type { LudoState } from "@shared/types";
import { generateActionId, getSocket } from "../../lib/socket";

type PendingAction = "roll" | "move";
const CONFIRMATION_WAIT_MS = 8_000;

/** Input stays locked until gameplay progresses or the server rejects it; a slow answer is never a retry. */
export function useLudoActions(state: LudoState, selfId: string | null, isOnline: boolean, inspecting: boolean) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionStalled, setActionStalled] = useState(false);
  const [rejection, setRejection] = useState(0);
  const [deadlineExpired, setDeadlineExpired] = useState(false);
  const pendingRef = useRef<PendingAction | null>(null);
  const waitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = JSON.stringify([
    selfId, state.phase, state.turnPlayerId, state.turnPhase, state.diceValue,
    state.stats.rollCount, state.tokens, state.movableTokenIds, state.lastEvent, state.turnDeadline,
  ]);
  function clearPending() {
    pendingRef.current = null;
    setPendingAction(null);
    setActionStalled(false);
    if (waitRef.current !== null) clearTimeout(waitRef.current);
    waitRef.current = null;
  }
  useEffect(() => { clearPending(); }, [progress, isOnline]);
  useEffect(() => {
    const deadline = state.phase === "playing" ? state.turnDeadline : null;
    const update = () => setDeadlineExpired(deadline !== null && Date.now() >= deadline);
    update();
    if (deadline === null) return;
    const timer = setTimeout(update, Math.max(0, deadline - Date.now()));
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [state.phase, state.turnDeadline]);
  useEffect(() => {
    const socket = getSocket();
    const rejected = () => { clearPending(); setRejection(value => value + 1); };
    const disconnected = () => clearPending();
    socket.on("game:error", rejected);
    socket.on("disconnect", disconnected);
    return () => {
      socket.off("game:error", rejected);
      socket.off("disconnect", disconnected);
      if (waitRef.current !== null) clearTimeout(waitRef.current);
    };
  }, []);

  function send(type: PendingAction, tokenId?: string): boolean {
    const socket = getSocket();
    if (!isOnline || !socket.connected || !navigator.onLine || inspecting || pendingRef.current ||
        !selfId || state.phase !== "playing" || state.turnPlayerId !== selfId ||
        (state.turnDeadline !== null && Date.now() >= state.turnDeadline)) return false;
    if (type === "roll" ? state.turnPhase !== "rolling"
      : state.turnPhase !== "moving" || !tokenId || !state.movableTokenIds.includes(tokenId)) return false;
    pendingRef.current = type;
    setPendingAction(type);
    waitRef.current = setTimeout(() => setActionStalled(true), CONFIRMATION_WAIT_MS);
    socket.emit("game:move", {
      type, ...(tokenId ? { data: { tokenId } } : {}),
      playerId: selfId, actionId: generateActionId(),
    });
    return true;
  }
  return { pendingAction, actionStalled, deadlineExpired, rejection, send };
}
