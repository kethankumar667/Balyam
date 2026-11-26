import { useId, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Coins, Gamepad2 } from "lucide-react";
import { LevelRoadmapModal } from "../../../components/progression/LevelRoadmapModal";
import { MiniclipLevelBadge } from "../../../components/progression/MiniclipLevelBadge";
import { describeXpJourney, type XpJourney } from "../../../lib/xpJourney";

const PRIMARY_ACTION =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-chest-600 px-4 text-base font-bold text-white shadow-[0_8px_18px_-12px_rgba(126,49,3,0.8)] transition hover:bg-chest-700 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1";
const TEXT_ACTION =
  "inline-flex min-h-[44px] items-center gap-1 rounded-lg text-sm font-bold text-[var(--command-cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--command-gold)]";

/** What a nudge toward the next level says, from the same canonical numbers the progress line uses. */
export function describeNextStep(journey: Pick<XpJourney, "nextLevel" | "winsToLevel" | "matchesToLevel">): string {
  if (journey.winsToLevel <= 1) return `One win takes you to Level ${journey.nextLevel}.`;
  return `${journey.winsToLevel} wins, or ${journey.matchesToLevel} matches, take you to Level ${journey.nextLevel}.`;
}

export interface NextMoveCardProps {
  experiencePoints: number;
  playerId?: string;
  onPlay: () => void;
}

/**
 * The phone's one place for "where am I and what do I do next": current level, XP into it, how far to the
 * next, the single primary action, the XP rules (collapsed) and only the NEXT reward. The full milestone
 * list stays in the Level Roadmap, one tap away.
 */
export function NextMoveCard({ experiencePoints, playerId, onPlay }: NextMoveCardProps) {
  const journey = useMemo(() => describeXpJourney(experiencePoints), [experiencePoints]);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isEarnOpen, setIsEarnOpen] = useState(false);
  const titleId = useId();
  const earnPanelId = useId();
  const next = journey.upcoming[0];
  const toNext = `${journey.xpToNext} XP to Level ${journey.nextLevel}`;

  return (
    <>
      <section aria-labelledby={titleId} className="overflow-hidden rounded-2xl border border-[var(--command-edge)] bg-surface-1">
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--command-gold)]">Your next move</p>
          <h2 id={titleId} className="mt-1 font-display text-xl uppercase text-ink-hi">Player command center</h2>
          <p className="mt-0.5 text-xs text-ink-mid">Play. Progress. Collect. Relive.</p>

          <div className="mt-4 flex items-center gap-3">
            <span aria-hidden="true" className="shrink-0">
              <MiniclipLevelBadge level={journey.level} size="lg" showTitle={false} showTooltip={false} animated={false} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-black leading-tight text-ink-hi">Level {journey.level}</p>
              <p className="text-sm font-semibold text-ink-mid">{journey.title}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-base font-bold text-ink-hi">
                {journey.xpIntoLevel}
                <span className="text-xs font-semibold text-ink-mid"> / {journey.xpPerLevel} XP</span>
              </p>
              <p className="text-xs font-bold text-[var(--command-gold)]">{toNext}</p>
            </div>
            <div
              role="progressbar"
              aria-label={`Level ${journey.level} experience`}
              aria-valuemin={0}
              aria-valuemax={journey.xpPerLevel}
              aria-valuenow={journey.xpIntoLevel}
              aria-valuetext={`${journey.xpIntoLevel} of ${journey.xpPerLevel} XP, ${toNext}`}
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--command-track)]"
            >
              <div className="h-full rounded-full bg-[var(--command-gold)] motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${journey.percent}%` }} />
            </div>
            <p className="mt-2 text-balance text-sm font-semibold text-ink-hi">{describeNextStep(journey)}</p>
            <p className="mt-0.5 text-[11px] text-ink-mid">Lifetime <span className="font-mono font-bold">{journey.lifetimeXp.toLocaleString()}</span> XP</p>
          </div>

          <button type="button" onClick={onPlay} className={`${PRIMARY_ACTION} mt-4`}>
            <Gamepad2 className="h-5 w-5" aria-hidden="true" />
            Play now
          </button>

          <div className="mt-3 border-t border-[var(--command-edge)]">
            <button
              type="button"
              onClick={() => setIsEarnOpen((open) => !open)}
              aria-expanded={isEarnOpen}
              aria-controls={earnPanelId}
              className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg text-sm font-semibold text-ink-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--command-gold)]"
            >
              How to earn XP
              <ChevronDown className={`h-4 w-4 text-ink-mid motion-safe:transition-transform ${isEarnOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <div id={earnPanelId} hidden={!isEarnOpen}>
              <ul className="divide-y divide-[var(--command-edge)] pb-1">
                {journey.earn.map((way) => (
                  <li key={way.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="text-ink-hi">{way.label}</span>
                    <span className="font-mono font-bold text-[var(--command-gold)]">+{way.xp} XP</span>
                  </li>
                ))}
              </ul>
              <p className="pb-2 text-[11px] leading-relaxed text-ink-mid">These are the base XP amounts. Your match result determines what you earn.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--command-edge)] bg-surface-0 px-4 py-3">
          {next ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--command-gold)]">Next reward · Level {next.level}</p>
              <p className="mt-1.5 flex items-center gap-2 text-lg font-black text-ink-hi">
                <Coins className="h-5 w-5 text-[var(--command-gold)]" aria-hidden="true" />
                +{next.coins.toLocaleString()} coins
              </p>
              {next.title ? <p className="mt-1 text-sm font-semibold text-ink-hi">Title: {next.title}</p> : null}
              {next.perk ? <p className="mt-0.5 text-xs text-ink-mid">{next.perk}</p> : null}
              <p className="mt-1 text-xs text-ink-mid">{next.levelsAway} {next.levelsAway === 1 ? "level" : "levels"} away</p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink-mid">You have reached every milestone on the roadmap. Keep playing for the memories.</p>
          )}
          <button type="button" onClick={() => setIsRoadmapOpen(true)} className={`${TEXT_ACTION} mt-1`}>
            View level roadmap <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </section>
      <LevelRoadmapModal isOpen={isRoadmapOpen} onClose={() => setIsRoadmapOpen(false)} experiencePoints={experiencePoints} playerId={playerId} />
    </>
  );
}
