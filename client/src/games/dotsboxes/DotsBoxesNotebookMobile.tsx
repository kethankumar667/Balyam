import React, { useState } from "react";
import type { DotsBoxesBoardProps } from "./useDotsBoxesBoard";
import { useDotsBoxesBoard } from "./useDotsBoxesBoard";
import DotsBoxesBoardGrid from "./DotsBoxesBoardGrid";
import {
  DotsBoxesNotebookLogo,
  SpiralBinderRings,
  getPlayerInitials,
  PaperAirplaneDoodle,
  PencilDoodle,
  DoodleStar,
  SmileyDoodle,
} from "./dotsboxes-theme";
import DotsBoxesDominanceBar from "./DotsBoxesDominanceBar";
import DotsBoxesScorecardModal from "./DotsBoxesScorecardModal";
import Modal from "../../components/Modal";
import SeatAvatar from "../../components/profile/SeatAvatar";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import {
  MessageSquare,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  LogOut,
  Trophy,
  Zap,
  BookOpen,
  Target,
} from "lucide-react";
import Chat from "../../components/Chat";
import { getSocket } from "../../lib/socket";

export default function DotsBoxesNotebookMobile(props: DotsBoxesBoardProps) {
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

  const [showChatModal, setShowChatModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
    <div className="relative min-h-[100dvh] w-full bg-[#1C1814] text-stone-900 flex flex-col items-center justify-between p-2 select-none font-['Patrick_Hand',cursive] overflow-hidden">
      {/* ── Main Notebook Sheet ── */}
      <div className="relative w-full flex-1 flex flex-col bg-[#FCF8EE] rounded-3xl border-2 border-[#D7C9B1] shadow-2xl overflow-hidden">
        {/* Top Spiral Wire Binder */}
        <div className="w-full h-8 bg-[#EFE9DA] border-b-2 border-[#D7C9B1] flex items-center justify-center relative shadow-inner">
          <SpiralBinderRings orientation="horizontal" count={12} />
        </div>

        {/* ── 1. Header Bar ── */}
        <header className="relative z-20 w-full px-2.5 sm:px-3 py-2 border-b border-[#E5DAC6] bg-[#FCF8EE]/95 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DotsBoxesNotebookLogo className="scale-90 origin-left" />

            <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-blue-200 bg-white/90 text-[11px] shadow-xs">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-black text-blue-950 font-sans">{targetBoxes} Bx</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleSkin}
              className="w-8 h-8 rounded-xl border border-amber-400/80 bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-700 shadow-xs active:scale-95 cursor-pointer transition-all"
              title="Toggle Theme"
            >
              {skin === "notebook" ? <Zap className="w-4 h-4 text-amber-500 fill-amber-400" /> : <BookOpen className="w-4 h-4 text-stone-700" />}
            </button>

            {isFinished && (
              <button
                type="button"
                onClick={() => setShowScorecard(true)}
                className="px-2.5 h-8 rounded-xl border border-amber-500 bg-amber-400 text-stone-950 font-black text-xs shadow-xs flex items-center gap-1 active:scale-95 transition-all"
              >
                <Trophy className="w-3.5 h-3.5 text-stone-950" />
                <span>Scores</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded-xl border border-stone-300 bg-white flex items-center justify-center text-stone-700 shadow-xs hover:border-stone-400 active:scale-95 transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 rounded-xl border border-stone-300 bg-white flex items-center justify-center text-stone-700 shadow-xs hover:border-stone-400 active:scale-95 transition-all cursor-pointer"
              title="Help"
            >
              <HelpCircle className="w-4 h-4 text-stone-600" />
            </button>

            <button
              type="button"
              onClick={props.onLeave}
              className="w-8 h-8 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-700 shadow-xs hover:border-rose-400 active:scale-95 transition-all cursor-pointer"
              title="Leave Game"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
            </button>
          </div>
        </header>

        {/* ── 2. Player Capsule Score Horizon (Matching Neon Theme Layout) ── */}
        <section className="relative z-10 w-full px-2 py-2 border-b border-[#E5DAC6] bg-white/50">
          <div className="flex items-stretch justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {state.playerOrder.map((pid) => {
              const theme = themeOf(pid);
              const isTurn = !isFinished && state.turnPlayerId === pid;
              const isWinner = isFinished && winner?.pid === pid && !isTie;
              const isSelf = pid === selfId;
              const score = scoreOf(pid);
              const name = nameOf(pid);
              const avatar = avatarOf(pid);
              const handwritingFont = theme.fontFamily ?? "inherit";

              return (
                <div
                  key={pid}
                  className={`flex-1 min-w-[54px] max-w-[76px] flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-300 ${
                    isWinner
                      ? "bg-amber-100 border-2 border-amber-500 shadow-md scale-105"
                      : isTurn
                      ? "bg-blue-50 border-2 border-blue-600 shadow-[0_0_14px_rgba(37,99,235,0.25)] scale-105"
                      : "bg-white/90 border border-[#E5DAC6]"
                  }`}
                >
                  {/* Header label: Name */}
                  <span
                    className={`text-[10px] font-bold truncate max-w-full uppercase tracking-wider mb-1 ${
                      isWinner
                        ? "text-amber-800"
                        : isTurn
                        ? "text-blue-800 font-extrabold"
                        : "text-stone-600"
                    }`}
                    style={{ fontFamily: handwritingFont }}
                    title={name}
                  >
                    {name}
                  </span>

                  {/* Avatar with colored rim */}
                  <div
                    className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 mb-1 flex items-center justify-center"
                    style={{
                      backgroundColor: theme.primary,
                      boxShadow: isTurn || isWinner ? `0 0 10px ${theme.glow}` : "none",
                    }}
                  >
                    {isWinner && (
                      <span className="absolute -top-2.5 text-xs">👑</span>
                    )}
                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                      {avatar ? (
                        <SeatAvatar avatar={avatar} name={name} className="w-full h-full object-cover" />
                      ) : (
                        <span
                          className="font-bold text-xs"
                          style={{ color: theme.primary, fontFamily: handwritingFont }}
                        >
                          {getPlayerInitials(name)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2-Digit Bold Score */}
                  <span
                    className="font-black text-base sm:text-lg tracking-tight leading-none my-0.5"
                    style={{ color: theme.primary, fontFamily: handwritingFont }}
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

        {/* ── 3. Active Turn Status Banner & Dominance Bar ── */}
        <div className="relative z-10 px-3 py-1.5 flex flex-col gap-1 bg-amber-50/70 border-b border-[#E5DAC6]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block flex-shrink-0" />
              <span className="text-xs font-bold text-stone-800 truncate">
                {myTurn ? "🔵 Your Turn — Tap 2 dots" : `✏️ ${turnPlayerName}'s Turn`}
              </span>
            </div>

            {secondsLeft > 0 && (
              <span className="px-2 py-0.5 rounded-full border border-emerald-600 bg-emerald-100 text-emerald-800 text-xs font-black">
                ⏱️ {secondsLeft}s
              </span>
            )}
          </div>

          {/* Territory Dominance Progress Meter */}
          <DotsBoxesDominanceBar
            rankedPlayers={rankedPlayers}
            totalBoxes={totalBoxes}
            skin="notebook"
            compact
          />
        </div>

        {/* ── 4. Main White Board Matrix ── */}
        <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-2 min-h-0 overflow-hidden">
          {/* Subtle Margin Doodles */}
          <PaperAirplaneDoodle className="absolute top-1 -right-1 w-12 h-12 opacity-60 pointer-events-none rotate-[14deg]" />
          <DoodleStar className="absolute bottom-3 left-1 w-4 h-4 text-amber-500 opacity-60 pointer-events-none" />
          <PencilDoodle className="absolute bottom-1 -right-2 w-10 h-10 opacity-60 pointer-events-none rotate-[30deg]" />

          {/* Combo Streak Banner Notification */}
          {comboBanner && (
            <div className="absolute top-2 z-30 px-4 py-1.5 rounded-2xl bg-amber-400 border-2 border-stone-900 shadow-xl text-stone-950 font-black text-sm tracking-wider animate-bounce font-['Architects_Daughter',cursive]">
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
            skin="notebook"
            themeOf={themeOf}
            nameOf={nameOf}
            onDrawLine={drawLine}
          />
        </main>

        {/* ── 5. Bottom Action Controls ── */}
        <footer className="relative z-10 w-full px-3 py-2 border-t border-[#E5DAC6] bg-white/80 flex items-center justify-between gap-2">
          {/* Chat Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-700 shadow-xs active:scale-95"
          >
            <MessageSquare className="w-3.5 h-3.5 text-stone-600" />
            <span>Notes</span>
            {(props.messages ?? []).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {(props.messages ?? []).length}
              </span>
            )}
          </button>

          {/* Instruction */}
          <div className="text-[11px] text-stone-500 font-bold truncate">
            {isFinished ? "Match Completed" : "Tap adjacent dots to draw"}
          </div>

          {/* Undo */}
          <button
            type="button"
            onClick={useUndo}
            disabled={isFinished}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-800 shadow-xs disabled:opacity-40 active:scale-95"
          >
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
              {undoCount}
            </span>
            <RotateCcw className="w-3 h-3 text-stone-700" />
            <span>Undo</span>
          </button>
        </footer>
      </div>

      {/* ── Scorecard Modal ── */}
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

      {/* ── Mobile Chat Sheet Modal ── */}
      {showChatModal && (
        <Modal
          open={showChatModal}
          onClose={() => setShowChatModal(false)}
          ariaLabel="Classroom Notes & Chat"
          mobileSheet={true}
          panelClassName="w-full max-w-md bg-[#FCF8EE] rounded-t-3xl sm:rounded-3xl border-2 border-[#D7C9B1] shadow-2xl overflow-hidden text-stone-900 p-4"
        >
          <div className="flex flex-col h-[70vh] max-h-[520px]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b-2 border-[#E5DAC6]">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <h3 className="text-base font-black text-stone-900 uppercase tracking-wider font-['Architects_Daughter',cursive]">
                  Classroom Notes &amp; Chat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 font-bold flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Battle-Tested Responsive Chat Engine */}
            <div className="flex-1 min-h-0">
              <Chat messages={props.messages ?? []} selfId={selfId} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Help Modal ── */}
      {showHelp && (
        <Modal
          open={showHelp}
          onClose={() => setShowHelp(false)}
          ariaLabel="How to Play"
          mobileSheet={true}
          panelClassName="w-full max-w-md bg-[#FCF8EE] rounded-t-3xl sm:rounded-3xl border-2 border-[#D7C9B1] shadow-2xl p-5 text-stone-900 font-['Patrick_Hand',cursive]"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#E5DAC6]">
            <h3 className="text-lg font-bold text-stone-900 font-['Architects_Daughter',cursive]">
              How to Play Dots &amp; Boxes
            </h3>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-200">
              <span className="text-xl">✏️</span>
              <p>Tap between two adjacent dots to draw a pencil/pen line.</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="font-bold text-xl text-amber-700">K</span>
              <p>Complete the 4th side of any box to claim it with your personal handwriting style!</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-purple-50 border border-purple-200">
              <span className="text-xl">⏱️</span>
              <p>Each player has a <strong>30-second timer</strong> per turn.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Urgency Pulse ── */}
      <TurnTimeWarning
        deadline={state.turnDeadline}
        active={myTurn && state.phase === "playing"}
      />
    </div>
  );
}
