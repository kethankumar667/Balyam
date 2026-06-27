import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import { LudoStatusBar, LudoBoardArea, LudoOverlays } from "./ludo-board-composites";

/**
 * Ludo — mobile shell.
 *
 * Single column, touch-first: status bar → room rail → board (the dice now
 * sits on the board itself, not a separate stacked section) → all
 * modals/overlays. Capped by viewport width AND height so it never needs
 * scrolling.
 */
export default function LudoBoardMobile(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,#111827,#020617)] p-3 sm:p-4 space-y-3 shadow-2xl">
      <LudoStatusBar m={m} state={state} />

      <InlineRoomRail
        code={roomCode}
        game="ludo"
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
      />

      {/* Board — capped by BOTH viewport width and viewport height so it
          always fits on a single screen without scrolling. The 300 px
          reserve accounts for the chrome above the board (header + turn
          chips + reactions row). Dice now lives on the board itself. */}
      <LudoBoardArea m={m} state={state} players={players} maxWidth="min(92vw, calc(100vh - 300px), 680px)" />

      <LudoOverlays m={m} state={state} players={players} />
    </div>
  );
}
