import { describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import { InMemoryRoomSnapshotRepository } from "../durability/InMemoryRoomSnapshotRepository.js";
import type { RoomSnapshot } from "../durability/types.js";
import { createRoomAs, joinRoomAs, makeIo, peek } from "./roomTestKit.js";
import { DEFAULT_WORLD, WORLD_IDS, WORLD_WIN_LADDER, sanitizeWorld, worldsEarnedBy, worldsFor } from "@shared/worlds.js";
import type { ClientToServerEvents, RoomPublicState, ServerToClientEvents } from "@shared/types.js";

/**
 * A WORLD is the look of a whole table: the scene, the board's material, the props. The host picks it in the
 * lobby or during the match and everyone at the table sees it, so it is room state like the table's name. These tests
 * pin the rules that keep it honest: only the host, never on a finished table, only a world this game really has, and only a name from
 * the closed list, because the value is re-broadcast to every other player's page.
 */

function makeHarness() {
  const states: RoomPublicState[] = [];
  const io = {
    to: () => ({
      emit: (event: string, data: unknown) => {
        if (event === "room:state") states.push(JSON.parse(JSON.stringify(data)) as RoomPublicState);
      },
    }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit: () => undefined }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { rooms: new RoomManager(io), states };
}

const MEMBER_HOST = "11111111-1111-1111-1111-111111111111";
const MEMBER_GUEST = "22222222-2222-2222-2222-222222222222";

function openLudo() {
  const harness = makeHarness();
  const created = createRoomAs(harness.rooms, "host-socket", "Host", "ludo", "member", MEMBER_HOST);
  return { ...harness, code: created.code };
}

describe("the closed list of worlds", () => {
  it("has six worlds and starts every table in the classic one", () => {
    expect(WORLD_IDS).toEqual(["classic", "neon", "toy", "zen", "reef", "palace"]);
    expect(DEFAULT_WORLD).toBe("classic");
  });

  it("offers worlds to Ludo and Rummy only", () => {
    expect(worldsFor("ludo")).toEqual(WORLD_IDS);
    expect(worldsFor("rummy")).toEqual(WORLD_IDS);
    expect(worldsFor("rps")).toEqual([]);
    expect(worldsFor("uno")).toEqual([]);
  });

  it("accepts a name from the list and turns everything else into the classic world", () => {
    expect(sanitizeWorld("ludo", "palace")).toBe("palace");
    for (const bad of ["", "PALACE", " palace", "palace ", "__proto__", "constructor", "../x", 3, null, undefined, {}, ["palace"]]) {
      expect(sanitizeWorld("ludo", bad), String(bad)).toBe("classic");
    }
    expect(sanitizeWorld("rps", "palace")).toBe("classic");
  });

  it("earns a world at each rung of the win ladder, easiest first, and never the classic one", () => {
    expect(WORLD_WIN_LADDER).toEqual({ neon: 1, toy: 3, zen: 7, reef: 15, palace: 30 });
    expect(worldsEarnedBy(0)).toEqual(["classic"]);
    expect(worldsEarnedBy(1)).toEqual(["classic", "neon"]);
    expect(worldsEarnedBy(6)).toEqual(["classic", "neon", "toy"]);
    expect(worldsEarnedBy(7)).toEqual(["classic", "neon", "toy", "zen"]);
    expect(worldsEarnedBy(30)).toEqual([...WORLD_IDS]);
    expect(worldsEarnedBy(1000)).toEqual([...WORLD_IDS]);
  });

  it("treats a damaged win count as none", () => {
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) expect(worldsEarnedBy(bad), String(bad)).toEqual(["classic"]);
    expect(worldsEarnedBy(2.5)).toEqual(["classic", "neon"]);
  });
});

describe("RoomManager.setWorld", () => {
  it("starts a Ludo or Rummy table in the classic world", () => {
    const { rooms, code } = openLudo();
    expect(peek(rooms, code).world).toBe("classic");
    const rummy = createRoomAs(rooms, "r-host", "Host", "rummy", "member", MEMBER_GUEST);
    expect(peek(rooms, rummy.code).world).toBe("classic");
  });

  it("lets the host pick a world in the lobby and tells everyone", () => {
    const { rooms, states, code } = openLudo();
    const result = rooms.setWorld("host-socket", "palace");
    expect(result).toEqual({ ok: true, world: "palace" });
    expect(peek(rooms, code).world).toBe("palace");
    expect(states[states.length - 1].world).toBe("palace");
  });

  it("shows the host's world to a player who joins afterwards", () => {
    const { rooms, code } = openLudo();
    rooms.setWorld("host-socket", "reef");
    const joined = joinRoomAs(rooms, "guest-socket", "Guest", code, "member", MEMBER_GUEST);
    expect(joined.ok).toBe(true);
    if (joined.ok) expect(joined.state.world).toBe("reef");
  });

  it("refuses anyone but the host, and says it is the host's to choose", () => {
    const { rooms, code } = openLudo();
    joinRoomAs(rooms, "guest-socket", "Guest", code, "member", MEMBER_GUEST);
    const result = rooms.setWorld("guest-socket", "toy");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/host/i);
    expect(peek(rooms, code).world).toBe("classic");
  });

  it("refuses a name that is not on the list, and keeps the world it had", () => {
    const { rooms, code } = openLudo();
    rooms.setWorld("host-socket", "zen");
    for (const bad of ["lava", "", "PALACE", "__proto__", "<img src=x>", 7 as unknown as string, null as unknown as string]) {
      const result = rooms.setWorld("host-socket", bad);
      expect(result.ok, String(bad)).toBe(false);
      expect(peek(rooms, code).world, String(bad)).toBe("zen");
    }
  });

  it("lets the host change it while the match is under way, and tells everyone", () => {
    const { rooms, states, code } = openLudo();
    peek(rooms, code).phase = "playing";
    expect(rooms.setWorld("host-socket", "toy")).toEqual({ ok: true, world: "toy" });
    expect(peek(rooms, code).world).toBe("toy");
    expect(states[states.length - 1].world).toBe("toy");
    expect(rooms.setWorld("host-socket", "classic").ok).toBe(true);
    expect(peek(rooms, code).world).toBe("classic");
  });

  it("still refuses anyone but the host while the match is under way", () => {
    const { rooms, code } = openLudo();
    joinRoomAs(rooms, "guest-socket", "Guest", code, "member", MEMBER_GUEST);
    peek(rooms, code).phase = "playing";
    const result = rooms.setWorld("guest-socket", "toy");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/host/i);
    expect(peek(rooms, code).world).toBe("classic");
  });

  it("refuses once the match is over, so a finished table is left as it was", () => {
    const { rooms, code } = openLudo();
    peek(rooms, code).phase = "finished";
    const result = rooms.setWorld("host-socket", "toy");
    expect(result.ok).toBe(false);
    expect(peek(rooms, code).world).toBe("classic");
  });

  it("refuses a game that has no worlds", () => {
    const { rooms } = makeHarness();
    const rps = createRoomAs(rooms, "rps-host", "Host", "rps", "member", MEMBER_HOST);
    const result = rooms.setWorld("rps-host", "palace");
    expect(result.ok).toBe(false);
    expect(peek(rooms, rps.code).world).toBe("classic");
  });

  it("does nothing for a socket that is in no room", () => {
    const { rooms } = makeHarness();
    expect(rooms.setWorld("nobody", "toy").ok).toBe(false);
  });
});

