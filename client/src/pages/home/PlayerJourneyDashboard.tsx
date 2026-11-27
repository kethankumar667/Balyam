import { Link } from "react-router-dom";
import { Flag, Gamepad2, Trophy } from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import { describeXpJourney, type XpJourney } from "../../lib/xpJourney";
import type { PlayerSnapshot } from "../../hooks/usePlayerSnapshot";
import { BHALYAM_GAMES, type BhalyamGameSlug } from "../../components/bhalyam/data";
import { TILE_ART_BY_GAME } from "./gameArt";
import { JourneyLandscape } from "./JourneyArtwork";
import { JourneyButtonAction, JourneyCard, JourneyLinkAction } from "./JourneyCard";
import { SocialQuestCard } from "./SocialQuestCard";

type Achievement = PlayerSnapshot["achievements"][number];

/** The visual of the empty "jump back in" card: a gamepad on a soft mint disc, the same size as the other two visuals. */
function GamepadVisual() {
  return (
    <div className="flex h-40 w-40 items-center justify-center rounded-full bg-journey-mint/10 ring-1 ring-journey-mint/20">
      <Gamepad2 size={76} strokeWidth={1.25} className="text-journey-mint" aria-hidden="true" />
    </div>
  );
}

/** Play: the last game the member finished, or an invitation to pick one. */
function JumpBackInCard({ onSelect, snapshot, isMember }: {
  onSelect: (slug: BhalyamGameSlug) => void;
  snapshot: PlayerSnapshot;
  isMember: boolean;
}) {
  const lastMatch = isMember ? snapshot.matches[0] : undefined;
  const game = lastMatch ? BHALYAM_GAMES.find(g => g.slug === lastMatch.game) : undefined;
  const stats = lastMatch && !snapshot.stats?.demo ? snapshot.stats?.perGame[lastMatch.game] : undefined;
  const icon = <Gamepad2 size={16} aria-hidden="true" />;

  if (game && lastMatch) {
    const art = TILE_ART_BY_GAME[game.slug];
    const result = lastMatch.result === "WIN" ? "Won" : lastMatch.result === "DRAW" ? "Draw" : "Played";
    return (
      <JourneyCard
        tone="play"
        icon={icon}
        eyebrow="Jump back in"
        aside={<span className="text-[10px] text-journey-soft">{formatTimeAgo(lastMatch.finishedAt)}</span>}
        title={game.title}
        description={<>Last match: {result}{stats ? ` · ${stats.wins} wins in this game` : ""}</>}
        visual={
          <div className="flex h-40 w-full max-w-[220px] items-center justify-center rounded-3xl bg-[radial-gradient(ellipse_at_50%_100%,rgb(var(--journey-mint)/0.18),transparent_70%)]">
            <picture className="h-full w-full">
              <source type="image/avif" srcSet={art.replace(/\.(png|jpg|jpeg)$/i, ".avif")} />
              <source type="image/webp" srcSet={art.replace(/\.(png|jpg|jpeg)$/i, ".webp")} />
              <img src={art} alt="" width={280} height={210} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-300 motion-safe:hover:scale-[1.03] motion-reduce:transition-none" />
            </picture>
          </div>
        }
        details={<p className="m-0 text-center text-xs leading-relaxed text-journey-soft">A fresh table. The same favourite game.</p>}
        action={<JourneyButtonAction tone="play" onClick={() => onSelect(game.slug)}>Play {game.title} again</JourneyButtonAction>}
      />
    );
  }

  return (
    <JourneyCard
      tone="play"
      icon={icon}
      eyebrow="Jump back in"
      title="Make your next memory"
      description={isMember && !snapshot.profile ? "Your last game could not load. You can still pick one." : "Choose a favourite. Start a new story."}
      visual={<GamepadVisual />}
      details={<p className="m-0 text-center text-xs leading-relaxed text-journey-soft">Your next completed match belongs here.</p>}
      action={<JourneyLinkAction tone="play" to="/games">Explore games</JourneyLinkAction>}
    />
  );
}

