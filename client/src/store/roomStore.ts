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

/**
 * What proves a seat is yours, per room.
 *
 * `playerId` alone used to be the whole credential, and it is broadcast to
 * everyone in the room — so anyone who could see it could take the seat. The
 * server now issues a token alongside it (see server/src/lib/seatToken) and
 * only that reclaims a seat.
 *
 * Keyed by room code rather than kept as one global pair, because a token is
 * scoped to a single room. That also fixes an old wrinkle: the single global
 * `playerId` was sent when joining ANY room, including ones it had nothing to
 * do with, and got overwritten by whatever the last room minted.
 */
export interface SeatCredential {
  playerId: string;
  seatToken: string;
}

interface RoomStore {
  playerId: string | null;
  playerName: string;
  /** Chosen avatar filename from public/Avatars, or null for none. */
  avatarId: string | null;
  /** Seat credentials by room code. Never sent anywhere but `room:join`. */
  seats: Record<string, SeatCredential>;
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
  setAvatarId: (id: string | null) => void;
  /** Store the credential from a `room:create` / `room:join` ack. */
  rememberSeat: (code: string, playerId: string, seatToken: string) => void;
  /** The credential for a room, if this browser holds one. */
  seatFor: (code: string) => SeatCredential | null;
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
const SEATS_KEY = "mpg.seats";
const AVATAR_KEY = "mpg.avatar";

/** Rooms remembered at once. Old codes are dead the moment their room is. */
const MAX_REMEMBERED_SEATS = 12;

function loadSeats(): Record<string, SeatCredential> {
  try {
    const raw = localStorage.getItem(SEATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, SeatCredential> = {};
    for (const [code, cred] of Object.entries(parsed as Record<string, unknown>)) {
      const c = cred as Partial<SeatCredential>;
      if (typeof c?.playerId === "string" && typeof c?.seatToken === "string") {
        out[code] = { playerId: c.playerId, seatToken: c.seatToken };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveSeats(seats: Record<string, SeatCredential>): void {
  try {
    localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
  } catch {
    /* ignore — private browsing / quota */
  }
}

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

export const useRoomStore = create<RoomStore>((set, get) => ({
  playerId: localStorage.getItem(STORED_ID_KEY),
  playerName: localStorage.getItem(STORED_NAME_KEY) ?? "",
  avatarId: localStorage.getItem(AVATAR_KEY),
  seats: loadSeats(),
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
  setAvatarId: (id) => {
    try {
      if (id) localStorage.setItem(AVATAR_KEY, id);
      else localStorage.removeItem(AVATAR_KEY);
    } catch {
      /* private browsing — the choice still applies for this session */
    }
    set({ avatarId: id });
  },
  rememberSeat: (code, playerId, seatToken) =>
    set((s) => {
      const key = code.trim().toUpperCase();
      const next = { ...s.seats, [key]: { playerId, seatToken } };
      // Trim oldest-first once over the cap. Insertion order is good enough:
      // a room whose code fell off the end has almost certainly ended.
      const codes = Object.keys(next);
      for (const stale of codes.slice(0, Math.max(0, codes.length - MAX_REMEMBERED_SEATS))) {
        delete next[stale];
      }
      saveSeats(next);
      return { seats: next };
    }),
  seatFor: (code) => get().seats[code.trim().toUpperCase()] ?? null,
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
