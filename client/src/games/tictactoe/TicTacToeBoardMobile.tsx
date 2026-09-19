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
import { TurnTimeWarning, useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  HelpCircle,
  Palette,
  RotateCcw,
  Timer,
  Zap,
  Crown,
} from "lucide-react";

export default function TicTacToeBoardMobile({
  state,
  players,
  selfId,
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

  const cycleTheme = () => {
    tictactoeAudio.playTap();
    setThemeId((curr) => {
      if (curr === "neo_tokyo") return "quantum_matrix";
      if (curr === "quantum_matrix") return "solar_flare";
      return "neo_tokyo";
    });
  };

  return (
    <div
      className={`w-full min-h-dvh-safe h-dvh-safe max-h-dvh-safe flex flex-col justify-between p-2 sm:p-3 overflow-hidden select-none overscroll-none touch-none bg-gradient-to-b ${theme.bgGradient} text-white relative`}
    >
      {/* Screen Reader Live Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Visual Turn Warning Perimeter Glow */}
      <TurnTimeWarning
        deadline={state.turnDeadline}
        active={isMyTurn && state.phase === "playing"}
      />

      {/* Top Ergonomic Safe Header */}
      <header className="w-full max-w-sm sm:max-w-md mx-auto flex items-center justify-between gap-1.5 z-20 pt-safe shrink-0">
        {/* Back / Exit Button */}
        <button
          type="button"
          onClick={onLeave}
          aria-label="Leave game lounge"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Room Code & Mode Badge */}
        <div className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-md">
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">ROOM</span>
          <span className="font-mono text-xs font-black tracking-widest text-cyan-400">{roomCode}</span>
          <span className="text-slate-600">·</span>
          <span className="text-[10px] font-black uppercase text-cyan-300/80">
            {state.options.mode === "quantum" ? "FLUX" : "3x3"}
          </span>
        </div>

        {/* Turn Countdown Timer Pill */}
        {state.phase === "playing" && state.turnDeadline != null && (
          <div
            className={`min-h-[44px] px-2.5 rounded-2xl border flex items-center gap-1.5 transition-colors ${
              isTimerCritical
                ? "bg-rose-500/20 border-rose-500/80 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                : "bg-slate-900/90 border-slate-800 text-slate-300"
            }`}
            title="Turn time remaining"
          >
            <Timer className={`w-3.5 h-3.5 ${isTimerCritical ? "text-rose-400" : "text-cyan-400"}`} />
            <span className="font-mono text-xs font-black">{secondsLeft}s</span>
          </div>
        )}

        {/* Action Controls Group */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Theme: ${theme.name}. Switch theme.`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            title="Switch Visual Theme"
          >
            <Palette className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute sound" : "Mute sound"}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            aria-label="How to play guide"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </header>

      {/* Player Telemetry HUD with 3-Stage Quantum FIFO Power Cells */}
      <section className="w-full max-w-sm sm:max-w-md mx-auto z-10 px-0.5 py-1 shrink-0">
        <div
          className={`p-2.5 rounded-2xl border ${theme.hudBorder} ${theme.hudBg} flex items-center justify-between gap-2 shadow-xl`}
        >
          {/* Player 1 Pod (X - Cyan) */}
          <div
            className={`flex-1 p-2 rounded-xl transition-all ${
              state.turnPlayerId === p1?.id && !isOver
                ? "bg-cyan-500/15 border border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                : "bg-slate-950/40 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full flex items-center justify-center font-black text-cyan-400 text-xs bg-cyan-950/60 border border-cyan-500/40 shrink-0">
                ✕
              </span>
              <span className="text-xs font-bold truncate text-slate-200">
                {p1?.name || "Player 1"}
              </span>
              {p1?.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              {p1?.id === selfId && (
                <span className="text-[9px] font-black uppercase text-cyan-300 shrink-0">(You)</span>
              )}
            </div>

            {/* 3-Stage Quantum FIFO Battery */}
            {state.options.mode === "quantum" && (
              <div className="mt-1.5">
                <div className="flex items-center gap-1" title="Quantum piece battery (max 3)">
                  {[0, 1, 2].map((slotIdx) => {
                    const queueLen = state.pieceQueues.X?.length || 0;
                    const hasPiece = queueLen > slotIdx;
                    // Slot 0 is the oldest mark; if queue is full (3 pieces), it dissolves next!
                    const isExpiringNext = hasPiece && slotIdx === 0 && queueLen >= 3;

                    return (
                      <div
                        key={slotIdx}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          isExpiringNext
                            ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse"
                            : hasPiece
                            ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]"
                            : "bg-slate-800/80 border border-slate-700/40"
                        }`}
                      />
                    );
                  })}
                </div>
                {state.pieceQueues.X?.length >= 3 && (
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-300 block mt-0.5 animate-pulse">
                    Dissolves Next
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Holographic Center VS Beacon */}
          <div className="flex flex-col items-center justify-center px-1 shrink-0">
            <div className="w-7 h-7 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center shadow-inner">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-[9px] font-mono text-slate-400 font-black mt-0.5">VS</span>
          </div>

          {/* Player 2 Pod (O - Magenta) */}
          <div
            className={`flex-1 p-2 rounded-xl transition-all ${
              state.turnPlayerId === p2?.id && !isOver
                ? "bg-pink-500/15 border border-pink-400/70 shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                : "bg-slate-950/40 border border-transparent"
            }`}
          >
            <div className="flex items-center justify-end gap-1.5 min-w-0">
              {p2?.id === selfId && (
                <span className="text-[9px] font-black uppercase text-pink-300 shrink-0">(You)</span>
              )}
              {p2?.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              <span className="text-xs font-bold truncate text-slate-200 text-right">
                {p2?.name || "Player 2"}
              </span>
              <span className="w-5 h-5 rounded-full flex items-center justify-center font-black text-pink-400 text-xs bg-pink-950/60 border border-pink-500/40 shrink-0">
                ○
              </span>
            </div>

            {/* 3-Stage Quantum FIFO Battery */}
            {state.options.mode === "quantum" && (
              <div className="mt-1.5">
                <div className="flex items-center justify-end gap-1" title="Quantum piece battery (max 3)">
                  {[0, 1, 2].map((slotIdx) => {
                    const queueLen = state.pieceQueues.O?.length || 0;
                    const hasPiece = queueLen > slotIdx;
                    // Slot 0 is the oldest mark; if queue is full (3 pieces), it dissolves next!
                    const isExpiringNext = hasPiece && slotIdx === 0 && queueLen >= 3;

                    return (
                      <div
                        key={slotIdx}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          isExpiringNext
                            ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse"
                            : hasPiece
                            ? "bg-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.6)]"
                            : "bg-slate-800/80 border border-slate-700/40"
                        }`}
                      />
                    );
                  })}
                </div>
                {state.pieceQueues.O?.length >= 3 && (
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-300 block text-right mt-0.5 animate-pulse">
                    Dissolves Next
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Center Cyber Arena Deck */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-sm sm:max-w-md mx-auto my-auto z-10 relative">
        {/* Turn / Outcome Status Banner */}
        <div className="mb-2 text-center shrink-0">
          {isOver ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base sm:text-lg font-black tracking-wider uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.9)]">
                {outcome.headline}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Match concluded in {state.moveCount} moves
              </span>
            </div>
          ) : (
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                isMyTurn
                  ? "bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900/80 border-slate-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isMyTurn ? "bg-cyan-400 animate-ping" : "bg-slate-500"
                }`}
              />
              <span className="text-xs uppercase font-black tracking-widest text-slate-200">
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
      </main>

      {/* Bottom Action Deck */}
      <footer className="w-full max-w-sm sm:max-w-md mx-auto z-10 pb-safe shrink-0 pt-1">
        {isOver && isSpectator ? null : isOver ? (
          <button
            type="button"
            onClick={handleRematchRequest}
            className="min-h-[48px] w-full py-3 px-4 rounded-2xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Request Instant Rematch</span>
          </button>
        ) : (
          <div className="flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider py-1">
            <span>
              {state.options.mode === "quantum"
                ? "QUANTUM FLUX: MAX 3 PIECES · 4TH MOVE EVAPORATES OLDEST"
                : "CLASSIC 3X3: ALIGN 3 MARKS IN A ROW"}
            </span>
          </div>
        )}
      </footer>

      {/* Tutorial Modal */}
      <TicTacToeTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        theme={theme}
      />
    </div>
  );
}