/** The XP ring: the share of the current level earned, announced as one progress bar. */
function XpRing({ xp }: { xp: XpJourney }) {
  return (
    <div
      role="progressbar"
      aria-label="Level XP"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={xp.percent}
      aria-valuetext={`${xp.xpIntoLevel} of ${xp.xpPerLevel} XP to Level ${xp.nextLevel}`}
      className="relative h-40 w-40"
    >
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" className="text-journey-track" strokeWidth="9" />
        {xp.percent > 0 && <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" className="text-journey-signal" strokeWidth="9" pathLength="100" strokeDasharray={`${xp.percent} 100`} strokeLinecap="round" />}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-4xl leading-none">{xp.percent}%</span>
      </div>
    </div>
  );
}

/** The next goal as a flat row, not a card of its own: icon, label, title, requirement and a slim progress line. */
function NextAchievement({ achievement, hasAny }: { achievement: Achievement | undefined; hasAny: boolean }) {
  return (
    <div className="mt-3 flex items-start gap-3 border-t border-journey-edge/30 pt-3">
      <Trophy size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-journey-gold" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-journey-gold">Next achievement</p>
        {achievement ? (
          <>
            <p className="m-0 mt-0.5 truncate text-sm font-semibold" title={achievement.title}>{achievement.title}</p>
            <p className="m-0 line-clamp-2 text-xs leading-relaxed text-journey-detail" title={achievement.description}>{achievement.description}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div role="progressbar" aria-label="Achievement progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievement.progressPercent} className="h-1.5 flex-1 overflow-hidden rounded-full bg-journey-track">
                <div className="h-full rounded-full bg-journey-cyan" style={{ width: `${achievement.progressPercent}%` }} />
              </div>
              <span className="shrink-0 font-mono text-[11px] text-journey-cyan">{achievement.currentProgress} / {achievement.targetValue}</span>
            </div>
          </>
        ) : (
          <p className="m-0 mt-0.5 text-xs leading-relaxed text-journey-detail">{hasAny ? "Every available achievement is unlocked." : "Visit your trophy vault to load your achievements."}</p>
        )}
      </div>
    </div>
  );
}

/** Progress: the member's level, or an honest account prompt or error. */
function LevelProgressCard({ snapshot, isMember }: { snapshot: PlayerSnapshot; isMember: boolean }) {
  const xp = isMember && snapshot.profile ? describeXpJourney(snapshot.profile.experiencePoints) : null;
  const achievement = [...snapshot.achievements].filter(a => !a.unlocked)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];
  const icon = <Flag size={15} aria-hidden="true" />;

  if (!isMember) {
    return (
      <JourneyCard
        tone="level"
        icon={icon}
        eyebrow="Level progress"
        title="A journey of your own"
        description="A free account keeps your level and XP on every device."
        visual={<Trophy size={72} strokeWidth={1.25} className="text-journey-cyan" aria-hidden="true" />}
        details={<Link to="/login" className="flex min-h-[44px] items-center justify-center rounded-xl text-sm font-semibold text-journey-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-gold">Sign in</Link>}
        action={<JourneyLinkAction tone="level" to="/signup?from=home">Create account</JourneyLinkAction>}
      />
    );
  }

  if (!xp) {
    return (
      <JourneyCard
        tone="level"
        icon={icon}
        eyebrow="Level progress"
        title="Your progress is unavailable"
        description="We could not load your level. Try again from your profile."
        visual={<Flag size={72} strokeWidth={1.25} className="text-journey-cyan" aria-hidden="true" />}
        action={<JourneyLinkAction tone="level" to="/profile">Open profile</JourneyLinkAction>}
      />
    );
  }

  return (
    <JourneyCard
      tone="level"
      icon={icon}
      eyebrow="Level progress"
      title={`Level ${xp.level}`}
      description="Your next milestone is within reach."
      visual={<XpRing xp={xp} />}
      details={
        <>
          <p className="m-0 text-center text-xs font-semibold text-journey-cyan">{xp.xpIntoLevel} / {xp.xpPerLevel} XP · Level {xp.nextLevel} next</p>
          <NextAchievement achievement={achievement} hasAny={snapshot.achievements.length > 0} />
        </>
      }
      action={<JourneyLinkAction tone="level" to="/profile/achievements">View goals</JourneyLinkAction>}
    />
  );
}

