import { create } from "zustand";
import type {
  ChatMessage,
  RematchState,
  RoomPublicState,
  Player,
  GameKind,
  RpsState,
  RummyPlayerState,
  LudoState,
  SnlState,
  HcState,
  UnoPlayerState,
  WordBuildingPublicState,
  DotsBoxesPublicState,
  StarPlayerView,
  BingoPlayerState,
  NamePlaceAnimalPlayerState,
  TambolaPlayerState,
  SnakePublicState,
  CarromPublicState,
  ChessPublicState,
  SpaceWarPublicState,
} from "@shared/types";

const idleRematch: RematchState = {
  status: "idle",
  requesterId: null,
  responses: {},
  expiresAt: null,
  startsAt: null,
  declinedBy: null,
};

/**
 * Type-safe mapping of all game states by GameKind.
 */
export interface GameStateMap {
  rps: RpsState;
  rummy: RummyPlayerState;
  ludo: LudoState;
  snl: SnlState;
  handcricket: HcState;
  uno: UnoPlayerState;
  wordbuilding: WordBuildingPublicState;
  dotsboxes: DotsBoxesPublicState;
  stargame: StarPlayerView;
  bingo: BingoPlayerState;
  namesplaceanimal: NamePlaceAnimalPlayerState;
  tambola: TambolaPlayerState;
  snake: SnakePublicState;
  carrom: CarromPublicState;
  chess: ChessPublicState;
  spacewar: SpaceWarPublicState;
  roadrash: unknown;
  blockblast: unknown;
}

/**
 * What proves a seat is yours, per room.
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
  /** Free-text "about me", shown on the profile page. */
  bio: string;
  /** Region/country the player picked for matchmaking display. */
  region: string;
  /** Seat credentials by room code. Never sent anywhere but `room:join`. */
  seats: Record<string, SeatCredential>;
  roomState: RoomPublicState | null;
  gameState: unknown;
  messages: ChatMessage[];
  lastError: string | null;
  rematch: RematchState;
  /** Last 3 distinct named Rummy rosters the player joined */
  lastGangs: LastGangEntry[];

  setPlayerId: (id: string | null) => void;
  setPlayerName: (name: string) => void;
  setAvatarId: (id: string | null) => void;
  setBio: (bio: string) => void;
  setRegion: (region: string) => void;
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
// Names kept as-is (not the mpg.* prefix above) — these already existed as
// page-local localStorage keys before bio/region moved into this store, and
// renaming them would orphan whatever a returning player already has saved.
const BIO_KEY = "bhalyam.profile.bio";
const REGION_KEY = "bhalyam.profile.region";

/** Rooms remembered at once. Old codes are dead the moment their room is. */
const MAX_REMEMBERED_SEATS = 12;

function loadSeats(): Record<string, SeatCredential> {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return {};
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
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
  } catch {
    /* ignore — private browsing / quota */
  }
}

function loadLastGangs(): LastGangEntry[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
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
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LAST_GANGS_KEY, JSON.stringify(list));
  } catch {
    /* ignore — private browsing / quota */
  }
}

function safeGetStorage(key: string): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  playerId: safeGetStorage(STORED_ID_KEY),
  playerName: safeGetStorage(STORED_NAME_KEY) ?? "",
  avatarId: safeGetStorage(AVATAR_KEY),
  bio: safeGetStorage(BIO_KEY) ?? "",
  region: safeGetStorage(REGION_KEY) ?? "India 🇮🇳",
  seats: loadSeats(),
  roomState: null,
  gameState: null,
  messages: [],
  lastError: null,
  rematch: idleRematch,
  lastGangs: loadLastGangs(),

  setPlayerId: (id) => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        if (id) localStorage.setItem(STORED_ID_KEY, id);
        else localStorage.removeItem(STORED_ID_KEY);
      } catch {}
    }
    set({ playerId: id });
  },
  setPlayerName: (name) => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        // Matches setAvatarId's pattern just below: an empty value removes
        // the key rather than storing an empty string. Storing "" meant
        // signOut()'s full localStorage.clear() always had exactly one key
        // written straight back afterward.
        if (name) localStorage.setItem(STORED_NAME_KEY, name);
        else localStorage.removeItem(STORED_NAME_KEY);
      } catch {}
    }
    set({ playerName: name });
  },
  setAvatarId: (id) => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        if (id) localStorage.setItem(AVATAR_KEY, id);
        else localStorage.removeItem(AVATAR_KEY);
      } catch {
        /* private browsing — the choice still applies for this session */
      }
    }
    set({ avatarId: id });
  },
  setBio: (bio) => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(BIO_KEY, bio);
      } catch {}
    }
    set({ bio });
  },
  setRegion: (region) => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(REGION_KEY, region);
      } catch {}
    }
    set({ region });
  },
  rememberSeat: (code, playerId, seatToken) =>
    set((s) => {
      const key = code.trim().toUpperCase();
      const next = { ...s.seats, [key]: { playerId, seatToken } };
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

const EMPTY_PLAYERS: Player[] = [];
const EMPTY_MESSAGES: ChatMessage[] = [];

// ── Fine-grained, memoized Zustand selectors ──
export const useRoomPlayers = (): Player[] =>
  useRoomStore((s) => s.roomState?.players ?? EMPTY_PLAYERS);

export const useRoomPhase = (): RoomPublicState["phase"] =>
  useRoomStore((s) => s.roomState?.phase ?? "lobby");

export const useRoomHostId = (): string | null =>
  useRoomStore((s) => s.roomState?.hostId ?? null);

export const useRoomCode = (): string | null =>
  useRoomStore((s) => s.roomState?.code ?? null);

export const useRoomMessages = (): ChatMessage[] =>
  useRoomStore((s) => s.messages ?? EMPTY_MESSAGES);

export const useRoomRematch = (): RematchState =>
  useRoomStore((s) => s.rematch);

export const useRoomPlayerId = (): string | null =>
  useRoomStore((s) => s.playerId);

export const useRoomPlayerName = (): string =>
  useRoomStore((s) => s.playerName);

export const useRoomAvatarId = (): string | null =>
  useRoomStore((s) => s.avatarId);

export const useRoomBio = (): string => useRoomStore((s) => s.bio);

export const useRoomRegion = (): string => useRoomStore((s) => s.region);

export function useGameState<K extends GameKind>(_game: K): GameStateMap[K] | null {
  return useRoomStore((s) => s.gameState as GameStateMap[K] | null);
}
