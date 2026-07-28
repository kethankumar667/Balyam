import { useEffect, useRef, useState } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import {
  LudoStatusBar,
  LudoBoardArea,
  LudoOverlays,
  LudoPlayerCards,
  LudoRollTray,
} from "./ludo-board-composites";

/**
 * Ludo — desktop shell (BHALYAM notebook theme).
 *
 * Wide-screen layout tuned so the BOARD is the hero. ALL player cards live in
 * a single left rail in gameplay (turn) order; the board fills the centre; the
 * roll cup sits in a matching right rail (balancing the left rail so the board
 * stays centred). Chat/voice/players/room/emoji + the fullscreen and Leave
 * controls live in the header, so no bottom nav is needed on desktop.
 *
 * Board sizing is MEASURED, not guessed: a ResizeObserver on the centre column
 * gives the exact available width/height, and the board is the largest square
 * that fits both — so it never overflows the viewport (the old `calc(100vh …)`
 * guess could exceed the real row height and clip/scroll) and is as large as
 * the allocated space allows.
 *
 * The shell is hard-capped at the viewport (`h-`, not `min-h-`): with a floor
 * the left rail's intrinsic height could out-measure the shell and scroll the
 * whole page. Capped, the rail scrolls inside itself instead.
 */
export default function LudoBoardDesktop(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);

  const boardColRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(560);
  useEffect(() => {
    const el = boardColRef.current;
    if (!el) return;
    const measure = () =>
      setBoardPx(Math.max(320, Math.floor(Math.min(el.clientWidth, el.clientHeight)) - 8));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="bhalyam-font bhalyam-paper rounded-2xl p-4 lg:p-5 shadow-2xl flex flex-col gap-3 h-[calc(100svh-0.5rem)] overflow-hidden"
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

      {/* Left: full player list (turn order) · Centre: big board · Right: roll
          cup (also balances the left rail so the board stays centred). */}
      <div className="flex-1 min-h-0 flex items-stretch justify-center gap-4 lg:gap-6">
        <div className="w-[clamp(10rem,15vw,15rem)] flex-shrink-0 overflow-y-auto pt-1">
          <LudoPlayerCards state={state} players={players} row="all" orientation="col" selfId={selfId} registerCard={m.registerPlayerCard} onTarget={m.targetPlayer} />
        </div>

        <div ref={boardColRef} className="flex-1 min-w-0 flex items-center justify-center">
          <LudoBoardArea m={m} state={state} players={players} maxWidth={`${boardPx}px`} />
        </div>

        <div className="w-[clamp(10rem,15vw,15rem)] flex-shrink-0 flex items-center justify-center">
          <LudoRollTray m={m} state={state} />
        </div>
      </div>

      <LudoOverlays m={m} state={state} players={players} />
    </div>
  );
}
