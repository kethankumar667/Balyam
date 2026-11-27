import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { GangActivityEvent, GangDeletedEvent } from "@shared/gang/notifications.js";
import { getSocket } from "../lib/socket";
import { toastStore } from "../lib/toastStore";
import { joinRoomByCode, joinFailureMessage } from "../lib/roomJoin";
import { decideToast } from "../lib/gangToastPolicy";
import { chatMessageCount, digestsToItems } from "../lib/gangNotificationItems";
import type { NotificationItem } from "../lib/profileNotifications";
import { authenticateGangSocket, useGangStore } from "../store/gangStore";
import { useGangInboxStore } from "../store/gangInboxStore";
import { useAuthStore } from "../store/authStore";
import { refreshCurrentWallet } from "./useEconomy";
import { peekPlayerCredential } from "../lib/playerIdentity";
import { useGangJoyStore, type JoyParty } from "../store/gangJoyStore";

/**
 * The signed-in member's Gang notifications, app-wide.
 *
 * Mounted once (in `AppLayout`) so it works on every page, not just inside a
 * Gang. It authenticates the socket, keeps the digests current from the
 * live `gang:activity` stream, decides what may pop up as a toast, and
 * hands back the rows the bell and the profile sheet already know how to draw.
 */

const INVITE_TOAST_MS = 10_000;
const CHAT_TOAST_MS = 6_000;
const NOTICE_TOAST_MS = 5_000;
const DELETED_NAME_MAX_LENGTH = 40;
const chatToastKey = (gangId: string): string => `gang-chat:${gangId}`;

/**
 * When each Gang last showed a chat toast. Module-level on purpose: every
 * page mounts its own `AppLayout`, so a per-mount ref would forget the cooldown
 * on each navigation and let a second toast through inside the quiet window.
 */
const lastChatToastAt = new Map<string, number>();

/** Forget every cooldown. Called on sign-out, and by tests that need a clean slate. */
/**
 * A friend answered a coin request: celebrate it for whichever side this player is on.
 * The person who asked is glad (coins and hearts); the person who paid gets a quieter thank-you.
 * Anything missing from the event (an older server, a different reason) celebrates nothing.
 */
function celebrateCoinRequest(payload: unknown): void {
  const event = payload as
    | { reason?: unknown; amount?: unknown; requesterIdentityId?: unknown; fundedByIdentityId?: unknown }
    | null
    | undefined;
  if (!event || event.reason !== "coin_request_funded") return;
  const amount = typeof event.amount === "number" ? event.amount : 0;
  if (amount <= 0 || typeof event.requesterIdentityId !== "string" || typeof event.fundedByIdentityId !== "string") return;

  const me = peekPlayerCredential()?.playerId;
  if (!me) return;
  const partyOf = (id: string): JoyParty => {
    const member = useGangStore.getState().members.find((m) => m.playerId === id);
    return { playerId: id, name: member?.displayName?.trim() || null, avatar: member?.avatar };
  };
  const self = partyOf(me);

  if (me === event.requesterIdentityId) {
    const other = partyOf(event.fundedByIdentityId);
    useGangJoyStore.getState().show("received", amount, other.name, { self, other });
  } else if (me === event.fundedByIdentityId) {
    const other = partyOf(event.requesterIdentityId);
    useGangJoyStore.getState().show("sent", amount, other.name, { self, other });
  }
}

export function resetChatToastCooldown(): void {
  lastChatToastAt.clear();
}

