import { useEffect, useId, useMemo, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Coins, Gamepad2, Handshake, Route, Trophy, Zap } from "lucide-react";
import { LevelRoadmapModal } from "../../components/progression/LevelRoadmapModal";
import { MiniclipLevelBadge } from "../../components/progression/MiniclipLevelBadge";
import { describeXpJourney, type EarnWay, type UpcomingMilestone, type XpJourney } from "../../lib/xpJourney";
import { ProfileSection } from "./ProfilePrimitives";

/**
 * The profile's Level & XP card.
 *
 * One calm place that answers the three questions a player has about progress: where am I (the ring and the
 * bar), what moves me forward (the ways to earn), and what is waiting for me (the next real rewards). Every
 * number comes from `describeXpJourney`, i.e. the player's real XP, never from filler.
 *
 * Motion has a job each time: the ring and bar draw in so the level reads as something earned, the light that
 * sweeps the bar says "this is live", and the pulse on the nearest reward points at the next step. Only
 * transform and opacity animate, and reduced motion gets the finished state with nothing moving.
 */

const RING_SIZE = 176;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = 76;
const RING_STROKE = 10;
const SPARK_RADIUS = 7;
/** The lamp gold the profile family already uses, so every tier's bar ends in the same warm light. */
const LAMP_GOLD = "#f5c451";
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const EARN_ICON: Record<EarnWay["id"], typeof Trophy> = { win: Trophy, draw: Handshake, played: Gamepad2 };

interface LevelJourneyCardProps {
  experiencePoints: number;
  playerId?: string;
}

