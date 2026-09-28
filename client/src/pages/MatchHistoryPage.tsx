import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Filter,
  Gamepad2,
  History,
  Medal,
  RefreshCw,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/playerIdentity";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import Modal from "../components/Modal";
import SeatAvatar from "../components/profile/SeatAvatar";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileMetricTile,
  ProfilePageHeading,
  ProfilePanelSkeleton,
  ProfileSection,
} from "../features/profile/ProfilePrimitives";
import { getProfileGameLabel } from "../features/profile/gameLabel";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import type { GameStats } from "@shared/profile/PlayerStats";
import type { MatchDetailRecord, MatchHistoryItem, MatchResult } from "@shared/profile/MatchHistory";
import type { GameKind } from "@shared/types";

interface MatchHistoryResponse {
  matches: MatchHistoryItem[];
  total?: number;
}

interface MatchDetailResponse {
  match: MatchDetailRecord;
}

const RESULT_LABEL: Record<MatchResult, string> = {
  WIN: "Victory",
  LOSS: "Defeat",
  DRAW: "Draw",
};

const RESULT_STYLE: Record<MatchResult, string> = {
  WIN: "border-success/30 bg-success/10 text-success",
  LOSS: "border-danger/30 bg-danger/10 text-danger",
  DRAW: "border-info/30 bg-info/10 text-info",
};

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60_000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatPlayTime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatMatchDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function isGameStats(value: GameStats | undefined): value is GameStats {
  return value !== undefined;
}

