import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { RoomSnapshot, RoomSnapshotRepository } from "./types.js";
import { logger } from "../../lib/logger.js";

/**
 * File-backed Room Snapshot Repository.
 * Stores room snapshots on disk as atomic JSON files.
 * Survives host replacement only when storageDir is on an operator-provisioned persistent disk.
 */
export class FileRoomSnapshotRepository implements RoomSnapshotRepository {
  readonly kind = "file" as const;
  private readonly storageDir: string;
  private dirInitialized = false;

  constructor(storageDir?: string, private readonly requireExistingDirectory = false) {
    this.storageDir = storageDir ?? path.resolve(process.cwd(), ".room_snapshots");
  }

  async initialise(): Promise<void> {
    await this.ensureDir();
    await this.ping();
  }

  async ping(): Promise<void> {
    // Never create a missing production mount: that would silently write to ephemeral storage.
    const stat = await fs.stat(this.storageDir);
    if (!stat.isDirectory()) throw new Error("Room snapshot path is not a directory");
    const probe = path.join(this.storageDir, `.probe-${crypto.randomUUID()}`);
    const renamed = `${probe}.renamed`;
    try {
      await fs.writeFile(probe, "ready", { flag: "wx" });
      await fs.rename(probe, renamed);
      if (await fs.readFile(renamed, "utf8") !== "ready") throw new Error("Snapshot read-back failed");
    } finally {
      await Promise.all([probe, renamed].map(async (file) => {
        try {
          await fs.unlink(file);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }));
    }
  }

  private async ensureDir(): Promise<void> {
    if (this.dirInitialized) return;
    try {
      if (this.requireExistingDirectory) {
        if (!(await fs.stat(this.storageDir)).isDirectory()) throw new Error("Snapshot mount is not a directory");
      } else {
        await fs.mkdir(this.storageDir, { recursive: true });
      }
      this.dirInitialized = true;
    } catch (err) {
      logger.error({
        message: `Failed to create room snapshot directory ${this.storageDir}: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
      throw err;
    }
  }

  private getFilePath(code: string): string {
    const safeCode = code.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    return path.join(this.storageDir, `room_${safeCode}.json`);
  }

  async saveSnapshot(snapshot: RoomSnapshot): Promise<void> {
    await this.ensureDir();
    const finalPath = this.getFilePath(snapshot.code);
    const tempPath = `${finalPath}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;

    try {
      const payload = JSON.stringify(snapshot, null, 2);
      await fs.writeFile(tempPath, payload, "utf8");
      await fs.rename(tempPath, finalPath);
    } catch (err) {
      // Clean up orphaned temp file if rename failed
      try {
        await fs.unlink(tempPath);
      } catch {
        // ignore
      }
      logger.error({
        message: `Failed to save room snapshot for ${snapshot.code}: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
      throw err;
    }
  }

  async getSnapshot(code: string): Promise<RoomSnapshot | null> {
    await this.ensureDir();
    const filePath = this.getFilePath(code);

    try {
      const raw = await fs.readFile(filePath, "utf8");
      const snap = JSON.parse(raw) as RoomSnapshot;
      if (Date.now() > snap.expiresAt) {
        await this.deleteSnapshot(code);
        return null;
      }
      return snap;
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === "ENOENT") {
        return null;
      }
      logger.warn({
        message: `Corrupted room snapshot encountered for ${code}, discarding: ${nodeErr.message}`,
        module: "DURABILITY",
      });
      await this.deleteSnapshot(code).catch(() => {});
      return null;
    }
  }

  async deleteSnapshot(code: string): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(code);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code !== "ENOENT") {
        logger.error({
          message: `Failed to delete room snapshot ${code}: ${nodeErr.message}`,
          module: "DURABILITY",
        });
      }
    }
  }

  async listActiveSnapshots(): Promise<RoomSnapshot[]> {
    await this.ensureDir();
    const active: RoomSnapshot[] = [];
    const now = Date.now();

    try {
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (!file.startsWith("room_") || !file.endsWith(".json")) continue;
        const filePath = path.join(this.storageDir, file);
        try {
          const raw = await fs.readFile(filePath, "utf8");
          const snap = JSON.parse(raw) as RoomSnapshot;
          if (now > snap.expiresAt) {
            await fs.unlink(filePath).catch(() => {});
          } else {
            active.push(snap);
          }
        } catch {
          // If file is unparseable or transiently locked, skip
        }
      }
    } catch (err) {
      logger.error({
        message: `Failed to list room snapshots: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
      throw err;
    }

    return active;
  }

  /** Removes an orphaned `.tmp` save older than a minute (an in-flight save is far younger). */
  private async isStaleTempFile(filePath: string, now: number): Promise<boolean> {
    try {
      const { mtimeMs } = await fs.stat(filePath);
      if (now - mtimeMs < 60_000) return false;
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async purgeExpiredSnapshots(maxAgeMs?: number): Promise<number> {
    await this.ensureDir();
    let purged = 0;
    const now = Date.now();

    try {
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (file.startsWith("room_") && file.endsWith(".tmp")) {
          // A save that died between writeFile and rename leaves its temp file
          // behind; nothing else ever reads or removes it.
          if (await this.isStaleTempFile(path.join(this.storageDir, file), now)) purged++;
          continue;
        }
        if (!file.startsWith("room_") || !file.endsWith(".json")) continue;
        const filePath = path.join(this.storageDir, file);
        try {
          const raw = await fs.readFile(filePath, "utf8");
          const snap = JSON.parse(raw) as RoomSnapshot;
          const isPastTtl = now > snap.expiresAt;
          const isTooOld = maxAgeMs !== undefined && now - snap.savedAt > maxAgeMs;
          if (isPastTtl || isTooOld) {
            await fs.unlink(filePath).catch(() => {});
            purged++;
          }
        } catch {
          await fs.unlink(filePath).catch(() => {});
          purged++;
        }
      }
    } catch (err) {
      logger.error({
        message: `Error during snapshot purge: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
    }

    return purged;
  }
}