export default function LevelJourneyCard({ experiencePoints, playerId }: LevelJourneyCardProps) {
  const journey = useMemo(() => describeXpJourney(experiencePoints), [experiencePoints]);
  const reduceMotion = useReducedMotion() ?? false;
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const countedXp = useCountedNumber(journey.xpIntoLevel, reduceMotion);
  const { tier } = journey;
  const barGradient = `linear-gradient(90deg, ${tier.themeColor}, ${LAMP_GOLD})`;

  return (
    <>
      <ProfileSection
        id="level-xp"
        title="Level & XP"
        description="Your real progress, level by level."
        icon={Zap}
        accent="gold"
        action={(
          <button
            type="button"
            onClick={() => setIsRoadmapOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-lamp-800 transition hover:bg-lamp-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:text-lamp-300 dark:hover:bg-lamp-500/10"
          >
            <Route className="h-3.5 w-3.5" aria-hidden="true" />
            Roadmap
          </button>
        )}
      >
        <div className="relative">
          <p className="sr-only">
            Level {journey.level}, {journey.title}. {journey.xpIntoLevel} of {journey.xpPerLevel} XP into this level,
            {" "}{journey.xpToNext} XP to Level {journey.nextLevel}.
          </p>

          {/* The tier's own colour, breathing very slowly behind the ring. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-12 h-64 w-64 rounded-full blur-3xl"
            style={{ background: tier.glowColor }}
            initial={{ opacity: reduceMotion ? 0.6 : 0 }}
            animate={reduceMotion ? { opacity: 0.6 } : { opacity: [0.35, 0.7, 0.35] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative grid items-center gap-6 sm:gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
            <LevelRing
              level={journey.level}
              percent={journey.percent}
              themeColor={tier.themeColor}
              reduceMotion={reduceMotion}
            />

            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-surface-0 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mid dark:border-slate-700/80">
                <span className="h-2 w-2 rounded-full" style={{ background: tier.themeColor }} aria-hidden="true" />
                {tier.name} tier · Level {journey.level}
              </p>
              <h4 className="mt-2.5 text-2xl font-black leading-tight text-ink-hi sm:text-3xl">{journey.title}</h4>

              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-ink-hi">
                  <span className="text-3xl font-black tabular-nums sm:text-4xl">
                    {countedXp}
                  </span>
                  <span className="ml-1.5 text-sm font-bold text-ink-mid">/ {journey.xpPerLevel} XP</span>
                </p>
                <p className="text-xs font-semibold text-ink-mid">
                  Lifetime <span className="font-mono font-bold tabular-nums text-ink-hi">{journey.lifetimeXp.toLocaleString()}</span> XP
                </p>
              </div>

              <SegmentedBar journey={journey} gradient={barGradient} glow={tier.glowColor} reduceMotion={reduceMotion} />

              <div className="mt-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-ink-lo">
                <span>Level {journey.level}</span>
                <span>Level {journey.nextLevel}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-mid">{nextStepCopy(journey.xpToNext, journey.winsToLevel, journey.matchesToLevel, journey.nextLevel)}</p>
            </div>
          </div>

          <div className="relative mt-6 grid gap-6 border-t border-stone-300/70 pt-6 dark:border-slate-700/70 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
            <div>
              <h5 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-lo">Ways to earn XP</h5>
              <ul className="mt-3 grid grid-cols-3 gap-2.5 lg:grid-cols-1">
                {journey.earn.map((way, index) => (
                  <EarnTile key={way.id} way={way} index={index} reduceMotion={reduceMotion} />
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-lo">Next rewards</h5>
              {journey.upcoming.length > 0 ? (
                <ol className="mt-3">
                  {journey.upcoming.map((milestone, index) => (
                    <RewardStep
                      key={milestone.level}
                      milestone={milestone}
                      isLast={index === journey.upcoming.length - 1}
                      index={index}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </ol>
              ) : (
                <p className="mt-3 rounded-xl border border-stone-300/70 bg-surface-0 p-4 text-sm text-ink-mid dark:border-slate-700/70">
                  You have reached every milestone on the roadmap. Everything from here is bragging rights.
                </p>
              )}
            </div>
          </div>
        </div>
      </ProfileSection>

      <LevelRoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
        experiencePoints={experiencePoints}
        playerId={playerId}
      />
    </>
  );
}

/** A number that counts up to `target` in step with the ring, or simply is `target` under reduced motion. */
function useCountedNumber(target: number, reduceMotion: boolean): number {
  const [value, setValue] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 1.4,
      delay: 0.2,
      ease: EASE_OUT,
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [target, reduceMotion]);
  return value;
}

function nextStepCopy(xpToNext: number, wins: number, matches: number, nextLevel: number): string {
  if (xpToNext <= 0) return `You are ready for Level ${nextLevel}.`;
  if (wins <= 1) return `One win takes you to Level ${nextLevel}.`;
  return `${xpToNext} XP to Level ${nextLevel}: about ${wins} wins, or ${matches} matches of any result.`;
}

/** The ring that draws itself, with a spark riding its leading edge. */
function LevelRing({ level, percent, themeColor, reduceMotion }: { level: number; percent: number; themeColor: string; reduceMotion: boolean }) {
  const gradientId = useId();
  const fraction = Math.min(1, Math.max(0, percent / 100));
  const finalAngle = fraction * 360;

  return (
    <div className="relative mx-auto h-[148px] w-[148px] shrink-0 sm:h-[176px] sm:w-[176px]">
      <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={themeColor} />
            <stop offset="1" stopColor={LAMP_GOLD} />
          </linearGradient>
        </defs>
        <circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} fill="none" strokeWidth={RING_STROKE} className="stroke-stone-300/80 dark:stroke-slate-700/80" />
        <motion.circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          initial={{ pathLength: reduceMotion ? fraction : 0 }}
          animate={{ pathLength: fraction }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.4, delay: 0.2, ease: EASE_OUT }}
        />
        {fraction > 0 ? (
          <motion.g
            style={{ originX: 0.5, originY: 0.5 }}
            initial={{ rotate: reduceMotion ? finalAngle : 0 }}
            animate={{ rotate: finalAngle }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.4, delay: 0.2, ease: EASE_OUT }}
          >
            {/* An unpainted full-size circle so the group rotates about the ring's centre. */}
            <circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS + RING_STROKE / 2} fill="none" />
            <circle cx={RING_CENTER + RING_RADIUS} cy={RING_CENTER} r={SPARK_RADIUS} fill="#ffffff" stroke={themeColor} strokeWidth={2} />
          </motion.g>
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <MiniclipLevelBadge level={level} size="xl" animated={!reduceMotion} showTitle={false} />
      </div>
    </div>
  );
}

/** One segment per 10 XP, filling in sequence, with a band of light sweeping across. */
function SegmentedBar({ journey, gradient, glow, reduceMotion }: { journey: XpJourney; gradient: string; glow: string; reduceMotion: boolean }) {
  const { count, full, partial } = journey.segments;
  return (
    <div
      role="progressbar"
      aria-label={`Level ${journey.level} experience`}
      aria-valuemin={0}
      aria-valuemax={journey.xpPerLevel}
      aria-valuenow={journey.xpIntoLevel}
      className="relative mt-3 overflow-hidden rounded-full"
    >
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {Array.from({ length: count }, (_, index) => {
          const fill = index < full ? 1 : index === full ? partial : 0;
          return (
            <div key={index} className="h-3.5 overflow-hidden rounded-[5px] bg-stone-300/70 dark:bg-slate-700/70 sm:h-4">
              <motion.div
                className="h-full w-full origin-left rounded-[5px]"
                style={{ background: gradient, boxShadow: fill === 1 ? `0 0 12px ${glow}` : undefined }}
                initial={{ scaleX: reduceMotion ? fill : 0 }}
                animate={{ scaleX: fill }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay: 0.3 + index * 0.07, ease: "easeOut" }}
              />
            </div>
          );
        })}
      </div>
      {!reduceMotion && journey.xpIntoLevel > 0 ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/5 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          initial={{ x: "-120%" }}
          animate={{ x: "560%" }}
          transition={{ duration: 2.2, delay: 1.6, repeat: Infinity, repeatDelay: 3.2, ease: "easeInOut" }}
        />
      ) : null}
    </div>
  );
}

