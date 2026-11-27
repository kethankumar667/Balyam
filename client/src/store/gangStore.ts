/**
 * BHALYAM — Gang (గ్యాంగ్) Store (Zustand)
 *
 * Client state management for persistent communities, channels, real-time lounge chat,
 * and Gnapakalu memories.
 *
 * Rules:
 * - Zero `any` in TypeScript.
 * - Zero usage of Sparkles from lucide-react.
 * - Server-authoritative state transitions.
 */

import { create } from "zustand";
import { refreshCurrentWallet } from "../hooks/useEconomy";
import { GANG_COIN_REQUEST_COOLDOWN_MS } from "@shared/gang/coinRules.js";
import type {
  Gang,
  GangMember,
  GangChannel,
  GangMessage,
  GangMemory,
  GangEvent,
  CreateGangPayload,
  GangCoinTransfer,
  CoinTransferPayload,
  GangInviteLink,
  GangJoinRequestRecord,
  GangCoinRequest,
} from "@shared/gang/types.js";
import type {
  GangReactionUpdatedBroadcast,
  GangPresenceChangedBroadcast,
  GangMemoryCreatedBroadcast,
} from "@shared/gang/socketContract.js";
import type { GameKind } from "@shared/types.js";
import { apiFetch, apiJson, getPlayerCredential } from "../lib/playerIdentity";
import { getSocket, disconnectSocket } from "../lib/socket";
import { useAuthStore } from "./authStore";
import { useGangInboxStore } from "./gangInboxStore";
import { useRoomInviteStatusStore } from "./roomInviteStatusStore";

export interface GangStore {
  // Discovery & Communities
  gangs: Gang[];
  myGangs: Gang[];
  activeGang: Gang | null;
  members: GangMember[];
  channels: GangChannel[];
  activeChannelId: string | null;
  messages: Record<string, GangMessage[]>; // channelId -> messages
  memories: GangMemory[];
  events: GangEvent[];
  coinTransfers: GangCoinTransfer[];
  /** Payable coin-request records (distinct from the legacy `coinTransfers`
   * SEND/notice-only REQUEST above) — keyed by their linked chat messageId
   * so CoinRequestCard can look one up per COIN_REQUEST message. */
  coinRequests: Record<string, GangCoinRequest>;
  /** Epoch ms when this person may post their next coin request; null = they may ask now. */
  coinRequestCooldownEndsAt: number | null;

  // Launch Handoff tracking

  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;

  // Actions
  fetchGangs: (filter?: { search?: string; language?: string; tag?: string }) => Promise<void>;
  fetchMyGangs: () => Promise<void>;
  fetchGangByHandleOrId: (handleOrId: string) => Promise<boolean>;
  setActiveChannel: (channelId: string) => void;
  fetchMessages: (channelId: string) => Promise<void>;
  createGang: (payload: CreateGangPayload) => Promise<{ success: boolean; gang?: Gang; error?: string }>;
  joinGang: (gangId: string, statement?: string, userDetails?: { playerId?: string; displayName?: string; avatar?: string }, invitationId?: string) => Promise<{ success: boolean; error?: string }>;
  leaveGang: (gangId: string) => Promise<{ success: boolean; error?: string }>;
  /** Owner only. Deletes the Gang for everyone; `confirmHandle` is what the owner typed to confirm. */
  deleteGang: (gangId: string, confirmHandle: string) => Promise<{ success: boolean; error?: string }>;
  /**
   * A Gang was deleted (by this owner, or announced by the server): forget it
   * everywhere. Returns whether that was news to this client — false the second
   * time, and false for the owner who has just done it themselves.
   */
  applyGangDeleted: (gangId: string) => boolean;

