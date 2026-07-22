import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookGraphCard, NotebookSurface, PremiumCard, type GraphBar } from "../components";
import { manhattan } from "../derive";
import { useCricketStore } from "../store";

/**
 * Manhattan Chart — runs scored per over as a bar chart, with wicket overs
 * flagged. Derived from the real over-by-over log.
 */
export function ManhattanChartPage() {
  const navigate = useNavigate();
  const innings = useCricketStore((s) => s.lastInnings);
  const overs = useMemo(() => (innings ? manhattan(innings) : []), [innings]);
  const bars = useMemo<GraphBar[]>(
    () => overs.map((o) => ({ label: `${o.over}`, value: o.runs, tone: o.wickets > 0 ? "red" : "gold" })),
    [overs],
  );
  const wicketOvers = overs.filter((o) => o.wickets > 0).map((o) => o.over);

  return (
    <GamePageShell
      footer={
        <button type="button" onClick={() => navigate("/cricket/scorecard")} className="w-full rounded-2xl bg-[#2E7D32] py-3.5 font-black text-white active:scale-95">
          Back to scorecard
        </button>
      }
    >
      {innings ? (
        <div className="my-2 space-y-3">
          <NotebookGraphCard title="Manhattan (runs per over)" bars={bars} unit="runs" />
          <PremiumCard className="px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">Wicket overs</p>
            <p className="mt-1 text-sm text-[#6D4323]/85">
              {wicketOvers.length > 0 ? wicketOvers.map((o) => `Over ${o}`).join(", ") : "No wickets fell this innings."}
            </p>
          </PremiumCard>
        </div>
      ) : (
        <NotebookSurface withSpiral className="my-2 px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No data yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a match to see the Manhattan chart.</p>
        </NotebookSurface>
      )}
    </GamePageShell>
  );
}

export default ManhattanChartPage;
