import React from "react";
import type { CarromPublicState, Player } from "@shared/types";
import { LetterAvatar } from "./carrom-shared";

interface CarromMatchHudProps {
  state: CarromPublicState;
  players: Player[];
  selfId: string;
  nameOf: (id: string) => string;
  avatarOf: (id: string) => string | undefined;
  stakeCoins?: number;
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

  const p1IsTurn = p1Seat?.playerId === state.turnPlayerId && state.phase !== "finished";
  const p2IsTurn = p2Seat?.playerId === state.turnPlayerId && state.phase !== "finished";

  const isMyTurn = state.turnPlayerId === selfId && state.phase === "aiming";

  // Contextual status pill text matching the reference design
  let statusText = "Pot all your pucks to win the match";
  if (state.phase === "aiming") {
    statusText = isMyTurn
      ? "Your Turn — Aim and Shoot"
      : `${nameOf(state.turnPlayerId ?? "")} is aiming...`;
  } else if (state.phase === "resolving") {
    statusText = "Coins are rolling...";
  } else if (state.phase === "finished") {
    const winnerName = state.winnerId ? nameOf(state.winnerId) : null;
    statusText = winnerName ? `🏆 ${winnerName} won the match!` : "Match finished!";
  }

  // Format stakes as e.g. "5 000"
  const formattedPot = stakeCoins.toLocaleString().replace(/,/g, " ");

  return (
    <header className="w-full flex flex-col items-center pt-2 pb-1 px-3 flex-shrink-0 z-20" aria-label="Match Status">
      {/* Top Face-off Header Row */}
      <div className="w-full max-w-md flex items-center justify-between gap-2">
        {/* Left Player Card (Seat 0) */}
        {p1Seat && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`relative rounded-xl p-0.5 transition-all duration-300 ${
              p1IsTurn ? "ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "border border-amber-900/40"
            }`}>
              <LetterAvatar
                name={p1Name}
                avatar={p1Avatar}
                isWhite={p1Seat.color === "white"}
                size={42}
                isSelf={p1Seat.playerId === selfId}
                isTurn={p1IsTurn}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-100 truncate max-w-[90px] drop-shadow-sm">
                {p1Name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-white tabular-nums drop-shadow-sm">
                  {p1Seat.remaining ?? p1Seat.score ?? 0}
                </span>
                {/* Purple / White Puck Dot */}
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
              </div>
            </div>
          </div>
        )}

        {/* Center Stakes & Pot Stack */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 px-2">
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
              <div className="flex items-center gap-1.5 mt-0.5">
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
            </div>
            <div className={`relative rounded-xl p-0.5 transition-all duration-300 ${
              p2IsTurn ? "ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" : "border border-amber-900/40"
            }`}>
              <LetterAvatar
                name={p2Name}
                avatar={p2Avatar}
                isWhite={p2Seat.color === "white"}
                size={42}
                isSelf={p2Seat.playerId === selfId}
                isTurn={p2IsTurn}
              />
            </div>
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
