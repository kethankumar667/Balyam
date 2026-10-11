import { Link } from "react-router-dom";
import { usePlayerId } from "../../lib/playerIdentity";
import { useMemberGameRecord } from "../../hooks/useMemberGameRecord";
import { useProgressionVersion } from "../../store/progressionVersionStore";
import { LevelPanel } from "../mandali/album/MemberRecordPanels";
// The strip is drawn with the album's colour tokens; they live in this stylesheet, which is otherwise
// only loaded with the Mandali.
import "../mandali/album/album.css";

/**
 * The signed-in player's own level and XP bar, for the profile side panel.
 *
 * The same strip a friend sees on the group profile card, fed by the same public progression route, so
 * a level reads the same wherever it appears. Tapping it opens the full profile. It renders nothing
 * while loading or when the level cannot be fetched: a bar that is not real is worse than no bar.
 * Members only: the caller does not mount it for a guest, who has no XP history to show.
 */
export function OwnLevelStrip({ onNavigate }: { onNavigate?: () => void }) {
  const { playerId } = usePlayerId();
  const progressionVersion = useProgressionVersion((state) => state.version);
  const record = useMemberGameRecord(playerId ?? null, progressionVersion);

  if (!record.progression) return null;

  return (
    <Link
      to="/profile"
      onClick={onNavigate}
      aria-label="Open your profile"
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/60"
    >
      <LevelPanel progression={record.progression} />
    </Link>
  );
}
