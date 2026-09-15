import React, { useState } from "react";
import WordBuildingTutorialModal from "./TutorialModal";
import InlineRoomRail from "../../components/InlineRoomRail";
import CoachHintButton from "../../components/CoachHintButton";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useWordBuildingBoard, type WordBuildingBoardProps } from "./useWordBuildingBoard";
import { getInkDisplayColor } from "./inks";
import {
  Grid,
  LetterPad,
  VocabularyFoundCard,
  ReportCardOverlay,
} from "./wordbuilding-shared";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { WordBuildingWinnerCelebration } from "./WordBuildingAnimations";
import { useFullscreenToggle } from "../../hooks/useFullscreenToggle";
import { isFullscreenSupported } from "../../lib/fullscreen";
import {
  SpiralBinderRings,
  PaperClipDoodle,
  PaperAirplaneDoodle,
  DoodleStar,
  PencilDoodle,
  SmileyDoodle,
  getPlayerInitials,
} from "../dotsboxes/dotsboxes-theme";
import { Trophy, HelpCircle, Maximize, Minimize, LogOut } from "lucide-react";

function desktopCellPx(size: number): number {
  if (size === 8) return 58;
  if (size === 10) return 46;
  return 32; // 15x15
}

/**
 * Branded Hand-Drawn Notebook "WORD BUILDING" Title (Nostalgic Classroom Mode)
 */
function WordBuildingNotebookLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-start select-none font-['Architects_Daughter',cursive] ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-[#1E3A8A] drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)] underline decoration-wavy decoration-[#3B82F6]/60">
          WORD
        </span>
        <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-[#DC2626] drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
          BUILDING
        </span>
      </div>
      <div className="text-[10px] font-bold tracking-widest text-[#7C2D12]/80 uppercase -mt-0.5">
        Classroom Vocabulary
      </div>
    </div>
  );
}

/**
 * Branded Neon "WORDS BUILDING" Title (Arcade Matrix Mode)
 */
function WordBuildingNeonLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center px-4 py-1.5 rounded-xl border border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.3)] bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 ${className}`}
    >
      <span className="font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-pink-300 text-lg md:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        WORDS BUILDING
      </span>
      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#EC4899]" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
    </div>
  );
}

export default function WordBuildingBoardDesktop(props: WordBuildingBoardProps) {
  const { state, selfId, roomCode, players, messages, roomPhase, onLeave } = props;
  const m = useWordBuildingBoard(props);
  const cellPx = desktopCellPx(m.size);
  const reactions = useSeatReactions(selfId);
  const { isFullscreen, toggleFullscreen } = useFullscreenToggle();

  const isFinished = state.phase === "finished";
  const turnPlayerName = m.nameOf(state.turnPlayerId);
  const turnPlayerInk = m.inkOf[state.turnPlayerId];

  // Notebook Frame vs Cyber Neon Frame
  return (
    <div
      className={`fixed inset-0 h-screen max-h-screen w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none transition-colors duration-300 ${
        m.isNeon
          ? "bg-[#070919] text-slate-100"
          : "bg-[#1C1814] text-stone-900 font-['Patrick_Hand',cursive]"
      }`}
    >
      {/* Background Ambience */}
      {m.isNeon ? (
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_70%_at_50%_-10%,rgba(56,189,248,0.16),rgba(255,255,255,0))]" />
      ) : (
        <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#451A03_1px,transparent_1px)] [background-size:16px_16px]" />
      )}

      {/* ── Main Book / Terminal Container ── */}
      <div
        className={`relative z-10 w-full max-w-[1440px] h-[96vh] rounded-3xl border-2 flex overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)] ${
          m.isNeon
            ? "bg-[#090B20]/95 border-slate-800/90 shadow-[0_0_40px_rgba(56,189,248,0.15)]"
            : "bg-[#FCF8EE] border-[#D7C9B1]"
        }`}
      >
        {/* Notebook Doodles & Spiral Binder (Notebook Mode Only) */}
        {!m.isNeon && (
          <>
            {/* Paper Clips on top edge */}
            <PaperClipDoodle className="absolute -top-3 left-24 w-6 h-12 z-30 opacity-90 hidden sm:block pointer-events-none" />
            <PaperClipDoodle className="absolute -top-3 right-44 w-6 h-12 z-30 opacity-90 hidden lg:block pointer-events-none" />

            {/* Left Spiral Wire Ring Binder */}
            <div className="w-10 sm:w-12 h-full bg-[#EFE9DA] border-r-2 border-[#D7C9B1] flex-shrink-0 flex items-center justify-center relative shadow-inner">
              <SpiralBinderRings orientation="vertical" count={16} />
            </div>
          </>
        )}

        {/* Inner Content Area */}
        <div className="flex-1 h-full flex flex-col overflow-hidden relative">
          {/* Notebook Red Margin Line */}
          {!m.isNeon && (
            <div className="absolute top-0 bottom-0 left-4 sm:left-6 w-0.5 bg-rose-400/40 pointer-events-none z-0" />
          )}

          {/* ── 1. Top Systematic Header Bar ── */}
          <header
            className={`relative z-20 w-full h-16 sm:h-18 flex-shrink-0 px-6 sm:px-8 border-b flex items-center justify-between ${
              m.isNeon
                ? "border-slate-800/80 bg-[#0B0E28]/95"
                : "border-[#E5DAC6] bg-[#FCF8EE]/95"
            }`}
          >
            {/* Left: Branded Logo & Chips */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative flex items-center">
                {m.isNeon ? <WordBuildingNeonLogo /> : <WordBuildingNotebookLogo />}
                {!m.isNeon && (
                  <DoodleStar className="absolute -top-1 -right-3 w-4 h-4 text-amber-500 animate-pulse pointer-events-none" />
                )}
              </div>

              {/* Grid Size / Cells Chip */}
              <div
                className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs shadow-xs relative ${
                  m.isNeon
                    ? "bg-slate-900/90 border-slate-800 text-slate-300"
                    : "border-2 border-[#3B82F6]/40 bg-white/80 text-stone-800"
                }`}
              >
                <span className="text-base">{isFinished ? "🏁" : "🎯"}</span>
                <div>
                  <div className="text-[10px] uppercase font-bold opacity-70 font-sans">
                    {isFinished ? "Status" : "Grid"}
                  </div>
                  <div
                    className={`text-xs font-black ${
                      m.isNeon ? "text-amber-400" : "text-[#1E3A8A]"
                    }`}
                  >
                    {isFinished ? "Match Completed" : `${m.size}×${m.size} Matrix (${state.filledCells}/${state.totalCells})`}
                  </div>
                </div>
              </div>

              {/* Turn Limit Mode Chip */}
              <div
                className={`hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs shadow-xs ${
                  m.isNeon
                    ? "bg-slate-900/90 border-slate-800 text-slate-300"
                    : "border-2 border-stone-300 bg-white/80 text-stone-800"
                }`}
              >
                <span className="text-base">⏱️</span>
                <div>
                  <div className="text-[10px] uppercase font-bold opacity-70 font-sans">Turn Mode</div>
                  <div className="text-xs font-black">
                    {state.options.turnTimerSeconds ? `${state.options.turnTimerSeconds}s Turn Limit` : "30s Per Player"}
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Turn Status Pill */}
            {state.phase === "playing" && (
              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm font-bold text-xs sm:text-sm tracking-wide transition-all ${
                  m.myTurn
                    ? m.isNeon
                      ? "bg-blue-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.4)]"
                      : "bg-amber-100 border-amber-500 text-amber-900"
                    : m.isNeon
                    ? "bg-slate-900/80 border-slate-700 text-slate-300"
                    : "bg-white/90 border-stone-300 text-stone-700"
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      m.myTurn ? (m.isNeon ? "bg-cyan-400" : "bg-amber-500") : "bg-slate-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      m.myTurn ? (m.isNeon ? "bg-cyan-400" : "bg-amber-500") : "bg-slate-400"
                    }`}
                  />
                </span>
                <span>
                  {m.myTurn ? "Your Turn!" : `${turnPlayerName}'s Turn`}
                </span>
                {m.remainingSec != null && (
                  <span
                    className={`px-1.5 py-0.2 rounded font-black text-xs ${
                      m.remainingSec <= 5
                        ? "bg-rose-500 text-white animate-pulse"
                        : m.isNeon
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {m.remainingSec}s
                  </span>
                )}
              </div>
            )}

            {/* Right: Systematic Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={m.toggleTheme}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  m.isNeon
                    ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/40"
                    : "border-2 border-amber-400/70 bg-amber-50 hover:bg-amber-100 text-stone-800"
                }`}
                title="Switch Theme"
              >
                <span>{m.isNeon ? "📓 Notebook Theme" : "⚡ Neon Theme"}</span>
              </button>

              {/* AI Coach Hint */}
              {m.coach && state.phase === "playing" && (
                <CoachHintButton coach={m.coach} />
              )}

              {/* Scorecard Button (on finish) */}
              {isFinished && (
                <button
                  type="button"
                  onClick={() => m.setReportDismissed(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border-2 border-amber-500 bg-amber-400 text-stone-950 font-black text-xs shadow-md hover:scale-105 transition-all cursor-pointer active:scale-95"
                >
                  <Trophy className="w-4 h-4 text-stone-950" />
                  <span>Scorecard</span>
                </button>
              )}

              {/* Fullscreen Toggle */}
              {isFullscreenSupported() && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    m.isNeon
                      ? "bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                      : "border-2 border-stone-300 bg-white/90 text-stone-700 hover:text-stone-950"
                  }`}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  <span>{isFullscreen ? "Exit FS" : "Fullscreen"}</span>
                </button>
              )}

              {/* Help */}
              <button
                type="button"
                onClick={() => m.setTutorialOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  m.isNeon
                    ? "bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                    : "border-2 border-stone-300 bg-white/90 text-stone-700 hover:text-stone-950"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Help</span>
              </button>

              {/* Leave */}
              <button
                type="button"
                onClick={props.onLeave}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border text-xs font-black transition-all cursor-pointer shadow-xs ${
                  m.isNeon
                    ? "bg-rose-950/40 hover:bg-rose-900/60 border-rose-900/50 text-rose-300"
                    : "border-2 border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-700"
                }`}
                title="Leave Game"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Leave</span>
              </button>
            </div>
          </header>

          {/* ── 2. 3-Column Game Body (100% Contained, 0 Outer Page Overflow) ── */}
          <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12 gap-4 sm:gap-6 p-4 sm:p-6 overflow-hidden">
            {/* ── Left Column: Players List & Scores (3 Cols) ── */}
            <section
              className={`col-span-3 h-full flex flex-col rounded-3xl p-4 shadow-md overflow-hidden border ${
                m.isNeon
                  ? "bg-[#0B0E28]/90 border-slate-800/90"
                  : "bg-white/80 border-2 border-[#D7C9B1]"
              }`}
            >
              <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
                <h2
                  className={`text-xs font-bold uppercase tracking-wider ${
                    m.isNeon ? "text-slate-400" : "text-stone-500"
                  }`}
                >
                  PLAYERS ({state.playerOrder.length}/6)
                </h2>
                <span
                  className={`text-[11px] font-bold ${
                    m.isNeon ? "text-cyan-400" : "text-[#7c2d12]"
                  }`}
                >
                  Word Lounge
                </span>
              </div>

              {/* Scrollable Player Cards List */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                {state.playerOrder.map((pid) => {
                  const ink = m.inkOf[pid];
                  const isTurn = !isFinished && state.turnPlayerId === pid;
                  const isSelf = pid === selfId;
                  const name = m.nameOf(pid);
                  const avatar = m.avatarOf(pid);
                  const score = state.scores[pid] ?? 0;
                  const isTargetActive = reactions.activeTargetId === pid;

                  return (
                    <div
                      key={pid}
                      ref={reactions.registerCardRef?.(pid)}
                      onClick={!isSelf ? () => reactions.openTarget(pid) : undefined}
                      className={`relative flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 ${
                        !isSelf ? "cursor-pointer hover:brightness-105 active:scale-[0.99]" : ""
                      } ${
                        isTurn
                          ? m.isNeon
                            ? "bg-blue-950/60 border-2 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.35)]"
                            : "bg-amber-100/90 border-2 border-amber-500 shadow-sm"
                          : m.isNeon
                          ? "bg-slate-900/60 border border-slate-800/80 hover:border-slate-700"
                          : "bg-white/90 border border-stone-300 hover:border-stone-400"
                      }`}
                      title={!isSelf ? `Tap to react at ${name}` : undefined}
                    >
                      {isTargetActive && reactions.closeTarget && (
                        <SeatTargetReactionWheel
                          game="wordbuilding"
                          targetPlayerId={pid}
                          targetPlayerName={name}
                          onClose={reactions.closeTarget}
                          position="bottom"
                        />
                      )}

                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div
                          className="relative w-9 h-9 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center"
                          style={{
                            backgroundColor: getInkDisplayColor(ink, m.isNeon),
                            boxShadow: isTurn ? `0 0 10px ${getInkDisplayColor(ink, m.isNeon)}` : "none",
                          }}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                            {avatar ? (
                              <SeatAvatar avatar={avatar} name={name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-black text-xs text-white">
                                {getPlayerInitials(name)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name & Status */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold text-sm truncate ${
                                m.isNeon ? "text-slate-200" : "text-stone-900"
                              }`}
                              style={{ color: !m.isNeon ? ink?.inkColor : undefined }}
                              title={name}
                            >
                              {name}
                            </span>
                            {isSelf && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  m.isNeon
                                    ? "bg-blue-950/80 text-cyan-300 border border-cyan-800/60"
                                    : "bg-amber-200 text-amber-900 border border-amber-400"
                                }`}
                              >
                                You
                              </span>
                            )}
                          </div>

                          {isTurn ? (
                            <span
                              className={`text-[11px] font-semibold flex items-center gap-1 ${
                                m.isNeon ? "text-cyan-300" : "text-amber-800"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full animate-ping inline-block ${
                                  m.isNeon ? "bg-cyan-400" : "bg-amber-600"
                                }`}
                              />
                              {isSelf ? "Your Turn" : "Thinking..."}
                              {m.remainingSec != null && ` (${m.remainingSec}s)`}
                            </span>
                          ) : (
                            <span
                              className="text-[11px] font-medium truncate block font-sans"
                              style={{ color: getInkDisplayColor(ink, m.isNeon) }}
                            >
                              {ink?.name ?? "Student"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Marks */}
                      <div className="text-right flex-shrink-0 pl-2">
                        <span
                          className="font-black text-2xl tracking-tight leading-none block"
                          style={{ color: getInkDisplayColor(ink, m.isNeon) }}
                        >
                          {score}
                        </span>
                        <span className="text-[10px] font-bold uppercase opacity-65 tracking-wider font-sans">
                          Marks
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Classroom Nostalgia Doodle at bottom of left column */}
              {!m.isNeon && (
                <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-400 flex-shrink-0">
                  <PencilDoodle className="w-12 h-6 opacity-70" />
                  <SmileyDoodle className="w-6 h-6 text-amber-600 opacity-60" />
                  <span className="font-sans text-[10px] tracking-wider text-stone-500 font-bold">
                    Class Notes
                  </span>
                </div>
              )}
            </section>

            {/* ── Center Column: Matrix Board + Always-Open Keyboard (6 Cols) ── */}
            <main className="col-span-6 h-full flex flex-col justify-between items-center overflow-hidden relative">
              {/* Matrix Header / Subject Line */}
              <div
                className={`w-full flex items-center justify-between px-4 py-1.5 rounded-2xl border text-xs sm:text-sm font-bold shadow-xs flex-shrink-0 mb-1.5 ${
                  m.isNeon
                    ? "bg-[#0B0E28]/90 border-slate-800 text-cyan-300"
                    : "bg-white/80 border border-[#D7C9B1] text-[#7c2d12]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="opacity-60">📖</span>
                  <span>
                    {m.isNeon ? "TERMINAL: WORDS BUILDING // MATRIX" : "Subject: English Vocabulary & Spelling"}
                  </span>
                </div>
                <span className="font-mono text-xs opacity-75">
                  ROOM: {roomCode ?? "—"}
                </span>
              </div>

              {/* Center Elevated Grid Card (Pure Crisp White in Neon, Lined in Notebook) */}
              <div className="flex-1 w-full flex items-center justify-center min-h-0 py-1 overflow-hidden">
                <Grid
                  board={state.board}
                  size={m.size}
                  cellPx={cellPx}
                  selected={m.selected}
                  canPlay={m.canPlay}
                  cellOverlays={m.cellOverlays}
                  inkOf={m.inkOf}
                  activePulse={m.activePulse}
                  hintCells={m.coach.highlight}
                  onPickCell={m.pickCell}
                  isNeon={m.isNeon}
                />
              </div>

              {/* Always-Open Desktop Letter Pad (Keyboard) */}
              <div
                className={`w-full rounded-2xl p-2 sm:p-2.5 border mt-1.5 flex flex-col items-center shadow-md flex-shrink-0 ${
                  m.isNeon
                    ? "bg-[#0B0E28]/95 border-slate-800/90"
                    : "bg-white/90 border border-[#D7C9B1]"
                }`}
              >
                <LetterPad
                  onPick={m.placeLetter}
                  onCancel={() => m.setSelected(null)}
                  isNeon={m.isNeon}
                  selectedCell={m.selected}
                  disabled={!m.canPlay || !m.selected}
                  alwaysOpen
                />

                {/* Error or Turn Guidance */}
                {m.error ? (
                  <div className="mt-1 text-xs sm:text-sm font-bold text-rose-500 animate-shake">
                    {m.error}
                  </div>
                ) : !m.myTurn && state.phase === "playing" ? (
                  <div
                    className="mt-1 text-xs sm:text-sm font-semibold opacity-75"
                    style={{ color: getInkDisplayColor(turnPlayerInk, m.isNeon, m.isNeon ? "#94a3b8" : "#7a6651") }}
                  >
                    Waiting for {turnPlayerName} to write a letter…
                  </div>
                ) : null}
              </div>
            </main>

            {/* ── Right Column: Vocabulary Found & In-Game Chat (3 Cols) ── */}
            <aside className="col-span-3 h-full flex flex-col gap-3 overflow-hidden">
              {/* 1. Vocabulary Found Feed (Expanded Full Height, Scrollable Only Here) */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <VocabularyFoundCard
                  state={state}
                  inkOf={m.inkOf}
                  nameOf={m.nameOf}
                  isNeon={m.isNeon}
                  maxHeight="100%"
                />
              </div>

              {/* 2. In-Game Room Chat / Voice Rail (Positioned Cleanly at Bottom) */}
              <div
                className={`rounded-2xl border p-2 shadow-sm flex-shrink-0 ${
                  m.isNeon
                    ? "bg-[#0B0E28]/90 border-slate-800"
                    : "bg-white/85 border border-[#D7C9B1]"
                }`}
              >
                <InlineRoomRail
                  code={roomCode ?? ""}
                  game="wordbuilding"
                  phase={roomPhase ?? state.phase}
                  players={players}
                  selfId={selfId}
                  messages={messages ?? []}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* ── 3. Modals & End-Game Celebrations (No board-blocking popups during play) ── */}
      {/* Winner Celebration Ceremony */}
      {state.phase === "finished" && state.winnerId && !m.reportDismissed && (
        <WordBuildingWinnerCelebration
          winnerName={m.nameOf(state.winnerId)}
        />
      )}

      {/* End-Game Report Card */}
      {state.phase === "finished" && !m.reportDismissed && (
        <ReportCardOverlay
          state={state}
          nameOf={m.nameOf}
          inkOf={m.inkOf}
          onClose={() => m.setReportDismissed(true)}
        />
      )}

      {/* Tutorial Modal */}
      {m.tutorialOpen && <WordBuildingTutorialModal onClose={() => m.setTutorialOpen(false)} />}

      {/* 10-Second Turn Out Warning */}
      <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn && state.phase === "playing"} />

      {/* Floating Reactions */}
      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}


