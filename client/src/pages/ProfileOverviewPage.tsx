import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowRight, Award, BarChart3, CheckCircle2, Circle, Download, Flame, Gamepad2, History, Pencil, Route, ShieldCheck, Target, Trash2, Trophy, UserRoundCog } from "lucide-react";
import DeleteAccountModal from "../components/auth/DeleteAccountModal";
import { loadAccountDetails } from "../lib/accountGenerator";
import { downloadPlayerExport } from "../lib/privacy/exportData";
import { ProfileEmptyState, ProfileErrorState, ProfileMetricTile, ProfilePanelSkeleton, ProfileProgressBar, ProfileSection } from "../features/profile/ProfilePrimitives";
import { getProfileGameLabel } from "../features/profile/gameLabel";
import { TrustTierCard } from "../features/profile/TrustTierCard";
import LevelJourneyCard from "../features/profile/LevelJourneyCard";
import { VaultAchievementCard } from "../features/profile/VaultAchievementCard";
import { AchievementRevealModal } from "../features/profile/AchievementRevealModal";
import { describeXpJourney } from "../lib/xpJourney";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import type { Achievement } from "@shared/profile/Achievements";
import type { GameStats } from "@shared/profile/PlayerStats";

const CONTROL = "flex min-h-[48px] w-full items-center gap-3 rounded-xl bg-surface-0 px-3 text-left text-sm font-semibold text-ink-hi hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--command-gold)]";
const VIEW_ALL = "inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-bold text-[var(--command-cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--command-gold)]";

function formatPlayedAt(timestamp?: number): string {
  if (!timestamp) return "Recorded match";
  return new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(timestamp);
}

