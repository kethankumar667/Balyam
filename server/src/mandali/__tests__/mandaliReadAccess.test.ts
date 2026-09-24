import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { createMandaliRouter } from "../MandaliController.js";

/**
 * Who may read what inside a Mandali.
 *
 * What a Mandali IS (name, description, size) is public — it is the storefront
 * that lets someone decide to join. What is INSIDE it — who is in it, what it
 * says, what it spends — is for active members only. A guest, a signed-out
 * browser and a signed-in stranger all get the same answer.
 */

const MANDALI = "mandali_ludo_kings";
const MEMBER = "p_sai_kittu";

type Viewer = { playerId: string; kind: "member" | "guest" } | null;

let server: Server;
let baseUrl: string;
let channelId: string;
let viewer: Viewer = null;

beforeAll(async () => {
  const service = new MandaliService(new MandaliRepository());
  channelId = (await service.getChannels(MANDALI)).find((c) => c.type === "TEXT")!.channelId;

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (viewer) (req as unknown as { player: unknown }).player = viewer;
    next();
  });
  app.use("/api/mandali", createMandaliRouter(service));

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const privateRoutes = (): string[] => [
  `/${MANDALI}/members`,
  `/${MANDALI}/channels`,
  `/${MANDALI}/parties`,
  `/${MANDALI}/events`,
  `/${MANDALI}/memories`,
  `/${MANDALI}/coins/transfers`,
  `/${MANDALI}/coin-requests`,
  `/${MANDALI}/channels/${channelId}/messages`,
];

const get = (path: string) => fetch(`${baseUrl}/api/mandali${path}`);

const OUTSIDERS: Array<[string, Viewer]> = [
  ["a signed-out browser", null],
  ["a guest", { playerId: "guest_abc", kind: "guest" }],
  ["a signed-in member who is not in this Mandali", { playerId: "p_stranger", kind: "member" }],
];

describe("Mandali read access", () => {
  describe.each(OUTSIDERS)("%s", (_label, who) => {
    it("is refused every private route", async () => {
      viewer = who;

      for (const path of privateRoutes()) {
        const res = await get(path);
        expect({ path, status: res.status }).toEqual({ path, status: 403 });
      }
    });

    it("sees the Mandali's storefront but nothing inside it", async () => {
      viewer = who;

      const res = await get(`/${MANDALI}`);
      const body = (await res.json()) as Record<string, unknown> & { mandali: { name: string } };

      expect(res.status).toBe(200);
      expect(body.mandali.name).toBeTruthy();
      expect(body.members).toEqual([]);
      expect(body.channels).toEqual([]);
      expect(body.parties).toEqual([]);
      expect(body.memories).toEqual([]);
      expect(body.events).toEqual([]);
    });
  });

  describe("an active member", () => {
    it("can read every private route", async () => {
      viewer = { playerId: MEMBER, kind: "member" };

      for (const path of privateRoutes()) {
        const res = await get(path);
        expect({ path, status: res.status }).toEqual({ path, status: 200 });
      }
    });

    it("gets the full hub: members, channels and the rest", async () => {
      viewer = { playerId: MEMBER, kind: "member" };

      const body = (await (await get(`/${MANDALI}`)).json()) as { members: unknown[]; channels: unknown[] };

      expect(body.members.length).toBeGreaterThan(0);
      expect(body.channels.length).toBeGreaterThan(0);
    });
  });
});
