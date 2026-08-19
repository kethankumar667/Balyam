import { useState } from "react";
import type { BotDifficulty, GameKind, Player } from "@shared/types";
import ParticipantRow from "./ParticipantRow";
import BotManagementDialog from "./BotManagementDialog";
import { NO_BOT_GAMES } from "../../hooks/useRoomViewModel";

export default function ParticipantPanel({
  players,
  maxPlayers,
  selfId,
  isHost,
  game,
  onAddBot,
  onRemoveBot,
  onRemoveLocalPlayer,
}: {
  players: Player[];
  maxPlayers: number;
  selfId: string | null;
  isHost: boolean;
  game: GameKind;
  onAddBot: (name?: string, difficulty?: BotDifficulty) => Promise<void> | void;
  onRemoveBot?: (botId: string) => void;
  onRemoveLocalPlayer?: (localId: string) => void;
}) {
  const [showAddBotDialog, setShowAddBotDialog] = useState(false);
  const [isAddingQuickBot, setIsAddingQuickBot] = useState(false);
  const [isExpandedMobile, setIsExpandedMobile] = useState(false);

  const availableSeats = Math.max(0, maxPlayers - players.length);
  const isRoomFull = availableSeats <= 0;
  const readyCount = players.filter((p) => p.isReady).length;
  const supportsBots = !NO_BOT_GAMES.has(game);
  const canAddBot = isHost && !isRoomFull && supportsBots;

  async function handleQuickAddBot() {
    if (!canAddBot || isAddingQuickBot) return;
    setIsAddingQuickBot(true);
    try {
      await onAddBot();
    } finally {
      setTimeout(() => setIsAddingQuickBot(false), 300);
    }
  }

  // On very small screens, show first 4 players by default if many
  const isLongList = players.length > 4;
  const displayedPlayers = isLongList && !isExpandedMobile ? players.slice(0, 4) : players;

  return (
    <>
      <section
        aria-label="Table Participants"
        className="bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-[#EEDBCA]/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-base">👥</span>
            <h2 className="text-xs uppercase tracking-wider text-[#5C4328] dark:text-slate-300 font-extrabold">
              Participants ({players.length}/{maxPlayers})
            </h2>

            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EEDBCA]/70 dark:bg-slate-800 text-[#5C4328] dark:text-slate-200">
              {readyCount}/{players.length} Ready
            </span>
          </div>

          {/* Contextual Bot Addition or Table Full indicator */}
          <div className="flex items-center gap-2">
            {canAddBot ? (
              <div className="inline-flex items-center rounded-xl overflow-hidden shadow-xs border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/60">
                {/* 1-Tap Quick Add Bot */}
                <button
                  type="button"
                  onClick={handleQuickAddBot}
                  disabled={isAddingQuickBot}
                  className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Quick add a bot with auto-generated name"
                >
                  <span className="text-sm font-black">+</span>
                  <span>Add Bot</span>
                  <span className="text-[10px] opacity-75 hidden xs:inline">
                    ({availableSeats} left)
                  </span>
                </button>

                {/* Optional Customise Button */}
                <button
                  type="button"
                  onClick={() => setShowAddBotDialog(true)}
                  disabled={isAddingQuickBot}
                  className="inline-flex items-center justify-center min-h-[34px] px-2.5 py-1 border-l border-emerald-300/70 dark:border-emerald-700/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition active:scale-95 cursor-pointer"
                  title="Customise bot nickname or difficulty (optional)"
                  aria-label="Customise bot nickname or difficulty"
                >
                  <span className="text-[11px]" aria-hidden>⚙️</span>
                </button>
              </div>
            ) : isRoomFull ? (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                Table Full
              </span>
            ) : null}
          </div>
        </div>

        {/* Unified Player List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {displayedPlayers.map((player) => (
            <ParticipantRow
              key={player.id}
              player={player}
              selfId={selfId}
              isHost={isHost}
              onRemoveBot={onRemoveBot}
              onRemoveLocalPlayer={onRemoveLocalPlayer}
            />
          ))}
        </div>

        {/* Mobile "Show More / Less" toggle if long list */}
        {isLongList && (
          <div className="block sm:hidden text-center pt-1">
            <button
              type="button"
              onClick={() => setIsExpandedMobile((prev) => !prev)}
              className="text-xs font-bold text-[#8A6D4B] dark:text-slate-400 hover:text-[#EA5A1F] dark:hover:text-amber-400 py-1 px-3 rounded-full bg-[#EEDBCA]/30 dark:bg-slate-800 transition"
            >
              {isExpandedMobile
                ? "Show Less"
                : `Show All Players (${players.length})`}
            </button>
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
