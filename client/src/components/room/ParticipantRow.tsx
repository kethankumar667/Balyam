import type { Player } from "@shared/types";
import { Crown, Bot } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import SeatAvatar from "../profile/SeatAvatar";
import ParticipantActionMenu from "./ParticipantActionMenu";
import { ReadyCheckmarkPencil } from "../../animations/app/ReadyCheckmarkDraw";
import { COLOR_HEX } from "../../games/ludo/board-layout";
import { COIN_COLOR_HEX } from "../CoinColorPicker";
import { getPlayerThemeByColor } from "../../games/dotsboxes/dotsboxes-theme";

export default function ParticipantRow({
  player,
  selfId,
  isHost,
  isNewlyJoined = false,
  onRemoveBot,
  onRemoveLocalPlayer,
  onRenameBot,
}: {
  player: Player;
  selfId: string | null;
  isHost: boolean;
  isNewlyJoined?: boolean;
  onRemoveBot?: (botId: string) => void;
  onRemoveLocalPlayer?: (localId: string) => void;
  onRenameBot?: (botId: string, newName: string) => void;
}) {
  const isMe = player.id === selfId;
  const reduceMotion = useReducedMotion();

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

  // Animation parameters tailored for human vs bot join distinction
  const isBot = Boolean(player.isBot);
  const initialMotion = reduceMotion
    ? { opacity: 0 }
    : isNewlyJoined
    ? isBot
      ? { opacity: 0, scale: 0.82 }
      : { opacity: 0, x: 28, scale: 0.96 }
    : { opacity: 0, y: 10, scale: 0.98 };

  const animateMotion = reduceMotion
    ? { opacity: 1 }
    : isNewlyJoined
    ? isBot
      ? {
          opacity: 1,
          scale: [0.82, 1.05, 1],
          boxShadow: [
            "0 0 0 rgba(6,182,212,0)",
            "0 0 24px rgba(6,182,212,0.45)",
            "0 0 0 rgba(6,182,212,0)",
          ],
        }
      : {
          opacity: 1,
          x: 0,
          scale: 1,
          boxShadow: [
            "0 0 0 rgba(16,185,129,0)",
            "0 0 24px rgba(16,185,129,0.45)",
            "0 0 0 rgba(16,185,129,0)",
          ],
        }
    : { opacity: 1, y: 0, scale: 1 };

  const transitionMotion: Transition = isNewlyJoined
    ? isBot
      ? { duration: 0.45, ease: "easeOut" }
      : { duration: 0.4, type: "spring", stiffness: 380, damping: 26 }
    : { duration: 0.28, ease: "backOut" };

  return (
    <motion.div
      data-seat-id={player.id}
      data-is-bot={isBot ? "true" : "false"}
      data-is-new={isNewlyJoined ? "true" : "false"}
      id={`seat-${player.id}`}
      initial={initialMotion}
      animate={animateMotion}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={transitionMotion}
      className={`flex items-center justify-between gap-2.5 p-3 rounded-2xl border transition-all ${
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
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Avatar with live presence indicator */}
        <div className="relative shrink-0">
          <SeatAvatar
            avatar={player.avatar}
            name={player.name}
            className="w-9 h-9 rounded-xl shadow-xs"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-[#121927] ${
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

        {/* Player Name and Role Badges */}
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

            {player.isHost && (
              <span
                className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300/60 dark:border-amber-700/50 rounded-md px-1.5 py-0.5 flex items-center gap-0.5 shrink-0"
                title="Room Host"
              >
                <Crown size={12} aria-hidden />
                <span>Host</span>
              </span>
            )}

            {player.isBot && (
              <span
                className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-0.5"
                title={player.bingoDifficulty ? `Bot (${player.bingoDifficulty})` : "AI Bot"}
              >
                <Bot size={12} aria-hidden />
                <span>Bot</span>
              </span>
            )}

            {player.isLocal && (
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/70 rounded-md px-1.5 py-0.5 shrink-0">
                Local
              </span>
            )}
          </div>

          {/* Subtext: Connection / Color info */}
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
                {player.isBot ? "AI Player" : "Human Player"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Readiness Badge & Host Action Menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        {player.isReady ? (
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

        {/* Action menu for host to manage bots or local seats */}
        {isHost && (player.isBot || player.isLocal) && (
          <ParticipantActionMenu
            player={player}
            isHost={isHost}
            onRemoveBot={onRemoveBot}
            onRemoveLocalPlayer={onRemoveLocalPlayer}
            onRenameBot={onRenameBot}
          />
        )}
      </div>
    </motion.div>
  );
}
