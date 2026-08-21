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

/**
 * Snakes & Ladders — mobile shell.
 *
 * Single column, touch-first: header → room rail → full-width board →
 * dice/roster/feed stacked below (board stays the focal point on a phone).
 */
export default function SnlBoardMobile(props: SnlBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useSnlBoard(props);
  const reactions = useSeatReactions();
  // Never over a live turn. SNL's public state has no `turnDeadline` field to
  // also check (unlike Ludo/DotsBoxes/UNO), so `!myTurn` alone is the guard —
  // still strictly safe, since a countdown can only cost THIS player a turn
  // while it is their turn. See GameTutorial.tsx's useTutorialGate doc.
  const tut = useTutorialGate(SNL_TUTORIAL.key, !m.myTurn);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,#0f172a,#020617)] p-3 sm:p-4 space-y-3 shadow-2xl">
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

      <SnlBoardSvg
        state={state}
        coinColorOf={m.coinColorOf}
        initialOf={m.initialOf}
        squareGroups={m.squareGroups}
        startCount={m.startCount}
        toast={m.toast}
      />

      <div className="space-y-3">
        <DiceTray
          value={state.diceValue}
          rolling={m.rolling}
          canRoll={m.canRoll}
          myTurn={m.myTurn}
          phase={state.phase}
          turnName={m.turnPlayer?.name ?? "Player"}
          onRoll={m.doRoll}
        />
        <SnlPlayerRail
          players={players}
          state={state}
          coinColorOf={m.coinColorOf}
          initialOf={m.initialOf}
          selfId={selfId}
          registerCardRef={reactions.registerCardRef}
        />
        <EventFeed events={state.recentEvents} players={players} />
      </div>

      {state.phase === "finished" && (
        <SnlFinishedBanner players={players} winnerId={state.winnerId} />
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