export default function ProfileOverviewPage() {
  const { profile, stats, achievements, recentMatches, resources, isMember, effectivePlayerId, retryProfileData, openEditModal, openAvatarModal } = useOutletContext<ProfileFamilyOutletContext>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const statsReady = resources.stats.status === "ready" && stats !== null && !stats.demo;
  const achievementsReady = resources.achievements.status === "ready";

  useEffect(() => {
    if (location.hash !== "#mastery") return;
    const frame = requestAnimationFrame(() => {
      const mastery = document.getElementById("mastery");
      mastery?.scrollIntoView({ block: "start", behavior: "instant" });
      mastery?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);

  const mastery = useMemo(() => statsReady && stats ? Object.values(stats.perGame)
    .filter((item): item is GameStats => Boolean(item)).sort((a, b) => b.matchesPlayed - a.matchesPlayed).slice(0, 5) : [], [stats, statsReady]);
  const recentAchievements = useMemo(() => achievements.filter(a => a.unlocked)
    .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)).slice(0, 3), [achievements]);
  const closest = useMemo(() => achievements.filter(a => !a.unlocked && a.progressPercent > 0)
    .sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 1), [achievements]);

  if (!isMember || !profile) return null;
  const unlocked = achievements.filter(a => a.unlocked).length;
  const completion = achievements.length ? Math.round(unlocked / achievements.length * 100) : 0;
  const journey = describeXpJourney(profile.experiencePoints);
  const markers = [
    { label: "Joined", detail: new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", year: "numeric" }).format(profile.joinedAt), reached: true },
    { label: "First match", detail: statsReady ? stats.totalMatches > 0 ? "Recorded" : "Not yet" : "Unavailable", reached: statsReady && stats.totalMatches > 0 },
    { label: "First victory", detail: statsReady ? stats.wins > 0 ? "Recorded" : "Not yet" : "Unavailable", reached: statsReady && stats.wins > 0 },
    { label: `Level ${journey.level}`, detail: "You are here", reached: true },
    { label: `Level ${journey.upcoming[0]?.level ?? journey.nextLevel}`, detail: "Next step", reached: false },
  ];

  const achievementState = (emptyTitle: string, emptyDescription: string) => resources.achievements.status === "loading"
    ? <ProfilePanelSkeleton rows={2} />
    : resources.achievements.status === "error"
      ? <ProfileErrorState title="Achievements unavailable" description={resources.achievements.message} onRetry={retryProfileData} />
      : <ProfileEmptyState icon={Award} title={emptyTitle} description={emptyDescription} />;

  return <div className="profile-command trophy-vault space-y-4 text-ink-hi sm:space-y-5">
    <LevelJourneyCard experiencePoints={profile.experiencePoints} playerId={effectivePlayerId ?? undefined} onPlay={() => navigate("/games")} />

    {resources.stats.status === "loading" ? <ProfilePanelSkeleton rows={2} /> : statsReady ? (
      <section aria-label="Career metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ProfileMetricTile label="Matches played" value={stats.totalMatches.toLocaleString()} detail="Completed matches" icon={Gamepad2} accent="cyan" />
        <ProfileMetricTile label="Win rate" value={`${Math.round(stats.winRate)}%`} detail={`${stats.wins.toLocaleString()} wins`} icon={Target} accent="green" />
        <ProfileMetricTile label="Achievements" value={achievementsReady ? `${unlocked} / ${achievements.length}` : "—"} detail={achievementsReady ? `${completion}% complete` : resources.achievements.status === "loading" ? "Loading collection" : "Unavailable"} icon={Trophy} accent="gold" />
        <ProfileMetricTile label="Best streak" value={stats.bestWinStreak.toLocaleString()} detail="Consecutive wins" icon={Flame} accent="coral" />
      </section>
    ) : <ProfileErrorState title="Career metrics unavailable" description={resources.stats.status === "error" ? resources.stats.message : "Verified career statistics are not available yet."} onRetry={retryProfileData} />}

    <div className="grid items-start gap-4 lg:grid-cols-2 sm:gap-5">
      <ProfileSection id="mastery" title="Game mastery" description="Your record across games. Bars show win rate." icon={BarChart3} accent="cyan" className="scroll-mt-24"
        action={<Link to="/myrecords" className={VIEW_ALL}>View all <ArrowRight size={14} aria-hidden="true" /></Link>}>
        {resources.stats.status === "loading" ? <ProfilePanelSkeleton rows={4} /> : !statsReady ? <ProfileErrorState title="Mastery unavailable" description="Your game statistics could not be loaded." onRetry={retryProfileData} />
          : mastery.length ? <div className="space-y-3">{mastery.map(game => <article key={game.game} className="rounded-xl border border-[var(--command-edge)] bg-surface-0 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--command-edge)] bg-surface-1 text-[var(--command-cyan)]"><Gamepad2 size={23} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1"><h4 className="text-sm font-bold">{getProfileGameLabel(game.game)}</h4><p className="mt-1 text-xs text-ink-mid">{game.matchesPlayed} matches · {game.wins} wins</p></div>
              <span className="font-mono text-sm font-bold text-[var(--command-cyan)]">{Math.round(game.winRate)}%</span>
            </div>
            <div className="mt-2"><ProfileProgressBar label={`${getProfileGameLabel(game.game)} win rate`} value={game.winRate} accent="cyan" showValue={false} /></div>
          </article>)}</div> : <ProfileEmptyState icon={Gamepad2} title="No mastery data yet" description="Complete a match to start your game record." actionLabel="Explore games" onAction={() => navigate("/games")} />}
      </ProfileSection>
      <ProfileSection title="Recent activity" description="Your latest completed matches and recorded results." icon={History} accent="cyan"
        action={<Link to="/profile/matches" className={VIEW_ALL}>View all <ArrowRight size={14} aria-hidden="true" /></Link>}>
        {resources.recentMatches.status === "loading" ? <ProfilePanelSkeleton rows={3} /> : resources.recentMatches.status === "error"
          ? <ProfileErrorState title="Recent activity unavailable" description={resources.recentMatches.message} onRetry={retryProfileData} />
          : recentMatches.length ? <ul className="space-y-3">{recentMatches.map(match => <li key={match.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--command-edge)] bg-surface-0 p-3">
            <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[var(--command-gold)]"><Gamepad2 size={20} aria-hidden="true" /></span>
              <div className="min-w-0"><p className="text-sm font-bold">{getProfileGameLabel(match.game)}</p><p className="mt-1 text-xs text-ink-mid">{formatPlayedAt(match.playedAt)}</p></div></div>
            <span className={`shrink-0 rounded-lg border border-current px-2 py-1 text-[10px] font-bold uppercase ${match.result === "won" ? "text-[var(--vault-green)]" : match.result === "lost" ? "text-rose-800 dark:text-rose-300" : "text-[var(--command-cyan)]"}`}>{match.result === "won" ? "Win" : match.result === "lost" ? "Loss" : "Draw"}</span>
          </li>)}</ul> : <ProfileEmptyState icon={History} title="Your battle log is ready" description="Completed matches will appear here with their recorded result." actionLabel="Play a game" onAction={() => navigate("/games")} />}
      </ProfileSection>
    </div>

    <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr] sm:gap-5">
      <ProfileSection title="Achievement highlights" description="Your most recent unlocks." icon={Trophy} accent="gold"
        action={<Link to="/profile/achievements" className={VIEW_ALL}>View all <ArrowRight size={14} aria-hidden="true" /></Link>}>
        {achievementsReady && recentAchievements.length ? <div className="grid gap-3 xl:grid-cols-3">{recentAchievements.map(a => <VaultAchievementCard key={a.id} achievement={a} onSelect={setActiveAchievement} compact />)}</div>
          : achievementState("Your first trophy is waiting", "Complete a challenge to start your achievement collection.")}
      </ProfileSection>
      <ProfileSection title="Almost yours" description="Your closest unfinished challenge." icon={Target} accent="violet">
        {achievementsReady && closest.length ? closest.map(a => <VaultAchievementCard key={a.id} achievement={a} onSelect={setActiveAchievement} />)
          : resources.achievements.status === "ready" ? <ProfileEmptyState icon={Target} title={achievements.length && unlocked === achievements.length ? "Collection complete" : "Your next challenge awaits"} description="Visit the Trophy Vault to explore all your achievements." actionLabel="Open Trophy Vault" onAction={() => navigate("/profile/achievements")} />
            : <p className="text-sm text-ink-mid">{resources.achievements.status === "loading" ? "Your closest challenge will appear when progress loads." : "Load your achievements to see the next challenge."}</p>}
      </ProfileSection>
    </div>

    <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr] sm:gap-5">
      <ProfileSection title="Your BHALYAM journey" description="Progress markers, not a dated activity history." icon={Route} accent="gold">
        <ol className="grid gap-4 sm:grid-cols-5">{markers.map((marker, i) => <li key={marker.label} className="relative flex items-center gap-3 sm:flex-col sm:text-center">
          <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-surface-0 ${marker.reached ? "border-[var(--command-cyan)] text-[var(--command-cyan)]" : "border-[var(--command-edge)] text-ink-mid"}`}>{i === 3 ? <Trophy size={18} aria-hidden="true" /> : marker.reached ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}</span>
          <span><span className="block text-xs font-bold">{marker.label}</span><span className="mt-1 block text-[11px] leading-relaxed text-ink-mid">{marker.detail}</span></span>
        </li>)}</ol>
      </ProfileSection>
      <ProfileSection title="Profile controls" description="Your identity, preferences and privacy." icon={UserRoundCog} accent="cyan">
        <div className="space-y-2">
          <button type="button" onClick={openEditModal} className={CONTROL}><Pencil size={17} aria-hidden="true" />Edit personal information</button>
          <button type="button" onClick={openAvatarModal} className={CONTROL}><UserRoundCog size={17} aria-hidden="true" />Change avatar</button>
          <Link to="/settings/preferences" className={CONTROL}><Gamepad2 size={17} aria-hidden="true" />Game preferences</Link>
          <Link to="/privacy" className={CONTROL}><ShieldCheck size={17} aria-hidden="true" />Privacy and data</Link>
          <button type="button" onClick={() => downloadPlayerExport(profile, stats, loadAccountDetails())} className={CONTROL}><Download size={17} aria-hidden="true" />Download player data</button>
          <button type="button" onClick={() => setIsDeleteModalOpen(true)} className={`${CONTROL} !text-rose-800 dark:!text-rose-300`}><Trash2 size={17} aria-hidden="true" />Delete account</button>
        </div>
      </ProfileSection>
    </div>
    {effectivePlayerId && <TrustTierCard playerId={effectivePlayerId} />}
    <p className="text-center font-script text-xl text-[var(--command-gold)]">Same games. Bigger memories.</p>
    <AchievementRevealModal achievement={activeAchievement} isOpen={activeAchievement !== null} onClose={() => setActiveAchievement(null)} />
    <DeleteAccountModal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
  </div>;
}
