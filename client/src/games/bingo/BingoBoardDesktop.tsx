import type { BingoBoardProps } from "./useBingoBoard";
import { useBingoBoard } from "./useBingoBoard";
import {
  BingoLetterBanner,
  BingoGrid,
  CallOutPanel,
  AutoMarkToggle,
  AllPlayerBoardsView,
  ClaimButton,
  BingoResultOverlay,
} from "./bingo-shared";
import InlineRoomRail from "../../components/InlineRoomRail";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { BingoBallCalledOverlay, BingoWinnerCelebration } from "./BingoAnimations";

import GameThemeToggle from "../../components/theme/GameThemeToggle";

export default function BingoBoardDesktop(props: BingoBoardProps) {
  const model = useBingoBoard(props);
  const reactions = useSeatReactions(model.selfId);
  const {
    state,
    onLeave,
    isOver,
    secondsUntilTurnTimeout,
    isMyTurn,
    currentTurnPlayerName,
    activeTab,
    setActiveTab,
    shuffleBoard,
    lockBoard,
    callNumber,
    pendingNumber,
    markNumber,
    secondsToMark,
    iHaveMarkedCurrent,
    waitingOn,
    wasAutoMarkedForMe,
    autoMark,
    setAutoMark,
    claimBingo,
    canAttemptClaim,
    isNeon,
    theme,
    toggleTheme,
  } = model;

  const isArranging = state.phase === "arranging";
  const myPlayer = state.players.find((p) => p.id === model.selfId);
  const myBoard = state.myBoard ?? [];
  const myCompletedLetters = state.myCompletedLetters ?? [];
  const myCompletedLines = state.myCompletedLinesCount ?? 0;

  return (
    <div className={`flex flex-col min-h-screen p-6 select-none transition-colors duration-300 ${isNeon ? "bg-slate-950 text-slate-100" : "bg-gradient-to-b from-amber-50 via-bhalyam-cream to-amber-100/60"}`}>
      {/* Top Header Bar */}
      <div className={`flex items-center justify-between gap-4 mb-4 p-4 rounded-3xl border backdrop-blur-md shadow-md transition-colors duration-300 ${isNeon ? "bg-slate-900/80 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]" : "bg-white/80 border-bhalyam-wood/20"}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎲</span>
          <div>
            <h1 className={`text-2xl font-black tracking-wide ${isNeon ? "text-purple-300" : "text-bhalyam-wood-dark"}`}>
              BINGO (1-25)
            </h1>
            <p className={`text-xs font-semibold ${isNeon ? "text-purple-400/70" : "text-bhalyam-wood-dark/60"}`}>
              5x5 Grid Turn-Based Calling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <GameThemeToggle theme={theme} onToggle={toggleTheme} variant="compact" />
          <InlineRoomRail
            code={props.roomCode}
            game="bingo"
            phase={props.roomPhase}
            players={props.players}
            selfId={props.selfId}
            messages={props.messages}
          />
          {state.callDeadline != null && !isOver && (
            <TurnTimeWarning deadline={state.callDeadline} active={!isOver} />
          )}
          <button
            type="button"
            onClick={onLeave}
            className="px-4 py-2 text-sm font-bold rounded-2xl bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-300/50 transition-all active:scale-95 cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Arranging Phase */}
      {isArranging && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-8">
          <div className={`p-6 rounded-3xl border-2 backdrop-blur-md shadow-xl max-w-md transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] text-slate-100" : "bg-white/90 border-bhalyam-wood/20 text-bhalyam-wood-dark"}`}>
            <h2 className={`text-2xl font-black mb-2 ${isNeon ? "text-purple-300" : "text-bhalyam-wood-dark"}`}>
              Arrange Your 5x5 Bingo Board
            </h2>
            <p className={`text-sm mb-4 ${isNeon ? "text-slate-300" : "text-bhalyam-wood-dark/70"}`}>
              Click <strong className={isNeon ? "text-cyan-400" : "text-amber-600"}>Shuffle</strong> to re-arrange numbers 1-25 until you like your card layout, then click <strong className={isNeon ? "text-emerald-400" : "text-emerald-600"}>Start Game</strong>!
            </p>
            <BingoGrid board={myBoard} size="lg" isNeon={isNeon} />
          </div>

          <div className="flex gap-4 w-full max-w-sm">
            <button
              type="button"
              disabled={myPlayer?.isReady}
              onClick={shuffleBoard}
              className="flex-1 py-3.5 px-6 rounded-2xl font-black text-base bg-amber-500 text-white shadow-lg hover:bg-amber-600 active:scale-95 disabled:opacity-50 transition-all"
            >
              🔄 Shuffle Board
            </button>
            <button
              type="button"
              disabled={myPlayer?.isReady}
              onClick={lockBoard}
              className="flex-1 py-3.5 px-6 rounded-2xl font-black text-base bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {myPlayer?.isReady ? "✓ Ready" : "🚀 Start Game"}
            </button>
          </div>
        </div>
      )}

      {/* Playing Phase */}
      {!isArranging && (
        <div className="flex-1 flex flex-col items-center gap-6 w-full max-w-6xl mx-auto">
          {/* Header B-I-N-G-O Letters Banner */}
          <BingoLetterBanner completedLetters={myCompletedLetters} isNeon={isNeon} />

          {/* Turn Indicator */}
          <div
            className={`w-full max-w-xl text-center py-3 px-6 rounded-2xl font-black text-base border shadow-md transition-all ${
              isMyTurn
                ? isNeon
                  ? "bg-purple-950/90 border-cyan-400 text-cyan-300 animate-pulse ring-4 ring-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "bg-amber-400 text-bhalyam-wood-dark border-amber-500 animate-pulse ring-4 ring-amber-300/50"
                : isNeon
                ? "bg-slate-900/90 text-slate-300 border-purple-500/30"
                : "bg-white/90 text-bhalyam-wood-dark/80 border-bhalyam-wood/20"
            }`}
          >
            {isMyTurn
              ? "👉 YOUR TURN! Click a number (1-25) to call it out!"
              : `Waiting for ${currentTurnPlayerName} to call out a number...`}
          </div>

          {/* Navigation Tabs */}
          <div className={`flex p-1.5 rounded-2xl border shadow-inner w-full max-w-md transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-purple-500/30" : "bg-white/70 border-bhalyam-wood/20"}`}>
            <button
              type="button"
              onClick={() => setActiveTab("myBoard")}
              className={`flex-1 py-2 text-sm font-black rounded-xl transition-all ${
                activeTab === "myBoard"
                  ? isNeon ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md" : "bg-amber-500 text-white shadow-md"
                  : isNeon ? "text-slate-400 hover:text-slate-200" : "text-bhalyam-wood-dark/70 hover:text-bhalyam-wood-dark"
              }`}
            >
              My Board ({myCompletedLines} Lines)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("allBoards")}
              className={`flex-1 py-2 text-sm font-black rounded-xl transition-all ${
                activeTab === "allBoards"
                  ? isNeon ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md" : "bg-amber-500 text-white shadow-md"
                  : isNeon ? "text-slate-400 hover:text-slate-200" : "text-bhalyam-wood-dark/70 hover:text-bhalyam-wood-dark"
              }`}
            >
              Opponent Tables Scorecard 👥
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "myBoard" ? (
            <div className="flex flex-col items-center gap-6 my-auto">
              <CallOutPanel
                number={pendingNumber}
                secondsLeft={secondsToMark}
                iHaveMarked={iHaveMarkedCurrent}
                waitingOn={waitingOn}
                wasAutoMarkedForMe={wasAutoMarkedForMe}
                isNeon={isNeon}
              />
              <BingoGrid
                board={myBoard}
                isMyTurn={isMyTurn}
                onCellClick={callNumber}
                size="lg"
                markableNumber={pendingNumber}
                onMarkCell={markNumber}
                isNeon={isNeon}
              />

              <AutoMarkToggle enabled={autoMark} onChange={setAutoMark} isNeon={isNeon} />

              {canAttemptClaim && (
                <ClaimButton onClaim={claimBingo} disabled={false} isNeon={isNeon} />
              )}
            </div>
          ) : (
            <AllPlayerBoardsView
              players={state.players}
              selfId={model.selfId}
              roster={model.players}
              registerCardRef={reactions.registerCardRef}
              onTarget={reactions.openTarget}
              activeTargetId={reactions.activeTargetId}
              onCloseTarget={reactions.closeTarget}
            />
          )}

          {/* Last Called Ticker */}
          {state.lastCalledNumber && (
            <div className={`px-6 py-2 rounded-full border-2 text-sm font-extrabold shadow-md transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-cyan-500 text-slate-100 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-white/90 border-amber-400 text-bhalyam-wood-dark"}`}>
              Last Called Number: <span className={`font-black text-lg ${isNeon ? "text-cyan-400" : "text-amber-600"}`}>#{state.lastCalledNumber.value}</span>
            </div>
          )}
        </div>
      )}

      {/* GAL Animations */}
      {model.activeBallCalled && (
        <BingoBallCalledOverlay number={model.activeBallCalled} />
      )}
      {isOver && state.winnerId && (
        <BingoWinnerCelebration
          winnerName={model.nameOf(state.winnerId)}
        />
      )}

      {/* Result Overlay */}
      {isOver && (
        <BingoResultOverlay
          winners={state.winners}
          nameOf={model.nameOf}
          selfId={model.selfId}
          players={props.players}
          calledCount={state.calledNumbers.length}
          onLeave={onLeave}
          onContinue={props.onScorecardClose}
        />
      )}

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}
