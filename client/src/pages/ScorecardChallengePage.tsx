import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Play, Target } from "lucide-react";
import { gameLaunch, launchLinkProps } from "../lib/gameLaunch";
import { parseScorecardChallenge } from "../lib/scorecardChallenge";
import { scorecardArt, scorecardValueWithUnit } from "../components/scorecard/scorecardDashboardModel";

const ACTION = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan";

export default function ScorecardChallengePage() {
  const { search } = useLocation();
  const challenge = parseScorecardChallenge(search);
  const home = <Link to="/" className={`${ACTION} border-score-edge bg-score-inset text-score-ink`}>
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />Home
  </Link>;

  if (!challenge) return <main className="chrono-scorecards flex min-h-dvh items-center justify-center bg-score-canvas p-4 font-sans text-score-ink">
    <section className="w-full max-w-lg rounded-3xl border border-score-edge bg-score-panel p-6">
      <h1 className="font-display text-2xl">Challenge unavailable</h1>
      <p className="my-4 text-sm leading-relaxed text-score-soft">This link is incomplete or invalid. Ask for a new scorecard link, or choose a game below.</p>
      <div className="flex flex-wrap gap-3">
        <Link to="/games" className={`${ACTION} border-score-cyan bg-score-inset text-score-cyan`}>Browse games</Link>
        {home}
      </div>
    </section>
  </main>;

  const { config, mode, score } = challenge;
  const launch = gameLaunch(config.game);
  const playable = launch.kind !== "browse";
  const art = scorecardArt(config.game);
  return <main className="chrono-scorecards flex min-h-dvh items-center justify-center bg-score-canvas p-4 font-sans text-score-ink sm:p-8">
    <section className="w-full min-w-0 max-w-lg rounded-3xl border border-score-edge bg-score-panel p-5 sm:p-8">
      <header className="flex items-start gap-3">
        {art ? <img src={art} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-2xl object-cover" /> : null}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-score-cyan">BHALYAM personal challenge</p>
          <h1 className="mt-1 break-words font-display text-2xl sm:text-3xl">{config.displayName} challenge</h1>
        </div>
      </header>
      <div className="my-6 rounded-2xl border border-score-edge bg-score-inset p-4">
        <p className="text-sm font-bold text-score-soft">{mode?.displayName ?? "Historical mode"}</p>
        <p className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-score-cyan">
          <Target className="h-4 w-4" aria-hidden="true" />Shared target
        </p>
        <strong className="mt-2 block break-words font-display text-3xl text-score-gold [overflow-wrap:anywhere] sm:text-4xl">
          {mode ? scorecardValueWithUnit(config.game, mode, score) : score.toLocaleString()}
        </strong>
        {mode ? <p className="mt-2 text-sm text-score-soft">{mode.scoringDirection === "LOWER_IS_BETTER" ? "Lower is better" : "Higher is better"}</p> : null}
      </div>
      <p className="text-sm leading-relaxed text-score-soft">This target was shared by a player. It is not a verified record and does not award coins, XP or leaderboard credit.</p>
      <p className="mt-3 text-sm leading-relaxed text-score-ink">
        {!playable ? "This game is not currently available. You can browse other games instead."
          : mode ? `Choose the ${mode.displayName} mode in game setup. Play opens the usual setup; it does not select a mode or start a match automatically.`
          : "This mode is no longer listed. Its original unit is unknown. You can play the game's current modes instead."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link {...launchLinkProps(config.game)} className={`${ACTION} border-amber-500 bg-amber-400 text-slate-950`}>
          <Play className="h-4 w-4" aria-hidden="true" />
          {!playable ? "Browse games" : mode ? `Play ${config.displayName}` : "Play current modes"}
        </Link>
        {home}
      </div>
    </section>
  </main>;
}
