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

export default function BingoBoardMobile(props: BingoBoardProps) {
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
    <div className={`flex flex-col min-h-screen p-3 select-none transition-colors duration-300 ${isNeon ? "bg-slate-950 text-slate-100" : "bg-gradient-to-b from-amber-50 via-bhalyam-cream to-amber-100/60"}`}>
      {/* Top Header */}
      <div className={`flex items-center justify-between gap-2 mb-2 p-2.5 rounded-2xl border backdrop-blur-sm shadow-sm transition-colors duration-300 ${isNeon ? "bg-slate-900/80 border-purple-500/30" : "bg-white/70 border-bhalyam-wood/20"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <h1 className={`text-lg font-black tracking-wide ${isNeon ? "text-purple-300" : "text-bhalyam-wood-dark"}`}>
            BINGO (1-25)
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-300/40 cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Arranging Phase */}
      {isArranging && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-2 py-4">
          <div className={`p-4 rounded-2xl border backdrop-blur shadow-md max-w-sm transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-purple-500/30 text-slate-100" : "bg-white/80 border-bhalyam-wood/20 text-bhalyam-wood-dark"}`}>
            <h2 className={`text-lg font-extrabold mb-1 ${isNeon ? "text-purple-300" : "text-bhalyam-wood-dark"}`}>
              Arrange Your 1-25 Grid
            </h2>
            <p className={`text-xs mb-3 ${isNeon ? "text-slate-300" : "text-bhalyam-wood-dark/70"}`}>
              Shuffle numbers until you like your arrangement, then click{" "}
              <strong className={isNeon ? "text-amber-400" : "text-amber-700"}>Start Game</strong>!
            </p>
            <BingoGrid board={myBoard} size="sm" isNeon={isNeon} />
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              type="button"
              disabled={myPlayer?.isReady}
              onClick={shuffleBoard}
              className="flex-1 py-3 px-4 rounded-xl font-black bg-amber-500 text-white shadow-md hover:bg-amber-600 active:scale-95 disabled:opacity-50"
            >
              🔄 Shuffle
            </button>
            <button
              type="button"
              disabled={myPlayer?.isReady}
              onClick={lockBoard}
              className="flex-1 py-3 px-4 rounded-xl font-black bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {myPlayer?.isReady ? "✓ Ready" : "🚀 Start Game"}
            </button>
          </div>
        </div>
      )}

      {/* Playing Phase */}
      {!isArranging && (
        <div className="flex-1 flex flex-col items-center gap-3 w-full max-w-md mx-auto">
          {/* B-I-N-G-O Letter Header */}
          <BingoLetterBanner completedLetters={myCompletedLetters} isNeon={isNeon} />

          {/* Turn Banner */}
          <div
            className={`w-full text-center py-2 px-3 rounded-xl font-extrabold text-sm border shadow-sm transition-all ${
              isMyTurn
                ? isNeon
                  ? "bg-purple-950/90 border-cyan-400 text-cyan-300 ring-4 ring-cyan-400/50 animate-pulse"
                  : "bg-amber-400 text-bhalyam-wood-dark border-amber-500 animate-pulse"
                : isNeon
                ? "bg-slate-900/90 text-slate-300 border-purple-500/30"
                : "bg-white/80 text-bhalyam-wood-dark/80 border-bhalyam-wood/20"
            }`}
          >
            {isMyTurn
              ? "👉 YOUR TURN! Pick a number to call out!"
              : `Turn: ${currentTurnPlayerName} calling a number...`}
          </div>

          {/* View Mode Tabs */}
          <div className={`flex w-full p-1 rounded-xl border shadow-inner transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-purple-500/30" : "bg-white/60 border-bhalyam-wood/20"}`}>
            <button
              type="button"
              onClick={() => setActiveTab("myBoard")}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
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
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                activeTab === "allBoards"
                  ? isNeon ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md" : "bg-amber-500 text-white shadow-md"
                  : isNeon ? "text-slate-400 hover:text-slate-200" : "text-bhalyam-wood-dark/70 hover:text-bhalyam-wood-dark"
              }`}
            >
              Opponent Tables 👥
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "myBoard" ? (
            <div className="flex flex-col items-center gap-3 w-full my-auto">
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
                size="md"
                markableNumber={pendingNumber}
                onMarkCell={markNumber}
                isNeon={isNeon}
              />

              <AutoMarkToggle enabled={autoMark} onChange={setAutoMark} isNeon={isNeon} />

              {canAttemptClaim && (
                <ClaimButton onClaim={claimBingo} disabled={false} className="w-full" isNeon={isNeon} />
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
            <div className={`px-4 py-1.5 rounded-full border text-xs font-bold shadow-sm transition-colors duration-300 ${isNeon ? "bg-slate-900/90 border-cyan-500 text-slate-200" : "bg-white/90 border-amber-400 text-bhalyam-wood-dark"}`}>
              Last Called: <span className={`font-extrabold ${isNeon ? "text-cyan-400" : "text-amber-700"}`}>#{state.lastCalledNumber.value}</span>
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