  // WhatsApp-parity: member management, invite links, join approval
  promoteMember: (gangId: string, targetId: string) => Promise<{ success: boolean; error?: string }>;
  demoteMember: (gangId: string, targetId: string) => Promise<{ success: boolean; error?: string }>;
  kickMember: (gangId: string, targetId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  banMember: (gangId: string, targetId: string) => Promise<{ success: boolean; error?: string }>;
  transferOwnership: (gangId: string, newOwnerId: string) => Promise<{ success: boolean; error?: string }>;
  updateGangSettings: (gangId: string, patch: {
    name?: string; emblem?: string; description?: string; rules?: string;
    editPermission?: "ADMIN" | "ALL"; sendPermission?: "ADMIN" | "ALL"; joinApproval?: boolean;
  }) => Promise<{ success: boolean; gang?: Gang; error?: string }>;
  createInviteLink: (gangId: string, expiresInMs?: number) => Promise<{ success: boolean; invitation?: GangInviteLink; error?: string }>;
  resolveInviteLink: (token: string) => Promise<{ valid: boolean; invitationId?: string; gangId?: string; name?: string; emblem?: string; description?: string }>;
  pendingJoinRequests: GangJoinRequestRecord[];
  fetchPendingJoinRequests: (gangId: string) => Promise<void>;
  fetchCoinRequests: (gangId: string) => Promise<void>;
  decideJoinRequest: (requestId: string, approve: boolean) => Promise<{ success: boolean; error?: string }>;

  // Chat power features
  pinMessage: (channelId: string, messageId: string, pinned: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteMessage: (channelId: string, messageId: string) => Promise<{ success: boolean; error?: string }>;

  // Payable coin-request cards
  createCoinRequest: (gangId: string, channelId: string, payerId: string, amount: number, expiresInMs?: number) => Promise<{ success: boolean; request?: GangCoinRequest; error?: string; retryAfterMs?: number }>;
  fetchCoinRequestCooldown: () => Promise<void>;
  /** Post the room you are in as a joinable card in this Gang's chat. */
  shareRoomToGang: (gangId: string, roomCode: string) => Promise<{ success: boolean; alreadyShared?: boolean; error?: string; retryAfterMs?: number }>;
  /** Re-read the open Gang without the loading screen — driven by the server's gang:changed event. */
  refreshActiveGang: () => Promise<void>;
  fundCoinRequest: (requestId: string) => Promise<{ success: boolean; request?: GangCoinRequest; error?: string }>;

  // Coin Transfers
  fetchCoinTransfers: (gangId: string) => Promise<void>;
  transferCoins: (gangId: string, payload: CoinTransferPayload) => Promise<{ success: boolean; transfer?: GangCoinTransfer; error?: string }>;

  // Realtime Socket Methods
  initGangSocket: (gangId: string, playerId: string) => void;
  cleanupGangSocket: (gangId: string, playerId: string) => void;
  sendMessage: (content: string, playerId?: string, replyToId?: string) => Promise<{ success: boolean; message?: GangMessage; error?: string }>;
  reactToMessage: (messageId: string, emoji: string, playerId?: string) => Promise<void>;
}

export const DEFAULT_PREVIEW_GANGS: Gang[] = [
  {
    id: "gang_ludo_kings",
    handle: "ludo-maharajas",
    name: "Ludo Lounge Maharajas",
    description: "Dedicated to precision dice rolls, cut-throat tactical blockades, and high-stakes speedrun circuits across Indian lounge boards.",
    emblem: "pawn_amber",
    bannerGradient: "from-amber-600 via-yellow-600 to-orange-700",
    language: "Telugu",
    region: "Telangana & AP",
    tags: ["Ludo", "Competitive", "Weekend Play"],
    visibility: "PUBLIC",
    memberCount: 28,
    maxMembers: 50,
    level: 4,
    xp: 3450,
    ownerId: "p_rajesh_ludo",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updatedAt: Date.now(),
  },
  {
    id: "gang_hc_warriors",
    handle: "hand-cricket-champs",
    name: "Street & Galli Hand Cricket League",
    description: "Childhood finger-cricket nostalgia! High-voltage death overs, boundary blitzes, and galli cricket matches every weekend evening.",
    emblem: "flame_ruby",
    bannerGradient: "from-rose-600 via-red-600 to-amber-700",
    language: "Hindi",
    region: "All India",
    tags: ["Hand Cricket", "Casual", "Weekend Play", "Voice Lounge"],
    visibility: "PUBLIC",
    memberCount: 42,
    maxMembers: 60,
    level: 6,
    xp: 6200,
    ownerId: "p_vikram_hc",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    updatedAt: Date.now(),
  },
  {
    id: "gang_rummy_royals",
    handle: "rummy-royals",
    name: "Classic Rummy Royals",
    description: "Mastery over pure sequences, second sequences, and disciplined drops. Where 0 penalty points is the only acceptable declaration.",
    emblem: "crown_gold",
    bannerGradient: "from-purple-600 via-indigo-600 to-slate-900",
    language: "English",
    region: "Global",
    tags: ["Rummy", "Competitive"],
    visibility: "DISCOVERABLE",
    memberCount: 31,
    maxMembers: 50,
    level: 5,
    xp: 4800,
    ownerId: "p_aditi_rummy",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 25,
    updatedAt: Date.now(),
  },
  {
    id: "gang_snl_explorers",
    handle: "snakes-and-ladders-club",
    name: "Paramapada Sopanam (Vaikuntapali Club)",
    description: "Sacred boards, fateful 99-snake drops, and miraculous ladder ascents. Reliving traditional Indian board games with hearty laughter.",
    emblem: "shield_sapphire",
    bannerGradient: "from-emerald-600 via-teal-600 to-cyan-700",
    language: "Telugu",
    region: "South India",
    tags: ["Casual", "Weekend Play", "Voice Lounge"],
    visibility: "PUBLIC",
    memberCount: 18,
    maxMembers: 40,
    level: 3,
    xp: 2150,
    ownerId: "p_venkat_v",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
    updatedAt: Date.now(),
  },
  {
    id: "gang_uno_champs",
    handle: "uno-frenzy",
    name: "Wild Draw-4 Blitz Guild",
    description: "Stacking +4 cards, ruthless colour switches, and split-second 'ONE!' calls. Friendly chaos and fast-paced party games every night.",
    emblem: "flame_ruby",
    bannerGradient: "from-cyan-600 via-blue-600 to-indigo-800",
    language: "English",
    region: "Bangalore & Hyderabad",
    tags: ["Color Cards", "Casual", "Voice Lounge"],
    visibility: "PUBLIC",
    memberCount: 24,
    maxMembers: 45,
    level: 4,
    xp: 3900,
    ownerId: "p_sneha_w",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 22,
    updatedAt: Date.now(),
  },
];

/** Everything the store holds about the one Gang that is open. Cleared when that Gang stops existing. */
const NO_OPEN_GANG: Partial<GangStore> = {
  activeGang: null,
  members: [],
  channels: [],
  activeChannelId: null,
  messages: {},
  memories: [],
  events: [],
  coinTransfers: [],
  pendingJoinRequests: [],
  coinRequests: {},
  coinRequestCooldownEndsAt: null,
};

let socketListenersBound = false;
let gangRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let gangReconnectHandler: (() => void) | null = null;

/**
 * Tracks whether THIS socket connection has completed `gang:authenticate`.
 * Reset on every reconnect (Socket.IO clears `socket.data` server-side on
 * disconnect, so a stale "authenticated" flag here would silently desync
 * from the server's actual per-connection state and every action would fail
 * with "Not authenticated" until a page refresh).
 */
let gangSocketAuthenticatedFor: string | null = null;

/**
 * Authenticates the current socket for Gang actions, once per connection.
 * Every `gang:*` server handler now requires this — see
 * `GangSocketHandlers.ts`'s `requireAuthenticatedActor`.
 */
export async function authenticateGangSocket(): Promise<void> {
  const socket = getSocket();
  if (gangSocketAuthenticatedFor === socket.id && socket.connected) return;

  const credential = await getPlayerCredential();
  if (!credential) return;

  await new Promise<void>((resolve) => {
    socket.emit(
      "gang:authenticate" as any,
      { token: credential.token },
      (res: { success: boolean }) => {
        if (res?.success) gangSocketAuthenticatedFor = socket.id ?? null;
        resolve();
      }
    );
  });
}

function resolveCurrentPlayerId(passedId?: string): string {
  if (passedId && passedId !== "me") return passedId;
  const auth = useAuthStore.getState();
  if (auth.userId) return auth.userId;
  if (typeof localStorage !== "undefined") {
    const guestId = localStorage.getItem("bhalyam.guest.id");
    if (guestId) return guestId;
    const playerId = localStorage.getItem("mpg.playerId");
    if (playerId) return playerId;
  }
  return "p_member_1";
}

export const useGangStore = create<GangStore>((set, get) => ({
  gangs: DEFAULT_PREVIEW_GANGS,
  myGangs: [],
  activeGang: null,
  members: [],
  channels: [],
  activeChannelId: null,
  messages: {},
  memories: [],
  events: [],
  coinTransfers: [],
  pendingJoinRequests: [],
  coinRequests: {},
  coinRequestCooldownEndsAt: null,
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,

  fetchGangs: async (filter) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const queryParams = new URLSearchParams();
      if (filter?.search) queryParams.set("search", filter.search);
      if (filter?.language && filter.language !== "All") queryParams.set("language", filter.language);
      if (filter?.tag && filter.tag !== "All") queryParams.set("tag", filter.tag);

      const qs = queryParams.toString();
      const res = await apiJson<{ success?: boolean; gangs?: Gang[] }>(`/api/gang${qs ? `?${qs}` : ""}`);
      if (res && Array.isArray(res.gangs)) {
        set({ gangs: res.gangs, isLoading: false });
        return;
      }
    } catch {
      // ignore network errors and fallback to client-filtered list
    }

    // Client-side fallback filtering
    let list = [...DEFAULT_PREVIEW_GANGS];
    if (filter?.search?.trim()) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.handle.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }
    if (filter?.language && filter.language !== "All") {
      const lang = filter.language.toLowerCase();
      list = list.filter((m) => m.language.toLowerCase() === lang);
    }
    if (filter?.tag && filter.tag !== "All") {
      const tag = filter.tag.toLowerCase();
      list = list.filter((m) => m.tags.some((t) => t.toLowerCase() === tag));
    }
    set({ gangs: list, isLoading: false });
  },

  fetchMyGangs: async () => {
    try {
      const res = await apiJson<{ success: boolean; gangs: Gang[] }>("/api/gang/my");
      if (res && res.success) {
        set({ myGangs: res.gangs });
      }
    } catch {
      // ignore
    }
  },

  fetchGangByHandleOrId: async (handleOrId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const res = await apiJson<{
        success: boolean;
        gang: Gang;
        members: GangMember[];
        channels: GangChannel[];
              memories: GangMemory[];
        events: GangEvent[];
      }>(`/api/gang/${encodeURIComponent(handleOrId)}`);

      if (res && res.success) {
        const defaultChannel = res.channels.find((c) => c.type === "TEXT") || res.channels[0];
        set({
          activeGang: res.gang,
          members: res.members,
          channels: res.channels,
          memories: res.memories,
          events: res.events,
          activeChannelId: defaultChannel ? defaultChannel.channelId : null,
          isLoading: false,
        });

        // Automatically load messages for the active channel
        if (defaultChannel) {
          get().fetchMessages(defaultChannel.channelId);
        }
        get().fetchCoinRequests(res.gang.id);
        return true;
      } else {
        set({ isLoading: false, errorMessage: "Gang not found." });
        return false;
      }
    } catch {
      set({ isLoading: false, errorMessage: "Network error loading Gang details." });
      return false;
    }
  },

