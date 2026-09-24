import { create } from "zustand";
import type { MandaliActivityEvent, MandaliDigest, NotificationLevel } from "@shared/mandali/notifications.js";
import { apiFetch, apiJson } from "../lib/playerIdentity";

/**
 * What the signed-in member has missed across all their Mandalis.
 *
 * The server keeps a read pointer per Mandali and summarises everything after
 * it into one digest each (see `get_mandali_digests`). This store holds those
 * digests and keeps them current from the live `mandali:activity` stream, so
 * the bell and the toasts move the moment something is said, without a
 * refetch per message.
 */

const UNREAD_CAP = 1000;
const MAX_INVITES = 5;
const MAX_TOP_SENDERS = 3;

export type ActivityOutcome = "applied" | "unknown-mandali" | "own-message" | "duplicate" | "viewing";

interface MandaliInboxState {
  digests: MandaliDigest[];
  /** Invitation messages the member dismissed; they stay hidden across refreshes. */
  dismissedInvites: Record<string, true>;
  /** The Mandali whose chat is open and focused right now — it never notifies. */
  viewingMandaliId: string | null;
  loaded: boolean;

  refresh: () => Promise<void>;
  applyActivity: (event: MandaliActivityEvent, selfId: string | null) => ActivityOutcome;
  /** Move the read pointer to now. Resolves with how many messages were unread just before. */
  markRead: (mandaliId: string) => Promise<{ previous: number } | null>;
  setLevel: (mandaliId: string, level: NotificationLevel) => Promise<boolean>;
  dismissInvite: (messageId: string) => void;
  setViewing: (mandaliId: string | null) => void;
  reset: () => void;
}

const emptyInbox = (): Pick<MandaliInboxState, "digests" | "dismissedInvites" | "viewingMandaliId" | "loaded"> => ({
  digests: [],
  dismissedInvites: {},
  viewingMandaliId: null,
  loaded: false,
});

/** Folds one live message into a digest. Pure — returns a new digest. */
export function foldActivity(digest: MandaliDigest, event: MandaliActivityEvent): MandaliDigest {
  const known = digest.topSenders.find((s) => s.name === event.senderName);
  const topSenders = (
    known
      ? digest.topSenders.map((s) => (s === known ? { ...s, count: s.count + 1 } : s))
      : digest.topSenders.length < MAX_TOP_SENDERS
        ? [...digest.topSenders, { name: event.senderName, count: 1 }]
        : [...digest.topSenders]
  ).sort((a, b) => b.count - a.count);

  const isInvite = event.kind === "ROOM_INVITE" && Boolean(event.roomCode);
  const invites = isInvite
    ? [
        {
          messageId: event.messageId,
          roomCode: event.roomCode as string,
          senderName: event.senderName,
          metadata: event.roomInvite ?? {},
          at: new Date(event.at).toISOString(),
        },
        ...digest.invites.filter((i) => i.messageId !== event.messageId),
      ].slice(0, MAX_INVITES)
    : digest.invites;

  return {
    ...digest,
    unreadCount: Math.min(UNREAD_CAP, digest.unreadCount + 1),
    senderCount: known ? digest.senderCount : digest.senderCount + 1,
    topSenders,
    latest: {
      senderName: event.senderName,
      kind: event.kind,
      preview: event.preview,
      at: new Date(event.at).toISOString(),
    },
    invites,
  };
}

/** What a digest looks like once the member has read everything. */
function markDigestRead(digest: MandaliDigest): MandaliDigest {
  return {
    ...digest,
    unreadCount: 0,
    senderCount: 0,
    topSenders: [],
    invites: [],
    lastReadAt: new Date().toISOString(),
  };
}

export const useMandaliInboxStore = create<MandaliInboxState>((set, get) => ({
  ...emptyInbox(),

  refresh: async () => {
    const res = await apiJson<{ success: boolean; digests: MandaliDigest[] }>("/api/mandali/notifications/digests");
    if (!res?.success) return;
    set({ digests: res.digests, loaded: true });
  },

  applyActivity: (event, selfId) => {
    if (selfId && event.senderId === selfId) return "own-message";
    // Being read as it arrives is not "missed". The hub marks it read on its own schedule.
    if (
      get().viewingMandaliId === event.mandaliId &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      return "viewing";
    }
    const digest = get().digests.find((d) => d.mandaliId === event.mandaliId);
    if (!digest) return "unknown-mandali";
    // The same invitation can arrive twice (a reconnect, two tabs). Chat lines carry no id in a digest.
    if (event.kind === "ROOM_INVITE" && digest.invites.some((i) => i.messageId === event.messageId)) {
      return "duplicate";
    }
    set((state) => ({
      digests: state.digests.map((d) => (d.mandaliId === event.mandaliId ? foldActivity(d, event) : d)),
    }));
    return "applied";
  },

  markRead: async (mandaliId) => {
    const before = get().digests.find((d) => d.mandaliId === mandaliId);
    const previous = before?.unreadCount ?? 0;
    // Optimistic: the bell should not wait for the network to clear.
    set((state) => ({
      digests: state.digests.map((d) => (d.mandaliId === mandaliId ? markDigestRead(d) : d)),
    }));
    try {
      const res = await apiFetch(`/api/mandali/${encodeURIComponent(mandaliId)}/read`, { method: "POST", body: "{}" });
      if (!res.ok) throw new Error("mark-read failed");
      const data = (await res.json()) as { success: boolean; previous?: number };
      return { previous: data.previous ?? previous };
    } catch {
      // Put the truth back: nothing was recorded, so it is still unread.
      if (before) {
        set((state) => ({
          digests: state.digests.map((d) => (d.mandaliId === mandaliId ? before : d)),
        }));
      }
      return null;
    }
  },

  setLevel: async (mandaliId, level) => {
    const before = get().digests.find((d) => d.mandaliId === mandaliId);
    set((state) => ({
      digests: state.digests.map((d) => (d.mandaliId === mandaliId ? { ...d, level } : d)),
    }));
    try {
      const res = await apiFetch(`/api/mandali/${encodeURIComponent(mandaliId)}/notification-level`, {
        method: "PATCH",
        body: JSON.stringify({ level }),
      });
      if (!res.ok) throw new Error("level failed");
      return true;
    } catch {
      if (before) {
        set((state) => ({
          digests: state.digests.map((d) => (d.mandaliId === mandaliId ? { ...d, level: before.level } : d)),
        }));
      }
      return false;
    }
  },

  dismissInvite: (messageId) =>
    set((state) => ({ dismissedInvites: { ...state.dismissedInvites, [messageId]: true } })),

  setViewing: (mandaliId) => set({ viewingMandaliId: mandaliId }),

  reset: () => set(emptyInbox()),
}));