describe("a table's world across a server restart", () => {
  const restart = async (mutate?: (snapshot: RoomSnapshot) => void) => {
    const repo = new InMemoryRoomSnapshotRepository();
    const first = new RoomManager(makeIo(), undefined, undefined, repo);
    const created = createRoomAs(first, "host-socket", "Host", "ludo", "member", MEMBER_HOST);
    first.setWorld("host-socket", "reef");
    await first.flushSnapshots();
    if (mutate) {
      const snapshot = (await repo.getSnapshot(created.code)) as RoomSnapshot;
      mutate(snapshot);
      await repo.saveSnapshot(snapshot);
    }
    const second = new RoomManager(makeIo(), undefined, undefined, repo);
    await second.hydrateSnapshots();
    return { snapshotWorld: (await repo.getSnapshot(created.code))?.world, world: second.getRoomStateByCode(created.code)?.world };
  };

  it("is saved with the room and comes back after a restart", async () => {
    const { snapshotWorld, world } = await restart();
    expect(snapshotWorld).toBe("reef");
    expect(world).toBe("reef");
  });

  it("falls back to the classic world for a snapshot written before worlds existed", async () => {
    const { world } = await restart((snapshot) => {
      delete snapshot.world;
    });
    expect(world).toBe("classic");
  });

  it("does not trust a damaged or hostile value in a stored snapshot", async () => {
    for (const bad of ["lava", "<script>", "PALACE"]) {
      const { world } = await restart((snapshot) => {
        snapshot.world = bad;
      });
      expect(world, bad).toBe("classic");
    }
  });
});
