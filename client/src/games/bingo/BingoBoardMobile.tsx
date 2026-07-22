import { useBingoBoard } from "./useBingoBoard";
import type { BingoBoardProps } from "./useBingoBoard";
import {
  BingoGrid,
  CallerBall,
  CalledHistoryStrip,
  ClaimButton,
  PlayerProgressList,
  BingoResultOverlay,
} from "./bingo-shared";

/**
 * Bingo — MOBILE shell (every non-desktop tier: phones + tablets, portrait).
 * Room.tsx's own slim "Leave" header stays visible above this (Bingo is not
 * in the fullPlay list — see Room.tsx's header comment), so this shell owns
 * only the game content: caller + call history, the player's own board, a
 * compact opponent progress list, and a thumb-reachable sticky Claim button.
 *
 * Pure layout over the frozen useBingoBoard model — no local state, no
 * socket calls, matching every other game's mobile/desktop split.
 */
export default function BingoBoardMobile(props: BingoBoardProps) {
  const m = useBingoBoard(props);
  const { state, seats, selfId, players, nameOf, isOver, canAttemptClaim, claim, onLeave, onScorecardClose } = m;
  const opponents = seats.filter((s) => !s.isSelf);

  return (
    <div className="flex flex-col items-center gap-4 pb-28 px-2">
      <CallerBall
        current={state.currentCall}
        secondsLeft={isOver ? null : m.secondsUntilNextCall}
      />

      <div className="w-full max-w-xs">
        <CalledHistoryStrip calledNumbers={state.calledNumbers} orientation="row" />
      </div>

      <BingoGrid board={state.myBoard} size="md" />

      {opponents.length > 0 && (
        <div className="w-full max-w-xs">
          <PlayerProgressList seats={opponents} />
        </div>
      )}

      {/* Sticky thumb-reachable claim bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center bg-gradient-to-t from-bhalyam-cream via-bhalyam-cream/95 to-transparent p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <ClaimButton onClaim={claim} disabled={!canAttemptClaim} className="w-full max-w-xs" />
      </div>

      {isOver && (
        <BingoResultOverlay
          winners={state.winners}
          stopOnFirstWin={state.stopOnFirstWin}
          nameOf={nameOf}
          selfId={selfId}
          players={players}
          calledCount={state.calledNumbers.length}
          onLeave={onLeave}
          onContinue={onScorecardClose}
        />
      )}
    </div>
  );
}
