import { useMemo } from "react";
import { Play, Shuffle } from "lucide-react";
import type { BingoBoardProps } from "./useBingoBoard";
import { useBingoBoard } from "./useBingoBoard";
import {
  BingoLetterBanner,
  BingoGrid,
  CallOutPanel,
  AutoMarkToggle,
  CallOutToggle,
  AllPlayerBoardsView,
  ClaimButton,
  BingoResultOverlay,
} from "./bingo-shared";
import {
  BingoBackdrop,
  BingoPlayersStrip,
  BingoThemeSwitch,
  BingoTitleCard,
  BingoTurnBanner,
  buildBingoSeats,
} from "./bingo-chrome";
import { bingoSkinFor } from "./bingoSkin";
import InlineRoomRail from "../../components/InlineRoomRail";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { BingoBallCalledOverlay, BingoWinnerCelebration } from "./BingoAnimations";

/**
 * Desktop layout (1024px and up): the same game with the room to spread out.
 *
 * The play column (letters, whose turn it is, the board, Claim) sits on the left; everything you glance at rather
 * than act on moves to a side panel on the right — the Mark-for-me and Call-out switches, and a players list
 * that shows each seat's lines and letters, which the phone has no room for.
 */
export default function BingoBoardDesktop(props: BingoBoardProps) {
  const model = useBingoBoard(props);
  const reactions = useSeatReactions(model.selfId);
  const {
    state,
    onLeave,
    isOver,
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
    callOutEnabled,
    setCallOutEnabled,
    claimBingo,
    canAttemptClaim,
    isNeon,
    toggleTheme,
  } = model;

  const skin = bingoSkinFor(isNeon);
  const isArranging = state.phase === "arranging";
  const myPlayer = state.players.find((p) => p.id === model.selfId);
  const myBoard = state.myBoard ?? [];
  const viewingAll = activeTab === "allBoards";

  const seats = useMemo(
    () => buildBingoSeats(state.players, model.players, model.selfId, state.currentTurnPlayerId),
    [state.players, model.players, model.selfId, state.currentTurnPlayerId],
  );

  return (
    <BingoBackdrop skin={skin} className="px-8 pb-8 pt-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <BingoTitleCard skin={skin} roomCode={props.roomCode} onLeave={onLeave} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <InlineRoomRail
              code={props.roomCode}
              game="bingo"
              phase={props.roomPhase}
              players={props.players}
              selfId={props.selfId}
              messages={props.messages}
              variant={skin.railVariant}
            />
            <BingoThemeSwitch skin={skin} onToggle={toggleTheme} />
          </div>
        </div>

        {state.callDeadline != null && !isOver && <TurnTimeWarning deadline={state.callDeadline} active={!isOver} />}

        {isArranging ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
            <div className={`w-full max-w-lg rounded-[2rem] p-6 ${skin.card}`}>
              <h2 className={`mb-2 font-display text-2xl ${skin.ink}`}>Arrange Your 5×5 Bingo Board</h2>
              <p className={`mb-4 text-sm ${skin.inkSoft}`}>
                Press <strong className={skin.ink}>Shuffle</strong> to re-arrange the numbers 1–25 until you like your card, then press{" "}
                <strong className={skin.ink}>Start Game</strong>.
              </p>
              <BingoGrid board={myBoard} size="lg" skin={skin} />
            </div>

            <div className="flex w-full max-w-md gap-4">
              <button
                type="button"
                disabled={myPlayer?.isReady}
                onClick={shuffleBoard}
                className={`inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#FFE066] to-[#F5B400] px-6 font-black text-[#3A2200] shadow-[0_4px_0_rgba(160,100,0,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${skin.focus}`}
              >
                <Shuffle className="h-5 w-5" aria-hidden="true" />
                Shuffle Board
              </button>
              <button
                type="button"
                disabled={myPlayer?.isReady}
                onClick={lockBoard}
                className={`inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#34B26B] to-[#15803D] px-6 font-black text-white shadow-[0_4px_0_rgba(10,70,35,0.45)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${skin.focus}`}
              >
                <Play className="h-5 w-5" aria-hidden="true" />
                {myPlayer?.isReady ? "Ready" : "Start Game"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-[minmax(0,1fr)_22rem] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="flex min-w-0 flex-col items-center gap-4">
              <BingoLetterBanner completedLetters={state.myCompletedLetters ?? []} skin={skin} />

              <div className="w-full max-w-xl">
                <BingoTurnBanner skin={skin} isMyTurn={isMyTurn} callerName={state.currentTurnPlayerId ? currentTurnPlayerName : null} />
              </div>

              {viewingAll ? (
                <AllPlayerBoardsView
                  players={state.players}
                  selfId={model.selfId}
                  roster={model.players}
                  registerCardRef={reactions.registerCardRef}
                  onTarget={reactions.openTarget}
                  activeTargetId={reactions.activeTargetId}
                  onCloseTarget={reactions.closeTarget}
                  skin={skin}
                />
              ) : (
                <>
                  <div className="w-full max-w-xl">
                    <CallOutPanel
                      number={pendingNumber}
                      secondsLeft={secondsToMark}
                      iHaveMarked={iHaveMarkedCurrent}
                      waitingOn={waitingOn}
                      wasAutoMarkedForMe={wasAutoMarkedForMe}
                      skin={skin}
                    />
                  </div>
                  <BingoGrid
                    board={myBoard}
                    isMyTurn={isMyTurn}
                    onCellClick={callNumber}
                    size="lg"
                    markableNumber={pendingNumber}
                    onMarkCell={markNumber}
                    skin={skin}
                  />
                  {canAttemptClaim && <ClaimButton onClaim={claimBingo} disabled={false} />}
                </>
              )}
            </div>

            <aside className="flex min-w-0 flex-col gap-4" aria-label="Table details">
              <AutoMarkToggle enabled={autoMark} onChange={setAutoMark} skin={skin} />
              <CallOutToggle enabled={callOutEnabled} onChange={setCallOutEnabled} skin={skin} />
              <BingoPlayersStrip
                skin={skin}
                seats={seats}
                layout="list"
                viewingAllTables={viewingAll}
                onToggleTables={() => setActiveTab(viewingAll ? "myBoard" : "allBoards")}
                registerCardRef={viewingAll ? undefined : reactions.registerCardRef}
                onTarget={viewingAll ? undefined : reactions.openTarget}
                activeTargetId={viewingAll ? null : reactions.activeTargetId}
                onCloseTarget={viewingAll ? undefined : reactions.closeTarget}
              />
            </aside>
          </div>
        )}
      </div>

      {/* Animations */}
      {model.activeBallCalled && <BingoBallCalledOverlay number={model.activeBallCalled} />}
      {isOver && state.winnerId && <BingoWinnerCelebration winnerName={model.nameOf(state.winnerId)} />}

      {isOver && (
        <BingoResultOverlay
          winners={state.winners}
          nameOf={model.nameOf}
          selfId={model.selfId}
          players={props.players}
          calledCount={state.calledNumbers.length}
          onLeave={onLeave}
          onContinue={props.onScorecardClose}
          skin={skin}
        />
      )}

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </BingoBackdrop>
  );
}
