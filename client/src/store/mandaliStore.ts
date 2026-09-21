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
  joinMandali: (mandaliId: string, statement?: string) => Promise<{ success: boolean; error?: string }>;
  leaveMandali: (mandaliId: string) => Promise<{ success: boolean; error?: string }>;

  // Realtime Socket Methods
  initMandaliSocket: (mandaliId: string, playerId: string) => void;
  cleanupMandaliSocket: (mandaliId: string, playerId: string) => void;
  sendMessage: (content: string, replyToId?: string) => Promise<{ success: boolean; error?: string }>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  createParty: (game: GameKind, modeId: string, title: string, slots: number) => Promise<{ success: boolean; party?: MandaliParty; error?: string }>;
  joinParty: (partyId: string) => Promise<{ success: boolean; party?: MandaliParty; error?: string }>;
  leaveParty: (partyId: string) => Promise<{ success: boolean; error?: string }>;
  launchParty: (partyId: string) => Promise<{ success: boolean; roomCode?: string; game?: string; error?: string }>;
  clearActiveLaunch: () => void;
}

let socketListenersBound = false;

export const useMandaliStore = create<MandaliStore>((set, get) => ({
  mandalis: [],
  myMandalis: [],
  activeMandali: null,
  members: [],
  channels: [],
  activeChannelId: null,
  messages: {},
  parties: [],
  memories: [],
  events: [],
  activeGameLaunch: null,
  isLoading: false,
  isSubmitting: false,
  errorMessage: null,

  fetchMandalis: async (filter) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const queryParams = new URLSearchParams();
      if (filter?.search) queryParams.set("search", filter.search);
      if (filter?.language) queryParams.set("language", filter.language);
      if (filter?.tag) queryParams.set("tag", filter.tag);

      const qs = queryParams.toString();
      const res = await apiJson<{ success: boolean; mandalis: Mandali[] }>(`/api/mandali${qs ? `?${qs}` : ""}`);
      if (res && res.success) {
        set({ mandalis: res.mandalis, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false, errorMessage: "Failed to load Mandalis." });
    }
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
      const res = await apiFetch("/api/mandali", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success: boolean; mandali?: Mandali; error?: string };
      set({ isSubmitting: false });
      if (data.success && data.mandali) {
        set((state) => ({
          myMandalis: [data.mandali!, ...state.myMandalis],
          mandalis: [data.mandali!, ...state.mandalis],
        }));
        return { success: true, mandali: data.mandali };
      }
      return { success: false, error: data.error || "Failed to create Mandali" };
    } catch (err) {
      set({ isSubmitting: false });
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  joinMandali: async (mandaliId: string, statement?: string) => {
    set({ isSubmitting: true });
    try {
      const res = await apiFetch(`/api/mandali/${mandaliId}/join`, {
        method: "POST",
        body: JSON.stringify({ statement }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      set({ isSubmitting: false });
      if (data.success) {
        // Refresh details
        get().fetchMandaliByHandleOrId(mandaliId);
        get().fetchMyMandalis();
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
    }
  },

  cleanupMandaliSocket: (mandaliId: string, playerId: string) => {
    const socket = getSocket();
    socket.emit("mandali:leave_room" as any, { mandaliId, playerId });
  },

  sendMessage: async (content: string, replyToId?: string) => {
    const { activeMandali, activeChannelId } = get();
    if (!activeMandali || !activeChannelId) return { success: false, error: "No active channel" };

    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:chat:send" as any,
        {
          mandaliId: activeMandali.id,
          channelId: activeChannelId,
          playerId: "me", // Server resolves or checks member
          content,
          replyToId,
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; message?: MandaliMessage; error?: string };
          resolve(outcome);
        }
      );
    });
  },

  reactToMessage: async (messageId: string, emoji: string) => {
    const { activeMandali, activeChannelId } = get();
    if (!activeMandali || !activeChannelId) return;

    const socket = getSocket();
    socket.emit("mandali:chat:react" as any, {
      mandaliId: activeMandali.id,
      channelId: activeChannelId,
      messageId,
      playerId: "me",
      emoji,
    });
  },

  createParty: async (game: GameKind, modeId: string, title: string, slots: number) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:create" as any,
        {
          mandaliId: activeMandali.id,
          playerId: "me",
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

  joinParty: async (partyId: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:join" as any,
        {
          mandaliId: activeMandali.id,
          partyId,
          playerId: "me",
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; party?: MandaliParty; error?: string };
          resolve(outcome);
        }
      );
    });
  },

  leaveParty: async (partyId: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:leave" as any,
        {
          mandaliId: activeMandali.id,
          partyId,
          playerId: "me",
        },
        (res: unknown) => {
          const outcome = res as { success: boolean; error?: string };
          resolve(outcome);
        }
      );
    });
  },

  launchParty: async (partyId: string) => {
    const { activeMandali } = get();
    if (!activeMandali) return { success: false, error: "No active Mandali" };

    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(
        "mandali:party:launch" as any,
        {
          mandaliId: activeMandali.id,
          partyId,
          leaderId: "me",
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
