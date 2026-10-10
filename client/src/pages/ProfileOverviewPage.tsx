import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  Download,
  Gamepad2,
  History,
  Medal,
  Pencil,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  UserRoundCog,
} from "lucide-react";
import DeleteAccountModal from "../components/auth/DeleteAccountModal";
import { loadAccountDetails } from "../lib/accountGenerator";
import { downloadPlayerExport } from "../lib/privacy/exportData";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileMetricTile,
  ProfilePageHeading,
  ProfilePanelSkeleton,
  ProfileProgressBar,
  ProfileSection,
} from "../features/profile/ProfilePrimitives";
import { getProfileGameLabel } from "../features/profile/gameLabel";
import { TrustTierCard } from "../features/profile/TrustTierCard";
import LevelJourneyCard from "../features/profile/LevelJourneyCard";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import type { Achievement } from "@shared/profile/Achievements";
import type { GameStats } from "@shared/profile/PlayerStats";

function achievementIcon(achievement: Achievement) {
  if (achievement.category === "resilience") return ShieldCheck;
  if (achievement.category === "progression") return Medal;
  return Trophy;
}

function formatPlayedAt(timestamp?: number): string {
  if (!timestamp) return "Recorded match";
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 60) return elapsedMinutes <= 1 ? "Just now" : `${elapsedMinutes} min ago`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hr ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(timestamp);
}

