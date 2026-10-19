import { describe, it, expect } from "vitest";
import type { GameKind } from "@shared/types.js";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService, AROUND_NOW_MAX } from "../MandaliService.js";

/**
 * "Who's around", as the HOME page sees it: everyone in any of my Mandalis who is
 * here right now, in one list.
 *
 * It reuses the live presence the Mandali screens already show, so the two can
 * never disagree. The privacy shape is the point of most of these tests: only
 * people I share a Mandali with, never myself, never anyone who is not here, and
 * nothing that was not already visible to me inside that Mandali.
 */

const OWNER = "p_owner";
const FRIEND = "p_friend";
const PAL = "p_pal";
const LONER = "p_loner";

function fakeSources() {
  const connected = new Set<string>();
  const playing = new Map<string, GameKind>();
  const watch = new Map<string, string>();
  return {
    connected,
    playing,
    watch,
    sources: {
      isConnected: (id: string) => connected.has(id),
      activeGames: () => playing as ReadonlyMap<string, GameKind>,
      watchRooms: () => watch as ReadonlyMap<string, string>,
    },
  };
}

let handleCounter = 0;

async function newMandali(service: MandaliService, ownerId: string, joiners: readonly [string, string][]) {
  handleCounter += 1;
  const created = await service.createMandali(ownerId, "Owner", "avatar_1", {
    name: `Around ${handleCounter}`,
    handle: `around-${handleCounter}`,
    description: "d",
    visibility: "PUBLIC",
  });
  if (!created.success || !created.mandali) throw new Error("test setup: createMandali failed");
  for (const [id, name] of joiners) {
    expect((await service.applyToMandali(created.mandali.id, id, name, "avatar_2")).success).toBe(true);
  }
  return created.mandali.id;
}

function build() {
  const world = fakeSources();
  const service = new MandaliService(new MandaliRepository(), undefined as never);
  service.setPresenceSources(world.sources);
  return { service, world };
}

describe("getAroundNow", () => {
  it("lists friends who are here, with their presence", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"], [PAL, "Pal"]]);
    world.connected.add(FRIEND);

    const around = await service.getAroundNow(OWNER);

    expect(around.map((p) => p.playerId)).toEqual([FRIEND]);
    expect(around[0]).toMatchObject({ displayName: "Friend", presence: "online" });
  });

  it("never lists the person asking", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"]]);
    world.connected.add(OWNER);
    world.connected.add(FRIEND);

    const around = await service.getAroundNow(OWNER);

    expect(around.map((p) => p.playerId)).not.toContain(OWNER);
  });

  it("leaves out anyone who is not here", async () => {
    const { service } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"], [PAL, "Pal"]]);

    expect(await service.getAroundNow(OWNER)).toEqual([]);
  });

  it("says what a friend is playing, and offers a watch code only when one exists", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"], [PAL, "Pal"]]);
    world.playing.set(FRIEND, "ludo");
    world.watch.set(FRIEND, "ABC234");
    world.playing.set(PAL, "rummy");

    const around = await service.getAroundNow(OWNER);
    const friend = around.find((p) => p.playerId === FRIEND);
    const pal = around.find((p) => p.playerId === PAL);

    expect(friend).toMatchObject({ presence: "in-game", activeGame: "ludo", watchCode: "ABC234" });
    expect(pal).toMatchObject({ presence: "in-game", activeGame: "rummy" });
    expect(pal?.watchCode).toBeUndefined();
  });

  it("lists a friend once even when they share two Mandalis with me", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"]]);
    await newMandali(service, OWNER, [[FRIEND, "Friend"]]);
    world.connected.add(FRIEND);

    const around = await service.getAroundNow(OWNER);

    expect(around.filter((p) => p.playerId === FRIEND)).toHaveLength(1);
  });

  it("shows nobody from a Mandali I am not in", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"]]);
    await newMandali(service, LONER, [[PAL, "Pal"]]);
    world.connected.add(FRIEND);
    world.connected.add(PAL);

    const around = await service.getAroundNow(OWNER);

    expect(around.map((p) => p.playerId)).toEqual([FRIEND]);
  });

  it("is empty for someone who belongs to no Mandali", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"]]);
    world.connected.add(FRIEND);

    expect(await service.getAroundNow("p_nobody")).toEqual([]);
  });

  it("puts people who are free to talk before people mid-match", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"], [PAL, "Pal"]]);
    world.playing.set(FRIEND, "uno");
    world.connected.add(PAL);

    const around = await service.getAroundNow(OWNER);

    expect(around.map((p) => p.playerId)).toEqual([PAL, FRIEND]);
  });

  it("returns only what the home page needs, never roles or scores", async () => {
    const { service, world } = build();
    await newMandali(service, OWNER, [[FRIEND, "Friend"]]);
    world.connected.add(FRIEND);

    const [person] = await service.getAroundNow(OWNER);

    expect(Object.keys(person).sort()).toEqual(["avatar", "displayName", "playerId", "presence"]);
  });

  it("stops at the cap, so the page never receives a crowd", async () => {
    const { service, world } = build();
    const joiners: [string, string][] = Array.from({ length: AROUND_NOW_MAX + 5 }, (_, i) => [`p_f${i}`, `F${i}`]);
    await newMandali(service, OWNER, joiners);
    joiners.forEach(([id]) => world.connected.add(id));

    expect(await service.getAroundNow(OWNER)).toHaveLength(AROUND_NOW_MAX);
  });
});