  setActiveChannel: (channelId: string) => {
    set({ activeChannelId: channelId });
    get().fetchMessages(channelId);
  },

  fetchMessages: async (channelId: string) => {
    const { activeGang } = get();
    if (!activeGang) return;

    try {
      const res = await apiJson<{ success?: boolean; messages?: GangMessage[] }>(
        `/api/gang/${activeGang.id}/channels/${channelId}/messages`
      );
      // Key on the data, not on a `success` flag: this endpoint used to reply
      // `{ messages }` with no flag, so history was fetched on every refresh
      // and then silently discarded — only live messages ever showed.
      const history = res?.messages;
      if (Array.isArray(history)) {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: history,
          },
        }));
      }
    } catch {
      // ignore
    }
  },

  createGang: async (payload: CreateGangPayload) => {
    set({ isSubmitting: true, errorMessage: null });
    try {
      const storedName = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.playerName") : null;
      const storedAvatar = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.avatar") : null;
      const playerId = resolveCurrentPlayerId();

      const res = await apiFetch("/api/gang", {
        method: "POST",
        body: JSON.stringify({
          payload,
          creatorId: playerId,
          creatorName: storedName || "Gang Founder",
          creatorAvatar: storedAvatar || "file_0000000084c48208b1f893419d784cf2_1.jpg",
        }),
      });
      const data = (await res.json()) as { success?: boolean; gang?: Gang; error?: string };
      set({ isSubmitting: false });
      if (data && (data.success || data.gang)) {
        const newGang = data.gang!;
        set((state) => ({
          myGangs: [newGang, ...state.myGangs],
          gangs: [newGang, ...state.gangs],
        }));
        return { success: true, gang: newGang };
      }
      return { success: false, error: data.error || "Failed to create Gang" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  joinGang: async (gangId: string, statement?: string, userDetails?: { playerId?: string; displayName?: string; avatar?: string }, invitationId?: string) => {
    set({ isSubmitting: true });
    try {
      const storedName = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.playerName") : null;
      const storedAvatar = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.avatar") : null;
      const playerId = resolveCurrentPlayerId(userDetails?.playerId);
      const displayName = userDetails?.displayName || storedName || "Gang Member";
      const avatar = userDetails?.avatar || storedAvatar || "file_0000000084c48208b1f893419d784cf2_1.jpg";

      const res = await apiFetch(`/api/gang/${gangId}/join`, {
        method: "POST",
        body: JSON.stringify({ playerId, displayName, avatar, statement, invitationId }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      set({ isSubmitting: false });
      if (data.success) {
        // Refresh details
        await get().fetchGangByHandleOrId(gangId);
        await get().fetchMyGangs();
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to join Gang" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  leaveGang: async (gangId: string) => {
    set({ isSubmitting: true });
    try {
      const res = await apiFetch(`/api/gang/${gangId}/leave`, {
        method: "POST",
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      set({ isSubmitting: false });
      if (data.success) {
        set((state) => ({
          myGangs: state.myGangs.filter((m) => m.id !== gangId),
        }));
        get().fetchGangByHandleOrId(gangId);
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to leave Gang" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  deleteGang: async (gangId: string, confirmHandle: string) => {
    set({ isSubmitting: true });
    try {
      const res = await apiFetch(`/api/gang/${encodeURIComponent(gangId)}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmHandle }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      set({ isSubmitting: false });
      if (data.success === true) {
        get().applyGangDeleted(gangId);
        return { success: true };
      }
      return { success: false, error: data.error || "Could not delete this Gang." };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  applyGangDeleted: (gangId: string) => {
    const state = get();
    const inInbox = useGangInboxStore.getState().digests.some((d) => d.gangId === gangId);
    const wasOpen = state.activeGang?.id === gangId;
    const known = inInbox || wasOpen || state.myGangs.some((m) => m.id === gangId) ||
      state.gangs.some((m) => m.id === gangId);
    if (!known) return false;

    useGangInboxStore.getState().forget(gangId);
    set((s) => ({
      gangs: s.gangs.filter((m) => m.id !== gangId),
      myGangs: s.myGangs.filter((m) => m.id !== gangId),
      ...(wasOpen ? NO_OPEN_GANG : {}),
    }));
    return true;
  },

  promoteMember: async (gangId: string, targetId: string) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/members/${targetId}/promote`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchGangByHandleOrId(gangId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  demoteMember: async (gangId: string, targetId: string) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/members/${targetId}/demote`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchGangByHandleOrId(gangId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  kickMember: async (gangId: string, targetId: string, reason?: string) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/members/${targetId}/kick`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchGangByHandleOrId(gangId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  banMember: async (gangId: string, targetId: string) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/members/${targetId}/ban`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchGangByHandleOrId(gangId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  transferOwnership: async (gangId: string, newOwnerId: string) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ newOwnerId }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchGangByHandleOrId(gangId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  updateGangSettings: async (gangId: string, patch) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { success: boolean; gang?: Gang; error?: string };
      if (data.success && data.gang) {
        set((state) => ({
          activeGang: state.activeGang?.id === gangId ? data.gang! : state.activeGang,
        }));
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  createInviteLink: async (gangId: string, expiresInMs?: number) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/invite-links`, {
        method: "POST",
        body: JSON.stringify({ expiresInMs }),
      });
      const data = (await res.json()) as { success: boolean; invitation?: GangInviteLink; error?: string };
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  resolveInviteLink: async (token: string) => {
    try {
      const res = await apiFetch(`/api/gang/invite-links/resolve`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      return (await res.json()) as { valid: boolean; invitationId?: string; gangId?: string; name?: string; emblem?: string; description?: string };
    } catch {
      return { valid: false };
    }
  },

  fetchPendingJoinRequests: async (gangId: string) => {
    try {
      const res = await apiJson<{ success: boolean; requests: GangJoinRequestRecord[] }>(
        `/api/gang/${gangId}/join-requests`
      );
      if (res?.success) set({ pendingJoinRequests: res.requests });
    } catch {
      // ignore
    }
  },

  decideJoinRequest: async (requestId: string, approve: boolean) => {
    try {
      const res = await apiFetch(`/api/gang/join-requests/${requestId}/decide`, {
        method: "POST",
        body: JSON.stringify({ approve }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        set((state) => ({ pendingJoinRequests: state.pendingJoinRequests.filter((r) => r.id !== requestId) }));
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  pinMessage: async (channelId: string, messageId: string, pinned: boolean) => {
    const { activeGang } = get();
    if (!activeGang) return { success: false, error: "No active Gang" };
    try {
      const res = await apiFetch(`/api/gang/${activeGang.id}/channels/${channelId}/messages/${messageId}/pin`, {
        method: "POST",
        body: JSON.stringify({ pinned }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((m) => (m.messageId === messageId ? { ...m, pinned } : m)),
          },
        }));
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  deleteMessage: async (channelId: string, messageId: string) => {
    const { activeGang } = get();
    if (!activeGang) return { success: false, error: "No active Gang" };
    try {
      const res = await apiFetch(`/api/gang/${activeGang.id}/channels/${channelId}/messages/${messageId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((m) =>
              m.messageId === messageId ? { ...m, content: "" } : m
            ),
          },
        }));
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  fetchCoinRequests: async (gangId: string) => {
    try {
      const res = await apiJson<{ success: boolean; requests: GangCoinRequest[] }>(
        `/api/gang/${gangId}/coin-requests`
      );
      if (res?.success) {
        const byMessageId: Record<string, GangCoinRequest> = {};
        for (const r of res.requests) {
          if (r.messageId) byMessageId[r.messageId] = r;
        }
        set({ coinRequests: byMessageId });
      }
    } catch {
      // ignore
    }
  },

  createCoinRequest: async (gangId: string, channelId: string, payerId: string, amount: number, expiresInMs?: number) => {
    try {
      const res = await apiFetch(`/api/gang/${gangId}/channels/${channelId}/coin-requests`, {
        method: "POST",
        body: JSON.stringify({ payerId, amount, expiresInMs }),
      });
      const data = (await res.json()) as { success: boolean; request?: GangCoinRequest; error?: string; retryAfterMs?: number };
      if (data.success) {
        set({ coinRequestCooldownEndsAt: Date.now() + GANG_COIN_REQUEST_COOLDOWN_MS });
        await get().fetchMessages(channelId);
        await get().fetchCoinRequests(gangId);
        void get().fetchCoinRequestCooldown();
      } else if (typeof data.retryAfterMs === "number") {
        set({ coinRequestCooldownEndsAt: Date.now() + data.retryAfterMs });
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  fundCoinRequest: async (requestId: string) => {
    const { activeChannelId, activeGang } = get();
    try {
      const res = await apiFetch(`/api/gang/coin-requests/${requestId}/fund`, {
        method: "POST",
      });
      const data = (await res.json()) as { success: boolean; request?: GangCoinRequest; error?: string };
      if (data.success) {
        void refreshCurrentWallet();
        if (activeChannelId) await get().fetchMessages(activeChannelId);
        if (activeGang) await get().fetchCoinRequests(activeGang.id);
      } else if (activeGang) {
        // Anyone in the group can pay, so the usual refusal is "someone beat
        // you to it". Refetch so the card settles to "Paid by …" even if the
        // live broadcast from the winning payment was missed.
        void get().fetchCoinRequests(activeGang.id);
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  shareRoomToGang: async (gangId: string, roomCode: string) => {
    try {
      const res = await apiFetch(`/api/gang/${encodeURIComponent(gangId)}/room-invites`, {
        method: "POST",
        body: JSON.stringify({ roomCode }),
      });
      const data = (await res.json()) as {
        success: boolean; alreadyShared?: boolean; error?: string; retryAfterMs?: number;
      };
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  fetchCoinRequestCooldown: async () => {
    const res = await apiJson<{ success: boolean; retryAfterMs: number }>("/api/gang/coin-request-cooldown");
    if (res?.success) {
      set({ coinRequestCooldownEndsAt: res.retryAfterMs > 0 ? Date.now() + res.retryAfterMs : null });
    }
  },

  refreshActiveGang: async () => {
    const { activeGang, activeChannelId } = get();
    if (!activeGang) return;
    const res = await apiJson<{
      success: boolean;
      gang: Gang;
      members: GangMember[];
      channels: GangChannel[];
          memories: GangMemory[];
      events: GangEvent[];
    }>(`/api/gang/${encodeURIComponent(activeGang.id)}`);
    if (!res?.success) return;

    const keepChannel = res.channels.some((c) => c.channelId === activeChannelId);
    set({
      activeGang: res.gang,
      members: res.members,
      channels: res.channels,
      memories: res.memories,
      events: res.events,
      activeChannelId: keepChannel ? activeChannelId : res.channels[0]?.channelId ?? null,
    });

    const channelId = get().activeChannelId;
    if (channelId) await get().fetchMessages(channelId);
    await get().fetchCoinRequests(res.gang.id);

    const me = res.members.find((m) => m.playerId === resolveCurrentPlayerId());
    const role: string = me?.role ?? "";
    if (role === "OWNER" || role === "ADMIN") await get().fetchPendingJoinRequests(res.gang.id);
  },

  fetchCoinTransfers: async (gangId: string) => {
    try {
      const res = await apiJson<{ success: boolean; transfers: GangCoinTransfer[] }>(
        `/api/gang/${gangId}/coins/transfers`
      );
      if (res && res.success) {
        set({ coinTransfers: res.transfers || [] });
      }
    } catch {
      // ignore
    }
  },

  transferCoins: async (gangId: string, payload: CoinTransferPayload) => {
    set({ isSubmitting: true });
    try {
      const res = await apiFetch(`/api/gang/${gangId}/coins/transfer`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success: boolean; transfer?: GangCoinTransfer; error?: string };
      set({ isSubmitting: false });
      if (data.success && data.transfer) {
        set((state) => ({
          coinTransfers: [data.transfer!, ...state.coinTransfers],
        }));
        const { activeChannelId } = get();
        if (activeChannelId) {
          get().fetchMessages(activeChannelId);
        }
        return { success: true, transfer: data.transfer };
      }
      return { success: false, error: data.error || "Failed to transfer coins" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  initGangSocket: (gangId: string, playerId: string) => {
    const socket = getSocket();

    const joinCurrentGang = () => {
      void (async () => {
        await authenticateGangSocket();
        socket.emit("gang:join_room" as any, { gangId, playerId });
      })();
    };
    joinCurrentGang();

    // A reconnect gets a fresh server-side socket.data — re-authenticate and
    // rejoin the broadcast room, or every action silently fails until a
    // manual refresh. Only one of these is ever live at a time: replacing it
    // (rather than stacking a new listener per call) avoids re-joining a
    // Gang the caller already navigated away from, and avoids leaking a
    // listener per hub visit.
    if (gangReconnectHandler) socket.off("connect", gangReconnectHandler);
    gangReconnectHandler = joinCurrentGang;
    socket.on("connect", gangReconnectHandler);

    if (!socketListenersBound) {
      socketListenersBound = true;

      socket.on("gang:chat:message" as any, (payload: { gangId: string; message: GangMessage }) => {
        const { activeGang } = get();
        if (!activeGang || activeGang.id !== payload.gangId) return;

        set((state) => {
          const chId = payload.message.channelId;
          const currentMsgs = state.messages[chId] || [];
          if (currentMsgs.some((m) => m.messageId === payload.message.messageId)) return state;
          return {
            messages: {
              ...state.messages,
              [chId]: [...currentMsgs, payload.message],
            },
          };
        });
      });

      socket.on("gang:reaction:updated" as any, (payload: GangReactionUpdatedBroadcast) => {
        const { activeGang } = get();
        if (!activeGang || activeGang.id !== payload.gangId) return;

        set((state) => {
          const chId = payload.channelId;
          const currentMsgs = state.messages[chId] || [];
          return {
            messages: {
              ...state.messages,
              [chId]: currentMsgs.map((m) =>
                m.messageId === payload.messageId ? { ...m, reactions: payload.reactions } : m
              ),
            },
          };
        });
      });

      socket.on("gang:memory:created" as any, (payload: GangMemoryCreatedBroadcast) => {
        const { activeGang } = get();
        if (!activeGang || activeGang.id !== payload.gangId) return;

        set((state) => ({
          memories: [payload.memory, ...state.memories],
        }));
      });

      socket.on("gang:presence:changed" as any, (payload: GangPresenceChangedBroadcast) => {
        const { activeGang } = get();
        if (!activeGang || activeGang.id !== payload.gangId) return;

        set((state) => ({
          members: state.members.map((m) =>
            m.memberId === payload.member.memberId ? payload.member : m
          ),
        }));
      });

      socket.on("gang:coin_transfer" as any, (payload: { gangId: string; transfer: GangCoinTransfer }) => {
        const { activeGang } = get();
        if (!activeGang || activeGang.id !== payload.gangId) return;

        set((state) => ({
          coinTransfers: [payload.transfer, ...state.coinTransfers],
        }));
      });

      // A coin request card is created inside the database, so it never
      // arrives as an ordinary chat message. This event carries the request
      // record (which the card needs in order to show a Pay button) and the
      // message itself, so everyone in the room sees it the moment it lands.
      socket.on("gang:coin_request:updated" as any, (payload: { gangId: string; request: GangCoinRequest; message?: GangMessage }) => {
        const { activeGang } = get();
        if (!activeGang || activeGang.id !== payload.gangId) return;
        const { request, message } = payload;

        set((state) => {
          const coinRequests = request.messageId
            ? { ...state.coinRequests, [request.messageId]: request }
            : state.coinRequests;
          if (!message) return { coinRequests };
          const current = state.messages[message.channelId] || [];
          if (current.some((m) => m.messageId === message.messageId)) return { coinRequests };
          return { coinRequests, messages: { ...state.messages, [message.channelId]: [...current, message] } };
        });

        if (request.status === "FUNDED") {
          const me = resolveCurrentPlayerId();
          if (request.requesterIdentityId === me || request.payerIdentityId === me) void refreshCurrentWallet();
        }
      });

      // Something about the Gang changed (members, roles, settings, pins,
      // deletions). Refetch rather than patching state from the event, and
      // coalesce a burst of changes into one refresh.
      socket.on("gang:changed" as any, (payload: { gangId: string }) => {
        const { activeGang } = get();
        if (!activeGang || activeGang.id !== payload.gangId) return;
        if (gangRefreshTimer) clearTimeout(gangRefreshTimer);
        gangRefreshTimer = setTimeout(() => {
          gangRefreshTimer = null;
          void get().refreshActiveGang();
        }, 250);
      });
    }
  },

  cleanupGangSocket: (gangId: string, playerId: string) => {
    const socket = getSocket();
    socket.emit("gang:leave_room" as any, { gangId, playerId });
    if (gangRefreshTimer) {
      clearTimeout(gangRefreshTimer);
      gangRefreshTimer = null;
    }
    if (gangReconnectHandler) {
      socket.off("connect", gangReconnectHandler);
      gangReconnectHandler = null;
    }
  },

  sendMessage: async (content: string, playerId?: string, replyToId?: string) => {
    const { activeGang, activeChannelId } = get();
    if (!activeGang || !activeChannelId) return { success: false, error: "No active channel" };

    const effectivePlayerId = resolveCurrentPlayerId(playerId);

    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "gang:chat:send" as any,
        {
          gangId: activeGang.id,
          channelId: activeChannelId,
          playerId: effectivePlayerId,
          content,
          replyToId,
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; message?: GangMessage; error?: string };
          if (outcome?.success && outcome.message) {
            const msg = outcome.message;
            set((state) => {
              const chId = msg.channelId;
              const currentMsgs = state.messages[chId] || [];
              if (currentMsgs.some((m) => m.messageId === msg.messageId)) return state;
              return {
                messages: {
                  ...state.messages,
                  [chId]: [...currentMsgs, msg],
                },
              };
            });
          }
          resolve(outcome || { success: false, error: "Failed to send message" });
        }
      );
    });
  },

  reactToMessage: async (messageId: string, emoji: string, playerId?: string) => {
    const { activeGang, activeChannelId } = get();
    if (!activeGang || !activeChannelId) return;

    const effectivePlayerId = resolveCurrentPlayerId(playerId);
    const socket = getSocket();
    socket.emit("gang:chat:react" as any, {
      gangId: activeGang.id,
      channelId: activeChannelId,
      messageId,
      playerId: effectivePlayerId,
      emoji,
    });
  },
}));

/**
 * Forget everything that belonged to the account that just left.
 *
 * Clearing storage is not enough: the chat history, member list and coin
 * requests of the Gang someone was reading live in this store's memory, and
 * the socket they authenticated on keeps delivering that Gang's live
 * messages. Without this, signing out on a Gang page leaves a guest looking
 * at the group's private conversation. The public browse directory (`gangs`)
 * is deliberately kept.
 */
export function resetGangSession(): void {
  if (gangRefreshTimer) {
    clearTimeout(gangRefreshTimer);
    gangRefreshTimer = null;
  }
  gangReconnectHandler = null;
  gangSocketAuthenticatedFor = null;
  // The listeners were bound to the socket being dropped; a new one needs them again.
  socketListenersBound = false;
  disconnectSocket();

  useGangStore.setState({
    myGangs: [],
    activeGang: null,
    members: [],
    channels: [],
    activeChannelId: null,
    messages: {},
      memories: [],
    events: [],
    coinTransfers: [],
      pendingJoinRequests: [],
    coinRequests: {},
    coinRequestCooldownEndsAt: null,
    isLoading: false,
    isSubmitting: false,
    errorMessage: null,
  });
  useGangInboxStore.getState().reset();
  useRoomInviteStatusStore.setState({ statuses: {} });
}

// Every way an account can go away — the sign-out button, an expired session,
// another tab signing out, switching to a different account — passes through
// the auth store, so watching it covers them all.
useAuthStore.subscribe((state, prev) => {
  const leftAccount = (prev.userId !== null && state.userId !== prev.userId) || (prev.isMember && !state.isMember);
  if (leftAccount) resetGangSession();
});
