import { useSearchParams } from "react-router-dom";
import LevelJourneyCard from "../features/profile/LevelJourneyCard";

/**
 * Dev-only: the profile's Level & XP card at any XP, so it can be looked at without a member login.
 * `/preview/level?xp=65`. Mounted only when `import.meta.env.DEV` (see App.tsx).
 */
export default function PreviewLevelJourney() {
  const [params] = useSearchParams();
  const xp = Math.max(0, Math.floor(Number(params.get("xp") ?? "65")) || 0);
  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6">
      <LevelJourneyCard experiencePoints={xp} />
    </div>
  );
}
