import React, { useState } from "react";
import type { DotsBoxesBoardProps } from "./useDotsBoxesBoard";
import { useDotsBoxesBoard } from "./useDotsBoxesBoard";
import DotsBoxesBoardGrid from "./DotsBoxesBoardGrid";
import { DotsBoxesNeonLogo, getPlayerInitials } from "./dotsboxes-theme";
import DotsBoxesDominanceBar from "./DotsBoxesDominanceBar";
import DotsBoxesScorecardModal from "./DotsBoxesScorecardModal";
import Modal from "../../components/Modal";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useTutorialGate, markSeen } from "../../components/GameTutorial";
import { DOTSBOXES_TUTORIAL } from "../tutorials";
import { getSocket } from "../../lib/socket";

export default function DotsBoxesBoardDesktop(props: DotsBoxesBoardProps) {
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

  // Auto-opens once per browser on first reaching the board — see the
  // matching comment in DotsBoxesBoardMobile.tsx.
  const helpTut = useTutorialGate(DOTSBOXES_TUTORIAL.key, !myTurn || secondsLeft == null);
  const showHelp = helpTut.open;
  const closeHelp = () => {
    markSeen(DOTSBOXES_TUTORIAL.key);
    helpTut.setOpen(false);
  };
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
    <div className="relative min-h-screen w-full bg-[#070919] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_70%_at_50%_-10%,rgba(59,130,246,0.18),rgba(255,255,255,0))]" />

      {/* ── 1. Top Header Bar ── */}
      <header className="relative z-20 w-full h-16 flex-shrink-0 px-6 border-b border-slate-800/80 bg-[#090B20]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-6">
          <DotsBoxesNeonLogo />

          {/* Target / Completed Card */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-inner">
            <span className="text-base text-red-400">{isFinished ? "🏁" : "🎯"}</span>
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-400">
                {isFinished ? "Status" : "Target"}
              </div>
              <div className="text-xs font-black text-amber-400">
                {isFinished ? "Match Completed" : `${targetBoxes} Boxes`}
              </div>
            </div>
          </div>

          {/* Game Mode Card with 30s Turn Indicator */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-inner">
            <span className="text-base text-sky-400">⏱️</span>
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-400">Turn Timer</div>
              <div className="text-xs font-black text-slate-200">30s Per Player</div>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSkin}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-400/40 shadow-xs cursor-pointer active:scale-95 transition-all"
            title="Switch Theme"
          >
            <span>📓 Notebook Theme</span>
          </button>

          {isFinished && (
            <button
              type="button"
              onClick={() => setShowScorecard(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 transition-all cursor-pointer"
            >
              <span>🏆</span>
              <span>Scorecard</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => helpTut.setOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm hover:border-slate-700"
          >
            <span className="text-sm">?</span>
            <span>Help</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm hover:border-slate-700"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={props.onLeave}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Leave Game"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* ── 2. 3-Column Game Area (Full Width, No Side Nav) ── */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* ── Left Column: Players List (3 Cols) ── */}
        <section className="col-span-3 h-full flex flex-col rounded-3xl bg-[#0B0E28]/90 border border-slate-800/90 p-4 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              PLAYERS ({state.playerOrder.length}/6)
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {state.playerOrder.map((pid) => {
              const theme = themeOf(pid);
              const isTurn = !isFinished && state.turnPlayerId === pid;
              const isWinner = isFinished && winner?.pid === pid && !isTie;
              const isSelf = pid === selfId;
              const score = scoreOf(pid);
              const name = nameOf(pid);
              const avatar = avatarOf(pid);

              return (
                <div
                  key={pid}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-200 ${
                    isWinner
                      ? "bg-amber-950/40 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                      : isTurn
                      ? "bg-blue-950/50 border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div
                      className="relative w-10 h-10 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center"
                      style={{
                        backgroundColor: theme.primary,
                        boxShadow: isTurn || isWinner ? `0 0 10px ${theme.glow}` : "none",
                      }}
                    >
                      {isWinner && (
                        <div className="absolute -top-2 -left-1 text-amber-400 text-xs">👑</div>
                      )}
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

                    {/* Name & Turn / Winner Status */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-200 truncate" title={name}>
                          {name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-blue-400 font-bold bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-800/60">
                            You
                          </span>
                        )}
                        <span
                          className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                          style={{ backgroundColor: theme.primary }}
                        />
                      </div>
                      {isWinner ? (
                        <span className="text-[11px] font-bold text-amber-400">
                          Winner 👑
                        </span>
                      ) : isTurn ? (
                        <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />
                          {isSelf ? "Your Turn" : "Thinking..."}
                          {secondsLeft > 0 && ` (${secondsLeft}s)`}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* 2-Digit Score */}
                  <span
                    className="font-black text-xl tracking-tight"
                    style={{ color: theme.light }}
                  >
                    {score.toString().padStart(2, "0")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Center Column: Matrix Board + Controls (6 Cols) ── */}
        <main className="col-span-6 h-full flex flex-col justify-between items-center overflow-hidden relative">
          {/* Combo Streak Banner Notification */}
          {comboBanner && (
            <div className="absolute top-2 z-30 px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] text-slate-950 font-black text-lg tracking-wider animate-bounce">
              {comboBanner}
            </div>
          )}

          {/* Territory Dominance Tug-of-War Bar */}
          <div className="w-full max-w-[540px] px-2 mb-1">
            <DotsBoxesDominanceBar
              rankedPlayers={rankedPlayers}
              totalBoxes={totalBoxes}
              skin="neon"
            />
          </div>

          {/* White Board Card */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0">
            <DotsBoxesBoardGrid
              size={size}
              hLines={state.hLines}
              vLines={state.vLines}
              claims={state.claims}
              playerOrder={state.playerOrder}
              selfId={selfId}
              canPlay={canPlay}
              skin="neon"
              themeOf={themeOf}
              nameOf={nameOf}
              onDrawLine={drawLine}
              className="max-h-[520px]"
            />
          </div>

          {/* Bottom Desktop Action Bar */}
          <div className="w-full flex items-center justify-between gap-3 mt-3 px-1">
            {/* Center Hint / Scorecard Card */}
            {isFinished ? (
              <button
                type="button"
                onClick={() => setShowScorecard(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 border border-amber-400 text-white shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all text-xs font-black uppercase tracking-wider"
              >
                <span>🏆 View Match Scorecard</span>
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border border-slate-800 text-xs text-slate-300 shadow-md">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-600" />
                  <div className="w-12 h-1 rounded-full bg-blue-500" />
                  <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-600" />
                </div>
                <span className="font-medium">Click or drag between two dots to draw a line</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Undo Button */}
              <button
                type="button"
                onClick={useUndo}
                disabled={isFinished}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md text-xs font-bold disabled:opacity-50"
              >
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center">
                  {undoCount}
                </div>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>Undo</span>
              </button>

              {/* Leave Game */}
              <button
                type="button"
                onClick={props.onLeave}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/50 text-rose-300 transition-all cursor-pointer shadow-md text-xs font-bold"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Leave</span>
              </button>
            </div>
          </div>
        </main>

        {/* ── Right Column: Turn Status & Expanded Chat (3 Cols) ── */}
        <aside className="col-span-3 h-full flex flex-col gap-4 overflow-hidden">
          {/* 1. YOUR TURN / MATCH FINISHED Card with 30s Countdown */}
          <div className="p-4 rounded-3xl bg-[#0B0E28]/90 border border-slate-800/90 shadow-xl flex items-center gap-4">
            {isFinished ? (
              <>
                <div
                  className="w-12 h-12 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: winner?.theme.primary ?? "#F59E0B" }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                    <span className="text-xl">🏆</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      MATCH COMPLETED
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                  <div className="text-sm font-black text-white">
                    {isTie
                      ? "It's a Tie!"
                      : winner?.pid === selfId
                      ? "You Won!"
                      : `${winner?.name ?? "Player"} Won!`}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isTie ? `${winner?.score} boxes each` : `${winner?.score} boxes captured`}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  className="relative w-12 h-12 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: turnPlayerTheme.primary }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                    {turnPlayerAvatar ? (
                      <SeatAvatar avatar={turnPlayerAvatar} name={turnPlayerName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-sm text-white">
                        {getPlayerInitials(turnPlayerName)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                      {myTurn ? "YOUR TURN" : `${turnPlayerName.toUpperCase()}'S TURN`}
                    </span>
                    {secondsLeft > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        secondsLeft <= 5
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-blue-600/50 text-sky-300"
                      }`}>
                        ⏱️ {secondsLeft}s
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-white truncate">
                    {myTurn ? "It's your turn!" : `${turnPlayerName} is thinking...`}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {secondsLeft > 0 ? `${secondsLeft}s to make move` : "Draw a line between two dots."}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. CHAT Card (Expanded to full remaining height) */}
          <div className="flex-1 min-h-[300px] p-4 rounded-3xl bg-[#0B0E28]/90 border border-slate-800/90 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>💬</span>
                <span>CHAT</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">Table Messages</span>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
              {(props.messages ?? []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                  No messages yet. Say hi!
                </div>
              ) : (
                (props.messages ?? []).slice(-20).map((m, i) => (
                  <div key={i} className="text-xs p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <span className="font-bold text-amber-400">{m.playerName}: </span>
                    <span className="text-slate-200">{m.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 min-w-0 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-xs transition-all cursor-pointer shadow-md"
              >
                ➤
              </button>
            </form>
          </div>
        </aside>
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
        skin="neon"
        onLeave={props.onLeave}
      />

      {/* ── Help Modal ── */}
      {showHelp && (
        <Modal
          open={showHelp}
          onClose={closeHelp}
          ariaLabel="How to Play Dots & Boxes"
          panelClassName="w-full max-w-lg bg-[#0B0E28] border-2 border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-300"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">How to Play Dots &amp; Boxes</h3>
              <button
                type="button"
                onClick={closeHelp}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40">
              <span className="text-2xl">✏️</span>
              <p>On your turn, click between two adjacent dots to draw a line segment.</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/40">
              <span className="font-black text-xl text-amber-400">K</span>
              <p>Complete the 4th side of any box to claim it with your initials (e.g. KK for Kethan Kumar, M for Monica)!</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/40 border border-purple-800/40">
              <span className="text-2xl">⏱️</span>
              <p>Each turn has a <strong>30-second timer</strong>. Make your move before time expires!</p>
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
          panelClassName="w-full max-w-lg bg-[#0B0E28] border-2 border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-300"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Game Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span>Game Audio &amp; Sound</span>
              <button
                type="button"
                onClick={toggleMute}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
              >
                {isMuted ? "Unmute" : "Mute"}
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
