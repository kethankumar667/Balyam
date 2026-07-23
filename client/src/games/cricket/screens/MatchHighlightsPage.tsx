import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface } from "../components";
import { highlightEvents, type HighlightEvent } from "../derive";
import { getTeamRef } from "../data";
import { useCricketStore } from "../store";
import type { InningsState } from "../innings";

const KIND_STYLE: Record<HighlightEvent["kind"], { glyph: string; className: string }> = {
  six: { glyph: "🚀", className: "bg-[#2E7D32] text-white" },
  four: { glyph: "⚡", className: "bg-[#1D63C4] text-white" },
  wicket: { glyph: "❌", className: "bg-[#C0392B] text-white" },
  fifty: { glyph: "🎉", className: "bg-[#E4B128] text-[#3A2210]" },
  century: { glyph: "🏆", className: "bg-[#9A6E1A] text-white" },
};

function InningsHighlights({ label, innings }: { label: string; innings: InningsState }) {
  const events = useMemo(() => highlightEvents(innings), [innings]);
  if (events.length === 0) return null;
  return (
    <div>
      <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-[#9A6E1A]">{label}</p>
      <ol className="mt-2 space-y-1.5">
        {events.map((e) => {
          const style = KIND_STYLE[e.kind];
          return (
            <li key={`${label}-${e.index}`} className="flex items-center gap-2.5 rounded-xl border border-[#E4D3AC] bg-[#FFFBF0] px-2.5 py-1.5">
              <span className="w-9 flex-none text-[10px] font-bold tabular-nums text-[#6D4323]/60">{e.overBall}</span>
              <span aria-hidden className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs ${style.className}`}>
                {style.glyph}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#3A2210]">
                {e.batterName} <span className="font-normal text-[#6D4323]/70">— {e.detail}</span>
              </span>
              <span className="flex-none text-xs font-bold tabular-nums text-[#9A6E1A]">{e.runningScore}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Match Highlights — the notable real moments (sixes, fours, wickets, 50s,
 * 100s) from both innings, read straight from the ball log. Not a curated
 * "best of" edit — every moment that qualifies is listed, in order.
 */
export function MatchHighlightsPage() {
  const navigate = useNavigate();
  const first = useCricketStore((s) => s.firstInnings);
  const second = useCricketStore((s) => s.secondInnings);

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
        <h1 className="font-display text-2xl text-[#3A2210]">Match Highlights</h1>
        <p className="mt-1 text-sm text-[#6D4323]/80">Every six, four, wicket and milestone — in order.</p>

        {!first ? (
          <p className="mt-6 text-center text-sm text-[#6D4323]/70">Play a match to see the highlights.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <InningsHighlights label={`1st Innings · ${getTeamRef(first.xi[0].teamId).name}`} innings={first} />
            {second && <InningsHighlights label={`2nd Innings · ${getTeamRef(second.xi[0].teamId).name}`} innings={second} />}
          </div>
        )}
      </NotebookSurface>
    </GamePageShell>
  );
}

export default MatchHighlightsPage;
