import type { PlayerProfile } from "@shared/profile/PlayerProfile";

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
    <div className="bg-stone-900/90 dark:bg-zinc-900/90 border border-stone-800 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar */}
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-1 shadow-lg shadow-amber-500/10">
            <div className="w-full h-full bg-stone-950 rounded-xl flex items-center justify-center text-3xl sm:text-4xl">
              {profile.avatar || "👤"}
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-zinc-950 text-xs font-black px-2 py-0.5 rounded-full border-2 border-stone-900 shadow">
            LVL {profile.level}
          </div>
        </div>

        {/* Identity & Level Progress */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-100 dark:text-zinc-100">
                {profile.displayName}
              </h1>
              {onEditName && (
                <button
                  onClick={onEditName}
                  className="text-xs text-amber-400 hover:text-amber-300 transition underline underline-offset-2"
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
          <div className="max-w-md pt-1 space-y-1">
            <div className="flex justify-between text-xs text-stone-400 dark:text-zinc-400 font-mono">
              <span>XP: {profile.experiencePoints}</span>
              <span>Next Level: {nextLevelXp} XP</span>
            </div>
            <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800/80">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
