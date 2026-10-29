import { useEffect, useId, useRef } from "react";
import { ArrowRight, ArrowUp, Crown, Star, X } from "lucide-react";
import CountUp from "../CountUp";
import RecordStage from "./RecordStage";
import { tileImageForGame } from "../../features/myrecords/records";
import { HapticsManager } from "../../services/HapticsManager";
import type { RecordScoreResult } from "@shared/profile/Scorecard";

interface PersonalBestOverdriveModalProps {
  result: RecordScoreResult | null;
  /** The game's display name, shown beside the mode ("Rummy · Pool 101"). */
  gameName?: string;
  /** What the score is counted in ("runs", "s"), so the improvement reads in the game's own terms. */
  unit?: string;
  onClose: () => void;
  onViewScorecards?: () => void;
}

const CARD_BACKGROUND =
  "radial-gradient(120% 60% at 50% 38%, rgba(245,158,11,.20), rgba(245,158,11,0) 62%), linear-gradient(180deg, #0c2352 0%, #0a1b42 46%, #060f26 100%)";

/**
 * "You beat your own record": the celebration shown the moment a player's score passes their old best, in any game.
 *
 * A night-stadium card with a crowned trophy, the old and new score side by side, and one big way out. The picture is
 * the game's own (the tile art of the game the record was set in) and is decorative; everything the player needs
 * is text. On a short landscape phone the picture and the sign-off are dropped so the numbers and the button fit.
 */
export default function PersonalBestOverdriveModal({
  result,
  gameName,
  unit,
  onClose,
  onViewScorecards,
}: PersonalBestOverdriveModalProps) {
  const titleId = useId();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result?.isNewPersonalBest) {
      HapticsManager.getInstance().win();
    }
  }, [result]);

  // Focus the way out without scrolling the card to it: on a short screen that would hide the headline.
  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!result || !result.isNewPersonalBest) return null;

  const { scorecard, deltaFromPrevious, previousBest } = result;
  const amount = Math.abs(deltaFromPrevious);
  const unitLabel = unit ? <span className="mt-0.5 block text-sm font-semibold text-slate-300">{unit}</span> : null;

  return (
    <div
      className="fixed inset-0 z-[90] flex animate-fadeIn select-none items-center justify-center bg-[#02060f]/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative w-full max-w-[440px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-sky-400/50 bg-[#0b1d45] text-sky-100 transition-colors hover:bg-[#12306b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
        <div
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden rounded-[28px] border border-amber-400/60 px-5 pb-5 pt-9 text-center shadow-[0_0_0_1px_rgba(96,165,250,.35),0_0_60px_rgba(245,158,11,.28)] [@media(max-height:480px)]:px-4 [@media(max-height:480px)]:pb-4 [@media(max-height:480px)]:pt-6"
          style={{ background: CARD_BACKGROUND }}
        >

        <Crown className="mx-auto -mb-1 h-9 w-9 fill-amber-400 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,.8)] [@media(max-height:480px)]:hidden" aria-hidden="true" />

        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-400/70 bg-[#0a1020]/80 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300 sm:text-xs">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          You beat your own record!
        </p>

        <h2 id={titleId} className="mt-3 font-display uppercase leading-[0.95] tracking-tight [@media(max-height:480px)]:mt-2 [@media(max-height:480px)]:flex [@media(max-height:480px)]:items-baseline [@media(max-height:480px)]:justify-center [@media(max-height:480px)]:gap-2">
          <span className="block bg-gradient-to-b from-[#fff3b0] via-[#fbbf24] to-[#d97706] bg-clip-text text-5xl text-transparent drop-shadow-[0_3px_0_rgba(120,53,15,.65)] sm:text-6xl [@media(max-height:480px)]:text-3xl">
            New
          </span>{" "}
          <span className="block bg-gradient-to-b from-white via-[#cfe3ff] to-[#6fa8ff] bg-clip-text text-[2rem] text-transparent drop-shadow-[0_3px_0_rgba(15,40,100,.8)] min-[380px]:text-4xl sm:text-[2.6rem] [@media(max-height:480px)]:text-2xl">
            Personal Record
          </span>
        </h2>

        <p className="mx-auto mt-3 inline-block max-w-full rounded-full border border-sky-400/30 bg-[#0b1d45]/80 px-4 py-1.5 text-sm font-medium text-slate-100">
          {gameName ? `${gameName} · ` : ""}
          {scorecard.modeDisplayName}
        </p>

        <div className="[@media(max-height:480px)]:hidden">
          <RecordStage art={tileImageForGame(result.game)} />
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-amber-400/50 bg-[#08183d]/85 px-3 pb-6 pt-4 shadow-[inset_0_0_24px_rgba(37,99,235,.18)] [@media(max-height:480px)]:mt-2 [@media(max-height:480px)]:py-3">
          <div>
            <span className="inline-block rounded-full border border-slate-500/50 bg-[#0d1f4a] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Your old record
            </span>
            <span className="mt-2 block text-4xl font-extrabold text-white sm:text-5xl">{previousBest}</span>
            {unitLabel}
          </div>
          <ArrowRight className="h-6 w-6 text-amber-400" aria-hidden="true" />
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-[#2a1d05]/70 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Crown className="h-3 w-3 fill-amber-400" aria-hidden="true" />
              Your new record
            </span>
            <span className="mt-2 block text-5xl font-extrabold text-amber-300 drop-shadow-[0_0_14px_rgba(245,158,11,.55)] sm:text-6xl">
              <CountUp end={scorecard.bestScore} duration={1.5} />
            </span>
            {unitLabel}
          </div>
        </div>

        {amount !== 0 && (
          <p className="relative z-10 -mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/60 bg-[#06241f] px-4 py-1.5 font-mono text-sm font-bold text-emerald-300">
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
            Improved by {amount}
            {unit ? ` ${unit}` : ""}
          </p>
        )}

        <p className="mt-3 text-sm text-slate-300 [@media(max-height:480px)]:hidden">Keep going! Every game makes you stronger.</p>

        <button
          type="button"
          ref={primaryRef}
          onClick={onClose}
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[#ffe27a] via-[#fbbf24] to-[#e08a0a] px-6 text-lg font-extrabold text-[#2b1700] shadow-[0_0_24px_rgba(245,158,11,.45)] transition-transform hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-safe:active:scale-[0.98] [@media(max-height:480px)]:mt-3"
        >
          <span>Awesome!</span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>

        {onViewScorecards && (
          <button
            type="button"
            onClick={() => {
              onViewScorecards();
              onClose();
            }}
            className="mt-2 min-h-[44px] cursor-pointer rounded-full px-4 text-sm font-semibold text-sky-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            View My Records
          </button>
        )}

        <div className="mt-2 flex items-center justify-center gap-3 text-slate-400 [@media(max-height:480px)]:hidden" aria-hidden="true">
          <span className="h-px w-10 bg-slate-600/70" />
          <span className="text-center">
            <span className="block font-display text-sm tracking-[0.32em] text-slate-300">BHALYAM</span>
            <span className="block text-[11px] tracking-wide">Relive Childhood</span>
          </span>
          <span className="h-px w-10 bg-slate-600/70" />
        </div>
        </div>
      </div>
    </div>
  );
}
