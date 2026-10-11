import { Plus } from "lucide-react";
import type { GameKind } from "@shared/types";
import { GAME_DISPLAY_NAMES } from "@shared/catalog";
import { plainGameName } from "../mandali/album/games";

export interface FinishedTableCardProps {
  /** The game just played, so "play again" can open a new room for the same one. */
  game: GameKind;
  /** Leave this table and open the create-room sheet for the same game. */
  onNewRoom: () => void;
  onLeave: () => void;
}

/**
 * What a finished table says once its scorecard has been closed.
 *
 * A room hosts one match, so there is nothing left to start here: no Ready, no Start, no stake to
 * change, no code worth sharing (a finished room takes no new players). It says the match is over,
 * offers the one thing to do next (a new room for the same game, then share its link) and the way
 * out. The settlement banners that still matter after a match sit above it in the room, not in here.
 */
export default function FinishedTableCard({ game, onNewRoom, onLeave }: FinishedTableCardProps) {
  const gameName = plainGameName(GAME_DISPLAY_NAMES[game] ?? game);
  return (
    <section
      aria-label="Match finished"
      className="w-full rounded-3xl border-2 border-amber-300/90 bg-white p-4 text-center shadow-xs dark:border-amber-500/50 dark:bg-slate-900 sm:p-5"
    >
      <h2 className="m-0 text-base font-black text-stone-900 dark:text-white">Match finished</h2>
      <p className="m-0 mt-1.5 text-sm font-medium leading-relaxed text-stone-600 dark:text-slate-300">
        This table is closed to new players. To play again, start a new room and share its link, in a Mandali, on
        WhatsApp, anywhere.
      </p>
      <button
        type="button"
        onClick={onNewRoom}
        className="mt-3 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-black text-stone-950 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create a new {gameName} room
      </button>
      <button
        type="button"
        onClick={onLeave}
        className="mt-2 min-h-[44px] w-full cursor-pointer rounded-2xl bg-[#4A2D1B] px-5 text-sm font-black text-white transition hover:bg-[#382012] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98]"
      >
        Leave table
      </button>
    </section>
  );
}
