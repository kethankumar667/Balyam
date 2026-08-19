import React from "react";
import type { Friend } from "@shared/social/Friend";
import type { PlayerPresence } from "@shared/social/Presence";
import { StatusConnectedIcon, SwordsClashIcon, AddFriendUserIcon } from "../../design-system/icons";
import SeatAvatar from "../../components/profile/SeatAvatar";

interface OnlineFriendsPanelProps {
  friends: Friend[];
  presences: Record<string, PlayerPresence>;
  onInviteToParty: (friend: Friend) => void;
  onOpenInviteModal?: () => void;
}

export default function OnlineFriendsPanel({
  friends,
  presences,
  onInviteToParty,
  onOpenInviteModal,
}: OnlineFriendsPanelProps) {
  const onlineFriends = friends.filter((f) => {
    const presence = presences[f.friendPlayerId];
    return presence && presence.status !== "OFFLINE";
  });

  const count = onlineFriends.length;

  return (
    <div className="rounded-2xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-4 sm:p-5 shadow-sm transition-all relative overflow-hidden">
      {/* Glow flare */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <StatusConnectedIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {count > 0 ? "LIVE ACTIVE" : "LOUNGE STATUS"}
              </span>
              <span className="text-xs font-bold text-[var(--auth-ink)]">
                {count > 0
                  ? `${count} friend${count === 1 ? "" : "s"} currently online in the lounge!`
                  : "No friends currently active in the lounge"}
              </span>
            </div>
            <p className="text-xs text-[var(--auth-ink-soft)] mt-0.5">
              {count > 0
                ? "Invite your active friends into your table or assemble a squad to queue together."
                : "Send friend requests by Player ID or add opponents from your recent matches to build your squad."}
            </p>
          </div>
        </div>

        {/* Quick Trigger Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {count > 0 ? (
            <button
              onClick={() => onInviteToParty(onlineFriends[0])}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs uppercase font-mono tracking-wider transition shadow-sm flex items-center gap-1.5"
            >
              <SwordsClashIcon size={14} />
              Party Invite
            </button>
          ) : (
            onOpenInviteModal && (
              <button
                onClick={onOpenInviteModal}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs uppercase font-mono tracking-wider transition shadow-sm flex items-center gap-1.5"
              >
                <AddFriendUserIcon size={14} />
                Invite Friends
              </button>
            )
          )}
        </div>
      </div>

      {/* Online Friends Mini Avatar Strip (when friends are active) */}
      {count > 0 && (
        <div className="mt-3.5 pt-3 border-t border-[var(--auth-field-edge)] flex flex-wrap items-center gap-2 relative z-10">
          <span className="text-[11px] font-mono text-[var(--auth-ink-soft)] font-bold mr-1">
            Online Now:
          </span>
          {onlineFriends.map((f) => (
            <div
              key={f.friendPlayerId}
              className="bg-[var(--auth-field)] border border-[var(--auth-field-edge)] hover:border-amber-500/40 rounded-xl px-2.5 py-1.5 flex items-center gap-2 transition"
            >
              <SeatAvatar
                avatar={f.avatar}
                name={f.displayName}
                className="w-6 h-6 rounded-lg flex-shrink-0"
                textClassName="text-xs"
              />
              <span className="text-xs font-bold text-[var(--auth-ink)] truncate max-w-[100px]">
                {f.displayName}
              </span>
              <button
                onClick={() => onInviteToParty(f)}
                className="bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-zinc-950 p-1 rounded-lg transition"
                title={`Invite ${f.displayName} to Party`}
                aria-label={`Invite ${f.displayName} to Party`}
              >
                <SwordsClashIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