export function useGangInbox(): {
  items: NotificationItem[];
  update: Dispatch<SetStateAction<NotificationItem[]>>;
} {
  const isMember = useAuthStore((s) => s.isMember);
  const userId = useAuthStore((s) => s.userId);
  const ready = useAuthStore((s) => s.ready);
  const enabled = ready && isMember && Boolean(userId);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const digests = useGangInboxStore((s) => s.digests);
  const dismissedInvites = useGangInboxStore((s) => s.dismissedInvites);

  const items = useMemo(
    () => (enabled ? digestsToItems(digests, new Set(Object.keys(dismissedInvites))) : []),
    [enabled, digests, dismissedInvites]
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled) {
      useGangInboxStore.getState().reset();
      resetChatToastCooldown();
      return;
    }

    const store = useGangInboxStore;
    const socket = getSocket();
    let cancelled = false;

    const joinFromToast = async (code: string) => {
      const result = await joinRoomByCode(code);
      if (result.ok) navigateRef.current(`/room/${code}`);
      else toastStore.show(joinFailureMessage(result), "warning");
    };

    const onActivity = (event: GangActivityEvent) => {
      const outcome = store.getState().applyActivity(event, userId);
      if (outcome === "system") {
        // A group event, such as "Charan joined the Gang". Not a missed message
        // (the bell does not count it), but worth a word if they are elsewhere.
        const digest = store.getState().digests.find((d) => d.gangId === event.gangId);
        if (!digest) return;
        const decision = decideToast({
          level: digest.level,
          isInvite: false,
          isNotice: true,
          isViewingThisGang:
            store.getState().viewingGangId === event.gangId && document.visibilityState === "visible",
          isInRoom: pathnameRef.current.startsWith("/room/"),
          chatToastOnScreen: false,
          lastChatToastAt: null,
          now: Date.now(),
        });
        if (decision === "notice") {
          // One per Gang, updated in place, so a burst of arrivals is one toast, not a stack.
          toastStore.show(`${digest.name} · ${event.preview}`, "info", NOTICE_TOAST_MS, {
            key: `gang-notice:${event.gangId}`,
            action: { label: "Open", onClick: () => navigateRef.current(`/gang/${digest.handle}`) },
          });
        }
        return;
      }
      if (outcome === "unknown-gang") {
        // A Gang this device has not heard of yet — most likely one just joined.
        void store.getState().refresh();
        return;
      }
      if (outcome !== "applied") return;

      const state = store.getState();
      const digest = state.digests.find((d) => d.gangId === event.gangId);
      if (!digest) return;

      const isInvite = event.kind === "ROOM_INVITE" && Boolean(event.roomCode);
      const now = Date.now();
      const decision = decideToast({
        level: digest.level,
        isInvite,
        isViewingThisGang: state.viewingGangId === event.gangId && document.visibilityState === "visible",
        isInRoom: pathnameRef.current.startsWith("/room/"),
        chatToastOnScreen: toastStore.isShowing(chatToastKey(event.gangId)),
        lastChatToastAt: lastChatToastAt.get(event.gangId) ?? null,
        now,
      });

      if (decision === "invite" && event.roomCode) {
        const code = event.roomCode;
        const game = event.roomInvite?.gameName ?? "a game";
        toastStore.show(`${event.senderName} invited you to play ${game} · ${digest.name}`, "info", INVITE_TOAST_MS, {
          key: `gang-invite:${event.messageId}`,
          action: { label: "Join", onClick: () => void joinFromToast(code) },
        });
        return;
      }

      if (decision === "chat-new" || decision === "chat-update") {
        const count = chatMessageCount(digest);
        const message =
          count <= 1
            ? `${digest.name} · ${event.senderName}: ${event.preview}`
            : `${count} new messages in ${digest.name}`;
        toastStore.show(message, "default", CHAT_TOAST_MS, {
          key: chatToastKey(event.gangId),
          action: { label: "Open", onClick: () => navigateRef.current(`/gang/${digest.handle}`) },
        });
        if (decision === "chat-new") lastChatToastAt.set(event.gangId, now);
      }
    };

    /**
     * The owner deleted a Gang this member was in. It arrives on the member's
     * personal room, so it is heard on every page, not only inside the Gang.
     * The store forgets the group and says whether that was news: the owner who
     * did it, or a second copy of this event, gets no toast.
     */
    const onDeleted = (payload: unknown) => {
      const event = payload as Partial<GangDeletedEvent> | null | undefined;
      const gangId = event?.gangId;
      if (typeof gangId !== "string" || gangId.length === 0) return;
      if (!useGangStore.getState().applyGangDeleted(gangId)) return;
      const name = typeof event?.name === "string" ? event.name.trim().slice(0, DELETED_NAME_MAX_LENGTH) : "";
      toastStore.show(
        name ? `“${name}” was deleted by its owner.` : "A Gang you were in was deleted by its owner.",
        "info",
        NOTICE_TOAST_MS,
        { key: `gang-deleted:${gangId}` },
      );
    };

    /**
     * A friend paid a coin request this member sent or paid. It arrives on the
     * personal room, so the wallet is reloaded on every page, not only while the
     * Gang is open — otherwise the coins show up only after a manual refresh.
     */
    const onWalletChanged = (payload?: unknown) => {
      void refreshCurrentWallet();
      celebrateCoinRequest(payload);
    };

    const sync = () => {
      void authenticateGangSocket().then(() => {
        if (!cancelled) void store.getState().refresh();
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void store.getState().refresh();
    };

    sync();
    socket.on("connect", sync);
    socket.on("gang:activity" as any, onActivity);
    socket.on("gang:deleted" as any, onDeleted);
    socket.on("gang:wallet_changed" as any, onWalletChanged);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      socket.off("connect", sync);
      socket.off("gang:activity" as any, onActivity);
      socket.off("gang:deleted" as any, onDeleted);
      socket.off("gang:wallet_changed" as any, onWalletChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, userId]);

  /** The bell's "mark read" / "dismiss" gestures, translated into what the server needs to hear. */
  const update = useCallback<Dispatch<SetStateAction<NotificationItem[]>>>((action) => {
    const prev = itemsRef.current;
    const next = typeof action === "function" ? action(prev) : action;
    const nextById = new Map(next.map((item) => [item.id, item]));
    const store = useGangInboxStore.getState();
    const readGangs = new Set<string>();

    for (const item of prev) {
      if (!item.gangId) continue;
      const after = nextById.get(item.id);
      if (item.type === "gang_invite") {
        if (!after && item.inviteMessageId) store.dismissInvite(item.inviteMessageId);
        else if (after && !after.unread) readGangs.add(item.gangId);
      } else if (!after || (item.unread && !after.unread)) {
        readGangs.add(item.gangId);
      }
    }
    readGangs.forEach((id) => void store.markRead(id));
  }, []);

  return { items, update };
}
