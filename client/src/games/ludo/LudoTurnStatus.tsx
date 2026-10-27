import type { LudoState } from "@shared/types";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { useRecovery } from "../../core/recovery/useRecovery";
import type { LudoBoardModel } from "./useLudoBoard";

type StatusModel = Pick<LudoBoardModel, "selfId" | "rolling" | "pendingAction" |
  "actionStalled" | "deadlineExpired" | "inspectingBoard" | "nameOf">;
type StatusState = Pick<LudoState, "phase" | "turnPlayerId" | "turnPhase" | "turnDeadline" | "lastEvent">;

export function LudoTurnStatus({ m, state }: { m: StatusModel; state: StatusState }) {
  const { isOnline, isFailed, retryRecovery } = useRecovery();
  const seconds = useTurnSecondsLeft(state.turnDeadline);
  const finished = state.phase === "finished";
  const mine = state.turnPlayerId === m.selfId;
  const title = finished ? "Match finished" : !isOnline ? isFailed ? "Connection lost" : "Reconnecting"
    : m.pendingAction ? "Sending your action" : m.rolling ? "Dice rolling"
    : mine ? "Your turn" : `Waiting for ${m.nameOf(state.turnPlayerId)}`;
  const detail = finished ? "This match is over." : !isOnline ? "Restore connection before playing."
    : m.actionStalled ? "Waiting for server confirmation."
    : m.pendingAction ? "Waiting for the server."
    : m.deadlineExpired ? "Time is up. Waiting for the server."
    : m.inspectingBoard ? "Inspect only. Disable the magnifier to play."
    : m.rolling ? "Watch the dice settle."
    : mine ? state.turnPhase === "rolling" ? "Roll the dice." : "Choose a token to move."
    : state.turnPhase === "rolling" ? "Their roll is next." : "They are choosing a token.";
  const event = state.lastEvent;
  const outcome = event?.byPlayerId && !m.rolling && (event.kind === "noMove" || event.kind === "forfeit")
    ? `Last outcome: ${m.nameOf(event.byPlayerId)} ${event.kind === "noMove"
      ? "had no legal move; turn passed." : "rolled three sixes; turn forfeited."}` : null;
  return (
    <div className="w-full min-w-0 rounded-xl border-2 border-[var(--ludo-panel-border)] bg-[var(--ludo-panel-bg)] px-2 py-1 text-[var(--ludo-card-text)]">
      <div className="flex items-center gap-2">
        <div role="status" aria-label="Ludo turn status" aria-atomic="true" className="min-w-0 flex-1 text-xs leading-tight">
          <p className="break-words font-black">{title}</p>
          <p className="break-words font-semibold">{detail}</p>
        </div>
        {!finished && isOnline && state.turnDeadline !== null && (
          <span role="timer" aria-live="off" aria-label={`${seconds} seconds left in the current turn`}
            className={`shrink-0 rounded-lg px-2 py-1 text-sm font-black tabular-nums ${seconds <= 5 ? "bg-red-700 text-white" : "bg-slate-950 text-white"}`}>
            {seconds}s
          </span>
        )}
      </div>
      {outcome && <p className="mt-1 break-words text-xs font-semibold">{outcome}</p>}
      {!finished && (isFailed || m.actionStalled) && (
        <button type="button" onClick={retryRecovery}
          className="mt-1 min-h-11 rounded-lg border-2 border-current px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
          Restore room
        </button>
      )}
    </div>
  );
}
