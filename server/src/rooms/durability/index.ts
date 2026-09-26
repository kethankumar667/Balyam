import type { RoomSnapshotRepository } from "./types.js";
import { InMemoryRoomSnapshotRepository } from "./InMemoryRoomSnapshotRepository.js";
import { FileRoomSnapshotRepository } from "./FileRoomSnapshotRepository.js";
import { RedisRoomSnapshotRepository } from "./RedisRoomSnapshotRepository.js";
import { logger } from "../../lib/logger.js";

let store: RoomSnapshotRepository | null = null;

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
}

/**
 * Initializes the durable room snapshot store based on environment configuration.
 *
 * Selection priority:
 * 1. Explicit `ROOM_SNAPSHOT_STORE=memory` (or test environment) -> InMemoryRoomSnapshotRepository
 * 2. `REDIS_URL` or `ROOM_REDIS_URL` configured -> RedisRoomSnapshotRepository
 * 3. Default production / development -> FileRoomSnapshotRepository (atomic on-disk JSON cache)
 */
export async function initialiseRoomSnapshotStore(): Promise<RoomSnapshotRepository> {
  const explicitStore = (process.env.ROOM_SNAPSHOT_STORE ?? "").trim().toLowerCase();

  if (explicitStore === "memory" || process.env.NODE_ENV === "test") {
    store = new InMemoryRoomSnapshotRepository();
    logger.info({
      message: "Room snapshot store initialized in MEMORY (ephemeral).",
      module: "DURABILITY",
    });
    return store;
  }

  const redisUrl = process.env.ROOM_REDIS_URL || process.env.REDIS_URL;
  if (redisUrl) {
    try {
      store = new RedisRoomSnapshotRepository(redisUrl);
      logger.info({
        message: "Room snapshot store initialized with REDIS.",
        module: "DURABILITY",
      });
      return store;
    } catch (err) {
      logger.error({
        message: `Failed to initialize Redis room snapshot store: ${err instanceof Error ? err.message : String(err)}, falling back to File storage.`,
        module: "DURABILITY",
      });
    }
  }

  // Default to durable local file storage
  store = new FileRoomSnapshotRepository();
  logger.info({
    message: "Room snapshot store initialized with durable FILE storage (.room_snapshots).",
    module: "DURABILITY",
  });
  return store;
}

export function roomSnapshotStoreStatus(): { durable: boolean; driver: "memory" | "file" | "redis" } {
  if (store instanceof RedisRoomSnapshotRepository) {
    return { durable: true, driver: "redis" };
  }
  if (store instanceof FileRoomSnapshotRepository) {
    return { durable: true, driver: "file" };
  }
  return { durable: false, driver: "memory" };
}

export * from "./types.js";
export { InMemoryRoomSnapshotRepository } from "./InMemoryRoomSnapshotRepository.js";
export { FileRoomSnapshotRepository } from "./FileRoomSnapshotRepository.js";
export { RedisRoomSnapshotRepository } from "./RedisRoomSnapshotRepository.js";
