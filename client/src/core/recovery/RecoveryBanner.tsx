import { useLocation } from "react-router-dom";
import { useRecovery } from "./useRecovery";
import { useRoomStore } from "../../store/roomStore";

export default function RecoveryBanner() {
  const { connectionState, retryRecovery } = useRecovery();
  const location = useLocation();
  const roomState = useRoomStore((s) => s.roomState);

  const isInRoom = location.pathname.startsWith("/room/") || roomState !== null;

  if (!isInRoom || connectionState === "CONNECTED" || connectionState === "DISCONNECTED") {
    return null;
  }

  return (
    <div
      className="fixed top-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 rounded-full shadow-lg border text-xs sm:text-sm font-semibold transition-all duration-300 backdrop-blur-md ${
          connectionState === "RECONNECTING"
            ? "bg-amber-500/90 border-amber-300 text-amber-950 dark:bg-amber-900/90 dark:border-amber-700 dark:text-amber-100 animate-pulse"
            : connectionState === "RECOVERING"
            ? "bg-sky-500/90 border-sky-300 text-sky-950 dark:bg-sky-900/90 dark:border-sky-700 dark:text-sky-100"
            : connectionState === "RECOVERED"
            ? "bg-emerald-500/90 border-emerald-300 text-emerald-950 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-100"
            : "bg-rose-500/90 border-rose-300 text-rose-950 dark:bg-rose-900/90 dark:border-rose-700 dark:text-rose-100"
        }`}
      >
        {connectionState === "RECONNECTING" && (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-200 animate-ping" aria-hidden />
            <span>Connection dropped. Reconnecting...</span>
          </>
        )}

        {connectionState === "RECOVERING" && (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-200 animate-spin border-2 border-sky-600 border-t-transparent" aria-hidden />
            <span>Restoring room & game state...</span>
          </>
        )}

        {connectionState === "RECOVERED" && (
          <>
            <span className="text-emerald-200" aria-hidden>✓</span>
            <span>Back online. Game synchronized.</span>
          </>
        )}

        {connectionState === "FAILED" && (
          <>
            <span className="text-rose-200" aria-hidden>⚠</span>
            <span>Unable to restore session automatically.</span>
            <button
              type="button"
              onClick={retryRecovery}
              className="ml-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 active:scale-95 rounded-full text-xs font-bold transition min-h-[32px] cursor-pointer"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
