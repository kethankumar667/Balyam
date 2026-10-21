import { useEffect, useId, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, LogOut, Trophy, X } from "lucide-react";
import type { Player, UnoPlayerState } from "@shared/types";
import Modal from "../../components/Modal";
import PrizeWonChip from "../../components/economy/PrizeWonChip";
import SeatAvatar from "../../components/profile/SeatAvatar";
import BotResultNote from "../../components/room/BotResultNote";
import { fireUnoWinConfetti } from "./uno-confetti";
import { useAnimationConfig } from "../../animations/helpers/useAnimationConfig";
import { WinnerCelebration } from "../../animations/card/WinnerCelebration";
import { VictoryDance } from "../../animations/card/VictoryDance";
import type { FeltAnchor } from "../../animations/helpers/types";
import { useRoomStore } from "../../store/roomStore";
import { deriveTerminalMatchId } from "../../lib/economyMotionTriggers";
import { useMatchSettlement, winnerPrizesFor } from "../../hooks/useMatchSettlement";
import { buildUnoStandings, describeSelfResult, describeWinnerPoints, type UnoStanding } from "./unoStandings";

const VICTORY_DANCE_ANCHOR: FeltAnchor = { left: "50%", top: "32%" };

/** The four card colours, as a stripe along the top edge: the one piece of UNO branding the screen carries. */
const UNO_STRIPE = "linear-gradient(90deg,#E51E1E 0 25%,#FFD84D 25% 50%,#2EA44F 50% 75%,#1E5BD8 75% 100%)";
const PANEL_BACKGROUND = "radial-gradient(120% 80% at 50% 0%, #7A1212 0%, #3A0A0A 60%, #220606 100%)";

/**
 * The dialog's width on a roomy screen: 768px, but never closer than a gutter to either edge, and clear of a notch.
 * A landscape phone gets none of the page padding a wide screen does, so this is what keeps it off the glass.
 */
const ROOMY_PANEL_WIDTH =
  "roomy:max-w-[min(768px,calc(100vw_-_max(16px,env(safe-area-inset-left))_-_max(16px,env(safe-area-inset-right))))] roomy:mx-auto";

/** Medal colours for the first three places; everyone else gets a quiet disc. A numeral is always printed, so colour is never the only signal. */
function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-[#FFD84D] text-[#3A2200]";
  if (rank === 2) return "bg-[#D9DEE4] text-[#1F2933]";
  if (rank === 3) return "bg-[#CD7F32] text-[#2B1400]";
  return "bg-white/15 text-[#FFF3E0]";
}

export interface UnoResultModalProps {
  state: UnoPlayerState;
  players: Player[];
  selfId: string | null;
  onClose: () => void;
  onLeave?: () => void;
}

/**
 * The end-of-round results.
 *
 * Built around the one thing people open it for — the standings — and nothing that competes with them. Header and
 * actions are pinned and the list is the only region that scrolls, so a ten-seat table never pushes Continue off
 * the screen and a four-seat one needs no scrolling at all. The viewer's own result sits in the header, so it is
 * never below the fold either.
 *
 * Two layouts, chosen by the `roomy:` variant (768px and wider, or any phone held sideways — a landscape phone has
 * the width for two columns and not the height for a stack):
 *  - not roomy: a bottom sheet, stacked.
 *  - roomy: a centred dialog in two panes, the winner and your result on the left, the standings and actions right.
 * `short-land:` tightens either one for a phone on its side, and `max-[340px]:` for the narrowest phones (a folded
 * Galaxy Fold is 280px).
 *
 * ── Skeleton in px, text in rem ────────────────────────────────────────
 * A phone set to a larger system font makes `1rem` bigger, and anything sized in rem grows with it. Text should;
 * avatars, badges, pane widths, padding and the number columns should not, or a 150% font turns a 360px phone into
 * the equivalent of a 240px one and squeezes every name to nothing. So the skeleton is written in px and the numbers
 * grow with their own digits (`min-w`), while names, headings and labels stay in rem and scale as they should.
 */
