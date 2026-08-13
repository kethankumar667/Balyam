import { useEffect, useState } from "react";
import type { HcState, Player } from "@shared/types";
import { getSocket } from "../../lib/socket";
import { HcProScorecard } from "./hc-broadcast";

/**
 * The innings break.
 *
 * The first innings used to end and the second BEGIN in the same tick — the
 * scoreboard swapped mid-glance and the next ball was already legal, which
 * players reported as innings 2 "starting continuously".
 *
 * The server now holds play for HC_INNINGS_BREAK_MS. This is the half that
 * makes that hold make sense: without it the board simply refuses input for
 * ten seconds with no explanation, which is a different confusing behaviour
 * rather than a fixed one.
 *
 * Ends on whichever comes first — everyone pressing Continue, or the clock.
 * One player can hold the restart while they read; nobody can freeze it.
 */
export default function InningsBreakOverlay({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const until = state.inningsBreakUntil;

  // Local ticker: the deadline is a server timestamp, and nothing else
  // re-renders this component while the break runs.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [until]);

  if (until == null) return null;

  const innings1 = state.innings1;
  if (!innings1) return null;

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));

  /**
   * Close on the deadline without waiting for the server to say so.
   *
   * The engine clears `inningsBreakUntil` lazily — on the next move that
   * consults it — so with nobody acting, the flag stayed set and this overlay
   * sat on screen reading "Innings 2 starts in 0s" indefinitely. Once the
   * deadline passes the break is over for everyone regardless of who pressed
   * Continue, and the next move settles it server-side, so hiding here is
   * safe and matches what the player was just told.
   */
  if (secondsLeft <= 0) return null;

  const ready = new Set(state.inningsBreakReady ?? []);
  const iAmReady = ready.has(selfId);

  const nameOf = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Player";

  // Named, not a spinner: "waiting for Ravi" is something a player can act
  // on. Self is excluded — you already know whether you pressed Continue.
  const waitingOn = state.playerOrder
    .filter((id) => !ready.has(id) && id !== selfId)
    .map(nameOf);

  const target = innings1.runs + 1;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Innings break"
    >
      <div className="my-auto w-full max-w-2xl space-y-3">
        <header className="text-center">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400/80">
            End of innings 1
          </div>
          {/* The target is the one number that decides how innings 2 is
              played, so it gets the size rather than the total. */}
          <div className="mt-1 text-2xl font-black text-white">
            Target {target}
          </div>
          <div className="text-sm font-bold text-white/70">
            {nameOf(innings1.battingPlayerId)} made {innings1.runs}/
            {innings1.wickets}
          </div>
        </header>

        {/*
          `HcProScorecard` with innings1 passed explicitly — NOT `HcProInnings`.
          `endCurrentInnings` sets phase to "innings2" before the break opens,
          so anything that renders "the current innings" shows the empty innings
          2 panel and its bowler picker. That is what was appearing under an
          "End of innings 1" heading: a live 0/0 card for the innings that has
          not started.
        */}
        <HcProScorecard state={state} innings={innings1} players={players} />

        <div className="sticky bottom-0 space-y-2 rounded-xl bg-slate-900/95 p-3">
          <button
            type="button"
            disabled={iAmReady}
            onClick={() => getSocket().emit("game:move", { type: "continueInnings" })}
            /* The disabled state still has to READ — it is the "Waiting…"
               label the holdout's opponent stares at. slate-400 on slate-700
               measured ~3:1; slate-200 clears the 4.5:1 floor. */
            className="w-full rounded-xl px-4 py-3 text-base font-black transition-transform active:scale-95 disabled:cursor-default bg-amber-400 text-slate-900 disabled:bg-slate-700 disabled:text-slate-200"
          >
            {iAmReady ? "Waiting…" : "Continue"}
          </button>

          {/* Tinted from the panel's own slate rather than translucent white,
              which greys out against it. */}
          <p className="text-center text-xs font-bold text-slate-300" aria-live="polite">
            {iAmReady && waitingOn.length > 0
              ? `Waiting for ${waitingOn.join(", ")}`
              : `Innings 2 starts in ${secondsLeft}s`}
          </p>
        </div>
      </div>
    </div>
  );
}
