import React from "react";
import type { CarromPublicState, Player } from "@shared/types";
import { LetterAvatar } from "./carrom-shared";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";

interface CarromMatchHudProps {
  state: CarromPublicState;
  players: Player[];
  selfId: string;
  nameOf: (id: string) => string;
  avatarOf: (id: string) => string | undefined;
  stakeCoins?: number;
}

/**
 * Avatar enclosed in Miniclip's signature circular countdown timer ring.
 * Features 3 color transitions: Emerald (>10s) -> Amber (5-10s) -> Urgent Pulsing Crimson (<=5s).
 */
function MiniclipAvatarTimer({
  name,
  avatar,
  isWhite,
  size = 44,
  isSelf,
  isTurn,
  turnDeadline,
  secondsLeft,
  totalSeconds = 30,
}: {
  name: string;
  avatar?: string;
  isWhite: boolean;
  size?: number;
  isSelf?: boolean;
  isTurn: boolean;
  turnDeadline: number | null | undefined;
  secondsLeft: number;
  /** The room's configured shot-timer length (15/30/45s) — the ring's denominator. Defaults to 30 for older payloads that predate `shotTimerSeconds`. */
  totalSeconds?: number;
}) {
  const radius = 23;
  const circumference = 2 * Math.PI * radius; // ~144.51
  const fraction = turnDeadline ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 1;
  const strokeDashoffset = circumference * (1 - fraction);

  const isCritical = isTurn && !!turnDeadline && secondsLeft <= 5 && secondsLeft > 0;
  const isWarning = isTurn && !!turnDeadline && secondsLeft <= 10 && secondsLeft > 5;

  let ringColor = "#22c55e"; // Emerald
  let glowColor = "rgba(34, 197, 94, 0.6)";

  if (isCritical) {
    ringColor = "#ef4444"; // Urgent Red
    glowColor = "rgba(239, 68, 68, 0.85)";
  } else if (isWarning) {
    ringColor = "#f59e0b"; // Amber
    glowColor = "rgba(245, 158, 11, 0.7)";
  } else if (!turnDeadline && isTurn) {
    ringColor = "#fbbf24"; // Gold steady
    glowColor = "rgba(251, 191, 36, 0.5)";
  }

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size + 10, height: size + 10 }}>
      {/* Dynamic SVG Circular Countdown Ring */}
      {isTurn && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 52 52"
          style={{
            filter: `drop-shadow(0 0 ${isCritical ? "8px" : "4px"} ${glowColor})`,
            animation: isCritical ? "pulse 0.8s ease-in-out infinite" : undefined,
          }}
        >
          {/* Faint background track */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="3.5"
            fill="none"
          />
          {/* Live countdown stroke */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            stroke={ringColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={turnDeadline ? strokeDashoffset : 0}
            strokeLinecap="round"
            fill="none"
            className="transition-[stroke-dashoffset] duration-250 ease-linear"
          />
        </svg>
      )}

      {/* Avatar Container */}
      <div className={`relative rounded-full p-0.5 transition-all duration-300 ${
        isTurn ? "" : "border border-amber-900/40 opacity-90"
      }`}>
        <LetterAvatar
          name={name}
          avatar={avatar}
          isWhite={isWhite}
          size={size}
          isSelf={isSelf}
          isTurn={isTurn}
        />
      </div>

      {/* Numerical countdown badge when turn is active */}
      {isTurn && !!turnDeadline && secondsLeft > 0 && (
        <div
          className={`absolute -bottom-1 -right-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums border shadow-md flex items-center justify-center ${
            isCritical
              ? "bg-red-600 text-white border-white/60 animate-bounce"
              : isWarning
              ? "bg-amber-500 text-slate-950 border-amber-200"
              : "bg-emerald-600 text-white border-white/40"
          }`}
        >
          {secondsLeft}
        </div>
      )}
    </div>
  );
}

