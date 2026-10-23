import { useId } from "react";
import { Trophy, Flag, Gamepad2, Star, ArrowUpRight, Target } from "lucide-react";
import { formatRecordScore, recordDate, recordValue, type RecordGame, type RecordMode, type recordSummary } from "./records";

const PANEL = "rounded-2xl border border-[var(--chrome-hairline)] bg-surface-1 shadow-sm";

export function RecordHistory({ game, mode }: { game: RecordGame; mode: RecordMode }) {
  const gradient = useId();
  const scores = mode.recentScores;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  const points = scores.map((score, index) => ({
    x: scores.length === 1 ? 280 : 40 + index / (scores.length - 1) * 480,
    y: 130 - (score - min) / span * 92,
    score,
  }));
  const format = (score: number) => formatRecordScore(game, mode, score);
  return (
    <section className={`${PANEL} p-4`} aria-labelledby="records-history-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="records-history-title" className="font-display text-lg">Performance history — {mode.displayName}</h2>
        <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-ink-hi">Last {scores.length || 5} recorded results</span>
      </div>
      <p className="mt-1 text-xs text-ink-mid">{mode.scoringDirection === "LOWER_IS_BETTER" ? "Lower is better." : "Higher is better."} Oldest to newest; match dates are not stored.</p>
      {!scores.length ? <p className="py-10 text-center text-sm text-ink-mid">No recorded results for this mode yet.</p> : (
        <>
          <svg role="img" aria-label={`Last ${scores.length} recorded results for ${game.label}, ${mode.displayName}`} viewBox="0 0 560 170" className="mt-3 w-full text-violet-600 dark:text-violet-400">
            <title>{scores.map(format).join(", ")}</title>
            <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.2" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            {[38, 84, 130].map((y) => <line key={y} x1="25" x2="535" y1={y} y2={y} className="stroke-current opacity-10" />)}
            {points.length > 1 && <><polygon points={`40,145 ${points.map((point) => `${point.x},${point.y}`).join(" ")} 520,145`} fill={`url(#${gradient})`} /><polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" /></>}
            {points.map((point, index) => <g key={index}><circle cx={point.x} cy={point.y} r="4" fill="currentColor" /><text x={point.x} y={point.y - 12} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="700">{format(point.score)}</text><text x={point.x} y="164" textAnchor="middle" className="fill-ink-mid" fontSize="10">#{index + 1}</text></g>)}
          </svg>
          <details className="mt-2 text-xs text-ink-mid"><summary className="min-h-[44px] cursor-pointer py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500">View results as a table</summary><table className="w-full text-left"><caption className="sr-only">Recorded results, oldest first</caption><thead><tr><th className="p-2">Result</th><th className="p-2">{mode.unit}</th></tr></thead><tbody>{scores.map((score, index) => <tr key={index}><th className="p-2 font-normal">#{index + 1}</th><td className="p-2">{format(score)}</td></tr>)}</tbody></table></details>
        </>
      )}
    </section>
  );
}

export function RecordJourney({ games, summary, onSelect }: {
  games: RecordGame[];
  summary: ReturnType<typeof recordSummary>;
  onSelect: (game: RecordGame, mode: RecordMode) => void;
}) {
  const recent = games.flatMap((game) => game.modes.filter((mode) => mode.best !== null && mode.achievedAt).map((mode) => ({ game, mode })))
    .sort((a, b) => (b.mode.achievedAt ?? 0) - (a.mode.achievedAt ?? 0)).slice(0, 5);
  return (
    <aside className="min-w-0 space-y-4" aria-label="Your record journey">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-5"><p className="font-script text-2xl text-amber-800 dark:text-amber-200">Small moves.<br />Big memories.</p></div>
      <section className={`${PANEL} overflow-hidden`}>
        <div className="relative overflow-hidden bg-emerald-500/10 p-4">
          <div aria-hidden className="absolute -right-4 -top-5 flex h-32 w-32 items-center justify-center rounded-full border-[14px] border-amber-500/10"><Trophy className="h-14 w-14 text-amber-500/40" /></div>
          <h2 className="relative font-display text-xl">Your Journey</h2><p className="relative mt-1 max-w-[20ch] text-xs leading-relaxed text-ink-mid">One game at a time. Your story is still growing.</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 p-4">
          {[
            { label: "Games explored", value: summary.gamesExplored, icon: Gamepad2 },
            { label: "Modes available", value: summary.modesAvailable, icon: Flag },
            { label: "Modes played", value: summary.modesPlayed, icon: Star },
            { label: "Personal bests", value: summary.personalBests, icon: Trophy },
          ].map(({ label, value, icon: Icon }) => <div key={label}><dt className="text-[10px] text-ink-mid">{label}</dt><dd className="mt-1 flex items-center gap-2 font-display text-lg"><Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />{value}</dd></div>)}
        </dl>
      </section>
      <section className={`${PANEL} p-4`}>
        <h2 className="font-display text-lg">Recent personal bests</h2>
        <p className="mt-1 text-[11px] text-ink-mid">Latest saved best for each mode, not a full event history.</p>
        {recent.length ? <ul className="mt-3 divide-y divide-[var(--chrome-hairline)]">{recent.map(({ game, mode }) => <li key={`${game.id}:${mode.modeId}`}><button type="button" onClick={() => onSelect(game, mode)} className="flex min-h-[72px] w-full items-start gap-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"><span className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400"><Trophy className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold">{game.label}</span><span className="mt-0.5 block text-[11px] text-ink-mid">{recordValue(game, mode)} · {mode.displayName}</span><span className="mt-1 block text-[10px] text-ink-mid">{recordDate(mode.achievedAt)}</span></span><ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-mid" aria-hidden /></button></li>)}</ul> : <div className="py-7 text-center"><Flag className="mx-auto h-8 w-8 text-amber-500" aria-hidden /><p className="mt-2 text-sm text-ink-mid">Your first personal best starts here.</p></div>}
      </section>
      <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-ink-mid"><Target className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Totals cover tracked modes. Device-only scores do not add invented matches, dates or streaks.</p>
    </aside>
  );
}
