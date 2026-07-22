import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "../../../lib/cn";
import { GamePageShell, NotebookSurface, SketchAccent, StickyNote } from "../components";
import { getTeamRef } from "../data";
import { useCricketStore } from "../store";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import type { TossDecision } from "../types";

/**
 * Toss Result — a spinning coin resolves to the winner, who then chooses to
 * Bat First or Bowl First. Selected state is explicit; Continue is disabled
 * until a decision is made. The coin is decorative — the winner and choice are
 * always in text.
 */
export function TossResultPage() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [params] = useSearchParams();
  const storedWinner = useCricketStore((s) => s.tossWinner);
  const homeTeamId = useCricketStore((s) => s.homeTeamId);
  const setTossDecision = useCricketStore((s) => s.setTossDecision);

  const [decision, setDecision] = useState<TossDecision | null>(null);
  const winner = getTeamRef(storedWinner ?? homeTeamId);
  const sum = params.get("sum");

  function chooseAndContinue() {
    if (!decision) return;
    setTossDecision(decision);
    navigate("/cricket/rules");
  }

  return (
    <GamePageShell
      contentClassName="justify-center"
      footer={
        <button
          type="button"
          onClick={chooseAndContinue}
          disabled={!decision}
          className={cn(
            "w-full rounded-2xl py-3.5 text-lg font-black text-white shadow-md transition active:scale-95",
            !decision ? "bg-[#9CA3AF] opacity-60 cursor-not-allowed" : "bg-[#2E7D32]",
          )}
        >
          {decision ? "Continue" : "Choose bat or bowl"}
        </button>
      }
    >
      <NotebookSurface withSpiral className="px-5 py-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#9A6E1A] bg-[#E4B128] text-[#3A2210] shadow-lg",
              !reduced && "ck-anim-coin",
            )}
          >
            <SketchAccent name="star" className="h-10 w-10 text-[#3A2210]" />
          </div>
        </div>

        <h1 className="mt-4 font-display text-2xl text-[#2E7D32]">{winner.name} won the toss!</h1>
        {sum && <p className="mt-1 text-sm text-[#6D4323]/70">Sum was {sum}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="Choose to bat or bowl first">
          <button
            type="button"
            onClick={() => setDecision("bat")}
            aria-pressed={decision === "bat"}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 transition active:scale-95",
              decision === "bat" ? "border-[#2E7D32] bg-[#2E7D32]/10 ring-2 ring-[#2E7D32]/40" : "border-[#E4D3AC] bg-[#FFFBF0]",
            )}
          >
            <SketchAccent name="bat" className="h-8 w-8 text-[#2E7D32]" />
            <span className="font-black text-[#3A2210]">Bat First</span>
          </button>
          <button
            type="button"
            onClick={() => setDecision("bowl")}
            aria-pressed={decision === "bowl"}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 transition active:scale-95",
              decision === "bowl" ? "border-[#C0392B] bg-[#C0392B]/10 ring-2 ring-[#C0392B]/40" : "border-[#E4D3AC] bg-[#FFFBF0]",
            )}
          >
            <SketchAccent name="ball" className="h-8 w-8 text-[#C0392B]" />
            <span className="font-black text-[#3A2210]">Bowl First</span>
          </button>
        </div>

        {decision && (
          <div className="mt-5 flex justify-center">
            <StickyNote tone="mint" rotate={-2}>
              <p className="text-sm font-semibold text-[#2E5E2E]">
                {winner.name} chose to {decision === "bat" ? "BAT FIRST" : "BOWL FIRST"}
              </p>
            </StickyNote>
          </div>
        )}
      </NotebookSurface>
    </GamePageShell>
  );
}

export default TossResultPage;