export function CarromMatchHud({
  state,
  players,
  selfId,
  nameOf,
  avatarOf,
  stakeCoins = 5000,
}: CarromMatchHudProps) {
  const seats = state.seats;
  const p1Seat = seats[0];
  const p2Seat = seats[1];

  const p1Name = p1Seat ? nameOf(p1Seat.playerId) : "Player 1";
  const p2Name = p2Seat ? nameOf(p2Seat.playerId) : "Player 2";

  const p1Avatar = p1Seat ? avatarOf(p1Seat.playerId) : undefined;
  const p2Avatar = p2Seat ? avatarOf(p2Seat.playerId) : undefined;

  const p1IsTurn = p1Seat?.playerId === state.turnPlayerId && state.phase === "aiming";
  const p2IsTurn = p2Seat?.playerId === state.turnPlayerId && state.phase === "aiming";

  const isMyTurn = state.turnPlayerId === selfId && state.phase === "aiming";
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);

  // Contextual status pill text matching the reference design
  let statusText = "Pot all your pucks to win the match";
  if (state.mode === "discpool") {
    statusText = "Disc Pool: First to clear all their pucks wins";
  } else if (state.mode === "freestyle") {
    statusText = "Freestyle: Queen=25, White=10, Black=5";
  }

  if (state.phase === "aiming") {
    statusText = isMyTurn
      ? "Your Turn — Aim and Shoot"
      : `${nameOf(state.turnPlayerId ?? "")} is aiming...`;
  } else if (state.phase === "resolving") {
    statusText = state.lastCombo ? `${state.lastCombo}` : "Coins are rolling...";
  } else if (state.phase === "finished") {
    const winnerName = state.winnerId ? nameOf(state.winnerId) : null;
    statusText = winnerName ? `🏆 ${winnerName} won the match!` : "🤝 It's a draw!";
  }

  const modeLabel = state.mode === "discpool" ? "DISC POOL" : state.mode === "freestyle" ? "FREESTYLE" : "CLASSIC";

  // Format stakes as e.g. "5 000"
  const formattedPot = stakeCoins.toLocaleString().replace(/,/g, " ");

  return (
    <header className="w-full flex flex-col items-center pt-2 pb-1 px-3 flex-shrink-0 z-20" aria-label="Match Status">
      {/* Top Face-off Header Row */}
      <div className="w-full max-w-md flex items-center justify-between gap-2">
        {/* Left Player Card (Seat 0) */}
        {p1Seat && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MiniclipAvatarTimer
              name={p1Name}
              avatar={p1Avatar}
              isWhite={p1Seat.color === "white"}
              size={42}
              isSelf={p1Seat.playerId === selfId}
              isTurn={p1IsTurn}
              turnDeadline={state.turnDeadline}
              secondsLeft={secondsLeft}
              totalSeconds={state.shotTimerSeconds ?? 30}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-100 truncate max-w-[90px] drop-shadow-sm">
                {p1Name}
              </span>
              {state.mode === "freestyle" ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black text-amber-300 tabular-nums drop-shadow-sm">
                    {p1Seat.score ?? 0}{state.targetScore ? `/${state.targetScore}` : ""} pts
                  </span>
                  <span className="text-xs" title="Freestyle points">🎯</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black text-white tabular-nums drop-shadow-sm">
                    {p1Seat.remaining ?? p1Seat.score ?? 0}
                  </span>
                  {/* Puck Dot */}
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{
                      background: p1Seat.color === "white"
                        ? "radial-gradient(circle at 35% 35%, #FFFDF7, #E3D3B4)"
                        : "radial-gradient(circle at 35% 35%, #A855F7, #6B21A8)",
                      border: "1px solid rgba(255,255,255,0.4)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    }}
                    title={`${p1Seat.color} pucks remaining`}
                  />
                  {state.queenPendingFor === p1Seat.playerId && (
                    <span className="text-[10px] bg-amber-500/90 text-white font-black px-1 rounded animate-pulse" title="Must cover queen!">
                      👑
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center Stakes, Mode & Pot Stack */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 px-2">
          <span className="text-[9px] font-black tracking-widest text-amber-300/90 uppercase mb-0.5 drop-shadow-sm">
            {modeLabel}
          </span>
          <div className="relative flex items-center justify-center -mb-0.5">
            {/* 3D Stack of Gold Coins SVG */}
            <svg width="36" height="28" viewBox="0 0 48 36" fill="none" aria-hidden="true">
              <ellipse cx="24" cy="28" rx="16" ry="6" fill="#78350F" />
              <ellipse cx="24" cy="26" rx="16" ry="6" fill="#B45309" />
              <ellipse cx="24" cy="24" rx="16" ry="6" fill="#D97706" />
              <ellipse cx="24" cy="22" rx="15" ry="5.5" fill="#FBBF24" />
              <ellipse cx="24" cy="21" rx="12" ry="4" fill="#FDE68A" />

              <ellipse cx="20" cy="18" rx="14" ry="5" fill="#78350F" />
              <ellipse cx="20" cy="16" rx="14" ry="5" fill="#B45309" />
              <ellipse cx="20" cy="14" rx="14" ry="5" fill="#D97706" />
              <ellipse cx="20" cy="12" rx="13" ry="4.5" fill="#FBBF24" />
              <ellipse cx="20" cy="11" rx="10" ry="3.5" fill="#FDE68A" />

              <ellipse cx="27" cy="14" rx="13" ry="5" fill="#78350F" />
              <ellipse cx="27" cy="12" rx="13" ry="5" fill="#B45309" />
              <ellipse cx="27" cy="10" rx="13" ry="5" fill="#D97706" />
              <ellipse cx="27" cy="8" rx="12" ry="4.5" fill="#FBBF24" />
              <ellipse cx="27" cy="7" rx="9" ry="3" fill="#FDE68A" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] font-mono">
            {formattedPot}
          </span>
        </div>

        {/* Right Player Card (Seat 1) */}
        {p2Seat ? (
          <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
            <div className="flex flex-col items-end min-w-0">
              <span className="text-xs font-bold text-slate-100 truncate max-w-[90px] drop-shadow-sm">
                {p2Name}
              </span>
              {state.mode === "freestyle" ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs" title="Freestyle points">🎯</span>
                  <span className="text-sm font-black text-amber-300 tabular-nums drop-shadow-sm">
                    {p2Seat.score ?? 0}{state.targetScore ? `/${state.targetScore}` : ""} pts
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {state.queenPendingFor === p2Seat.playerId && (
                    <span className="text-[10px] bg-amber-500/90 text-white font-black px-1 rounded animate-pulse" title="Must cover queen!">
                      👑
                    </span>
                  )}
                  {/* Black Puck Dot */}
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, #4B5563, #111827)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    }}
                    title={`${p2Seat.color} pucks remaining`}
                  />
                  <span className="text-sm font-black text-white tabular-nums drop-shadow-sm">
                    {p2Seat.remaining ?? p2Seat.score ?? 0}
                  </span>
                </div>
              )}
            </div>
            <MiniclipAvatarTimer
              name={p2Name}
              avatar={p2Avatar}
              isWhite={p2Seat.color === "white"}
              size={42}
              isSelf={p2Seat.playerId === selfId}
              isTurn={p2IsTurn}
              turnDeadline={state.turnDeadline}
              secondsLeft={secondsLeft}
              totalSeconds={state.shotTimerSeconds ?? 30}
            />
          </div>
        ) : (
          <div className="flex-1 flex justify-end">
            <span className="text-xs font-semibold text-slate-400 italic">Waiting...</span>
          </div>
        )}
      </div>

      {/* Floating Status Pill Toast */}
      <div className="mt-1.5 px-4 py-1 rounded-full bg-black/75 border border-white/10 shadow-lg backdrop-blur-md flex items-center justify-center">
        <span className="text-[11px] font-bold text-white tracking-tight drop-shadow-sm">
          {statusText}
        </span>
      </div>
    </header>
  );
}

export default CarromMatchHud;
