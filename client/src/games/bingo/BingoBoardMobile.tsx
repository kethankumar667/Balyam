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

export default function BingoBoardMobile(props: BingoBoardProps) {
  const model = useBingoBoard(props);
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
  } = model;

  const isArranging = state.phase === "arranging";
  const myPlayer = state.players.find((p) => p.id === model.selfId);
  const myBoard = state.myBoard ?? [];
  const myCompletedLetters = state.myCompletedLetters ?? [];
  const myCompletedLines = state.myCompletedLinesCount ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-amber-50 via-bhalyam-cream to-amber-100/60 p-3 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 bg-white/70 backdrop-blur-sm p-2.5 rounded-2xl border border-bhalyam-wood/20 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <h1 className="text-lg font-black text-bhalyam-wood-dark tracking-wide">
            BINGO (1-25)
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-bhalyam-wood/20 shadow-md max-w-sm">
            <h2 className="text-lg font-extrabold text-bhalyam-wood-dark mb-1">
              Arrange Your 1-25 Grid
            </h2>
            <p className="text-xs text-bhalyam-wood-dark/70 mb-3">
              Shuffle numbers until you like your arrangement, then click{" "}
              <strong className="text-amber-700">Start Game</strong>!
            </p>
            <BingoGrid board={myBoard} size="sm" />
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
          <BingoLetterBanner completedLetters={myCompletedLetters} />

          {/* Turn Banner */}
          <div
            className={`w-full text-center py-2 px-3 rounded-xl font-extrabold text-sm border shadow-sm transition-all ${
              isMyTurn
                ? "bg-amber-400 text-bhalyam-wood-dark border-amber-500 animate-pulse"
                : "bg-white/80 text-bhalyam-wood-dark/80 border-bhalyam-wood/20"
            }`}
          >
            {isMyTurn
              ? "👉 YOUR TURN! Pick a number to call out!"
              : `Turn: ${currentTurnPlayerName} calling a number...`}
          </div>

          {/* View Mode Tabs */}
          <div className="flex w-full bg-white/60 p-1 rounded-xl border border-bhalyam-wood/20 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("myBoard")}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                activeTab === "myBoard"
                  ? "bg-amber-500 text-white shadow-md"
                  : "text-bhalyam-wood-dark/70 hover:text-bhalyam-wood-dark"
              }`}
            >
              My Board ({myCompletedLines} Lines)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("allBoards")}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                activeTab === "allBoards"
                  ? "bg-amber-500 text-white shadow-md"
                  : "text-bhalyam-wood-dark/70 hover:text-bhalyam-wood-dark"
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
              />
              <BingoGrid
                board={myBoard}
                isMyTurn={isMyTurn}
                onCellClick={callNumber}
                size="md"
                markableNumber={pendingNumber}
                onMarkCell={markNumber}
              />

              <AutoMarkToggle enabled={autoMark} onChange={setAutoMark} />

              {canAttemptClaim && (
                <ClaimButton onClaim={claimBingo} disabled={false} className="w-full" />
              )}
            </div>
          ) : (
            <AllPlayerBoardsView
              players={state.players}
              selfId={model.selfId}
            />
          )}

          {/* Last Called Ticker */}
          {state.lastCalledNumber && (
            <div className="bg-white/90 px-4 py-1.5 rounded-full border border-amber-400 text-xs font-bold text-bhalyam-wood-dark shadow-sm">
              Last Called: <span className="text-amber-700 font-extrabold">#{state.lastCalledNumber.value}</span>
            </div>
          )}
        </div>
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
    </div>
  );
}
