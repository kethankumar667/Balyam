import { useEffect, useRef, useState } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import {
  LudoStatusBar,
  LudoBoardArea,
  LudoOverlays,
  LudoPlayerCards,
  LudoBottomBar,
} from "./ludo-board-composites";

/** The board is never allowed past this, matching the desktop shell. */
const MAX_BOARD = 620;

/**
 * Ludo — mobile shell (BHALYAM notebook theme).
 *
 * Premium-pass layout (AAA design-review): the board is the hero, and the
 * chrome around it is minimised. Top→bottom: one-row paper header (menu ·
 * LUDO · turn banner · sound · Rules · Leave) → top player cards → BOARD →
 * bottom player cards → bottom nav (chat · emoji · roll-cup · voice ·
 * invite). The old persistent social-toolbar row was removed — its panels
 * (chat/voice/players/room/emoji) stay mounted strip-less and are driven
 * from the bottom nav via the `bhalyam:open-room-panel` bridge, reclaiming
 * a full row for gameplay.
 *
 * NO-SCROLL INVARIANT. The shell is hard-capped at the visible viewport
 * (`h-`, not `min-h-`) so nothing inside it can ever scroll the page, and the
 * board is MEASURED rather than guessed: a ResizeObserver on the board row
 * reports the real space left after the header/cards/nav, and the board is the
 * largest square that fits it. The previous `calc(100vh - 366px)` guess
 * budgeted for none of the engagement zone, so on short or wide-but-short
 * screens (and on tablets, where the board hits its 620px cap) the zone's
 * min-content pushed the page down by up to 162px.
 */
export default function LudoBoardMobile(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);
  const [unread, setUnread] = useState(0);

  const boardRowRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(320);
  useEffect(() => {
    const el = boardRowRef.current;
    if (!el) return;
    const measure = () =>
      setBoardPx(Math.max(120, Math.floor(Math.min(el.clientWidth, el.clientHeight, MAX_BOARD))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="bhalyam-font bhalyam-paper rounded-2xl p-1.5 sm:p-4 shadow-2xl flex flex-col gap-2 h-[calc(100svh-0.5rem)] overflow-hidden"
      style={{ border: "3px solid #6D4323" }}
    >
      <LudoStatusBar m={m} state={state} />

      <LudoPlayerCards state={state} players={players} row="top" selfId={selfId} registerCard={m.registerPlayerCard} onTarget={m.targetPlayer} />

      {/* `-mx-1.5` cancels the shell's own horizontal padding for the BOARD
          only. The board is width-bound on a portrait phone, so every pixel of
          side padding comes straight off the playing surface — while the rest
          of the shell still wants its padding. */}
      <div ref={boardRowRef} className="flex-1 min-h-0 flex items-center justify-center -mx-1.5 sm:mx-0">
        <LudoBoardArea m={m} state={state} players={players} maxWidth={`${boardPx}px`} />
      </div>

      <LudoPlayerCards state={state} players={players} row="bottom" selfId={selfId} registerCard={m.registerPlayerCard} onTarget={m.targetPlayer} />

      <LudoBottomBar m={m} state={state} unread={unread} />

      {/* Room panels + event bridge only — no visible strip (the bottom nav
          drives them). Keeps chat/voice/players/room/emoji fully functional
          while removing the duplicate persistent toolbar row. */}
      <InlineRoomRail
        code={roomCode}
        game="ludo"
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
        variant="paper"
        hideStrip
        onUnreadChange={setUnread}
      />

      <LudoOverlays m={m} state={state} players={players} />
    </div>
  );
}
