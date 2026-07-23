import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookGraphCard, NotebookSurface, type GraphBar } from "../components";
import { runDistribution } from "../derive";
import { useReviewedInnings } from "../store"

/**
 * Run Distribution — how the innings' runs were made: dots, 1s, 2s, 4s, 6s and
 * wickets, as a labeled bar chart. Derived from the real ball log.
 */
export function RunDistributionPage() {
  const navigate = useNavigate();
  const innings = useReviewedInnings();
  const bars = useMemo<GraphBar[]>(() => {
    if (!innings) return [];
    return runDistribution(innings).map((b) => ({
      label: b.label,
      value: b.count,
      tone: b.label === "Wkts" ? "red" : b.label === "4s" || b.label === "6s" ? "green" : "neutral",
    }));
  }, [innings]);

  return (
    <GamePageShell
      footer={
        <button type="button" onClick={() => navigate("/cricket/scorecard")} className="w-full rounded-2xl bg-[#2E7D32] py-3.5 font-black text-white active:scale-95">
          Back to scorecard
        </button>
      }
    >
      {innings ? (
        <div className="my-2">
          <NotebookGraphCard title="Run Distribution" bars={bars} unit="balls" />
        </div>
      ) : (
        <NotebookSurface withSpiral className="my-2 px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No data yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a match to see run distribution.</p>
        </NotebookSurface>
      )}
    </GamePageShell>
  );
}

export default RunDistributionPage;
