import { useEffect, useRef, useState } from "react";
import { ArrowLeft, DoorClosed } from "lucide-react";
import { SEALED_ROOM_ERROR } from "@shared/permissions";
import type { RoomProbeStatus } from "@shared/types";

/** The statuses that mean "you cannot sit here" — everything except `open`. */
export type UnavailableStatus = Exclude<RoomProbeStatus, "open">;

interface TableUnavailableProps {
  status: UnavailableStatus;
  onBack: () => void;
  /**
   * The viewer WAS seated here and came back to find the table gone. That is something that happened to them, not a
   * mistyped link, so it is worded that way and does not tell them to ask a friend for a new one.
   */
  returning?: boolean;
  /** Replaces the explanation, e.g. the server's own reason for closing the table. */
  message?: string;
  /**
   * Go back to the lounge by itself after this many seconds, with a visible countdown and a way to stay. Counted
   * only while the tab is on screen: someone returning to a long-idle tab gets the whole countdown to read it.
   */
  autoReturnSeconds?: number;
  /** One more way forward, e.g. "Start a new Bingo room". */
  secondary?: { label: string; onClick: () => void };
}

const COPY: Record<UnavailableStatus, { title: string; body: string }> = {
  not_found: {
    title: "This table has closed",
    body: "The room code may be mistyped, or the host has left. Ask your friend for a fresh link.",
  },
  sealed: {
    title: "This table isn't open",
    body: `${SEALED_ROOM_ERROR}. Ask your friend to open a shared room instead.`,
  },
  full: {
    title: "This table is full",
    body: "Every seat is taken. Ask your friend to make room, or to start a new table.",
  },
  started: {
    title: "This game has already started",
    body: "A match can't be joined once it is under way. Ask your friend to create a new room.",
  },
};

/** For someone who was at the table. Only the two ways a seated player can lose it; the others read the same for anyone. */
const RETURNING_COPY: Partial<Record<UnavailableStatus, { title: string; body: string }>> = {
  not_found: {
    title: "This room has closed",
    body: "The match is over and the table was closed while you were away. You can start a new one whenever you like.",
  },
  started: {
    title: "Your seat was released",
    body: "You were away for a while, so the table gave your seat up and the match has moved on without you.",
  },
};

/**
 * Shown to someone following a room link that can no longer take them — before anything is created
 * for them. The point of telling them here, rather than after a guest account and a name have been
 * set up, is that a dead link should cost a first-time visitor nothing.
 *
 * It is also where a returning player lands when the table they left open has closed underneath them, instead of
 * a connecting screen that goes on connecting.
 */
export default function TableUnavailable({ status, onBack, returning = false, message, autoReturnSeconds, secondary }: TableUnavailableProps) {
  const copy = (returning ? RETURNING_COPY[status] : undefined) ?? COPY[status];
  const body = message ?? copy.body;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(autoReturnSeconds ?? null);
  const counting = secondsLeft !== null;
  // The clock stops AT zero: left running it would count into the negatives and ask to go back every second.
  const ticking = secondsLeft !== null && secondsLeft > 0;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setSecondsLeft((s) => (s === null ? s : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    if (secondsLeft === 0) onBackRef.current();
  }, [secondsLeft]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div
        role="alert"
        className="w-full max-w-md rounded-3xl border-2 border-bhalyam-cream-edge/70 dark:border-slate-700
                   bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100
                   p-6 text-center space-y-4 shadow-[0_20px_50px_-20px_rgba(74,44,22,0.45)]"
      >
        <DoorClosed className="w-10 h-10 mx-auto text-bhalyam-gold-dark" aria-hidden />
        <h2 className="font-display text-xl font-black leading-tight">{copy.title}</h2>
        <p className="text-sm text-bhalyam-wood-dark/80 dark:text-slate-300">{body}</p>
        <button
          type="button"
          onClick={onBack}
          className="w-full min-h-[44px] rounded-2xl bhalyam-gold-leaf border border-bhalyam-gold-dark
                     text-bhalyam-wood-dark font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Return to Lounge
        </button>
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="w-full min-h-[44px] rounded-2xl border-2 border-bhalyam-gold-dark/70 dark:border-amber-400/50
                       text-bhalyam-wood-dark dark:text-amber-100 font-black text-sm cursor-pointer
                       hover:bg-bhalyam-gold-dark/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark"
          >
            {secondary.label}
          </button>
        )}
        {counting && (
          <div className="space-y-1 pt-1">
            {/* The number changes every second, which a screen reader would read out each time: announce the plan once. */}
            <span className="sr-only" role="status">
              Returning to the lounge shortly. Choose Stay on this page to remain here.
            </span>
            <p className="text-xs font-semibold text-bhalyam-wood-dark/70 dark:text-slate-400" aria-hidden="true">
              Taking you back to the lounge in {secondsLeft}s
            </p>
            <button
              type="button"
              onClick={() => setSecondsLeft(null)}
              className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-bhalyam-wood-dark/80 dark:text-slate-300 underline underline-offset-2
                         cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark"
            >
              Stay on this page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
