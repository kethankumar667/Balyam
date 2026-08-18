import { useState } from "react";
import type { RecentPlayer, FriendSummary } from "@shared/ranking/RecentPlayer";

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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "recent"
                ? "bg-amber-500 text-zinc-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            👥 Recent Opponents ({recentPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "friends"
                ? "bg-amber-500 text-zinc-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            ⭐ Friends List ({friends.length})
          </button>
        </div>

        {/* Add Friend Form */}
        <form onSubmit={handleAddFriendSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Friend Player ID..."
            value={friendIdInput}
            onChange={(e) => setFriendIdInput(e.target.value)}
            className="bg-stone-950 dark:bg-zinc-950 border border-stone-800 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 w-full sm:w-44 font-mono"
          />
          <button
            type="submit"
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0"
          >
            + Add
          </button>
        </form>
      </div>

      {actionMessage && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-4 py-2 rounded-xl text-center">
          {actionMessage}
        </div>
      )}

      {/* Tab 1: Recent Opponents */}
      {activeTab === "recent" && (
        <>
          {recentPlayers.length === 0 ? (
            <div className="bg-stone-900/40 dark:bg-zinc-900/40 border border-stone-800 dark:border-zinc-800 rounded-xl p-8 text-center text-stone-500 text-xs">
              No recent players yet. Join any live multiplayer room to meet opponents!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentPlayers.map((player) => {
                const timeAgo = formatTimeAgo(player.lastPlayedAt);
                const isAlreadyFriend = friends.some((f) => f.playerId === player.playerId);

                return (
                  <div
                    key={player.playerId}
                    className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{player.avatar || "👤"}</span>
                      <div>
                        <span className="font-bold text-sm text-stone-100 block truncate max-w-[120px]">
                          {player.displayName}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400 block">
                          Played {player.lastGame} • {player.timesPlayedTogether}x
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">
                          {timeAgo}
                        </span>
                      </div>
                    </div>

                    {!isAlreadyFriend && (
                      <button
                        onClick={() => handleQuickAdd(player.playerId)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg text-xs font-semibold transition"
                      >
                        + Friend
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Friends List */}
      {activeTab === "friends" && (
        <>
          {friends.length === 0 ? (
            <div className="bg-stone-900/40 dark:bg-zinc-900/40 border border-stone-800 dark:border-zinc-800 rounded-xl p-8 text-center text-stone-500 text-xs">
              Your friends list is empty. Add friends from recent matches or by their Player ID above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map((friend) => (
                <div
                  key={friend.playerId}
                  className="bg-stone-900/80 dark:bg-zinc-900/80 border border-stone-800 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{friend.avatar || "👤"}</span>
                    <div>
                      <span className="font-bold text-sm text-stone-100 block">
                        {friend.displayName}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-mono text-emerald-400 uppercase">
                          {friend.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveFriend(friend.playerId)}
                    className="text-xs text-stone-500 hover:text-rose-400 transition font-mono px-2 py-1"
                    title="Remove friend"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
