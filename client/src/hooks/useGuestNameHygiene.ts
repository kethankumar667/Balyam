import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";

const IN_ROOM_PATH = /^\/room\//;

/**
 * A guest's name is for the game room they chose it in. Outside a room they are "Guest 12345678".
 *
 * The name a guest types is stored in `playerName` (it has to be — the join handshake reads it), so
 * something must take it back out. This does, in two moments:
 *
 *   • when a guest navigates from a `/room/…` page to anywhere else (Leave button, back button, a link);
 *   • once, the first time the session is known to be a guest while NOT in a room — a name saved by an
 *     older build, or left behind by a tab that was closed mid-room.
 *
 * It deliberately does nothing while the guest is inside a room, so a refresh mid-match keeps them
 * under the name they chose (the room's seat remembers it too). An account is never touched: its
 * name is its own.
 */
export function useGuestNameHygiene(): void {
  const { pathname } = useLocation();
  const isGuest = useAuthStore((s) => s.ready && !s.isMember);
  const previousPathRef = useRef<string | null>(null);
  const hasSettledRef = useRef(false);

  useEffect(() => {
    const previous = previousPathRef.current;
    previousPathRef.current = pathname;
    if (!isGuest) return;

    const nowInRoom = IN_ROOM_PATH.test(pathname);
    const justLeftRoom = previous !== null && IN_ROOM_PATH.test(previous) && !nowInRoom;
    const isFirstSettle = !hasSettledRef.current;
    hasSettledRef.current = true;

    if ((justLeftRoom || (isFirstSettle && !nowInRoom)) && useRoomStore.getState().playerName) {
      useRoomStore.getState().setPlayerName("");
    }
  }, [pathname, isGuest]);
}
