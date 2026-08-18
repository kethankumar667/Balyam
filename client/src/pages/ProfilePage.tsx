import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import { isSupabaseConfigured } from "../lib/supabase/client";
import { validateName, type FieldError } from "../lib/authValidation";
import { GlobalSettings } from "../components/GlobalSettings";
import LanguageSettings from "../components/LanguageSettings/LanguageSettings";
import AvatarPicker from "../components/profile/AvatarPicker";
import AppLayout from "../components/layout/AppLayout";
import YourDataPanel from "../components/privacy/YourDataPanel";

// Profile Features
import ProfileHeader from "../features/profile/ProfileHeader";
import StatsOverview from "../features/profile/StatsOverview";
import FavoriteGames from "../features/profile/FavoriteGames";
import CareerMetrics from "../features/profile/CareerMetrics";
import AchievementsPanel from "../features/profile/AchievementsPanel";
import MatchHistoryList from "../features/profile/MatchHistoryList";
import { SkeletonLoader } from "../design-system/premium";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { MatchHistoryItem, MatchDetailRecord } from "@shared/profile/MatchHistory";
import type { Achievement } from "@shared/profile/Achievements";
import type { GameKind } from "@shared/types";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  FaceIcon,
  GlobeIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
  SlidersIcon,
  UserIcon,
} from "../components/auth/authIcons";

const CARD =
  "rounded-2xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] " +
  "shadow-[0_1px_2px_rgba(74,44,22,0.04),0_8px_24px_-16px_rgba(74,44,22,0.28)]";

