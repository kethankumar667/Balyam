import { useState } from "react";
import type { RecentPlayer, FriendSummary } from "@shared/ranking/RecentPlayer";
import {
  FriendUserIcon,
  AddFriendUserIcon,
  RemoveFriendUserIcon,
  StatusConnectedIcon,
} from "../../design-system/icons";

interface RecentPlayersHubProps {
  recentPlayers: RecentPlayer[];
  friends: FriendSummary[];
  onAddFriend: (friendId: string) => Promise<void>;
  onRemoveFriend: (friendId: string) => Promise<void>;
}

export default function RecentPlayersHub({
  recentPlayers,
  friends,
  onAddFriend,
  onRemoveFriend,
}: RecentPlayersHubProps) {
  const [activeTab, setActiveTab] = useState<"recent" | "friends">("recent");
  const [friendIdInput, setFriendIdInput] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendIdInput.trim()) return;
    try {
      await onAddFriend(friendIdInput.trim());
      setFriendIdInput("");
      setActionMessage("Friend added successfully!");
      setTimeout(() => setActionMessage(null), 2500);
    } catch {
      setActionMessage("Could not add friend.");
    }
  };

  const handleQuickAdd = async (playerId: string) => {
    try {
      await onAddFriend(playerId);
      setActionMessage("Friend added!");
      setTimeout(() => setActionMessage(null), 2500);
    } catch {
      setActionMessage("Failed to add friend.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Tabs & Add Friend form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 dark:bg-zinc-900/60 border border-stone-800 dark:border-zinc-800 rounded-xl p-3.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "recent"
                ? "bg-amber-500 text-zinc-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <FriendUserIcon size={14} />
            Recent Opponents ({recentPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "friends"
                ? "bg-amber-500 text-zinc-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <FriendUserIcon size={14} />
            Friends List ({friends.length})
          </button>
        </div>

        {/* Add Friend Input */}
        <form onSubmit={handleAddFriendSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add player ID..."
            value={friendIdInput}
            onChange={(e) => setFriendIdInput(e.target.value)}
            className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-1 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-3 py-1 rounded-lg transition shrink-0 flex items-center gap-1"
          >
            <AddFriendUserIcon size={12} />
            Add
          </button>
        </form>
      </div>

      {actionMessage && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-3 py-2 rounded-lg font-mono">
          {actionMessage}
        </div>
      )}

      {/* Tab 1: Recent Opponents */}
      {activeTab === "recent" && (
        <div className="space-y-2">
          {recentPlayers.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs">
              No recent players yet. Play multiplayer games to connect with other players!
            </div>
          ) : (
            recentPlayers.map((rp) => (
              <div
                key={rp.playerId}
                className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rp.avatar || "👤"}</span>
                  <div>
                    <h4 className="font-bold text-sm text-stone-100 dark:text-zinc-100">
                      {rp.displayName}
                    </h4>
                    <span className="text-[11px] font-mono text-stone-400 block">
                      Played {rp.timesPlayedTogether} {rp.timesPlayedTogether === 1 ? "match" : "matches"} together • Last seen in {rp.lastGame || "Room"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuickAdd(rp.playerId)}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition border border-stone-700 flex items-center gap-1"
                  >
                    <AddFriendUserIcon size={12} />
                    Add Friend
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Friends List */}
      {activeTab === "friends" && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs">
              No friends added yet. Add players by ID or from your recent opponents!
            </div>
          ) : (
            friends.map((f) => (
              <div
                key={f.playerId}
                className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.avatar || "👤"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-stone-100 dark:text-zinc-100">
                        {f.displayName}
                      </h4>
                      {f.status === "online" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                          <StatusConnectedIcon size={10} /> Online
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-stone-500 block">
                      ID: {f.playerId}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveFriend(f.playerId)}
                  className="bg-stone-800/80 hover:bg-rose-900/40 text-stone-400 hover:text-rose-300 text-xs px-2.5 py-1 rounded-lg transition border border-stone-700 flex items-center gap-1"
                >
                  <RemoveFriendUserIcon size={12} />
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