/** Play now, next goal, bring your crew: one stop under each card, joined by a quiet line. Only where the cards sit side by side. */
function JourneyStageIndicator() {
  return (
    <ol aria-hidden="true" className="relative m-0 mt-6 hidden list-none grid-cols-3 gap-5 p-0 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-journey-soft xl:grid">
      <li className="flex items-center gap-2 text-journey-mint">
        <i className="h-2 w-2 shrink-0 rounded-full bg-journey-mint" /><span className="shrink-0">Play now</span>
        <span className="h-px flex-1 bg-gradient-to-r from-journey-mint/60 to-journey-cyan/40" />
      </li>
      <li className="flex items-center gap-2 text-journey-cyan">
        <i className="h-2 w-2 shrink-0 rounded-full bg-journey-cyan" /><span className="shrink-0">Next goal</span>
        <span className="h-px flex-1 bg-gradient-to-r from-journey-cyan/40 to-journey-violet/50" />
      </li>
      <li className="flex items-center gap-2 text-journey-violet">
        <i className="h-2 w-2 shrink-0 rounded-full bg-journey-violet" /><span className="shrink-0">Bring your crew</span>
      </li>
    </ol>
  );
}

/**
 * One column on a phone, two from `md` (the third card spans both), three from `xl`. Not `lg`: at 1024px the app
 * sidebar leaves the main area about 680px wide, and three cards of 196px cannot hold their labels.
 */
const GRID = "relative grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5";

export function PlayerJourneyDashboard({ onSelect, snapshot, isMember = true }: {
  onSelect: (slug: BhalyamGameSlug) => void;
  snapshot: PlayerSnapshot;
  isMember?: boolean;
}) {
  const xp = isMember && snapshot.profile ? describeXpJourney(snapshot.profile.experiencePoints) : null;
  const loading = isMember && !snapshot.ready;

  return (
    <RevealOnScroll as="section" amount={0.1} className="bhalyam-journey relative my-8 isolate overflow-hidden rounded-[28px] border border-journey-edge bg-journey-canvas px-4 py-6 text-journey-ink shadow-[0_22px_65px_-32px_#071426aa] sm:px-6 sm:py-8">
      <JourneyLandscape />
      <header className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-journey-gold">Your personal playground</p>
          <h2 className="font-display text-[25px] leading-tight sm:text-[32px]">Your Journey Continues</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-journey-soft">Play your next game, reach a milestone, and bring your crew along.</p>
        </div>
        {xp && !loading && (
          <span className="rounded-full border border-journey-cyan/40 bg-journey-chip px-3 py-2 text-xs font-semibold text-journey-cyan">Level {xp.level}</span>
        )}
      </header>

      {loading ? (
        <div role="status" aria-label="Loading player progress" aria-busy="true" className={GRID}>
          <span className="sr-only">Loading player progress</span>
          {[0, 1, 2].map(i => <div key={i} className={`h-[430px] rounded-2xl border border-journey-edge bg-journey-chip p-6 motion-safe:animate-pulse ${i === 2 ? "md:col-span-2 xl:col-span-1" : ""}`}>
            <div className="h-5 w-32 rounded bg-journey-skeleton/70" /><div className="mt-8 h-44 rounded-xl bg-journey-skeleton/60" /><div className="mt-8 h-12 rounded-xl bg-journey-skeleton/60" />
          </div>)}
        </div>
      ) : (
        <div className={GRID}>
          <JumpBackInCard onSelect={onSelect} snapshot={snapshot} isMember={isMember} />
          <LevelProgressCard snapshot={snapshot} isMember={isMember} />
          <SocialQuestCard isMember={isMember} className="md:col-span-2 xl:col-span-1" />
        </div>
      )}
      <JourneyStageIndicator />
    </RevealOnScroll>
  );
}
