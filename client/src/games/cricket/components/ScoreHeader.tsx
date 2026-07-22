import { cn } from "../../../lib/cn";
import type { MatchScore, TeamRef } from "../types";
import { StatPill } from "./StatPill";

/**
 * The gameplay top bar: batting team, big score/wickets, overs, target and run
 * rate. Data-first and high-contrast so it stays readable during fast play.
 */
export interface ScoreHeaderProps {
  battingTeam: TeamRef;
  score: MatchScore;
  className?: string;
}

function formatOvers(score: MatchScore): string {
  return `${score.overs}.${score.balls}`;
}

export function ScoreHeader({ battingTeam, score, className }: ScoreHeaderProps) {
  return (
    <header
      className={cn(
        "rounded-2xl border border-[#E4D3AC] bg-[#FFFBF0] px-4 py-3 shadow-[0_6px_16px_-10px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {battingTeam.flag ? (
            <span className="text-2xl leading-none" aria-hidden>{battingTeam.flag}</span>
          ) : (
            <span
              className="rounded-md px-1.5 py-0.5 text-xs font-black text-white"
              style={{ backgroundColor: battingTeam.color }}
              aria-hidden
            >
              {battingTeam.short}
            </span>
          )}
          <span className="truncate font-black text-lg" style={{ color: battingTeam.color }}>
            {battingTeam.short}
          </span>
        </div>
        <div className="text-right">
          <div className="font-black tabular-nums text-3xl leading-none text-[#3A2210]">
            {score.runs}
            <span className="text-xl">/{score.wickets}</span>
          </div>
          <div className="text-[11px] font-semibold text-[#6D4323]/70">{formatOvers(score)} overs</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatPill label="Run rate" value={score.runRate.toFixed(2)} />
        <StatPill label="Overs" value={formatOvers(score)} />
        <StatPill
          label={score.target != null ? "Target" : "Score"}
          value={score.target != null ? score.target : score.runs}
          tone="gold"
        />
      </div>
    </header>
  );
}
