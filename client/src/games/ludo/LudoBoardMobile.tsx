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
  LudoMatchFeed,
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

  /**
   * The board is measured against the WHOLE play column, minus what sits
   * under it — not against its own row.
   *
   * Observing the row meant the row kept every spare pixel (it is `flex-1`),
   * so on a portrait phone, where the board is width-bound, ~170px of slack
   * pooled inside it as blank paper between the board and the dice. Measuring
   * the column and subtracting a reserve for the roll tray and feed lets that
   * space collapse instead. No feedback loop: the column's own height is set
   * by the shell, not by the board.
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
      className="bhalyam-font bhalyam-paper rounded-2xl p-1.5 sm:p-4 shadow-2xl flex flex-col gap-2 h-[calc(100svh-0.5rem)] overflow-hidden"
      style={{ border: "3px solid #6D4323" }}
    >
      <LudoStatusBar m={m} state={state} />

      {/* ONE roster strip, not two.
       *
       * The seats used to be split above and below the board, which put the
       * same four players in two places and cost a second ~76px row. With the
       * turn callout also gone (its copy duplicated the header banner, the
       * active card and the roll tray), the board reclaims ~130px of height —
       * and on a portrait phone the board is height-bound at that size, so it
       * grows to fill it. */}
      <LudoPlayerCards state={state} players={players} row="all" selfId={selfId} registerCard={m.registerPlayerCard} onTarget={m.targetPlayer} />

      {/* `-mx-1.5` cancels the shell's own horizontal padding for the BOARD
          only. The board is width-bound on a portrait phone, so every pixel of
          side padding comes straight off the playing surface — while the rest
          of the shell still wants its padding. */}
      {/* Board + turn callout share one flex column. The board keeps its own
          `flex-1` slot (and the ResizeObserver with it), so the callout's
          height is subtracted from the measurement rather than guessed —
          the board is still the largest square that fits what's left, and
          the no-scroll invariant above still holds. The callout spends part
          of the ~124px of blank paper that `items-center` used to leave under
          a width-bound board. */}
      {/* `justify-start`, not `justify-center`. With the second card row and
          the callout gone there is ~170px of slack in this column, and
          centring split it above AND below the board — which read as the
          board floating in dead paper. Anchored to the top it sits directly
          under the roster, and the whole slack pools above the nav as one
          deliberate gap instead of two accidental ones. */}
      <div ref={playColRef} className="flex-1 min-h-0 flex flex-col items-center justify-start gap-2">
        {/* Full-bleed breakout. The board is width-bound in portrait, so every
            pixel of chrome between it and the screen edge comes straight off
            the playing surface. Three separate insets sat in the way: Room's
            `p-1` (4px), this shell's 3px border, and its own `p-1.5` (6px) —
            13px per side. Pulling 11 of those back (leaving 2px so the board
            never sits flush against the bezel, and never widens past the
            viewport) takes the board from ~409px to ~426px on a 430px phone.
            That is the whole budget: a square board on a portrait screen is
            limited by width alone, and this exhausts it. */}
        {/*
         * The breakout has to WIDEN the row, not just shift it.
         *
         * This was `w-full` (width: 100%) plus `margin: 0 -11px`, which moves
         * the box left and right but leaves it 100% wide — measured live, the
         * row was still 364px on a 390px phone and the board with it. A
         * portrait Ludo board is WIDTH-bound, so those 22px are the only
         * lever that actually grows the playing surface; height reclaimed
         * elsewhere cannot. `calc(100% + 22px)` genuinely takes them.
         */}
        <div
          // No longer `flex-1`: the row is exactly the board now, so the
          // column's leftover height collapses instead of pooling inside it
          // as blank paper between the board and the dice.
          className="shrink-0 flex items-start justify-center"
          style={{ width: "calc(100% + 22px)", marginLeft: -11, marginRight: -11 }}
        >
          <LudoBoardArea m={m} state={state} players={players} maxWidth={`${boardPx}px`} />
        </div>
        {/* Same match feed the desktop rail carries, in its compact shape.
            Sits OUTSIDE the board's own flex slot, so the ResizeObserver
            above measures what is left after it: on a portrait phone the
            board is width-bound and this spends slack that was blank paper,
            costing the board nothing. On a short screen where the board is
            height-bound instead, the board wins and this gives way — the
            no-scroll invariant holds either way. */}
        {/* The dice sits WITH the board, not in the nav row.
         *
         * A phone board is width-bound, so this column always has vertical
         * slack the board cannot use — previously ~170px of blank paper
         * between the board and a dice cup wedged between Voice and Invite as
         * if it were a fifth utility icon. Moving the cup here spends that
         * slack on the one control the game is played with, puts it directly
         * under the board where the eye already is, and lets the nav collapse
         * to a single compact row. It stays inside the thumb arc. */}
        {/* Measured as the board's reserve, so the board takes the column
            height that is genuinely left rather than competing with it. */}
        <div ref={belowBoardRef} className="flex w-full flex-col items-center gap-2">
          <LudoRollTray m={m} state={state} />
          <LudoMatchFeed m={m} variant="strip" />
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
