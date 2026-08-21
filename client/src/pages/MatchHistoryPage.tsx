import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { History, Filter, Gamepad2, ArrowRight } from "lucide-react";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
import ProfileLayout from "../components/layout/ProfileLayout";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import MatchHistoryList from "../features/profile/MatchHistoryList";
import { ProfileSkeleton } from "../design-system/dls";

import type { PlayerProfile } from "@shared/profile/PlayerProfile";
import type { MatchHistoryItem, MatchDetailRecord } from "@shared/profile/MatchHistory";
import type { GameKind } from "@shared/types";

const GAME_FILTER_TABS: { label: string; kind?: GameKind }[] = [
  { label: "All Games" },
  { label: "Ludo", kind: "ludo" },
  { label: "Rummy", kind: "rummy" },
  { label: "Hand Cricket", kind: "handcricket" },
  { label: "UNO", kind: "uno" },
  { label: "Snakes & Ladders", kind: "snl" },
  { label: "Dots & Boxes", kind: "dotsboxes" },
];

export default function MatchHistoryPage() {
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [selectedGame, setSelectedGame] = useState<GameKind | undefined>();
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<MatchDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const { playerId: effectivePlayerId, ready: identityReady } = usePlayerId();

  if (!isMember) {
    return <MemberLockedGate feature="profile" />;
  }

  useEffect(() => {
    if (!identityReady || !effectivePlayerId) return;

    async function fetchData() {
      try {
        const [profRes, matchRes] = await Promise.all([
          apiFetch(`/api/profile/${effectivePlayerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(`/api/profile/${effectivePlayerId}/matches${selectedGame ? `?game=${selectedGame}` : ""}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (profRes?.profile) {
          setProfile(profRes.profile);
        } else {
          setProfile({
            playerId: effectivePlayerId ?? "",
            displayName: currentName || "Member",
            avatar: currentAvatar || undefined,
            joinedAt: Date.now() - 86400000 * 30,
            lastSeenAt: Date.now(),
            level: 1,
            experiencePoints: 0,
          });
        }

        if (matchRes?.matches) {
          setMatches(matchRes.matches);
          setTotalMatches(matchRes.total || matchRes.matches.length);
        }
      } catch (err) {
        console.warn("Could not load match history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [identityReady, effectivePlayerId, selectedGame]);

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

  if (loading || !profile) {
    return (
      <ProfileLayout profile={null}>
        <ProfileSkeleton />
      </ProfileLayout>
    );
  }

  const hasAnyMatches = totalMatches > 0 || matches.length > 0;

  return (
    <ProfileLayout
      profile={profile}
      isMember={isMember}
      name={currentName}
      avatar={currentAvatar}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--auth-card-edge)] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--auth-ink)] flex items-center gap-2">
              <History className="w-6 h-6 text-amber-500" />
              <span>Match History</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--auth-ink-soft)] font-medium mt-0.5">
              Review match records, scorecards, opponent details, and match durations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/games"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition shadow-2xs"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Play a Game</span>
            </Link>
          </div>
        </div>

        {/* ── Progressive Disclosure: Direct Zero-State vs Filterable List ── */}
        {!hasAnyMatches && !selectedGame ? (
          <div className="p-8 sm:p-12 text-center bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl space-y-3 max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-[var(--auth-ink)]">No matches recorded yet</h3>
            <p className="text-xs text-[var(--auth-ink-soft)] max-w-sm mx-auto leading-relaxed">
              Play your first BHALYAM game in Ludo, Rummy, or Hand Cricket, and your match memories will show up here.
            </p>
            <div className="pt-2">
              <Link
                to="/games"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider hover:bg-amber-400 transition shadow-md"
              >
                <span>Explore Games</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <span className="text-xs font-mono font-bold text-[var(--auth-ink-soft)] flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                Filter:
              </span>
              {GAME_FILTER_TABS.map((tab) => {
                const active = selectedGame === tab.kind;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setSelectedGame(tab.kind)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                      active
                        ? "bg-amber-500 text-stone-950 border-amber-600 font-black shadow-2xs"
                        : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] border-[var(--auth-card-edge)] hover:text-[var(--auth-ink)] hover:border-amber-500/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Match History List */}
            <MatchHistoryList
              matches={matches}
              total={totalMatches}
              selectedGame={selectedGame}
              onSelectGame={(g) => setSelectedGame(g)}
              onViewMatchDetail={handleViewMatchDetail}
            />
          </div>
        )}
      </div>
    </ProfileLayout>
  );
}
