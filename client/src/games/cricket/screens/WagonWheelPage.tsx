import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, SketchAccent } from "../components";
import { wagonPoints } from "../derive";
import { useReviewedInnings } from "../store"
import type { BallOutcome } from "../types";

function pointColor(outcome: BallOutcome): string {
  if (outcome === "W") return "#C0392B";
  if (outcome === "6" || outcome === "4") return "#2E7D32";
  if (outcome === "0") return "#9A8058";
  return "#1D63C4";
}

/**
 * Wagon Wheel — a notebook-sketch radial chart plotted from the real ball
 * log. Honesty note (also shown to the player): this hand-cricket engine has
 * no shot-direction/fielding data, so the angle here is a deterministic
 * even spread by bowling order, not a real "off side / leg side" claim.
 * Only distance-from-center (runs) and color (outcome) encode real data.
 */
export function WagonWheelPage() {
  const navigate = useNavigate();
  const innings = useReviewedInnings();
  const points = useMemo(() => (innings ? wagonPoints(innings) : []), [innings]);

  const CENTER = 50;
  const MAX_R = 45;

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
        <div className="flex items-center gap-2">
          <SketchAccent name="ball" className="h-7 w-7 text-[#6D4323]/60" />
          <h1 className="font-display text-2xl text-[#3A2210]">Wagon Wheel</h1>
        </div>

        {points.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[#6D4323]/70">
            {innings ? "No balls bowled yet." : "Play a match to see the wagon wheel."}
          </p>
        ) : (
          <>
            <svg viewBox="0 0 100 100" className="mx-auto mt-4 w-full max-w-[320px]" role="img" aria-label="Wagon wheel of every ball, plotted by distance from center for runs scored">
              {[15, 30, 45].map((r) => (
                <circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="#D9BE82" strokeWidth={0.4} strokeDasharray="1.5 1.5" />
              ))}
              <line x1={5} y1={CENTER} x2={95} y2={CENTER} stroke="#D9BE82" strokeWidth={0.4} />
              <line x1={CENTER} y1={5} x2={CENTER} y2={95} stroke="#D9BE82" strokeWidth={0.4} />
              <circle cx={CENTER} cy={CENTER} r={2} fill="#6D4323" />
              {points.map((p) => {
                const rad = (p.angleDeg * Math.PI) / 180;
                const r = (p.radiusPct / 100) * MAX_R;
                const x = CENTER + r * Math.cos(rad);
                const y = CENTER + r * Math.sin(rad);
                return (
                  <circle
                    key={p.id}
                    cx={x}
                    cy={y}
                    r={p.outcome === "W" ? 2.6 : 1.8}
                    fill={pointColor(p.outcome)}
                    opacity={0.88}
                  />
                );
              })}
            </svg>

            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-[#6D4323]">
              <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "#9A8058" }} /> Dot</span>
              <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "#1D63C4" }} /> 1s/2s/3s</span>
              <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "#2E7D32" }} /> Boundary</span>
              <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "#C0392B" }} /> Wicket</span>
            </div>

            <p className="mt-3 text-center text-[11px] text-[#6D4323]/60">
              Every ball plotted by bowling order around the wheel; distance from center shows runs scored.
              This game doesn&rsquo;t track real shot direction, so positions aren&rsquo;t field placements.
            </p>
          </>
        )}
      </NotebookSurface>
    </GamePageShell>
  );
}

export default WagonWheelPage;
