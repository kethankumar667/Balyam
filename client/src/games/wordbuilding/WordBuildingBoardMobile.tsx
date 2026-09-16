import React, { useEffect, useMemo, useState } from "react";
import WordBuildingTutorialModal from "./TutorialModal";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useWordBuildingBoard, type WordBuildingBoardProps } from "./useWordBuildingBoard";
import { getInkDisplayColor } from "./inks";
import {
  WordBuildingNotebookLogo,
  WordBuildingNeonLogo,
  Grid,
  LetterPad,
  VocabularyFoundCard,
  ReportCardOverlay,
} from "./wordbuilding-shared";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import {
  WordBuildingWinnerCelebration,
  WordBuildingComboBanner,
} from "./WordBuildingAnimations";
import { useAudio } from "../../hooks/useAudio";
import CoachHintButton from "../../components/CoachHintButton";
import Modal from "../../components/Modal";
import Chat from "../../components/Chat";
import {
  BookOpen,
  Zap,
  HelpCircle,
  Volume2,
  VolumeX,
  Trophy,
  Target,
  Timer,
  Flag,
  LogOut,
} from "lucide-react";
import { getPlayerInitials, SpiralBinderRings } from "../dotsboxes/dotsboxes-theme";

/**
 * Viewport-fitted cell size ensuring the matrix never overflows narrow phones.
 */
function useFitCellPx(size: number): number {
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 360));
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  const cap = size === 8 ? 44 : size === 10 ? 38 : 28;
  const avail = Math.min(vw, 480) - 32;
  const raw = Math.floor((avail - (size - 1) * 2) / size);
  return Math.max(18, Math.min(cap, raw));
}

/**
 * Word Building — mobile shell.
 * Redesigned to follow the clean, responsive Dots & Boxes mobile layout paradigm:
 * 1. Top Header (back button, center branded logo, action icons, mode/grid pill).
 * 2. Player Score Horizon (avatar, ink ring, reaction target, bold 2-digit score).
 * 3. Turn Status Pill (active player + live 30s timer).
 * 4. Main Matrix Board + Letter Pad (centered grid + virtual keyboard).
 * 5. Info Banner.
 * 6. Bottom Action Dock (Chat, Vocabulary Sheet, Scorecard, Leave, Turn Sequence).
 */
