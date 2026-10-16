import { useEffect, useRef, useState, type CSSProperties } from "react";
import InlineRoomRail from "../../components/InlineRoomRail";
import { useTableCamera } from "../../animations/camera/useTableCamera";
import { useLudoBoard, type LudoBoardProps } from "./useLudoBoard";
import {
  LudoStatusBar,
  LudoBoardArea,
  LudoOverlays,
  LudoPlayerCards,
  LudoBottomBar,
  LudoRollTray,
  useLudoTableImpact,
} from "./ludo-board-composites";

/** The board is never allowed past this, matching the desktop shell. */
const MAX_BOARD = 620;

/** A phone held sideways. Keep in step with the `short-land:` variant in tailwind.config.js. */
const SHORT_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 520px)";

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
  const camera = useTableCamera();
  useLudoTableImpact(state.lastEvent, camera);

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
    const root = col.parentElement;
    const measure = () => {
      // Phone held sideways: the board has its own column to the left, so it is the largest square that
      // fits the SHELL's height (or about half its width) — not what is left after a stack of rows. In the
      // portrait stack the 120px floor below swallowed the whole screen on a 375px-tall phone and the
      // board, header and dice all drew on top of one another.
      if (root && window.matchMedia(SHORT_LANDSCAPE_QUERY).matches) {
        const usableH = root.clientHeight - 12;
        setBoardPx(Math.max(120, Math.floor(Math.min(usableH, root.clientWidth * 0.46, MAX_BOARD))));
        return;
      }
      const reserve = belowBoardRef.current?.offsetHeight ?? 0;
      const usableH = col.clientHeight - reserve;
      setBoardPx(Math.max(120, Math.floor(Math.min(col.clientWidth + 22, usableH, MAX_BOARD))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(col);
    if (root) ro.observe(root);
    if (belowBoardRef.current) ro.observe(belowBoardRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={camera.cameraRef}
      className={`theme-${m.settings.theme} bhalyam-font rounded-2xl p-1.5 sm:p-4 shadow-2xl flex flex-col gap-2 h-[calc(100svh-0.5rem)] overflow-hidden short-land:grid short-land:grid-cols-[auto_minmax(0,1fr)] short-land:grid-rows-[auto_1fr_auto] short-land:gap-x-3 short-land:gap-y-1 short-land:overflow-y-auto`}
      style={
        {
          background: "var(--ludo-screen-bg)",
          border: "3px solid var(--ludo-screen-border)",
          color: "var(--ludo-card-text)",
          // The measured board size, for the sideways layout's left column to take as its width.
          "--ludo-board-px": `${boardPx}px`,
        } as CSSProperties
      }
    >
      {/* Sideways: right column, top. The wrapper is a plain block in portrait, so nothing moves there. */}
      <div className="short-land:col-start-2 short-land:row-start-1">
        <LudoStatusBar m={m} state={state} />
      </div>

      {/* `short-land:contents` dissolves this column so its two children join the shell's grid directly:
          the board spans the left column, the cards + dice sit in the right one. */}
      <div ref={playColRef} className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 short-land:contents">
        <div
          className="shrink-0 flex items-center justify-center short-land:col-start-1 short-land:row-start-1 short-land:row-span-3 short-land:self-center short-land:!m-0 short-land:!w-[var(--ludo-board-px)]"
          style={{ width: "calc(100% + 22px)", marginLeft: -11, marginRight: -11 }}
        >
          <LudoBoardArea m={m} state={state} players={players} maxWidth={`${boardPx}px`} />
        </div>

        <div ref={belowBoardRef} className="flex w-full flex-col items-center gap-2 short-land:col-start-2 short-land:row-start-2 short-land:self-center">
          <LudoPlayerCards state={state} players={players} row="grid" selfId={selfId} registerCard={m.registerPlayerCard} onTarget={m.targetPlayer} />
          <LudoRollTray m={m} state={state} />
        </div>
      </div>

      <div className="short-land:col-start-2 short-land:row-start-3">
        <LudoBottomBar m={m} state={state} unread={unread} withTray={false} />
      </div>

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
