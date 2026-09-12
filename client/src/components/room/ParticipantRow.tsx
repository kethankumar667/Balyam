import { useState } from "react";
import type { Player, StartBlockReason } from "@shared/types";
import { Crown, Bot, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import SeatAvatar from "../profile/SeatAvatar";
import RenameBotModal from "./RenameBotModal";
import { ReadyCheckmarkPencil } from "../../animations/app/ReadyCheckmarkDraw";
import { COLOR_HEX } from "../../games/ludo/board-layout";
import { COIN_COLOR_HEX } from "../CoinColorPicker";
import { getPlayerThemeByColor } from "../../games/dotsboxes/dotsboxes-theme";
import { dominantBlockerFor, describeStartBlocker, shortStartBlockerLabel } from "../../hooks/useRoomViewModel";

export default function ParticipantRow({
  player,
  selfId,
  isHost,
  onRemoveBot,
  onRemoveLocalPlayer,
  onRenameBot,
  blockers,
  requiredOrientation = null,
  variant = "row",
}: {
  player: Player;
  selfId: string | null;
  isHost: boolean;
  onRemoveBot?: (botId: string) => void;
  onRemoveLocalPlayer?: (localId: string) => void;
  onRenameBot?: (botId: string, newName: string) => void;
  blockers?: readonly StartBlockReason[];
  requiredOrientation?: "landscape" | "portrait" | null;
  variant?: "row" | "card";
}) {
  const [showRenameModal, setShowRenameModal] = useState(false);
  const isMe = player.id === selfId;
  const dominantBlocker = dominantBlockerFor(blockers);

  // Derive color swatch if set
  let colorBadgeHex: string | null = null;
  let colorBadgeLabel: string | null = null;
  if (player.chosenColor && COLOR_HEX[player.chosenColor]) {
    colorBadgeHex = COLOR_HEX[player.chosenColor];
    colorBadgeLabel = player.chosenColor;
  } else if (player.coinColor && COIN_COLOR_HEX[player.coinColor]) {
    colorBadgeHex = COIN_COLOR_HEX[player.coinColor].fill;
    colorBadgeLabel = COIN_COLOR_HEX[player.coinColor].label;
  } else if (player.penColor) {
    const penTheme = getPlayerThemeByColor(player.penColor);
    if (penTheme) {
      colorBadgeHex = penTheme.primary;
      colorBadgeLabel = player.penColor;
    }
  }

  // Vertical Avatar Card Variant (used in horizontal seat row)
  if (variant === "card") {
    return (
      <motion.div
        data-seat-id={player.id}
        id={`seat-${player.id}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.25, ease: "backOut" }}
        className="flex flex-col items-center gap-1.5 min-w-[88px] max-w-[104px] shrink-0 text-center relative group select-none"
      >
        {/* Large Circular Avatar with Presence & Active Status */}
        <div className="relative">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-all shadow-xs ${
              player.isReady
                ? "ring-3 ring-emerald-500 shadow-emerald-500/20"
                : "ring-2 ring-stone-200 dark:ring-slate-700"
            }`}
          >
            <SeatAvatar
              avatar={player.avatar}
              name={player.name}
              className="w-full h-full rounded-full object-cover"
            />
          </div>

          {/* Live Presence Indicator */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
              player.isConnected
                ? "bg-emerald-500"
                : "bg-amber-500 animate-pulse"
            }`}
            title={player.isConnected ? "Connected & Online" : "Away / Reconnecting..."}
          />
        </div>

        {/* Player Name and Badges */}
        <div className="w-full min-w-0 space-y-0.5">
          <div className="text-xs sm:text-sm font-extrabold text-[#2B3550] dark:text-slate-100 truncate px-1">
            {player.name}
          </div>

          {/* Role Pill */}
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {isMe && (
              <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 rounded px-1.5 py-0.2">
                You
              </span>
            )}
            {player.isHost && (
              <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300/60 rounded px-1.5 py-0.2 flex items-center gap-0.5">
                <Crown size={10} aria-hidden />
                <span>Host</span>
              </span>
            )}
            {player.isBot && (
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.2 flex items-center gap-0.5">
                <Bot size={10} aria-hidden />
                <span>Bot</span>
              </span>
            )}
          </div>

          {/* Readiness Status Subtext */}
          <div className="flex items-center justify-center gap-1 text-[11px] pt-0.5">
            {!player.isConnected ? (
              <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Reconnecting...
              </span>
            ) : dominantBlocker ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 rounded-full px-2 py-0.5"
                aria-label={describeStartBlocker(dominantBlocker, { playerName: player.name, requiredOrientation })}
                title={describeStartBlocker(dominantBlocker, { playerName: player.name, requiredOrientation })}
              >
                <span className="animate-pulse">⏳</span>
                <span>{shortStartBlockerLabel(dominantBlocker)}</span>
              </span>
            ) : player.isReady ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400"
                aria-label="Ready"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Ready</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 dark:text-slate-400"
                aria-label="Waiting"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>Not Ready</span>
              </span>
            )}
          </div>
        </div>

        {/* Bot / Local Seat Host Actions: Edit on one side, Delete on other side */}
        {isHost && (player.isBot || player.isLocal) && (
          <div className="flex items-center justify-center gap-2 mt-1">
            {player.isBot && onRenameBot && (
              <button
                type="button"
                onClick={() => setShowRenameModal(true)}
                aria-label={`Rename ${player.name}`}
                title="Rename Bot"
                className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-stone-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/70 border border-stone-200/90 dark:border-slate-700 flex items-center justify-center text-stone-600 hover:text-amber-800 dark:text-slate-300 dark:hover:text-amber-300 transition active:scale-95 cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Pencil size={12} className="stroke-[2.5]" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (player.isBot && onRemoveBot) {
                  onRemoveBot(player.id);
                } else if (player.isLocal && onRemoveLocalPlayer) {
                  onRemoveLocalPlayer(player.id);
                }
              }}
              aria-label={player.isBot ? `Remove ${player.name}` : `Remove local seat ${player.name}`}
              title={player.isBot ? "Remove Bot" : "Remove Local Seat"}
              className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-stone-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/70 border border-stone-200/90 dark:border-slate-700 flex items-center justify-center text-stone-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 transition active:scale-95 cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 size={12} className="stroke-[2.5]" aria-hidden="true" />
            </button>
          </div>
        )}

        {showRenameModal && (
          <RenameBotModal
            isOpen={showRenameModal}
            botName={player.name}
            onClose={() => setShowRenameModal(false)}
            onSave={(newName) => {
              if (onRenameBot) {
                onRenameBot(player.id, newName);
              }
            }}
          />
        )}
      </motion.div>
    );
  }

  // Default Horizontal Row Variant (preserved for tests and table views)
  return (
    <motion.div
      data-seat-id={player.id}
      id={`seat-${player.id}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.28, ease: "backOut" }}
      className={`flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border transition-all ${
        player.isReady
          ? isMe
            ? "bg-[#FFFDF8] dark:bg-[#161F2E] border-emerald-400 dark:border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-400/30"
            : "bg-white/95 dark:bg-[#121927] border-emerald-400/70 dark:border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
          : isMe
          ? "bg-[#FFFDF8] dark:bg-[#161F2E] border-amber-300/80 dark:border-amber-500/50 shadow-xs ring-1 ring-amber-400/20"
          : "bg-white/90 dark:bg-[#121927] border-[#EEDBCA] dark:border-slate-800/80 hover:border-amber-200 dark:hover:border-slate-700 shadow-xs"
      }`}
    >
      {/* Left: Avatar + Details */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="relative shrink-0">
          <SeatAvatar
            avatar={player.avatar}
            name={player.name}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl shadow-xs"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#121927] ${
              player.isConnected
                ? "bg-emerald-500"
                : "bg-amber-500 animate-pulse"
            }`}
            title={
              player.isConnected
                ? "Connected & Online"
                : "Away / Reconnecting..."
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs sm:text-sm font-extrabold truncate max-w-[130px] sm:max-w-[180px] ${
                isMe
                  ? "text-[#2B3550] dark:text-amber-200"
                  : "text-[#2B3550] dark:text-slate-100"
              }`}
            >
              {player.name}
            </span>

            {isMe && (
              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 rounded-md px-1.5 py-0.5 shrink-0">
                You
              </span>
            )}

            {player.isHost ? (
              <span
                className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300/60 dark:border-amber-700/50 rounded-md px-1.5 py-0.5 flex items-center gap-0.5 shrink-0"
                title="Room Host"
              >
                <Crown size={12} aria-hidden />
                <span>Host</span>
              </span>
            ) : player.isBot ? (
              <span
                className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-0.5"
                title={player.bingoDifficulty ? `Bot (${player.bingoDifficulty})` : "AI Bot"}
              >
                <Bot size={12} aria-hidden />
                <span>Bot</span>
              </span>
            ) : (
              <span
                className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300/50 dark:border-emerald-700/40 rounded-md px-1.5 py-0.5 shrink-0"
                title="Table Player"
              >
                Player
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#5C4328] dark:text-slate-300 mt-0.5">
            {!player.isConnected ? (
              <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Reconnecting...
              </span>
            ) : colorBadgeHex ? (
              <span className="flex items-center gap-1 font-medium capitalize">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                  style={{ background: colorBadgeHex }}
                />
                <span>{colorBadgeLabel}</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-[#5C4328] dark:text-slate-300">
                {player.isBot ? "Bot" : player.isHost ? "Host" : "Player"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Readiness Badge & Host Action Menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        {dominantBlocker ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-700/50 rounded-full px-2.5 py-1 whitespace-nowrap"
            aria-label={describeStartBlocker(dominantBlocker, { playerName: player.name, requiredOrientation })}
            title={describeStartBlocker(dominantBlocker, { playerName: player.name, requiredOrientation })}
          >
            <span className="animate-pulse font-bold">⏳</span>
            <span>{shortStartBlockerLabel(dominantBlocker)}</span>
          </span>
        ) : player.isReady ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 rounded-full px-2.5 py-1 whitespace-nowrap shadow-2xs"
            aria-label="Ready"
          >
            <ReadyCheckmarkPencil size={13} />
            <span>Ready</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-700/50 rounded-full px-2.5 py-1 whitespace-nowrap"
            aria-label="Waiting"
          >
            <span className="animate-pulse font-bold">•••</span>
            <span>Waiting</span>
          </span>
        )}

        {isHost && (player.isBot || player.isLocal) && (
          <div className="flex items-center gap-1">
            {player.isBot && onRenameBot && (
              <button
                type="button"
                onClick={() => setShowRenameModal(true)}
                aria-label={`Rename ${player.name}`}
                title="Rename Bot"
                className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-stone-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/70 border border-stone-200/90 dark:border-slate-700 flex items-center justify-center text-stone-600 hover:text-amber-800 dark:text-slate-300 dark:hover:text-amber-300 transition active:scale-95 cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Pencil size={12} className="stroke-[2.5]" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (player.isBot && onRemoveBot) {
                  onRemoveBot(player.id);
                } else if (player.isLocal && onRemoveLocalPlayer) {
                  onRemoveLocalPlayer(player.id);
                }
              }}
              aria-label={player.isBot ? `Remove ${player.name}` : `Remove local seat ${player.name}`}
              title={player.isBot ? "Remove Bot" : "Remove Local Seat"}
              className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-stone-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/70 border border-stone-200/90 dark:border-slate-700 flex items-center justify-center text-stone-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 transition active:scale-95 cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 size={12} className="stroke-[2.5]" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {showRenameModal && (
        <RenameBotModal
          isOpen={showRenameModal}
          botName={player.name}
          onClose={() => setShowRenameModal(false)}
          onSave={(newName) => {
            if (onRenameBot) {
              onRenameBot(player.id, newName);
            }
          }}
        />
      )}
    </motion.div>
  );
}
