import { describe, expect, it } from "vitest";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { RedisRoomSnapshotRepository } from "../durability/RedisRoomSnapshotRepository.js";

describe("Redis snapshot readiness", () => {
  it("waits for the PING reply rather than mistaking pipelined AUTH success for readiness", async () => {
    const server = createServer((socket) => {
      let received = "";
      socket.on("data", (chunk) => {
        received += chunk.toString();
        if (received.includes("PING\r\n")) socket.end("+OK\r\n+PONG\r\n");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const repo = new RedisRoomSnapshotRepository({
        host: "127.0.0.1", port: (server.address() as AddressInfo).port, password: "local-test-only",
      });
      await expect(repo.ping()).resolves.toBeUndefined();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
