import { useEffect, useState } from "react";
import type { HcState } from "@shared/types";
import { getSocket } from "../../lib/socket";

export interface HcInningsBreakCountdown {
  /** False when there's no break running — callers should render nothing. */
  active: boolean;
  secondsLeft: number;
  /** Has THIS player already pressed Continue. */
  iAmReady: boolean;
  /** Names of players still to press Continue (self excluded). */
  waitingOn: string[];
  continueInnings: () => void;
}

/**
 * The innings-break countdown/continue logic, lifted out of presentation.
 *
 * Extracted from the old (broadcast-only) InningsBreakOverlay.tsx so every
 * theme's own break overlay shares one source of truth for "how long is
 * left" and "who hasn't continued yet" instead of three copies drifting
 * apart. See that file's history: the server holds play for
 * HC_INNINGS_BREAK_MS so the scoreboard doesn't swap innings mid-glance —
 * this hook is the client half that makes the hold legible.
 */
export function useInningsBreakCountdown(
  state: HcState,
  players: { id: string; name: string }[],
  selfId: string,
): HcInningsBreakCountdown {
  const until = state.inningsBreakUntil;

  // Local ticker: the deadline is a server timestamp, and nothing else
  // re-renders this hook's caller while the break runs.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [until]);

  if (until == null) {
    return { active: false, secondsLeft: 0, iAmReady: false, waitingOn: [], continueInnings: () => {} };
  }

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));

  // Close on the deadline without waiting for the server to say so — it
  // clears `inningsBreakUntil` lazily, on the next move that consults it, so
  // with nobody acting the flag stays set and the overlay would otherwise
  // sit on screen reading "0s" indefinitely.
  if (secondsLeft <= 0) {
    return { active: false, secondsLeft: 0, iAmReady: false, waitingOn: [], continueInnings: () => {} };
  }

  const ready = new Set(state.inningsBreakReady ?? []);
  const iAmReady = ready.has(selfId);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Player";
  // Named, not a spinner: "waiting for Ravi" is something a player can act
  // on. Self is excluded — you already know whether you pressed Continue.
  const waitingOn = state.playerOrder.filter((id) => !ready.has(id) && id !== selfId).map(nameOf);

  return {
    active: true,
    secondsLeft,
    iAmReady,
    waitingOn,
    continueInnings: () => getSocket().emit("game:move", { type: "continueInnings" }),
  };
}
