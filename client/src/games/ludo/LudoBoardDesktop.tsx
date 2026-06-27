import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import { LudoStatusBar, LudoBoardArea, LudoOverlays } from "./ludo-board-composites";

/**
 * Ludo — desktop shell.
 *
 * Two-column: a larger board on the left (the dice now sits on the board
 * itself, not in a side rail), a persistent right rail carrying the room
 * rail (chat/players/voice) on the right — the extra width goes to a bigger
 * board instead of stretching the phone layout.
 */
export default function LudoBoardDesktop(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,#111827,#020617)] p-4 lg:p-5 space-y-4 shadow-2xl">
      <LudoStatusBar m={m} state={state} />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* Board column — taller cap than mobile; nothing else competes for
            vertical space in this column. */}
        <div className="min-w-0">
          <LudoBoardArea m={m} state={state} players={players} maxWidth="min(60vw, calc(100vh - 180px), 760px)" />
        </div>

        {/* Persistent right rail */}
        <aside className="space-y-3 lg:sticky lg:top-4">
          <InlineRoomRail
            code={roomCode}
            game="ludo"
            phase={roomPhase}
            players={players}
            selfId={selfId}
            messages={messages}
          />
        </aside>
      </div>

      <LudoOverlays m={m} state={state} players={players} />
    </div>
  );
}
