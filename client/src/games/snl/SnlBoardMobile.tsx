import InlineRoomRail from "../../components/InlineRoomRail";
import { useSnlBoard, type SnlBoardProps } from "./useSnlBoard";
import {
  SnlHeader,
  SnlBoardSvg,
  DiceTray,
  SnlPlayerRail,
  EventFeed,
  SnlFinishedBanner,
} from "./snl-board-shared";

/**
 * Snakes & Ladders — mobile shell.
 *
 * Single column, touch-first: header → room rail → full-width board →
 * dice/roster/feed stacked below (board stays the focal point on a phone).
 */
export default function SnlBoardMobile(props: SnlBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useSnlBoard(props);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,#0f172a,#020617)] p-3 sm:p-4 space-y-3 shadow-2xl">
      <SnlHeader state={state} turnPlayer={m.turnPlayer} turnColor={m.turnColor} />

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
        />
        <EventFeed events={state.recentEvents} players={players} />
      </div>

      {state.phase === "finished" && (
        <SnlFinishedBanner players={players} winnerId={state.winnerId} />
      )}
    </div>
  );
}
