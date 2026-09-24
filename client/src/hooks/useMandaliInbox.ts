import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { MandaliActivityEvent } from "@shared/mandali/notifications.js";
import { getSocket } from "../lib/socket";
import { toastStore } from "../lib/toastStore";
import { joinRoomByCode, joinFailureMessage } from "../lib/roomJoin";
import { decideToast } from "../lib/mandaliToastPolicy";
import { chatMessageCount, digestsToItems } from "../lib/mandaliNotificationItems";
import type { NotificationItem } from "../lib/profileNotifications";
import { authenticateMandaliSocket } from "../store/mandaliStore";
import { useMandaliInboxStore } from "../store/mandaliInboxStore";
import { useAuthStore } from "../store/authStore";

/**
 * The signed-in member's Mandali notifications, app-wide.
 *
 * Mounted once (in `AppLayout`) so it works on every page, not just inside a
 * Mandali. It authenticates the socket, keeps the digests current from the
 * live `mandali:activity` stream, decides what may pop up as a toast, and
 * hands back the rows the bell and the profile sheet already know how to draw.
 */

const INVITE_TOAST_MS = 10_000;
const CHAT_TOAST_MS = 6_000;
const chatToastKey = (mandaliId: string): string => `mandali-chat:${mandaliId}`;

/**
 * When each Mandali last showed a chat toast. Module-level on purpose: every
 * page mounts its own `AppLayout`, so a per-mount ref would forget the cooldown
 * on each navigation and let a second toast through inside the quiet window.
 */
const lastChatToastAt = new Map<string, number>();

/** Forget every cooldown. Called on sign-out, and by tests that need a clean slate. */
export function resetChatToastCooldown(): void {
  lastChatToastAt.clear();
}

export function useMandaliInbox(): {
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

  const digests = useMandaliInboxStore((s) => s.digests);
  const dismissedInvites = useMandaliInboxStore((s) => s.dismissedInvites);

  const items = useMemo(
    () => (enabled ? digestsToItems(digests, new Set(Object.keys(dismissedInvites))) : []),
    [enabled, digests, dismissedInvites]
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled) {
      useMandaliInboxStore.getState().reset();
      resetChatToastCooldown();
      return;
    }

    const store = useMandaliInboxStore;
    const socket = getSocket();
    let cancelled = false;

    const joinFromToast = async (code: string) => {
      const result = await joinRoomByCode(code);
      if (result.ok) navigateRef.current(`/room/${code}`);
      else toastStore.show(joinFailureMessage(result), "warning");
    };

    const onActivity = (event: MandaliActivityEvent) => {
      const outcome = store.getState().applyActivity(event, userId);
      if (outcome === "unknown-mandali") {
        // A Mandali this device has not heard of yet — most likely one just joined.
        void store.getState().refresh();
        return;
      }
      if (outcome !== "applied") return;

      const state = store.getState();
      const digest = state.digests.find((d) => d.mandaliId === event.mandaliId);
      if (!digest) return;

      const isInvite = event.kind === "ROOM_INVITE" && Boolean(event.roomCode);
      const now = Date.now();
      const decision = decideToast({
        level: digest.level,
        isInvite,
        isViewingThisMandali: state.viewingMandaliId === event.mandaliId && document.visibilityState === "visible",
        isInRoom: pathnameRef.current.startsWith("/room/"),
        chatToastOnScreen: toastStore.isShowing(chatToastKey(event.mandaliId)),
        lastChatToastAt: lastChatToastAt.get(event.mandaliId) ?? null,
        now,
      });

      if (decision === "invite" && event.roomCode) {
        const code = event.roomCode;
        const game = event.roomInvite?.gameName ?? "a game";
        toastStore.show(`${event.senderName} invited you to play ${game} · ${digest.name}`, "info", INVITE_TOAST_MS, {
          key: `mandali-invite:${event.messageId}`,
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
          key: chatToastKey(event.mandaliId),
          action: { label: "Open", onClick: () => navigateRef.current(`/mandali/${digest.handle}`) },
        });
        if (decision === "chat-new") lastChatToastAt.set(event.mandaliId, now);
      }
    };

    const sync = () => {
      void authenticateMandaliSocket().then(() => {
        if (!cancelled) void store.getState().refresh();
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void store.getState().refresh();
    };

    sync();
    socket.on("connect", sync);
    socket.on("mandali:activity" as any, onActivity);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      socket.off("connect", sync);
      socket.off("mandali:activity" as any, onActivity);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, userId]);

  /** The bell's "mark read" / "dismiss" gestures, translated into what the server needs to hear. */
  const update = useCallback<Dispatch<SetStateAction<NotificationItem[]>>>((action) => {
    const prev = itemsRef.current;
    const next = typeof action === "function" ? action(prev) : action;
    const nextById = new Map(next.map((item) => [item.id, item]));
    const store = useMandaliInboxStore.getState();
    const readMandalis = new Set<string>();

    for (const item of prev) {
      if (!item.mandaliId) continue;
      const after = nextById.get(item.id);
      if (item.type === "mandali_invite") {
        if (!after && item.inviteMessageId) store.dismissInvite(item.inviteMessageId);
        else if (after && !after.unread) readMandalis.add(item.mandaliId);
      } else if (!after || (item.unread && !after.unread)) {
        readMandalis.add(item.mandaliId);
      }
    }
    readMandalis.forEach((id) => void store.markRead(id));
  }, []);

  return { items, update };
}
