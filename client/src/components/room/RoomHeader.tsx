import { useState } from "react";
import type { RoomPublicState } from "@shared/types";
import { Bell, BellOff, BellRing, LogOut } from "lucide-react";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import RoomNameEditor from "../RoomNameEditor";
import RummyRoomHistory from "../nostalgia/RummyRoomHistory";
import LeaveRoomModal from "./LeaveRoomModal";

export default function RoomHeader({
  roomState,
  isHost,
  onLeave,
  turnNotifications,
}: {
  roomState: RoomPublicState;
  isHost: boolean;
  onLeave: () => void;
  /** "Your turn" notification controls — see useTurnNotifications. Optional
   * so non-room call sites (if any) keep compiling; null hides the bell. */
  turnNotifications?: {
    permission: NotificationPermission | "unsupported";
    requestPermission: () => void;
  } | null;
}) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const bell = (() => {
    const t = turnNotifications;
    if (!t || t.permission === "unsupported") return null;
    if (t.permission === "granted") {
      return (
        <span
          className="hidden sm:inline-flex items-center justify-center gap-1.5 min-h-[44px] text-xs bg-white dark:bg-slate-800 border border-[#EEDBCA] dark:border-slate-700 px-3.5 py-1.5 rounded-full shadow-xs whitespace-nowrap text-[#0F172A] dark:text-slate-100 font-extrabold"
          title="You'll be notified when it's your turn and the tab is hidden"
        >
          <BellRing size={16} aria-hidden />
          <span>Turn alerts on</span>
        </span>
      );
    }
    if (t.permission === "denied") {
      return (
        <span
          className="hidden sm:inline-flex items-center justify-center min-h-[44px] text-xs bg-white dark:bg-slate-800 border border-[#EEDBCA] dark:border-slate-700 px-3.5 py-1.5 rounded-full shadow-xs whitespace-nowrap text-[#8A6D4B] dark:text-slate-400 font-extrabold"
          title="Turn alerts are blocked in your browser settings"
        >
          <BellOff size={16} aria-hidden />
          <span>Alerts blocked</span>
        </span>
      );
    }
    // "default" — the one state where asking is allowed.
    return (
      <button
        type="button"
        onClick={t.requestPermission}
        aria-label="Get notified when it's your turn"
        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] text-xs bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-[#EEDBCA] dark:border-slate-700 px-3.5 py-1.5 rounded-full transition shadow-xs active:scale-95 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
      >
        <Bell size={16} aria-hidden />
        <span className="text-[#0F172A] dark:text-slate-100 font-extrabold">Alert me</span>
      </button>
    );
  })();

  return (
    <>
      <header className="flex items-center justify-between gap-2 pb-2 min-w-0 border-b border-[#EEDBCA]/60 dark:border-slate-800">
        <h1 className="sr-only">
          {GAME_DISPLAY_NAMES[roomState.game] || roomState.game} Lounge Table - Room {roomState.code}
        </h1>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Game identification badge */}
          <div className="shrink-0 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 border border-[#EEDBCA] dark:border-slate-800 rounded-full px-3 py-1 shadow-xs">
            <span className="text-xs font-black text-[#1E293B] dark:text-[#F6EDDC] uppercase tracking-wider">
              {GAME_DISPLAY_NAMES[roomState.game] || roomState.game.toUpperCase()}
            </span>
          </div>

          {/* Table name editor / display */}
          <div className="min-w-0 flex-1 max-w-[200px] sm:max-w-none">
            <RoomNameEditor name={roomState.name} isHost={isHost} />
          </div>

          {/* Rummy room history teaser if rummy */}
          {roomState.game === "rummy" && (
            <div className="hidden sm:block">
              <RummyRoomHistory
                variant="teaser"
                density="mobile"
                history={roomState.history}
                champion={roomState.champion}
                players={roomState.players}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {/* "Your turn" notification opt-in — in the lobby, in context,
              never a cold prompt. */}
          {bell}
          {/* Leave room action with minimum 44px touch target */}
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            aria-label="Leave room"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#EEDBCA] dark:border-slate-700 px-3.5 py-1.5 rounded-full transition shadow-xs active:scale-95 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
          >
            <LogOut size={16} aria-hidden />
            <span className="text-[#0F172A] dark:text-slate-100 font-extrabold">Leave</span>
          </button>
        </div>
      </header>

      <LeaveRoomModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={onLeave}
      />
    </>
  );
}