function EarnTile({ way, index, reduceMotion }: { way: EarnWay; index: number; reduceMotion: boolean }) {
  const Icon = EARN_ICON[way.id];
  return (
    <motion.li
      className="flex flex-col items-center rounded-xl border border-stone-300/70 bg-surface-0 px-2 py-3 text-center dark:border-slate-700/70 lg:flex-row lg:gap-3 lg:px-4 lg:text-left"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 + index * 0.1, ease: "easeOut" }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lamp-100 text-lamp-800 dark:bg-lamp-500/15 dark:text-lamp-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="mt-2 font-mono text-lg font-black tabular-nums text-ink-hi lg:mt-0 lg:order-3 lg:ml-auto lg:text-xl">
        +{way.xp}<span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-ink-lo">XP</span>
      </span>
      <span className="mt-1 text-xs font-semibold leading-tight text-ink-mid lg:mt-0 lg:order-2 lg:text-sm">{way.label}</span>
    </motion.li>
  );
}

function RewardStep({ milestone, isLast, index, reduceMotion }: { milestone: UpcomingMilestone; isLast: boolean; index: number; reduceMotion: boolean }) {
  const away = milestone.levelsAway === 1 ? "1 level away" : `${milestone.levelsAway} levels away`;
  return (
    <motion.li
      className="relative flex gap-3.5 pb-4 last:pb-0"
      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.6 + index * 0.1, ease: "easeOut" }}
    >
      {!isLast ? <span className="absolute bottom-0 left-[17px] top-9 w-px bg-stone-300 dark:bg-slate-700" aria-hidden="true" /> : null}
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        {milestone.isNext && !reduceMotion ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-lamp-500"
            animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
        <span
          className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black tabular-nums ${
            milestone.isNext
              ? "border-lamp-500 bg-lamp-500 text-stone-900"
              : "border-stone-300 bg-surface-0 text-ink-mid dark:border-slate-600"
          }`}
        >
          {milestone.level}
        </span>
      </span>
      <div className={`min-w-0 flex-1 rounded-xl px-3 py-2 ${milestone.isNext ? "border border-lamp-300/70 bg-lamp-100/60 dark:border-lamp-500/30 dark:bg-lamp-500/10" : ""}`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-lo">
          Level {milestone.level} · {away}
          {milestone.isNext ? <span className="ml-2 rounded bg-lamp-500 px-1.5 py-0.5 text-[10px] text-stone-900">Next</span> : null}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-ink-hi">
          <Coins className="h-4 w-4 text-lamp-700 dark:text-lamp-300" aria-hidden="true" />
          <span className="font-mono tabular-nums">+{milestone.coins.toLocaleString()}</span> coins
        </p>
        {milestone.title ? <p className="mt-0.5 text-xs text-ink-mid">Title: {milestone.title}</p> : null}
        {milestone.perk ? <p className="mt-0.5 text-xs text-ink-mid">{milestone.perk}</p> : null}
      </div>
    </motion.li>
  );
}
