import { useState } from "react";
import type { GameKind, RoomPublicState } from "@shared/types";
import { LogOut, ArrowLeft, Users, Clock } from "lucide-react";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import { BHALYAM_GAMES, categoryById } from "../bhalyam/data";
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
  maxPlayers,
}: {
  roomState: RoomPublicState;
  isHost: boolean;
  onLeave: () => void;
  maxPlayers?: number;
}) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const { balance, isLoading: walletLoading, status: walletStatus } = useWallet();
  const { isMember } = useAuthStore();
  const { openWallet } = useAppLayout();

  const gameCard = BHALYAM_GAMES.find((g) => g.slug === roomState.game);
  const displayName = GAME_DISPLAY_NAMES[roomState.game] || gameCard?.title || roomState.game.toUpperCase();
  const primaryTag = gameCard?.tags?.[1] || gameCard?.tags?.[0] || "board";
  const category = categoryById(primaryTag);
  const categoryLabel = category?.label.replace(" & Cards", "") || "Board";
  const duration = gameCard?.duration || "10–25 min";
  const playerRange = maxPlayers ? `2–${maxPlayers} Players` : gameCard?.playerRange || "2–8 Players";
  const ogImage = gameCard?.tileImage || (roomState.game === "wordbuilding" ? "/words_building.webp" : `/og/${roomState.game}.jpg`);

  const walletSyncStatus =
    walletStatus === "error" || walletStatus === "unavailable"
      ? "error"
      : walletLoading && walletStatus !== "loading"
        ? "syncing"
        : "synced";

  return (
    <>
      <header
        data-testid="room-header-fixed"
        className="fixed inset-x-0 top-0 z-40 bg-[#FFFDF8]/95 dark:bg-[#0F1420]/95 backdrop-blur-md border-b border-stone-200/90 dark:border-slate-800 shadow-xs px-3.5 py-2 sm:px-6 sm:py-2.5 transition-colors"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4 min-w-0">
          <h1 className="sr-only">
            {displayName} Lounge Table - Room {roomState.code}
          </h1>

          {/* Left: Back button + Game Information */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            aria-label="Back to home"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full border border-stone-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-800 shadow-xs flex items-center justify-center text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" aria-hidden />
          </button>

          {/* Game Artwork & Details Column (hidden on mobile, visible on sm+) */}
          <div className="hidden sm:flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* Game Tile Artwork */}
            <div className="relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden shadow-xs shrink-0 border border-stone-200/90 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
              <img
                src={ogImage}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Game Details Column */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-black text-base sm:text-xl tracking-tight text-[#2B3550] dark:text-[#F6EDDC] leading-tight truncate">
                  {displayName}
                </span>

                {/* Category Pill */}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
                  {categoryLabel}
                </span>

                {/* Player Range Pill */}
                <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
                  <Users size={11} className="shrink-0" />
                  <span>{playerRange}</span>
                </span>

                {/* Duration Pill */}
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                  <Clock size={11} className="shrink-0" />
                  <span>{duration}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Rummy room history teaser if rummy */}
          {roomState.game === "rummy" && (
            <div className="hidden xl:block ml-2 shrink-0">
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

        {/* Right: Coin Balance Chip + Leave Room Action */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-2.5">
          <WalletBalanceChip
            balance={balance}
            isLoading={walletLoading}
            syncStatus={walletSyncStatus}
            isMember={isMember}
            onClick={openWallet}
          />

          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            aria-label="Leave room"
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] text-xs font-bold bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-stone-200/90 dark:border-slate-700 text-stone-800 dark:text-slate-100 px-3.5 py-1.5 rounded-full transition shadow-xs active:scale-95 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
          >
            <LogOut size={15} className="stroke-[2.5] text-stone-700 dark:text-slate-300" aria-hidden />
            <span className="font-bold">Leave Room</span>
          </button>
        </div>
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
