import { useState } from "react";
import { Ban, Flag } from "lucide-react";
import type { Friend } from "@shared/social/Friend";
import type { PlayerPresence } from "@shared/social/Presence";
import type { ReportReason } from "@shared/social/Report";
import {
  FriendUserIcon,
  RemoveFriendUserIcon,
  StatusConnectedIcon,
  SwordsClashIcon,
  SearchNavIcon,
  AddFriendUserIcon,
} from "../../design-system/icons";
import { SocialEmptyArtwork } from "./SocialArtwork";
import SeatAvatar from "../../components/profile/SeatAvatar";
import ConfirmDialog from "./ConfirmDialog";
import ReportPlayerDialog from "./ReportPlayerDialog";

type StatusFilter = "ALL" | "ONLINE" | "IN_GAME" | "OFFLINE";

interface FriendsListProps {
  friends: Friend[];
  /** Known presence by friend id. A friend with no entry has no status shown — nothing is assumed. */
  presences: Record<string, PlayerPresence>;
  onRemoveFriend: (friendPlayerId: string) => Promise<void>;
  /** The button is rendered only when a handler is supplied. */
  onInviteToParty?: (friend: Friend) => void;
  /** The button is rendered only when a handler is supplied. */
  onViewHistory?: (friend: Friend) => void;
  /** The Block button is rendered only when a handler is supplied. A rejection keeps the dialog open. */
  onBlockFriend?: (friend: Friend) => Promise<void>;
  /** The Report button is rendered only when a handler is supplied. A rejection keeps the dialog open. */
  onReportFriend?: (friend: Friend, reason: ReportReason) => Promise<void>;
  onOpenInviteModal?: () => void;
}