function CardHead({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-8 h-8 rounded-lg bg-[var(--auth-field)] border border-[var(--auth-field-edge)] flex items-center justify-center text-[var(--auth-accent)] flex-shrink-0">
        {icon}
      </span>
      <h2 className="text-[16px] font-bold text-[var(--auth-ink)] tracking-tight">
        {title}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);
  const setPlayerName = useRoomStore((s) => s.setPlayerName);
  const setAvatarId = useRoomStore((s) => s.setAvatarId);

  const isMember = useAuthStore((s) => s.isMember);

  const [activeTab, setActiveTab] = useState<"career" | "history" | "achievements" | "settings">("career");

  // Profile data state
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameKind | undefined>();
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<MatchDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Name editing
  const [nameInput, setNameInput] = useState(currentName);
  const [nameError, setNameError] = useState<FieldError | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  /**
   * Identity now comes from a credential the server verifies, not from a
   * string this page picks. The old line read `userId ||
   * localStorage.getItem("mpg.playerId") || "guest_player_1"` and put the
   * result in the URL of every request — which is how a stranger could read
   * and write another player's records, and why every guest who had never
   * joined a room shared the single profile `guest_player_1`.
   */
  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  const loadProfileData = async () => {
    // Nothing to ask for until we know who is asking. Firing with a null id
    // would just produce a URL with "null" in it, which the server now
    // correctly refuses.
    if (!effectivePlayerId) return;
    try {
      const [profRes, statsRes, matchRes, achRes] = await Promise.all([
        apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => r.json()),
        apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => r.json()),
        apiFetch(`/api/profile/${effectivePlayerId}/matches${selectedGame ? `?game=${selectedGame}` : ""}`).then((r) => r.json()),
        apiFetch(`/api/profile/${effectivePlayerId}/achievements`).then((r) => r.json()),
      ]);

      if (profRes.profile) setProfile(profRes.profile);
      if (statsRes.stats) setStats(statsRes.stats);
      if (matchRes.matches) {
        setMatches(matchRes.matches);
        setTotalMatches(matchRes.total || 0);
      }
      if (achRes.achievements) setAchievements(achRes.achievements);
      setLoading(false);
    } catch (err) {
      console.warn("Could not load backend profile, using local defaults:", err);
      // Fallback local representation
      setProfile({
        playerId: effectivePlayerId ?? "",
        displayName: currentName || "Player",
        avatar: currentAvatar || undefined,
        joinedAt: Date.now() - 86400000 * 7,
        lastSeenAt: Date.now(),
        level: 1,
        experiencePoints: 0,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!identityReady) return;
    loadProfileData();
  }, [identityReady, effectivePlayerId, selectedGame]);

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const error = validateName(nameInput);
    if (error) {
      setNameError(error);
      return;
    }
    const clean = nameInput.trim();
    setPlayerName(clean);
    setNameError(null);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);

    try {
      await apiFetch(`/api/profile/${effectivePlayerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: clean }),
      });
      if (profile) setProfile({ ...profile, displayName: clean });
    } catch {
      // Offline fallback
    }
  };

  const handleSelectAvatar = async (av: string | null) => {
    setAvatarId(av);
    try {
      await apiFetch(`/api/profile/${effectivePlayerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: av || undefined }),
      });
      if (profile) setProfile({ ...profile, avatar: av || undefined });
    } catch {
      // Offline fallback
    }
  };

  const handleViewMatchDetail = async (matchId: string) => {
    try {
      const res = await apiFetch(`/api/profile/${effectivePlayerId}/matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMatchDetail(data.match);
      }
    } catch (err) {
      console.error("Failed to load match detail:", err);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Lounge
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold">
              <Link
                to="/tournaments"
                className="text-amber-400 hover:text-amber-300 transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏟️ Tournaments & Seasons
              </Link>
              <Link
                to="/leaderboard"
                className="text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
              >
                🏆 Leaderboards & Quests
              </Link>
            </div>
          </div>

          {/* Profile Hero Card */}
          {profile && (
            <ProfileHeader
              profile={profile}
              onEditName={() => setActiveTab("settings")}
            />
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-stone-800/60 dark:border-zinc-800/60 pb-3 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab("career")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "career"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              📊 Career & Stats
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "history"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              📜 Match History ({totalMatches})
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "achievements"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              🏆 Achievements ({achievements.filter((a) => a.unlocked).length}/{achievements.length})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "settings"
                  ? "bg-amber-500 text-zinc-950 font-black shadow"
                  : "bg-stone-900/40 text-stone-400 hover:text-stone-200"
              }`}
            >
              ⚙️ Account & Settings
            </button>
          </div>

          {/* Tab 1: Career & Stats */}
          {activeTab === "career" && stats && (
            <div className="space-y-6">
              <StatsOverview stats={stats} />
              <FavoriteGames stats={stats} />
              <CareerMetrics stats={stats} />
            </div>
          )}

          {/* Tab 2: Match History */}
          {activeTab === "history" && (
            <MatchHistoryList
              matches={matches}
              total={totalMatches}
              selectedGame={selectedGame}
              onSelectGame={(g) => setSelectedGame(g)}
              onViewMatchDetail={handleViewMatchDetail}
            />
          )}

          {/* Tab 3: Achievements */}
          {activeTab === "achievements" && (
            <AchievementsPanel achievements={achievements} />
          )}

          {/* Tab 4: Account & Local Settings */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className={`${CARD} p-5 space-y-4`}>
                <CardHead icon={<UserIcon className="w-[18px] h-[18px]" />} title="Display Name" />
                <form onSubmit={handleSaveName} className="space-y-3">
                  <div>
                    <label htmlFor="displayNameInput" className="text-xs font-semibold text-[var(--auth-ink-soft)] block mb-1">
                      Your Lounge Name
                    </label>
                    <input
                      id="displayNameInput"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={24}
                      className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl px-3 py-2 text-sm text-[var(--auth-ink)] focus:outline-none focus:border-amber-500"
                    />
                    {nameError && (
                      <p className="text-xs text-rose-500 mt-1">{nameError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                  >
                    {nameSaved ? "Saved!" : "Update Name"}
                  </button>
                </form>
              </section>

              <section className={`${CARD} p-5`}>
                <CardHead icon={<FaceIcon className="w-[18px] h-[18px]" />} title="Avatar Customization" />
                <AvatarPicker value={currentAvatar} onChange={handleSelectAvatar} />
              </section>

              <section className={`${CARD} p-5`}>
                <CardHead icon={<SlidersIcon className="w-[18px] h-[18px]" />} title="Game Audio & Sound FX" />
                <GlobalSettings />
              </section>

              <section className={`${CARD} p-5`}>
                <CardHead icon={<GlobeIcon className="w-[18px] h-[18px]" />} title="Language Settings" />
                <LanguageSettings embedded hideHeading />
              </section>

              <section className={`${CARD} p-5 lg:col-span-2`}>
                <CardHead icon={<ShieldIcon className="w-[18px] h-[18px]" />} title="Privacy & Data Transparency" />
                <YourDataPanel headingLevel="h3" hideHeading />
              </section>
            </div>
          )}

          {/* Match Detail Modal */}
          {selectedMatchDetail && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="matchDetailTitle"
            >
              <div className="bg-stone-900 dark:bg-zinc-900 border border-stone-800 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 id="matchDetailTitle" className="font-bold text-base text-stone-100 dark:text-zinc-100 capitalize">
                    Match Details — {selectedMatchDetail.game} (#{selectedMatchDetail.roomCode})
                  </h3>
                  <button
                    onClick={() => setSelectedMatchDetail(null)}
                    className="text-stone-400 hover:text-stone-200 text-sm font-bold"
                    aria-label="Close dialog"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">Outcome</span>
                    <span className="font-bold text-sm text-emerald-400">{selectedMatchDetail.result}</span>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">Duration</span>
                    <span className="font-bold text-sm text-stone-200">{Math.round(selectedMatchDetail.durationMs / 1000)}s</span>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">Total Moves</span>
                    <span className="font-bold text-sm text-stone-200">{selectedMatchDetail.movesCount}</span>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 block">Winner</span>
                    <span className="font-bold text-sm text-amber-400">{selectedMatchDetail.winnerName || "None / Tie"}</span>
                  </div>
                </div>

                {selectedMatchDetail.replayAvailable && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium">Replay Available on Timeline Store</span>
                    <span className="text-[10px] font-mono bg-amber-500 text-zinc-950 font-bold px-2 py-0.5 rounded">
                      READY
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setSelectedMatchDetail(null)}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold py-2 rounded-xl text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
