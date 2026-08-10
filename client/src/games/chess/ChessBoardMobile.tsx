import React, { useMemo, useState } from "react";
import type { ChessBoardProps } from "./ChessBoard";
import {
  ChessBoardGrid,
  ChessClockPill,
  CapturedPiecesRack,
  ChessMoveHistoryPanel,
} from "./chess-shared";
import InlineRoomRail from "../../components/InlineRoomRail";

export default function ChessBoardMobile({
  state,
  players,
  selfId,
  messages = [],
  roomCode,
  roomPhase,
  onMove,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);

  const isWhite = state.whitePlayerId === selfId;
  const isBlack = state.blackPlayerId === selfId;
  const myColor = isBlack ? "b" : "w";
  const myTurn = state.turn === myColor && state.phase === "aiming";

  const opponentId = isWhite ? state.blackPlayerId : state.whitePlayerId;
  const opponentName = opponentId ? nameOf(opponentId) : "Opponent";
  const myName = nameOf(selfId);

  const opponentTime = isWhite ? state.blackTimeRemainingMs : state.whiteTimeRemainingMs;
  const myTime = isWhite ? state.whiteTimeRemainingMs : state.blackTimeRemainingMs;
  const opponentColor = myColor === "w" ? "b" : "w";

  function handleSquareClick(sq: string) {
    if (!myTurn) return;

    if (!selectedSquare) {
      setSelectedSquare(sq);
      return;
    }

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      return;
    }

    // Attempt move
    onMove("move", { from: selectedSquare, to: sq, promotion: "q" });
    setSelectedSquare(null);
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-950 text-stone-100 p-3 select-none justify-between gap-3">
      {/* Top Header — Opponent Clock */}
      <div className="flex flex-col gap-2">
        <ChessClockPill
          playerName={opponentName}
          timeMs={opponentTime}
          isActive={state.turn === opponentColor && state.phase === "aiming"}
          color={opponentColor}
        />
        <CapturedPiecesRack captured={state.capturedPieces} />
      </div>

      {/* Main Chess Board */}
      <div className="flex-1 flex items-center justify-center py-1">
        <ChessBoardGrid
          fen={state.fen}
          boardTheme={state.boardTheme}
          myColor={myColor}
          myTurn={myTurn}
          lastMove={state.lastMove}
          inCheck={state.inCheck}
          selectedSquare={selectedSquare}
          onSquareClick={handleSquareClick}
        />
      </div>

      {/* Bottom Header — My Clock & Status */}
      <div className="flex flex-col gap-3">
        <ChessClockPill
          playerName={myName}
          timeMs={myTime}
          isActive={myTurn}
          color={myColor}
        />

        {/* Resign / Draw Actions */}
        {state.phase === "aiming" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMove("resign")}
              className="flex-1 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
            >
              🏳️ Resign
            </button>
            <button
              type="button"
              onClick={() => onMove("offerDraw")}
              className="flex-1 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
            >
              🤝 Offer Draw
            </button>
          </div>
        )}

        {/* Move History Log */}
        <ChessMoveHistoryPanel history={state.history} />
      </div>

      {/* Room Rail */}
      {roomCode && (
        <InlineRoomRail
          code={roomCode}
          game="chess"
          phase={roomPhase ?? "playing"}
          players={players}
          selfId={selfId}
          messages={messages}
        />
      )}
    </div>
  );
}
