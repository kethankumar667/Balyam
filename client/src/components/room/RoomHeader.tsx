import { useState } from "react";
import type { RoomPublicState } from "@shared/types";
import { LogOut } from "lucide-react";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import RummyRoomHistory from "../nostalgia/RummyRoomHistory";
import LeaveRoomModal from "./LeaveRoomModal";
import { WalletBalanceChip } from "../economy/WalletBalanceChip";
import { useWallet } from "../../hooks/useEconomy";
import { useAuthStore } from "../../store/authStore";
import { useAppLayout } from "../layout/AppLayout";

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
  const { balance, isLoading: walletLoading, status: walletStatus } = useWallet();
  const { isMember } = useAuthStore();
  const { openWallet } = useAppLayout();
  // Same derivation AppHeader uses for its global chip — kept identical so
  // the lobby chip (this screen has no chrome, so AppHeader isn't mounted)
  // reads the same way a returning player already recognizes.
  const walletSyncStatus =
    walletStatus === "error" || walletStatus === "unavailable"
      ? "error"
      : walletLoading && walletStatus !== "loading"
        ? "syncing"
        : "synced";

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
          {/* Coin wallet balance — this room screen carries no chrome, so
              AppHeader's global chip never mounts; this is the only wallet
              visibility a player has before committing coins to the match. */}
          <WalletBalanceChip
            balance={balance}
            isLoading={walletLoading}
            syncStatus={walletSyncStatus}
            isMember={isMember}
            onClick={openWallet}
          />

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
