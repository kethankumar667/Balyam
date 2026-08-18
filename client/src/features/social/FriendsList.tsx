import { useState } from "react";
import type { Friend } from "@shared/social/Friend";
import type { PlayerPresence } from "@shared/social/Presence";
import {
  FriendUserIcon,
  RemoveFriendUserIcon,
  StatusConnectedIcon,
  SwordsClashIcon,
  ChatBubbleIcon,
} from "../../design-system/icons";
import { SURFACES } from "../../design-system/dls";
import { EmptyStateIllustration } from "../../design-system/premium";

interface FriendsListProps {
  friends: Friend[];
  presences: Record<string, PlayerPresence>;
  onRemoveFriend: (friendPlayerId: string) => Promise<void>;
  onInviteToParty: (friend: Friend) => void;
  onViewHistory: (friend: Friend) => void;
}

export default function FriendsList({
  friends,
  presences,
  onRemoveFriend,
  onInviteToParty,
  onViewHistory,
}: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = friends.filter((f) =>
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter friends by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-stone-950/80 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
        />
      </div>

      {filteredFriends.length === 0 ? (
        <EmptyStateIllustration
          type="friends"
          title="No Friends Found"
          description="Send friend requests by Player ID or add opponents from your recent multiplayer rooms."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFriends.map((f) => {
            const presence = presences[f.friendPlayerId];
            const isOnline = presence && presence.status !== "OFFLINE";

            return (
              <div
                key={f.friendPlayerId}
                className={`${SURFACES.cardDefault} p-4 flex flex-col justify-between space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-xl shadow">
                      {f.avatar || "👤"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-stone-100 dark:text-zinc-100">
                          {f.displayName}
                        </h4>
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <StatusConnectedIcon size={10} /> Online
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-stone-500">Offline</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 block">
                        ID: {f.friendPlayerId}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewHistory(f)}
                    className="text-stone-400 hover:text-amber-400 text-xs font-mono transition p-1"
                    title="View Shared Match History"
                  >
                    📜 History
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/60 text-xs">
                  <button
                    onClick={() => onInviteToParty(f)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1 text-[11px] font-mono uppercase"
                  >
                    <SwordsClashIcon size={12} />
                    Party Invite
                  </button>
                  <button
                    onClick={() => onRemoveFriend(f.friendPlayerId)}
                    className="bg-stone-800/80 hover:bg-rose-950/40 text-stone-400 hover:text-rose-300 py-1.5 px-2.5 rounded-lg border border-stone-750 transition"
                    title="Remove Friend"
                  >
                    <RemoveFriendUserIcon size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
