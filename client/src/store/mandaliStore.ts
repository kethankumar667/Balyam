/**
 * BHALYAM — Mandali (మండలి) Store (Zustand)
 *
 * Client state management for persistent communities, channels, real-time lounge chat,
 * party squads with game launch handoffs, and Gnapakalu memories.
 *
 * Rules:
 * - Zero `any` in TypeScript.
 * - Zero usage of Sparkles from lucide-react.
 * - Server-authoritative state transitions.
 */

import { create } from "zustand";
import { refreshCurrentWallet } from "../hooks/useEconomy";
import { MANDALI_COIN_REQUEST_COOLDOWN_MS } from "@shared/mandali/coinRules.js";
import type {
  Mandali,
  MandaliMember,
  MandaliChannel,
  MandaliMessage,
  MandaliParty,
  MandaliMemory,
  MandaliEvent,
  CreateMandaliPayload,
  MandaliCoinTransfer,
  CoinTransferPayload,
  MandaliInviteLink,
  MandaliJoinRequestRecord,
  MandaliCoinRequest,
} from "@shared/mandali/types.js";
import type {
  MandaliPartyLaunchedBroadcast,
  MandaliReactionUpdatedBroadcast,
  MandaliPresenceChangedBroadcast,
  MandaliMemoryCreatedBroadcast,
} from "@shared/mandali/socketContract.js";
import type { GameKind } from "@shared/types.js";
import { apiFetch, apiJson, getPlayerCredential } from "../lib/playerIdentity";
import { getSocket } from "../lib/socket";
import { useAuthStore } from "./authStore";

export interface MandaliStore {
  // Discovery & Communities
  mandalis: Mandali[];
  myMandalis: Mandali[];
  activeMandali: Mandali | null;
  members: MandaliMember[];
  channels: MandaliChannel[];
  activeChannelId: string | null;
  messages: Record<string, MandaliMessage[]>; // channelId -> messages
  parties: MandaliParty[];
  memories: MandaliMemory[];
  events: MandaliEvent[];
  coinTransfers: MandaliCoinTransfer[];
  /** Payable coin-request records (distinct from the legacy `coinTransfers`
   * SEND/notice-only REQUEST above) — keyed by their linked chat messageId
   * so CoinRequestCard can look one up per COIN_REQUEST message. */
  coinRequests: Record<string, MandaliCoinRequest>;
  /** Epoch ms when this person may post their next coin request; null = they may ask now. */
  coinRequestCooldownEndsAt: number | null;

  // Launch Handoff tracking
  activeGameLaunch: MandaliPartyLaunchedBroadcast | null;

  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;

  // Actions
  fetchMandalis: (filter?: { search?: string; language?: string; tag?: string }) => Promise<void>;
  fetchMyMandalis: () => Promise<void>;
  fetchMandaliByHandleOrId: (handleOrId: string) => Promise<boolean>;
  setActiveChannel: (channelId: string) => void;
  fetchMessages: (channelId: string) => Promise<void>;
  createMandali: (payload: CreateMandaliPayload) => Promise<{ success: boolean; mandali?: Mandali; error?: string }>;
  joinMandali: (mandaliId: string, statement?: string, userDetails?: { playerId?: string; displayName?: string; avatar?: string }, invitationId?: string) => Promise<{ success: boolean; error?: string }>;
  leaveMandali: (mandaliId: string) => Promise<{ success: boolean; error?: string }>;

