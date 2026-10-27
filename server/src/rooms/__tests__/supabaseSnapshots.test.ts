import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseRoomSnapshotRepository } from "../durability/SupabaseRoomSnapshotRepository.js";
import { initialiseRoomSnapshotStore, pingRoomSnapshotStore, roomSnapshotStoreStatus, setRoomSnapshotStore } from "../durability/index.js";
import type { RoomSnapshot } from "../durability/types.js";
import { InMemoryRoomSnapshotRepository } from "../durability/InMemoryRoomSnapshotRepository.js";
import { RoomManager } from "../RoomManager.js";
import { mintSeatToken } from "../../lib/seatToken.js";
import { createRoomAs, joinRoomAs, makeIo } from "./roomTestKit.js";

const config = { url: "http://snapshot.test", serviceKey: "test-service-only", timeoutMs: 1000 };
const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const repo = () => new SupabaseRoomSnapshotRepository(config);

async function fixture(): Promise<RoomSnapshot> {
  const memory = new InMemoryRoomSnapshotRepository();
  const manager = new RoomManager(makeIo(), undefined, undefined, memory);
  const created = createRoomAs(manager, "host", "Alice", "rps", "member", "alice");
  await joinRoomAs(manager, "other", "Bob", created.code, "member", "bob");
  manager.setReady("host", true);
  manager.setReady("other", true);
  manager.startGame("host");
  manager.applyMove("host", "choose", { choice: "rock" });
  manager.applyMove("other", "choose", { choice: "scissors" });
  await manager.flushSnapshots();
  return (await memory.getSnapshot(created.code))!;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  setRoomSnapshotStore(null);
});

