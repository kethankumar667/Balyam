import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import { LevelSparkleIcon } from "../../design-system/icons";
import { GLASSMORPHISM } from "../../design-system/premium";

interface ProfileHeaderProps {
  profile: PlayerProfile;
  onEditName?: () => void;
}

export default function ProfileHeader({ profile, onEditName }: ProfileHeaderProps) {
  const memberDate = new Date(profile.joinedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const nextLevelXp = profile.level * 100;
  const currentLevelXp = (profile.level - 1) * 100;
  const progressInLevel = profile.experiencePoints - currentLevelXp;
  const progressPct = Math.min(100, Math.round((progressInLevel / 100) * 100));

  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 ${GLASSMORPHISM.elevatedCard} relative overflow-hidden shadow-2xl backdrop-blur-xl border border-stone-800/80`}
    >
      {/* Radiant Player Aura */}
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
        {/* Avatar with Gilded Rim */}
        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-1 shadow-[0_0_24px_rgba(245,158,11,0.3)] transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-stone-950 rounded-[22px] flex items-center justify-center text-4xl sm:text-5xl select-none">
              {profile.avatar || "👤"}
            </div>
          </div>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[11px] font-black font-mono px-3 py-0.5 rounded-full border-2 border-stone-900 shadow-xl tracking-wider">
            LVL {profile.level}
          </div>
        </div>

        {/* Identity & Level Progress */}
        <div className="flex-1 text-center sm:text-left space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-100 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-md">
                {profile.displayName}
              </h1>
              {onEditName && (
                <button
                  onClick={onEditName}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold transition underline underline-offset-2 font-mono"
                  aria-label="Edit display name"
                >
                  Edit
                </button>
              )}
            </div>
            <span className="text-xs text-stone-400 dark:text-zinc-400 font-mono">
              Member since {memberDate}
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="max-w-md pt-1 space-y-1.5">
            <div className="flex justify-between text-xs text-stone-400 dark:text-zinc-400 font-mono">
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <LevelSparkleIcon size={12} className="text-amber-400" />
                {profile.experiencePoints} Lifetime XP
              </span>
              <span>Next Level: {nextLevelXp} XP</span>
            </div>
            <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
