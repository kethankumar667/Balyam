import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DoorOpen, X } from "lucide-react";
import { useRoomStore } from "../../store/roomStore";

/**
 * "Jump back into your match" — the most recent stored seat, offered on the
 * home page as a one-tap rejoin.
 *
 * Why this banner exists: the server holds a disconnected seat for 90s and
 * the room may outlive that, but the player who closed the tab had NO path
 * back — home showed nothing, and typing a 6-char code they half-remember
 * is exactly the friction that loses them. `mpg.seats` already holds the
 * credential; this surfaces it at the moment of highest intent.
 *
 * Honesty rules:
 *   - A stored seat is NOT proof the room still exists (it may have ended
 *     or the server restarted). The banner therefore says "rejoin", and a
 *     dead room lands on the Room page's existing "no longer active" toast
 *     — which also fires `forgetSeat`, so the banner self-cleans.
 *   - Most recent first, exactly one offer. A list of stale rooms is a
 *     graveyard, not a feature.
 *   - Hidden while a room is already open in this tab (Room owns that
 *     experience); hidden in tests via the usual non-DOM guards.
 */
export default function RejoinBanner() {
  const navigate = useNavigate();
  const seats = useRoomStore((s) => s.seats);

  const latest = useMemo(() => {
    // Seat keys are room codes; no timestamps are stored, but `rememberSeat`
    // appends newest-last and eviction drops oldest-first, so the LAST key
    // in insertion order is the most recent room. JSON.parse preserves
    // string-key insertion order for these non-numeric codes.
    const codes = Object.keys(seats);
    return codes.length > 0 ? codes[codes.length - 1] : null;
  }, [seats]);

  // No roomState guard here, deliberately. The store keeps a room's state
  // after the player leaves (Room only clears it on explicit paths, and a
  // browser-Back departure keeps it entirely), so "store has roomState" is
  // NOT "player is in a room". This banner only mounts on Home — if the
  // player is reading it, they are not looking at a room shell.
  if (typeof window === "undefined") return null;
  if (!latest) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 px-4 py-3 shadow-sm"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
        <DoorOpen size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-[#5C3D1E] dark:text-amber-200">
          Your table is waiting
        </p>
        <p className="truncate text-xs text-[#8A6D4B] dark:text-zinc-400">
          Rejoin room{" "}
          <span className="font-mono font-bold tracking-widest">{latest}</span> — your seat is
          remembered on this device.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(`/room/${latest}`)}
        className="min-h-[44px] shrink-0 rounded-xl bhalyam-gold-leaf bhalyam-cta-shine border border-bhalyam-gold-dark px-4 text-sm font-bold text-bhalyam-wood-dark shadow-md transition active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
      >
        Rejoin
      </button>
      <button
        type="button"
        aria-label="Dismiss rejoin suggestion"
        onClick={() => useRoomStore.getState().forgetSeat(latest)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#8A6D4B] dark:text-zinc-400 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