export default function FriendsList({
  friends,
  presences,
  onRemoveFriend,
  onInviteToParty,
  onViewHistory,
  onBlockFriend,
  onReportFriend,
  onOpenInviteModal,
}: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  // With no presence data at all, "online only" would just empty the list.
  const hasPresenceData = Object.keys(presences).length > 0;
  const [unfriendTarget, setUnfriendTarget] = useState<Friend | null>(null);
  const [blockTarget, setBlockTarget] = useState<Friend | null>(null);
  const [reportTarget, setReportTarget] = useState<Friend | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredFriends = friends.filter((f) => {
    const matchesSearch =
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.friendPlayerId.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const presence = presences[f.friendPlayerId];
    const isOnline = presence && presence.status !== "OFFLINE";
    const isInGame = presence && presence.status === "IN_GAME";

    if (statusFilter === "ONLINE" && !isOnline) return false;
    if (statusFilter === "IN_GAME" && !isInGame) return false;
    if (statusFilter === "OFFLINE" && isOnline) return false;

    return true;
  });

  return (
    <div className="space-y-4">
      {notice && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono flex items-center justify-between"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-bold hover:underline px-2 py-1 min-h-[44px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Status Filter Controls */}
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-3 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--auth-ink-soft)] pointer-events-none">
            <SearchNavIcon size={14} />
          </span>
          <input
            type="text"
            placeholder="Search friends by name or Player ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[var(--auth-ink)] placeholder-[var(--auth-ink-soft)] focus:outline-none focus:border-amber-500 font-mono transition"
          />
        </div>

        {/* Status Dropdown */}
        {hasPresenceData && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--auth-ink)] focus:outline-none focus:border-amber-500 font-mono cursor-pointer transition w-full sm:w-auto"
              aria-label="Filter friends by status"
            >
              <option value="ALL">All Statuses ({friends.length})</option>
              <option value="ONLINE">Online Only</option>
              <option value="IN_GAME">In Match Only</option>
              <option value="OFFLINE">Offline Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Friends Cards Grid / Empty State */}
      {filteredFriends.length === 0 ? (
        <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="flex justify-center">
            <SocialEmptyArtwork className="w-36 h-36" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-black text-lg text-[var(--auth-ink)] tracking-tight">
              {friends.length === 0 ? "No Friends Added Yet" : "No Matching Friends Found"}
            </h3>
            <p className="text-xs text-[var(--auth-ink-soft)] leading-relaxed">
              {friends.length === 0
                ? "Send friend requests by Player ID or add opponents from your recent multiplayer rooms to build your squad!"
                : "No friends in your list match the active search query or status filter. Try clearing the filters."}
            </p>
          </div>
          {onOpenInviteModal && friends.length === 0 && (
            <button
              onClick={onOpenInviteModal}
              className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-2.5 rounded-2xl text-xs uppercase font-mono tracking-wider transition shadow-md flex items-center gap-2 mx-auto"
            >
              <AddFriendUserIcon size={14} />
              Add Friend by ID
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredFriends.map((f) => {
            const presence = presences[f.friendPlayerId];
            const isOnline = presence && presence.status !== "OFFLINE";
            const isInGame = presence && presence.status === "IN_GAME";

            return (
              <div
                key={f.friendPlayerId}
                className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3.5 shadow-xs hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SeatAvatar
                      avatar={f.avatar}
                      name={f.displayName}
                      className="w-12 h-12 rounded-2xl border border-[var(--auth-field-edge)] shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform"
                      textClassName="text-xl"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-[var(--auth-ink)] leading-tight">
                        {f.displayName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {isInGame ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {presence?.activityDetail || "In Match"}
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        ) : presence ? (
                          <span className="text-[10px] font-mono text-[var(--auth-ink-soft)]">
                            Offline
                          </span>
                        ) : null}
                        <span className="text-[10px] font-mono text-[var(--auth-ink-soft)]">
                          #{f.friendPlayerId.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {onViewHistory && (
                    <button
                      onClick={() => onViewHistory(f)}
                      className="text-xs font-mono font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-xl transition flex items-center gap-1 flex-shrink-0"
                      title="View Shared Match History"
                      aria-label={`View shared history with ${f.displayName}`}
                    >
                      📜 History
                    </button>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--auth-field-edge)] text-xs">
                  {onInviteToParty && (
                    <button
                      onClick={() => onInviteToParty(f)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider shadow-xs"
                    >
                      <SwordsClashIcon size={14} />
                      Party Invite
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setUnfriendTarget(f)}
                    className="min-h-[44px] min-w-[44px] bg-[var(--auth-field)] hover:bg-rose-500/15 text-[var(--auth-ink-soft)] hover:text-rose-500 py-2 px-3 rounded-xl border border-[var(--auth-field-edge)] hover:border-rose-500/30 transition text-xs flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    title="Remove Friend"
                    aria-label={`Remove ${f.displayName} from friends`}
                  >
                    <RemoveFriendUserIcon size={14} />
                  </button>
                </div>

                {(onReportFriend || onBlockFriend) && (
                  <div className="flex items-center justify-end gap-2 text-xs">
                    {onReportFriend && (
                      <button
                        type="button"
                        onClick={() => setReportTarget(f)}
                        className="min-h-[44px] px-3 rounded-xl text-[var(--auth-ink-soft)] hover:text-amber-500 hover:bg-amber-500/10 transition flex items-center gap-1.5 font-mono font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        aria-label={`Report ${f.displayName}`}
                      >
                        <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                        Report
                      </button>
                    )}
                    {onBlockFriend && (
                      <button
                        type="button"
                        onClick={() => setBlockTarget(f)}
                        className="min-h-[44px] px-3 rounded-xl text-[var(--auth-ink-soft)] hover:text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-1.5 font-mono font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        aria-label={`Block ${f.displayName}`}
                      >
                        <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                        Block
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {unfriendTarget && (
        <ConfirmDialog
          idPrefix="unfriend"
          title="Remove Friend"
          description={
            <>
              Are you sure you want to remove{" "}
              <strong className="text-[var(--auth-ink)]">{unfriendTarget.displayName}</strong> from your
              friends list?
            </>
          }
          confirmLabel="Remove Friend"
          busyLabel="Removing…"
          fallbackError="Failed to remove friend. Please try again."
          onConfirm={() => onRemoveFriend(unfriendTarget.friendPlayerId)}
          onClose={() => setUnfriendTarget(null)}
        />
      )}

      {blockTarget && onBlockFriend && (
        <ConfirmDialog
          idPrefix="block"
          title="Block player"
          description={
            <>
              Block <strong className="text-[var(--auth-ink)]">{blockTarget.displayName}</strong>? They will
              be removed from your friends, any pending requests between you will end, and they won&apos;t be
              able to send you friend requests or party invites. They are not told.
            </>
          }
          confirmLabel="Block"
          busyLabel="Blocking…"
          fallbackError="Couldn't block this player. Please try again."
          onConfirm={() => onBlockFriend(blockTarget)}
          onClose={() => setBlockTarget(null)}
        />
      )}

      {reportTarget && onReportFriend && (
        <ReportPlayerDialog
          playerName={reportTarget.displayName}
          onReport={async (reason) => {
            await onReportFriend(reportTarget, reason);
            setNotice("Your report was sent.");
          }}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
