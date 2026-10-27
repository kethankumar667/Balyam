import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initialiseRoomSnapshotStore, setRoomSnapshotStore, roomSnapshotStoreStatus } from "../durability/index.js";
import { FileRoomSnapshotRepository } from "../durability/FileRoomSnapshotRepository.js";

const directories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  setRoomSnapshotStore(null);
  for (const directory of directories.splice(0)) await fs.rm(directory, { recursive: true, force: true });
});

describe("production room snapshot configuration", () => {
  function production() {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ROOM_SNAPSHOT_STORE", "");
    vi.stubEnv("ROOM_SNAPSHOT_DIR", "");
    vi.stubEnv("ROOM_REDIS_URL", "");
    vi.stubEnv("REDIS_URL", "");
  }

  it("refuses implicit local storage in production", async () => {
    production();
    await expect(initialiseRoomSnapshotStore()).rejects.toThrow("ROOM_SNAPSHOT_DIR");
  });

  it("refuses memory and unknown drivers in production", async () => {
    production();
    vi.stubEnv("ROOM_SNAPSHOT_STORE", "memory");
    await expect(initialiseRoomSnapshotStore()).rejects.toThrow("memory");
    vi.stubEnv("ROOM_SNAPSHOT_STORE", "typo");
    await expect(initialiseRoomSnapshotStore()).rejects.toThrow("typo");
  });

  it("requires an absolute, already mounted directory", async () => {
    production();
    vi.stubEnv("ROOM_SNAPSHOT_DIR", "relative-snapshots");
    await expect(initialiseRoomSnapshotStore()).rejects.toThrow("absolute");
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "bhalyam-snapshot-config-"));
    directories.push(root);
    vi.stubEnv("ROOM_SNAPSHOT_DIR", path.join(root, "missing-mount"));
    await expect(initialiseRoomSnapshotStore()).rejects.toThrow();
    await expect(fs.stat(path.join(root, "missing-mount"))).rejects.toThrow();
  });

  it("probes mounted storage and reports a later outage rather than an empty success", async () => {
    production();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "bhalyam-snapshot-config-"));
    directories.push(root);
    vi.stubEnv("ROOM_SNAPSHOT_DIR", root);
    const store = await initialiseRoomSnapshotStore();
    expect(store).toBeInstanceOf(FileRoomSnapshotRepository);
    expect(roomSnapshotStoreStatus().durable).toBe(true);
    const file = new FileRoomSnapshotRepository(root, true);
    await file.ping();
    expect(await fs.readdir(root)).toEqual([]);
    await fs.rm(root, { recursive: true });
    await expect(file.ping()).rejects.toThrow();
    await expect(file.listActiveSnapshots()).rejects.toThrow();
    await fs.mkdir(root);
    await expect(file.ping()).resolves.toBeUndefined();
  });

  it("does not claim the implicit development directory is durable hosting storage", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ROOM_SNAPSHOT_STORE", "");
    vi.stubEnv("ROOM_SNAPSHOT_DIR", "");
    vi.stubEnv("ROOM_REDIS_URL", "");
    vi.stubEnv("REDIS_URL", "");
    setRoomSnapshotStore(new FileRoomSnapshotRepository());
    expect(roomSnapshotStoreStatus().durable).toBe(false);
  });
});