export default function UnoResultModal({ state, players, selfId, onClose, onLeave }: UnoResultModalProps) {
  const titleId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const animConfig = useAnimationConfig();

  const winnerId = state.winnerId;
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? useRoomStore.getState().knownPlayers[id]?.name ?? "?";
  const isSelfWinner = winnerId != null && winnerId === selfId;

  useEffect(() => {
    if (isSelfWinner) fireUnoWinConfetti();
  }, [isSelfWinner]);

  const standings = buildUnoStandings(state, players, selfId, nameOf);
  const winnerRow = standings.find((row) => row.isWinner);
  const selfRow = standings.find((row) => row.isSelf);
  const winnerScore = winnerRow?.score ?? 0;

  // Real-money prize per placement, for a paid match only — see the hook's own doc comment for why this is a
  // re-derivation of a real, authoritative amount (EconomyService's own math, shared verbatim) rather than a guess.
  const roomState = useRoomStore((s) => s.roomState);
  const { settlement } = useMatchSettlement(deriveTerminalMatchId(roomState));
  const winnerPrizes = winnerPrizesFor(settlement);

  const headline = isSelfWinner ? "You win!" : winnerId ? `${nameOf(winnerId)} wins!` : "Round over";

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabelledBy={titleId}
      initialFocusRef={continueRef}
      mobileSheet
      panelClassName={`w-full ${ROOMY_PANEL_WIDTH} roomy:my-auto max-h-[92dvh] roomy:max-h-[88dvh] short-land:max-h-[calc(100dvh_-_2rem)] flex flex-col overflow-hidden rounded-t-[28px] roomy:rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.6)]`}
    >
      {isSelfWinner && <WinnerCelebration config={animConfig} />}
      {isSelfWinner && <VictoryDance anchor={VICTORY_DANCE_ANCHOR} config={animConfig} />}

      <motion.div
        className="relative flex min-h-0 flex-1 flex-col border border-[#FFD84D]/25 text-[#FFF3E0] roomy:flex-row"
        style={{ background: PANEL_BACKGROUND }}
        initial={animConfig.reducedMotion ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-20 h-1.5" style={{ background: UNO_STRIPE }} />

        {/* The close button lives in this pane, at its top corner, so it follows the pane's width instead of
            guessing it: stacked, the pane is the whole sheet and the button is the sheet's corner; roomy, it is the
            left pane's corner and the pane starts below it (`pt-[56px]`). Narrower on a small landscape phone. */}
        <header className="relative flex shrink-0 flex-col px-[16px] pb-[12px] pr-[64px] pt-[20px] [@media(orientation:portrait)_and_(max-height:700px)]:pb-[8px] [@media(orientation:portrait)_and_(max-height:700px)]:pt-[14px] roomy:w-[280px] roomy:overflow-y-auto roomy:border-r roomy:border-white/10 roomy:bg-black/20 roomy:px-[24px] roomy:pb-[24px] roomy:pr-[24px] roomy:pt-[56px] max-[720px]:roomy:w-[176px] max-[720px]:roomy:px-[12px] short-land:roomy:pb-[12px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-[10px] top-[12px] z-30 grid h-[44px] w-[44px] cursor-pointer place-items-center rounded-full border border-white/15 bg-black/30 text-[#FFF3E0] transition hover:bg-black/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* `my-auto` rather than `justify-center`: centred when there is room, and when a very large system font
              makes this taller than the pane it starts at the top (below the close button) and scrolls, instead of
              being pushed up underneath it. */}
          <div className="flex flex-col gap-3 roomy:my-auto roomy:items-center roomy:text-center [@media(orientation:portrait)_and_(max-height:700px)]:gap-2 short-land:roomy:gap-2">
          <div className="flex items-center gap-3 roomy:flex-col">
            <span className="grid h-[48px] w-[48px] shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#FFE066] to-[#F5B400] text-[#3A2200] roomy:hidden max-[340px]:hidden">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </span>
            {winnerRow && (
              <span className="relative hidden roomy:block short-land:hidden">
                <SeatAvatar
                  avatar={winnerRow.player?.avatar}
                  playerId={winnerRow.id}
                  name={winnerRow.name}
                  className="h-[96px] w-[96px] ring-4 ring-[#FFD84D]"
                  textClassName="text-3xl"
                />
                <span className="absolute -bottom-1 -right-1 z-20 grid h-[36px] w-[36px] place-items-center rounded-full bg-gradient-to-b from-[#FFE066] to-[#F5B400] text-[#3A2200] ring-2 ring-[#3A0A0A]">
                  <Trophy className="h-5 w-5" aria-hidden="true" />
                </span>
              </span>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="line-clamp-3 break-words font-display text-[length:min(1.25rem,30px)] leading-tight roomy:text-[length:min(1.5rem,36px)] short-land:text-[length:min(1rem,24px)] [@media(orientation:portrait)_and_(max-height:700px)]:text-[length:min(1.125rem,27px)]">
                {headline}
              </h2>
              {winnerRow && (
                <p className="mt-1.5 inline-flex rounded-full border border-[#FFD84D]/40 bg-[#FFD84D]/15 px-[10px] py-[2px] text-xs font-extrabold text-[#FFD84D]">
                  {describeWinnerPoints(winnerScore, state.targetScore, state.round)}
                </p>
              )}
            </div>
          </div>

          {selfRow && !selfRow.isWinner && (
            <p className="flex flex-wrap items-baseline gap-x-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[length:min(0.875rem,21px)] font-extrabold roomy:w-full roomy:justify-center short-land:py-1 short-land:text-[length:min(0.75rem,18px)] [@media(orientation:portrait)_and_(max-height:700px)]:py-1 [@media(orientation:portrait)_and_(max-height:700px)]:text-[length:min(0.75rem,18px)]">
              <span>{describeSelfResult(selfRow)}</span>
              <span className="whitespace-nowrap font-semibold text-[#E9B9B0]">
                {`${selfRow.score} pts`}
                {selfRow.cardsLeft != null && ` · ${selfRow.cardsLeft} ${selfRow.cardsLeft === 1 ? "card" : "cards"} left`}
              </span>
            </p>
          )}
          </div>
        </header>

        <section aria-label="Final standings" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-[8px] px-[23px] pb-[6px] pt-[8px] text-[11px] font-black uppercase tracking-wider text-[#E9B9B0] roomy:px-[31px] roomy:pt-[24px] short-land:pt-[8px] max-[340px]:px-[17px]">
            <span className="flex-1">Standings</span>
            <span className="min-w-[34px] text-center max-[340px]:min-w-[30px]">Left</span>
            <span className="min-w-[44px] text-right max-[340px]:min-w-[38px]">Pts</span>
          </div>

          <ol className="min-h-0 flex-1 space-y-[6px] overflow-y-auto overscroll-contain px-[12px] pb-[8px] pt-[4px] roomy:px-[20px] max-[340px]:px-[8px]">
            {standings.map((row, index) => (
              <StandingRow key={row.id} row={row} index={index} prize={winnerPrizes?.[index]} reducedMotion={animConfig.reducedMotion} />
            ))}
          </ol>

          <div className="grid shrink-0 grid-cols-2 gap-[10px] px-[16px] pb-[max(16px,env(safe-area-inset-bottom))] pt-[8px] roomy:px-[24px] roomy:pb-[24px] short-land:pb-[8px] [@media(orientation:portrait)_and_(max-height:700px)]:pb-[max(10px,env(safe-area-inset-bottom))]">
            <button
              ref={continueRef}
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-b from-[#FFE066] to-[#F5B400] px-[12px] py-[8px] text-center text-[length:min(0.875rem,21px)] font-black leading-tight text-[#3A2200] shadow-[0_4px_0_rgba(160,100,0,0.5)] transition active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 short-land:min-h-[44px]"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onLeave ?? onClose}
              className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-[12px] py-[8px] text-center text-[length:min(0.875rem,21px)] font-black leading-tight text-[#FFF3E0] transition hover:bg-white/15 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D] short-land:min-h-[44px]"
            >
              Leave table
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </section>
      </motion.div>
    </Modal>
  );
}

function StandingRow({ row, index, prize, reducedMotion }: { row: UnoStanding; index: number; prize: string | undefined; reducedMotion: boolean }) {
  // Everything that is not the name or the numbers goes on a second line, so a long name, a prize chip and a bot's
  // tagline never fight over the same few inches. A human with none of them gets a one-line row.
  const hasSecondLine = row.isSelf || prize != null || row.player?.isBot === true;

  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.22 }}
      className={`flex min-h-[56px] items-center gap-[8px] rounded-2xl border px-[10px] py-[8px] short-land:min-h-[44px] short-land:py-[4px] [@media(orientation:portrait)_and_(max-height:700px)]:min-h-[48px] [@media(orientation:portrait)_and_(max-height:700px)]:py-[5px] max-[340px]:gap-[6px] max-[340px]:px-[8px] ${
        row.isWinner ? "border-[#FFD84D]/55 bg-[#FFD84D]/15" : "border-white/10 bg-black/25"
      } ${row.isSelf ? "ring-2 ring-white/60" : ""}`}
    >
      <span
        aria-label={row.isTied ? `Rank ${row.rank}, tied` : `Rank ${row.rank}`}
        className={`grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full text-xs font-black max-[340px]:h-[24px] max-[340px]:w-[24px] max-[340px]:text-[11px] ${rankBadgeClass(row.rank)}`}
      >
        {row.rank}
      </span>

      <span className="relative mx-[2px] shrink-0">
        <SeatAvatar
          avatar={row.player?.avatar}
          playerId={row.id}
          name={row.name}
          className="h-[36px] w-[36px] roomy:h-[40px] roomy:w-[40px] short-land:!h-[32px] short-land:!w-[32px] [@media(orientation:portrait)_and_(max-height:700px)]:!h-[32px] [@media(orientation:portrait)_and_(max-height:700px)]:!w-[32px] max-[340px]:!h-[32px] max-[340px]:!w-[32px]"
          textClassName="text-sm"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-extrabold">{row.name}</span>
          {row.isWinner && <Crown className="h-4 w-4 shrink-0 fill-[#FFD84D] text-[#FFD84D]" role="img" aria-label="Winner" />}
        </div>
        {hasSecondLine && (
          // Wraps when the chip and the note will not share a line, and clips as a last resort: a second line must
          // never run on under the Left and Pts columns.
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 overflow-hidden">
            {prize && (
              <span className="shrink-0 rounded-full bg-[#FFF3E0] px-0.5">
                <PrizeWonChip amount={prize} />
              </span>
            )}
            {row.isSelf && <span className="shrink-0 text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#E9B9B0]">You</span>}
            {/* The bot's title badge is styled for a light surface; here it sits on a cream pill so it can be read. */}
            <BotResultNote
              player={row.player}
              className="min-w-0 max-w-full text-[#E9B9B0] [&>span.uppercase]:!border-[#FFF3E0] [&>span.uppercase]:!bg-[#FFF3E0] [&>span.uppercase]:!text-[#3A2200] [&>span:not(.uppercase)]:truncate short-land:[&>span:not(.uppercase)]:hidden [@media(orientation:portrait)_and_(max-height:700px)]:[&>span:not(.uppercase)]:hidden"
            />
          </div>
        )}
      </div>

      <span
        aria-label={row.cardsLeft == null ? "Cards left unknown" : `${row.cardsLeft} cards left`}
        className="min-w-[34px] shrink-0 text-center text-sm font-bold tabular-nums text-[#E9B9B0] max-[340px]:min-w-[30px]"
      >
        {row.cardsLeft ?? "–"}
      </span>
      <span
        aria-label={`${row.score} points`}
        className={`min-w-[44px] shrink-0 text-right text-lg font-black tabular-nums max-[340px]:min-w-[38px] max-[340px]:text-base ${row.isWinner ? "text-[#FFD84D]" : ""}`}
      >
        {row.score}
      </span>
    </motion.li>
  );
}
