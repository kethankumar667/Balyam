import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import {
  LudoStatusBar,
  LudoBoardArea,
  LudoOverlays,
  LudoPlayerCards,
  LudoBottomBar,
} from "./ludo-board-composites";

/**
 * Ludo — desktop shell (BHALYAM notebook theme).
 *
 * Uses the extra width deliberately (AGENTS.md §6.2): the paper header docks
 * the room rail inline on the right; the board centres between two side rails
 * of player cards (top-half seats left, bottom-half right, stacked); the roll
 * cup + bottom nav sit centred beneath. Same components + theme as mobile —
 * only the arrangement differs.
 */
export default function LudoBoardDesktop(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);

  return (
    <div
      className="bhalyam-font bhalyam-paper rounded-2xl p-4 lg:p-5 space-y-4 shadow-2xl"
      style={{ border: "3px solid #6D4323" }}
    >
      <LudoStatusBar
        m={m}
        state={state}
        rightSlot={
          <InlineRoomRail
            code={roomCode}
            game="ludo"
            phase={roomPhase}
            players={players}
            selfId={selfId}
            messages={messages}
            variant="paper"
          />
        }
      />

      {/* Board flanked by two stacked player-card rails. */}
      <div className="flex items-start justify-center gap-4 lg:gap-6">
        <div className="w-[clamp(9rem,16vw,15rem)] flex-shrink-0 pt-2">
          <LudoPlayerCards state={state} players={players} row="top" orientation="col" />
        </div>
        <LudoBoardArea
          m={m}
          state={state}
          players={players}
          maxWidth="min(52vw, calc(100vh - 240px), 720px)"
        />
        <div className="w-[clamp(9rem,16vw,15rem)] flex-shrink-0 pt-2">
          <LudoPlayerCards state={state} players={players} row="bottom" orientation="col" />
        </div>
      </div>

      <div className="flex justify-center">
        <LudoBottomBar m={m} state={state} />
      </div>

      <LudoOverlays m={m} state={state} players={players} />
    </div>
  );
}
