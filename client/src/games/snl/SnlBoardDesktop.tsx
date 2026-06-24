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
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { SNL_TUTORIAL } from "../tutorials";

/**
 * Snakes & Ladders — desktop shell.
 *
 * Two-column: a large board on the left and a persistent right rail carrying
 * the dice tray, roster and live event feed so nothing collapses behind a
 * sheet. Uses the extra width deliberately rather than stretching the phone
 * layout.
 */
export default function SnlBoardDesktop(props: SnlBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useSnlBoard(props);
  const tut = useTutorialGate(SNL_TUTORIAL.key);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,#0f172a,#020617)] p-4 lg:p-5 space-y-4 shadow-2xl">
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

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* Board column */}
        <div className="space-y-4 min-w-0">
          <SnlBoardSvg
            state={state}
            coinColorOf={m.coinColorOf}
            initialOf={m.initialOf}
            squareGroups={m.squareGroups}
            startCount={m.startCount}
            toast={m.toast}
          />
          {state.phase === "finished" && (
            <SnlFinishedBanner players={players} winnerId={state.winnerId} />
          )}
        </div>

        {/* Persistent right rail */}
        <aside className="space-y-3 lg:sticky lg:top-4">
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
        </aside>
      </div>

      {tut.open && (
        <GameTutorial
          slides={SNL_TUTORIAL.slides}
          storageKey={SNL_TUTORIAL.key}
          accent={SNL_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </div>
  );
}
