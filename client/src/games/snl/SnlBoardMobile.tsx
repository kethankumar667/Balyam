import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { useSnlBoard, type SnlBoardProps } from "./useSnlBoard";
import {
  SnlHeader,
  SnlBoardSvg,
  DiceTray,
  SnlPlayerRail,
  EventFeed,
  SnlFinishedBanner,
} from "./snl-board-shared";
import { COIN_COLOR_HEX } from "../../components/CoinColorPicker";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { SNL_TUTORIAL } from "../tutorials";

import { SnlWinnerCelebration } from "./SnlAnimations";

/**
 * Portrait: the board is as wide as the screen. A phone held sideways
 * (`short-land:`, ≤520px tall) can't fit that, so the board is sized to the
 * height instead and moves to the left column, with the controls beside it.
 */
const MOBILE_BOARD_SIZE =
  "max-w-[min(94vw,720px)] short-land:mx-0 short-land:max-w-none short-land:w-[calc((100dvh_-_5rem)_*_0.893)] short-land:col-start-1 short-land:row-span-2 short-land:row-start-1";

/**
 * Snakes & Ladders — mobile shell.
 *
 * Single column, touch-first: header → room rail → full-width board → a dice
 * dock with a thumb-sized Roll button → a swipeable roster strip → a collapsed
 * feed. The board stays the focal point; nothing below it needs a scroll to act.
 */
export default function SnlBoardMobile(props: SnlBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useSnlBoard(props);
  const reactions = useSeatReactions(selfId);
  // Never over a live turn. SNL's public state has no `turnDeadline` field to
  // also check (unlike Ludo/DotsBoxes/UNO), so `!myTurn` alone is the guard —
  // still strictly safe, since a countdown can only cost THIS player a turn
  // while it is their turn. See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(SNL_TUTORIAL.key, !m.myTurn);

  return (
    <div className="space-y-3 rounded-2xl border border-cyan-300/15 bg-[radial-gradient(circle_at_50%_0%,rgba(56,225,255,0.14),transparent_38%),linear-gradient(160deg,#0b1424,#04070d)] p-3 shadow-2xl sm:p-4 short-land:grid short-land:grid-cols-[auto_minmax(0,1fr)] short-land:items-start short-land:gap-3 short-land:space-y-0">
      <div className="space-y-3 short-land:col-start-2 short-land:row-start-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <SnlHeader state={state} turnPlayer={m.turnPlayer} turnColor={m.turnColor} />
          </div>
          <TutorialButton onClick={() => tut.setOpen(true)} />
        </div>

        <InlineRoomRail
          code={roomCode}
          game="snl"
          phase={roomPhase}
          players={players}
          selfId={selfId}
          messages={messages}
        />
      </div>

      <SnlBoardSvg
        state={state}
        players={players}
        sizeClass={MOBILE_BOARD_SIZE}
        coinColorOf={m.coinColorOf}
        initialOf={m.initialOf}
        squareGroups={m.squareGroups}
        startCount={m.startCount}
        toast={m.toast}
        activeSnakeBite={m.activeSnakeBite}
        activeLadderClimb={m.activeLadderClimb}
      />

      <div className="space-y-3 short-land:col-start-2 short-land:row-start-2">
        <DiceTray
          value={state.diceValue}
          rolling={m.rolling}
          canRoll={m.canRoll}
          myTurn={m.myTurn}
          phase={state.phase}
          turnName={m.turnPlayer?.name ?? "Player"}
          onRoll={m.doRoll}
          variant="dock"
        />
        <SnlPlayerRail
          players={players}
          state={state}
          coinColorOf={m.coinColorOf}
          initialOf={m.initialOf}
          selfId={selfId}
          layout="strip"
          registerCardRef={reactions.registerCardRef}
          onTarget={reactions.openTarget}
          activeTargetId={reactions.activeTargetId}
          onCloseTarget={reactions.closeTarget}
        />
        <EventFeed events={state.recentEvents} players={players} compact />
      </div>

      {state.phase === "finished" && (
        <div className="short-land:col-start-2">
          <SnlFinishedBanner players={players} winnerId={state.winnerId} />
        </div>
      )}
      {state.phase === "finished" && state.winnerId && (
        <SnlWinnerCelebration winner={players.find((p) => p.id === state.winnerId)} />
      )}

      {tut.open && (
        <GameTutorial
          slides={SNL_TUTORIAL.slides}
          storageKey={SNL_TUTORIAL.key}
          accent={SNL_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}

      <FloatingReactionsLayer
        reactions={reactions.items}
        anchorOf={reactions.anchorOf}
        glowOf={(playerId) => COIN_COLOR_HEX[m.coinColorOf[playerId]]?.fill}
      />
    </div>
  );
}
