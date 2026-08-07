import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomManager } from "../RoomManager.js";
import { SOUND_RATE_LIMIT, SOUNDBOARD_CLIPS } from "@shared/soundboard.js";

/**
 * Soundboard relay.
 *
 * The interesting half of this feature is the rate limit, not the broadcast.
 * A soundboard clip plays over every player's game whether they are looking
 * at the screen or not, so an unthrottled button is a griefing tool that
 * ships to all ten games at once. These tests pin the budget so a later
 * refactor cannot quietly widen it.
 */

interface Emitted {
  room: string;
  event: string;
  payload: Record<string, unknown>;
}

function makeHarness() {
  const emitted: Emitted[] = [];
  const sockets = new Map<string, { join: (c: string) => void }>();
  const io = {
    sockets: { sockets },
    to(code: string) {
      return {
        emit(event: string, payload: Record<string, unknown>) {
          emitted.push({ room: code, event, payload });
        },
      };
    },
  };
  const addSocket = (id: string) => sockets.set(id, { join: () => {} });
  addSocket("sock_host");
  addSocket("sock_guest");
  // The manager only ever touches io.to().emit and io.sockets.sockets here.
  const rooms = new RoomManager(io as never);
  const { code, playerId: hostId } = rooms.createRoom("sock_host", "Host", "rps");
  const joined = rooms.joinRoom("sock_guest", "Guest", code);
  const guestId = joined.ok ? joined.playerId : "";
  const sounds = () => emitted.filter((e) => e.event === "room:sound");
  return { rooms, code, hostId, guestId, emitted, sounds };
}

const CLIP = SOUNDBOARD_CLIPS[0].id;
const OTHER_CLIP = SOUNDBOARD_CLIPS[1].id;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-07T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("soundboard relay", () => {
  it("broadcasts a valid clip to the whole room, attributed to the sender", () => {
    const h = makeHarness();
    h.rooms.sendSound("sock_host", CLIP);

    expect(h.sounds()).toHaveLength(1);
    const { room, payload } = h.sounds()[0];
    expect(room).toBe(h.code);
    expect(payload.clipId).toBe(CLIP);
    // Attribution is the main social control on this channel — an anonymous
    // airhorn cannot be moderated by the table.
    expect(payload.fromPlayerId).toBe(h.hostId);
    expect(payload.targetPlayerId).toBeUndefined();
  });

  it("drops a clip id that is not in the shared catalogue", () => {
    const h = makeHarness();
    h.rooms.sendSound("sock_host", "not_a_real_clip");
    h.rooms.sendSound("sock_host", "");
    expect(h.sounds()).toHaveLength(0);
  });

  it("ignores a socket that is not in a room", () => {
    const h = makeHarness();
    h.rooms.sendSound("sock_nobody", CLIP);
    expect(h.sounds()).toHaveLength(0);
  });

  it("keeps a valid target and strips an unknown one", () => {
    const h = makeHarness();
    h.rooms.sendSound("sock_host", CLIP, h.guestId);
    expect(h.sounds()[0].payload.targetPlayerId).toBe(h.guestId);

    h.rooms.sendSound("sock_host", OTHER_CLIP, "p_does_not_exist");
    // A target outside the room must not survive into the broadcast, or
    // clients would try to animate at a seat that isn't there.
    expect(h.sounds()[1].payload.targetPlayerId).toBeUndefined();
  });

  it("enforces the shared rate budget exactly", () => {
    const h = makeHarness();
    for (let i = 0; i < SOUND_RATE_LIMIT.max + 4; i++) {
      h.rooms.sendSound("sock_host", CLIP);
    }
    expect(h.sounds()).toHaveLength(SOUND_RATE_LIMIT.max);
  });

  it("lets the budget refill once the window passes", () => {
    const h = makeHarness();
    for (let i = 0; i < SOUND_RATE_LIMIT.max; i++) h.rooms.sendSound("sock_host", CLIP);
    expect(h.sounds()).toHaveLength(SOUND_RATE_LIMIT.max);

    h.rooms.sendSound("sock_host", CLIP);
    expect(h.sounds()).toHaveLength(SOUND_RATE_LIMIT.max);

    vi.setSystemTime(Date.now() + SOUND_RATE_LIMIT.windowMs + 1);
    h.rooms.sendSound("sock_host", CLIP);
    expect(h.sounds()).toHaveLength(SOUND_RATE_LIMIT.max + 1);
  });

  it("budgets each player separately", () => {
    const h = makeHarness();
    for (let i = 0; i < SOUND_RATE_LIMIT.max + 2; i++) h.rooms.sendSound("sock_host", CLIP);
    expect(h.sounds()).toHaveLength(SOUND_RATE_LIMIT.max);

    // One player exhausting their budget must not silence everyone else.
    h.rooms.sendSound("sock_guest", CLIP);
    expect(h.sounds()).toHaveLength(SOUND_RATE_LIMIT.max + 1);
    expect(h.sounds().at(-1)?.payload.fromPlayerId).toBe(h.guestId);
  });

  it("does not spend the sound budget on emoji reactions", () => {
    const h = makeHarness();
    // The two channels are separate events with separate budgets. If they
    // shared one bucket, a chatty emoji user would lose their sounds.
    for (let i = 0; i < 5; i++) h.rooms.sendReaction("sock_host", "👍");
    h.rooms.sendSound("sock_host", CLIP);
    expect(h.sounds()).toHaveLength(1);
  });
});
