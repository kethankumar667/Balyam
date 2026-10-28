import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Award, BarChart3, BookOpen, CalendarDays, ChevronRight, Crown,
  Gamepad2, History, Layers, Play, Search, Share2, ShieldCheck, Star, Target, Trophy, X,
} from "lucide-react";
import type { ModeDefinition } from "@shared/profile/GameModes";
import { getGameModeConfig } from "@shared/profile/GameModes";
import type { AllGameSlug, ModeScorecard } from "@shared/profile/Scorecard";
import type { RecordGame } from "../../features/myrecords/records";
import {
  calculatePerformanceRank, derivePlayerArchetype, getGameMetricSchema,
  getNextMilestoneTarget, getSignatureFeatsForGame,
} from "@shared/profile/MetricRegistry";
import type { RecentMatchItem } from "../../features/profile/CareerMetrics";
import { getProfileGameLabel } from "../../features/profile/gameLabel";
import { ProfilePanelSkeleton } from "../../features/profile/ProfilePrimitives";
import { formatGameMetricValue } from "../../lib/metricFormatters";
import { launchLinkProps } from "../../lib/gameLaunch";
import SeatAvatar from "../profile/SeatAvatar";
import Modal from "../Modal";
import QuantumRadarHexagon from "./QuantumRadarHexagon";
import { SCORECARD_RANK_CLASSES } from "./scorecardTheme";
import {
  SCORECARD_CATEGORIES, scorecardArt, scorecardBest, scorecardDate, scorecardValue, shortModeName,
  type ScorecardCategory, type CricketFamily, type ScorecardBest,
} from "./scorecardDashboardModel";

const PANEL = "min-w-0 rounded-2xl border border-score-edge bg-score-panel shadow-[0_10px_28px_-24px_rgba(0,60,85,0.65)]";
const SECONDARY_BUTTON = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-score-edge bg-score-inset px-3 text-xs font-bold text-score-ink transition-colors hover:border-score-cyan hover:bg-score-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan";
const PLAY_BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-4 text-xs font-extrabold text-slate-950 shadow-[0_4px_16px_-6px_rgba(245,158,11,0.5)] hover:from-amber-200 hover:to-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan";

function Panel({ title, children, action, className = "" }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`${PANEL} flex flex-col ${className}`}>
      <header className="flex min-h-14 items-center justify-between gap-2 px-4 pb-2 pt-3">
        <h3 id={id} className="text-sm font-bold tracking-tight text-score-ink">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

/** One empty-state shape for every scorecard panel, so a fresh profile reads as "not yet" rather than "broken". */
function PanelEmpty({ icon: Icon, title, children, preview }: {
  icon: typeof Trophy; title: string; children: ReactNode; preview?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 pb-5 pt-1 text-center">
      {preview}
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-score-edge bg-score-inset text-score-cyan">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-64">
        <p className="text-sm font-bold text-score-ink">{title}</p>
        <div className="mt-1 text-xs leading-relaxed text-score-soft">{children}</div>
      </div>
    </div>
  );
}

function GameArt({ game, className = "" }: { game: string; className?: string }) {
  const src = scorecardArt(game);
  return src ? <img src={src} alt="" width={40} height={40} loading="lazy" className={`rounded-lg object-cover ${className}`} />
    : <Gamepad2 className={`text-score-cyan ${className}`} aria-hidden="true" />;
}

interface NavigatorProps {
  records: readonly RecordGame[];
  games: readonly AllGameSlug[];
  selectedGame: AllGameSlug;
  onSelect: (game: AllGameSlug) => void;
  pinnedGames: readonly string[];
  onPin: (game: AllGameSlug) => void;
  category: ScorecardCategory;
  onCategory: (category: ScorecardCategory) => void;
  search: string;
  onSearch: (query: string) => void;
  onClear: () => void;
}

