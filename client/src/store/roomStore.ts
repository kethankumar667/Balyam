import { create } from "zustand";
import type { ChatMessage, RematchState, RoomPublicState } from "@shared/types";

const idleRematch: RematchState = {
  status: "idle",
  requesterId: null,
  responses: {},
  expiresAt: null,
  startsAt: null,
  declinedBy: null,
};

interface RoomStore {
  playerId: string | null;
  playerName: string;
  roomState: RoomPublicState | null;
  gameState: unknown;
  messages: ChatMessage[];
  lastError: string | null;
  rematch: RematchState;
  /** Last 3 distinct named Rummy rosters the player joined — "Friday Rummy
   *  Nights" memory (docs/rummy/roadmap.md A.5). Most recent first. */
  lastGangs: LastGangEntry[];

  setPlayerId: (id: string | null) => void;
  setPlayerName: (name: string) => void;
  setRoomState: (state: RoomPublicState | null) => void;
  setGameState: (state: unknown) => void;
  addMessage: (msg: ChatMessage) => void;
  setError: (err: string | null) => void;
  setRematch: (state: RematchState) => void;
  recordLastGang: (roomName: string, playerNames: string[]) => void;
  reset: () => void;
}

export interface LastGangEntry {
  roomName: string;
  playerNames: string[];
  joinedAt: number;
}

const STORED_NAME_KEY = "mpg.playerName";
const STORED_ID_KEY = "mpg.playerId";
const LAST_GANGS_KEY = "mpg.rummy.lastGangs";

function loadLastGangs(): LastGangEntry[] {
  try {
    const raw = localStorage.getItem(LAST_GANGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function saveLastGangs(list: LastGangEntry[]): void {
  try {
    localStorage.setItem(LAST_GANGS_KEY, JSON.stringify(list));
  } catch {
    /* ignore — private browsing / quota */
  }
}

export const useRoomStore = create<RoomStore>((set) => ({
  playerId: localStorage.getItem(STORED_ID_KEY),
  playerName: localStorage.getItem(STORED_NAME_KEY) ?? "",
  roomState: null,
  gameState: null,
  messages: [],
  lastError: null,
  rematch: idleRematch,
  lastGangs: loadLastGangs(),

  setPlayerId: (id) => {
    if (id) localStorage.setItem(STORED_ID_KEY, id);
    else localStorage.removeItem(STORED_ID_KEY);
    set({ playerId: id });
  },
  setPlayerName: (name) => {
    localStorage.setItem(STORED_NAME_KEY, name);
    set({ playerName: name });
  },
  setRoomState: (state) => set({ roomState: state }),
  setGameState: (state) => set({ gameState: state }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages.slice(-199), msg] })),
  setError: (err) => set({ lastError: err }),
  setRematch: (state) => set({ rematch: state }),
  recordLastGang: (roomName, playerNames) =>
    set((s) => {
      const next = [
        { roomName, playerNames, joinedAt: Date.now() },
        ...s.lastGangs.filter((g) => g.roomName !== roomName),
      ].slice(0, 3);
      saveLastGangs(next);
      return { lastGangs: next };
    }),
  reset: () =>
    set({
      roomState: null,
      gameState: null,
      messages: [],
      lastError: null,
      rematch: idleRematch,
    }),
}));
