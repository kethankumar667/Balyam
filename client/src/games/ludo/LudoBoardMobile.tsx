import { useEffect, useRef, useState } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import {
  LudoStatusBar,
  LudoBoardArea,
  LudoOverlays,
  LudoPlayerCards,
  LudoBottomBar,
  LudoRollTray,
} from "./ludo-board-composites";

/** The board is never allowed past this, matching the desktop shell. */
const MAX_BOARD = 620;

/**
 * Ludo — mobile shell (BHALYAM notebook theme).
 *
 * Premium-pass layout (AAA design-review): the board is the hero, and the
 * chrome around it is minimised. Top→bottom: one-row paper header (menu ·
 * LUDO · turn banner · sound · Rules · Leave) → BOARD → bottom player cards →
 * roll cup → bottom nav (chat · emoji · voice · invite). The old persistent
 * social-toolbar row was removed — its panels (chat/voice/players/room/emoji)
 * stay mounted strip-less and are driven from the bottom nav via the
 * `bhalyam:open-room-panel` bridge, reclaiming a full row for gameplay.
 *
 * NO-SCROLL INVARIANT. The shell is hard-capped at the visible viewport
 * (`h-`, not `min-h-`) so nothing inside it can ever scroll the page, and the
 * board is MEASURED rather than guessed: a ResizeObserver on the board row
 * reports the real space left after the header/cards/nav, and the board is the
 * largest square that fits it.
 */
export default function LudoBoardMobile(props: LudoBoardProps) {
  const { state, players, selfId, messages, roomCode, roomPhase } = props;
  const m = useLudoBoard(props);
  const [unread, setUnread] = useState(0);

  /**
   * The board is measured against the WHOLE play column, minus what sits
   * under it — not against its own row.
   */
  const playColRef = useRef<HTMLDivElement>(null);
  const belowBoardRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(320);
  useEffect(() => {
    const col = playColRef.current;
    if (!col) return;
    const measure = () => {
      const reserve = belowBoardRef.current?.offsetHeight ?? 0;
      const usableH = col.clientHeight - reserve;
      setBoardPx(Math.max(120, Math.floor(Math.min(col.clientWidth + 22, usableH, MAX_BOARD))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(col);
    if (belowBoardRef.current) ro.observe(belowBoardRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={`theme-${m.settings.theme} bhalyam-font rounded-2xl p-1.5 sm:p-4 shadow-2xl flex flex-col gap-2 h-[calc(100svh-0.5rem)] overflow-hidden`}
      style={{
        background: "var(--ludo-screen-bg)",
        border: "3px solid var(--ludo-screen-border)",
        color: "var(--ludo-card-text)",
      }}
    >
      <LudoStatusBar m={m} state={state} />

      <div ref={playColRef} className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2">
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: "calc(100% + 22px)", marginLeft: -11, marginRight: -11 }}
        >
          <LudoBoardArea m={m} state={state} players={players} maxWidth={`${boardPx}px`} />
        </div>

        <div ref={belowBoardRef} className="flex w-full flex-col items-center gap-2">
          <LudoPlayerCards state={state} players={players} row="grid" selfId={selfId} registerCard={m.registerPlayerCard} onTarget={m.targetPlayer} />
          <LudoRollTray m={m} state={state} />
        </div>
      </div>

      <LudoBottomBar m={m} state={state} unread={unread} withTray={false} />

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
