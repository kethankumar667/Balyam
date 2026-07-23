import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GamePageShell, NotebookSurface, ScorecardTable, type ScorecardRow } from "../components";
import { deriveStandings } from "../careerStats";
import { getTeamRef } from "../data";
import { useHistoryStore } from "../historyStore";

/**
 * Standings — a per-team win/loss/tie record across every match that team
 * has appeared in. Not a personal record against an opponent (there is no
 * fixed "your team" — see careerStats.ts); this is the honest analogue of a
 * league table for a single-player game.
 */
export function StandingsPage() {
  const navigate = useNavigate();
  const matches = useHistoryStore((s) => s.matches);
  const standings = useMemo(() => deriveStandings(matches), [matches]);

  if (matches.length === 0) {
    return (
      <GamePageShell contentClassName="justify-center">
        <NotebookSurface withSpiral className="px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No standings yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play matches with different teams to build a table.</p>
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

  const rows: ScorecardRow[] = standings.map((s) => {
    const team = getTeamRef(s.teamId);
    return {
      id: s.teamId,
      cells: {
        team: (
          <span className="flex items-center gap-1.5">
            <span aria-hidden>{team.flag ?? team.short}</span>
            <span className="font-semibold">{team.short}</span>
          </span>
        ),
        p: s.played,
        w: s.won,
        l: s.lost,
        t: s.tied,
        pct: `${s.winPct.toFixed(0)}%`,
      },
    };
  });

  return (
    <GamePageShell
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate("/cricket/profile")}
            className="rounded-2xl border-2 border-[#E4D3AC] bg-[#FFFBF0] py-3 text-sm font-black text-[#6D4323] active:scale-95"
          >
            Profile
          </button>
          <button type="button" onClick={() => navigate("/")} className="rounded-2xl bg-[#2E7D32] py-3 text-sm font-black text-white active:scale-95">
            Home
          </button>
        </div>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <h1 className="text-center font-display text-2xl text-[#3A2210]">Standings</h1>
        <p className="mt-1 text-center text-xs text-[#6D4323]/60">Per-team record across every match played</p>
        <div className="mt-4">
          <ScorecardTable
            caption="Team standings"
            columns={[
              { key: "team", label: "Team", grow: true },
              { key: "p", label: "P", numeric: true },
              { key: "w", label: "W", numeric: true },
              { key: "l", label: "L", numeric: true },
              { key: "t", label: "T", numeric: true },
              { key: "pct", label: "Win%", numeric: true },
            ]}
            rows={rows}
          />
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default StandingsPage;
