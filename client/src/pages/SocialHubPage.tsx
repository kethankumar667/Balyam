import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, ShieldCheck, Inbox } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";
import { usePlayerId } from "../lib/playerIdentity";
import FriendRequestPanel from "../features/social/FriendRequestPanel";
import FriendsList from "../features/social/FriendsList";
import type { FriendRequest } from "@shared/social/FriendRequest";
import type { Friend } from "@shared/social/Friend";
import type { PlayerPresence } from "@shared/social/Presence";
import {
  getFriendRequests,
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
} from "../lib/api/social";
import { errorMessage } from "../lib/errorMessage";

type LoadState = "loading" | "ready" | "error";

/**
 * No presence is passed: presence today is whatever a client last asserted, and
 * nothing asserts it, so any status shown here would be invented. `FriendsList`
 * shows no status for a friend with no entry. The presence work replaces this.
 */
const NO_PRESENCE: Record<string, PlayerPresence> = {};

function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-24 rounded-3xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] animate-pulse motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3"
    >
      <p className="text-sm font-bold text-rose-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black font-mono uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Retry
      </button>
    </div>
  );
}

export default function SocialHubPage() {
  const { isSuperAdmin, capabilities } = useAuthStore();
  const { playerId } = usePlayerId();
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsState, setFriendsState] = useState<LoadState>("loading");
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [requestsState, setRequestsState] = useState<LoadState>("loading");
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * `silent` is a refresh after an action: the lists on screen stay put and a
   * failure becomes the banner. Without it (first load, Retry) a failure takes
   * over the tab, so an empty list is never mistaken for "nothing here".
   */
  const loadFriends = useCallback(
    async (silent = false) => {
      if (!playerId) return;
      if (!silent) setFriendsState("loading");
      try {
        const res = await getFriends(playerId);
        setFriends(res.friends);
        setFriendsState("ready");
      } catch (err: unknown) {
        if (silent) {
          setActionError(errorMessage(err, "Couldn't refresh your friends list."));
          return;
        }
        setFriendsError(errorMessage(err, "Couldn't load your friends."));
        setFriendsState("error");
      }
    },
    [playerId],
  );

  const loadRequests = useCallback(
    async (silent = false) => {
      if (!playerId) return;
      if (!silent) setRequestsState("loading");
      try {
        const res = await getFriendRequests(playerId);
        setIncomingRequests(res.incoming);
        setOutgoingRequests(res.outgoing);
        setRequestsState("ready");
      } catch (err: unknown) {
        if (silent) {
          setActionError(errorMessage(err, "Couldn't refresh your friend requests."));
          return;
        }
        setRequestsError(errorMessage(err, "Couldn't load your friend requests."));
        setRequestsState("error");
      }
    },
    [playerId],
  );

  useEffect(() => {
    void loadFriends();
    void loadRequests();
  }, [loadFriends, loadRequests]);

  /**
   * Runs one request action. A failure is shown in the banner AND rethrown so
   * the panel can stop its own "sent!" feedback; the refresh after a success is
   * silent and never turns a completed action into a failure.
   */
  const runAction = async (action: () => Promise<unknown>, fallback: string, alsoFriends = false) => {
    setActionError(null);
    try {
      await action();
    } catch (err: unknown) {
      setActionError(errorMessage(err, fallback));
      throw err;
    }
    await loadRequests(true);
    if (alsoFriends) await loadFriends(true);
  };

  const handleSendFriendRequest = (recipientId: string) =>
    runAction(() => sendFriendRequest(recipientId), "Failed to send friend request", true);

  const handleAcceptRequest = (requestId: string) =>
    runAction(() => acceptFriendRequest(requestId), "Failed to accept friend request", true);

  const handleDeclineRequest = (requestId: string) =>
    runAction(() => declineFriendRequest(requestId), "Failed to decline friend request");

  const handleCancelRequest = (requestId: string) =>
    runAction(async () => {
      await cancelFriendRequest(requestId);
      setOutgoingRequests((prev) => prev.filter((r) => r.id !== requestId));
    }, "Failed to cancel friend request");

  /** A rejection propagates to the confirm dialog, which shows it and stays open. */
  const handleRemoveFriend = async (friendPlayerId: string) => {
    if (!playerId) return;
    await removeFriend(playerId, friendPlayerId);
    setFriends((prev) => prev.filter((f) => f.friendPlayerId !== friendPlayerId));
    void loadFriends(true);
  };

  if (!isSuperAdmin && !capabilities.unlockAllFeatures) {
    return (
      <ComingSoonGate
        title="Social Hub & Squads"
        subtitle="Friends, Parties & Lounge Hangouts"
        description="BHALYAM Social Hub is coming soon. Connect with lounge friends, form private parties, track shared rivalries, and challenge players directly."
        icon={Users}
        iconBgGradient="from-emerald-500 via-teal-500 to-amber-500"
        accentColor="text-emerald-400"
        features={[
          "Friend Lists & Real-Time Presence",
          "Private Squads & Party Rooms",
          "Direct Match Invites & Rematch Logs",
          "Shared Head-to-Head Match History",
        ]}
      />
    );
  }

  const requestCount = incomingRequests.length + outgoingRequests.length;
  const tabClass = (tab: "friends" | "requests") =>
    `min-h-[44px] px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
      activeTab === tab
        ? "bg-amber-500 text-zinc-950 font-black shadow-sm"
        : "bg-[var(--chrome-panel)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] border border-[var(--chrome-border)]"
    }`;

  return (
    <AppLayout>
      <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        {/* Super Admin Unlock Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-500">
                  ⚡ Super Admin Access Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                  Feature Unlocked
                </span>
              </div>
              <p className="text-xs text-[var(--chrome-ink-soft)]">
                The Social Hub is still locked for players. Your role unlocks it, and what you see here is
                real data on your own account.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition"
            >
              Admin User Console →
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--chrome-ink)] flex items-center gap-3">
              <Users className="w-7 h-7 text-emerald-500" />
              Social Hub & Player Network
            </h1>
            <p className="text-xs sm:text-sm text-[var(--chrome-ink-soft)] mt-1">
              Your friends and friend requests
            </p>
          </div>
        </div>

        {/* Navigation Category Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--chrome-border)] pb-3 text-xs font-bold font-mono">
          <button type="button" onClick={() => setActiveTab("friends")} className={tabClass("friends")}>
            <Users className="w-4 h-4" />
            Friends{friendsState === "ready" ? ` (${friends.length})` : ""}
          </button>
          <button type="button" onClick={() => setActiveTab("requests")} className={tabClass("requests")}>
            <Inbox className="w-4 h-4" />
            Requests{requestsState === "ready" ? ` (${requestCount})` : ""}
          </button>
        </div>

        {/* Global Action Error Banner */}
        {actionError && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono flex items-center justify-between"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-bold hover:underline px-2 py-1 min-h-[44px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "friends" && friendsState === "loading" && <ListSkeleton label="Loading your friends" />}
        {activeTab === "friends" && friendsState === "error" && (
          <LoadFailure message={friendsError ?? "Couldn't load your friends."} onRetry={() => void loadFriends()} />
        )}
        {activeTab === "friends" && friendsState === "ready" && (
          <FriendsList
            friends={friends}
            presences={NO_PRESENCE}
            onRemoveFriend={handleRemoveFriend}
            onOpenInviteModal={() => setActiveTab("requests")}
          />
        )}

        {activeTab === "requests" && requestsState === "loading" && (
          <ListSkeleton label="Loading your friend requests" />
        )}
        {activeTab === "requests" && requestsState === "error" && (
          <LoadFailure
            message={requestsError ?? "Couldn't load your friend requests."}
            onRetry={() => void loadRequests()}
          />
        )}
        {activeTab === "requests" && requestsState === "ready" && (
          <FriendRequestPanel
            incoming={incomingRequests}
            outgoing={outgoingRequests}
            onSendRequest={handleSendFriendRequest}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
            onCancelRequest={handleCancelRequest}
          />
        )}
      </div>
    </AppLayout>
  );
}
