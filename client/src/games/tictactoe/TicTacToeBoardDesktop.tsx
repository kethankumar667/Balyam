import React, { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../lib/socket";
import { HapticsManager } from "../../services/HapticsManager";
import { tictactoeAudio } from "./tictactoeAudio";
import { getTicTacToeTheme, type TicTacToeThemeId } from "./tictactoeThemes";
import { TicTacToeGrid } from "./TicTacToeGrid";
import { TicTacToeTutorialModal } from "./TicTacToeTutorialModal";
import type { TicTacToeBoardProps } from "./TicTacToeBoardProps";
import { useTicTacToeMove } from "./useTicTacToeMove";
import { describeTicTacToeOutcome } from "./tictactoeOutcome";
import Chat from "../../components/Chat";
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { ArrowLeft, Volume2, VolumeX, HelpCircle, Palette, RotateCcw, Orbit, Zap, Timer } from "lucide-react";

export default function TicTacToeBoardDesktop({
  state,
  players,
  selfId,
  messages,
  roomCode,
  onLeave,
}: TicTacToeBoardProps) {
  const [themeId, setThemeId] = useState<TicTacToeThemeId>("neo_tokyo");
  const [isMuted, setIsMuted] = useState(tictactoeAudio.isMuted());
  const [showTutorial, setShowTutorial] = useState(false);

  const theme = useMemo(() => getTicTacToeTheme(themeId), [themeId]);

  const selfMark = state.playerMarks[selfId];
  const { isMyTurn, placeMark } = useTicTacToeMove({ state, selfId });
  const isOver = state.phase === "finished";
  const outcome = useMemo(() => describeTicTacToeOutcome(state, selfId, players), [state, selfId, players]);
  const isSpectator = selfMark === undefined;

  const p1 = players.find((p) => p.id === state.playerOrder[0]) ?? players[0];
  const p2 = players.find((p) => p.id === state.playerOrder[1]) ?? players[1];

  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const isTimerCritical = state.phase === "playing" && state.turnDeadline != null && secondsLeft <= 5 && secondsLeft > 0;

  // Sound triggers on game events
  useEffect(() => {
    if (state.lastEvaporatedCell !== null) {
      tictactoeAudio.playQuantumDissolve();
      HapticsManager.trigger("turn");
    }
  }, [state.lastEvaporatedCell]);

  useEffect(() => {
    // A spectator has nothing to celebrate or mourn.
    if (isSpectator) return;
    if (outcome.kind === "win") {
      tictactoeAudio.playVictoryFanfare();
      HapticsManager.trigger("win");
    } else if (outcome.kind === "draw") {
      tictactoeAudio.playDefeatDrone();
      HapticsManager.trigger("turn");
    } else if (outcome.kind === "loss") {
      tictactoeAudio.playDefeatDrone();
      HapticsManager.trigger("subtle");
    }
  }, [outcome.kind, isSpectator]);

  const liveAnnouncement = useMemo(() => {
    if (isOver) return outcome.announcement;
    if (state.lastEvaporatedCell !== null) {
      return `Quantum piece at cell ${state.lastEvaporatedCell + 1} dissolved. ${isMyTurn ? "Your turn to move." : "Opponent's turn."}`;
    }
    return isMyTurn ? "Your turn to move." : `Waiting for ${players.find((p) => p.id === state.turnPlayerId)?.name ?? "opponent"}`;
  }, [isOver, outcome.announcement, state.lastEvaporatedCell, state.turnPlayerId, isMyTurn, players]);

  const handleCellClick = (cellIndex: number) => {
    // Sound and haptics only for a move that was actually sent.
    if (!placeMark(cellIndex)) return;
    tictactoeAudio.playLaserPlace(selfMark ?? "X", state.moveCount);
    HapticsManager.trigger("subtle");
  };

  const handleRematchRequest = () => {
    tictactoeAudio.playTap();
    HapticsManager.trigger("turn");
    const socket = getSocket();
    socket.emit("rematch:request");
  };

  const toggleMute = () => {
    const next = tictactoeAudio.toggleMute();
    setIsMuted(next);
  };

  // Global keyboard shortcuts for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against typing in form fields or chat
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "m" || e.key === "M") {
        toggleMute();
        return;
      }

      if (e.key === "h" || e.key === "H") {
        setShowTutorial((prev) => !prev);
        return;
      }

      if (!isMyTurn || isOver) return;

      // Numpad mapping (standard numpad 7=top-left, 3=bottom-right)
      const numpadMap: Record<string, number> = {
        "7": 0, "8": 1, "9": 2,
        "4": 3, "5": 4, "6": 5,
        "1": 6, "2": 7, "3": 8,
      };

      if (e.key in numpadMap) {
        const cell = numpadMap[e.key];
        if (cell !== undefined && state.grid[cell] === null) {
          handleCellClick(cell);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMyTurn, isOver, state.grid, selfMark, state.moveCount, placeMark]);

  return (
    <div
      className={`min-h-[100dvh] w-full flex flex-col bg-gradient-to-br ${theme.bgGradient} text-white select-none overflow-hidden relative`}
    >
      {/* Screen Reader Live Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Perimeter Turn Time Warning */}
      <TurnTimeWarning
        deadline={state.turnDeadline}
        active={isMyTurn && state.phase === "playing"}
      />

      {/* Top Header Bar */}
      <header className="w-full px-6 py-3 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onLeave}
            className="min-h-[44px] flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Lounge</span>
          </button>

          <div className="min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">ROOM CODE</span>
            <span className="font-mono text-sm font-black tracking-widest text-cyan-400">{roomCode}</span>
          </div>

          <div className="min-h-[44px] flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{state.options.mode === "quantum" ? "Quantum Flux Mode" : "Classic 3x3 Mode"}</span>
          </div>

          {/* Turn Countdown Timer Pill */}
          {state.phase === "playing" && state.turnDeadline != null && (
            <div
              className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-black ${
                isTimerCritical
                  ? "bg-rose-500/20 border-rose-500/80 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                  : "bg-slate-900/90 border-slate-800 text-slate-300"
              }`}
              title="Turn time remaining"
            >
              <Timer className={`w-3.5 h-3.5 ${isTimerCritical ? "text-rose-400" : "text-cyan-400"}`} />
              <span>{secondsLeft}s remaining</span>
            </div>
          )}
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="min-h-[44px] flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-amber-300 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>How to Play</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* 3-Column Desktop Cockpit */}
      <div className="flex-1 w-full max-w-7xl mx-auto grid grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Left Telemetry Rail (3 cols) */}
        <aside className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Player Roster Card */}
          <div className={`p-4 rounded-2xl border ${theme.hudBorder} ${theme.hudBg} shadow-xl`}>
            <h2 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <Orbit className="w-3.5 h-3.5 text-cyan-400" />
              <span>Match Roster</span>
            </h2>

            {/* P1 Box */}
            <div
              className={`p-3 rounded-xl mb-3 transition-all ${
                state.turnPlayerId === p1?.id && !isOver
                  ? "bg-cyan-500/15 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-slate-950/40 border border-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-cyan-400 text-lg">✕</span>
                  <span className="text-sm font-bold truncate text-slate-200">
                    {p1?.name || "Player 1"}
                    {p1?.id === selfId && " (You)"}
                  </span>
                </div>
                {state.turnPlayerId === p1?.id && !isOver && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-400 text-slate-950 animate-pulse">
                    ACTING
                  </span>
                )}
              </div>

              {/* Quantum Piece Inventory */}
              {state.options.mode === "quantum" && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Active Pieces ({state.pieceQueues.X.length}/3)
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => {
                      const hasPiece = (state.pieceQueues.X.length || 0) > i;
                      const isExpiring = hasPiece && i === 0 && state.pieceQueues.X.length >= 3;
                      return (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-full transition-all ${
                            isExpiring
                              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"
                              : hasPiece
                              ? "bg-cyan-400"
                              : "bg-slate-800"
                          }`}
                        />
                      );
                    })}
                  </div>
                  {state.pieceQueues.X?.length >= 3 && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block mt-1 animate-pulse">
                      Dissolves Next Move
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* P2 Box */}
            <div
              className={`p-3 rounded-xl transition-all ${
                state.turnPlayerId === p2?.id && !isOver
                  ? "bg-pink-500/15 border border-pink-400/60 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                  : "bg-slate-950/40 border border-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-pink-400 text-lg">○</span>
                  <span className="text-sm font-bold truncate text-slate-200">
                    {p2?.name || "Player 2"}
                    {p2?.id === selfId && " (You)"}
                  </span>
                </div>
                {state.turnPlayerId === p2?.id && !isOver && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-pink-400 text-slate-950 animate-pulse">
                    ACTING
                  </span>
                )}
              </div>

              {/* Quantum Piece Inventory */}
              {state.options.mode === "quantum" && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Active Pieces ({state.pieceQueues.O.length}/3)
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => {
                      const hasPiece = (state.pieceQueues.O.length || 0) > i;
                      const isExpiring = hasPiece && i === 0 && state.pieceQueues.O.length >= 3;
                      return (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-full transition-all ${
                            isExpiring
                              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"
                              : hasPiece
                              ? "bg-pink-400"
                              : "bg-slate-800"
                          }`}
                        />
                      );
                    })}
                  </div>
                  {state.pieceQueues.O?.length >= 3 && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block mt-1 animate-pulse">
                      Dissolves Next Move
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Controls Guide */}
          <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/50">
            <h2 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-2">
              Keyboard Shortcuts
            </h2>
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center font-mono text-xs text-slate-300">
              <span className="p-1 rounded bg-slate-800">7</span>
              <span className="p-1 rounded bg-slate-800">8</span>
              <span className="p-1 rounded bg-slate-800">9</span>
              <span className="p-1 rounded bg-slate-800">4</span>
              <span className="p-1 rounded bg-slate-800">5</span>
              <span className="p-1 rounded bg-slate-800">6</span>
              <span className="p-1 rounded bg-slate-800">1</span>
              <span className="p-1 rounded bg-slate-800">2</span>
              <span className="p-1 rounded bg-slate-800">3</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-tight">
              Use Numpad 1–9 to place marks directly into grid cells. Press M to mute.
            </p>
          </div>
        </aside>

        {/* Center Arena (6 cols) */}
        <main className="col-span-6 flex flex-col items-center justify-center my-auto">
          {/* Turn Status Alert */}
          <div className="mb-4 text-center">
            {isOver ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black tracking-wider uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.9)]">
                  {outcome.headline}
                </span>
                <span className="text-xs text-slate-400">Total Moves: {state.moveCount}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 shadow-md">
                <span className={`w-3 h-3 rounded-full ${isMyTurn ? "bg-cyan-400 animate-ping" : "bg-slate-500"}`} />
                <span className="text-sm uppercase font-black tracking-widest text-slate-200">
                  {isMyTurn ? "YOUR TURN — DEPLOY MARK" : "AWAITING OPPONENT MOVE..."}
                </span>
              </div>
            )}
          </div>

          {/* Holographic 3x3 Grid */}
          <TicTacToeGrid
            grid={state.grid}
            winningLine={state.winningLine}
            lastEvaporatedCell={state.lastEvaporatedCell}
            theme={theme}
            isMyTurn={isMyTurn}
            disabled={isOver}
            onCellClick={handleCellClick}
          />

          {/* Post-Match Rematch Button (players only — a spectator has no seat to rematch with) */}
          {isOver && !isSpectator && (
            <div className="mt-6 w-full max-w-sm">
              <button
                type="button"
                onClick={handleRematchRequest}
                className="w-full py-3.5 px-6 rounded-2xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 transition cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Request Instant Rematch</span>
              </button>
            </div>
          )}
        </main>

        {/* Right Rail: Chat & Themes (3 cols) */}
        <aside className="col-span-3 flex flex-col gap-4 h-full overflow-hidden">
          {/* Theme Selector */}
          <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-xl">
            <h2 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-2.5 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cyber Visual Matrix</span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(["neo_tokyo", "quantum_matrix", "solar_flare"] as const).map((tId) => {
                const t = getTicTacToeTheme(tId);
                const isSelected = themeId === tId;
                return (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => {
                      tictactoeAudio.playTap();
                      setThemeId(tId);
                    }}
                    className={`p-2 rounded-xl text-center text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* In-Room Live Chat */}
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-xl overflow-hidden">
            <Chat messages={messages} selfId={selfId} className="h-full border-0 bg-transparent" />
          </div>
        </aside>
      </div>

      {/* Tutorial Modal */}
      <TicTacToeTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        theme={theme}
      />
    </div>
  );
}
