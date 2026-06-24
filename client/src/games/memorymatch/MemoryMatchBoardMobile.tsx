import { useEffect, useMemo, useState } from "react";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import InlineRoomRail from "../../components/InlineRoomRail";
import { CardGrid } from "./memorymatch-shared";
import { useMemoryMatchBoard, type MemoryMatchBoardProps } from "./useMemoryMatchBoard";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { MEMORYMATCH_TUTORIAL } from "../tutorials";

const MOBILE_GAP = 6; // px between cards
const MIN_CARD = 28; // never shrink below a tappable-ish dot
const MAX_CARD = 72; // 4x4 on a roomy phone shouldn't look gigantic

/**
 * Track the viewport so the board can be sized to fit. Re-measures on resize
 * and orientation change. Layout-only; no game state lives here.
 */
function useViewport(): { w: number; h: number } {
  const [vp, setVp] = useState(() => ({
    w: typeof window === "undefined" ? 360 : window.innerWidth,
    h: typeof window === "undefined" ? 640 : window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return vp;
}

/**
 * Memory Match — mobile shell. Single column, touch-first. The card grid is
 * sized from the viewport so 4x4 / 6x6 / 8x8 boards all fit a 360 px phone
 * without horizontal scroll, leaving headroom for the header, scores and rail.
 */
export default function MemoryMatchBoardMobile(props: MemoryMatchBoardProps) {
  const { state, players, selfId, roomCode, messages, roomPhase } = props;
  const {
    myTurn,
    nameOf,
    cardFaceUp,
    canFlipCard,
    isCardFlipping,
    flipCard,
    boardSize,
    isWinner,
    isOver,
    panelDismissed,
    setPanelDismissed,
  } = useMemoryMatchBoard(props);
  const tut = useTutorialGate(MEMORYMATCH_TUTORIAL.key);

  const { w: vw, h: vh } = useViewport();
  // Square board: fit the smaller of available width and the vertical budget
  // (viewport minus header/scores/rail chrome), then divide across columns.
  const cardSize = useMemo(() => {
    const avail = Math.min(vw - 40, vh - 300);
    const totalGap = (boardSize - 1) * MOBILE_GAP;
    const raw = Math.floor((avail - totalGap) / boardSize);
    return Math.max(MIN_CARD, Math.min(MAX_CARD, raw));
  }, [vw, vh, boardSize]);

  return (
    <div className="space-y-3">
      {/* Header: turn + pair progress */}
      <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-[#6E5E4D]">
            {state.playerOrder.length} Players
            {state.phase !== "finished" && (
              <>
                {" · "}
                <span className={myTurn ? "font-bold text-[#E6A11E]" : ""}>
                  {myTurn ? "Your turn" : `${nameOf(state.turnPlayerId)}'s turn`}
                </span>
              </>
            )}
          </div>
          <TutorialButton onClick={() => tut.setOpen(true)} />
        </div>
        <div className="text-xs text-[#8B7355]">
          {state.matchedPairs} / {state.totalPairs} pairs matched
        </div>
        {state.phase === "playing" && state.turnDeadline && (
          <TurnTimeWarning deadline={state.turnDeadline} active={myTurn} />
        )}
      </div>

      {/* Scores — two-up grid */}
      <div className="bg-[#FFF9F0] border border-[#E8D8BE] rounded-lg p-3">
        <div className="text-xs font-bold uppercase text-[#6E5E4D] mb-2">Scores</div>
        <div className="grid grid-cols-2 gap-2">
          {state.playerOrder.map((pid) => (
            <div
              key={pid}
              className={`text-sm p-2 rounded text-center font-semibold ${
                myTurn && pid === state.turnPlayerId
                  ? "bg-[#E6A11E] text-[#2B2118]"
                  : "bg-[#F0E1D0] text-[#6E5E4D]"
              }`}
            >
              {nameOf(pid)}
              <div className="text-lg font-bold">{state.scores[pid] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Card grid — sized to fit the viewport */}
      <CardGrid
        board={state.board}
        boardSize={boardSize}
        cardSize={cardSize}
        gap={MOBILE_GAP}
        cardFaceUp={cardFaceUp}
        canFlipCard={canFlipCard}
        isCardFlipping={isCardFlipping}
        onFlip={flipCard}
      />

      {/* Reveal phase indicator */}
      {state.phase === "reveal" && (
        <div className="text-center text-sm font-semibold text-[#C67C3C] animate-pulse">
          ✨ Cards revealing...
        </div>
      )}

      {/* Game finished panel */}
      {isOver && !panelDismissed && (
        <div className="bg-[#FFF9F0] border-2 border-[#E6A11E] rounded-lg p-6 text-center space-y-4">
          {state.winnerId ? (
            <>
              <div className="text-2xl font-bold text-[#6E5E4D]">
                {isWinner ? "🎉 You won! 🎉" : `${nameOf(state.winnerId)} wins!`}
              </div>
              <div className="text-sm text-[#8B7355]">
                {nameOf(state.winnerId)} matched {state.scores[state.winnerId] ?? 0} pairs
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold text-[#6E5E4D]">It's a tie!</div>
          )}
          <button
            onClick={() => setPanelDismissed(true)}
            className="bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118] px-6 py-2 rounded font-semibold text-sm"
          >
            Close
          </button>
        </div>
      )}

      {/* Side rail — bottom of the column on mobile */}
      <InlineRoomRail
        code={roomCode}
        game={state.kind}
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
      />

      {tut.open && (
        <GameTutorial
          slides={MEMORYMATCH_TUTORIAL.slides}
          storageKey={MEMORYMATCH_TUTORIAL.key}
          accent={MEMORYMATCH_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </div>
  );
}
