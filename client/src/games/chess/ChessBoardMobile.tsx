import React, { useMemo, useState } from "react";
import type { ChessBoardProps } from "./ChessBoard";
import { ChessBoardGrid, legalTargetsFor } from "./chess-shared";
import ChessSkinModal from "./ChessSkinModal";
import type { ChessBoardTheme, ChessPieceSet } from "@shared/types";
import { getSocket } from "../../lib/socket";

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
  const [skinModalOpen, setSkinModalOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [hintCount, setHintCount] = useState(3);

  const [localTheme, setLocalTheme] = useState<ChessBoardTheme>(state.boardTheme ?? "emerald");
  const [localPieceSet, setLocalPieceSet] = useState<ChessPieceSet>(state.pieceSet ?? "neo");

  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Player";
  }, [players]);

  const isWhite = state.whitePlayerId === selfId;
  const isBlack = state.blackPlayerId === selfId;
  const myColor = isBlack ? "b" : "w";
  const myTurn = state.turn === myColor && state.phase === "aiming";

  const opponentId = isWhite ? state.blackPlayerId : state.whitePlayerId;
  const opponentName = opponentId ? nameOf(opponentId) : "Vishy";
  const myName = nameOf(selfId);

  const opponentTime = isWhite ? state.blackTimeRemainingMs : state.whiteTimeRemainingMs;
  const myTime = isWhite ? state.whiteTimeRemainingMs : state.whiteTimeRemainingMs;
  const opponentColor = myColor === "w" ? "b" : "w";

  function formatTime(ms: number) {
    const secondsTotal = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(secondsTotal / 60);
    const secs = secondsTotal % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  /**
   * Recomputed only when the position or the selection changes — parsing a
   * FEN on every render would run on every clock tick, which is twice a
   * second.
   */
  const legalTargets = useMemo(
    () => legalTargetsFor(state.fen, selectedSquare),
    [state.fen, selectedSquare],
  );

  function handleSquareClick(sq: string) {
    if (!myTurn) return;

    if (!selectedSquare) {
      // Only select something that has somewhere to go. Selecting an empty
      // square or an opponent's piece used to light up the ring and show no
      // dots, which reads as "this piece cannot move" rather than "you did
      // not pick one of yours".
      if (legalTargetsFor(state.fen, sq).length > 0) setSelectedSquare(sq);
      return;
    }

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      return;
    }

    // Clicking another of your own movable pieces re-targets rather than
    // firing a move the server would only reject.
    if (!legalTargets.includes(sq)) {
      setSelectedSquare(legalTargetsFor(state.fen, sq).length > 0 ? sq : null);
      return;
    }

    onMove("move", { from: selectedSquare, to: sq, promotion: "q" });
    setSelectedSquare(null);
  }

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatText.trim()) return;
    const socket = getSocket();
    socket.emit("chat:send", { text: chatText.trim() });
    setChatText("");
  }

  const turnsList = useMemo(() => {
    const history = state.history;
    const pairs: Array<{ num: number; white?: string; black?: string }> = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: history[i]?.san,
        black: history[i + 1]?.san,
      });
    }
    return pairs;
  }, [state.history]);

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col bg-[#EEDCB9] text-[#3D2514] p-2 select-none justify-between gap-1.5 font-sans pb-16">
      {/* ──────────────── 1. Top Parchment Header Card ──────────────── */}
      <div className="rounded-2xl bg-gradient-to-b from-[#F9EEDD] via-[#F2DFBF] to-[#E5CB9E] p-2 border-2 border-[#B8966B] shadow-md space-y-1.5 shrink-0">
        {/* Header Title Row */}
        <div className="flex items-center justify-between border-b border-[#B8966B]/30 pb-1">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="w-7 h-7 rounded-full bg-[#E5CFB3] hover:bg-[#D5BFA3] border border-[#8B5A2B]/40 flex items-center justify-center font-black text-xs text-[#3D2514] shadow-sm transition cursor-pointer"
          >
            ←
          </button>

          {/* Title & Ribbon */}
          <div className="flex flex-col items-center">
            <h1 className="text-sm font-black font-serif tracking-wide text-[#2B1909] flex items-center gap-1">
              <span>👑</span> CHESS LOUNGE <span>✨</span>
            </h1>
            <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#2B6CB0] to-[#1A365D] text-white text-[8px] font-black uppercase tracking-widest shadow-sm">
              CLASSIC MODE
            </div>
          </div>

          {/* Audio & Settings icons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-[#E5CFB3] hover:bg-[#D5BFA3] border border-[#8B5A2B]/40 flex items-center justify-center text-xs text-[#3D2514] shadow-sm cursor-pointer"
            >
              🔊
            </button>
            <button
              type="button"
              onClick={() => setSkinModalOpen(true)}
              className="w-7 h-7 rounded-full bg-[#E5CFB3] hover:bg-[#D5BFA3] border border-[#8B5A2B]/40 flex items-center justify-center text-xs text-[#3D2514] shadow-sm cursor-pointer"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Player Versus Cards Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left Player Card (You) */}
          <div
            className={`p-1.5 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
              myTurn
                ? "bg-[#EDF7ED] border-[#4E9A51] ring-2 ring-[#4E9A51]/40"
                : "bg-[#FDF9F2]/90 border-[#C5A880]"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-200 border border-amber-400 flex items-center justify-center text-sm shrink-0 shadow-inner">
                🧑‍🦱
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-black text-[#2B1909] truncate">{myName}</span>
                  <span className="px-1 rounded text-[7px] font-black bg-[#38A169] text-white uppercase">
                    YOU
                  </span>
                </div>
                <span className="text-[9px] font-bold text-[#6D5432] block">
                  1450 🏆
                </span>
              </div>
            </div>
            <div
              className={`px-1.5 py-0.5 rounded-lg font-mono font-black text-xs shadow-inner ${
                myTurn ? "bg-[#C6F6D5] text-[#22543D]" : "bg-[#EFE6D5] text-[#4A3B2C]"
              }`}
            >
              {formatTime(myTime)}
            </div>
          </div>

          {/* Right Player Card (Opponent) */}
          <div
            className={`p-1.5 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
              state.turn === opponentColor && state.phase === "aiming"
                ? "bg-[#EDF7ED] border-[#4E9A51] ring-2 ring-[#4E9A51]/40"
                : "bg-[#FFF8F0]/90 border-[#E2B790]"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-orange-200 border border-orange-400 flex items-center justify-center text-sm shrink-0 shadow-inner">
                👨‍🦰
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-black text-[#2B1909] truncate block">{opponentName}</span>
                <span className="text-[9px] font-bold text-[#6D5432] block">
                  1420 🏆
                </span>
              </div>
            </div>
            <div className="px-1.5 py-0.5 rounded-lg bg-[#F4E3D0] text-[#5C3D1E] font-mono font-black text-xs shadow-inner">
              {formatTime(opponentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── 2. Main 8x8 Chess Board ──────────────── */}
      <div className="flex-1 flex items-center justify-center min-h-0 my-0.5 max-h-[44vh]">
        <ChessBoardGrid
          fen={state.fen}
          boardTheme={localTheme}
          myColor={myColor}
          myTurn={myTurn}
          lastMove={state.lastMove}
          inCheck={state.inCheck}
          selectedSquare={selectedSquare}
          legalTargets={legalTargets}
          pieceSet={localPieceSet}
          onSquareClick={handleSquareClick}
        />
      </div>

      {/* ──────────────── 3. Under Board Action Control Bar ──────────────── */}
      <div className="p-2 rounded-xl bg-[#2A1D16] text-[#F5E6D3] border border-[#5C3D26] shadow-md flex items-center justify-between gap-2 shrink-0">
        {/* Turn Indicator */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              myTurn ? "bg-[#38A169] animate-pulse" : "bg-amber-500"
            }`}
          />
          <div className="min-w-0">
            <span className="text-[11px] font-black uppercase text-[#E2E8F0] block truncate">
              {state.phase === "finished"
                ? `Match Ended • ${state.drawReason ?? "Result declared"}`
                : myTurn
                ? "YOUR TURN"
                : `${opponentName.toUpperCase()}'S TURN`}
            </span>
            <span className="text-[9px] text-stone-400 block truncate">
              {myTurn ? "Make your move" : "Waiting for opponent..."}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="px-2 py-1 rounded-lg bg-[#3D2C22] hover:bg-[#4E392C] border border-[#6D4E3A] text-amber-200 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition active:scale-95"
          >
            ↶ UNDO
          </button>
          <button
            type="button"
            onClick={() => setHintCount(Math.max(0, hintCount - 1))}
            className="relative px-2 py-1 rounded-lg bg-[#4A3925] hover:bg-[#5C4830] border border-[#8B6B40] text-amber-300 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition active:scale-95"
          >
            💡 HINT
            {hintCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-stone-950 font-mono text-[8px] font-black flex items-center justify-center">
                {hintCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onMove("resign")}
            className="px-2 py-1 rounded-lg bg-[#742A2A] hover:bg-[#9B2C2C] border border-[#9B2C2C] text-red-100 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition active:scale-95"
          >
            🚩 RESIGN
          </button>
        </div>
      </div>

      {/* ──────────────── 4. Middle 2-Column Dashboard Cards ──────────────── */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {/* Left Card: Move History */}
        <div className="p-2 rounded-xl bg-[#F5E8D3] border-2 border-[#D9C4A5] shadow-sm flex flex-col max-h-24">
          <div className="flex items-center justify-between border-b border-[#D9C4A5] pb-1 mb-1">
            <span className="text-[10px] font-black uppercase text-[#3D2514] flex items-center gap-1">
              📋 MOVE HISTORY
            </span>
            <span className="text-[9px] text-[#78593A] font-bold">
              {state.history.length} moves
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 text-[10px] font-mono text-[#3D2514]">
            {turnsList.length === 0 ? (
              <div className="text-[10px] text-[#78593A] italic flex items-center gap-1 pt-1">
                <span>📌</span> Game just started
              </div>
            ) : (
              turnsList.map((t) => (
                <div key={t.num} className="flex items-center justify-between px-1 py-0.5 rounded bg-[#EAD6B8]">
                  <span className="font-bold text-[#8B5A2B] w-5">{t.num}.</span>
                  <span className="flex-1">{t.white ?? "..."}</span>
                  <span className="flex-1 text-right text-[#6D4323]">{t.black ?? ""}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Card: Embedded Chat */}
        <div className="p-2 rounded-xl bg-[#F5E8D3] border-2 border-[#D9C4A5] shadow-sm flex flex-col max-h-24">
          <div className="flex items-center justify-between border-b border-[#D9C4A5] pb-1 mb-1">
            <span className="text-[10px] font-black uppercase text-[#3D2514] flex items-center gap-1">
              💬 CHAT
            </span>
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {players.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 text-[10px]">
            {messages.length === 0 ? (
              <div className="text-[#78593A] italic pt-0.5">
                <span className="font-bold text-[#C53030]">{opponentName}:</span> Good luck!
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={`m-${i}`} className="flex items-center gap-1">
                  <span className="font-bold text-[#6D4323]">{m.playerName}:</span>
                  <span className="text-[#2B1909] truncate">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex items-center gap-1 pt-1 border-t border-[#D9C4A5] mt-0.5">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-[#EAD6B8] border border-[#C5A880] rounded-lg px-1.5 py-0.5 text-[10px] text-[#2B1909] placeholder-[#78593A] focus:outline-none"
            />
            <button type="submit" className="p-0.5 text-xs">
              😊
            </button>
          </form>
        </div>
      </div>

      {/* ──────────────── 5. Bottom Fixed Parchment Navigation Bar ──────────────── */}
      <div className="fixed bottom-1 left-1.5 right-1.5 z-40 max-w-lg mx-auto p-1.5 rounded-2xl bg-gradient-to-r from-[#F5E6D3] via-[#EADBCE] to-[#F5E6D3] border-2 border-[#8B5A2B] shadow-2xl flex items-center justify-around text-[#3D2514]">
        <button
          type="button"
          onClick={() => {
            const socket = getSocket();
            socket.emit("chat:send", { text: "Good game!" });
          }}
          className="flex flex-col items-center gap-0.5 relative cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#E5CFB3] border border-[#8B5A2B]/40 text-[#3D2514] flex items-center justify-center text-sm shadow-md">
            💬
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider">CHAT</span>
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white font-mono text-[8px] font-black flex items-center justify-center border border-white">
              {messages.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            const socket = getSocket();
            socket.emit("chat:send", { text: "😊" });
          }}
          className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#E5CFB3] border border-[#8B5A2B]/40 text-[#3D2514] flex items-center justify-center text-sm shadow-md">
            😀
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider">EMOJI</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#E5CFB3] border border-[#8B5A2B]/40 text-[#3D2514] flex items-center justify-center text-sm shadow-md">
            🎙️
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider">VOICE</span>
        </button>

        <button
          type="button"
          onClick={() => setSkinModalOpen(true)}
          className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-[#E5CFB3] border border-[#8B5A2B]/40 text-[#3D2514] flex items-center justify-center text-sm shadow-md">
            👥
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider">PLAYERS</span>
        </button>

        <button
          type="button"
          onClick={() => setSkinModalOpen(true)}
          className="flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 relative"
        >
          <div className="w-8 h-8 rounded-full bg-[#3D2514] text-[#F5E6D3] flex items-center justify-center text-sm shadow-md">
            •••
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider">MORE</span>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 border border-white" />
        </button>
      </div>

      {/* Skin Customization Modal */}
      <ChessSkinModal
        isOpen={skinModalOpen}
        onClose={() => setSkinModalOpen(false)}
        currentTheme={localTheme}
        currentPieceSet={localPieceSet}
        onSelectTheme={(t) => {
          setLocalTheme(t);
          onMove("setOptions", { boardTheme: t });
        }}
        onSelectPieceSet={(s) => {
          setLocalPieceSet(s);
          onMove("setOptions", { pieceSet: s });
        }}
      />
    </div>
  );
}
