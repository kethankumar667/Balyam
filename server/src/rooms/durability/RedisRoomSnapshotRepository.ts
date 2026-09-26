import net from "node:net";
import type { RoomSnapshot, RoomSnapshotRepository } from "./types.js";
import { logger } from "../../lib/logger.js";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  prefix?: string;
  defaultTtlSec?: number;
}

/**
 * Parses a standard redis URL (e.g. redis://[:password@]host[:port]).
 */
export function parseRedisUrl(urlStr: string): RedisConfig {
  try {
    const url = new URL(urlStr);
    return {
      host: url.hostname || "localhost",
      port: Number(url.port) || 6379,
      password: url.password || undefined,
      prefix: "bhalyam:room:",
      defaultTtlSec: 7200, // 2 hours
    };
  } catch {
    return {
      host: "localhost",
      port: 6379,
      prefix: "bhalyam:room:",
      defaultTtlSec: 7200,
    };
  }
}

/**
 * Lightweight, zero-dependency Redis client implementing the RESP protocol.
 * Stores room snapshots in Redis keys with automatic TTL expiration.
 */
export class RedisRoomSnapshotRepository implements RoomSnapshotRepository {
  readonly kind = "redis" as const;
  private readonly config: RedisConfig;
  private readonly keyPrefix: string;

  constructor(redisUrlOrConfig: string | RedisConfig) {
    if (typeof redisUrlOrConfig === "string") {
      this.config = parseRedisUrl(redisUrlOrConfig);
    } else {
      this.config = redisUrlOrConfig;
    }
    this.keyPrefix = this.config.prefix ?? "bhalyam:room:";
  }

  private formatCommand(...args: string[]): string {
    let out = `*${args.length}\r\n`;
    for (const arg of args) {
      const bytes = Buffer.byteLength(arg, "utf8");
      out += `$${bytes}\r\n${arg}\r\n`;
    }
    return out;
  }

  private async executeCommand(args: string[]): Promise<string | null | string[]> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(
        { host: this.config.host, port: this.config.port },
        () => {
          if (this.config.password) {
            client.write(this.formatCommand("AUTH", this.config.password));
          }
          client.write(this.formatCommand(...args));
        }
      );

      let buffer = "";
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error(`Redis command timed out: ${args[0]}`));
      }, 3000);

      client.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        // Quick parse for basic single response
        if (buffer.startsWith("-")) {
          clearTimeout(timeout);
          client.end();
          const firstLine = buffer.slice(1, buffer.indexOf("\r\n"));
          reject(new Error(`Redis error: ${firstLine}`));
          return;
        }

        if (buffer.startsWith("+")) {
          clearTimeout(timeout);
          client.end();
          const line = buffer.slice(1, buffer.indexOf("\r\n"));
          resolve(line);
          return;
        }

        if (buffer.startsWith("$-1\r\n")) {
          clearTimeout(timeout);
          client.end();
          resolve(null);
          return;
        }

        if (buffer.startsWith("$")) {
          const firstNewline = buffer.indexOf("\r\n");
          const length = Number(buffer.slice(1, firstNewline));
          const bodyStart = firstNewline + 2;
          if (buffer.length >= bodyStart + length + 2) {
            clearTimeout(timeout);
            client.end();
            resolve(buffer.slice(bodyStart, bodyStart + length));
            return;
          }
        }

        if (buffer.startsWith("*")) {
          // Array response (e.g. for KEYS)
          const firstNewline = buffer.indexOf("\r\n");
          const count = Number(buffer.slice(1, firstNewline));
          if (count === 0) {
            clearTimeout(timeout);
            client.end();
            resolve([]);
            return;
          }
          // Simple multi-bulk check
          const lines = buffer.split("\r\n");
          const items: string[] = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i]?.startsWith("$")) {
              const val = lines[i + 1];
              if (val !== undefined) items.push(val);
              i++;
            }
          }
          if (items.length >= count) {
            clearTimeout(timeout);
            client.end();
            resolve(items);
            return;
          }
        }
      });

      client.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private getKey(code: string): string {
    return `${this.keyPrefix}${code.toUpperCase()}`;
  }

  async saveSnapshot(snapshot: RoomSnapshot): Promise<void> {
    const key = this.getKey(snapshot.code);
    const ttlMs = Math.max(1000, snapshot.expiresAt - Date.now());
    const ttlSec = Math.ceil(ttlMs / 1000);
    const payload = JSON.stringify(snapshot);

    try {
      await this.executeCommand(["SET", key, payload, "EX", String(ttlSec)]);
    } catch (err) {
      logger.error({
        message: `Failed to save Redis room snapshot for ${snapshot.code}: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
      throw err;
    }
  }

  async getSnapshot(code: string): Promise<RoomSnapshot | null> {
    const key = this.getKey(code);
    try {
      const res = await this.executeCommand(["GET", key]);
      if (typeof res !== "string") return null;
      return JSON.parse(res) as RoomSnapshot;
    } catch (err) {
      logger.error({
        message: `Failed to get Redis room snapshot for ${code}: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
      return null;
    }
  }

  async deleteSnapshot(code: string): Promise<void> {
    const key = this.getKey(code);
    try {
      await this.executeCommand(["DEL", key]);
    } catch (err) {
      logger.error({
        message: `Failed to delete Redis room snapshot for ${code}: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
    }
  }

  async listActiveSnapshots(): Promise<RoomSnapshot[]> {
    try {
      const keysRes = await this.executeCommand(["KEYS", `${this.keyPrefix}*`]);
      if (!Array.isArray(keysRes) || keysRes.length === 0) return [];

      const snapshots: RoomSnapshot[] = [];
      for (const k of keysRes) {
        try {
          const val = await this.executeCommand(["GET", k]);
          if (typeof val === "string") {
            snapshots.push(JSON.parse(val) as RoomSnapshot);
          }
        } catch {
          // ignore corrupted or expired key
        }
      }
      return snapshots;
    } catch (err) {
      logger.error({
        message: `Failed to list Redis room snapshots: ${err instanceof Error ? err.message : String(err)}`,
        module: "DURABILITY",
      });
      return [];
    }
  }

  async purgeExpiredSnapshots(): Promise<number> {
    // Redis automatically evicts expired keys through EX TTL
    return 0;
  }
}
