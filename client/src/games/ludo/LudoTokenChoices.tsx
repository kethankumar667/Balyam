import { useId, useMemo } from "react";
import type { LudoState } from "@shared/types";
import type { LudoBoardModel } from "./useLudoBoard";
import { indexTokenStacks, stackKeyOf } from "./ludoStacks";

type ChoiceModel = Pick<LudoBoardModel,
  "selfId" | "rolling" | "inputBlocked" | "pendingAction" | "deadlineExpired" | "inspectingBoard" | "move" | "previewToken" | "clearTokenPreview"
>;

export function LudoTokenChoices({ state, m, isOnline }: {
  state: LudoState;
  m: ChoiceModel;
  isOnline: boolean;
}) {
  const helpId = useId();
  const arms = useMemo(() => ({ ...state.playerColors, ...state.playerArms }), [state.playerColors, state.playerArms]);
  const stacks = useMemo(() => indexTokenStacks(
    Object.entries(state.tokens).flatMap(([pid, list]) => list.map(token => ({ pid, token }))), arms,
  ), [state.tokens, arms]);
  const selfId = m.selfId;
  const tokens = selfId ? state.tokens[selfId] ?? [] : [];
  const choices = tokens.filter(token => state.movableTokenIds.includes(token.id));
  if (state.playerOrder.length < 5 || state.playerOrder.length > 8 ||
      state.phase !== "playing" || state.turnPhase !== "moving" || m.rolling ||
      !selfId || state.turnPlayerId !== selfId || choices.length === 0) return null;

  const unavailable = !isOnline || m.inputBlocked || m.inspectingBoard;
  const help = !isOnline ? "Reconnecting. Token moves are unavailable."
    : m.inspectingBoard ? "Disable the magnifier to move."
    : m.pendingAction ? "Waiting for the server."
    : m.deadlineExpired ? "Time is up. Waiting for the server."
    : "Or tap a token on the board.";
  return (
    <div role="group" aria-label="Choose a token" aria-describedby={helpId} className="w-full min-w-0 max-w-xs">
      <div className="mb-1 text-center text-xs font-bold text-[var(--ludo-card-text)]">
        Dice: {state.diceValue} · Choose a token
      </div>
      <div className="flex justify-center gap-2">
        {choices.map(token => {
          const number = Number(token.id.split("-")[1]) + 1;
          const key = stackKeyOf(token, arms[selfId] ?? "red");
          const group = key ? stacks.get(key) : undefined;
          const stacked = group !== undefined && group.length > 1;
          const ownNumbers = stacked ? tokens.filter(candidate => group.includes(candidate.id))
            .map(candidate => Number(candidate.id.split("-")[1]) + 1).sort((a, b) => a - b) : [];
          const descriptionId = `${helpId}-${token.id}`;
          return (
            <button
              key={token.id}
              type="button"
              aria-label={`Move token ${number}`}
              aria-describedby={stacked ? descriptionId : undefined}
              disabled={unavailable}
              onFocus={() => m.previewToken(token.id)}
              onBlur={m.clearTokenPreview}
              onMouseEnter={() => { if (!unavailable) m.previewToken(token.id); }}
              onMouseLeave={m.clearTokenPreview}
              onClick={() => { m.clearTokenPreview(); m.move(token.id); }}
              className="flex h-11 min-w-11 flex-1 flex-col items-center justify-center rounded-xl border-2 border-[var(--ludo-panel-border)] bg-[var(--ludo-panel-bg)] text-lg font-black leading-tight text-[var(--ludo-card-text)] shadow-sm disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              <span aria-hidden="true">{number}</span>
              {stacked && <>
                <span aria-hidden="true" className="text-[10px] font-semibold">Stack {group.length}</span>
                <span id={descriptionId} className="sr-only">
                  {group.length} tokens on this square. Your tokens: {ownNumbers.join(", ")}.
                </span>
              </>}
            </button>
          );
        })}
      </div>
      <p id={helpId} role="status" className="mt-1 text-center text-xs font-semibold text-[var(--ludo-card-text)]">{help}</p>
    </div>
  );
}
