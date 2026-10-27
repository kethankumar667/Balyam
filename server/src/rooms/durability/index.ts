import type { RoomSnapshotRepository } from "./types.js";
import { InMemoryRoomSnapshotRepository } from "./InMemoryRoomSnapshotRepository.js";
import { FileRoomSnapshotRepository } from "./FileRoomSnapshotRepository.js";
import { RedisRoomSnapshotRepository } from "./RedisRoomSnapshotRepository.js";
import { logger } from "../../lib/logger.js";
import path from "node:path";

let store: RoomSnapshotRepository | null = null;
let persistentFileConfigured = false;

/**
 * Singleton accessor for the room snapshot store.
 * Defaults to InMemory if uninitialized, ensuring tests run cleanly without side effects.
 */
export function roomSnapshotStore(): RoomSnapshotRepository {
  if (!store) {
    store = new InMemoryRoomSnapshotRepository();
  }
  return store;
}

/**
 * Test seam allowing tests to inject mock or in-memory snapshot repositories.
 */
export function setRoomSnapshotStore(next: RoomSnapshotRepository | null): void {
  store = next;
  persistentFileConfigured = false;
}

/**
 * Initializes the durable room snapshot store based on environment configuration.
 *
 * Selection priority:
 * Explicit driver wins; otherwise Redis URL selects Redis, and files are the default.
 * Production files require an absolute, existing persistent mount. No driver silently falls back.
 */
export async function initialiseRoomSnapshotStore(): Promise<RoomSnapshotRepository> {
  const explicitStore = (process.env.ROOM_SNAPSHOT_STORE ?? "").trim().toLowerCase();
  const production = process.env.NODE_ENV?.trim().toLowerCase() === "production";
  persistentFileConfigured = false;
  if (explicitStore && !["file", "redis", "memory"].includes(explicitStore)) {
    throw new Error(`Unknown ROOM_SNAPSHOT_STORE: ${explicitStore}`);
  }
  if (production && explicitStore === "memory") {
    throw new Error("Refusing production room snapshots in memory; configure persistent file storage.");
  }

  if (explicitStore === "memory" || process.env.NODE_ENV === "test") {
    store = new InMemoryRoomSnapshotRepository();
    logger.info({
      message: "Room snapshot store initialized in MEMORY (ephemeral).",
      module: "DURABILITY",
    });
    return store;
  }

  const redisUrl = process.env.ROOM_REDIS_URL || process.env.REDIS_URL;
  if (explicitStore === "redis" || (!explicitStore && redisUrl)) {
    if (!redisUrl) throw new Error("ROOM_REDIS_URL is required for Redis room snapshots");
    const redis = new RedisRoomSnapshotRepository(redisUrl);
    await redis.ping();
    store = redis;
    logger.info({
      message: "Room snapshot store initialized with REDIS.",
      module: "DURABILITY",
    });
    return store;
  }

  const directory = process.env.ROOM_SNAPSHOT_DIR?.trim();
  if (production && !directory) {
    throw new Error("ROOM_SNAPSHOT_DIR must name a provisioned persistent disk in production.");
  }
  if (directory && !path.isAbsolute(directory)) {
    throw new Error("ROOM_SNAPSHOT_DIR must be an absolute path.");
  }
  const file = new FileRoomSnapshotRepository(directory, production);
  await file.initialise();
  store = file;
  persistentFileConfigured = production && !!directory;
  logger.info({
    message: `Room snapshot store initialized with ${persistentFileConfigured ? "configured persistent" : "local"} FILE storage.`,
    module: "DURABILITY",
  });
  return store;
}

export function roomSnapshotStoreStatus(): { durable: boolean; driver: "memory" | "file" | "redis" } {
  if (store instanceof RedisRoomSnapshotRepository) {
    return { durable: true, driver: "redis" };
  }
  if (store instanceof FileRoomSnapshotRepository) {
    return { durable: persistentFileConfigured, driver: "file" };
  }
  return { durable: false, driver: "memory" };
}

export async function pingRoomSnapshotStore(): Promise<void> {
  const current = roomSnapshotStore();
  if (current instanceof FileRoomSnapshotRepository || current instanceof RedisRoomSnapshotRepository) {
    await current.ping();
  }
}

export * from "./types.js";
export { InMemoryRoomSnapshotRepository } from "./InMemoryRoomSnapshotRepository.js";
export { FileRoomSnapshotRepository } from "./FileRoomSnapshotRepository.js";
export { RedisRoomSnapshotRepository } from "./RedisRoomSnapshotRepository.js";
