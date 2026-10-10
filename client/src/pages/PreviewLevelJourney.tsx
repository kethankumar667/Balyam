import { useSearchParams } from "react-router-dom";
import LevelJourneyCard from "../features/profile/LevelJourneyCard";
import { useXpGainStore } from "../store/xpGainStore";

/**
 * Dev-only: the profile's Level & XP card at any XP, so it can be looked at without a member login.
 * `/preview/level?xp=65`. Mounted only when `import.meta.env.DEV` (see App.tsx).
 */
export default function PreviewLevelJourney() {
  const [params] = useSearchParams();
  const xp = Math.max(0, Math.floor(Number(params.get("xp") ?? "65")) || 0);
  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => useXpGainStore.getState().show(Math.max(0, xp - 35), xp)}
        className="min-h-[44px] rounded-xl border border-stone-300 px-4 text-sm font-bold text-ink-hi"
      >
        Simulate a match paying 35 XP
      </button>
      <LevelJourneyCard experiencePoints={xp} />
    </div>
  );
}
