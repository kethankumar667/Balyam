import React from "react";
import type { Friend } from "@shared/social/Friend";
import type { PlayerPresence } from "@shared/social/Presence";
import { StatusConnectedIcon, SwordsClashIcon } from "../../design-system/icons";
import { SURFACES } from "../../design-system/dls";

interface OnlineFriendsPanelProps {
  friends: Friend[];
  presences: Record<string, PlayerPresence>;
  onInviteToParty: (friend: Friend) => void;
}

export default function OnlineFriendsPanel({
  friends,
  presences,
  onInviteToParty,
}: OnlineFriendsPanelProps) {
  const onlineFriends = friends.filter((f) => {
    const presence = presences[f.friendPlayerId];
    return presence && presence.status !== "OFFLINE";
  });

  if (onlineFriends.length === 0) {
    return (
      <div className={`${SURFACES.panelSubtle} p-4 text-center text-xs font-mono text-stone-500`}>
        No friends are currently active in the lounge.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <StatusConnectedIcon size={12} />
          Active In Lounge ({onlineFriends.length})
        </h4>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {onlineFriends.map((f) => (
          <div
            key={f.friendPlayerId}
            className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow transition"
          >
            <span className="text-xl">{f.avatar || "👤"}</span>
            <div>
              <span className="text-xs font-bold text-stone-200 block leading-tight">
                {f.displayName}
              </span>
              <span className="text-[9px] font-mono text-emerald-400 block">
                {presences[f.friendPlayerId]?.activityDetail || "Online"}
              </span>
            </div>
            <button
              onClick={() => onInviteToParty(f)}
              className="ml-1 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 p-1.5 rounded-lg border border-amber-500/30 transition text-xs"
              title="Invite to Party"
            >
              <SwordsClashIcon size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
