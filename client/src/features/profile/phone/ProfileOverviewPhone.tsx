import { useMemo } from "react";
import { Flame, Gamepad2, History, Target, Trophy } from "lucide-react";
import type { ProfileFamilyOutletContext } from "../../../components/layout/ProfileFamilyLayout";
import { formatRelativeDay } from "../../../lib/relativeDay";
import type { RecentMatchItem } from "../CareerMetrics";
import { getProfileGameLabel } from "../gameLabel";
import { ProfileEmptyState, ProfileErrorState, ProfileMetricTile, ProfilePanelSkeleton, ProfileProgressBar } from "../ProfilePrimitives";
import GameTileArt from "../GameTileArt";
import PhoneSection from "./PhoneSection";
import { NextMoveCard } from "./NextMoveCard";
import type { Achievement } from "@shared/profile/Achievements";
import type { GameStats, PlayerStats } from "@shared/profile/PlayerStats";

/** The overview shows a taste of each list; the full ones are one "View all" away. */
const MASTERY_PREVIEW_LIMIT = 3;
const RECENT_PREVIEW_LIMIT = 3;

const RESULT_WORD: Record<RecentMatchItem["result"], string> = { won: "Won", lost: "Lost", draw: "Draw" };
const RESULT_TONE: Record<RecentMatchItem["result"], string> = {
  won: "text-[var(--vault-green)]",
  lost: "text-rose-800 dark:text-rose-300",
  draw: "text-[var(--command-cyan)]",
};

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export interface ProfileOverviewPhoneProps {
  experiencePoints: number;
  playerId?: string;
  stats: PlayerStats | null;
  /** True only for real, non-demo stats: the same test the desktop overview uses. */
  statsReady: boolean;
  achievements: Achievement[];
  achievementsReady: boolean;
  /** Already ordered by the page (most matches first); this component only takes the top of it. */
  mastery: GameStats[];
  recentMatches: RecentMatchItem[];
  resources: ProfileFamilyOutletContext["resources"];
  onRetry: () => void;
  onPlay: () => void;
}

/**
 * The phone's overview, in the order a player asks the questions: where am I and what next (the next-move
 * card), how am I doing (four numbers), which games define me (three rows), what did I do lately (three rows).
 * Everything is read from the same props the desktop overview uses, so no number here is computed twice.
 */
export default function ProfileOverviewPhone({
  experiencePoints,
  playerId,
  stats,
  statsReady,
  achievements,
  achievementsReady,
  mastery,
  recentMatches,
  resources,
  onRetry,
  onPlay,
}: ProfileOverviewPhoneProps) {
  const unlocked = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);
  const completion = achievements.length ? Math.round((unlocked / achievements.length) * 100) : 0;
  const achievementDetail = achievementsReady
    ? `${completion}% complete`
    : resources.achievements.status === "loading" ? "Loading collection" : "Unavailable";

  return (
    <>
      <NextMoveCard experiencePoints={experiencePoints} playerId={playerId} onPlay={onPlay} />

      {resources.stats.status === "loading" ? <ProfilePanelSkeleton rows={2} /> : statsReady && stats ? (
        <section aria-label="Career metrics" className="grid grid-cols-2 gap-3">
          <ProfileMetricTile compact label="Matches played" value={stats.totalMatches.toLocaleString()} detail="Completed matches" icon={Gamepad2} accent="cyan" />
          <ProfileMetricTile compact label="Win rate" value={`${Math.round(stats.winRate)}%`} detail={`${stats.wins.toLocaleString()} ${plural(stats.wins, "win", "wins")}`} icon={Target} accent="green" />
          <ProfileMetricTile compact label="Achievements" value={achievementsReady ? `${unlocked} / ${achievements.length}` : "—"} detail={achievementDetail} icon={Trophy} accent="gold" />
          <ProfileMetricTile compact label="Best streak" value={stats.bestWinStreak.toLocaleString()} detail="Consecutive wins" icon={Flame} accent="coral" />
        </section>
      ) : (
        <ProfileErrorState
          title="Career metrics unavailable"
          description={resources.stats.status === "error" ? resources.stats.message : "Verified career statistics are not available yet."}
          onRetry={onRetry}
        />
      )}

      <PhoneSection id="mastery" title="Game mastery" viewAll={{ to: "/myrecords", label: "View all game mastery" }}>
        {resources.stats.status === "loading" ? <ProfilePanelSkeleton rows={3} /> : !statsReady ? (
          <ProfileErrorState title="Mastery unavailable" description="Your game statistics could not be loaded." onRetry={onRetry} />
        ) : mastery.length ? (
          <ul className="divide-y divide-[var(--command-edge)]">
            {mastery.slice(0, MASTERY_PREVIEW_LIMIT).map((game) => {
              const label = getProfileGameLabel(game.game);
              return (
                <li key={game.game} className="py-3">
                  <div className="flex items-center gap-3">
                    <GameTileArt game={game.game} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-hi">{label}</p>
                      <p className="mt-0.5 text-xs text-ink-mid">
                        {game.matchesPlayed} {plural(game.matchesPlayed, "match", "matches")} · {game.wins} {plural(game.wins, "win", "wins")}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--command-cyan)]">{Math.round(game.winRate)}%</span>
                  </div>
                  {/* ml-14 = the 44px tile + its 12px gap, so the bar lines up under the name. */}
                  <div className="ml-14 mt-2">
                    <ProfileProgressBar label={`${label} win rate`} value={game.winRate} accent="cyan" showValue={false} hideLabel />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <ProfileEmptyState icon={Gamepad2} title="No mastery data yet" description="Complete a match to start your game record." actionLabel="Explore games" onAction={onPlay} />
        )}
      </PhoneSection>

      <PhoneSection title="Recent activity" viewAll={{ to: "/profile/matches", label: "View all recent activity" }}>
        {resources.recentMatches.status === "loading" ? <ProfilePanelSkeleton rows={3} /> : resources.recentMatches.status === "error" ? (
          <ProfileErrorState title="Recent activity unavailable" description={resources.recentMatches.message} onRetry={onRetry} />
        ) : recentMatches.length ? (
          <ul className="divide-y divide-[var(--command-edge)]">
            {recentMatches.slice(0, RECENT_PREVIEW_LIMIT).map((match, index) => (
              <li key={match.id ?? `${match.game}-${index}`} className="flex items-center gap-3 py-3">
                <GameTileArt game={match.game} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-hi">{getProfileGameLabel(match.game)}</p>
                  <p className="mt-0.5 text-xs text-ink-mid">{formatRelativeDay(match.playedAt)}</p>
                </div>
                <span className={`shrink-0 rounded-lg border border-current px-2 py-1 text-[10px] font-bold uppercase ${RESULT_TONE[match.result]}`}>
                  {RESULT_WORD[match.result]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ProfileEmptyState icon={History} title="Your battle log is ready" description="Completed matches will appear here with their recorded result." actionLabel="Play a game" onAction={onPlay} />
        )}
      </PhoneSection>
    </>
  );
}
