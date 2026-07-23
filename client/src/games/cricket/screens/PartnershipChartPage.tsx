import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, PremiumCard } from "../components";
import { partnershipBreakdown } from "../derive";
import { useReviewedInnings } from "../store"

/**
 * Partnership Chart — a timeline of each stand, showing exactly how much of
 * the partnership each batter personally contributed as a stacked bar. Fully
 * derived from the real ball log (same segmentation as the Scorecard's
 * Partnership tab, split per player here).
 */
export function PartnershipChartPage() {
  const navigate = useNavigate();
  const innings = useReviewedInnings();
  const rows = useMemo(() => (innings ? partnershipBreakdown(innings) : []), [innings]);

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
      <NotebookSurface withSpiral className="my-2 px-4 py-5">
        <h1 className="font-display text-2xl text-[#3A2210]">Partnerships</h1>
        <p className="mt-1 text-sm text-[#6D4323]/80">Who contributed what in each stand.</p>

        {!innings || rows.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[#6D4323]/70">
            {innings ? "No completed partnerships yet." : "Play a match to see partnerships."}
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {rows.map((r) => {
              const max = Math.max(1, r.totalRuns);
              const aPct = Math.round((r.a.runs / max) * 100);
              const bPct = Math.round((r.b.runs / max) * 100);
              return (
                <li key={r.index}>
                  <PremiumCard className="px-3.5 py-3">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[#9A6E1A]">
                      <span>Wicket {r.index} stand</span>
                      <span className="tabular-nums text-[#3A2210]">
                        {r.totalRuns} ({r.balls})
                      </span>
                    </div>
                    <div className="mt-2 flex h-6 w-full overflow-hidden rounded-full border border-[#E4D3AC] bg-[#F3E6C6]" role="img" aria-label={`${r.a.name} ${r.a.runs} runs, ${r.b.name} ${r.b.runs} runs`}>
                      <div className="flex items-center justify-center bg-[#1D63C4] text-[10px] font-bold text-white" style={{ width: `${aPct}%` }} />
                      <div className="flex items-center justify-center bg-[#2E7D32] text-[10px] font-bold text-white" style={{ width: `${bPct}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-[#1D63C4]">
                        <span aria-hidden className="h-2 w-2 rounded-full bg-[#1D63C4]" />
                        {r.a.name} · {r.a.runs}
                      </span>
                      <span className="flex items-center gap-1 text-[#2E7D32]">
                        <span aria-hidden className="h-2 w-2 rounded-full bg-[#2E7D32]" />
                        {r.b.name} · {r.b.runs}
                      </span>
                    </div>
                  </PremiumCard>
                </li>
              );
            })}
          </ul>
        )}
      </NotebookSurface>
    </GamePageShell>
  );
}

export default PartnershipChartPage;
