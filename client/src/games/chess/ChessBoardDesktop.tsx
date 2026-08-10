import React, { useMemo, useState } from "react";
import type { ChessBoardProps } from "./ChessBoard";
import {
  ChessBoardGrid,
  ChessMoveHistoryPanel,
} from "./chess-shared";
import ChessSkinModal from "./ChessSkinModal";
import type { ChessBoardTheme, ChessPieceSet } from "@shared/types";
import { getSocket } from "../../lib/socket";

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
  const [skinModalOpen, setSkinModalOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [chatText, setChatText] = useState("");

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
  const opponentName = opponentId ? nameOf(opponentId) : "Opponent";
  const myName = nameOf(selfId);

  const opponentTime = isWhite ? state.blackTimeRemainingMs : state.whiteTimeRemainingMs;
  const myTime = isWhite ? state.whiteTimeRemainingMs : state.whiteTimeRemainingMs;
  const opponentColor = myColor === "w" ? "b" : "w";

  function formatTime(ms: number) {
    const secondsTotal = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(secondsTotal / 60);
    const secs = secondsTotal % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

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

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatText.trim()) return;
    const socket = getSocket();
    socket.emit("chat:send", { text: chatText.trim() });
    setChatText("");
  }

  return (
    <div className="min-h-screen bg-[#110C0A] text-[#F3E5D8] flex flex-col p-4 select-none justify-between font-sans">
      {/* ──────────────── Top Navigation Header ──────────────── */}
      <header className="flex items-center justify-between px-2 pb-3">
        {/* Leave Room Pill */}
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-md"
        >
          ← LEAVE ROOM
        </button>

        {/* Center Lounge Title */}
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
            CHESS LOUNGE
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 font-mono">
            GRANDMASTER 2026 EDITION • {state.phase === "aiming" ? "LIVE MATCH" : "MATCH ENDED"}
          </span>
        </div>

        {/* Right Top Utilities */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm shadow-md transition cursor-pointer"
          >
            🎵
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm shadow-md transition cursor-pointer"
          >
            🔊
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm shadow-md transition cursor-pointer"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ──────────────── 3-Column Arena Grid ──────────────── */}
      <div className="flex-1 grid grid-cols-[240px_1fr_340px] gap-6 items-start">
        {/* ────── Left Column: Game Info & Rules Panel ────── */}
        <aside className="flex flex-col gap-4">
          {/* Current Game Details */}
          <div className="p-4 rounded-3xl bg-[#1A1412] border border-amber-500/20 shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5 border-b border-amber-500/10 pb-2">
              🏆 CURRENT GAME
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Mode</span>
                <span className="font-bold text-amber-200">Blitz (3+2)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Match</span>
                <span className="font-bold text-amber-200">1v1 Standard</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Rating</span>
                <span className="font-bold text-amber-200">Rated Lounge</span>
              </div>
            </div>
          </div>

          {/* Captured Pieces & Score */}
          <div className="p-4 rounded-3xl bg-[#1A1412] border border-amber-500/20 shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5 border-b border-amber-500/10 pb-2">
              ♟ SCORE BOARD
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/20">
                <span className="font-bold text-stone-200 truncate">{myName}</span>
                <span className="font-mono font-black text-amber-400">{state.capturedPieces.white.length} pts</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-950/30 border border-white/5">
                <span className="font-bold text-stone-300 truncate">{opponentName}</span>
                <span className="font-mono font-black text-amber-400">{state.capturedPieces.black.length} pts</span>
              </div>
            </div>
          </div>

          {/* Quick How to Play Card */}
          <div className="p-4 rounded-3xl bg-[#1A1412] border border-amber-500/20 shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5 border-b border-amber-500/10 pb-2">
              ❓ HOW TO PLAY
            </h3>
            <p className="text-[11px] leading-relaxed text-stone-400">
              Checkmate the opponent&apos;s King to win. Protect your pieces and manage your clock time.
            </p>
            <button
              type="button"
              onClick={() => setRulesOpen(!rulesOpen)}
              className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              VIEW RULES 📖
            </button>
          </div>
        </aside>

        {/* ────── Center Column: Versus Cards & Board ────── */}
        <main className="flex flex-col items-center gap-4">
          {/* Player Versus Cards Header */}
          <div className="w-full max-w-[620px] grid grid-cols-2 gap-4">
            {/* My Card (Left) */}
            <div
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                myTurn
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : "bg-[#1A1412] border-amber-500/20"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-lg font-black shrink-0">
                  👑
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-amber-100 truncate">{myName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500 text-stone-950 uppercase">
                      YOU
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400/80 block">
                    {myColor === "w" ? "⚪ WHITE" : "⚫ BLACK"}
                  </span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-xl bg-black/40 border border-amber-500/30 font-mono font-black text-sm text-amber-300">
                ⏱ {formatTime(myTime)}
              </div>
            </div>

            {/* Opponent Card (Right) */}
            <div
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                state.turn === opponentColor && state.phase === "aiming"
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : "bg-[#1A1412] border-amber-500/20"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-stone-800 border border-white/10 flex items-center justify-center text-lg font-black shrink-0">
                  ⚔️
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-amber-100 truncate block">{opponentName}</span>
                  <span className="text-[10px] font-bold text-amber-400/80 block">
                    {opponentColor === "w" ? "⚪ WHITE" : "⚫ BLACK"}
                  </span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-xl bg-black/40 border border-amber-500/30 font-mono font-black text-sm text-amber-300">
                ⏱ {formatTime(opponentTime)}
              </div>
            </div>
          </div>

          {/* Main 8x8 Chess Board */}
          <ChessBoardGrid
            fen={state.fen}
            boardTheme={localTheme}
            myColor={myColor}
            myTurn={myTurn}
            lastMove={state.lastMove}
            inCheck={state.inCheck}
            selectedSquare={selectedSquare}
            onSquareClick={handleSquareClick}
          />

          {/* Under Board Turn Status Bar */}
          <div className="w-full max-w-[620px] px-4 py-2.5 rounded-2xl bg-[#1A1412] border border-amber-500/20 flex items-center justify-between text-xs font-bold shadow-xl">
            <span className="text-amber-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {state.phase === "finished"
                ? `Game Over • ${state.drawReason ?? "Winner declared"}`
                : myTurn
                ? "Your Turn — Select a piece to move"
                : `${opponentName}'s Turn — Waiting for move...`}
            </span>

            {state.phase === "aiming" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMove("resign")}
                  className="px-3 py-1 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/30 text-red-200 text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Resign
                </button>
                <button
                  type="button"
                  onClick={() => onMove("offerDraw")}
                  className="px-3 py-1 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 text-amber-200 text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Draw
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ────── Right Column: Lounge Rules, Chat & Theme Skins Button ────── */}
        <aside className="flex flex-col gap-4">
          {/* Rules Summary / Move History */}
          <div className="p-4 rounded-3xl bg-[#1A1412] border border-amber-500/20 shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5 border-b border-amber-500/10 pb-2">
              📜 CHESS LOUNGE RULES
            </h3>
            <ul className="text-[11px] space-y-1.5 text-stone-400 list-disc list-inside">
              <li>Click a piece to highlight legal move target dots.</li>
              <li>Pawns promote automatically to Queen at the 8th rank.</li>
              <li>Castling and en-passant are automatically validated.</li>
            </ul>
            <ChessMoveHistoryPanel history={state.history} />
          </div>

          {/* Quick Social Toolbar */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-[#1A1412] border border-amber-500/20">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="w-10 h-10 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm transition cursor-pointer"
              title="Copy Room Link"
            >
              🔗
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm transition cursor-pointer"
              title="Invite Friends"
            >
              👥
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm transition cursor-pointer"
              title="Toggle Voice"
            >
              🎙️
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm transition cursor-pointer"
              title="Chat"
            >
              💬
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm transition cursor-pointer"
              title="Reactions"
            >
              😊
            </button>
          </div>

          {/* Embedded Live Chat */}
          <div className="p-4 rounded-3xl bg-[#1A1412] border border-amber-500/20 shadow-2xl flex flex-col gap-3 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5">
                💬 LIVE CHAT
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex-1 max-h-36 overflow-y-auto space-y-2 text-xs font-sans">
              {messages.length === 0 ? (
                <span className="text-stone-500 italic text-[11px]">No chat messages yet. Say hello!</span>
              ) : (
                messages.map((m, i) => (
                  <div key={`msg-${i}`} className="flex flex-col bg-stone-900/60 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-[11px]">{m.playerName}</span>
                      <span className="text-[9px] text-stone-500">
                        {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="text-stone-200 mt-0.5">{m.text}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-stone-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-amber-500 text-stone-950 font-black text-xs hover:bg-amber-400 transition cursor-pointer"
              >
                ➔
              </button>
            </form>
          </div>

          {/* Purple Glowing Custom Skins / Themes Button */}
          <button
            type="button"
            onClick={() => setSkinModalOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_25px_rgba(147,51,234,0.4)] border border-purple-400/40 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            👕 CUSTOM SKINS & THEMES
          </button>
        </aside>
      </div>

      {/* Theme Customization Modal */}
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
