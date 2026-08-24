import React, { useState } from "react";
import type { DotsBoxesBoardProps } from "./useDotsBoxesBoard";
import { useDotsBoxesBoard } from "./useDotsBoxesBoard";
import DotsBoxesBoardGrid from "./DotsBoxesBoardGrid";
import { DotsBoxesNeonLogo, getPlayerInitials } from "./dotsboxes-theme";
import DotsBoxesDominanceBar from "./DotsBoxesDominanceBar";
import DotsBoxesScorecardModal from "./DotsBoxesScorecardModal";
import Chat from "../../components/Chat";
import Modal from "../../components/Modal";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { HelpCircle, Settings, BookOpen, Target, Timer, Flag, MessageSquare, RotateCcw, Volume2, VolumeX, LogOut } from "lucide-react";

export default function DotsBoxesBoardMobile(props: DotsBoxesBoardProps) {
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

  const [showChat, setShowChat] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const turnPlayerName = nameOf(state.turnPlayerId);
  const turnPlayerTheme = themeOf(state.turnPlayerId);

  return (
    <div className="relative min-h-screen w-full bg-[#080A1A] text-slate-100 flex flex-col justify-between overflow-x-hidden p-3 sm:p-4 select-none">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />

      {/* ── 1. Top Header ── */}
      <header className="relative z-10 w-full flex flex-col items-center gap-2">
        <div className="w-full flex items-center justify-between">
          {/* Back Button */}
          <button
            type="button"
            onClick={props.onLeave}
            className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* Center Neon Logo */}
          <DotsBoxesNeonLogo />

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSkin}
              className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-amber-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-xs"
              aria-label="Help"
            >
              <HelpCircle className="w-4 h-4 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-xs"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Target / Completed / Timer Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 shadow-md">
          {isFinished ? (
            <>
              <Flag className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Match Completed</span>
            </>
          ) : (
            <>
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>Target:</span>
              <span className="text-amber-400 font-bold">{targetBoxes} Boxes</span>
              <span className="text-slate-600">|</span>
              <Timer className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-sky-400">30s</span>
            </>
          )}
        </div>
      </header>

      {/* ── 2. Player Score Horizon ── */}
      <section className="relative z-10 w-full my-2">
        <div className="flex items-stretch justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
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
                className={`flex-1 min-w-[56px] max-w-[76px] flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-300 ${
                  isWinner
                    ? "bg-amber-950/40 border-2 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.4)] scale-105"
                    : isTurn
                    ? "bg-slate-900/95 border-2 border-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.4)] scale-105"
                    : "bg-slate-900/40 border border-slate-800/80"
                }`}
              >
                {/* Header label: Name */}
                <span
                  className={`text-[10px] font-bold truncate max-w-full uppercase tracking-wider mb-1 ${
                    isWinner ? "text-amber-400" : isTurn ? "text-blue-400" : "text-slate-400"
                  }`}
                  title={name}
                >
                  {isSelf ? `${name}` : name}
                </span>

                {/* Avatar with colored rim */}
                <div
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 mb-1.5 flex items-center justify-center"
                  style={{
                    backgroundColor: theme.primary,
                    boxShadow: isTurn || isWinner ? `0 0 12px ${theme.glow}` : "none",
                  }}
                >
                  {isWinner && (
                    <span className="absolute -top-2.5 text-xs">👑</span>
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

                {/* 2-Digit Bold Score */}
                <span
                  className="font-black text-base sm:text-lg tracking-tight"
                  style={{ color: theme.light }}
                >
                  {score.toString().padStart(2, "0")}
                </span>

                {/* Status Dot */}
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1"
                  style={{ backgroundColor: theme.primary }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. Turn Status Pill with 30s Countdown ── */}
      <div className="relative z-10 flex justify-center my-1">
        {isFinished ? (
          <button
            type="button"
            onClick={() => setShowScorecard(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-xs sm:text-sm font-bold text-amber-200 animate-bounce cursor-pointer"
          >
            <span>🏆</span>
            <span>
              {isTie
                ? "Match Tied! View Scorecard"
                : `${winner?.name ?? "Winner"} Won! View Scorecard`}
            </span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.3)] text-xs sm:text-sm font-bold text-white">
            <div
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_currentColor] animate-pulse"
              style={{ backgroundColor: turnPlayerTheme.primary, color: turnPlayerTheme.primary }}
            />
            <span>{myTurn ? "Your Turn" : `${turnPlayerName}'s Turn`}</span>
            {secondsLeft > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                secondsLeft <= 5
                  ? "bg-rose-500 text-white animate-ping"
                  : secondsLeft <= 10
                  ? "bg-amber-500/80 text-white"
                  : "bg-blue-600/60 text-sky-200"
              }`}>
                {secondsLeft}s
              </span>
            )}
          </div>
        )}

        {/* Territory Dominance Tug-of-War Bar */}
        <div className="w-full px-2 mt-1">
          <DotsBoxesDominanceBar
            rankedPlayers={rankedPlayers}
            totalBoxes={totalBoxes}
            skin="neon"
            compact
          />
        </div>
      </div>

      {/* ── 4. Main White Board Matrix ── */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center my-1">
        {/* Combo Streak Banner Notification */}
        {comboBanner && (
          <div className="absolute top-2 z-30 px-4 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] text-slate-950 font-black text-sm tracking-wider animate-bounce">
            {comboBanner}
          </div>
        )}

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
        />
      </main>

      {/* ── 5. Info Banner ── */}
      <div className="relative z-10 w-full flex items-center justify-between text-xs px-2 my-1 text-slate-300">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
          <span>🎁</span>
          <span>
            {isFinished
              ? `All ${totalBoxes} boxes claimed!`
              : (
                <>
                  Complete a box and take <strong className="text-amber-400 font-bold">another turn!</strong>
                </>
              )}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400">
          <span>ℹ️</span>
          <span>👥 {state.playerOrder.length} Players</span>
        </div>
      </div>

      {/* ── 6. Bottom Action Dock ── */}
      <footer className="relative z-10 w-full flex flex-col gap-2 mt-1">
        <div className="w-full flex items-center justify-between gap-2">
          {/* Chat Button */}
          <button
            type="button"
            onClick={() => setShowChat(true)}
            className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-lg"
            aria-label="Open Chat"
          >
            {(props.messages ?? []).length > 0 && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 text-white font-black text-[11px] flex items-center justify-center shadow-md">
                {(props.messages ?? []).length}
              </div>
            )}
            <span className="text-base mb-0.5">💬</span>
            <span className="text-[10px] font-semibold">Chat</span>
          </button>

          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-lg"
            aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? (
              <svg className="w-5 h-5 mb-0.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mb-0.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
            <span className="text-[10px] font-semibold">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Center Hint / Scorecard Card */}
          {isFinished ? (
            <button
              type="button"
              onClick={() => setShowScorecard(true)}
              className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 border border-amber-400/80 flex items-center justify-center gap-2 px-3 shadow-lg cursor-pointer active:scale-95 transition-all"
            >
              <span className="text-xl">🏆</span>
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Show Scorecard
              </span>
            </button>
          ) : (
            <div className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border border-slate-800 flex flex-col items-center justify-center px-3 shadow-lg">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600" />
                <div className="w-16 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600" />
              </div>
              <span className="text-[11px] text-slate-300 font-medium">Tap two dots to draw a line</span>
            </div>
          )}

          {/* Undo Button */}
          <button
            type="button"
            onClick={useUndo}
            disabled={isFinished}
            className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {/* Red Badge Count */}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[11px] flex items-center justify-center shadow-md">
              {undoCount}
            </div>
            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="text-[10px] font-semibold">Undo</span>
          </button>
        </div>

        {/* ── 7. Turn Order Sequence Footer ── */}
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs overflow-x-auto no-scrollbar">
          <span className="text-slate-400 font-semibold whitespace-nowrap">
            {isFinished ? "Standings >" : "Turn Order >"}
          </span>
          <div className="flex items-center gap-1.5">
            {(isFinished ? rankedPlayers.map((p) => p.pid) : state.playerOrder).map((pid, idx, arr) => {
              const theme = themeOf(pid);
              const isTurn = !isFinished && state.turnPlayerId === pid;
              const isWinner = isFinished && winner?.pid === pid && !isTie;
              const avatar = avatarOf(pid);
              const name = nameOf(pid);

              return (
                <React.Fragment key={`seq-${pid}`}>
                  <div
                    className={`relative w-7 h-7 rounded-full p-0.5 flex items-center justify-center transition-all ${
                      isWinner
                        ? "ring-2 ring-amber-400 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                        : isTurn
                        ? "ring-2 ring-blue-400 scale-110 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        : "opacity-80"
                    }`}
                    style={{ backgroundColor: theme.primary }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                      {avatar ? (
                        <SeatAvatar avatar={avatar} name={name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-[10px] text-white">
                          {getPlayerInitials(name)}
                        </span>
                      )}
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <span className="text-slate-600 text-xs">&gt;</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </footer>

      {/* ── 8. Deluxe Scorecard Modal ── */}
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

      {/* ── Chat Modal ── */}
      {showChat && (
        <Modal
          open={showChat}
          onClose={() => setShowChat(false)}
          ariaLabel="Room Chat"
          mobileSheet
          panelClassName="w-full max-w-lg bg-[#0B0E28] border-2 border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden p-4"
        >
          <div className="h-[420px] flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200">Room Chat</h3>
              <button
                type="button"
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <Chat messages={props.messages ?? []} selfId={selfId} />
          </div>
        </Modal>
      )}

      {/* ── Help Modal ── */}
      {showHelp && (
        <Modal
          open={showHelp}
          onClose={() => setShowHelp(false)}
          ariaLabel="How to Play Dots & Boxes"
          mobileSheet
          panelClassName="w-full max-w-lg bg-[#0B0E28] border-2 border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 text-slate-300"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <h3 className="text-base font-bold text-white mb-2">How to Play Dots &amp; Boxes</h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40">
              <span className="text-2xl">✏️</span>
              <p>On your turn, tap between two adjacent dots to draw a line segment.</p>
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
          mobileSheet
          panelClassName="w-full max-w-lg bg-[#0B0E28] border-2 border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 text-slate-300"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <h3 className="text-base font-bold text-white mb-2">Game Settings</h3>
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
