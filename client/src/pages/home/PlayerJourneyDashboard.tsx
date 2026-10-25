import { Link } from "react-router-dom";
import { ArrowRight, Flag, Gamepad2, Trophy } from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import { describeXpJourney } from "../../lib/xpJourney";
import type { PlayerSnapshot } from "../../hooks/usePlayerSnapshot";
import { BHALYAM_GAMES, type BhalyamGameSlug } from "../../components/bhalyam/data";
import { TILE_ART_BY_GAME } from "./gameArt";
import { JourneyLandscape } from "./JourneyArtwork";
import { ReferralQuest } from "./ReferralQuest";

const ACTION = "mt-auto inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-gold focus-visible:ring-offset-4 focus-visible:ring-offset-journey-chip";
const CARD = "relative flex min-w-0 flex-col rounded-2xl border p-5 sm:p-6";

export function PlayerJourneyDashboard({ onSelect, snapshot, isMember = true }: {
  onSelect: (slug: BhalyamGameSlug) => void;
  snapshot: PlayerSnapshot;
  isMember?: boolean;
}) {
  const lastMatch = isMember ? snapshot.matches[0] : undefined;
  const game = lastMatch ? BHALYAM_GAMES.find(g => g.slug === lastMatch.game) : undefined;
  const stats = lastMatch && !snapshot.stats?.demo ? snapshot.stats?.perGame[lastMatch.game] : undefined;
  const xp = isMember && snapshot.profile ? describeXpJourney(snapshot.profile.experiencePoints) : null;
  const achievement = [...snapshot.achievements].filter(a => !a.unlocked)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];
  const loading = isMember && !snapshot.ready;

  return (
    <RevealOnScroll as="section" amount={0.1} className="bhalyam-journey relative my-8 isolate overflow-hidden rounded-[28px] border border-journey-edge bg-journey-canvas px-4 py-6 text-journey-ink shadow-[0_22px_65px_-32px_#071426aa] sm:px-6 sm:py-7">
      <JourneyLandscape />
      <header className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-journey-gold">Your personal playground</p>
          <h2 className="font-display text-[25px] leading-tight sm:text-[32px]">Your Journey Continues</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-journey-soft">Play your next game, reach a milestone, and bring your crew together.</p>
        </div>
        {xp && !loading && (
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-journey-cyan/40 bg-journey-chip px-3 py-2 text-journey-cyan">Level {xp.level}</span>
            {achievement && <span className="rounded-full border border-journey-violet/40 bg-journey-chip px-3 py-2 text-journey-violet">Next goal: {achievement.progressPercent}%</span>}
          </div>
        )}
      </header>

      {loading ? (
        <div role="status" aria-label="Loading player progress" aria-busy="true" className="grid gap-4 lg:grid-cols-3">
          <span className="sr-only">Loading player progress</span>
          {[1, 2, 3].map(i => <div key={i} className="h-[430px] rounded-2xl border border-journey-edge bg-journey-chip p-6 motion-safe:animate-pulse">
            <div className="h-5 w-32 rounded bg-journey-skeleton/70" /><div className="mt-8 h-44 rounded-xl bg-journey-skeleton/60" /><div className="mt-8 h-12 rounded-xl bg-journey-skeleton/60" />
          </div>)}
        </div>
      ) : (
        <div className="relative grid gap-4 border-l border-journey-edge pl-3 lg:grid-cols-[1.08fr_1fr_1fr] lg:border-0 lg:pl-0">
          <article className={`${CARD} border-journey-mint/40 bg-gradient-to-b from-journey-play-start/95 to-journey-play-end/95`}>
            <span aria-hidden="true" className="absolute -left-[17px] top-7 h-2 w-2 rounded-full bg-journey-mint lg:hidden" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-journey-mint"><Gamepad2 size={16} aria-hidden="true" /> Jump back in</p>
              {lastMatch && <span className="text-[10px] text-journey-soft">{formatTimeAgo(lastMatch.finishedAt)}</span>}
            </div>
            {game && lastMatch ? (
              <>
                <div className="relative my-4 flex h-[190px] items-center justify-center overflow-hidden rounded-xl border border-journey-gold/20 bg-[radial-gradient(ellipse_at_50%_100%,rgb(var(--journey-gold)/0.2),transparent_70%)] sm:h-[260px] lg:h-[280px]">
                  <picture className="h-full w-full">
                    <source type="image/avif" srcSet={TILE_ART_BY_GAME[game.slug].replace(/\.(png|jpg|jpeg)$/i, ".avif")} />
                    <source type="image/webp" srcSet={TILE_ART_BY_GAME[game.slug].replace(/\.(png|jpg|jpeg)$/i, ".webp")} />
                    <img src={TILE_ART_BY_GAME[game.slug]} alt="" width={280} height={210} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-300 motion-safe:hover:scale-[1.03] motion-reduce:transition-none" />
                  </picture>
                </div>
                <h3 className="font-display text-2xl leading-tight">{game.title}</h3>
                <p className="mt-2 text-xs text-journey-mint">Last match: {lastMatch.result === "WIN" ? "Won" : lastMatch.result === "DRAW" ? "Draw" : "Played"}</p>
                {stats && <p className="mt-1 text-xs text-journey-soft">{stats.wins} wins in this game</p>}
                <p className="mb-5 mt-3 text-xs leading-relaxed text-journey-soft">A fresh table. The same favourite game.</p>
                <button type="button" onClick={() => onSelect(game.slug)} className={`${ACTION} border-journey-mint/60 bg-journey-play-action text-white hover:bg-journey-play-hover`}>
                  Play {game.title} again <ArrowRight size={17} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <div className="my-6 flex h-[170px] items-center justify-center rounded-xl border border-dashed border-journey-mint/40 bg-journey-mint/10"><Gamepad2 size={70} strokeWidth={1} className="text-journey-mint" aria-hidden="true" /></div>
                <h3 className="font-display text-2xl">Make your next memory</h3>
                <p className="mb-6 mt-3 text-sm leading-relaxed text-journey-soft">{isMember && !snapshot.profile ? "Your recent game could not be loaded. You can still choose a game." : "Choose a favourite and start a new game. Your next completed match belongs here."}</p>
                <Link to="/games" className={`${ACTION} border-journey-mint/60 bg-journey-play-action text-white hover:bg-journey-play-hover`}>Explore games <ArrowRight size={17} aria-hidden="true" /></Link>
              </>
            )}
          </article>

          <article className={`${CARD} border-journey-cyan/40 bg-gradient-to-b from-journey-level-start/95 to-journey-level-end/95`}>
            <span aria-hidden="true" className="absolute -left-[17px] top-7 h-2 w-2 rounded-full bg-journey-cyan lg:hidden" />
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-journey-cyan"><Flag size={15} aria-hidden="true" /> Level progress</p>
            {!isMember ? (
              <div className="flex flex-1 flex-col justify-center">
                <Trophy className="my-7 self-center text-journey-cyan" size={64} strokeWidth={1} aria-hidden="true" />
                <h3 className="font-display text-xl">A journey of your own</h3>
                <p className="mb-6 mt-3 text-sm leading-relaxed text-journey-soft">Create a free account to keep your level, XP and achievements across devices.</p>
                <Link to="/signup?from=home" className={`${ACTION} border-journey-cyan/60 bg-journey-cyan/10 text-journey-cyan hover:bg-journey-cyan/20`}>Create account <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link to="/login" className="mt-2 flex min-h-[44px] items-center justify-center rounded-xl text-sm text-journey-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journey-gold">Sign in</Link>
              </div>
            ) : xp ? (
              <>
                <div className="relative mx-auto my-4 h-[180px] w-[180px]">
                  <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" className="text-journey-track" strokeWidth="7" />
                    <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" className="text-journey-signal" strokeWidth="7" pathLength="100" strokeDasharray={`${xp.percent} 100`} strokeLinecap="round" />
                    <circle cx="80" cy="80" r="57" fill="none" stroke="currentColor" className="text-journey-violet" strokeWidth="1" strokeDasharray="2 7" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-journey-cyan">Level</span>
                    <span className="font-display text-[45px] leading-tight">{xp.level}</span>
                    <span className="font-mono text-xs text-journey-cyan">{xp.percent}% XP</span>
                  </div>
                </div>
                <div role="progressbar" aria-label="Level XP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xp.percent} aria-valuetext={`${xp.xpIntoLevel} of ${xp.xpPerLevel} XP to Level ${xp.nextLevel}`}>
                  <p className="text-center text-xs font-semibold text-journey-cyan">{xp.xpIntoLevel} / {xp.xpPerLevel} XP to Level {xp.nextLevel}</p>
                </div>
                <div className="mb-5 mt-5 rounded-xl border border-journey-violet/25 bg-journey-panel/80 p-3.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-journey-gold">Next achievement</p>
                  {achievement ? <>
                    <h3 className="mt-2 font-display text-lg">{achievement.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-journey-detail">{achievement.description}</p>
                    <div className="mb-2 mt-3 flex justify-between gap-2 font-mono text-[11px] text-journey-violet"><span>{achievement.currentProgress} / {achievement.targetValue}</span><span>{achievement.progressPercent}%</span></div>
                    <div role="progressbar" aria-label="Achievement progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievement.progressPercent} className="h-1.5 overflow-hidden rounded-full bg-journey-track"><div className="h-full rounded-full bg-journey-violet" style={{ width: `${achievement.progressPercent}%` }} /></div>
                  </> : <p className="mt-2 text-xs leading-relaxed text-journey-detail">{snapshot.achievements.length ? "Every available achievement is unlocked." : "Visit your trophy vault to load your achievements."}</p>}
                </div>
                <Link to="/profile/achievements" className={`${ACTION} border-journey-cyan/60 bg-journey-cyan/10 text-journey-cyan hover:bg-journey-cyan/20`}>View goals <ArrowRight size={17} aria-hidden="true" /></Link>
              </>
            ) : (
              <div className="flex flex-1 flex-col justify-center py-6">
                <h3 className="font-display text-xl">Your progress is unavailable</h3>
                <p className="mb-6 mt-3 text-sm leading-relaxed text-journey-soft">We could not load your level and achievements. Open your profile to try again.</p>
                <Link to="/profile" className={`${ACTION} border-journey-cyan/60 text-journey-cyan`}>Open profile <ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
            )}
          </article>
          <ReferralQuest isMember={isMember} />
        </div>
      )}
      <div aria-hidden="true" className="relative mt-6 hidden items-center justify-between px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-journey-soft lg:flex">
        <span className="flex items-center gap-2 text-journey-mint"><i className="h-2 w-2 rounded-full bg-journey-mint" /> Play now</span>
        <span className="mx-4 h-px flex-1 bg-gradient-to-r from-journey-mint/60 to-journey-cyan/40" />
        <span className="flex items-center gap-2 text-journey-cyan"><i className="h-2 w-2 rounded-full border border-journey-cyan" /> Next goal</span>
        <span className="mx-4 h-px flex-1 bg-gradient-to-r from-journey-cyan/40 to-journey-violet/50" />
        <span className="flex items-center gap-2 text-journey-violet"><i className="h-2 w-2 rounded-full border border-journey-violet" /> Bring your crew</span>
      </div>
    </RevealOnScroll>
  );
}
