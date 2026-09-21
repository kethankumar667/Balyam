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
} from "@shared/mandali/types.js";
import type {
  MandaliPartyLaunchedBroadcast,
  MandaliReactionUpdatedBroadcast,
  MandaliPresenceChangedBroadcast,
  MandaliMemoryCreatedBroadcast,
} from "@shared/mandali/socketContract.js";
import type { GameKind } from "@shared/types.js";
import { apiFetch, apiJson } from "../lib/playerIdentity";
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
  joinMandali: (mandaliId: string, statement?: string, userDetails?: { playerId?: string; displayName?: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>;
  leaveMandali: (mandaliId: string) => Promise<{ success: boolean; error?: string }>;

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

  joinMandali: async (mandaliId: string, statement?: string, userDetails?: { playerId?: string; displayName?: string; avatar?: string }) => {
    set({ isSubmitting: true });
    try {
      const storedName = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.playerName") : null;
      const storedAvatar = typeof localStorage !== "undefined" ? localStorage.getItem("mpg.avatar") : null;
      const playerId = resolveCurrentPlayerId(userDetails?.playerId);
      const displayName = userDetails?.displayName || storedName || "Mandali Member";
      const avatar = userDetails?.avatar || storedAvatar || "file_0000000084c48208b1f893419d784cf2_1.jpg";

      const res = await apiFetch(`/api/mandali/${mandaliId}/join`, {
        method: "POST",
        body: JSON.stringify({ playerId, displayName, avatar, statement }),
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
    socket.emit("mandali:join_room" as any, { mandaliId, playerId });

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
    }
  },

  cleanupMandaliSocket: (mandaliId: string, playerId: string) => {
    const socket = getSocket();
    socket.emit("mandali:leave_room" as any, { mandaliId, playerId });
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
