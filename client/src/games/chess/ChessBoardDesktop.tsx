import React, { useMemo, useState } from "react";
import type { ChessBoardProps } from "./ChessBoard";
import {
  ChessBoardGrid,
  ChessClockPill,
  CapturedPiecesRack,
  ChessMoveHistoryPanel,
} from "./chess-shared";
import InlineRoomRail from "../../components/InlineRoomRail";

export default function ChessBoardDesktop({
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

    onMove("move", { from: selectedSquare, to: sq, promotion: "q" });
    setSelectedSquare(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-stone-100 p-6 select-none flex items-start justify-center gap-6">
      {/* Left Column: Board & Clocks */}
      <div className="flex-1 max-w-[650px] flex flex-col gap-4">
        {/* Opponent Clock */}
        <ChessClockPill
          playerName={opponentName}
          timeMs={opponentTime}
          isActive={state.turn === opponentColor && state.phase === "aiming"}
          color={opponentColor}
        />

        {/* 8x8 Grid */}
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

        {/* My Clock */}
        <ChessClockPill
          playerName={myName}
          timeMs={myTime}
          isActive={myTurn}
          color={myColor}
        />
      </div>

      {/* Right Column: Grandmaster Arena Dashboard */}
      <aside className="w-80 shrink-0 sticky top-6 flex flex-col gap-4">
        {/* Captured Pieces */}
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-amber-500/20 shadow-xl backdrop-blur-md space-y-2">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">
            ♟ Captured Material
          </h3>
          <CapturedPiecesRack captured={state.capturedPieces} />
        </div>

        {/* Game Actions */}
        {state.phase === "aiming" && (
          <div className="p-4 rounded-2xl bg-stone-900/80 border border-amber-500/20 shadow-xl backdrop-blur-md space-y-3">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">
              ⚔️ Match Actions
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onMove("resign")}
                className="flex-1 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                🏳️ Resign
              </button>
              <button
                type="button"
                onClick={() => onMove("offerDraw")}
                className="flex-1 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                🤝 Offer Draw
              </button>
            </div>
          </div>
        )}

        {/* SAN Move History */}
        <ChessMoveHistoryPanel history={state.history} />

        {/* Room Rail */}
        {roomCode && (
          <div className="rounded-2xl overflow-hidden border border-amber-500/20 shadow-xl">
            <InlineRoomRail
              code={roomCode}
              game="chess"
              phase={roomPhase ?? "playing"}
              players={players}
              selfId={selfId}
              messages={messages}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
