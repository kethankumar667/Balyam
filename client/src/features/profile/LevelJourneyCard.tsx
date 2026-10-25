import { useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Coins, Gamepad2, Handshake, Route, Trophy, Zap } from "lucide-react";
import { LevelRoadmapModal } from "../../components/progression/LevelRoadmapModal";
import { MiniclipLevelBadge } from "../../components/progression/MiniclipLevelBadge";
import { describeXpJourney, type EarnWay } from "../../lib/xpJourney";
import { CommandRoomArtwork } from "./CommandRoomArtwork";

const EARN_ICON: Record<EarnWay["id"], typeof Trophy> = { win: Trophy, draw: Handshake, played: Gamepad2 };
const ACTION = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--command-edge)] bg-surface-0 px-3 text-xs font-bold text-ink-hi hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--command-gold)]";

interface LevelJourneyCardProps {
  experiencePoints: number;
  playerId?: string;
  onPlay?: () => void;
}

/** Presentation only: XP and rewards remain derived from the shared progression model. */
export default function LevelJourneyCard({ experiencePoints, playerId, onPlay }: LevelJourneyCardProps) {
  const journey = useMemo(() => describeXpJourney(experiencePoints), [experiencePoints]);
  const reduceMotion = useReducedMotion() ?? false;
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const gradientId = useId();
  const titleId = useId();
  const next = journey.upcoming[0];

  return <>
    <section aria-labelledby={titleId} className="profile-command overflow-hidden rounded-2xl border border-[var(--command-edge)] bg-surface-1">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--command-edge)] px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--command-gold)]">Your career, your next move</p>
          <h2 id={titleId} className="mt-1 font-display text-2xl uppercase text-ink-hi sm:text-3xl">Player command center</h2>
          <p className="mt-1 text-xs text-ink-mid">Play. Progress. Collect. Relive.</p>
        </div>
        <button type="button" onClick={() => setIsRoadmapOpen(true)} className={ACTION}><Route size={16} aria-hidden="true" />Level Roadmap</button>
      </header>
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1.1fr_1fr_1fr]">
        <div className="relative isolate overflow-hidden rounded-xl border border-[var(--command-edge)] bg-surface-0 p-5 text-center">
          <CommandRoomArtwork />
          <div className="relative">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[.15em] text-[var(--command-gold)]">Level & XP</h3>
            <div className="relative mx-auto h-44 w-44">
              <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90" aria-hidden="true">
                <defs><linearGradient id={gradientId}><stop stopColor="var(--command-gold)" /><stop offset="1" stopColor="var(--command-cyan)" /></linearGradient></defs>
                <circle cx="88" cy="88" r="77" fill="none" stroke="var(--command-track)" strokeWidth="9" />
                <motion.circle cx="88" cy="88" r="77" fill="none" stroke={`url(#${gradientId})`} strokeWidth="9" strokeLinecap="round"
                  initial={{ pathLength: reduceMotion ? journey.percent / 100 : 0 }} animate={{ pathLength: journey.percent / 100 }}
                  transition={{ duration: reduceMotion ? 0 : 1, ease: "easeOut" }} />
              </svg>
              <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center"><MiniclipLevelBadge level={journey.level} size="xl" animated={false} showTitle={false} showTooltip={false} /></div>
            </div>
            <p className="mt-3 text-lg font-bold text-ink-hi">{journey.title}</p>
            <p className="mt-1 text-xs text-ink-mid">{journey.tier.name} tier · Level {journey.level}</p>
            <p className="mt-4 font-mono text-lg font-bold text-ink-hi"><span>{journey.xpIntoLevel}</span><span className="text-xs text-ink-mid"> / {journey.xpPerLevel} XP</span></p>
            <div role="progressbar" aria-label={`Level ${journey.level} experience`} aria-valuemin={0} aria-valuemax={journey.xpPerLevel} aria-valuenow={journey.xpIntoLevel}
              className="mx-auto mt-2 h-2 max-w-60 overflow-hidden rounded-full bg-[var(--command-track)]">
              <div className="h-full rounded-full bg-[var(--command-cyan)]" style={{ width: `${journey.percent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-mid">{journey.winsToLevel <= 1 ? `One win takes you to Level ${journey.nextLevel}.` : `${journey.xpToNext} XP to reach Level ${journey.nextLevel}`}</p>
            <p className="mt-2 inline-block rounded-full bg-surface-0 px-3 py-1 text-[11px] text-ink-mid">Lifetime <span className="font-mono font-bold">{journey.lifetimeXp.toLocaleString()}</span> XP</p>
          </div>
        </div>
        <section aria-label="Ways to earn XP" className="rounded-xl border border-[var(--command-edge)] bg-surface-0 p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--command-cyan)]"><Zap size={17} aria-hidden="true" />Ways to earn XP</h3>
          <p className="mt-2 text-xs leading-relaxed text-ink-mid">A little progress, every time you play.</p>
          <ul className="mt-5 divide-y divide-[var(--command-edge)]">
            {journey.earn.map(way => {
              const Icon = EARN_ICON[way.id];
              return <li key={way.id} className="flex items-center gap-3 py-5 first:pt-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--command-edge)] bg-surface-1 text-[var(--command-cyan)]"><Icon size={21} aria-hidden="true" /></span>
                <div><p className="text-sm font-semibold text-ink-hi">{way.label}</p><p className="mt-1 font-mono text-sm font-bold text-[var(--command-gold)]"><span>+{way.xp}</span> XP</p></div>
              </li>;
            })}
          </ul>
          {onPlay && <button type="button" onClick={onPlay} className={`${ACTION} mt-2 w-full !border-transparent !bg-amber-300 !text-stone-950`}><Gamepad2 size={17} aria-hidden="true" />Play a game</button>}
          <p className="mt-4 text-[11px] leading-relaxed text-ink-mid">These are the base XP amounts. Your match result determines what you earn.</p>
        </section>
        <section aria-label="Next rewards" className="rounded-xl border border-[var(--command-edge)] bg-surface-0 p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--command-gold)]"><Trophy size={17} aria-hidden="true" />Next rewards</h3>
          {next ? <>
            <div className="mt-4 rounded-xl border border-[var(--command-edge)] bg-surface-1 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--command-gold)]">Next</p>
              <p className="mt-2 text-lg font-bold text-ink-hi">Level {next.level}</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[var(--command-gold)]"><Coins size={18} aria-hidden="true" /><span>+{next.coins.toLocaleString()}</span> coins</p>
              {next.title && <p className="mt-2 text-xs text-ink-hi">Title: {next.title}</p>}
              {next.perk && <p className="mt-2 text-xs text-ink-mid">{next.perk}</p>}
              <p className="mt-3 text-xs text-ink-mid">Level {next.level} · {next.levelsAway} {next.levelsAway === 1 ? "level" : "levels"} away</p>
            </div>
            <ol className="mt-3 space-y-3">
              {journey.upcoming.slice(1).map(m => <li key={m.level} className="flex flex-wrap justify-between gap-1 border-b border-[var(--command-edge)] pb-2 text-xs">
                <span className="text-ink-mid">Level {m.level} · {m.levelsAway} levels away</span>
                <span className="font-mono font-bold text-[var(--command-gold)]">+{m.coins.toLocaleString()}</span>
                {m.title && <span className="w-full text-ink-mid">Title: {m.title}</span>}
                {m.perk && <span className="w-full text-ink-mid">{m.perk}</span>}
              </li>)}
            </ol>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-mid">See and claim earned rewards in your Level Roadmap.</p>
          </> : <p className="mt-5 text-sm leading-relaxed text-ink-mid">You have reached every milestone on the roadmap. Keep playing for the memories.</p>}
        </section>
      </div>
    </section>
    <LevelRoadmapModal isOpen={isRoadmapOpen} onClose={() => setIsRoadmapOpen(false)} experiencePoints={experiencePoints} playerId={playerId} />
  </>;
}