describe("Supabase room snapshots over PostgREST", () => {
  it("writes the complete private state and restores seats and engine state through a new repository", async () => {
    const snapshot = {
      ...await fixture(),
      entryStakeCoins: 100,
      committedCostPerSeat: "100",
      committedTotalPot: "200",
    };
    vi.stubGlobal("fetch", fetchMock.mockReset());
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
    await repo().saveSnapshot(snapshot);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/room_snapshots?on_conflict=code");
    const headers = request!.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${config.serviceKey}`);
    expect(JSON.parse(String(request!.body))).toEqual([{
      code: snapshot.code, snapshot, saved_at: snapshot.savedAt, expires_at: snapshot.expiresAt,
    }]);

    fetchMock.mockImplementation(async (input, init) => {
      if (init?.method === "POST") return new Response(null, { status: 201 });
      return respond(String(input).includes("code=gt.") ? [] : [{ code: snapshot.code, snapshot }]);
    });
    const restarted = new RoomManager(makeIo(), undefined, undefined, repo());
    expect(await restarted.hydrateSnapshots()).toBe(1);
    expect(restarted.getRoomStateByCode(snapshot.code)).toMatchObject({ phase: "playing", entryStakeCoins: 100, players: expect.any(Array) });
    expect((await restarted.getSnapshotRepository().getSnapshot(snapshot.code))?.engineState).toEqual(snapshot.engineState);
    for (const [index, player] of snapshot.players.entries()) {
      expect((await restarted.joinRoom(`new-${index}`, player.name, snapshot.code, player.id,
        mintSeatToken(snapshot.code, player.id), undefined, "member", player.identityId)).ok).toBe(true);
    }
    restarted.applyMove("new-0", "choose", { choice: "rock" });
    restarted.applyMove("new-1", "choose", { choice: "scissors" });
    await restarted.flushSnapshots();
    const savedBodies = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init!.body)));
    expect(savedBodies.at(-1)[0].snapshot.engineState).not.toEqual(snapshot.engineState);
    expect(savedBodies.at(-1)[0].snapshot).toMatchObject({
      committedCostPerSeat: "100", committedTotalPot: "200", currentMatchId: snapshot.currentMatchId,
    });
  });

  it("continues keyset pagination even if PostgREST caps a page below the requested limit", async () => {
    const snapshot = await fixture();
    vi.stubGlobal("fetch", fetchMock.mockReset()
      .mockResolvedValueOnce(respond([{ code: "AAAAAA", snapshot: { ...snapshot, code: "AAAAAA" } }]))
      .mockResolvedValueOnce(respond([{ code: "BBBBBB", snapshot: { ...snapshot, code: "BBBBBB" } }]))
      .mockResolvedValueOnce(respond([])));
    expect((await repo().listActiveSnapshots()).map((s) => s.code)).toEqual(["AAAAAA", "BBBBBB"]);
    expect(String(fetchMock.mock.calls[1]![0])).toContain("code=gt.AAAAAA");
    expect(String(fetchMock.mock.calls[2]![0])).toContain("code=gt.BBBBBB");
  });

  it("filters expired reads, normalizes codes, deletes specifically and purges atomically with an exact count", async () => {
    vi.stubGlobal("fetch", fetchMock.mockReset()
      .mockResolvedValueOnce(respond([]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(respond(3)));
    expect(await repo().getSnapshot("abc123")).toBeNull();
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/code=eq.ABC123.*expires_at=gte\.\d+/);
    await repo().deleteSnapshot("abc123");
    expect(String(fetchMock.mock.calls[1]![0])).toContain("code=eq.ABC123");
    expect(await repo().purgeExpiredSnapshots(60_000)).toBe(3);
    expect(JSON.parse(String(fetchMock.mock.calls[2]![1]!.body))).toMatchObject({ p_max_age_ms: 60_000 });
  });

  it("surfaces read, write, delete, purge and readiness failures without successful empty fallbacks", async () => {
    const snapshot = await fixture();
    vi.stubGlobal("fetch", fetchMock.mockReset().mockImplementation(async () => respond({ message: "unavailable" }, 503)));
    const repository = repo();
    for (const action of [
      () => repository.saveSnapshot(snapshot), () => repository.getSnapshot(snapshot.code),
      () => repository.listActiveSnapshots(), () => repository.deleteSnapshot(snapshot.code),
      () => repository.purgeExpiredSnapshots(), () => repository.ping(),
    ]) await expect(action()).rejects.toThrow("503");
    fetchMock.mockResolvedValueOnce(respond(false));
    await expect(repository.ping()).rejects.toThrow("probe");
  });

  it("fails a stalled request using the existing HTTP deadline", async () => {
    vi.stubGlobal("fetch", fetchMock.mockReset().mockImplementation((_input, init) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("snapshot HTTP deadline")), { once: true });
    })));
    const repository = new SupabaseRoomSnapshotRepository({ ...config, timeoutMs: 20 });
    await expect(repository.getSnapshot("ABC123")).rejects.toThrow("deadline");
  });
});

describe("explicit Supabase snapshot configuration", () => {
  it("requires server credentials and never falls back to local files", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ROOM_SNAPSHOT_STORE", "supabase");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    await expect(initialiseRoomSnapshotStore()).rejects.toThrow("Supabase");
  });

  it("probes at boot, overrides leftover file/Redis settings and exposes later readiness failures", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ROOM_SNAPSHOT_STORE", "supabase");
    vi.stubEnv("SUPABASE_URL", config.url);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", config.serviceKey);
    vi.stubEnv("ROOM_SNAPSHOT_DIR", "/not-a-mounted-disk");
    vi.stubEnv("ROOM_REDIS_URL", "redis://not-used");
    vi.stubGlobal("fetch", fetchMock.mockReset().mockResolvedValueOnce(respond(true)));
    expect(await initialiseRoomSnapshotStore()).toBeInstanceOf(SupabaseRoomSnapshotRepository);
    expect(roomSnapshotStoreStatus()).toEqual({ durable: true, driver: "supabase" });
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/rpc/probe_room_snapshot_store");
    fetchMock.mockResolvedValueOnce(respond({ message: "offline" }, 503));
    await expect(pingRoomSnapshotStore()).rejects.toThrow();
    fetchMock.mockResolvedValueOnce(respond(true));
    await expect(pingRoomSnapshotStore()).resolves.toBeUndefined();
  });

  it("refuses boot with a missing migration instead of choosing ephemeral storage", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ROOM_SNAPSHOT_STORE", "supabase");
    vi.stubEnv("SUPABASE_URL", config.url);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", config.serviceKey);
    vi.stubGlobal("fetch", fetchMock.mockReset().mockResolvedValueOnce(respond({ message: "function missing" }, 404)));
    await expect(initialiseRoomSnapshotStore()).rejects.toThrow("404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
