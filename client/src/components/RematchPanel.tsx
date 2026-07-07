import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "../store/roomStore";
import type { Player } from "@shared/types";

/**
 * Generic rematch UI for every game's end-game screen.
 *
 * Behaviour:
 *   - Host (when rematch idle):     "Play Again" button → emits `rematch:request`
 *   - Host (pending):               "Waiting for X of Y players…" + Cancel-style decline
 *   - Non-host (pending):           Accept / Decline buttons → emits `rematch:respond`
 *   - Everyone (accepted):          "Next game starting in Ns…" countdown
 *   - Everyone (declined):          "Rematch cancelled" badge, auto-dismisses
 *
 * Drop this in any end-game card and it will adapt to the current room state.
 * Styled to match the existing room UI (paper cream + wood accents).
 */
export default function RematchPanel({
  players,
  selfId,
  className,
}: {
  players: Player[];
  selfId: string | null;
  className?: string;
}) {
  const rematch = useRoomStore((s) => s.rematch);
  const roomState = useRoomStore((s) => s.roomState);

  const isHost = roomState?.hostId === selfId;
  const myResponse = selfId ? rematch.responses[selfId] : undefined;

  function requestRematch() {
    getSocket().emit("rematch:request");
  }
  function accept() {
    getSocket().emit("rematch:respond", "accept");
  }
  function decline() {
    getSocket().emit("rematch:respond", "decline");
  }

  // ─── Accepted: countdown ───
  if (rematch.status === "accepted" && rematch.startsAt) {
    return (
      <CountdownBox
        startsAt={rematch.startsAt}
        className={className}
      />
    );
  }

  // ─── Declined: brief badge ───
  if (rematch.status === "declined") {
    const decliner = players.find((p) => p.id === rematch.declinedBy);
    return (
      <div
        role="status"
        className={`rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-800
                    px-4 py-3 text-sm font-semibold text-center ${className ?? ""}`}
      >
        {decliner
          ? `${decliner.name} declined the rematch.`
          : "Rematch request expired."}
      </div>
    );
  }

  // ─── Pending: depends on role + own response ───
  if (rematch.status === "pending") {
    const responses = Object.values(rematch.responses);
    const acceptedCount = responses.filter((r) => r === "accept").length;
    const totalCount = responses.length;

    if (isHost || myResponse === "accept") {
      return (
        <div
          className={`rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3
                      text-center space-y-2 ${className ?? ""}`}
        >
          <div className="text-amber-900 font-bold text-sm">
            Waiting for players…
            <span className="ml-2 font-mono tabular-nums">
              {acceptedCount} / {totalCount}
            </span>
          </div>
          <PendingResponseAvatars players={players} rematch={rematch} />
          <button
            type="button"
            onClick={decline}
            className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
          >
            Cancel rematch
          </button>
        </div>
      );
    }
    // Non-host who hasn't responded yet → prompt
    return (
      <div
        className={`rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3
                    space-y-3 ${className ?? ""}`}
      >
        <div className="text-amber-900 font-bold text-sm text-center">
          Host wants a rematch. Are you in?
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={accept}
            className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700
                       text-white font-bold cursor-pointer transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={decline}
            className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700
                       text-white font-bold cursor-pointer transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  // ─── Idle: host can kick off; non-host sees nothing ───
  if (isHost) {
    return (
      <button
        type="button"
        onClick={requestRematch}
        className={`w-full inline-flex items-center justify-center gap-2
                    min-h-[48px] rounded-xl bg-[#EA5A1F] hover:bg-[#D84F17]
                    text-white font-bold text-base cursor-pointer
                    active:translate-y-px transition-colors duration-200
                    shadow-[0_4px_10px_-3px_rgba(234,90,31,0.5)]
                    focus:outline-none focus:ring-2 focus:ring-[#EA5A1F]/40 focus:ring-offset-2
                    ${className ?? ""}`}
      >
        <RepeatIcon className="w-5 h-5" />
        Play Again
      </button>
    );
  }

  // Non-host idle → wait silently for host to act.
  return (
    <div
      className={`text-center text-sm text-[#6E5E4D] italic ${className ?? ""}`}
    >
      Waiting for host to start another round…
    </div>
  );
}

function CountdownBox({
  startsAt,
  className,
}: {
  startsAt: number;
  className?: string;
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, startsAt - Date.now())
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, startsAt - Date.now()));
    }, 100);
    return () => window.clearInterval(id);
  }, [startsAt]);
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3
                  text-emerald-900 font-bold text-center text-base ${className ?? ""}`}
    >
      New game starts in{" "}
      <span className="text-emerald-700 font-mono tabular-nums text-lg">
        {seconds}s
      </span>
    </div>
  );
}

function PendingResponseAvatars({
  players,
  rematch,
}: {
  players: Player[];
  rematch: { responses: Record<string, "pending" | "accept" | "decline"> };
}) {
  const entries = players.filter((p) => rematch.responses[p.id] !== undefined);
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {entries.map((p) => {
        const r = rematch.responses[p.id];
        const dot =
          r === "accept" ? "bg-emerald-500"
          : r === "decline" ? "bg-rose-500"
          : "bg-amber-400 animate-pulse";
        return (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-300"
            title={`${p.name} — ${r}`}
          >
            <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden />
            {p.name}
          </span>
        );
      })}
    </div>
  );
}

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
