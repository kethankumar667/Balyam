import { useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight, Gauge, Gamepad2, Medal, Target, Trophy } from "lucide-react";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import { useScorecardStore } from "../store/scorecardStore";
import ChronoScorecardDeck from "../components/scorecard/ChronoScorecardDeck";
import PersonalBestOverdriveModal from "../components/scorecard/PersonalBestOverdriveModal";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileMetricTile,
  ProfilePageHeading,
  ProfilePanelSkeleton,
  ProfileSection,
} from "../features/profile/ProfilePrimitives";

export default function ScorecardsPage() {
  const { profile, currentName, currentAvatar, effectivePlayerId, isMember } = useOutletContext<ProfileFamilyOutletContext>();
  const { archive, loading, error, fetchScorecards, lastNewPB, dismissPBModal } = useScorecardStore();

  useEffect(() => {
    if (effectivePlayerId) void fetchScorecards(effectivePlayerId);
  }, [effectivePlayerId, fetchScorecards]);

  if (!isMember) return <MemberLockedGate feature="profile" />;
  if (!profile) return null;

  const trackedGames = archive ? Object.keys(archive.games).length : 0;
  const trackedModes = archive
    ? Object.values(archive.games).reduce((total, game) => total + (game?.totalModesPlayed ?? 0), 0)
    : 0;
  const recordsBroken = archive?.totalPersonalBestsBeaten ?? 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProfilePageHeading
        icon={Trophy}
        eyebrow="Performance archive"
        title="Personal best lab"
        description="Compare personal records, study pace signatures, and track the modes where you are raising your ceiling."
        accent="cyan"
        action={(
          <Link
            to="/games"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-chest-600 px-4 text-sm font-bold text-white transition hover:bg-chest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp-500"
          >
            Chase a record
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ProfileMetricTile label="Tracked games" value={String(trackedGames)} detail="Games with scorecards" icon={Gamepad2} accent="violet" />
        <ProfileMetricTile label="Records broken" value={String(recordsBroken)} detail="New personal bests" icon={Medal} accent="gold" />
        <div className="col-span-2 lg:col-span-1">
          <ProfileMetricTile label="Active modes" value={String(trackedModes)} detail="Scoring disciplines" icon={Gauge} accent="cyan" />
        </div>
      </div>

      <ProfileSection
        title="Chrono scorecards"
        description="The deck adapts its density and controls for mobile, tablet, and desktop."
        icon={Target}
        accent="cyan"
      >
        {loading && !archive ? <ProfilePanelSkeleton rows={5} /> : null}
        {error && !archive ? (
          <ProfileErrorState
            title="Scorecards unavailable"
            description={error}
            onRetry={() => {
              if (effectivePlayerId) void fetchScorecards(effectivePlayerId);
            }}
          />
        ) : null}
        {!loading && !error && !archive ? (
          <ProfileEmptyState
            icon={Trophy}
            title="No scorecards yet"
            description="Set a score in a supported solo or multiplayer mode to start your personal-best archive."
          />
        ) : null}
        {archive ? (
          <ChronoScorecardDeck
            archive={archive}
            playerName={currentName || profile.displayName}
            avatar={currentAvatar ?? profile.avatar}
          />
        ) : null}
      </ProfileSection>

      {lastNewPB ? <PersonalBestOverdriveModal result={lastNewPB} onClose={dismissPBModal} /> : null}
    </div>
  );
}
