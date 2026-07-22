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
 * Ludo — mobile shell (BHALYAM notebook theme).
 *
 * Reference layout, top→bottom: paper header (menu · LUDO · turn · sound ·
 * Rules · Leave) → paper toolbar pill (room/players/voice/chat/emoji) →
 * top player cards → board → bottom player cards → roll-cup + bottom nav.
 * Everything sits on `.bhalyam-paper` inside a wood frame. The board is
 * capped by BOTH viewport width and height (chrome reserve) so the whole
 * screen never needs scrolling; the dice now lives in the bottom roll cup.
 */
export default function LudoBoardMobile(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);

  return (
    <div
      className="bhalyam-font bhalyam-paper rounded-2xl p-3 sm:p-4 space-y-3 shadow-2xl"
      style={{ border: "3px solid #6D4323" }}
    >
      <LudoStatusBar m={m} state={state} />

      <div className="flex justify-center">
        <InlineRoomRail
          code={roomCode}
          game="ludo"
          phase={roomPhase}
          players={players}
          selfId={selfId}
          messages={messages}
          variant="paper"
        />
      </div>

      <LudoPlayerCards state={state} players={players} row="top" />

      <LudoBoardArea
        m={m}
        state={state}
        players={players}
        maxWidth="min(92vw, calc(100vh - 440px), 560px)"
      />

      <LudoPlayerCards state={state} players={players} row="bottom" />

      <LudoBottomBar m={m} state={state} />

      <LudoOverlays m={m} state={state} players={players} />
    </div>
  );
}
