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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Game identification badge */}
          <div className="shrink-0 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 border border-[#EEDBCA] dark:border-slate-800 rounded-full px-3 py-1 shadow-xs">
            <span className="text-xs font-black text-[#2F3A54] dark:text-[#F6EDDC] uppercase tracking-wider">
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
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] text-xs sm:text-sm bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#EEDBCA] dark:border-slate-700 text-[#352C24] dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 px-3.5 py-1.5 rounded-full font-semibold transition shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <span aria-hidden>🚪</span>
            <span className="hidden xs:inline">Leave</span>
            <span className="xs:hidden">Exit</span>
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
