import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/cn";
import { GamePageShell, NotebookSurface, PremiumCard, StickyNote } from "../components";
import { getTeamRef } from "../data";
import { useCricketStore } from "../store";

/**
 * Toss Selection — both sides pick a number 1–6; the sum decides the toss
 * (odd → home, even → away), the classic school-ground method. You pick for
 * your team; the opponent's pick is revealed on toss.
 */
const NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export function TossSelectionPage() {
  const navigate = useNavigate();
  const homeTeamId = useCricketStore((s) => s.homeTeamId);
  const awayTeamId = useCricketStore((s) => s.awayTeamId);
  const setTossWinner = useCricketStore((s) => s.setTossWinner);

  const [myPick, setMyPick] = useState<number | null>(null);
  const home = getTeamRef(homeTeamId);
  const away = getTeamRef(awayTeamId);

  function doToss() {
    if (myPick == null) return;
    const oppPick = 1 + Math.floor(Math.random() * 6);
    const sum = myPick + oppPick;
    setTossWinner(sum % 2 === 1 ? homeTeamId : awayTeamId);
    navigate(`/cricket/toss-result?sum=${sum}`);
  }

  return (
    <GamePageShell
      contentClassName="justify-center"
      footer={
        <button
          type="button"
          onClick={doToss}
          disabled={myPick == null}
          className={cn(
            "w-full rounded-2xl py-3.5 text-lg font-black text-white shadow-md transition active:scale-95",
            myPick == null ? "bg-[#9CA3AF] opacity-60 cursor-not-allowed" : "bg-[#2E7D32]",
          )}
        >
          {myPick == null ? "Pick a number" : "Toss it!"}
        </button>
      }
    >
      <NotebookSurface withSpiral className="px-5 py-6">
        <div className="text-center">
          <h1 className="font-display text-3xl text-[#3A2210]">The Toss</h1>
          <p className="mt-1 text-sm text-[#6D4323]/80">Both sides pick a number 1–6.</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <PremiumCard className="px-3 py-4 text-center" raised>
            <p className="text-2xl" aria-hidden>{home.flag ?? home.short}</p>
            <p className="font-black text-[#3A2210]">{home.name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2E7D32]">Your pick</p>
            <p className="mt-1 font-display text-3xl text-[#3A2210]" aria-live="polite">{myPick ?? "–"}</p>
          </PremiumCard>
          <PremiumCard className="px-3 py-4 text-center">
            <p className="text-2xl" aria-hidden>{away.flag ?? away.short}</p>
            <p className="font-black text-[#3A2210]">{away.name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6D4323]/60">Hidden pick</p>
            <p className="mt-1 font-display text-3xl text-[#6D4323]/40">?</p>
          </PremiumCard>
        </div>

        <fieldset className="mt-5">
          <legend className="sr-only">Choose your number from 1 to 6</legend>
          <div className="grid grid-cols-6 gap-2">
            {NUMBERS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMyPick(n)}
                aria-pressed={myPick === n}
                aria-label={`Pick ${n}`}
                className={cn(
                  "flex min-h-[48px] items-center justify-center rounded-xl border-2 text-xl font-black tabular-nums transition active:scale-95",
                  myPick === n
                    ? "border-[#2E7D32] bg-[#2E7D32] text-white ring-2 ring-[#2E7D32]/40"
                    : "border-[#E4B128] bg-[#FFFBF0] text-[#6D4323]",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex justify-center">
          <StickyNote tone="amber" rotate={-2}>
            <p className="text-sm font-semibold text-[#6D4323]">Choose wisely — the sum decides the toss!</p>
          </StickyNote>
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default TossSelectionPage;
