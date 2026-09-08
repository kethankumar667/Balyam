import { useState } from "react";
import type { BotDifficulty, GameKind, Player, RoomStartReadiness } from "@shared/types";
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
  /** The room's live match-start readiness — present once a host has
   *  requested a start and a preflight attempt is collecting acks. */
  startReadiness?: RoomStartReadiness;
}) {
  const [showAddBotDialog, setShowAddBotDialog] = useState(false);
  const [isAddingQuickBot, setIsAddingQuickBot] = useState(false);

  const availableSeats = Math.max(0, maxPlayers - players.length);
  const isRoomFull = availableSeats <= 0;
  const readyCount = players.filter((p) => p.isReady).length;
  const supportsBots = !NO_BOT_GAMES.has(game);
  const canAddBot = isHost && !isRoomFull && supportsBots;

  // A start attempt is actively collecting acks — the exact window the
  // requirement doc's "Preparing Match..." lobby is about. Outside this
  // window the panel is the ordinary "Participants" list; nothing changes
  // for a table that hasn't tried to start yet.
  const isPreparingMatch = !!startReadiness?.startAttemptId && !startReadiness.canStart;

  // `DISCONNECTED` is excluded here, not in `ParticipantRow` — the row
  // already renders a distinct "Reconnecting..." subtext straight off
  // `player.isConnected`, so passing it through as a blocker too would show
  // the same fact twice in two different words on the same row.
  const blockersForPlayer = (playerId: string) =>
    isPreparingMatch
      ? startReadiness!.participants
          .find((p) => p.playerId === playerId)
          ?.blockers.filter((b) => b !== "DISCONNECTED")
      : undefined;

  async function handleQuickAddBot() {
    if (!canAddBot || isAddingQuickBot) return;
    setIsAddingQuickBot(true);
    try {
      await onAddBot();
    } finally {
      setTimeout(() => setIsAddingQuickBot(false), 300);
    }
  }

  return (
    <>
      <section
        aria-label="Table Participants"
        className="bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-xs space-y-2.5"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-[#EEDBCA]/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-base">
              {isPreparingMatch ? "⏳" : "👥"}
            </span>
            <h2 className="text-xs uppercase tracking-wider text-[#5C4328] dark:text-slate-300 font-extrabold">
              {isPreparingMatch
                ? "Preparing Match…"
                : `Participants (${players.length}/${maxPlayers})`}
            </h2>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEDBCA]/70 dark:bg-slate-800 text-[#5C4328] dark:text-slate-200">
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
                  className="inline-flex items-center gap-1 min-h-[30px] px-2.5 py-0.5 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition active:scale-95 cursor-pointer disabled:opacity-50"
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
                  className="inline-flex items-center justify-center min-h-[30px] px-2 py-0.5 border-l border-emerald-300/70 dark:border-emerald-700/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition active:scale-95 cursor-pointer"
                  title="Customise bot nickname or difficulty (optional)"
                  aria-label="Customise bot nickname or difficulty"
                >
                  <span className="text-[10px]" aria-hidden>⚙️</span>
                </button>
              </div>
            ) : isRoomFull ? (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                Table Full
              </span>
            ) : null}
          </div>
        </div>

        {isPreparingMatch && (
          <p className="text-[11px] text-[#8A6D4B] dark:text-slate-400 font-medium -mt-1">
            Waiting for all players to get ready before starting the game.
          </p>
        )}

        {/* Unified Player List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[170px] sm:max-h-[200px] overflow-y-auto pr-0.5">
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
            />
          ))}
        </div>
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
