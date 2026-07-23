import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, StampBadge, TeamFlagCard } from "../components";
import { getTeamRef } from "../data";
import { buildMatchSummary } from "../matchSummary";
import { useCricketStore } from "../store";

/**
 * Player of the Match — the celebratory reveal right after the 2nd innings
 * ends. Computed honestly from real ball-by-ball data: since this engine has
 * no per-bowler attribution, the award goes to the match's highest run-scorer
 * (see matchSummary.ts) rather than a fabricated all-round rating.
 */
export function PlayerOfMatchPage() {
  const navigate = useNavigate();
  const first = useCricketStore((s) => s.firstInnings);
  const second = useCricketStore((s) => s.secondInnings);
  const startedAt = useCricketStore((s) => s.matchStartedAt);
  const endedAt = useCricketStore((s) => s.matchEndedAt);

  const summary = useMemo(() => {
    if (!first || !second) return null;
    return buildMatchSummary(first, second, startedAt ?? Date.now(), endedAt ?? Date.now());
  }, [first, second, startedAt, endedAt]);

  if (!first || !second || !summary || !summary.playerOfMatch) {
    return (
      <GamePageShell contentClassName="justify-center">
        <NotebookSurface withSpiral className="px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No match result yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a full match — both innings — to see the Player of the Match.</p>
          <button
            type="button"
            onClick={() => navigate("/cricket")}
            className="mt-5 w-full rounded-2xl bg-[#2E7D32] py-3 font-black text-white active:scale-95"
          >
            Play a match
          </button>
        </NotebookSurface>
      </GamePageShell>
    );
  }

  const mvp = summary.playerOfMatch;
  const team = getTeamRef(mvp.teamId);
  const strikeRate = mvp.balls > 0 ? ((mvp.runs / mvp.balls) * 100).toFixed(1) : "0.0";

  return (
    <GamePageShell
      footer={
        <button
          type="button"
          onClick={() => navigate("/cricket/match-result")}
          className="w-full rounded-2xl bg-[#2E7D32] py-3.5 text-base font-black text-white shadow-md transition active:scale-95"
        >
          See the result
        </button>
      }
    >
      <NotebookSurface withSpiral className="my-2 px-5 py-8 text-center">
        <p className="ck-anim-fade-up text-[11px] font-bold uppercase tracking-[0.25em] text-[#9A6E1A]">Bhalyam Cricket</p>
        <div className="ck-anim-stamp mt-3 flex justify-center">
          <StampBadge label="Player of the Match" tone="gold" />
        </div>

        <div className="ck-anim-fade-up mt-6 flex justify-center" style={{ animationDelay: "0.15s" }}>
          <TeamFlagCard team={team} size="md" />
        </div>

        <h1 className="ck-anim-fade-up mt-4 font-display text-3xl text-[#3A2210]" style={{ animationDelay: "0.25s" }}>
          {mvp.playerName}
        </h1>

        <p className="ck-anim-fade-up mt-2 font-display text-5xl text-[#2E7D32]" style={{ animationDelay: "0.35s" }}>
          {mvp.runs}
          <span className="ml-1 text-2xl text-[#6D4323]/70">({mvp.balls})</span>
        </p>
        <p className="ck-anim-fade-up mt-1 text-sm font-semibold text-[#6D4323]/80" style={{ animationDelay: "0.4s" }}>
          Strike rate {strikeRate}
        </p>

        <p className="ck-anim-fade-up mt-6 text-xs text-[#6D4323]/60" style={{ animationDelay: "0.5s" }}>
          Top run-scorer across both innings — this game tracks no bowling figures, so the award is honestly batting-only.
        </p>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default PlayerOfMatchPage;
