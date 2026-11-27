import { describe, it, expect } from "vitest";
import type { GameKind } from "@shared/types.js";
import { GangRepository } from "../GangRepository.js";
import { GangService } from "../GangService.js";

/**
 * Who is around, as the people in a Gang see it.
 *
 * Presence is worked out from two live facts, never stored: is this person
 * connected right now, and are they seated in a game that is under way. Online,
 * in a game, or not here. It is told to the group as it changes, so the dots in
 * the People list follow what is actually happening instead of every member
 * being "online" forever.
 */

const OWNER = "p_owner";
const FRIEND = "p_friend";
const PAL = "p_pal";

interface Sent {
  room: string;
  event: string;
  payload: any;
}

function fakeIo() {
  const sent: Sent[] = [];
  const io = { to: (room: string) => ({ emit: (event: string, payload: unknown) => sent.push({ room, event, payload }) }) };
  return { io: io as never, sent };
}

/** What the rest of the server would say: who has a live connection, who is seated in a running game. */
function fakeSources() {
  const connected = new Set<string>();
  const playing = new Map<string, GameKind>();
  return {
    connected,
    playing,
    sources: { isConnected: (id: string) => connected.has(id), activeGames: () => playing as ReadonlyMap<string, GameKind> },
  };
}

async function buildGroup() {
  const repository = new GangRepository();
  const socket = fakeIo();
  const world = fakeSources();
  const service = new GangService(repository, undefined as never, socket.io);
  service.setPresenceSources(world.sources);
  const created = await service.createGang(OWNER, "Owner", "avatar_1", {
    name: "Presence Test", handle: "presence-test", description: "d", visibility: "PUBLIC",
  });
  if (!created.success || !created.gang) throw new Error("test setup: createGang failed");
  const gangId = created.gang.id;
  for (const [id, name] of [[FRIEND, "Friend"], [PAL, "Pal"]] as const) {
    expect((await service.applyToGang(gangId, id, name, "avatar_2")).success).toBe(true);
  }
  socket.sent.length = 0;
  return { service, socket, world, gangId };
}

const presenceOf = async (service: GangService, gangId: string, playerId: string) =>
  (await service.getMembers(gangId)).find((m) => m.playerId === playerId);

describe("member presence", () => {
  it("is online for someone connected, and not here for someone who is not", async () => {
    const { service, world, gangId } = await buildGroup();
    world.connected.add(OWNER);

    expect((await presenceOf(service, gangId, OWNER))?.presence).toBe("online");
    expect((await presenceOf(service, gangId, FRIEND))?.presence).toBe("offline");
  });

  it("is in-game, and names the game, for someone seated in a running game", async () => {
    const { service, world, gangId } = await buildGroup();
    world.connected.add(FRIEND);
    world.playing.set(FRIEND, "ludo");

    const friend = await presenceOf(service, gangId, FRIEND);
    expect(friend?.presence).toBe("in-game");
    expect(friend?.activeGame).toBe("ludo");
  });

  it("counts a seated player as in-game even if no Gang socket is open on the game page", async () => {
    const { service, world, gangId } = await buildGroup();
    world.playing.set(PAL, "rummy");

    expect((await presenceOf(service, gangId, PAL))?.presence).toBe("in-game");
  });

  it("does not leave a game name on someone who is not playing", async () => {
    const { service, world, gangId } = await buildGroup();
    world.connected.add(FRIEND);

    expect((await presenceOf(service, gangId, FRIEND))?.activeGame).toBeUndefined();
  });
});

describe("telling the group when presence changes", () => {
  it("tells the Gang when someone comes online", async () => {
    const { service, socket, world, gangId } = await buildGroup();
    world.connected.add(FRIEND);

    await service.refreshPresence([FRIEND]);

    expect(socket.sent).toEqual([
      { room: `gang:${gangId}`, event: "gang:presence:changed", payload: { gangId, member: expect.objectContaining({ playerId: FRIEND, presence: "online" }) } },
    ]);
  });

  it("says nothing when nothing changed", async () => {
    const { service, socket, world } = await buildGroup();
    world.connected.add(FRIEND);

    await service.refreshPresence([FRIEND]);
    socket.sent.length = 0;
    await service.refreshPresence([FRIEND]);

    expect(socket.sent).toEqual([]);
  });

  it("tells the group when someone starts a game, and which one", async () => {
    const { service, socket, world, gangId } = await buildGroup();
    world.connected.add(FRIEND);
    await service.refreshPresence([FRIEND]);
    socket.sent.length = 0;

    world.playing.set(FRIEND, "uno");
    await service.refreshPresence([FRIEND]);

    expect(socket.sent).toEqual([
      { room: `gang:${gangId}`, event: "gang:presence:changed", payload: { gangId, member: expect.objectContaining({ playerId: FRIEND, presence: "in-game", activeGame: "uno" }) } },
    ]);
  });

  it("tells the group when someone goes offline", async () => {
    const { service, socket, world, gangId } = await buildGroup();
    world.connected.add(FRIEND);
    await service.refreshPresence([FRIEND]);
    socket.sent.length = 0;

    world.connected.delete(FRIEND);
    await service.refreshPresence([FRIEND]);

    expect(socket.sent).toEqual([
      { room: `gang:${gangId}`, event: "gang:presence:changed", payload: { gangId, member: expect.objectContaining({ playerId: FRIEND, presence: "offline" }) } },
    ]);
  });

  it("does not announce someone who was never seen online as having gone offline", async () => {
    const { service, socket } = await buildGroup();

    await service.refreshPresence([PAL]);

    expect(socket.sent).toEqual([]);
  });
});
