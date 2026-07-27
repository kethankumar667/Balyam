import { useEffect, useRef, useState } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import {
  LudoStatusBar,
  LudoBoardArea,
  LudoOverlays,
  LudoPlayerCards,
  LudoBottomBar,
  LudoEngagementZone,
} from "./ludo-board-composites";

/** Rendered height of the engagement zone, plus the shell's `gap-2` — i.e. the
 *  vertical cost of showing it. */
const ZONE_H = 132;
const ZONE_COST = ZONE_H + 8;
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
  // The engagement zone exists to fill DEAD space — on a tall phone the board
  // is width-capped and leaves a gap below it. When there's no such gap it
  // must not render at all, or it steals height from the board (which is the
  // hero) and overflows the shell.
  const [showZone, setShowZone] = useState(false);

  useEffect(() => {
    const el = boardRowRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setBoardPx(Math.max(120, Math.floor(Math.min(w, h, MAX_BOARD))));
      // Hysteresis, so the two states can't flip-flop: showing the zone costs
      // the row exactly ZONE_COST, so "show it" and "keep it" reduce to the
      // same predicate — the board still gets its full width-capped size.
      const cap = Math.min(w, MAX_BOARD);
      setShowZone((on) => (on ? h : h - ZONE_COST) >= cap);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="bhalyam-font bhalyam-paper rounded-2xl p-2.5 sm:p-4 shadow-2xl flex flex-col gap-2 h-[calc(100svh-1rem)] overflow-hidden"
      style={{ border: "3px solid #6D4323" }}
    >
      <LudoStatusBar m={m} state={state} />

      <LudoPlayerCards state={state} players={players} row="top" />

      <div ref={boardRowRef} className="flex-1 min-h-0 flex items-center justify-center">
        <LudoBoardArea m={m} state={state} players={players} maxWidth={`${boardPx}px`} />
      </div>

      <LudoPlayerCards state={state} players={players} row="bottom" />

      <LudoBottomBar m={m} state={state} unread={unread} />

      {/* Only when the board genuinely leaves room: a live match feed of real
          game events + one-tap reactions. Fixed height so its cost to the
          board row is exactly known (see the hysteresis above). */}
      {showZone && (
        <div className="flex-shrink-0 flex" style={{ height: ZONE_H }}>
          <LudoEngagementZone state={state} nameOf={m.nameOf} />
        </div>
      )}

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
