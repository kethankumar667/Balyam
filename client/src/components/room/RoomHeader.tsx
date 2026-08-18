import { useState } from "react";
import type { RoomPublicState } from "@shared/types";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import RoomNameEditor from "../RoomNameEditor";
import RummyRoomHistory from "../nostalgia/RummyRoomHistory";
import LeaveRoomModal from "./LeaveRoomModal";

export default function RoomHeader({
  roomState,
  isHost,
  onLeave,
}: {
  roomState: RoomPublicState;
  isHost: boolean;
  onLeave: () => void;
}) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);

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
          {/* Leave room action with minimum 44px touch target */}
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            aria-label="Leave room"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#EEDBCA] dark:border-slate-700 px-3.5 py-1.5 rounded-full transition shadow-xs active:scale-95 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
          >
            <span aria-hidden>🚪</span>
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
