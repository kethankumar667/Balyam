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
 * Phone layout (320–767px): one column, the board is the hero.
 *
 * Order, top to bottom: title card, room rail + theme switch, B-I-N-G-O, whose turn it is, the board (and the open
 * number's countdown above it), Claim when it is available, the Mark-for-me and Call-out switches, the players.
 * "View all tables" swaps the board for every player's card; the players stay put underneath.
 */
export default function BingoBoardMobile(props: BingoBoardProps) {
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
    <BingoBackdrop skin={skin} className="px-3 pb-6 pt-3">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3">
        <BingoTitleCard skin={skin} roomCode={props.roomCode} onLeave={onLeave} compact />

        {state.callDeadline != null && !isOver && <TurnTimeWarning deadline={state.callDeadline} active={!isOver} />}

        {/* The room rail is a self-contained ~280px pill (code / players / chat / react). On its own row, beside
            only the theme switch, it fits at every width from 320px. */}
        <div className="flex items-center justify-center gap-2">
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

        {isArranging ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2 text-center">
            <div className={`w-full rounded-[1.75rem] p-4 ${skin.card}`}>
              <h2 className={`mb-1 font-display text-xl ${skin.ink}`}>Arrange Your 1–25 Grid</h2>
              <p className={`mb-3 text-sm ${skin.inkSoft}`}>
                Shuffle numbers until you like your arrangement, then press <strong className={skin.ink}>Start Game</strong>.
              </p>
              <BingoGrid board={myBoard} size="md" skin={skin} />
            </div>

            <div className="flex w-full gap-3">
              <button
                type="button"
                disabled={myPlayer?.isReady}
                onClick={shuffleBoard}
                className={`inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#FFE066] to-[#F5B400] font-black text-[#3A2200] shadow-[0_4px_0_rgba(160,100,0,0.4)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${skin.focus}`}
              >
                <Shuffle className="h-5 w-5" aria-hidden="true" />
                Shuffle
              </button>
              <button
                type="button"
                disabled={myPlayer?.isReady}
                onClick={lockBoard}
                className={`inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#34B26B] to-[#15803D] font-black text-white shadow-[0_4px_0_rgba(10,70,35,0.45)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${skin.focus}`}
              >
                <Play className="h-5 w-5" aria-hidden="true" />
                {myPlayer?.isReady ? "Ready" : "Start Game"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <BingoLetterBanner completedLetters={state.myCompletedLetters ?? []} skin={skin} />

            <BingoTurnBanner skin={skin} isMyTurn={isMyTurn} callerName={state.currentTurnPlayerId ? currentTurnPlayerName : null} compact />

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
                <CallOutPanel
                  number={pendingNumber}
                  secondsLeft={secondsToMark}
                  iHaveMarked={iHaveMarkedCurrent}
                  waitingOn={waitingOn}
                  wasAutoMarkedForMe={wasAutoMarkedForMe}
                  skin={skin}
                />
                <BingoGrid
                  board={myBoard}
                  isMyTurn={isMyTurn}
                  onCellClick={callNumber}
                  size="md"
                  markableNumber={pendingNumber}
                  onMarkCell={markNumber}
                  skin={skin}
                />
                {canAttemptClaim && <ClaimButton onClaim={claimBingo} disabled={false} className="w-full" />}
                <AutoMarkToggle enabled={autoMark} onChange={setAutoMark} skin={skin} />
                <CallOutToggle enabled={callOutEnabled} onChange={setCallOutEnabled} skin={skin} />
              </>
            )}

            <BingoPlayersStrip
              skin={skin}
              seats={seats}
              layout="row"
              viewingAllTables={viewingAll}
              onToggleTables={() => setActiveTab(viewingAll ? "myBoard" : "allBoards")}
              registerCardRef={viewingAll ? undefined : reactions.registerCardRef}
              onTarget={viewingAll ? undefined : reactions.openTarget}
              activeTargetId={viewingAll ? null : reactions.activeTargetId}
              onCloseTarget={viewingAll ? undefined : reactions.closeTarget}
            />
          </>
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
