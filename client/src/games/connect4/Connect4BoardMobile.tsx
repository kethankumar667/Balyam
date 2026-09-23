import { useEffect, useRef, useState } from "react";
import { Connect4Grid } from "./Connect4Grid";
import type { Connect4BoardProps } from "./Connect4BoardProps";
import Chat from "../../components/Chat";
import Modal from "../../components/Modal";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { Connect4TutorialModal } from "./Connect4TutorialModal";
import { Connect4ThemeModal } from "./Connect4ThemeModal";
import { Connect4TokenRack } from "./Connect4TokenRack";
import { useConnect4Board } from "./useConnect4Board";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Palette,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  Trophy,
  MessageCircle,
  X,
} from "lucide-react";

export default function Connect4BoardMobile({
  state,
  players,
  selfId,
  messages,
  roomCode,
  onLeave,
}: Connect4BoardProps) {
  const [chatOpen, setChatOpen] = useState(false);

  // Unread-chat indicator on the chat icon — mirrors RummyBoardMobile's pattern.
  const lastSeenChatRef = useRef(messages.length);
  const hasUnreadChat = !chatOpen && messages.length > lastSeenChatRef.current;
  useEffect(() => {
    if (chatOpen) lastSeenChatRef.current = messages.length;
  }, [chatOpen, messages.length]);

  const {
    themeId,
    theme,
    handleSelectTheme,
    isMuted,
    handleMuteToggle,
    hoveredCol,
    setHoveredCol,
    tutorialOpen,
    setTutorialOpen,
    themeModalOpen,
    setThemeModalOpen,
    selfDisc,
    isPending,
    isMyTurn,
    dropDisc,
    isOver,
    outcome,
    p1,
    p2,
    p1Disc,
    p2Disc,
    p1DiscsPlaced,
    p2DiscsPlaced,
    secondsLeft,
    isTimerCritical,
    threat,
    handleRematch,
  } = useConnect4Board({ state, players, selfId });

  return (
    <div
      className={`relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden ${theme.envPatternClass} text-white font-sans transition-colors duration-500`}
    >
      {/* Environmental Atmospheric Lighting Cone from Above */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-700"
        style={{ background: theme.envLighting }}
      />

      <TurnTimeWarning deadline={state.turnDeadline} active={isMyTurn} />

      {/* Screen Reader Live Status Announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOver
          ? outcome.announcement
          : isMyTurn
          ? `Your turn. ${secondsLeft > 0 ? `${secondsLeft} seconds left.` : ""}`
          : `Opponent's turn.`}
      </div>

      {/* Top Mobile Bar */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-white/10 z-20 bg-black/40 backdrop-blur-xl">
        <button
          type="button"
          onClick={onLeave}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          aria-label="Leave match"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center min-w-0 px-2">
          <span className="text-xs font-bold tracking-wider uppercase text-white/95 truncate">
            {theme.venueTitle}
          </span>
          <span className="text-[10px] text-white/40 font-mono tracking-tight truncate">
            {theme.venueSubhead}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            aria-label={`Current theme: ${theme.name}. Tap to change theme.`}
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Tutorial Button */}
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            aria-label="Open how to play tutorial"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Audio Mute Button */}
          <button
            type="button"
            onClick={handleMuteToggle}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Chat Button */}
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors cursor-pointer"
            aria-label={hasUnreadChat ? "Open chat, unread messages" : "Open chat"}
          >
            <MessageCircle className="w-4 h-4" />
            {hasUnreadChat && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-black/40" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Player Podiums & Live Token Racks */}
      <section className="px-3 py-1.5 z-10">
        <div className="grid grid-cols-2 gap-2 max-w-[500px] mx-auto">
          <Connect4TokenRack
            playerName={p1?.name ?? "Player 1"}
            isSelf={p1?.id === selfId}
            discColor={p1Disc}
            tokensPlaced={p1DiscsPlaced}
            isActiveTurn={state.turnPlayerId === p1?.id && !isOver}
            theme={theme}
          />
          <Connect4TokenRack
            playerName={p2?.name ?? "Player 2"}
            isSelf={p2?.id === selfId}
            discColor={p2Disc}
            tokensPlaced={p2DiscsPlaced}
            isActiveTurn={state.turnPlayerId === p2?.id && !isOver}
            theme={theme}
          />
        </div>

        {/* Threat Alert or Turn Status Pill */}
        {threat ? (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 text-[10px] font-mono tracking-wider uppercase mx-auto w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Flank Threat Warning</span>
          </div>
        ) : !isOver && state.turnDeadline ? (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-black/40 border border-white/10 text-white/70 text-[10px] font-mono mx-auto w-fit">
            <span className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? "bg-amber-400" : "bg-white/40"} ${isTimerCritical ? "bg-rose-400 animate-ping" : ""}`} />
            <span>{isMyTurn ? "Your turn" : "Opponent thinking"}</span>
            <span className="text-white/30">·</span>
            <span className="font-bold tabular-nums text-white">{secondsLeft}s</span>
          </div>
        ) : null}
      </section>

      {/* Main Grid Area */}
      <main className="flex-1 flex items-center justify-center px-1.5 py-1 z-10 overflow-hidden">
        <div className={`relative w-full max-w-[min(98vw,480px)] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 border transition-all duration-300 overflow-hidden ${theme.tableMat}`}>
          {/* Environmental Table Texture Overlay */}
          <div className={`absolute inset-0 pointer-events-none rounded-2xl sm:rounded-3xl ${theme.tableTextureOverlay}`} />
          <Connect4Grid
            grid={state.grid}
            winningCells={state.winningCells}
            lastMove={state.lastMove}
            theme={theme}
            isMyTurn={isMyTurn}
            disabled={isPending || isOver}
            onDrop={(col) => dropDisc(col)}
            hoveredCol={hoveredCol}
            onHoverCol={setHoveredCol}
            myDisc={selfDisc ?? "R"}
          />
        </div>
      </main>

      {/* Outcome / Rematch Footer with Safe-Area Inset */}
      <footer className="px-4 py-3 border-t border-white/10 bg-black/60 backdrop-blur-xl z-20 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {isOver ? (
          <div className="flex flex-col items-center gap-2.5 max-w-[420px] mx-auto">
            <div className="flex items-center gap-2 text-white">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                {outcome.headline}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={handleRematch}
                className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-white hover:bg-white/90 text-slate-950 font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rematch
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="min-h-[46px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 font-medium text-xs transition-colors cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-[11px] text-white/50 font-mono tracking-tight py-0.5">
            {isMyTurn ? "Tap any column to place your stone" : "Waiting for opponent move"}
          </div>
        )}
      </footer>

      {/* Theme Switcher Modal */}
      <Connect4ThemeModal
        isOpen={themeModalOpen}
        currentThemeId={themeId}
        onSelectTheme={handleSelectTheme}
        onClose={() => setThemeModalOpen(false)}
      />

      {/* Tutorial Modal */}
      <Connect4TutorialModal
        isOpen={tutorialOpen}
        theme={theme}
        onClose={() => setTutorialOpen(false)}
      />

      {/* Chat Sheet */}
      <Modal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        ariaLabelledBy="connect4-chat-title"
        mobileSheet
        panelClassName="w-full max-w-lg h-[70dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-black/90 backdrop-blur-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <h2 id="connect4-chat-title" className="text-sm font-bold text-white tracking-tight">
            Chat
          </h2>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 dark">
          <Chat messages={messages} selfId={selfId} />
        </div>
      </Modal>
    </div>
  );
}
