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

  setPlayerId: (id: string | null) => void;
  setPlayerName: (name: string) => void;
  setRoomState: (state: RoomPublicState | null) => void;
  setGameState: (state: unknown) => void;
  addMessage: (msg: ChatMessage) => void;
  setError: (err: string | null) => void;
  setRematch: (state: RematchState) => void;
  reset: () => void;
}

const STORED_NAME_KEY = "mpg.playerName";
const STORED_ID_KEY = "mpg.playerId";

export const useRoomStore = create<RoomStore>((set) => ({
  playerId: localStorage.getItem(STORED_ID_KEY),
  playerName: localStorage.getItem(STORED_NAME_KEY) ?? "",
  roomState: null,
  gameState: null,
  messages: [],
  lastError: null,
  rematch: idleRematch,

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
  reset: () =>
    set({
      roomState: null,
      gameState: null,
      messages: [],
      lastError: null,
      rematch: idleRematch,
    }),
}));
