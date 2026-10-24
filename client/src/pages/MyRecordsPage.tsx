import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy, Gamepad2, Grid2X2, Play, Star, Flag, CalendarDays, ChevronLeft, ChevronRight,
  Search, X, RefreshCw, AlertCircle, ArrowUpRight, Target, Medal, Crown, Clock,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { useScorecardStore } from "../store/scorecardStore";
import { useAuthStore } from "../store/authStore";
import { usePlayerId } from "../lib/playerIdentity";
import { launchLinkProps } from "../lib/gameLaunch";
import { buildRecords, formatRecordScore, goalProgress, recordSummary, recordValue, recordDate, type RecordGame } from "../features/myrecords/records";
import { RecordHistory, RecordJourney } from "../features/myrecords/RecordPanels";
import { useReducedMotion } from "../hooks/useReducedMotion";

const PANEL = "rounded-2xl border border-[var(--chrome-hairline)] bg-surface-1 shadow-sm";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

export default function MyRecordsPage() {
  const { playerId } = usePlayerId();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { archive, localArchive, loading, error, fetchScorecards } = useScorecardStore();
  const [mounted, setMounted] = useState(false);
  const [gameId, setGameId] = useState("handcricket");
  const [modeId, setModeId] = useState("international_t20");
  const [search, setSearch] = useState("");
  const gamesRef = useRef<HTMLDivElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!playerId) return;
    const refresh = () => { if (document.visibilityState === "visible") void fetchScorecards(playerId); };
    void fetchScorecards(playerId);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [playerId, fetchScorecards]);
  const games = useMemo(() => buildRecords(archive, mounted, localArchive?.playerId === playerId ? localArchive : null), [archive, localArchive, mounted, playerId]);
  const summary = useMemo(() => recordSummary(games), [games]);
  const filtered = games.filter((game) => `${game.label} ${game.id} ${game.modes.map((mode) => `${mode.displayName} ${mode.description}`).join(" ")} ${game.previousModeRecords.map((saved) => `${saved.modeDisplayName} ${saved.modeId}`).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()));
  const game = filtered.find((candidate) => candidate.id === gameId) ?? filtered[0] ?? games[0]!;
  const mode = game.modes.find((candidate) => candidate.modeId === modeId) ?? game.modes.find((candidate) => candidate.modeId === game.config.defaultModeId) ?? game.modes[0]!;
  const progress = goalProgress(mode);
  const selectGame = (next: RecordGame) => { setGameId(next.id); setModeId(next.config.defaultModeId); };
  const stats = [
    { label: "Games explored", value: summary.gamesExplored, icon: Gamepad2, color: "text-violet-600 bg-violet-500/10" },
    { label: "Modes available", value: summary.modesAvailable, icon: Grid2X2, color: "text-cyan-600 bg-cyan-500/10" },
    { label: "Modes played", value: summary.modesPlayed, icon: Play, color: "text-emerald-600 bg-emerald-500/10" },
    { label: "Personal bests", value: summary.personalBests, icon: Star, color: "text-amber-600 bg-amber-500/10" },
    { label: "Goals reached", value: summary.goalsReached, icon: Flag, color: "text-purple-600 bg-purple-500/10" },
    { label: "Recorded matches", value: summary.matches, icon: CalendarDays, color: "text-rose-600 bg-rose-500/10" },
  ];

  return (
    <AppLayout>
      <div data-my-records className="mx-auto w-full max-w-[1600px] min-w-0 space-y-5 px-3 py-4 text-ink-hi sm:px-5 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"><Trophy className="h-8 w-8" aria-hidden /></span>
            <div><h1 className="font-display text-2xl sm:text-3xl">My Records</h1><p className="text-xs text-ink-mid sm:text-sm">Every game. Every mode. Every personal best.</p></div>
          </div>
          <span className="hidden font-script text-xl text-amber-700 dark:text-amber-300 lg:block">Same games. Bigger memories.</span>
          {playerId && <button type="button" disabled={loading} onClick={() => void fetchScorecards(playerId)} className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--chrome-hairline)] px-3 text-xs disabled:opacity-50 ${FOCUS}`}><RefreshCw className="h-4 w-4" aria-hidden />Refresh account records</button>}
          {isSuperAdmin && <Link to="/admin/leaderboards" className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--chrome-hairline)] px-3 text-xs ${FOCUS}`}>Admin Ratings Panel <ArrowUpRight className="h-4 w-4" aria-hidden /></Link>}
        </header>
        <p className="text-xs leading-relaxed text-ink-mid">Account records are shared across devices. Bests labeled “Saved on this device” are local only and are not imported as account records.</p>

        {loading && !archive && !summary.gamesExplored ? (
          <div role="status" className={`${PANEL} flex items-center justify-center gap-3 p-12 text-ink-mid`}><RefreshCw className="h-5 w-5 motion-safe:animate-spin" aria-hidden />Loading scorecards...</div>
        ) : error && !archive && !summary.gamesExplored ? (
          <div role="alert" className={`${PANEL} space-y-3 p-8 text-center`}>
            <AlertCircle className="mx-auto h-8 w-8 text-danger" aria-hidden /><h2 className="font-display text-xl">Scorecards Unavailable</h2>
            <p className="text-sm text-ink-mid">{error}</p>
            <button type="button" onClick={() => playerId && fetchScorecards(playerId)} className={`min-h-[44px] rounded-xl bg-amber-500 px-5 font-bold text-slate-950 ${FOCUS}`}>Retry Connection</button>
          </div>
        ) : (
          <>
            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-ink-hi">Showing saved records. {error}</p>}
            {loading && <p role="status" className="text-sm text-ink-mid">Showing saved records. Loading account scorecards...</p>}
            <section aria-label="Your record totals" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {stats.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`${PANEL} flex min-w-0 items-center gap-2.5 px-3 py-3`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" aria-hidden /></span>
                  <div><p className="font-display text-xl tabular-nums">{value.toLocaleString()}</p><p className="text-[11px] font-medium leading-tight text-ink-mid">{label}</p></div>
                </div>
              ))}
            </section>
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-5">
                <section aria-labelledby="records-games-title" className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="records-games-title" className="font-display text-lg">All Games <span className="ml-2 font-sans text-xs font-medium text-ink-mid">{games.length} games</span></h2>
                    <div className="relative w-full sm:w-60">
                      <Search aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-mid" />
                      <input aria-label="Search games by name" placeholder="Search games..." value={search} onChange={(event) => setSearch(event.target.value)} className={`min-h-[44px] w-full rounded-xl border border-[var(--chrome-hairline)] bg-surface-1 pl-9 pr-12 text-sm ${FOCUS}`} />
                      {search && <button type="button" aria-label="Clear Search" onClick={() => setSearch("")} className={`absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`}><X className="h-4 w-4" aria-hidden /></button>}
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    <button type="button" aria-label="Previous Games" onClick={() => gamesRef.current?.scrollBy({ left: -300, behavior: reduceMotion ? "auto" : "smooth" })} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--chrome-hairline)] bg-surface-1 ${FOCUS}`}><ChevronLeft className="h-5 w-5" aria-hidden /></button>
                    <div ref={gamesRef} role="group" aria-label="Filter scoreboard by game arena" className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto py-2 [scrollbar-width:thin]">
                      {filtered.map((candidate) => (
                        <button key={candidate.id} type="button" aria-label={`Filter by ${candidate.label} game`} aria-pressed={candidate.id === game.id} onClick={() => selectGame(candidate)}
                          className={`w-[104px] shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-surface-1 text-left ${FOCUS} ${candidate.id === game.id ? "border-amber-500 shadow-md shadow-amber-500/15" : "border-[var(--chrome-hairline)]"}`}>
                          <img src={candidate.image} alt="" loading="lazy" className="h-[72px] w-full bg-amber-500/5 object-contain" />
                          <span className="block px-1.5 pb-2 pt-1 text-center"><span className="block text-xs font-bold">{candidate.label}</span><span className="mt-0.5 block text-[10px] text-ink-mid">{candidate.modes.filter((entry) => entry.best !== null).length}/{candidate.modes.length} modes</span></span>
                          {(candidate.previousOverallBest !== null || candidate.previousModeRecords.length > 0) && <span className="block px-1.5 pb-2 text-center text-[10px] text-ink-mid">Previous best saved</span>}
                        </button>
                      ))}
                    </div>
                    <button type="button" aria-label="Next Games" onClick={() => gamesRef.current?.scrollBy({ left: 300, behavior: reduceMotion ? "auto" : "smooth" })} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--chrome-hairline)] bg-surface-1 ${FOCUS}`}><ChevronRight className="h-5 w-5" aria-hidden /></button>
                  </div>
                </section>

                {!filtered.length ? (
                  <div className={`${PANEL} space-y-3 p-10 text-center`}><h2 className="font-display text-xl">No games found</h2><p className="text-sm text-ink-mid">Try another game or mode name.</p><button type="button" onClick={() => setSearch("")} className={`min-h-[44px] rounded-xl bg-amber-500 px-4 font-bold text-slate-950 ${FOCUS}`}>Clear Filters</button></div>
                ) : (
                  <>
                    {game.previousOverallBest !== null && (
                      <section aria-labelledby="previous-overall-best-title" className={`${PANEL} space-y-2 p-4`}>
                        <h2 id="previous-overall-best-title" className="font-display text-lg">Previous overall best — mode not recorded</h2>
                        <p className="font-display text-2xl text-ink-hi">{formatRecordScore(game, mode, game.previousOverallBest)}</p>
                        <p className="text-xs text-ink-mid">Saved on this device · Date not recorded</p>
                        <p className="text-xs leading-relaxed text-ink-mid">Your older {game.label} save kept an overall best without its match mode. It is preserved here separately, not assigned to any mode below.</p>
                      </section>
                    )}
                    {game.previousModeRecords.length > 0 && (
                      <section aria-labelledby="previous-modes-title" className={`${PANEL} space-y-3 p-4`}>
                        <h2 id="previous-modes-title" className="font-display text-lg">Previously recorded modes</h2>
                        <p className="text-xs leading-relaxed text-ink-mid">Historical modes and older device-only snapshots stay separate from current account records. Original scores are preserved without guessing categories or units, or applying today's goals.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {game.previousModeRecords.map((saved) => (
                            <div key={saved.modeId} className="min-w-0 space-y-1 rounded-xl border border-[var(--chrome-hairline)] p-3">
                              <h3 className="break-words font-bold">{saved.modeDisplayName}</h3>
                              <p className="break-all text-xs text-ink-mid">Saved mode: {saved.originalModeId ?? saved.modeId}</p>
                              <p className="font-display text-xl">Stored score: {saved.bestScore.toLocaleString()}</p>
                              <p className="text-xs text-ink-mid">{saved.deviceOnly ? "Saved on this device · Account sync not verified" : `${saved.timesPlayed.toLocaleString()} recorded matches · ${recordDate(saved.bestScoreAchievedAt)}`}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                    <section aria-label={`${game.label} personal record`} className="relative isolate overflow-hidden rounded-2xl border border-amber-600/40 bg-[#182B24] p-5 text-white shadow-lg sm:p-6">
                      <img src={game.id === "handcricket" ? "/illustrations/Handcricket/stadium.png" : game.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-75" />
                      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(17,24,22,0.97),rgba(17,24,22,0.8)_45%,rgba(17,24,22,0.28))]" />
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-950"><Crown className="h-4 w-4" aria-hidden />{mode.best === null ? "Your next record" : "Personal best"}</span>
                          <h2 className="font-display text-2xl sm:text-3xl">{game.label}</h2>
                          <p className="mt-2 font-display text-4xl tabular-nums sm:text-5xl">{recordValue(game, mode)}</p>
                          <p className="mt-1 font-semibold text-amber-100">{mode.displayName}</p>
                          <p className="mt-3 text-xs text-stone-200">{mode.deviceOnly ? "Saved on this device · Date not recorded" : mode.best !== null ? `Best achieved: ${recordDate(mode.achievedAt)}` : "Play a game to set your first record."}</p>
                          {mode.goal !== undefined && <div className="mt-4 max-w-sm">
                            <p className="flex items-center gap-2 text-xs font-semibold"><Target className="h-4 w-4 text-amber-300" aria-hidden />Milestone Target: {formatRecordScore(game, mode, mode.goal)}</p>
                            <p className="mt-1 text-[10px] text-stone-300">A suggested goal, not a reward.</p>
                            {progress !== null && <div className="mt-2 flex items-center gap-2"><div role="progressbar" aria-label="Milestone progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 flex-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} /></div><span className="text-xs font-bold">{progress}%</span></div>}
                          </div>}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link {...launchLinkProps(game.id)} className={`inline-flex min-h-[44px] items-center gap-2 rounded-full bg-amber-400 px-5 text-sm font-bold text-slate-950 ${FOCUS}`}><Play className="h-4 w-4" aria-hidden />{mode.best === null ? "Play to set a record" : "Play Again"}</Link>
                          <button type="button" onClick={() => modesRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" })} className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/30 bg-slate-900 px-4 text-sm font-semibold text-white ${FOCUS}`}><Grid2X2 className="h-4 w-4" aria-hidden />View All Modes</button>
                        </div>
                      </div>
                    </section>

                    <section ref={modesRef} aria-labelledby="records-modes-title" className="min-w-0">
                      <h2 id="records-modes-title" className="mb-2 font-display text-lg">{game.label} — Game Modes ({game.modes.length})</h2>
                      <div role="group" aria-label="Select record mode" className="flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]">
                        {game.modes.map((entry) => (
                          <button key={entry.modeId} type="button" aria-pressed={entry.modeId === mode.modeId} onClick={() => setModeId(entry.modeId)} className={`flex w-[180px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border-2 bg-surface-1 text-left ${FOCUS} ${entry.modeId === mode.modeId ? "border-amber-500 shadow-md shadow-amber-500/10" : "border-[var(--chrome-hairline)]"}`}>
                            <div className="relative h-20 w-full overflow-hidden bg-amber-500/5"><img src={game.image} alt="" loading="lazy" className="absolute right-0 h-full w-20 object-contain opacity-30" /><span className="relative flex items-start gap-2 p-3 text-sm font-bold"><Medal aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />{entry.displayName}</span></div>
                            <div className="flex w-full flex-1 flex-col gap-2 p-3">
                              <p className="text-xs font-bold text-ink-hi">Best: {recordValue(game, entry)}</p>
                              <p className="text-[11px] text-ink-mid">{entry.deviceOnly ? "Saved on this device" : `Played ${entry.timesPlayed} ${entry.timesPlayed === 1 ? "time" : "times"}`}</p>
                              <p className="text-[10px] text-ink-mid">{entry.best !== null ? recordDate(entry.achievedAt) : "Play to set your record"}</p>
                              {goalProgress(entry) !== null && <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-amber-500/10"><div className="h-full rounded-full bg-amber-500" style={{ width: `${goalProgress(entry)}%` }} /></div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                    <RecordHistory game={game} mode={mode} />
                  </>
                )}
                <section className={`${PANEL} p-4`} aria-labelledby="records-cabinet-title">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 id="records-cabinet-title" className="font-display text-lg">My Record Cabinet</h2><p className="text-xs text-ink-mid">Personal bests across all games</p></div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: Trophy, title: "Personal bests improved", value: archive?.totalPersonalBestsBeaten ?? 0, note: "Recorded improvements" },
                      { icon: Gamepad2, title: "Most played game", value: [...games].sort((a, b) => recordSummary([b]).matches - recordSummary([a]).matches)[0]?.label, note: summary.matches ? "By recorded match count" : "No matches recorded yet" },
                      { icon: Clock, title: "Latest archive update", value: archive ? recordDate(archive.updatedAt) : "Not synced yet", note: "Device-only bests stay on this device" },
                    ].map(({ icon: Icon, title, value, note }) => <div key={title} className="flex items-start gap-3 rounded-xl bg-amber-500/5 p-3"><Icon aria-hidden className="mt-1 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" /><div><p className="text-xs text-ink-mid">{title}</p><p className="mt-1 text-sm font-bold">{title === "Most played game" && !summary.matches ? "—" : value}</p><p className="mt-1 text-[10px] text-ink-mid">{note}</p></div></div>)}
                  </div>
                </section>
              </div>
              <RecordJourney games={games} summary={summary} onSelect={(next, nextMode) => { setSearch(""); selectGame(next); setModeId(nextMode.modeId); }} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
