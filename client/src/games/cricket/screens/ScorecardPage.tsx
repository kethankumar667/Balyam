import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GamePageShell,
  GameTabs,
  NotebookSurface,
  PremiumCard,
  ScorecardTable,
  type ScorecardRow,
} from "../components";
import { battingRows, fallOfWickets, partnerships } from "../derive";
import { getTeamRef } from "../data";
import { useCricketStore } from "../store";

type Tab = "batting" | "fow" | "partnership";
const TABS = [
  { id: "batting" as const, label: "Batting" },
  { id: "fow" as const, label: "Fall of Wkts" },
  { id: "partnership" as const, label: "Partnership" },
];

/**
 * Scorecard — a Cricbuzz-style tabbed card driven entirely by the last played
 * innings (real ball log). Semantic tables, mobile-readable. No bowling tab:
 * the hand-cricket model has no per-bowler attribution, so it is honestly
 * omitted rather than faked.
 */
export function ScorecardPage() {
  const navigate = useNavigate();
  const firstInnings = useCricketStore((s) => s.firstInnings);
  const secondInnings = useCricketStore((s) => s.secondInnings);
  const reviewInningsNo = useCricketStore((s) => s.reviewInningsNo);
  const setReviewInningsNo = useCricketStore((s) => s.setReviewInningsNo);
  const innings = reviewInningsNo === 2 && secondInnings ? secondInnings : firstInnings;
  const hasBothInnings = firstInnings != null && secondInnings != null;
  const [tab, setTab] = useState<Tab>("batting");

  const bat = useMemo(() => (innings ? battingRows(innings) : []), [innings]);
  const fow = useMemo(() => (innings ? fallOfWickets(innings) : []), [innings]);
  const pships = useMemo(() => (innings ? partnerships(innings) : []), [innings]);

  if (!innings) {
    return (
      <GamePageShell contentClassName="justify-center">
        <NotebookSurface withSpiral className="px-5 py-10 text-center">
          <h1 className="font-display text-2xl text-[#3A2210]">No scorecard yet</h1>
          <p className="mt-2 text-sm text-[#6D4323]/80">Play a match to see the scorecard.</p>
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

  const team = getTeamRef(innings.xi[0].teamId);
  const didNotBat = bat.filter((r) => !r.batted).map((r) => r.player.name);

  const battingTableRows: ScorecardRow[] = bat
    .filter((r) => r.batted)
    .map((r) => ({
      id: r.player.id,
      cells: {
        batter: (
          <span className="flex items-center gap-1.5">
            <span className="font-semibold">{r.player.name}</span>
            {r.player.isCaptain && <span className="rounded bg-[#E4B128] px-1 text-[9px] font-black text-[#3A2210]">C</span>}
            {r.notOut && <span className="text-[#2E7D32]" title="not out">*</span>}
          </span>
        ),
        r: r.runs,
        b: r.balls,
        f: r.fours,
        s: r.sixes,
        sr: r.strikeRate.toFixed(1),
      },
    }));

  battingTableRows.push({
    id: "total",
    highlight: true,
    cells: {
      batter: "Total",
      r: innings.runs,
      b: "",
      f: "",
      s: "",
      sr: `${innings.wickets} wkts`,
    },
  });

  return (
    <GamePageShell
      footer={
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { label: "Run Dist.", to: "/cricket/run-distribution" },
              { label: "Manhattan", to: "/cricket/manhattan" },
              { label: "Partnerships", to: "/cricket/partnership-chart" },
              { label: "Timeline", to: "/cricket/timeline" },
              { label: "Wagon Wheel", to: "/cricket/wagon-wheel" },
              { label: "Highlights", to: "/cricket/highlights" },
            ].map((link) => (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className="flex-none rounded-full border-2 border-[#E4D3AC] bg-[#FFFBF0] px-4 py-2 text-xs font-black text-[#6D4323] active:scale-95"
              >
                {link.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => navigate("/")} className="w-full rounded-2xl bg-[#2E7D32] py-2.5 text-sm font-black text-white active:scale-95">
            Home
          </button>
        </div>
      }
    >
      <NotebookSurface className="my-2 px-4 py-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>{team.flag ?? team.short}</span>
            <h1 className="font-display text-2xl text-[#3A2210]">{team.name}</h1>
          </div>
          <p className="font-black tabular-nums text-2xl text-[#3A2210]">
            {innings.runs}/{innings.wickets}
            <span className="ml-1 text-sm font-semibold text-[#6D4323]/70">({innings.oversCompleted}.{innings.ballInOver})</span>
          </p>
        </header>

        {hasBothInnings && (
          <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Select innings">
            {[1, 2].map((no) => (
              <button
                key={no}
                type="button"
                role="tab"
                aria-selected={reviewInningsNo === no}
                onClick={() => setReviewInningsNo(no as 1 | 2)}
                className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
                  reviewInningsNo === no ? "bg-[#2E7D32] text-white" : "border-2 border-[#E4D3AC] bg-[#FFFBF0] text-[#6D4323]"
                }`}
              >
                {no === 1 ? "1st Innings" : "2nd Innings"}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <GameTabs ariaLabel="Scorecard view" tabs={TABS} value={tab} onChange={setTab} />
        </div>

        <div className="mt-4">
          {tab === "batting" && (
            <>
              <ScorecardTable
                caption="Batting scorecard"
                columns={[
                  { key: "batter", label: "Batter", grow: true },
                  { key: "r", label: "R", numeric: true },
                  { key: "b", label: "B", numeric: true },
                  { key: "f", label: "4s", numeric: true },
                  { key: "s", label: "6s", numeric: true },
                  { key: "sr", label: "SR", numeric: true },
                ]}
                rows={battingTableRows}
              />
              {didNotBat.length > 0 && (
                <PremiumCard className="mt-3 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E1A]">Did not bat</p>
                  <p className="mt-0.5 text-sm text-[#6D4323]/80">{didNotBat.join(", ")}</p>
                </PremiumCard>
              )}
            </>
          )}

          {tab === "fow" && (
            <ScorecardTable
              caption="Fall of wickets"
              columns={[
                { key: "w", label: "Wkt", numeric: true },
                { key: "score", label: "Score", grow: true },
                { key: "batter", label: "Batter" },
                { key: "over", label: "Over", numeric: true },
              ]}
              rows={
                fow.length > 0
                  ? fow.map((f) => ({ id: `w${f.wicket}`, cells: { w: f.wicket, score: f.score, batter: f.batterName, over: f.over } }))
                  : [{ id: "none", muted: true, cells: { w: "–", score: "No wickets fell", batter: "", over: "" } }]
              }
            />
          )}

          {tab === "partnership" && (
            <ScorecardTable
              caption="Partnerships"
              columns={[
                { key: "i", label: "#", numeric: true },
                { key: "names", label: "Batters", grow: true },
                { key: "r", label: "Runs", numeric: true },
                { key: "b", label: "Balls", numeric: true },
              ]}
              rows={
                pships.length > 0
                  ? pships.map((p) => ({ id: `p${p.index}`, cells: { i: p.index, names: p.names, r: p.runs, b: p.balls } }))
                  : [{ id: "none", muted: true, cells: { i: "–", names: "No partnerships yet", r: "", b: "" } }]
              }
            />
          )}
        </div>
      </NotebookSurface>
    </GamePageShell>
  );
}

export default ScorecardPage;