export default function ProfileOverviewPage() {
  const {
    profile,
    stats,
    achievements,
    recentMatches,
    resources,
    isMember,
    effectivePlayerId,
    retryProfileData,
    openEditModal,
    openAvatarModal,
  } = useOutletContext<ProfileFamilyOutletContext>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash !== "#mastery") return;
    const frame = requestAnimationFrame(() => {
      const mastery = document.getElementById("mastery");
      mastery?.scrollIntoView({ block: "start", behavior: "smooth" });
      mastery?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);

  const mastery = useMemo(() => {
    if (!stats) return [];
    return Object.values(stats.perGame)
      .filter((item): item is GameStats => Boolean(item))
      .sort((left, right) => right.matchesPlayed - left.matchesPlayed)
      .slice(0, 5);
  }, [stats]);

  const achievementPreview = useMemo(() => [...achievements]
    .sort((left, right) => Number(right.unlocked) - Number(left.unlocked) || right.progressPercent - left.progressPercent)
    .slice(0, 4), [achievements]);

  if (!isMember || !profile) return null;

  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;
  const achievementCompletion = achievements.length > 0
    ? Math.round((unlockedAchievements / achievements.length) * 100)
    : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProfilePageHeading
        icon={Target}
        eyebrow="Career HQ"
        title="Career command center"
        description="Your verified match record, strongest games, recent results, and achievement progress in one focused view."
        accent="gold"
      />

      <LevelJourneyCard experiencePoints={profile.experiencePoints} playerId={effectivePlayerId ?? undefined} />

      {resources.stats.status === "loading" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : stats ? (
        <section aria-label="Career metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ProfileMetricTile label="Matches played" value={stats.totalMatches.toLocaleString()} detail="Career total" icon={Gamepad2} accent="gold" />
          <ProfileMetricTile label="Win rate" value={`${Math.round(stats.winRate)}%`} detail={`${stats.wins.toLocaleString()} wins`} icon={Target} accent="cyan" />
          <ProfileMetricTile label="Achievements" value={unlockedAchievements.toLocaleString()} detail={`${achievementCompletion}% complete`} icon={Award} accent="violet" />
          <ProfileMetricTile label="Best streak" value={stats.bestWinStreak.toLocaleString()} detail="Consecutive wins" icon={Trophy} accent="coral" />
        </section>
      ) : (
        <ProfileErrorState title="Career metrics unavailable" description={resources.stats.status === "error" ? resources.stats.message : "Career statistics could not be loaded."} onRetry={retryProfileData} />
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <ProfileSection
          id="mastery"
          title="Game mastery"
          description="Performance by game, ordered by matches played."
          icon={BarChart3}
          accent="cyan"
          className="scroll-mt-24 lg:col-span-8"
          action={mastery.length > 0 ? <span className="font-mono text-xs font-bold text-cyan-800 dark:text-cyan-300">{mastery.length} games tracked</span> : undefined}
        >
          {resources.stats.status === "loading" ? <ProfilePanelSkeleton rows={4} /> : null}
          {resources.stats.status === "error" ? (
            <ProfileErrorState title="Mastery unavailable" description={resources.stats.message} onRetry={retryProfileData} />
          ) : null}
          {resources.stats.status === "ready" && mastery.length === 0 ? (
            <ProfileEmptyState
              icon={Gamepad2}
              title="No mastery data yet"
              description="Play a completed match to begin tracking performance by game."
              actionLabel="Explore games"
              onAction={() => navigate("/games")}
            />
          ) : null}
          {resources.stats.status === "ready" && mastery.length > 0 ? (
            <div className="divide-y divide-stone-300/70 dark:divide-slate-700/70">
              {mastery.map((game) => (
                <article key={game.game} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="truncate text-sm font-bold text-ink-hi">{getProfileGameLabel(game.game)}</h4>
                        <p className="mt-0.5 text-xs text-ink-mid">{game.matchesPlayed} matches · {game.wins} wins</p>
                      </div>
                    </div>
                    <ProfileProgressBar label={`${getProfileGameLabel(game.game)} win rate`} value={game.winRate} accent="cyan" showValue={false} />
                  </div>
                  <div className="self-center text-right">
                    <p className="font-mono text-xl font-black text-cyan-800 tabular-nums dark:text-cyan-300">{Math.round(game.winRate)}%</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-lo">Win rate</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </ProfileSection>

        <ProfileSection
          title="Recent battles"
          description="Your latest completed matches."
          icon={History}
          accent="gold"
          className="lg:col-span-4"
          action={(
            <Link to="/profile/matches" className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-bold text-lamp-800 hover:bg-lamp-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:text-lamp-300 dark:hover:bg-lamp-500/10">
              All <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        >
          {resources.recentMatches.status === "loading" ? <ProfilePanelSkeleton rows={3} /> : null}
          {resources.recentMatches.status === "error" ? (
            <ProfileErrorState title="Recent battles unavailable" description={resources.recentMatches.message} onRetry={retryProfileData} />
          ) : null}
          {resources.recentMatches.status === "ready" && recentMatches.length === 0 ? (
            <ProfileEmptyState
              icon={History}
              title="Your battle log is ready"
              description="Completed matches will appear here with their recorded result."
              actionLabel="Play a game"
              onAction={() => navigate("/games")}
            />
          ) : null}
          {resources.recentMatches.status === "ready" && recentMatches.length > 0 ? (
            <div className="divide-y divide-stone-300/70 dark:divide-slate-700/70">
              {recentMatches.map((match) => {
                const resultLabel = match.result === "won" ? "Win" : match.result === "lost" ? "Loss" : "Draw";
                const resultClass = match.result === "won"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
                  : match.result === "lost"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-400/10 dark:text-rose-300"
                    : "bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300";
                return (
                  <div key={match.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-hi">{getProfileGameLabel(match.game)}</p>
                      <p className="mt-0.5 text-xs text-ink-mid">{formatPlayedAt(match.playedAt)}</p>
                    </div>
                    <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-black uppercase tracking-wide ${resultClass}`}>{resultLabel}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </ProfileSection>

        <ProfileSection
          title="Achievement progress"
          description="Milestones recorded across the lounge."
          icon={Award}
          accent="violet"
          className="lg:col-span-8"
          action={(
            <Link to="/profile/achievements" className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-bold text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300 dark:hover:bg-violet-400/10">
              Vault <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        >
          {resources.achievements.status === "loading" ? <ProfilePanelSkeleton rows={3} /> : null}
          {resources.achievements.status === "error" ? (
            <ProfileErrorState title="Achievements unavailable" description={resources.achievements.message} onRetry={retryProfileData} />
          ) : null}
          {resources.achievements.status === "ready" && achievements.length === 0 ? (
            <ProfileEmptyState icon={Award} title="No achievements recorded" description="Achievement progress will appear when the server records a supported milestone." />
          ) : null}
          {resources.achievements.status === "ready" && achievementPreview.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {achievementPreview.map((achievement) => {
                const Icon = achievementIcon(achievement);
                return (
                  <article key={achievement.id} className="rounded-xl border border-stone-300/70 bg-surface-0 p-3.5 dark:border-slate-700/70">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${achievement.unlocked ? "bg-violet-100 text-violet-800 dark:bg-violet-400/10 dark:text-violet-300" : "bg-surface-2 text-ink-lo"}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-ink-hi">{achievement.title}</h4>
                          <span className="shrink-0 font-mono text-[10px] font-bold uppercase text-ink-mid">{achievement.unlocked ? "Unlocked" : "In progress"}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-mid">{achievement.description}</p>
                        <div className="mt-3">
                          <ProfileProgressBar label={`${achievement.title} progress`} value={achievement.progressPercent} accent="violet" showValue={false} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </ProfileSection>

        <ProfileSection title="Profile controls" description="Identity, privacy, and account actions." icon={UserRoundCog} accent="coral" className="lg:col-span-4">
          <div className="space-y-2">
            <button type="button" onClick={openEditModal} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-surface-0 px-3 text-left text-sm font-semibold text-ink-hi transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500">
              <Pencil className="h-4 w-4 text-lamp-700 dark:text-lamp-300" aria-hidden="true" />
              Edit personal information
            </button>
            <button type="button" onClick={openAvatarModal} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-surface-0 px-3 text-left text-sm font-semibold text-ink-hi transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500">
              <UserRoundCog className="h-4 w-4 text-cyan-800 dark:text-cyan-300" aria-hidden="true" />
              Change avatar
            </button>
            <button type="button" onClick={() => downloadPlayerExport(profile, stats, loadAccountDetails())} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-surface-0 px-3 text-left text-sm font-semibold text-ink-hi transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500">
              <Download className="h-4 w-4 text-violet-800 dark:text-violet-300" aria-hidden="true" />
              Download player data
            </button>
            <Link to="/privacy" className="flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-surface-0 px-3 text-left text-sm font-semibold text-ink-hi transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500">
              <ShieldCheck className="h-4 w-4 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
              Privacy and data
            </Link>
            <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete account
            </button>
          </div>
        </ProfileSection>
        {effectivePlayerId ? (
          <div className="lg:col-span-12">
            <TrustTierCard playerId={effectivePlayerId} />
          </div>
        ) : null}
      </div>

      <DeleteAccountModal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}
