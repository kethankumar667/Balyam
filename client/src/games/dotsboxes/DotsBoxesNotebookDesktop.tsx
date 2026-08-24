import React, { useState } from "react";
import type { DotsBoxesBoardProps } from "./useDotsBoxesBoard";
import { useDotsBoxesBoard } from "./useDotsBoxesBoard";
import DotsBoxesBoardGrid from "./DotsBoxesBoardGrid";
import {
  DotsBoxesNotebookLogo,
  SpiralBinderRings,
  getPlayerInitials,
  PaperAirplaneDoodle,
  DoodleCompass,
  DoodleStar,
  PencilDoodle,
  TicTacToeDoodle,
  MathNotesDoodle,
  SmileyDoodle,
  PaperClipDoodle,
} from "./dotsboxes-theme";
import DotsBoxesDominanceBar from "./DotsBoxesDominanceBar";
import DotsBoxesScorecardModal from "./DotsBoxesScorecardModal";
import Modal from "../../components/Modal";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { LogOut, RotateCcw, Volume2, VolumeX, HelpCircle, Trophy } from "lucide-react";
import { getSocket } from "../../lib/socket";

export default function DotsBoxesNotebookDesktop(props: DotsBoxesBoardProps) {
  const {
    state,
    selfId,
    size,
    targetBoxes,
    totalBoxes,
    isFinished,
    myTurn,
    canPlay,
    secondsLeft,
    skin,
    toggleSkin,
    themeOf,
    nameOf,
    avatarOf,
    scoreOf,
    undoCount,
    useUndo,
    isMuted,
    toggleMute,
    showScorecard,
    setShowScorecard,
    rankedPlayers,
    winner,
    isTie,
    drawLine,
    comboStreak,
    comboBanner,
  } = useDotsBoxesBoard(props);

  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    getSocket().emit("chat:send", { text });
    setChatInput("");
  };

  const turnPlayerName = nameOf(state.turnPlayerId);
  const turnPlayerTheme = themeOf(state.turnPlayerId);
  const turnPlayerAvatar = avatarOf(state.turnPlayerId);

  return (
    <div className="relative min-h-screen w-full bg-[#1C1814] text-stone-900 flex items-center justify-center p-3 md:p-6 overflow-hidden select-none font-['Patrick_Hand',cursive]">
      {/* Wooden Desk Texture Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#451A03_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* ── Main Spiral Notebook Page ── */}
      <div className="relative z-10 w-full max-w-[1400px] h-[94vh] bg-[#FCF8EE] rounded-3xl border-2 border-[#D7C9B1] shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex overflow-hidden">
        {/* Paper Clips on top edge */}
        <PaperClipDoodle className="absolute -top-3 left-24 w-6 h-12 z-30 opacity-90 hidden sm:block" />
        <PaperClipDoodle className="absolute -top-3 right-36 w-6 h-12 z-30 opacity-90 hidden lg:block" />

        {/* Left Spiral Wire Ring Binder */}
        <div className="w-10 sm:w-12 h-full bg-[#EFE9DA] border-r-2 border-[#D7C9B1] flex-shrink-0 flex items-center justify-center relative shadow-inner">
          <SpiralBinderRings orientation="vertical" count={16} />
        </div>

        {/* Notebook Content Area */}
        <div className="flex-1 h-full flex flex-col overflow-hidden relative">
          {/* Subtle Red Margin Line */}
          <div className="absolute top-0 bottom-0 left-4 sm:left-6 w-0.5 bg-rose-400/40 pointer-events-none z-0" />

          {/* ── 1. Top Notebook Header Bar ── */}
          <header className="relative z-20 w-full h-20 flex-shrink-0 px-6 sm:px-8 border-b-2 border-[#E5DAC6] bg-[#FCF8EE]/95 flex items-center justify-between">
            <div className="flex items-center gap-5 sm:gap-7">
              <div className="relative flex items-center">
                <DotsBoxesNotebookLogo />
                <DoodleStar className="absolute -top-1 -right-3 w-4 h-4 text-amber-500 animate-pulse" />
              </div>

              {/* Target Boxes Chip */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border-2 border-[#3B82F6]/40 bg-white/80 shadow-xs relative">
                <span className="text-base">🎯</span>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wide">
                    {isFinished ? "Status" : "Target"}
                  </div>
                  <div className="text-xs font-black text-[#1E3A8A]">
                    {isFinished ? "Match Completed" : `${targetBoxes} Boxes`}
                  </div>
                </div>
                <DoodleStar className="absolute -bottom-1 -right-1 w-3 h-3 text-yellow-400" />
              </div>

              {/* Game Mode Chip */}
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border-2 border-stone-300 bg-white/80 shadow-xs">
                <span className="text-base">⏱️</span>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-500 font-sans tracking-wide">Game Mode</div>
                  <div className="text-xs font-black text-stone-800">Classic (30s)</div>
                </div>
              </div>
            </div>

            {/* Right Header Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleSkin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-amber-400/70 bg-amber-50 hover:bg-amber-100 text-stone-800 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                title="Switch Theme"
              >
                <span>{skin === "notebook" ? "⚡ Neon Theme" : "📓 Notebook Theme"}</span>
              </button>

              {isFinished && (
                <button
                  type="button"
                  onClick={() => setShowScorecard(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border-2 border-amber-500 bg-amber-400 text-stone-950 font-black text-xs shadow-md hover:scale-105 transition-all cursor-pointer active:scale-95"
                >
                  <Trophy className="w-4 h-4 text-stone-950" />
                  <span>Scorecard</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleMute}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-stone-300 bg-white/90 text-xs font-bold text-stone-700 hover:text-stone-950 transition-all cursor-pointer shadow-xs"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
                <span>{isMuted ? "Sound Off" : "Sound On"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-stone-300 bg-white/90 text-xs font-bold text-stone-700 hover:text-stone-950 transition-all cursor-pointer shadow-xs"
              >
                <HelpCircle className="w-4 h-4 text-stone-600" />
                <span>Help</span>
              </button>

              <button
                type="button"
                onClick={props.onLeave}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border-2 border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Leave</span>
              </button>
            </div>
          </header>

          {/* ── 2. 3-Column Paper Workspace ── */}
          <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12 gap-5 p-5 sm:p-6 overflow-hidden">
            {/* ── Left Column: Handwritten Players Roster (3 Cols) ── */}
            <section className="col-span-3 h-full flex flex-col rounded-3xl bg-white/80 border-2 border-[#E5DAC6] p-4 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-3 px-1 border-b border-[#E5DAC6] pb-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-stone-600 font-['Architects_Daughter',cursive]">
                  PLAYERS ({state.playerOrder.length}/6)
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
                {state.playerOrder.map((pid, idx) => {
                  const theme = themeOf(pid);
                  const isTurn = !isFinished && state.turnPlayerId === pid;
                  const isWinner = isFinished && winner?.pid === pid && !isTie;
                  const isSelf = pid === selfId;
                  const score = scoreOf(pid);
                  const name = nameOf(pid);
                  const initials = getPlayerInitials(name);
                  const handwritingFont = theme.fontFamily ?? "inherit";

                  return (
                    <div
                      key={pid}
                      className={`flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 border-2 ${
                        isWinner
                          ? "bg-amber-100/90 border-amber-500 shadow-md scale-[1.02]"
                          : isTurn
                          ? "bg-blue-50/90 border-blue-500 shadow-md scale-[1.02]"
                          : "bg-stone-50/80 border-stone-200/90 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Hand-Drawn Circled Initial Badge */}
                        <div
                          className="w-10 h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center bg-white shadow-xs"
                          style={{
                            borderColor: theme.primary,
                            color: theme.primary,
                            fontFamily: handwritingFont,
                          }}
                        >
                          <span className="font-bold text-lg">{initials}</span>
                        </div>

                        {/* Name & Status */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-bold text-base text-stone-900 truncate"
                              style={{ fontFamily: handwritingFont }}
                              title={name}
                            >
                              {name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.2 rounded-full border border-blue-300 font-sans">
                                You
                              </span>
                            )}
                          </div>

                          {isWinner ? (
                            <span className="text-xs font-bold text-amber-700">
                              Winner 👑
                            </span>
                          ) : isTurn ? (
                            <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                              {isSelf ? "Your Turn" : "Writing..."}
                              {secondsLeft > 0 && ` (${secondsLeft}s)`}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Handwritten 2-Digit Score */}
                      <span
                        className="font-black text-2xl tracking-tight"
                        style={{ color: theme.primary, fontFamily: handwritingFont }}
                      >
                        {score.toString().padStart(2, "0")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Classroom Margin Doodles (Bottom Left) */}
              <div className="mt-auto pt-2 flex items-center justify-between opacity-90 pointer-events-none border-t border-dashed border-[#E5DAC6]">
                <TicTacToeDoodle className="w-11 h-11" />
                <MathNotesDoodle />
                <DoodleCompass className="w-9 h-9" />
              </div>
            </section>

            {/* ── Center Column: Ruled Paper Board + Action Bar (6 Cols) ── */}
            <main className="col-span-6 h-full flex flex-col justify-between items-center overflow-hidden relative">
              {/* Prominent Classroom Doodles floating around board */}
              <div className="absolute top-8 -right-2 pointer-events-none z-0 rotate-[8deg] opacity-85">
                <PaperAirplaneDoodle className="w-20 h-20" />
              </div>
              <div className="absolute bottom-16 -left-3 pointer-events-none z-0 rotate-[-12deg] opacity-85">
                <SmileyDoodle className="w-11 h-11" />
              </div>
              <div className="absolute bottom-14 -right-1 pointer-events-none z-0 rotate-[28deg] opacity-90">
                <PencilDoodle className="w-18 h-18" />
              </div>
              <DoodleStar className="absolute top-14 left-2 w-6 h-6 text-amber-400 opacity-80 pointer-events-none animate-pulse" />
              <DoodleStar className="absolute bottom-28 right-4 w-5 h-5 text-yellow-500 opacity-75 pointer-events-none" />

              {/* Combo Streak Banner Notification */}
              {comboBanner && (
                <div className="absolute top-2 z-30 px-6 py-2 rounded-2xl bg-amber-400 border-2 border-stone-900 shadow-xl text-stone-950 font-black text-lg tracking-wider animate-bounce font-['Architects_Daughter',cursive]">
                  {comboBanner}
                </div>
              )}

              {/* Territory Dominance Tug-of-War Bar */}
              <div className="w-full max-w-[540px] px-2 mb-1">
                <DotsBoxesDominanceBar
                  rankedPlayers={rankedPlayers}
                  totalBoxes={totalBoxes}
                  skin="notebook"
                />
              </div>

              {/* Notebook Paper Board */}
              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <DotsBoxesBoardGrid
                  size={size}
                  hLines={state.hLines}
                  vLines={state.vLines}
                  claims={state.claims}
                  playerOrder={state.playerOrder}
                  selfId={selfId}
                  canPlay={canPlay}
                  skin="notebook"
                  themeOf={themeOf}
                  nameOf={nameOf}
                  onDrawLine={drawLine}
                  className="max-h-[520px]"
                />
              </div>

              {/* Bottom Notebook Action Bar */}
              <div className="w-full flex items-center justify-between gap-3 mt-3 px-1">
                {/* Hand-Drawn Instruction Banner */}
                {isFinished ? (
                  <button
                    type="button"
                    onClick={() => setShowScorecard(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 border-2 border-amber-600 text-stone-950 shadow-md cursor-pointer hover:bg-amber-300 transition-all text-sm font-black tracking-wide"
                  >
                    <span>🏆 View Match Scorecard</span>
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-white border-2 border-stone-300 text-xs text-stone-600 shadow-xs font-['Architects_Daughter',cursive]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs" />
                      <div className="w-14 h-1 rounded-full bg-blue-500 shadow-xs" />
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs" />
                    </div>
                    <span className="font-bold text-stone-800 text-sm">
                      Click or drag between two dots to draw a line
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Undo Button */}
                  <button
                    type="button"
                    onClick={useUndo}
                    disabled={isFinished}
                    className="relative flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border-2 border-stone-300 text-stone-800 hover:border-stone-400 transition-all cursor-pointer shadow-xs text-xs font-bold disabled:opacity-40"
                  >
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                      {undoCount}
                    </div>
                    <RotateCcw className="w-3.5 h-3.5 text-stone-700" />
                    <span>UNDO</span>
                  </button>

                  {/* Leave Game Button */}
                  <button
                    type="button"
                    onClick={props.onLeave}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-700 transition-all cursor-pointer shadow-xs text-xs font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Leave</span>
                  </button>
                </div>
              </div>
            </main>

            {/* ── Right Column: Turn Status & Handwritten Chat (3 Cols) ── */}
            <aside className="col-span-3 h-full flex flex-col gap-4 overflow-hidden">
              {/* 1. YOUR TURN / MATCH FINISHED Card with Stopwatch */}
              <div className="p-4 rounded-3xl bg-white/90 border-2 border-[#E5DAC6] shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full border-2 p-0.5 flex-shrink-0 flex items-center justify-center bg-white"
                    style={{ borderColor: turnPlayerTheme.primary }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-stone-100 flex items-center justify-center">
                      {turnPlayerAvatar ? (
                        <SeatAvatar avatar={turnPlayerAvatar} name={turnPlayerName} className="w-full h-full object-cover" />
                      ) : (
                        <span
                          className="font-bold text-base"
                          style={{
                            color: turnPlayerTheme.primary,
                            fontFamily: turnPlayerTheme.fontFamily ?? "inherit",
                          }}
                        >
                          {getPlayerInitials(turnPlayerName)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Turn Text */}
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase text-stone-500 tracking-wider flex items-center gap-1">
                      <span>{myTurn ? "YOUR TURN" : `${turnPlayerName.toUpperCase()}'S TURN`}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    </div>
                    <div className="text-sm font-black text-stone-900 truncate">
                      {myTurn ? "It's your turn!" : `${turnPlayerName} is drawing...`}
                    </div>
                  </div>
                </div>

                {/* Hand-Drawn Stopwatch Countdown Circle */}
                <div className="relative w-12 h-12 rounded-full border-2 border-emerald-600/80 bg-emerald-50/50 flex-shrink-0 flex flex-col items-center justify-center text-center shadow-xs">
                  <span className="text-xs font-black text-emerald-800 leading-none">
                    {secondsLeft > 0 ? secondsLeft : 30}
                  </span>
                  <span className="text-[8px] uppercase font-bold text-emerald-700 tracking-tighter">
                    SEC
                  </span>
                </div>
              </div>

              {/* 2. CHAT Card with Handwritten Notes */}
              <div className="flex-1 min-h-[300px] p-4 rounded-3xl bg-white/90 border-2 border-[#E5DAC6] shadow-sm flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 px-1 border-b border-[#E5DAC6] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-stone-600 font-['Architects_Daughter',cursive] flex items-center gap-2">
                    <span>💬</span>
                    <span>CHAT</span>
                  </h3>
                  <span className="text-[10px] text-stone-400 font-sans">Classroom Notes</span>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                  {(props.messages ?? []).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                      No notes passed yet. Write something!
                    </div>
                  ) : (
                    (props.messages ?? []).slice(-20).map((m, i) => {
                      const senderTheme = themeOf(m.playerId ?? "");
                      return (
                        <div
                          key={i}
                          className="text-sm p-2 rounded-xl bg-[#FCFAF2] border border-[#E5DAC6] shadow-2xs"
                        >
                          <span
                            className="font-bold mr-1"
                            style={{
                              color: senderTheme.primary,
                              fontFamily: senderTheme.fontFamily ?? "inherit",
                            }}
                          >
                            {m.playerName}:
                          </span>
                          <span className="text-stone-800">{m.text}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Pass a note..."
                    className="flex-1 min-w-0 bg-[#FCFAF2] border-2 border-[#E5DAC6] rounded-xl px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <button
                    type="submit"
                    className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    ➤
                  </button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* ── Wide Scorecard Modal ── */}
      <DotsBoxesScorecardModal
        open={showScorecard}
        onClose={() => setShowScorecard(false)}
        rankedPlayers={rankedPlayers}
        winner={winner}
        isTie={isTie}
        selfId={selfId}
        players={props.players}
        totalBoxes={totalBoxes}
        moveCount={state.moveCount}
        skin="notebook"
        onLeave={props.onLeave}
      />

      {/* ── Help Modal ── */}
      {showHelp && (
        <Modal
          open={showHelp}
          onClose={() => setShowHelp(false)}
          ariaLabel="How to Play Dots & Boxes"
          panelClassName="w-full max-w-lg bg-[#FCF8EE] rounded-3xl border-2 border-[#D7C9B1] shadow-2xl overflow-hidden p-6 text-stone-900 font-['Patrick_Hand',cursive]"
        >
          <div className="space-y-4 text-sm text-stone-800">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#E5DAC6]">
              <h3 className="text-xl font-bold text-stone-900 font-['Architects_Daughter',cursive]">
                How to Play Dots &amp; Boxes
              </h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border-2 border-blue-200">
              <span className="text-2xl">✏️</span>
              <p className="text-base">On your turn, click between two adjacent dots to draw a pencil/pen line.</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border-2 border-amber-200">
              <span className="font-black text-2xl text-amber-700">K</span>
              <p className="text-base">Complete the 4th side of any square box to claim it with your personal handwriting style!</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-purple-50 border-2 border-purple-200">
              <span className="text-2xl">⏱️</span>
              <p className="text-base">Each player has a <strong>30-second timer</strong> to make their move.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <Modal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          ariaLabel="Game Settings"
          panelClassName="w-full max-w-lg bg-[#FCF8EE] rounded-3xl border-2 border-[#D7C9B1] shadow-2xl overflow-hidden p-6 text-stone-900 font-['Patrick_Hand',cursive]"
        >
          <div className="space-y-4 text-sm text-stone-800">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#E5DAC6]">
              <h3 className="text-lg font-bold text-stone-900 font-['Architects_Daughter',cursive]">Game Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border-2 border-[#E5DAC6]">
              <span className="font-bold text-base">Game Theme</span>
              <button
                type="button"
                onClick={toggleSkin}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-xs transition-all"
              >
                {skin === "notebook" ? "Switch to Neon" : "Switch to Notebook"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Fullscreen 10-Second Turn Urgency Pulse ── */}
      <TurnTimeWarning
        deadline={state.turnDeadline}
        active={myTurn && state.phase === "playing"}
      />
    </div>
  );
}
