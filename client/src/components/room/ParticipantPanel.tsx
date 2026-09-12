import { useState } from "react";
import type { BotDifficulty, GameKind, Player, RoomStartReadiness } from "@shared/types";
import { Plus, Users, MoreVertical } from "lucide-react";
import ParticipantRow from "./ParticipantRow";
import BotManagementDialog from "./BotManagementDialog";
import { NO_BOT_GAMES } from "../../hooks/useRoomViewModel";
import { useHaptics } from "../../hooks/useHaptics";

export default function ParticipantPanel({
  players,
  maxPlayers,
  selfId,
  isHost,
  game,
  onAddBot,
  onRemoveBot,
  onRemoveLocalPlayer,
  onRenameBot,
  startReadiness,
}: {
  players: Player[];
  maxPlayers: number;
  selfId: string | null;
  isHost: boolean;
  game: GameKind;
  onAddBot: (name?: string, difficulty?: BotDifficulty) => Promise<void> | void;
  onRemoveBot?: (botId: string) => void;
  onRemoveLocalPlayer?: (localId: string) => void;
  onRenameBot?: (botId: string, newName: string) => void;
  startReadiness?: RoomStartReadiness;
}) {
  const [showAddBotDialog, setShowAddBotDialog] = useState(false);
  const [isAddingQuickBot, setIsAddingQuickBot] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const haptics = useHaptics();

  const availableSeats = Math.max(0, maxPlayers - players.length);
  const isRoomFull = availableSeats <= 0;
  const readyCount = players.filter((p) => p.isReady).length;
  const supportsBots = !NO_BOT_GAMES.has(game);
  const canAddBot = isHost && !isRoomFull && supportsBots;

  const isPreparingMatch = !!startReadiness?.startAttemptId && !startReadiness.canStart;

  const blockersForPlayer = (playerId: string) =>
    isPreparingMatch
      ? startReadiness!.participants
          .find((p) => p.playerId === playerId)
          ?.blockers.filter((b) => b !== "DISCONNECTED")
      : undefined;

  async function handleQuickAddBot() {
    if (!canAddBot || isAddingQuickBot) return;
    setIsAddingQuickBot(true);
    haptics.subtle();
    try {
      await onAddBot();
    } finally {
      setTimeout(() => setIsAddingQuickBot(false), 300);
    }
  }

  // Calculate visible empty invite slots (0 if room is full, otherwise up to 5 or remaining seats)
  const emptySlotsCount = isRoomFull ? 0 : Math.min(availableSeats, 5);
  const emptySlots = Array.from({ length: emptySlotsCount });

  const handleInviteClick = () => {
    haptics.subtle();
    const btn = document.querySelector<HTMLButtonElement>('button[aria-label="Invite Friends to room"]') ||
                document.querySelector<HTMLButtonElement>('button[aria-label="Share Room Link"]');
    if (btn) {
      btn.click();
    }
  };

  return (
    <>
      <section
        aria-label="Table Participants"
        className="bg-white dark:bg-[#131926] border border-stone-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4.5 lg:p-4 shadow-xs space-y-2.5 select-none"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-stone-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-amber-800 dark:text-amber-400 stroke-[2.5]" aria-hidden />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#2B3550] dark:text-slate-200">
            {isPreparingMatch ? (
              "Preparing Match…"
            ) : (
              <>
                <span aria-hidden="true">PLAYERS ({players.length}/{maxPlayers})</span>
                <span className="sr-only">Participants ({players.length}/{maxPlayers})</span>
              </>
            )}
          </h2>

            <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{players.length} players in room</span>
            </span>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300">
              {readyCount}/{players.length} Ready
            </span>
          </div>

          {/* Right Action: Add Bot Pill + More Menu */}
          <div className="flex items-center gap-2">
            {canAddBot && (
              <button
                type="button"
                onClick={handleQuickAddBot}
                disabled={isAddingQuickBot}
                className="inline-flex items-center gap-1.5 min-h-[34px] px-3.5 py-1 rounded-full text-xs font-black bg-amber-100/80 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/60 transition active:scale-95 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                title="Add a bot to the match"
              >
                <span className="text-sm leading-none font-black">+</span>
                <span>Add Bot</span>
              </button>
            )}

            {isRoomFull && (
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                Table Full
              </span>
            )}

            {canAddBot && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((prev) => !prev)}
                  aria-label="More player options"
                  className="w-8 h-8 rounded-full border border-stone-200 dark:border-slate-700 flex items-center justify-center text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                >
                  <MoreVertical size={14} />
                </button>

                {showMoreMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowAddBotDialog(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-stone-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      ⚙️ Customise Bot
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Seat Matrix */}
        <div className="flex items-start gap-3 sm:gap-4 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
          {/* Active Players */}
          {players.map((player) => (
            <ParticipantRow
              key={player.id}
              player={player}
              selfId={selfId}
              isHost={isHost}
              onRemoveBot={onRemoveBot}
              onRemoveLocalPlayer={onRemoveLocalPlayer}
              onRenameBot={onRenameBot}
              blockers={blockersForPlayer(player.id)}
              requiredOrientation={startReadiness?.requiredOrientation ?? null}
              variant="card"
            />
          ))}

          {/* Empty Seats with dashed border */}
          {!isRoomFull && emptySlots.map((_, index) => (
            <div
              key={`empty-seat-${index}`}
              onClick={handleInviteClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleInviteClick();
                }
              }}
              title="Click to invite a friend"
              aria-label="Empty seat. Click to invite a friend"
              className="flex flex-col items-center gap-1.5 min-w-[88px] max-w-[104px] shrink-0 text-center cursor-pointer group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-stone-300 dark:border-slate-700 group-hover:border-amber-400 dark:group-hover:border-amber-400 group-hover:bg-amber-50/50 dark:group-hover:bg-amber-950/20 flex items-center justify-center text-stone-400 group-hover:text-amber-600 transition-all">
                <Plus size={20} className="stroke-[2.5]" />
              </div>
              <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                Invite
              </span>
            </div>
          ))}
        </div>

        {/* Footer Subtext */}
        {!isRoomFull && availableSeats > 0 && (
          <div className="text-right text-xs text-stone-400 dark:text-slate-500 font-medium pr-1">
            {availableSeats} more seat{availableSeats > 1 ? "s" : ""} available
          </div>
        )}
      </section>

      {/* Add Bot Dialog */}
      <BotManagementDialog
        isOpen={showAddBotDialog}
        onClose={() => setShowAddBotDialog(false)}
        game={game}
        availableSeats={availableSeats}
        onAddBot={onAddBot}
      />
    </>
  );
}
