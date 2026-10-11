import { ArrowLeft, DoorClosed } from "lucide-react";
import { SEALED_ROOM_ERROR } from "@shared/permissions";
import type { RoomProbeStatus } from "@shared/types";

/** The statuses that mean "you cannot sit here" — everything except `open`. */
export type UnavailableStatus = Exclude<RoomProbeStatus, "open">;

interface TableUnavailableProps {
  status: UnavailableStatus;
  onBack: () => void;
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

/**
 * Shown to someone following a room link that can no longer take them — before anything is created
 * for them. The point of telling them here, rather than after a guest account and a name have been
 * set up, is that a dead link should cost a first-time visitor nothing.
 */
export default function TableUnavailable({ status, onBack }: TableUnavailableProps) {
  const { title, body } = COPY[status];
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div
        role="alert"
        className="w-full max-w-md rounded-3xl border-2 border-bhalyam-cream-edge/70 dark:border-slate-700
                   bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100
                   p-6 text-center space-y-4 shadow-[0_20px_50px_-20px_rgba(74,44,22,0.45)]"
      >
        <DoorClosed className="w-10 h-10 mx-auto text-bhalyam-gold-dark" aria-hidden />
        <h2 className="font-display text-xl font-black leading-tight">{title}</h2>
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
      </div>
    </div>
  );
}
