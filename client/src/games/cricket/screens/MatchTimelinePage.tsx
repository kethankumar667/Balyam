import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface } from "../components";
import { timelineEntries } from "../derive";
import { useReviewedInnings } from "../store"
import type { BallOutcome } from "../types";

function pillClass(o: BallOutcome): string {
  if (o === "W") return "bg-[#C0392B] text-white";
  if (o === "6" || o === "4") return "bg-[#2E7D32] text-white";
  return "bg-[#F7E8C4] text-[#6D4323] border border-[#E4B128]";
}

/**
 * Match Timeline — the full ball-by-ball sequence with a running score, in a
 * compact scrollable list. A direct read of the real ball log.
 */
export function MatchTimelinePage() {
  const navigate = useNavigate();
  const innings = useReviewedInnings();
  const rows = useMemo(() => (innings ? timelineEntries(innings) : []), [innings]);

  return (
    <GamePageShell
      footer={
        <button
          type="button"
          onClick={() => navigate("/cricket/scorecard")}
          className="w-full rounded-2xl bg-[#2E7D32] py-3.5 font-black text-white active:scale-95"
        >
          Back to scorecard
        </button>
      }
    >
      <NotebookSurface withSpiral className="my-2 flex max-h-[80vh] flex-col px-4 py-5">
        <h1 className="flex-none font-display text-2xl text-[#3A2210]">Match Timeline</h1>
        <p className="flex-none mt-1 text-sm text-[#6D4323]/80">Every ball, in order.</p>

        {rows.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[#6D4323]/70">
            {innings ? "No balls bowled yet." : "Play a match to see the timeline."}
          </p>
        ) : (
          <ol className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {rows.map((r) => (
              <li
                key={r.index}
                className="flex items-center gap-2.5 rounded-xl border border-[#E4D3AC] bg-[#FFFBF0] px-2.5 py-1.5"
              >
                <span className="w-9 flex-none text-[10px] font-bold tabular-nums text-[#6D4323]/60">{r.overBall}</span>
                <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-black tabular-nums ${pillClass(r.outcome)}`}>
                  {r.outcome}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#3A2210]">{r.batterName}</span>
                <span className="flex-none text-xs font-bold tabular-nums text-[#9A6E1A]">{r.runningScore}</span>
              </li>
            ))}
          </ol>
        )}
      </NotebookSurface>
    </GamePageShell>
  );
}

export default MatchTimelinePage;