export default function WordBuildingBoardMobile(props: WordBuildingBoardProps) {
  const { state, selfId, roomCode, messages, onLeave } = props;
  const m = useWordBuildingBoard(props);
  const cellPx = useFitCellPx(m.size);
  const reactions = useSeatReactions(selfId);
  const { settings, toggleMute } = useAudio();
  const isMuted = settings.isMuted;

  const [showChat, setShowChat] = useState(false);
  const [showVocab, setShowVocab] = useState(false);

  const isFinished = state.phase === "finished";
  const turnPlayerName = m.nameOf(state.turnPlayerId);
  const turnPlayerInk = m.inkOf[state.turnPlayerId];
  const winner = state.winnerId ? { pid: state.winnerId, name: m.nameOf(state.winnerId) } : null;

  // Ranked players for scorecard & turn sequence
  const rankedPlayers = useMemo(() => {
    return state.playerOrder
      .map((pid) => ({ pid, score: state.scores[pid] ?? 0, name: m.nameOf(pid) }))
      .sort((a, b) => b.score - a.score);
  }, [state.playerOrder, state.scores, m.nameOf]);

  return (
    <div
      className={`relative min-h-[100dvh] w-full flex flex-col justify-between overflow-x-hidden p-2 sm:p-3 select-none transition-colors duration-300 ${
        m.isNeon
          ? "bg-[#080A1A] text-slate-100"
          : "bg-[#1C1814] text-stone-900 font-['Patrick_Hand',cursive]"
      }`}
    >
      {/* Background Ambience */}
      {m.isNeon ? (
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.15),rgba(255,255,255,0))]" />
      ) : (
        <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#451A03_1px,transparent_1px)] [background-size:16px_16px]" />
      )}

      {/* Main Container Card (For Notebook: Parchment Card with Top Spiral) */}
      <div
        className={`relative z-10 w-full flex-1 flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
          m.isNeon
            ? "bg-[#090B20]/95 border-2 border-slate-800/90 shadow-[0_0_30px_rgba(56,189,248,0.12)] p-2 sm:p-3"
            : "bg-[#FCF8EE] border-2 border-[#D7C9B1] p-2 sm:p-3"
        }`}
      >
        {/* Notebook Top Spiral Wire Binder */}
        {!m.isNeon && (
          <div className="w-full h-7 bg-[#EFE9DA] -mt-2 -mx-2 mb-2 border-b-2 border-[#D7C9B1] flex items-center justify-center relative shadow-inner overflow-hidden">
            <SpiralBinderRings orientation="horizontal" count={14} />
          </div>
        )}

        {/* ── 1. Top Header Bar ── */}
        <header className="w-full flex flex-col items-center gap-1.5 pb-2 border-b border-stone-200/50 dark:border-slate-800/80">
          <div className="w-full flex items-center justify-between">
            {/* Back / Leave Button */}
            <button
              type="button"
              onClick={onLeave}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs ${
                m.isNeon
                  ? "bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white"
                  : "bg-white/90 border border-stone-300 text-stone-700 hover:text-stone-900"
              }`}
              aria-label="Back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            {/* Center Logo */}
            <div className="flex items-center">
              {m.isNeon ? <WordBuildingNeonLogo /> : <WordBuildingNotebookLogo className="scale-90" />}
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Theme Switcher */}
              <button
                type="button"
                onClick={m.toggleTheme}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                  m.isNeon
                    ? "bg-slate-900/90 border border-slate-700 text-amber-300"
                    : "bg-amber-50 border border-amber-400 text-amber-800"
                }`}
                title="Switch Theme"
              >
                {m.isNeon ? <BookOpen className="w-4 h-4 text-amber-300" /> : <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />}
              </button>

              {/* AI Coach Hint */}
              {m.coach && state.phase === "playing" && (
                <CoachHintButton coach={m.coach} />
              )}

              {/* Audio Mute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                  m.isNeon
                    ? "bg-slate-900/90 border border-slate-700 text-slate-300"
                    : "bg-white border border-stone-300 text-stone-700"
                }`}
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
              </button>

              {/* Help */}
              <button
                type="button"
                onClick={() => m.setTutorialOpen(true)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                  m.isNeon
                    ? "bg-slate-900/90 border border-slate-700 text-slate-300"
                    : "bg-white border border-stone-300 text-stone-700"
                }`}
                aria-label="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Matrix Size & Turn Timer Pill */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold shadow-xs ${
              m.isNeon
                ? "bg-slate-900/90 border border-slate-800 text-slate-300"
                : "bg-white/90 border border-stone-300 text-stone-800"
            }`}
          >
            {isFinished ? (
              <>
                <Flag className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-bold">Match Completed</span>
              </>
            ) : (
              <>
                <Target className="w-3.5 h-3.5 text-rose-500" />
                <span>Grid:</span>
                <span className={`font-bold ${m.isNeon ? "text-cyan-300" : "text-[#1E3A8A]"}`}>
                  {m.size}×{m.size} ({state.filledCells}/{state.totalCells})
                </span>
                <span className="opacity-40">|</span>
                <Timer className="w-3.5 h-3.5 text-sky-500" />
                <span className={m.isNeon ? "text-sky-300" : "text-stone-700"}>
                  {state.options.turnTimerSeconds ? `${state.options.turnTimerSeconds}s` : "30s"}
                </span>
              </>
            )}
          </div>
        </header>

        {/* ── 2. Player Score Horizon ── */}
        <section className="w-full my-2">
          <div className="flex items-stretch justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {state.playerOrder.map((pid) => {
              const ink = m.inkOf[pid];
              const isTurn = !isFinished && state.turnPlayerId === pid;
              const isWinner = isFinished && state.winnerId === pid;
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
                  className={`relative flex-1 min-w-[58px] max-w-[80px] flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-300 ${
                    !isSelf ? "cursor-pointer hover:brightness-105 active:scale-95" : ""
                  } ${
                    isWinner
                      ? "bg-amber-950/40 border-2 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.4)] scale-105"
                      : isTurn
                      ? m.isNeon
                        ? "bg-blue-950/90 border-2 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] scale-105"
                        : "bg-amber-100 border-2 border-amber-500 shadow-sm scale-105"
                      : m.isNeon
                      ? "bg-slate-900/50 border border-slate-800"
                      : "bg-white/80 border border-stone-300"
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

                  {/* Header label: Name */}
                  <div className="flex items-center gap-0.5 max-w-full mb-1">
                    <span
                      className={`text-[10px] font-bold truncate tracking-wider ${
                        isWinner
                          ? "text-amber-400"
                          : isTurn
                          ? m.isNeon ? "text-cyan-300" : "text-amber-800"
                          : m.isNeon ? "text-slate-400" : "text-stone-600"
                      }`}
                      title={name}
                    >
                      {name}
                    </span>
                    {isSelf && (
                      <span className={`text-[8px] font-bold px-1 rounded ${m.isNeon ? "bg-cyan-500/20 text-cyan-300" : "bg-amber-200 text-amber-900"}`}>
                        ★
                      </span>
                    )}
                  </div>

                  {/* Avatar with colored rim */}
                  <div
                    className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full p-0.5 mb-1 flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: getInkDisplayColor(ink, m.isNeon),
                      boxShadow: isTurn || isWinner ? `0 0 10px ${getInkDisplayColor(ink, m.isNeon)}` : "none",
                    }}
                  >
                    {isWinner && (
                      <span className="absolute -top-2 text-xs">👑</span>
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

                  {/* Marks (2-Digit Bold Score) */}
                  <span
                    className="font-black text-base sm:text-lg tracking-tight leading-none"
                    style={{ color: getInkDisplayColor(ink, m.isNeon) }}
                  >
                    {score.toString().padStart(2, "0")}
                  </span>

                  {/* Status Dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1"
                    style={{ backgroundColor: getInkDisplayColor(ink, m.isNeon) }}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. Turn Status Pill with Countdown ── */}
        <div className="flex justify-center my-1">
          {isFinished ? (
            <button
              type="button"
              onClick={() => m.setReportDismissed(false)}
              className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-950/80 border border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-xs sm:text-sm font-bold text-amber-200 animate-bounce cursor-pointer"
            >
              <span>🏆</span>
              <span>{winner ? `${winner.name} Won! View Scorecard` : "Match Over! View Scorecard"}</span>
            </button>
          ) : (
            <div
              className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs sm:text-sm font-bold shadow-sm transition-all ${
                m.myTurn
                  ? m.isNeon
                    ? "bg-blue-950/90 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                    : "bg-amber-100 border border-amber-500 text-amber-900"
                  : m.isNeon
                  ? "bg-slate-900/90 border border-slate-700 text-slate-300"
                  : "bg-white/90 border border-stone-300 text-stone-700"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  m.myTurn ? (m.isNeon ? "bg-cyan-400" : "bg-amber-500") : "bg-slate-400"
                }`}
              />
              <span>{m.myTurn ? "Your Turn" : `${turnPlayerName}'s Turn`}</span>
              {m.remainingSec != null && (
                <span
                  className={`px-2 py-0.2 rounded-full text-xs font-black ${
                    m.remainingSec <= 5
                      ? "bg-rose-500 text-white animate-ping"
                      : m.remainingSec <= 10
                      ? "bg-amber-500 text-white"
                      : m.isNeon
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-blue-600/20 text-[#1E3A8A]"
                  }`}
                >
                  {m.remainingSec}s
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Main Matrix Board & LetterPad ── */}
        <main className="w-full flex-1 flex flex-col items-center justify-center my-1 relative">
          {/* Combo Streak Banner Notification */}
          {m.comboBanner && (
            <div className="absolute top-2 z-30 px-4 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] text-slate-950 font-black text-sm tracking-wider animate-bounce">
              {m.comboBanner}
            </div>
          )}

          {/* Matrix Grid Card */}
          <div className="w-full flex items-center justify-center py-1">
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

          {/* Interactive Mobile LetterPad */}
          <div
            className={`w-full rounded-2xl p-2 border mt-1.5 flex flex-col items-center shadow-md ${
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
              <div className="mt-1 text-xs font-bold text-rose-500 animate-shake">
                {m.error}
              </div>
            ) : !m.myTurn && state.phase === "playing" ? (
              <div
                className="mt-1 text-[11px] font-semibold opacity-75 truncate max-w-full"
                style={{ color: getInkDisplayColor(turnPlayerInk, m.isNeon, m.isNeon ? "#94a3b8" : "#7a6651") }}
              >
                Waiting for {turnPlayerName} to write a letter…
              </div>
            ) : null}
          </div>
        </main>

        {/* ── 5. Info Banner ── */}
        <div className="w-full flex items-center justify-between text-xs px-2 my-1 text-stone-500 dark:text-slate-400">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] ${
              m.isNeon ? "bg-slate-900/80 border-slate-800 text-slate-300" : "bg-white/80 border-stone-300 text-stone-700"
            }`}
          >
            <span>🎁</span>
            <span>Make words in row, col, or diagonal!</span>
          </div>
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] ${
              m.isNeon ? "bg-slate-900/80 border-slate-800 text-slate-400" : "bg-white/80 border-stone-300 text-stone-600"
            }`}
          >
            <span>📖 {state.scoredWords.length} words</span>
          </div>
        </div>

        {/* ── 6. Bottom Action Dock ── */}
        <footer className="w-full flex flex-col gap-2 mt-1 pt-1 border-t border-stone-200/50 dark:border-slate-800/80">
          <div className="w-full flex items-center justify-between gap-2">
            {/* Chat Button */}
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className={`relative flex flex-col items-center justify-center w-14 h-13 rounded-2xl border active:scale-95 transition-all cursor-pointer shadow-sm ${
                m.isNeon
                  ? "bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white"
                  : "bg-white border-stone-300 text-stone-700 hover:text-stone-950"
              }`}
              aria-label="Open Chat"
            >
              {(messages ?? []).length > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 text-white font-black text-[11px] flex items-center justify-center shadow-md">
                  {(messages ?? []).length}
                </div>
              )}
              <span className="text-base mb-0.5">💬</span>
              <span className="text-[10px] font-semibold">Chat</span>
            </button>

            {/* Words Found Button (Drawer) */}
            <button
              type="button"
              onClick={() => setShowVocab(true)}
              className={`relative flex-1 h-13 rounded-2xl border flex items-center justify-center gap-2 px-3 shadow-sm active:scale-95 transition-all cursor-pointer ${
                m.isNeon
                  ? "bg-slate-900/90 border-slate-800 text-slate-200 hover:text-white hover:border-slate-700"
                  : "bg-white border-stone-300 text-stone-800 hover:border-stone-400"
              }`}
            >
              <span className="text-base">📖</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight">Vocabulary List</span>
                <span className="text-[10px] opacity-70">
                  {state.scoredWords.length} words formed
                </span>
              </div>
            </button>

            {/* Scorecard Button (on finish) */}
            {isFinished && (
              <button
                type="button"
                onClick={() => m.setReportDismissed(false)}
                className="flex items-center justify-center h-13 px-3.5 rounded-2xl border border-amber-500 bg-amber-400 text-stone-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer gap-1.5"
              >
                <Trophy className="w-4 h-4 text-stone-950" />
                <span>Scores</span>
              </button>
            )}

            {/* Leave Game Button */}
            <button
              type="button"
              onClick={onLeave}
              className={`flex flex-col items-center justify-center w-14 h-13 rounded-2xl border active:scale-95 transition-all cursor-pointer shadow-sm ${
                m.isNeon
                  ? "bg-rose-950/40 border-rose-900/50 text-rose-300 hover:text-rose-100"
                  : "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
              }`}
              title="Leave Game"
            >
              <LogOut className="w-4 h-4 mb-0.5 text-rose-600" />
              <span className="text-[10px] font-semibold">Leave</span>
            </button>
          </div>

          {/* ── 7. Turn Order Sequence Footer ── */}
          <div
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs overflow-x-auto no-scrollbar ${
              m.isNeon
                ? "bg-slate-900/60 border-slate-800/80 text-slate-400"
                : "bg-white/80 border-stone-200 text-stone-500"
            }`}
          >
            <span className="font-semibold whitespace-nowrap">
              {isFinished ? "Standings >" : "Turn Order >"}
            </span>
            <div className="flex items-center gap-1.5">
              {(isFinished ? rankedPlayers.map((p) => p.pid) : state.playerOrder).map((pid, idx, arr) => {
                const ink = m.inkOf[pid];
                const isTurn = !isFinished && state.turnPlayerId === pid;
                const isWinner = isFinished && state.winnerId === pid;
                const avatar = m.avatarOf(pid);
                const name = m.nameOf(pid);

                return (
                  <React.Fragment key={`seq-${pid}`}>
                    <div
                      className={`relative w-6 h-6 rounded-full p-0.5 flex items-center justify-center transition-all ${
                        isWinner
                          ? "ring-2 ring-amber-400 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                          : isTurn
                          ? "ring-2 ring-blue-400 scale-110 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                          : "opacity-80"
                      }`}
                      style={{ backgroundColor: getInkDisplayColor(ink, m.isNeon) }}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                        {avatar ? (
                          <SeatAvatar avatar={avatar} name={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-[9px] text-white">
                            {getPlayerInitials(name)}
                          </span>
                        )}
                      </div>
                    </div>
                    {idx < arr.length - 1 && (
                      <span className="text-stone-400 dark:text-slate-600 text-xs">&gt;</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </footer>
      </div>

      {/* ── 8. Chat Modal (Bottom Sheet) ── */}
      {showChat && (
        <Modal
          open={showChat}
          onClose={() => setShowChat(false)}
          ariaLabel="Room Chat"
          mobileSheet
          panelClassName={`w-full max-w-lg rounded-t-3xl shadow-2xl overflow-hidden p-4 ${
            m.isNeon ? "bg-[#0B0E28] border-2 border-slate-700" : "bg-[#FCF8EE] border-2 border-[#D7C9B1]"
          }`}
        >
          <div className="h-[420px] flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-stone-900 dark:text-slate-200">Room Chat</h3>
              <button
                type="button"
                onClick={() => setShowChat(false)}
                className="text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <Chat messages={messages ?? []} selfId={selfId} />
          </div>
        </Modal>
      )}

      {/* ── 9. Vocabulary Found Modal (Bottom Sheet) ── */}
      {showVocab && (
        <Modal
          open={showVocab}
          onClose={() => setShowVocab(false)}
          ariaLabel="Vocabulary Found"
          mobileSheet
          panelClassName={`w-full max-w-lg rounded-t-3xl shadow-2xl overflow-hidden p-4 ${
            m.isNeon ? "bg-[#0B0E28] border-2 border-slate-700 text-slate-100" : "bg-[#FCF8EE] border-2 border-[#D7C9B1] text-stone-900"
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-stone-900 dark:text-slate-200">📖 Words Found ({state.scoredWords.length})</h3>
            <button
              type="button"
              onClick={() => setShowVocab(false)}
              className="text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
          <VocabularyFoundCard
            state={state}
            inkOf={m.inkOf}
            nameOf={m.nameOf}
            isNeon={m.isNeon}
            maxHeight={340}
          />
        </Modal>
      )}

      {/* ── 10. Winner Celebration Ceremony ── */}
      {state.phase === "finished" && state.winnerId && !m.reportDismissed && (
        <WordBuildingWinnerCelebration
          winnerName={m.nameOf(state.winnerId)}
        />
      )}

      {/* ── 11. Report Card (Endgame Scorecard) ── */}
      {state.phase === "finished" && !m.reportDismissed && (
        <ReportCardOverlay
          state={state}
          nameOf={m.nameOf}
          inkOf={m.inkOf}
          onClose={() => m.setReportDismissed(true)}
        />
      )}

      {/* ── 12. Tutorial Modal ── */}
      {m.tutorialOpen && <WordBuildingTutorialModal onClose={() => m.setTutorialOpen(false)} />}

      {/* ── 13. Turn Out Warning ── */}
      <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn && state.phase === "playing"} />

      {/* ── 14. Floating Reactions ── */}
      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}