export default function MatchHistoryPage() {
  const { profile, stats, isMember, effectivePlayerId } = useOutletContext<ProfileFamilyOutletContext>();
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [selectedGame, setSelectedGame] = useState<GameKind | undefined>();
  const [activeDetailItem, setActiveDetailItem] = useState<MatchHistoryItem | null>(null);
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<MatchDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFetchError, setDetailFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!effectivePlayerId) return;
    let cancelled = false;

    async function fetchMatches() {
      setLoading(true);
      setFetchError(false);
      try {
        const response = await apiFetch(
          `/api/profile/${effectivePlayerId}/matches${selectedGame ? `?game=${selectedGame}` : ""}`,
        );
        if (!response.ok) throw new Error("Match fetch failed");
        const payload = (await response.json()) as MatchHistoryResponse;
        if (cancelled) return;
        const nextMatches = Array.isArray(payload.matches) ? payload.matches : [];
        setMatches(nextMatches);
        setTotalMatches(payload.total ?? nextMatches.length);
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchMatches();
    return () => {
      cancelled = true;
    };
  }, [effectivePlayerId, retryCount, selectedGame]);

  const fetchMatchDetail = useCallback(async (matchId: string) => {
    setDetailLoading(true);
    setDetailFetchError(false);
    try {
      const response = await apiFetch(`/api/profile/${effectivePlayerId}/matches/${matchId}`);
      if (!response.ok) throw new Error("Match detail fetch failed");
      const payload = (await response.json()) as MatchDetailResponse;
      if (!payload.match) throw new Error("Invalid match detail payload");
      setSelectedMatchDetail(payload.match);
    } catch {
      setDetailFetchError(true);
    } finally {
      setDetailLoading(false);
    }
  }, [effectivePlayerId]);

  const openMatchDetail = useCallback((match: MatchHistoryItem) => {
    setActiveDetailItem(match);
    setSelectedMatchDetail(null);
    void fetchMatchDetail(match.matchId);
  }, [fetchMatchDetail]);

  const closeMatchDetail = useCallback(() => {
    setActiveDetailItem(null);
    setSelectedMatchDetail(null);
    setDetailFetchError(false);
  }, []);

  const gameOptions = useMemo(
    () => Object.values(stats?.perGame ?? {}).filter(isGameStats).sort((a, b) => b.matchesPlayed - a.matchesPlayed),
    [stats?.perGame],
  );

  if (!isMember) return <MemberLockedGate feature="profile" />;
  if (!profile) return null;

  const careerTotal = stats?.totalMatches ?? totalMatches;
  const wins = stats?.wins ?? 0;
  const winRate = stats?.winRate ?? 0;
  const playTime = formatPlayTime(stats?.totalPlayTimeMinutes ?? 0);
  const detail = selectedMatchDetail ?? activeDetailItem;

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProfilePageHeading
        icon={History}
        eyebrow="Match intelligence"
        title="Battle archive"
        description="Scan outcomes, opponents, and authoritative scorecards from every recorded match."
        accent="coral"
        action={(
          <Link
            to="/games"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-chest-600 px-4 text-sm font-bold text-white transition hover:bg-chest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500"
          >
            Play a game
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ProfileMetricTile label="Matches logged" value={String(careerTotal)} detail="All recorded games" icon={Gamepad2} accent="violet" />
        <ProfileMetricTile label="Victories" value={String(wins)} detail={`${winRate}% win rate`} icon={Trophy} accent="green" />
        <ProfileMetricTile label="Current form" value={`${stats?.currentWinStreak ?? 0}W`} detail="Active win streak" icon={Medal} accent="gold" />
        <ProfileMetricTile label="Play time" value={playTime} detail="Across every arena" icon={Clock3} accent="cyan" />
      </div>

      <ProfileSection
        title="Match log"
        description={`${totalMatches} ${selectedGame ? getProfileGameLabel(selectedGame) : "total"} records in this view`}
        icon={Swords}
        accent="coral"
        action={gameOptions.length > 0 ? (
          <label className="relative flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-surface-0 px-3 text-xs font-bold text-ink-mid dark:border-slate-600">
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Filter matches by game</span>
            <select
              value={selectedGame ?? ""}
              onChange={(event) => setSelectedGame(event.target.value ? event.target.value as GameKind : undefined)}
              className="min-h-[42px] max-w-36 bg-transparent pr-1 text-ink-hi outline-none"
              aria-label="Filter matches by game"
            >
              <option value="">All games</option>
              {gameOptions.map((entry) => (
                <option key={entry.game} value={entry.game}>{getProfileGameLabel(entry.game)}</option>
              ))}
            </select>
          </label>
        ) : undefined}
      >
        {loading ? <ProfilePanelSkeleton rows={4} /> : null}
        {!loading && fetchError ? (
          <ProfileErrorState
            title="Battle archive unavailable"
            description="The match service did not respond. Your existing profile data is safe."
            onRetry={() => setRetryCount((value) => value + 1)}
          />
        ) : null}
        {!loading && !fetchError && matches.length === 0 ? (
          <ProfileEmptyState
            icon={Swords}
            title="No battles in this view"
            description={selectedGame ? "This game has no recorded matches yet. Choose another filter or start a new battle." : "Finish a multiplayer game and its result will appear here."}
            actionLabel={selectedGame ? "Show all games" : undefined}
            onAction={selectedGame ? () => setSelectedGame(undefined) : undefined}
          />
        ) : null}
        {!loading && !fetchError && matches.length > 0 ? (
          <ol className="space-y-2.5">
            {matches.map((match) => (
              <li key={match.matchId}>
                <button
                  type="button"
                  onClick={() => openMatchDetail(match)}
                  className="group grid min-h-[76px] w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-stone-300/80 bg-surface-0 p-3 text-left transition hover:border-lamp-500/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:border-slate-700/80 sm:p-4"
                  aria-label={`Open ${getProfileGameLabel(match.game)} match from ${formatMatchDate(match.finishedAt)}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-chest-100 text-chest-700 dark:bg-chest-500/15 dark:text-chest-300">
                    <Swords className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink-hi">{getProfileGameLabel(match.game)}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-mid">
                      <span>{formatMatchDate(match.finishedAt)}</span>
                      <span>{formatDuration(match.durationMs)}</span>
                      <span>{match.participants.length} players</span>
                    </span>
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${RESULT_STYLE[match.result]}`}>
                    {RESULT_LABEL[match.result]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </ProfileSection>

      <Modal
        open={detail !== null}
        onClose={closeMatchDetail}
        mobileSheet
        ariaLabelledBy="match-scorecard-title"
        panelClassName="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-stone-300 bg-surface-1 p-5 text-ink-hi shadow-2xl dark:border-slate-700 md:max-w-xl md:rounded-3xl"
      >
        {detail ? (
          <div className="space-y-5">
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${RESULT_STYLE[detail.result]}`}>
                  {RESULT_LABEL[detail.result]}
                </p>
                <h3 id="match-scorecard-title" className="mt-3 text-xl font-black tracking-tight text-ink-hi">
                  {getProfileGameLabel(detail.game)} scorecard
                </h3>
                <p className="mt-1 font-mono text-xs text-ink-mid">Room {detail.roomCode} · {formatMatchDate(detail.finishedAt)}</p>
              </div>
              <button
                type="button"
                onClick={closeMatchDetail}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-surface-0 text-ink-mid transition hover:text-ink-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500 dark:border-slate-600"
                aria-label="Close match scorecard"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-surface-0 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-lo">Duration</p>
                <p className="mt-1 font-mono text-lg font-black text-ink-hi">{formatDuration(detail.durationMs)}</p>
              </div>
              <div className="rounded-xl bg-surface-0 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-lo">Players</p>
                <p className="mt-1 font-mono text-lg font-black text-ink-hi">{detail.participants.length}</p>
              </div>
            </div>

            <section aria-labelledby="participants-title">
              <div className="mb-2.5 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" aria-hidden="true" />
                <h4 id="participants-title" className="text-sm font-bold text-ink-hi">Participants</h4>
              </div>
              <ul className="space-y-2">
                {detail.participants.map((participant) => (
                  <li key={participant.playerId} className="flex min-h-[58px] items-center justify-between gap-3 rounded-xl border border-stone-300/70 bg-surface-0 px-3 py-2 dark:border-slate-700/70">
                    <div className="flex min-w-0 items-center gap-3">
                      <SeatAvatar avatar={participant.avatar} name={participant.name} className="h-9 w-9" textClassName="text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-hi">{participant.name}{participant.isBot ? " · Bot" : ""}</p>
                        <p className="text-[11px] text-ink-mid">{participant.isWinner ? "Winner" : "Contender"}</p>
                      </div>
                    </div>
                    {participant.score !== undefined ? <span className="font-mono text-sm font-black text-ink-hi">{participant.score} pts</span> : null}
                  </li>
                ))}
              </ul>
            </section>

            {selectedMatchDetail ? (
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-lamp-500/30 bg-lamp-500/5 p-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-lo">Moves</p>
                  <p className="mt-1 font-mono text-base font-black text-ink-hi">{selectedMatchDetail.movesCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-lo">Timeline events</p>
                  <p className="mt-1 font-mono text-base font-black text-ink-hi">{selectedMatchDetail.timelineEventsCount}</p>
                </div>
              </div>
            ) : null}

            {detailLoading ? <ProfilePanelSkeleton rows={1} /> : null}
            {detailFetchError ? (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-xs text-danger">Detailed timeline could not be loaded.</p>
                <button
                  type="button"
                  onClick={() => void fetchMatchDetail(detail.matchId)}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-xs font-bold text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
