import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveSession, type RecoverySession } from "./recoveryStorage";
import { useRoomStore } from "../../store/roomStore";

/**
 * Persistent "Rejoin Room" affordance for outside the room page.
 *
 * `RecoveryBanner` only renders while the player is still sitting on
 * `/room/:code` and only offers a manual retry once that live socket
 * session hits FAILED. It has no reach once the player has actually
 * navigated away (or reopened the app in a new tab/after a restart) —
 * exactly the gap left by an unintentional departure (crash, refresh,
 * network loss, backgrounding, browser/machine restart).
 *
 * This reads the same `recoveryStorage` session `RecoveryManager` already
 * maintains (the one durable, localStorage-backed source of truth for "do I
 * have a seat somewhere") and offers to resume it from anywhere else in the
 * app. `RoomManager.detachRoom()` clears that session on a confirmed
 * intentional leave, so this never appears for that path — only for
 * everything else.
 */
export default function RejoinBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<RecoverySession | null>(null);
  const [dismissedRoomId, setDismissedRoomId] = useState<string | null>(null);

  const isInRoom = location.pathname.startsWith("/room/");

  // localStorage has no React subscription of its own. Re-read on every
  // route change and on window focus — the same "might be worth checking
  // again" triggers RecoveryManager already uses for live reconnect.
  useEffect(() => {
    setSession(getActiveSession());
    const onFocus = () => setSession(getActiveSession());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location.pathname]);

  const handleRejoin = useCallback(() => {
    if (!session?.seatToken) return;
    // Hydrate the in-memory room store BEFORE navigating: Room.tsx's join
    // effect reads its seat credential from here (`seatFor`), not from
    // recoveryStorage directly, and its name-entry gate is seeded from the
    // same lookup on mount. Without this, landing on /room/:code fresh
    // would look like a stranger arriving, not a seat reclaim.
    const store = useRoomStore.getState();
    store.rememberSeat(session.roomId, session.playerId, session.seatToken);
    store.setPlayerName(session.playerName);
    if (session.avatar) store.setAvatarId(session.avatar);
    navigate(`/room/${session.roomId}`);
  }, [session, navigate]);

  const handleDismiss = useCallback(() => {
    if (session) setDismissedRoomId(session.roomId);
  }, [session]);

  if (isInRoom || !session?.seatToken) return null;
  if (dismissedRoomId === session.roomId) return null;

  return (
    <div
      className="fixed top-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full shadow-lg border text-xs sm:text-sm font-semibold backdrop-blur-md bg-sky-500/90 border-sky-300 text-sky-950 dark:bg-sky-900/90 dark:border-sky-700 dark:text-sky-100">
        <span>
          You were disconnected from Room <strong>{session.roomId}</strong>
        </span>
        <button
          type="button"
          onClick={handleRejoin}
          className="px-3 py-1 bg-white/25 hover:bg-white/40 active:scale-95 rounded-full text-xs font-bold transition min-h-[32px] cursor-pointer"
        >
          Rejoin Room
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss rejoin notice"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-95 transition cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
