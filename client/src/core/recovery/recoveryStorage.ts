/**
 * Session Persistence Layer for BHALYAM Realtime Recovery.
 * Namespaced under "bhalyam.recovery.*" to prevent collision and support future migrations.
 */

export interface RecoverySession {
  sessionId: string;
  playerId: string;
  roomId: string;
  playerName: string;
  avatar?: string;
  seatId?: string;
  seatToken?: string;
  lastKnownSequence?: number;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_ACTIVE_KEY = "bhalyam.recovery.active_session";
const STORAGE_ROOM_PREFIX = "bhalyam.recovery.room.";

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Saves the current active recovery session.
 */
export function saveActiveSession(session: RecoverySession): void {
  if (!isStorageAvailable()) return;
  try {
    const updated = {
      ...session,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(updated));
    // Also save under room prefix for room-specific recovery lookup
    localStorage.setItem(`${STORAGE_ROOM_PREFIX}${session.roomId.trim().toUpperCase()}`, JSON.stringify(updated));
  } catch {
    // QuotaExceeded or Private Browsing fallback
  }
}

/**
 * Retrieves the active recovery session if present.
 */
export function getActiveSession(): RecoverySession | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.roomId === "string" && typeof parsed.playerId === "string") {
      return parsed as RecoverySession;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieves recovery session for a specific room code.
 */
export function getRoomSession(roomId: string): RecoverySession | null {
  if (!isStorageAvailable() || !roomId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_ROOM_PREFIX}${roomId.trim().toUpperCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.playerId === "string") {
      return parsed as RecoverySession;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Updates the last known sequence number for a session.
 */
export function updateSessionSequence(roomId: string, sequence: number): void {
  const session = getRoomSession(roomId);
  if (session) {
    session.lastKnownSequence = sequence;
    saveActiveSession(session);
  }
}

/**
 * Clears the active session and room recovery record upon clean exit.
 */
export function clearActiveSession(): void {
  if (!isStorageAvailable()) return;
  try {
    const active = getActiveSession();
    if (active?.roomId) {
      localStorage.removeItem(`${STORAGE_ROOM_PREFIX}${active.roomId.trim().toUpperCase()}`);
    }
    localStorage.removeItem(STORAGE_ACTIVE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clears recovery session for a specific room.
 */
export function clearRoomSession(roomId: string): void {
  if (!isStorageAvailable() || !roomId) return;
  try {
    const normalized = roomId.trim().toUpperCase();
    localStorage.removeItem(`${STORAGE_ROOM_PREFIX}${normalized}`);
    const active = getActiveSession();
    if (active?.roomId?.toUpperCase() === normalized) {
      localStorage.removeItem(STORAGE_ACTIVE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}