  // WhatsApp-parity: member management, invite links, join approval
  promoteMember: (mandaliId: string, targetId: string) => Promise<{ success: boolean; error?: string }>;
  demoteMember: (mandaliId: string, targetId: string) => Promise<{ success: boolean; error?: string }>;
  kickMember: (mandaliId: string, targetId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  banMember: (mandaliId: string, targetId: string) => Promise<{ success: boolean; error?: string }>;
  transferOwnership: (mandaliId: string, newOwnerId: string) => Promise<{ success: boolean; error?: string }>;
  updateMandaliSettings: (mandaliId: string, patch: {
    name?: string; emblem?: string; description?: string; rules?: string;
    editPermission?: "ADMIN" | "ALL"; sendPermission?: "ADMIN" | "ALL"; joinApproval?: boolean;
  }) => Promise<{ success: boolean; mandali?: Mandali; error?: string }>;
  createInviteLink: (mandaliId: string, expiresInMs?: number) => Promise<{ success: boolean; invitation?: MandaliInviteLink; error?: string }>;
  resolveInviteLink: (token: string) => Promise<{ valid: boolean; invitationId?: string; mandaliId?: string; name?: string; emblem?: string; description?: string }>;
  pendingJoinRequests: MandaliJoinRequestRecord[];
  fetchPendingJoinRequests: (mandaliId: string) => Promise<void>;
  fetchCoinRequests: (mandaliId: string) => Promise<void>;
  decideJoinRequest: (requestId: string, approve: boolean) => Promise<{ success: boolean; error?: string }>;

  // Chat power features
  pinMessage: (channelId: string, messageId: string, pinned: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteMessage: (channelId: string, messageId: string) => Promise<{ success: boolean; error?: string }>;

  // Payable coin-request cards
  createCoinRequest: (mandaliId: string, channelId: string, payerId: string, amount: number, expiresInMs?: number) => Promise<{ success: boolean; request?: MandaliCoinRequest; error?: string; retryAfterMs?: number }>;
  fetchCoinRequestCooldown: () => Promise<void>;
  /** Re-read the open Mandali without the loading screen — driven by the server's mandali:changed event. */
  refreshActiveMandali: () => Promise<void>;
  fundCoinRequest: (requestId: string) => Promise<{ success: boolean; request?: MandaliCoinRequest; error?: string }>;

  // Coin Transfers
  fetchCoinTransfers: (mandaliId: string) => Promise<void>;
  transferCoins: (mandaliId: string, payload: CoinTransferPayload) => Promise<{ success: boolean; transfer?: MandaliCoinTransfer; error?: string }>;

  // Realtime Socket Methods
  initMandaliSocket: (mandaliId: string, playerId: string) => void;
  cleanupMandaliSocket: (mandaliId: string, playerId: string) => void;
  sendMessage: (content: string, playerId?: string, replyToId?: string) => Promise<{ success: boolean; message?: MandaliMessage; error?: string }>;
  reactToMessage: (messageId: string, emoji: string, playerId?: string) => Promise<void>;
  createParty: (game: GameKind, modeId: string, title: string, slots: number, playerId?: string) => Promise<{ success: boolean; party?: MandaliParty; error?: string }>;
  joinParty: (partyId: string, playerId?: string) => Promise<{ success: boolean; party?: MandaliParty; error?: string }>;
  leaveParty: (partyId: string, playerId?: string) => Promise<{ success: boolean; error?: string }>;
  launchParty: (partyId: string, leaderId?: string) => Promise<{ success: boolean; roomCode?: string; game?: string; error?: string }>;
  clearActiveLaunch: () => void;
}

export const DEFAULT_PREVIEW_MANDALIS: Mandali[] = [
  {
    id: "mandali_ludo_kings",
    handle: "ludo-maharajas",
    name: "Ludo Lounge Maharajas",
    description: "Dedicated to precision dice rolls, cut-throat tactical blockades, and high-stakes speedrun circuits across Indian lounge boards.",
    emblem: "pawn_amber",
    bannerGradient: "from-amber-600 via-yellow-600 to-orange-700",
    language: "Telugu",
    region: "Telangana & AP",
    tags: ["Tournaments", "Ludo", "Competitive", "Weekend Play"],
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
    id: "mandali_hc_warriors",
    handle: "hand-cricket-champs",
    name: "Street & Galli Hand Cricket League",
    description: "Childhood finger-cricket nostalgia! High-voltage death overs, boundary blitzes, and galli cricket tournaments every weekend evening.",
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
    id: "mandali_rummy_royals",
    handle: "rummy-royals",
    name: "Classic Rummy Royals",
    description: "Mastery over pure sequences, second sequences, and disciplined drops. Where 0 penalty points is the only acceptable declaration.",
    emblem: "crown_gold",
    bannerGradient: "from-purple-600 via-indigo-600 to-slate-900",
    language: "English",
    region: "Global",
    tags: ["Rummy", "Tournaments", "Competitive"],
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
    id: "mandali_snl_explorers",
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
    id: "mandali_uno_champs",
    handle: "uno-frenzy",
    name: "Wild Draw-4 Blitz Guild",
    description: "Stacking +4 cards, ruthless colour switches, and split-second 'UNO!' calls. Friendly chaos and fast-paced party games every night.",
    emblem: "flame_ruby",
    bannerGradient: "from-cyan-600 via-blue-600 to-indigo-800",
    language: "English",
    region: "Bangalore & Hyderabad",
    tags: ["UNO", "Casual", "Voice Lounge"],
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

let socketListenersBound = false;
let mandaliRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let mandaliReconnectHandler: (() => void) | null = null;

/**
 * Tracks whether THIS socket connection has completed `mandali:authenticate`.
 * Reset on every reconnect (Socket.IO clears `socket.data` server-side on
 * disconnect, so a stale "authenticated" flag here would silently desync
 * from the server's actual per-connection state and every action would fail
 * with "Not authenticated" until a page refresh).
 */
let mandaliSocketAuthenticatedFor: string | null = null;

/**
 * Authenticates the current socket for Mandali actions, once per connection.
 * Every `mandali:*` server handler now requires this — see
 * `MandaliSocketHandlers.ts`'s `requireAuthenticatedActor`.
 */
async function authenticateMandaliSocket(): Promise<void> {
  const socket = getSocket();
  if (mandaliSocketAuthenticatedFor === socket.id && socket.connected) return;

  const credential = await getPlayerCredential();
  if (!credential) return;

  await new Promise<void>((resolve) => {
    socket.emit(
      "mandali:authenticate" as any,
      { token: credential.token },
      (res: { success: boolean }) => {
        if (res?.success) mandaliSocketAuthenticatedFor = socket.id ?? null;
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

export const useMandaliStore = create<MandaliStore>((set, get) => ({
  mandalis: DEFAULT_PREVIEW_MANDALIS,
  myMandalis: [],
  activeMandali: null,
  members: [],
  channels: [],
  activeChannelId: null,
  messages: {},
  parties: [],
  memories: [],
  events: [],
  coinTransfers: [],
  activeGameLaunch: null,
  pendingJoinRequests: [],
  coinRequests: {},
  coinRequestCooldownEndsAt: null,
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,

  fetchMandalis: async (filter) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const queryParams = new URLSearchParams();
      if (filter?.search) queryParams.set("search", filter.search);
      if (filter?.language && filter.language !== "All") queryParams.set("language", filter.language);
      if (filter?.tag && filter.tag !== "All") queryParams.set("tag", filter.tag);

      const qs = queryParams.toString();
      const res = await apiJson<{ success?: boolean; mandalis?: Mandali[] }>(`/api/mandali${qs ? `?${qs}` : ""}`);
      if (res && Array.isArray(res.mandalis)) {
        set({ mandalis: res.mandalis, isLoading: false });
        return;
      }
    } catch {
      // ignore network errors and fallback to client-filtered list
    }

    // Client-side fallback filtering
    let list = [...DEFAULT_PREVIEW_MANDALIS];
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
    set({ mandalis: list, isLoading: false });
  },

  fetchMyMandalis: async () => {
    try {
      const res = await apiJson<{ success: boolean; mandalis: Mandali[] }>("/api/mandali/my");
      if (res && res.success) {
        set({ myMandalis: res.mandalis });
      }
    } catch {
      // ignore
    }
  },

  fetchMandaliByHandleOrId: async (handleOrId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const res = await apiJson<{
        success: boolean;
        mandali: Mandali;
        members: MandaliMember[];
        channels: MandaliChannel[];
        parties: MandaliParty[];
        memories: MandaliMemory[];
        events: MandaliEvent[];
      }>(`/api/mandali/${encodeURIComponent(handleOrId)}`);

      if (res && res.success) {
        const defaultChannel = res.channels.find((c) => c.type === "TEXT") || res.channels[0];
        set({
          activeMandali: res.mandali,
          members: res.members,
          channels: res.channels,
          parties: res.parties,
          memories: res.memories,
          events: res.events,
          activeChannelId: defaultChannel ? defaultChannel.channelId : null,
          isLoading: false,
        });

        // Automatically load messages for the active channel
        if (defaultChannel) {
          get().fetchMessages(defaultChannel.channelId);
        }
        get().fetchCoinRequests(res.mandali.id);
        return true;
      } else {
        set({ isLoading: false, errorMessage: "Mandali not found." });
        return false;
      }
    } catch {
      set({ isLoading: false, errorMessage: "Network error loading Mandali details." });
      return false;
    }
  },

  setActiveChannel: (channelId: string) => {
    set({ activeChannelId: channelId });
    get().fetchMessages(channelId);
  },

  fetchMessages: async (channelId: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return;

    try {
      const res = await apiJson<{ success: boolean; messages: MandaliMessage[] }>(
        `/api/mandali/${activeMandali.id}/channels/${channelId}/messages`
      );
      if (res && res.success) {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: res.messages,
          },
        }));
      }
    } catch {
      // ignore
    }
  },

  createMandali: async (payload: CreateMandaliPayload) => {
    set({ isSubmitting: true, errorMessage: null });
    try {
      const storedName = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.playerName") : null;
      const storedAvatar = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.avatar") : null;
      const playerId = resolveCurrentPlayerId();

      const res = await apiFetch("/api/mandali", {
        method: "POST",
        body: JSON.stringify({
          payload,
          creatorId: playerId,
          creatorName: storedName || "Mandali Founder",
          creatorAvatar: storedAvatar || "file_0000000084c48208b1f893419d784cf2_1.jpg",
        }),
      });
      const data = (await res.json()) as { success?: boolean; mandali?: Mandali; error?: string };
      set({ isSubmitting: false });
      if (data && (data.success || data.mandali)) {
        const newMandali = data.mandali!;
        set((state) => ({
          myMandalis: [newMandali, ...state.myMandalis],
          mandalis: [newMandali, ...state.mandalis],
        }));
        return { success: true, mandali: newMandali };
      }
      return { success: false, error: data.error || "Failed to create Mandali" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  joinMandali: async (mandaliId: string, statement?: string, userDetails?: { playerId?: string; displayName?: string; avatar?: string }, invitationId?: string) => {
    set({ isSubmitting: true });
    try {
      const storedName = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.playerName") : null;
      const storedAvatar = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.avatar") : null;
      const playerId = resolveCurrentPlayerId(userDetails?.playerId);
      const displayName = userDetails?.displayName || storedName || "Mandali Member";
      const avatar = userDetails?.avatar || storedAvatar || "file_0000000084c48208b1f893419d784cf2_1.jpg";

      const res = await apiFetch(`/api/mandali/${mandaliId}/join`, {
        method: "POST",
        body: JSON.stringify({ playerId, displayName, avatar, statement, invitationId }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      set({ isSubmitting: false });
      if (data.success) {
        // Refresh details
        await get().fetchMandaliByHandleOrId(mandaliId);
        await get().fetchMyMandalis();
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to join Mandali" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  leaveMandali: async (mandaliId: string) => {
    set({ isSubmitting: true });
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/leave`, {
        method: "POST",
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      set({ isSubmitting: false });
      if (data.success) {
        set((state) => ({
          myMandalis: state.myMandalis.filter((m) => m.id !== mandaliId),
        }));
        get().fetchMandaliByHandleOrId(mandaliId);
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to leave Mandali" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  promoteMember: async (mandaliId: string, targetId: string) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/members/${targetId}/promote`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchMandaliByHandleOrId(mandaliId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  demoteMember: async (mandaliId: string, targetId: string) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/members/${targetId}/demote`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchMandaliByHandleOrId(mandaliId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  kickMember: async (mandaliId: string, targetId: string, reason?: string) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/members/${targetId}/kick`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchMandaliByHandleOrId(mandaliId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  banMember: async (mandaliId: string, targetId: string) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/members/${targetId}/ban`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchMandaliByHandleOrId(mandaliId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  transferOwnership: async (mandaliId: string, newOwnerId: string) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ newOwnerId }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) await get().fetchMandaliByHandleOrId(mandaliId);
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  updateMandaliSettings: async (mandaliId: string, patch) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/settings`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { success: boolean; mandali?: Mandali; error?: string };
      if (data.success && data.mandali) {
        set((state) => ({
          activeMandali: state.activeMandali?.id === mandaliId ? data.mandali! : state.activeMandali,
        }));
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  createInviteLink: async (mandaliId: string, expiresInMs?: number) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/invite-links`, {
        method: "POST",
        body: JSON.stringify({ expiresInMs }),
      });
      const data = (await res.json()) as { success: boolean; invitation?: MandaliInviteLink; error?: string };
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  resolveInviteLink: async (token: string) => {
    try {
      const res = await apiFetch(`/api/mandali/invite-links/resolve`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      return (await res.json()) as { valid: boolean; invitationId?: string; mandaliId?: string; name?: string; emblem?: string; description?: string };
    } catch {
      return { valid: false };
    }
  },

  fetchPendingJoinRequests: async (mandaliId: string) => {
    try {
      const res = await apiJson<{ success: boolean; requests: MandaliJoinRequestRecord[] }>(
        `/api/mandali/${mandaliId}/join-requests`
      );
      if (res?.success) set({ pendingJoinRequests: res.requests });
    } catch {
      // ignore
    }
  },

  decideJoinRequest: async (requestId: string, approve: boolean) => {
    try {
      const res = await apiFetch(`/api/mandali/join-requests/${requestId}/decide`, {
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
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };
    try {
      const res = await apiFetch(`/api/mandali/${activeMandali.id}/channels/${channelId}/messages/${messageId}/pin`, {
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
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };
    try {
      const res = await apiFetch(`/api/mandali/${activeMandali.id}/channels/${channelId}/messages/${messageId}`, {
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

  fetchCoinRequests: async (mandaliId: string) => {
    try {
      const res = await apiJson<{ success: boolean; requests: MandaliCoinRequest[] }>(
        `/api/mandali/${mandaliId}/coin-requests`
      );
      if (res?.success) {
        const byMessageId: Record<string, MandaliCoinRequest> = {};
        for (const r of res.requests) {
          if (r.messageId) byMessageId[r.messageId] = r;
        }
        set({ coinRequests: byMessageId });
      }
    } catch {
      // ignore
    }
  },

  createCoinRequest: async (mandaliId: string, channelId: string, payerId: string, amount: number, expiresInMs?: number) => {
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/channels/${channelId}/coin-requests`, {
        method: "POST",
        body: JSON.stringify({ payerId, amount, expiresInMs }),
      });
      const data = (await res.json()) as { success: boolean; request?: MandaliCoinRequest; error?: string; retryAfterMs?: number };
      if (data.success) {
        set({ coinRequestCooldownEndsAt: Date.now() + MANDALI_COIN_REQUEST_COOLDOWN_MS });
        await get().fetchMessages(channelId);
        await get().fetchCoinRequests(mandaliId);
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
    const { activeChannelId, activeMandali } = get();
    try {
      const res = await apiFetch(`/api/mandali/coin-requests/${requestId}/fund`, {
        method: "POST",
      });
      const data = (await res.json()) as { success: boolean; request?: MandaliCoinRequest; error?: string };
      if (data.success) {
        void refreshCurrentWallet();
        if (activeChannelId) await get().fetchMessages(activeChannelId);
        if (activeMandali) await get().fetchCoinRequests(activeMandali.id);
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  fetchCoinRequestCooldown: async () => {
    const res = await apiJson<{ success: boolean; retryAfterMs: number }>("/api/mandali/coin-request-cooldown");
    if (res?.success) {
      set({ coinRequestCooldownEndsAt: res.retryAfterMs > 0 ? Date.now() + res.retryAfterMs : null });
    }
  },

  refreshActiveMandali: async () => {
    const { activeMandali, activeChannelId } = get();
    if (!activeMandali) return;
    const res = await apiJson<{
      success: boolean;
      mandali: Mandali;
      members: MandaliMember[];
      channels: MandaliChannel[];
      parties: MandaliParty[];
      memories: MandaliMemory[];
      events: MandaliEvent[];
    }>(`/api/mandali/${encodeURIComponent(activeMandali.id)}`);
    if (!res?.success) return;

    const keepChannel = res.channels.some((c) => c.channelId === activeChannelId);
    set({
      activeMandali: res.mandali,
      members: res.members,
      channels: res.channels,
      parties: res.parties,
      memories: res.memories,
      events: res.events,
      activeChannelId: keepChannel ? activeChannelId : res.channels[0]?.channelId ?? null,
    });

    const channelId = get().activeChannelId;
    if (channelId) await get().fetchMessages(channelId);
    await get().fetchCoinRequests(res.mandali.id);

    const me = res.members.find((m) => m.playerId === resolveCurrentPlayerId());
    const role: string = me?.role ?? "";
    if (role === "OWNER" || role === "ADMIN") await get().fetchPendingJoinRequests(res.mandali.id);
  },

  fetchCoinTransfers: async (mandaliId: string) => {
    try {
      const res = await apiJson<{ success: boolean; transfers: MandaliCoinTransfer[] }>(
        `/api/mandali/${mandaliId}/coins/transfers`
      );
      if (res && res.success) {
        set({ coinTransfers: res.transfers || [] });
      }
    } catch {
      // ignore
    }
  },

  transferCoins: async (mandaliId: string, payload: CoinTransferPayload) => {
    set({ isSubmitting: true });
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/coins/transfer`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success: boolean; transfer?: MandaliCoinTransfer; error?: string };
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

  initMandaliSocket: (mandaliId: string, playerId: string) => {
    const socket = getSocket();

    const joinCurrentMandali = () => {
      void (async () => {
        await authenticateMandaliSocket();
        socket.emit("mandali:join_room" as any, { mandaliId, playerId });
      })();
    };
    joinCurrentMandali();

    // A reconnect gets a fresh server-side socket.data — re-authenticate and
    // rejoin the broadcast room, or every action silently fails until a
    // manual refresh. Only one of these is ever live at a time: replacing it
    // (rather than stacking a new listener per call) avoids re-joining a
    // Mandali the caller already navigated away from, and avoids leaking a
    // listener per hub visit.
    if (mandaliReconnectHandler) socket.off("connect", mandaliReconnectHandler);
    mandaliReconnectHandler = joinCurrentMandali;
    socket.on("connect", mandaliReconnectHandler);

    if (!socketListenersBound) {
      socketListenersBound = true;

      socket.on("mandali:chat:message" as any, (payload: { mandaliId: string; message: MandaliMessage }) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;

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

      socket.on("mandali:reaction:updated" as any, (payload: MandaliReactionUpdatedBroadcast) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;

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

      socket.on("mandali:party:updated" as any, (payload: { mandaliId: string; party: MandaliParty }) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;

        set((state) => {
          const exists = state.parties.some((p) => p.partyId === payload.party.partyId);
          return {
            parties: exists
              ? state.parties.map((p) => (p.partyId === payload.party.partyId ? payload.party : p))
              : [payload.party, ...state.parties],
          };
        });
      });

      socket.on("mandali:party:launched" as any, (payload: MandaliPartyLaunchedBroadcast) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;

        set({ activeGameLaunch: payload });
      });

      socket.on("mandali:memory:created" as any, (payload: MandaliMemoryCreatedBroadcast) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;

        set((state) => ({
          memories: [payload.memory, ...state.memories],
        }));
      });

      socket.on("mandali:presence:changed" as any, (payload: MandaliPresenceChangedBroadcast) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;

        set((state) => ({
          members: state.members.map((m) =>
            m.memberId === payload.member.memberId ? payload.member : m
          ),
        }));
      });

      socket.on("mandali:coin_transfer" as any, (payload: { mandaliId: string; transfer: MandaliCoinTransfer }) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;

        set((state) => ({
          coinTransfers: [payload.transfer, ...state.coinTransfers],
        }));
      });

      // A coin request card is created inside the database, so it never
      // arrives as an ordinary chat message. This event carries the request
      // record (which the card needs in order to show a Pay button) and the
      // message itself, so everyone in the room sees it the moment it lands.
      socket.on("mandali:coin_request:updated" as any, (payload: { mandaliId: string; request: MandaliCoinRequest; message?: MandaliMessage }) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;
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

      // Something about the Mandali changed (members, roles, settings, pins,
      // deletions). Refetch rather than patching state from the event, and
      // coalesce a burst of changes into one refresh.
      socket.on("mandali:changed" as any, (payload: { mandaliId: string }) => {
        const { activeMandali } = get();
        if (!activeMandali || activeMandali.id !== payload.mandaliId) return;
        if (mandaliRefreshTimer) clearTimeout(mandaliRefreshTimer);
        mandaliRefreshTimer = setTimeout(() => {
          mandaliRefreshTimer = null;
          void get().refreshActiveMandali();
        }, 250);
      });
    }
  },

  cleanupMandaliSocket: (mandaliId: string, playerId: string) => {
    const socket = getSocket();
    socket.emit("mandali:leave_room" as any, { mandaliId, playerId });
    if (mandaliRefreshTimer) {
      clearTimeout(mandaliRefreshTimer);
      mandaliRefreshTimer = null;
    }
    if (mandaliReconnectHandler) {
      socket.off("connect", mandaliReconnectHandler);
      mandaliReconnectHandler = null;
    }
  },

  sendMessage: async (content: string, playerId?: string, replyToId?: string) => {
    const { activeMandali, activeChannelId } = get();
    if (!activeMandali || !activeChannelId) return { success: false, error: "No active channel" };

    const effectivePlayerId = resolveCurrentPlayerId(playerId);

    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:chat:send" as any,
        {
          mandaliId: activeMandali.id,
          channelId: activeChannelId,
          playerId: effectivePlayerId,
          content,
          replyToId,
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; message?: MandaliMessage; error?: string };
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
    const { activeMandali, activeChannelId } = get();
    if (!activeMandali || !activeChannelId) return;

    const effectivePlayerId = resolveCurrentPlayerId(playerId);
    const socket = getSocket();
    socket.emit("mandali:chat:react" as any, {
      mandaliId: activeMandali.id,
      channelId: activeChannelId,
      messageId,
      playerId: effectivePlayerId,
      emoji,
    });
  },

  createParty: async (game: GameKind, modeId: string, title: string, slots: number, playerId?: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    const effectivePlayerId = resolveCurrentPlayerId(playerId);
    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:create" as any,
        {
          mandaliId: activeMandali.id,
          playerId: effectivePlayerId,
          game,
          modeId,
          title,
          slots,
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; party?: MandaliParty; error?: string };
          resolve(outcome);
        }
      );
    });
  },

  joinParty: async (partyId: string, playerId?: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    const effectivePlayerId = resolveCurrentPlayerId(playerId);
    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:join" as any,
        {
          mandaliId: activeMandali.id,
          partyId,
          playerId: effectivePlayerId,
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; party?: MandaliParty; error?: string };
          resolve(outcome);
        }
      );
    });
  },

  leaveParty: async (partyId: string, playerId?: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    const effectivePlayerId = resolveCurrentPlayerId(playerId);
    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:leave" as any,
        {
          mandaliId: activeMandali.id,
          partyId,
          playerId: effectivePlayerId,
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; error?: string };
          resolve(outcome);
        }
      );
    });
  },

  launchParty: async (partyId: string, leaderId?: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    const effectiveLeaderId = resolveCurrentPlayerId(leaderId);
    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:launch" as any,
        {
          mandaliId: activeMandali.id,
          partyId,
          leaderId: effectiveLeaderId,
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; roomCode?: string; game?: string; error?: string };
          resolve(outcome);
        }
      );
    });
  },

  clearActiveLaunch: () => {
    set({ activeGameLaunch: null });
  },
}));
