import { useEffect, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import { validateName, type FieldError } from "../lib/authValidation";
import { GlobalSettings } from "../components/GlobalSettings";
import LanguageSettings from "../components/LanguageSettings/LanguageSettings";
import AvatarPicker from "../components/profile/AvatarPicker";
import AppLayout from "../components/layout/AppLayout";
import YourDataPanel from "../components/privacy/YourDataPanel";

/**
 * Lazy, not a static import.
 *
 * This route already carries every `features/profile/*` panel for the MEMBER
 * path. `MemberLockedGate` only renders for the GUEST path (the early return
 * below) — bundling it statically put a component the member branch never
 * touches on every visitor's download, and tipped this chunk 120 bytes over
 * `scripts/quality-gates/bundleBudgetGuard.mjs`'s 35 KB budget. Splitting it
 * costs one more request on the minority path and nothing on the majority one.
 */
const MemberLockedGate = lazy(() => import("../components/auth/MemberLockedGate"));

// Profile Features
import ProfileHeader from "../features/profile/ProfileHeader";
import StatsOverview from "../features/profile/StatsOverview";
import FavoriteGames from "../features/profile/FavoriteGames";
import CareerMetrics from "../features/profile/CareerMetrics";
import AchievementsPanel from "../features/profile/AchievementsPanel";
import MatchHistoryList from "../features/profile/MatchHistoryList";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { MatchHistoryItem, MatchDetailRecord } from "@shared/profile/MatchHistory";
import type { Achievement } from "@shared/profile/Achievements";
import type { GameKind } from "@shared/types";

import {
  ArrowLeftIcon,
  FaceIcon,
  GlobeIcon,
  ShieldIcon,
  SlidersIcon,
  UserIcon,
} from "../components/auth/authIcons";

const CARD =
  "rounded-3xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] " +
  "shadow-sm";

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
    <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] flex items-center justify-center text-amber-500 flex-shrink-0">
        {icon}
      </span>
      <h2 className="text-base font-extrabold text-[var(--auth-ink)] tracking-tight">
        {title}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);
  const setPlayerName = useRoomStore((s) => s.setPlayerName);
  const setAvatarId = useRoomStore((s) => s.setAvatarId);

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

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  if (!isMember) {
    // `lazy()` requires a Suspense boundary on every render path that reaches
    // it, not just the common one — this IS the only render path for a guest,
    // so skipping the wrapper here would throw for every guest who lands on
    // this route, which is the audience it exists to serve.
    return (
      <Suspense fallback={null}>
        <MemberLockedGate feature="profile" />
      </Suspense>
    );
  }

  const loadProfileData = async () => {
    if (!effectivePlayerId) return;
    try {
      const [profRes, statsRes, matchRes, achRes] = await Promise.all([
        apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/matches${selectedGame ? `?game=${selectedGame}` : ""}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        apiFetch(`/api/profile/${effectivePlayerId}/achievements`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (profRes?.profile) {
        setProfile(profRes.profile);
        if (profRes.profile.displayName && profRes.profile.displayName !== currentName) {
          setPlayerName(profRes.profile.displayName);
        }
        if (profRes.profile.avatar !== undefined && profRes.profile.avatar !== currentAvatar) {
          setAvatarId(profRes.profile.avatar || null);
        }
      } else {
        setProfile({
          playerId: effectivePlayerId ?? "",
          displayName: currentName || (isMember ? "Member" : "Guest"),
          avatar: currentAvatar || undefined,
          joinedAt: Date.now() - 86400000 * 7,
          lastSeenAt: Date.now(),
          level: 1,
          experiencePoints: 0,
        });
      }
      if (statsRes?.stats) setStats(statsRes.stats);
      if (matchRes?.matches) {
        setMatches(matchRes.matches);
        setTotalMatches(matchRes.total || 0);
      }
      if (achRes?.achievements) setAchievements(achRes.achievements);
      setLoading(false);
    } catch (err) {
      console.warn("Could not load backend profile, using local defaults:", err);
      // Fallback local representation
      setProfile({
        playerId: effectivePlayerId ?? "",
        displayName: currentName || (isMember ? "Member" : "Guest"),
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

  const unlockedAchievementsCount = achievements.filter((a) => a.unlocked).length;

  return (
    <AppLayout>
      <div className="min-h-screen bhalyam-paper py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Header Breadcrumbs Bar */}
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
                className="text-amber-500 hover:text-amber-400 transition underline underline-offset-2 min-h-[44px] py-2 inline-flex items-center"
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
              isMember={isMember}
              onEditName={() => setActiveTab("settings")}
            />
          )}

          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--auth-card-edge)] pb-3 overflow-x-auto text-xs font-bold font-mono">
            <button
              onClick={() => setActiveTab("career")}
              className={`px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 ${
                activeTab === "career"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
              }`}
            >
              📊 Career & Stats
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
              }`}
            >
              📜 Match History ({totalMatches})
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 ${
                activeTab === "achievements"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
              }`}
            >
              🏆 Achievements ({unlockedAchievementsCount}/{achievements.length})
            </button>
            <button
              onClick={() => navigate("/profile/personal")}
              className="px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
            >
              👤 Personal Information
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2.5 rounded-xl transition shrink-0 min-h-[44px] flex items-center gap-2 ${
                activeTab === "settings"
                  ? "bg-amber-500 text-zinc-950 font-black shadow-md"
                  : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] border border-[var(--auth-card-edge)]"
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
              <section className={`${CARD} p-6 space-y-4`}>
                <CardHead icon={<UserIcon className="w-[18px] h-[18px]" />} title="Display Name" />
                <form onSubmit={handleSaveName} className="space-y-3.5">
                  <div>
                    <label htmlFor="displayNameInput" className="text-xs font-bold text-[var(--auth-ink-soft)] block mb-1 font-mono">
                      Your Lounge Name
                    </label>
                    <input
                      id="displayNameInput"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={24}
                      className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 font-mono transition"
                    />
                    {nameError && (
                      <p className="text-xs text-rose-500 mt-1 font-mono">{nameError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition shadow-xs"
                  >
                    {nameSaved ? "Saved!" : "Update Name"}
                  </button>
                </form>
              </section>

              <section className={`${CARD} p-6`}>
                <CardHead icon={<FaceIcon className="w-[18px] h-[18px]" />} title="Avatar Customization" />
                <AvatarPicker value={currentAvatar} onChange={handleSelectAvatar} />
              </section>

              <section className={`${CARD} p-6`}>
                <CardHead icon={<SlidersIcon className="w-[18px] h-[18px]" />} title="Game Audio & Sound FX" />
                <GlobalSettings />
              </section>

              <section className={`${CARD} p-6`}>
                <CardHead icon={<GlobeIcon className="w-[18px] h-[18px]" />} title="Language Settings" />
                <LanguageSettings embedded hideHeading />
              </section>

              <section className={`${CARD} p-6 lg:col-span-2`}>
                <CardHead icon={<ShieldIcon className="w-[18px] h-[18px]" />} title="Privacy & Data Transparency" />
                <YourDataPanel headingLevel="h3" hideHeading />
              </section>
            </div>
          )}

          {/* Match Detail Modal */}
          {selectedMatchDetail && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="matchDetailTitle"
            >
              <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--auth-field-edge)] pb-3.5">
                  <h3 id="matchDetailTitle" className="font-extrabold text-base text-[var(--auth-ink)] capitalize">
                    Match Details — {selectedMatchDetail.game} (#{selectedMatchDetail.roomCode})
                  </h3>
                  <button
                    onClick={() => setSelectedMatchDetail(null)}
                    className="text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] text-sm font-bold p-1 rounded-lg"
                    aria-label="Close dialog"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-[var(--auth-field)] p-3.5 rounded-2xl border border-[var(--auth-field-edge)]">
                    <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase font-bold">Outcome</span>
                    <span className="font-black text-sm text-emerald-500">{selectedMatchDetail.result}</span>
                  </div>
                  <div className="bg-[var(--auth-field)] p-3.5 rounded-2xl border border-[var(--auth-field-edge)]">
                    <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase font-bold">Duration</span>
                    <span className="font-black text-sm text-[var(--auth-ink)]">{Math.round(selectedMatchDetail.durationMs / 1000)}s</span>
                  </div>
                  <div className="bg-[var(--auth-field)] p-3.5 rounded-2xl border border-[var(--auth-field-edge)]">
                    <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase font-bold">Total Moves</span>
                    <span className="font-black text-sm text-[var(--auth-ink)]">{selectedMatchDetail.movesCount}</span>
                  </div>
                  <div className="bg-[var(--auth-field)] p-3.5 rounded-2xl border border-[var(--auth-field-edge)]">
                    <span className="text-[10px] text-[var(--auth-ink-soft)] block uppercase font-bold">Winner</span>
                    <span className="font-black text-sm text-amber-500">{selectedMatchDetail.winnerName || "None / Tie"}</span>
                  </div>
                </div>

                {selectedMatchDetail.replayAvailable && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-500 font-bold">Replay Available on Timeline Store</span>
                    <span className="text-[10px] bg-amber-500 text-zinc-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                      READY
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setSelectedMatchDetail(null)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition shadow-xs"
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
