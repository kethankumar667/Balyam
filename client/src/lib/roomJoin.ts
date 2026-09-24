import type { RoomPublicState } from "@shared/types";
import { getSocket } from "./socket";
import { useRoomStore } from "../store/roomStore";
import { currentAccessToken, currentAccountKind } from "../store/authStore";
import { resolveRoomCredential } from "./playerIdentity";
import { useCosmeticsStore } from "../store/cosmeticsStore";
import { getPublicPresentationLoadout } from "./cosmeticsResolver";
import { normalizeRoomCode, isCompleteRoomCode } from "./roomCode";
import { recoveryManager } from "../core/recovery/RecoveryManager";

/**
 * Join a room by its code from anywhere in the app — the "Join" button on a
 * room shared into a Mandali chat.
 *
 * This is the same emit the Join-a-room dialog makes (credential, seat
 * bookkeeping, cosmetics), minus the dialog. The caller navigates to
 * `/room/<code>` on success, exactly as the dialog does.
 *
 * Two things the dialog never had to worry about, because it can only be
 * opened from outside a room:
 *   - the player may already be seated in a DIFFERENT room. The server keeps
 *     one room per socket and does not remove the old seat, so joining a
 *     second room without leaving the first would strand a ghost seat in the
 *     first. We leave it properly first.
 *   - the player may already be seated in THIS room, in which case there is
 *     nothing to join — the caller just navigates.
 */

export type RoomJoinFailure = "FULL" | "STARTED" | "NOT_FOUND" | "OTHER";

export type RoomJoinResult =
  | { ok: true; code: string }
  | { ok: false; reason: RoomJoinFailure; error: string };

const JOIN_FAILURE_COPY: Record<RoomJoinFailure, string> = {
  FULL: "That room just filled up — someone took the last seat.",
  STARTED: "That match started while you were on your way.",
  NOT_FOUND: "This room has closed.",
  OTHER: "",
};

/** What to tell someone whose join lost a race, in words that say what happened. */
export function joinFailureMessage(failure: { reason: RoomJoinFailure; error: string }): string {
  return JOIN_FAILURE_COPY[failure.reason] || failure.error;
}

type JoinAck = { ok: boolean; playerId?: string; seatToken?: string; state?: RoomPublicState; error?: string };

/** Generous: the target is a sleeping server waking up, and a false "failed" would make someone take two seats. */
const JOIN_TIMEOUT_MS = 20_000;
const LEAVE_TIMEOUT_MS = 3_000;
const NAME_MAX = 20;

/** Rooms with a join already in flight, so a double tap can never take two seats. */
const inFlight = new Set<string>();

/** The server answers in plain words; map them to something the UI can branch on. */
export function classifyJoinError(error: string): RoomJoinFailure {
  const text = error.toLowerCase();
  if (text.includes("full")) return "FULL";
  if (text.includes("in progress") || text.includes("already started")) return "STARTED";
  if (text.includes("not found") || text.includes("no longer")) return "NOT_FOUND";
  return "OTHER";
}

function fail(error: string): RoomJoinResult {
  return { ok: false, reason: classifyJoinError(error), error };
}

function leaveCurrentRoom(): Promise<void> {
  return new Promise((resolve) => {
    recoveryManager.detachRoom();
    getSocket()
      .timeout(LEAVE_TIMEOUT_MS)
      .emit("room:leave", () => {
        useRoomStore.getState().reset();
        resolve();
      });
  });
}

export async function joinRoomByCode(rawCode: string): Promise<RoomJoinResult> {
  const code = normalizeRoomCode(rawCode);
  if (!isCompleteRoomCode(code)) return fail("That does not look like a room code.");

  const store = useRoomStore.getState();
  if (store.roomState?.code === code) return { ok: true, code };

  if (inFlight.has(code)) return fail("Already joining — one moment.");
  inFlight.add(code);
  try {
    if (store.roomState && store.roomState.code !== code) await leaveCurrentRoom();

    const credential = await resolveRoomCredential();
    if (!credential.ok) return fail(credential.error);

    const { playerName, avatarId, setPlayerId, rememberSeat, seatFor } = useRoomStore.getState();
    const name = playerName.trim().slice(0, NAME_MAX) || "Player";

    const ack = await new Promise<JoinAck | null>((resolve) => {
      const timer = window.setTimeout(() => resolve(null), JOIN_TIMEOUT_MS);
      getSocket().emit(
        "room:join",
        {
          name,
          code,
          avatar: avatarId ?? undefined,
          cosmetics: getPublicPresentationLoadout(useCosmeticsStore.getState().resolved),
          accountKind: currentAccountKind(),
          accessToken: credential.accessToken ?? currentAccessToken(),
          guestToken: credential.guestToken,
          ...(seatFor(code) ?? {}),
        },
        (res: JoinAck) => {
          window.clearTimeout(timer);
          resolve(res);
        }
      );
    });

    if (!ack) return fail("The server is taking a while to answer. Try again in a moment.");
    if (!ack.ok) return fail(ack.error ?? "Could not join that room.");

    if (ack.state) useRoomStore.getState().setRoomState(ack.state);
    if (ack.playerId) setPlayerId(ack.playerId);
    if (ack.playerId && ack.seatToken) rememberSeat(code, ack.playerId, ack.seatToken);
    return { ok: true, code };
  } finally {
    inFlight.delete(code);
  }
}
