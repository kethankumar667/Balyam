import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Users, ShieldCheck, Inbox, Ban } from "lucide-react";
import ComingSoonGate from "../components/common/ComingSoonGate";
import AppLayout from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";
import { usePlayerId } from "../lib/playerIdentity";
import FriendRequestPanel from "../features/social/FriendRequestPanel";
import FriendsList from "../features/social/FriendsList";
import BlockedPlayersPanel from "../features/social/BlockedPlayersPanel";
import SharedHistoryModal from "../features/social/SharedHistoryModal";
import { useLoadable, type LoadState } from "../features/social/useLoadable";
import type { FriendRequest } from "@shared/social/FriendRequest";
import type { Friend, SharedHistory } from "@shared/social/Friend";
import type { BlockedPlayer } from "@shared/social/Block";
import type { PlayerPresence } from "@shared/social/Presence";
import type { ReportReason } from "@shared/social/Report";
import {
  getFriendRequests,
  getFriends,
  getBlockedPlayers,
  getSharedHistory,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockPlayer,
  unblockPlayer,
  reportPlayer,
} from "../lib/api/social";
import { errorMessage } from "../lib/errorMessage";

type Tab = "friends" | "requests" | "blocked";

interface RequestLists {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

const NO_REQUESTS: RequestLists = { incoming: [], outgoing: [] };

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

/** A loading skeleton, or the error with Retry, or — once loaded — the content. Never an empty list standing in for a failure. */
function LoadGate({
  state,
  error,
  loadingLabel,
  onRetry,
  children,
}: {
  state: LoadState;
  error: string | null;
  loadingLabel: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (state === "loading") return <ListSkeleton label={loadingLabel} />;
  if (state === "error") return <LoadFailure message={error ?? "Something went wrong."} onRetry={onRetry} />;
  return <>{children}</>;
}

export default function SocialHubPage() {
  const { isSuperAdmin, capabilities } = useAuthStore();
  const { playerId } = usePlayerId();
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [actionError, setActionError] = useState<string | null>(null);

  const friends = useLoadable<Friend[]>([], async (id) => (await getFriends(id)).friends ?? [], {
    key: playerId,
    loadFailed: "Couldn't load your friends.",
    refreshFailed: "Couldn't refresh your friends list.",
    onRefreshError: setActionError,
  });

  const requests = useLoadable<RequestLists>(
    NO_REQUESTS,
    async (id) => {
      const res = await getFriendRequests(id);
      return { incoming: res.incoming ?? [], outgoing: res.outgoing ?? [] };
    },
    {
      key: playerId,
      loadFailed: "Couldn't load your friend requests.",
      refreshFailed: "Couldn't refresh your friend requests.",
      onRefreshError: setActionError,
    },
  );

  const blocked = useLoadable<BlockedPlayer[]>([], async (id) => (await getBlockedPlayers(id)).blocked ?? [], {
    key: playerId,
    loadFailed: "Couldn't load your blocked players.",
    refreshFailed: "Couldn't refresh your blocked players.",
    onRefreshError: setActionError,
  });

  /**
   * The friendship timeline of whichever friend's History button was pressed.
   * It loads when a friend is chosen (the key is that friend) and not before,
   * so nothing is fetched for a timeline nobody opened.
   */
  const [historyFriend, setHistoryFriend] = useState<Friend | null>(null);
  const timeline = useLoadable<SharedHistory | null>(
    null,
    async (friendId) => {
      if (!playerId) throw new Error("You need to be signed in to see this.");
      return (await getSharedHistory(playerId, friendId)).history;
    },
    {
      key: playerId && historyFriend ? historyFriend.friendPlayerId : null,
      loadFailed: "Couldn't load your timeline.",
      refreshFailed: "Couldn't refresh your timeline.",
      onRefreshError: setActionError,
    },
  );

  /**
   * Runs one request action. A failure is shown in the banner AND rethrown so
   * the panel can stop its own "sent!" feedback; the refresh after a success is
   * silent and never turns a completed action into a failure.
   */
  const runRequestAction = async (action: () => Promise<unknown>, fallback: string, alsoFriends = false) => {
    setActionError(null);
    try {
      await action();
    } catch (err: unknown) {
      setActionError(errorMessage(err, fallback));
      throw err;
    }
    await requests.reload(true);
    if (alsoFriends) await friends.reload(true);
  };

  const handleSendFriendRequest = (recipientId: string) =>
    runRequestAction(() => sendFriendRequest(recipientId), "Failed to send friend request", true);

  const handleAcceptRequest = (requestId: string) =>
    runRequestAction(() => acceptFriendRequest(requestId), "Failed to accept friend request", true);

  const handleDeclineRequest = (requestId: string) =>
    runRequestAction(() => declineFriendRequest(requestId), "Failed to decline friend request");

  const handleCancelRequest = (requestId: string) =>
    runRequestAction(async () => {
      await cancelFriendRequest(requestId);
      requests.setData((prev) => ({ ...prev, outgoing: prev.outgoing.filter((r) => r.id !== requestId) }));
    }, "Failed to cancel friend request");

  /** A rejection propagates to the confirm dialog, which shows it and stays open. */
  const handleRemoveFriend = async (friendPlayerId: string) => {
    if (!playerId) return;
    await removeFriend(playerId, friendPlayerId);
    friends.setData((prev) => prev.filter((f) => f.friendPlayerId !== friendPlayerId));
    void friends.reload(true);
  };

  /** Blocking also ends the friendship and any pending requests, so all three lists are refreshed. */
  const handleBlockFriend = async (friend: Friend) => {
    await blockPlayer(friend.friendPlayerId);
    friends.setData((prev) => prev.filter((f) => f.friendPlayerId !== friend.friendPlayerId));
    void friends.reload(true);
    void requests.reload(true);
    void blocked.reload(true);
  };

  const handleReportFriend = async (friend: Friend, reason: ReportReason) => {
    await reportPlayer(friend.friendPlayerId, reason);
  };

  /** A rejection propagates to the panel, which keeps the row and shows why. */
  const handleUnblock = async (targetId: string) => {
    await unblockPlayer(targetId);
    blocked.setData((prev) => prev.filter((p) => p.playerId !== targetId));
    void blocked.reload(true);
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

  /** The count appears only once its list has loaded — never a made-up 0. */
  const countOf = (state: LoadState, n: number) => (state === "ready" ? ` (${n})` : "");
  const requestCount = requests.data.incoming.length + requests.data.outgoing.length;
  const tabClass = (tab: Tab) =>
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
              Your friends, friend requests and blocked players
            </p>
          </div>
        </div>

        {/* Navigation Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--chrome-border)] pb-3 text-xs font-bold font-mono">
          <button type="button" onClick={() => setActiveTab("friends")} className={tabClass("friends")}>
            <Users className="w-4 h-4" />
            Friends{countOf(friends.state, friends.data.length)}
          </button>
          <button type="button" onClick={() => setActiveTab("requests")} className={tabClass("requests")}>
            <Inbox className="w-4 h-4" />
            Requests{countOf(requests.state, requestCount)}
          </button>
          <button type="button" onClick={() => setActiveTab("blocked")} className={tabClass("blocked")}>
            <Ban className="w-4 h-4" />
            Blocked{countOf(blocked.state, blocked.data.length)}
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
        {activeTab === "friends" && (
          <LoadGate
            state={friends.state}
            error={friends.error}
            loadingLabel="Loading your friends"
            onRetry={() => void friends.reload()}
          >
            <FriendsList
              friends={friends.data}
              presences={NO_PRESENCE}
              onRemoveFriend={handleRemoveFriend}
              onBlockFriend={handleBlockFriend}
              onReportFriend={handleReportFriend}
              onViewHistory={setHistoryFriend}
              onOpenInviteModal={() => setActiveTab("requests")}
            />
          </LoadGate>
        )}

        {activeTab === "requests" && (
          <LoadGate
            state={requests.state}
            error={requests.error}
            loadingLabel="Loading your friend requests"
            onRetry={() => void requests.reload()}
          >
            <FriendRequestPanel
              incoming={requests.data.incoming}
              outgoing={requests.data.outgoing}
              onSendRequest={handleSendFriendRequest}
              onAccept={handleAcceptRequest}
              onDecline={handleDeclineRequest}
              onCancelRequest={handleCancelRequest}
            />
          </LoadGate>
        )}

        {activeTab === "blocked" && (
          <LoadGate
            state={blocked.state}
            error={blocked.error}
            loadingLabel="Loading your blocked players"
            onRetry={() => void blocked.reload()}
          >
            <BlockedPlayersPanel blocked={blocked.data} onUnblock={handleUnblock} />
          </LoadGate>
        )}

        <SharedHistoryModal
          friend={historyFriend}
          history={timeline.data}
          state={timeline.state}
          error={timeline.error}
          onRetry={() => void timeline.reload()}
          onClose={() => setHistoryFriend(null)}
        />
      </div>
    </AppLayout>
  );
}
