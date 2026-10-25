import express from "express";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCosmeticsRouter } from "../CosmeticsController.js";
import { CosmeticsService } from "../CosmeticsService.js";
import { logger } from "../../lib/logger.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";

vi.mock("../../lib/logger.js", () => ({ logger: { error: vi.fn() } }));
let server: Server | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    server = undefined;
  }
});

async function request(service: CosmeticsService) {
  const app = express();
  app.use("/api/cosmetics", createCosmeticsRouter(service));
  server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test listener");
  return (query: string) => fetch(`http://127.0.0.1:${address.port}/api/cosmetics/avatar-auras${query}`);
}

describe("public equipped avatar decorations HTTP boundary", () => {
  it("allows a passive visitor to see only the equipped aura IDs and deduplicates IDs", async () => {
    const service = new CosmeticsService({ postgrestConfig: null, economyRepository: new InMemoryEconomyRepository() });
    const read = vi.spyOn(service, "getAvatarAuras").mockResolvedValue({ one: "frame_royal_crown", two: null });
    const get = await request(service);
    const response = await get("?playerIds=one,two,one");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ auras: { one: "frame_royal_crown", two: null } });
    expect(read).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith(["one", "two"]);
  });

  it("rejects absent, malformed, repeated-query and oversized requests before any storage read", async () => {
    const service = new CosmeticsService({ postgrestConfig: null, economyRepository: new InMemoryEconomyRepository() });
    const read = vi.spyOn(service, "getAvatarAuras");
    const get = await request(service);
    for (const query of ["", "?playerIds=", "?playerIds=../private", "?playerIds=a&playerIds=b", `?playerIds=${Array(26).fill("one").join(",")}`]) {
      expect((await get(query)).status).toBe(400);
    }
    expect(read).not.toHaveBeenCalled();
  });

  it("logs storage failure and returns an explicit error without leaking its details", async () => {
    const service = new CosmeticsService({ postgrestConfig: null, economyRepository: new InMemoryEconomyRepository() });
    vi.spyOn(service, "getAvatarAuras").mockRejectedValue(new Error("storage unavailable"));
    const get = await request(service);
    const response = await get("?playerIds=one");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not load avatar decorations." });
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
