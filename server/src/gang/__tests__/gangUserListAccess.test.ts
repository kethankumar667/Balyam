import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { GangRepository } from "../GangRepository.js";
import { GangService } from "../GangService.js";
import { createGangRouter } from "../GangController.js";

/**
 * `GET /api/gang/user/:playerId` answers "which Gangs is this player in?". It used to answer anyone,
 * signed in or not, for any player id, and the list included groups hidden from search. Player ids are visible to
 * everyone at a table, so that was a way to read who belongs to which private group. A player's own list is theirs
 * alone: the caller has to BE the named player (the app itself reads its own list from `/my`).
 */

const GANG = "gang_ludo_kings";
const MEMBER = "p_sai_kittu";

type Viewer = { playerId: string; kind: "member" | "guest" } | null;

let server: Server;
let baseUrl: string;
let viewer: Viewer = null;

beforeAll(async () => {
  const service = new GangService(new GangRepository());

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (viewer) (req as unknown as { player: unknown }).player = viewer;
    next();
  });
  app.use("/api/gang", createGangRouter(service));

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const listFor = (playerId: string) => fetch(`${baseUrl}/api/gang/user/${playerId}`);

describe("GET /api/gang/user/:playerId", () => {
  it("refuses a signed-out caller", async () => {
    viewer = null;

    const res = await listFor(MEMBER);

    expect(res.status).toBe(401);
  });

  it("refuses a guest asking about someone else", async () => {
    viewer = { playerId: "guest_abc", kind: "guest" };

    const res = await listFor(MEMBER);

    expect(res.status).toBe(403);
  });

  it("refuses a signed-in member asking about another player", async () => {
    viewer = { playerId: "p_stranger", kind: "member" };

    const res = await listFor(MEMBER);

    expect(res.status).toBe(403);
  });

  it("does not reveal the list in the refusal", async () => {
    viewer = { playerId: "p_stranger", kind: "member" };

    const text = await (await listFor(MEMBER)).text();

    expect(text).not.toContain(GANG);
    expect(text).not.toContain("gangs");
  });

  it("gives a member their own list", async () => {
    viewer = { playerId: MEMBER, kind: "member" };

    const res = await listFor(MEMBER);
    const body = (await res.json()) as { success: boolean; gangs: Array<{ id: string }> };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.gangs.map((m) => m.id)).toContain(GANG);
  });

  it("matches what the member's own /my route returns", async () => {
    viewer = { playerId: MEMBER, kind: "member" };

    const mine = (await (await fetch(`${baseUrl}/api/gang/my`)).json()) as { gangs: Array<{ id: string }> };
    const byId = (await (await listFor(MEMBER)).json()) as { gangs: Array<{ id: string }> };

    expect(byId.gangs.map((m) => m.id).sort()).toEqual(mine.gangs.map((m) => m.id).sort());
  });
});