export function ScorecardNavigator(props: NavigatorProps) {
  return (
    <Panel title="Game navigator">
      <div className="px-4 pb-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-score-soft" aria-hidden="true" />
          <input type="search" aria-label="Search games" placeholder="Search games..." value={props.search}
            onChange={event => props.onSearch(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-score-edge bg-score-inset pl-9 pr-3 text-sm text-score-ink placeholder:text-score-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan" />
        </label>
        <div role="group" aria-label="Game categories" className="mt-3 flex flex-wrap gap-1.5">
          {SCORECARD_CATEGORIES.map(category => <button key={category.id} type="button"
            aria-pressed={props.category === category.id} onClick={() => props.onCategory(category.id)}
            className={`min-h-11 min-w-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan ${
              props.category === category.id ? "border-score-cyan bg-score-cyan text-score-on-cyan"
                : "border-score-edge bg-score-inset text-score-soft hover:border-score-cyan hover:text-score-ink"
            }`}>{category.label}</button>)}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 pt-1 xl:max-h-[710px] xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden xl:[scrollbar-gutter:stable]" aria-label="Games">
        {props.games.map(game => {
          const config = getGameModeConfig(game);
          const records = props.records.find(item => item.id === game);
          const count = (records?.modes.filter(mode => mode.best !== null).length ?? 0) + (records?.previousModeRecords.length ?? 0) + Number(records?.previousOverallBest != null);
          const pinned = props.pinnedGames.includes(game);
          const selected = props.selectedGame === game;
          return (
            <div key={game} className={`flex min-w-60 shrink-0 items-center rounded-xl border pr-1 xl:min-w-0 ${
              selected ? "border-score-cyan bg-score-active shadow-[inset_0_0_14px_rgba(6,182,212,0.1)]" : "border-score-edge bg-score-inset hover:border-score-cyan"
            }`}>
              <button type="button" onClick={() => props.onSelect(game)} aria-label={`Select game ${config.displayName}`} aria-pressed={selected}
                className="flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-lg p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan">
                <GameArt game={game} className="h-11 w-11 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-bold leading-snug text-score-ink">{config.displayName}</span>
                  <span className="mt-1 block whitespace-nowrap text-[11px] leading-relaxed text-score-soft">{count} {count === 1 ? "saved best" : "saved bests"}</span>
                </span>
              </button>
              <button type="button" onClick={() => props.onPin(game)} aria-label={`${pinned ? "Unpin" : "Pin"} ${config.displayName}`}
                aria-pressed={pinned} className={`flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan ${pinned ? "text-score-gold" : "text-score-soft hover:text-score-gold"}`}>
                <Star className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        {!props.games.length ? <div className="py-6 text-sm text-score-soft">
          <p>No games match your search.</p>
          <button type="button" onClick={props.onClear} className={`${SECONDARY_BUTTON} mt-3`}>Clear filters</button>
        </div> : null}
      </div>
    </Panel>
  );
}

export function ScorecardModes({ records, game, modes, selectedModeId, onSelect, family, onFamily }: {
  records?: RecordGame; game: AllGameSlug; modes: readonly ModeDefinition[]; selectedModeId: string;
  onSelect: (id: string) => void; family: CricketFamily; onFamily: (family: CricketFamily) => void;
}) {
  const config = getGameModeConfig(game);
  const filtered = modes.filter(mode => game !== "handcricket" || family === "all" || mode.modeId.startsWith(`${family}_`));
  return (
    <Panel title="Select mode" action={<Link to="/how-to-play" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-[11px] font-semibold text-score-cyan hover:underline">
      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> View rules</Link>}>
      <p className="px-4 text-xs font-semibold text-score-gold">{config.displayName}</p>
      {game === "handcricket" ? <div role="group" aria-label="Cricket families" className="mx-3 mt-3 flex flex-wrap gap-1 rounded-xl border border-score-edge bg-score-inset p-1">
        {([["all", "All"], ["international", "International"], ["franchise", "Franchise"], ["galli", "Galli Cricket"]] as const).map(([id, label]) =>
          <button key={id} type="button" aria-pressed={family === id} onClick={() => onFamily(id)}
            className={`min-h-11 flex-1 rounded-lg px-2 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan ${
              family === id ? "bg-score-cyan text-score-on-cyan shadow-sm" : "text-score-soft hover:bg-score-active"
            }`}>{label}</button>)}
      </div> : <p className="px-4 pt-2 text-[11px] leading-relaxed text-score-soft">Choose a format to explore your record.</p>}
      <div role="group" aria-label={`${config.displayName} modes`} className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))]">
        {filtered.map(mode => {
          const saved = scorecardBest(records, mode.modeId);
          const label = shortModeName(mode, game);
          const selected = selectedModeId === mode.modeId;
          return <button key={mode.modeId} type="button" aria-label={`Select ${mode.displayName}`} aria-pressed={selected}
            onClick={() => onSelect(mode.modeId)} title={label.detail || undefined}
            className={`relative flex min-h-32 min-w-0 flex-col rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-score-cyan ${
              selected ? "border-score-cyan bg-score-active shadow-[inset_0_0_14px_rgba(6,182,212,0.1)]" : "border-score-edge bg-score-inset hover:border-score-cyan"
            }`}>
            {game === "handcricket" && family === "all" ? <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-score-soft">{mode.displayName.split(" ")[0]}</span> : null}
            <span className="flex w-full items-start justify-between gap-2">
              <span className="min-w-0 break-words text-sm font-bold leading-snug text-score-ink">{label.name}</span>
              {saved ? <Crown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-score-gold" />
                : <Target aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-score-soft" />}
            </span>
            {label.detail ? <span className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-score-soft">{label.detail}</span> : null}
            <span className="mt-auto flex pt-3"><span className={`inline-flex max-w-full rounded-md border px-2 py-1 text-[11px] font-bold tabular-nums ${
              saved ? "border-score-cyan bg-score-panel text-score-cyan" : "border-score-edge text-score-soft"
            }`}>
              <span className="truncate">{saved ? `Best: ${scorecardValue(game, mode, saved.score)}` : "No record yet"}</span>
            </span></span>
          </button>;
        })}
      </div>
    </Panel>
  );
}

interface RecordProps {
  game: AllGameSlug;
  mode: ModeDefinition;
  record?: ModeScorecard;
}

function RecordArtwork({ game }: { game: AllGameSlug }) {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--score-art-glow),transparent_65%)]" />
    <div className="absolute -bottom-12 -right-6 h-56 w-56 rounded-full border border-score-edge [box-shadow:0_0_0_24px_var(--score-art-ring),0_0_0_48px_var(--score-art-ring)]" />
    {game === "handcricket" ? <>
      <img src="/illustrations/Handcricket/CricketBat.webp" alt="" width={180} height={260} className="absolute -right-3 top-14 h-60 w-36 rotate-[16deg] object-contain opacity-80" />
      <img src="/illustrations/Handcricket/cricket_ball.webp" alt="" width={100} height={100} className="absolute right-0 top-48 h-16 w-16 object-contain opacity-80" />
    </> : <GameArt game={game} className="absolute -right-8 bottom-0 h-48 w-48 rotate-12 opacity-[0.12] dark:opacity-20" />}
  </div>;
}

export function PersonalBestCard({ game, mode, record, best, onDetails, onShare }: RecordProps & { best?: ScorecardBest; onDetails: () => void; onShare: () => void }) {
  const titleId = useId();
  const config = getGameModeConfig(game);
  const rank = calculatePerformanceRank(game, mode.modeId, record?.bestScore, record?.scoringDirection ?? mode.scoringDirection);
  const historical = !config.modes.some(current => current.modeId === mode.modeId);
  return (
    <section aria-labelledby={titleId} className={`${PANEL} relative isolate flex flex-col overflow-hidden border-score-cyan`}>
      <RecordArtwork game={game} />
      <div className="relative flex flex-1 flex-col p-4">
        <header className="flex items-center justify-between gap-2">
          <h3 id={titleId} className="flex items-center gap-2 text-sm font-bold text-score-ink"><Trophy className="h-4 w-4 text-score-gold" aria-hidden="true" />Personal best</h3>
          {record ? <span className="rounded-md border border-score-gold bg-score-inset px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-score-gold">Personal record</span> : null}
        </header>
        {record ? <>
          <div className="mb-4 mt-5">
            <strong className="block max-w-full break-words font-display text-5xl leading-none tracking-tight text-score-gold">{mode.unit === "s" ? scorecardValue(game, mode, record.bestScore) : record.bestScore.toLocaleString()}</strong>
            <span className="mt-1 block font-mono text-xs font-bold uppercase tracking-[0.14em] text-score-gold">{mode.unit || "score"}</span>
            <p className="mt-3 max-w-[65%] text-xs font-semibold leading-relaxed text-score-ink">{mode.displayName}</p>
          </div>
          <div className="mb-4 inline-flex items-center gap-1 rounded-lg border bg-score-inset px-2 py-1 text-[10px] font-bold">
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 ${SCORECARD_RANK_CLASSES[rank.tier]}`} title={rank.description}>
              <Award className="h-3 w-3" aria-hidden="true" /><span>{rank.grade}-RANK</span>
            </span>
            <span className="text-score-soft">{record.scoringDirection === "LOWER_IS_BETTER" ? "Lower is better" : "Higher is better"}</span>
          </div>
          <dl className="space-y-2.5 rounded-xl border border-score-edge bg-score-inset p-3 text-[11px]">
            {[
              { label: "Average score", value: scorecardValue(game, mode, record.averageScore), icon: Activity },
              { label: "Matches played", value: String(record.timesPlayed), icon: Layers },
              { label: "Record set", value: scorecardDate(record.bestScoreAchievedAt), icon: CalendarDays },
            ].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-score-soft"><Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{label}</dt>
              <dd className="text-right font-semibold text-score-ink">{value}</dd>
            </div>)}
          </dl>
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            {!historical ? <Link {...launchLinkProps(game)} className={`${PLAY_BUTTON} flex-1`}><Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />Play again</Link>
              : <Link {...launchLinkProps(game)} className={`${PLAY_BUTTON} flex-1`}>Play current modes</Link>}
            <button type="button" onClick={onDetails} className={`${SECONDARY_BUTTON} flex-1`}>View scorecard</button>
            <button type="button" onClick={onShare} aria-label="Share scorecard" className={`${SECONDARY_BUTTON} w-11 px-0`}><Share2 className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </> : best ? <div className="relative flex min-h-64 flex-1 flex-col items-start justify-center gap-4 pt-4">
          <strong className="max-w-full break-words font-display text-4xl tabular-nums text-score-gold sm:text-5xl">{mode.unit === "s" ? scorecardValue(game, mode, best.score) : best.score.toLocaleString()}</strong>
          <p className="text-xs font-bold text-score-gold">{mode.unit || "score"} / {mode.displayName}</p>
          <p className="rounded-xl border border-score-edge bg-score-inset p-3 text-xs leading-relaxed text-score-soft">
            <span className="block font-bold text-score-ink">{best.source === "imported" ? "Imported from your device" : "Saved on this device"}</span>
            Date not recorded. This best has no match count or performance grade and does not count on leaderboards.
          </p>
          <Link {...launchLinkProps(game)} className={PLAY_BUTTON}><Play className="h-3.5 w-3.5" aria-hidden="true" />Play again</Link>
        </div> : <div className="relative flex min-h-64 flex-1 flex-col items-start justify-center pt-4">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-score-gold bg-score-inset text-score-gold"><Trophy className="h-6 w-6" aria-hidden="true" /></span>
          <h4 className="max-w-56 text-xl font-bold leading-tight text-score-ink">Your next record starts here</h4>
          <p className="mb-5 mt-2 max-w-64 text-xs leading-relaxed text-score-soft">Play {mode.displayName} to set your first personal best.</p>
          <Link {...launchLinkProps(game)} className={PLAY_BUTTON}><Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />Launch {config.displayName}</Link>
        </div>}
      </div>
    </section>
  );
}

export function RecordIntelligence({ record }: { record?: ModeScorecard }) {
  const archetype = record ? derivePlayerArchetype(record.radar) : null;
  return (
    <Panel title="Record intelligence">
      {record ? <div className="flex flex-1 flex-col px-3 pb-3">
        <div className="flex min-h-60 flex-1 items-center justify-center py-2"><QuantumRadarHexagon radar={record.radar} size={220} /></div>
        <div className="rounded-xl border border-score-edge bg-score-inset p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-score-cyan"><Activity className="h-3.5 w-3.5" aria-hidden="true" />Playing signature</p>
          <h4 className="text-sm font-bold text-score-ink">{archetype?.title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-score-soft">{archetype?.motto}</p>
        </div>
      </div> : <PanelEmpty icon={Target} title="Radar unlocks after one match"
        preview={<svg viewBox="0 0 200 180" aria-hidden="true" className="h-28 w-32 fill-none stroke-score-grid">
          <path d="M100 10 186 72 153 170 47 170 14 72Z M100 42 158 84 136 148 64 148 42 84Z M100 74 130 96 119 126 81 126 70 96Z" />
          <path d="M100 108V10M100 108 186 72M100 108 153 170M100 108 47 170M100 108 14 72" />
        </svg>}>
        Your performance radar appears after your first saved match score.
      </PanelEmpty>}
    </Panel>
  );
}

export function PerformanceHistory({ game, mode, record }: RecordProps) {
  const id = useId().replace(/:/g, "");
  const scores = [...(record?.recentScores ?? [])].reverse();
  const minimum = Math.min(0, ...scores);
  const maximum = Math.max(1, ...scores);
  const x = (index: number) => scores.length === 1 ? 174 : 44 + index / (scores.length - 1) * 260;
  const y = (score: number) => 146 - (score - minimum) / (maximum - minimum) * 110;
  const points = scores.map((score, index) => `${x(index)},${y(score)}`).join(" ");
  const title = `Recent scores for ${getGameModeConfig(game).displayName}, oldest to newest`;
  return (
    <Panel title="Performance history" action={<span className="rounded-lg border border-score-edge bg-score-active px-2 py-1 text-[10px] font-semibold text-score-cyan">{scores.length ? `Latest ${scores.length} saved ${scores.length === 1 ? "score" : "scores"}` : "No scores yet"}</span>}>
      <p className="px-4 text-[11px] text-score-soft">{mode.displayName} {record?.scoringDirection === "LOWER_IS_BETTER" ? " / Lower is better" : ""}</p>
      {scores.length ? <div className="px-3 pb-3">
        <svg role="img" aria-label={title} viewBox="0 0 330 182" className="mx-auto mt-2 max-h-72 w-full overflow-visible">
          <title>{title}</title>
          <defs><linearGradient id={`history-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--score-cyan)" stopOpacity="0.26" /><stop offset="1" stopColor="var(--score-cyan)" stopOpacity="0" /></linearGradient></defs>
          {[0, 0.5, 1].map(fraction => {
            const value = minimum + (maximum - minimum) * fraction;
            return <g key={fraction}>
              <line x1="44" x2="304" y1={y(value)} y2={y(value)} className="stroke-score-grid" strokeWidth="0.7" />
              <text x="36" y={y(value) + 4} textAnchor="end" className="fill-score-soft font-mono text-[11px]">{Number(value.toFixed(1)).toLocaleString()}</text>
            </g>;
          })}
          {scores.map((_, index) => <line key={index} x1={x(index)} x2={x(index)} y1="36" y2="146" className="stroke-score-grid" strokeWidth="0.7" />)}
          {scores.length > 1 ? <>
            <polygon points={`44,146 ${points} 304,146`} fill={`url(#history-${id})`} />
            <polyline points={points} fill="none" className="stroke-score-cyan" strokeWidth="2" strokeLinejoin="round" />
          </> : null}
          {scores.map((score, index) => <g key={index}>
            <circle data-score={score} cx={x(index)} cy={y(score)} r={index === scores.length - 1 ? "4.5" : "3.5"}
              className={index === scores.length - 1 ? "fill-score-gold stroke-score-panel" : "fill-score-cyan stroke-score-panel"} strokeWidth="1.5"><title>Saved score {index + 1}: {score}</title></circle>
            <text x={x(index)} y="165" textAnchor="middle" className="fill-score-soft font-mono text-[11px]">{index === scores.length - 1 ? "Latest" : index + 1}</text>
          </g>)}
          <text x={x(scores.length - 1)} y={y(scores[scores.length - 1]) - 12} textAnchor="middle" className="fill-score-gold font-mono text-xs font-bold">{scores[scores.length - 1].toLocaleString()}</text>
        </svg>
        <p className="text-[10px] leading-relaxed text-score-soft">{scores.length === 1 ? "One score saved. Play again to build a trend." : "Oldest to newest. The archive retains up to five recent scores per mode."}</p>
        <details className="mt-2 text-[11px] text-score-soft">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-score-cyan">Score values</summary>
          <ol className="flex flex-wrap gap-2 pb-2">{scores.map((score, index) => <li key={index} className="rounded-lg border border-score-edge bg-score-inset px-2 py-1">{index + 1}. {scorecardValue(game, mode, score)}</li>)}</ol>
        </details>
      </div> : <PanelEmpty icon={BarChart3} title="No trend yet"
        preview={<svg viewBox="0 0 160 48" aria-hidden="true" className="h-12 w-40 fill-none">
          <path d="M4 44H156" className="stroke-score-grid" />
          <polyline points="8,38 40,30 72,34 104,18 136,22 152,8" className="stroke-score-grid" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
        </svg>}>
        Your saved scores will trace the story here.
      </PanelEmpty>}
    </Panel>
  );
}

export function RecentBattles({ matches, status, onRetry, playerName, avatar, playerId }: {
  matches: readonly RecentMatchItem[]; status: "loading" | "ready" | "error"; onRetry?: () => void;
  playerName: string; avatar?: string; playerId: string;
}) {
  return (
    <Panel title="Recent battles" action={<Link to="/profile/matches" className="inline-flex min-h-11 items-center gap-1 rounded-lg text-[11px] font-semibold text-score-cyan hover:underline">View all<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}>
      {status === "loading" ? <div role="status" className="px-3 pb-3"><span className="sr-only">Loading recent battles...</span><ProfilePanelSkeleton rows={3} /></div>
        : status === "error" ? <div className="px-4 pb-4 text-xs text-score-soft"><p>Recent battles could not be loaded.</p>{onRetry ? <button type="button" onClick={onRetry} className={`${SECONDARY_BUTTON} mt-3`}>Retry battles</button> : null}</div>
          : matches.length ? <ul className="divide-y divide-score-edge px-3 pb-2">
            {[...matches].sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0)).slice(0, 3).map((match, index) =>
              <li key={match.id ?? `${match.game}-${index}`} className="flex min-h-20 items-center gap-2 py-2">
                <div className="shrink-0 p-1.5"><SeatAvatar playerId={playerId} avatar={avatar} name={playerName} className="h-8 w-8" textClassName="text-xs" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-score-ink">{getProfileGameLabel(match.game)}</p>
                  <p className="mt-1 text-[10px] text-score-soft">{match.playedAt ? scorecardDate(match.playedAt) : "Date not recorded"}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${
                  match.result === "won" ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : match.result === "lost" ? "border-rose-500/40 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "border-score-edge bg-score-inset text-score-soft"
                }`}>{match.result === "won" ? "Victory" : match.result === "lost" ? "Defeat" : "Draw"}</span>
              </li>)}
          </ul> : <PanelEmpty icon={History} title="No battles recorded yet.">
            Finish a match to add your first result.
          </PanelEmpty>}
    </Panel>
  );
}

export function ScorecardDetails({ open, onClose, game, mode, record }: RecordProps & { open: boolean; onClose: () => void }) {
  const id = useId();
  if (!record) return null;
  const rank = calculatePerformanceRank(game, mode.modeId, record.bestScore, record.scoringDirection);
  const milestone = getNextMilestoneTarget(game, mode.modeId, record.bestScore, record.scoringDirection);
  const feats = getSignatureFeatsForGame(game, record);
  const schema = getGameMetricSchema(game);
  return <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy={id}
    panelClassName="chrono-scorecards relative w-full max-w-lg rounded-t-3xl border border-score-edge bg-score-panel p-5 font-sans text-score-ink md:rounded-3xl">
    <header className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-score-cyan">Record dossier</p><h2 id={id} className="mt-1 text-xl font-bold">{getGameModeConfig(game).displayName} scorecard</h2><p className="mt-1 text-xs text-score-soft">{mode.displayName}</p></div>
      <button type="button" onClick={onClose} aria-label="Close scorecard" className={`${SECONDARY_BUTTON} w-11 shrink-0 px-0`}><X className="h-4 w-4" aria-hidden="true" /></button>
    </header>
    <div className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-score-edge bg-score-inset p-4">
      <strong className="text-3xl font-black text-score-gold">{scorecardValue(game, mode, record.bestScore)}</strong>
      <div className="text-right"><p className="text-sm font-bold text-score-cyan">{rank.label}</p><p className="mt-1 text-xs text-score-soft">{rank.grade}-RANK</p></div>
    </div>
    <dl className="grid grid-cols-2 gap-3 text-xs">
      <div><dt className="text-score-soft">Record set</dt><dd className="mt-1 font-semibold">{scorecardDate(record.bestScoreAchievedAt)}</dd></div>
      <div><dt className="text-score-soft">Match context</dt><dd className="mt-1 font-semibold">{record.bestContext.replace(/_/g, " ")}</dd></div>
      <div><dt className="text-score-soft">Average</dt><dd className="mt-1 font-semibold">{formatGameMetricValue(record.averageScore, schema.primaryRankMetric.format)}</dd></div>
      <div><dt className="text-score-soft">Matches played</dt><dd className="mt-1 font-semibold">{record.timesPlayed}</dd></div>
      {schema.secondaryMetrics.map(metric => <div key={metric.key}><dt className="text-score-soft">{metric.label}</dt><dd className="mt-1 font-semibold">{formatGameMetricValue(record.secondaryMetrics[metric.key], metric.format)}</dd></div>)}
    </dl>
    <section className="my-5 rounded-xl border border-score-edge bg-score-inset p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-bold text-score-gold"><Target className="h-4 w-4" aria-hidden="true" />{milestone.title}</h3>
      <p className="mt-1 text-xs text-score-soft">{milestone.remainingText}</p>
      <div role="progressbar" aria-label="Next record milestone" aria-valuenow={Math.round(milestone.progressPercent)} aria-valuemin={0} aria-valuemax={100}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-score-grid"><div className="h-full bg-score-cyan" style={{ width: `${milestone.progressPercent}%` }} /></div>
    </section>
    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-score-gold" aria-hidden="true" />Signature feats</h3>
    <ul className="space-y-2">{feats.map(feat => <li key={feat.id} className="flex items-start gap-3 rounded-xl border border-score-edge bg-score-inset p-3">
      <Trophy className={`mt-0.5 h-4 w-4 shrink-0 ${feat.isUnlocked ? "text-score-gold" : "text-score-soft"}`} aria-hidden="true" />
      <div><p className="text-xs font-bold">{feat.name}<span className="ml-2 text-[10px] font-normal text-score-soft">{feat.isUnlocked ? "Unlocked" : "Locked"}</span></p><p className="mt-1 text-[11px] leading-relaxed text-score-soft">{feat.description}</p></div>
    </li>)}</ul>
  </Modal>;
}
