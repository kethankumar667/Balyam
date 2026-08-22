import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  User,
  VolumeX,
  Volume2,
  Share2,
  ExternalLink,
  Gamepad2,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import SeatAvatar from "./SeatAvatar";
import { apiFetch } from "../../lib/playerIdentity";
import { useRoomStore } from "../../store/roomStore";
import { useToast } from "../../hooks/useToast";
import { type PlayerProfile } from "@shared/profile/PlayerProfile";
import { type PlayerStats } from "@shared/profile/PlayerStats";

export interface PlayerMiniProfilePopoverProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  displayName: string;
  avatarId?: string | null;
  /** Anchor position if rendering floating, or centers if omitted */
  anchorRect?: DOMRect | null;
}

export default function PlayerMiniProfilePopover({
  open,
  onClose,
  playerId,
  displayName,
  avatarId,
}: PlayerMiniProfilePopoverProps) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const selfPlayerId = useRoomStore((s) => s.playerId);
  const roomCode = useRoomStore((s) => s.roomState?.code);
  const isSelf = selfPlayerId === playerId;
  const { info, success, warning, error } = useToast();

  const [isMuted, setIsMuted] = useState(false);

  // Fetch public profile and stats
  useEffect(() => {
    if (!open || !playerId) return;
    let cancelled = false;
    setLoading(true);

    async function loadData() {
      try {
        const [profRes, statsRes] = await Promise.all([
          apiFetch(`/api/profile/${playerId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(`/api/profile/${playerId}/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (cancelled) return;
        if (profRes?.profile) setProfile(profRes.profile);
        if (statsRes?.stats) setStats(statsRes.stats);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [open, playerId]);

  if (!open) return null;

  const winRate = stats ? stats.winRate : 0;

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      info(next ? `Muted ${displayName}` : `Unmuted ${displayName}`);
      return next;
    });
  };

  const handleInviteToRoom = async () => {
    if (!roomCode) {
      warning("No active room to invite to");
      return;
    }
    const url = `${window.location.origin}/room/${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      success(`Copied room invite link for ${displayName}!`);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      error("Could not copy invite link");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          aria-hidden="true"
        />

        {/* Modal Popover Card */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Player Profile: ${displayName}`}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] text-[var(--chrome-ink)] p-5 space-y-4 z-10"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile popover"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--chrome-control)] border border-[var(--chrome-border)] flex items-center justify-center text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header & Avatar */}
          <div className="flex items-center gap-3.5 pt-1">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-md bg-[var(--chrome-active-bg)] flex items-center justify-center flex-shrink-0">
              <SeatAvatar
                avatar={profile?.avatar || avatarId || undefined}
                name={displayName}
                className="w-full h-full"
                textClassName="text-lg font-bold"
              />
            </div>
            <div className="min-w-0 pr-6">
              <h2 className="text-base font-black truncate text-[var(--chrome-ink)] flex items-center gap-1.5">
                <span>{profile?.displayName || displayName}</span>
                {isSelf && (
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500">
                    You
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--chrome-ink-soft)] font-medium">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Level {profile?.level || 1}</span>
                </span>
                <span>•</span>
                <span>{profile?.experiencePoints || 0} XP</span>
              </div>
            </div>
          </div>

          {/* Player Stats Grid */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[var(--chrome-control)]/50 border border-[var(--chrome-border)] text-center">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Matches</div>
              <div className="text-sm font-black text-[var(--chrome-ink)]">
                {stats?.totalMatches || 0}
              </div>
            </div>
            <div className="space-y-0.5 border-x border-[var(--chrome-hairline)]">
              <div className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Win Rate</div>
              <div className="text-sm font-black text-amber-500">
                {winRate}%
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-[var(--chrome-ink-soft)]">Fav Game</div>
              <div className="text-xs font-bold text-[var(--chrome-ink)] truncate px-1">
                {stats?.favoriteGame && stats.favoriteGame !== "none"
                  ? stats.favoriteGame
                  : "Ludo"}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {isSelf ? (
              <Link
                to="/profile"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] border border-[var(--chrome-border)] text-xs font-bold transition"
              >
                <User className="w-4 h-4 text-amber-500" />
                <span>Manage My Profile</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-auto" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleInviteToRoom}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--chrome-active-bg)] hover:bg-amber-500 hover:text-stone-950 border border-amber-500/40 text-xs font-bold text-[var(--chrome-accent)] transition cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? "Invite Link Copied!" : "Invite to Active Room"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isMuted
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                  }`}
                >
                  {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{isMuted ? `Unmute ${displayName}` : `Mute Chat & Reactions`}</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
