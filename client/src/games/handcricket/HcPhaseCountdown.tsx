import type { HcState } from "@shared/types";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";

export function HcPhaseCountdown({ state }: { state: HcState }) {
  const isPreMatch = state.phase === "teamSelect" || state.phase === "tossCall" || state.phase === "toss" || state.phase === "tossChoice";
  const secondsLeft = useTurnSecondsLeft(isPreMatch ? state.turnDeadline : null);
  if (!isPreMatch || state.turnDeadline == null || secondsLeft <= 0) return null;

  const label = state.phase === "teamSelect" ? "Confirm playing XI" : "Toss decision";
  return (
    <div
      className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-amber-300/80 bg-stone-950/90 px-3 py-1.5 text-sm font-black text-amber-100 shadow-xl backdrop-blur-md"
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${secondsLeft} seconds remaining`}
    >
      <span aria-hidden="true">⏱</span>
      <span>{label}</span>
      <span className="tabular-nums text-amber-300">{secondsLeft}s</span>
    </div>
  );
}