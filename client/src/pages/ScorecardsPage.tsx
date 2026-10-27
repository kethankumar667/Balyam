import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Gamepad2, Layers, Target, Trophy, Zap } from "lucide-react";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import { useScorecardStore } from "../store/scorecardStore";
import ChronoScorecardDeck from "../components/scorecard/ChronoScorecardDeck";
import PersonalBestOverdriveModal from "../components/scorecard/PersonalBestOverdriveModal";
import { scorecardCoverage } from "../components/scorecard/scorecardDashboardModel";
import { ProfileEmptyState, ProfileErrorState, ProfilePanelSkeleton } from "../features/profile/ProfilePrimitives";
import { buildRecords } from "../features/myrecords/records";

export default function ScorecardsPage() {
  const {
    profile, currentName, currentAvatar, effectivePlayerId, isMember,
    recentMatches, resources, retryProfileData,
  } = useOutletContext<ProfileFamilyOutletContext>();
  const { archive: storedArchive, localArchive, loading, error, fetchScorecards, lastNewPB, dismissPBModal, pendingScoreCount } = useScorecardStore();
  const archive = storedArchive?.playerId === effectivePlayerId ? storedArchive : null;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const records = useMemo(() => buildRecords(archive, mounted, localArchive?.playerId === effectivePlayerId ? localArchive : null),
    [archive, mounted, localArchive, effectivePlayerId]);

  useEffect(() => {
    if (!isMember || !effectivePlayerId) return;
    const refresh = () => { if (document.visibilityState === "visible") void fetchScorecards(effectivePlayerId); };
    void fetchScorecards(effectivePlayerId);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [effectivePlayerId, isMember, fetchScorecards]);

  if (!isMember) return <MemberLockedGate feature="profile" />;
  if (!profile || !effectivePlayerId) return null;

  const coverage = scorecardCoverage(archive, records);
  const trackedGames = records.filter(game => game.modes.some(mode => mode.best !== null) || game.previousModeRecords.length > 0 || game.previousOverallBest !== null).length;
  const ready = Boolean(archive) || trackedGames > 0;
  const activeModes = coverage.recorded + records.reduce((sum, game) => sum + game.previousModeRecords.length, 0);
  const displayArchive = archive ?? { playerId: effectivePlayerId, games: {}, totalPersonalBestsBeaten: 0, updatedAt: 0 };
  const metrics = [
    { label: "Tracked games", value: ready ? String(trackedGames) : "-", detail: "Games with personal records", icon: Gamepad2, style: "border-cyan-600/50 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300" },
    { label: "Records broken", value: archive ? String(archive.totalPersonalBestsBeaten) : "-", detail: "New personal bests", icon: Trophy, style: "border-amber-600/50 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
    { label: "Active modes", value: ready ? String(activeModes) : "-", detail: "Modes with saved bests", icon: Layers, style: "border-violet-600/50 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300" },
    { label: "Mode coverage", value: ready ? `${coverage.percentage}%` : "-", detail: ready ? `${coverage.recorded} of ${coverage.total} current modes` : "Awaiting your archive", icon: Target, style: "border-emerald-600/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
  ];
  const retry = () => { if (effectivePlayerId) void fetchScorecards(effectivePlayerId); };

  return (
    <div className="chrono-scorecards min-w-0 space-y-3 text-score-ink sm:space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4" aria-label="Scorecard overview">
        {metrics.map(({ label, value, detail, icon: Icon, style }) => <div key={label} role="group" aria-label={label}
          className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 sm:p-4 ${style}`}>
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-white/50 sm:flex dark:bg-black/10"><Icon className="h-7 w-7" aria-hidden="true" /></span>
          <div className="min-w-0"><p className="font-mono text-2xl font-black leading-tight tracking-tight text-score-ink">{value}</p><p className="mt-0.5 text-xs font-bold text-score-ink">{label}</p><p className="mt-1 text-[10px] leading-relaxed text-score-soft">{detail}</p></div>
        </div>)}
      </div>

      <section aria-labelledby="chrono-scorecards-heading" className="min-w-0 rounded-[1.4rem] border border-score-edge bg-score-canvas p-3 shadow-[0_18px_48px_-32px_rgba(0,50,80,0.5)] sm:p-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Target className="h-8 w-8 shrink-0 text-score-gold" aria-hidden="true" /><div>
            <h2 id="chrono-scorecards-heading" className="font-display text-xl tracking-tight text-score-ink sm:text-2xl">Chrono scorecards</h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-score-soft">The same personal bests as My Records. Imported and device-only bests are labeled; grades and history use recorded matches only.</p>
          </div></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-score-edge bg-score-inset px-3 py-2 text-[11px] text-score-ink"><Zap className="h-4 w-4 text-score-gold" aria-hidden="true" />Records shattered: <strong>{archive ? archive.totalPersonalBestsBeaten : "-"}</strong></span>
        </header>
        {loading && !ready ? <ProfilePanelSkeleton rows={5} /> : null}
        {error && !archive ? <ProfileErrorState title="Scorecards unavailable" description={error} onRetry={retry} /> : null}
        {!loading && !error && !ready ? <ProfileEmptyState icon={Trophy} title="No scorecards yet" description="Set a score in a supported solo or multiplayer mode to start your personal-best archive." /> : null}
        {archive && error ? <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-score-edge bg-score-inset p-3 text-xs text-score-soft"><p>Showing your saved archive. {error}</p><button type="button" onClick={retry} className="min-h-11 rounded-lg px-3 font-bold text-score-cyan">Retry scorecards</button></div> : null}
        {archive && loading ? <p role="status" className="mb-3 text-xs text-score-soft">Refreshing your scorecards...</p> : null}
        {pendingScoreCount > 0 ? <p role="status" className="mb-3 rounded-xl border border-score-edge bg-score-inset p-3 text-xs text-score-soft">{pendingScoreCount} results waiting to reach your account. <button type="button" onClick={retry} className="min-h-11 px-2 font-bold text-score-cyan">Retry saving scores</button></p> : null}
        {ready ? <ChronoScorecardDeck archive={displayArchive} records={records} playerName={currentName || profile.displayName}
          avatar={currentAvatar ?? profile.avatar} recentMatches={recentMatches}
          recentMatchesStatus={resources.recentMatches.status} onRetryMatches={retryProfileData} /> : null}
      </section>
      {lastNewPB ? <PersonalBestOverdriveModal result={lastNewPB} onClose={dismissPBModal} /> : null}
    </div>
  );
}
