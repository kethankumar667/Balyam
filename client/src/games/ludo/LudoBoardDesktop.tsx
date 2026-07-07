import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import { LudoStatusBar, LudoBoardArea, LudoOverlays } from "./ludo-board-composites";

/**
 * Ludo — desktop shell.
 *
 * Single centred column. The room rail (link/players/voice/chat/emoji) is a
 * compact horizontal strip that now lives in the top status bar next to the
 * Rules/settings controls, so the board is free to centre across the FULL
 * width instead of being pushed left by a fixed side column that left a large
 * empty void to its right. The dice sits on the board itself.
 */
export default function LudoBoardDesktop(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,#111827,#020617)] p-4 lg:p-5 space-y-4 shadow-2xl">
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
          />
        }
      />

      {/* Board centred across the full width — no side column, symmetric
          margins on both sides. */}
      <div className="flex justify-center">
        <LudoBoardArea m={m} state={state} players={players} maxWidth="min(82vw, calc(100vh - 170px), 860px)" />
      </div>

      <LudoOverlays m={m} state={state} players={players} />
    </div>
  );
}
