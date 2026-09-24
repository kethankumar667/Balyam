import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { createMandaliRouter } from "../MandaliController.js";

/**
 * The owner can delete their Mandali whenever they want.
 *
 * Deleting is permanent and takes the conversation with it, so every way of
 * getting it wrong is covered: someone other than the owner, a stale screen
 * naming the wrong Mandali, a second delete, members left connected to a room
 * that no longer exists, and stale copies that keep answering after the fact.
 */

const OWNER = "p_owner";
const ADMIN = "p_admin";
const MEMBER = "p_member";
const LEFT = "p_left";
const OUTSIDER = "p_outsider";

interface Sent {
  rooms: string[];
  event: string;
  payload: unknown;
}

/** Records what the server pushes, and in what order relative to evicting sockets. */
function fakeIo() {
  const sent: Sent[] = [];
  const evicted: string[] = [];
  const order: string[] = [];
  const io = {
    to: (target: string | string[]) => ({
      emit: (event: string, payload: unknown) => {
        order.push(`emit:${event}`);
        sent.push({ rooms: Array.isArray(target) ? target : [target], event, payload });
      },
    }),
    in: (room: string) => ({
      socketsLeave: (leaving: string) => {
        order.push("leave");
        evicted.push(`${room}->${leaving}`);
      },
    }),
  };
  return { io: io as never, sent, evicted, order };
}

async function buildGroup() {
  const repository = new MandaliRepository();
  const socket = fakeIo();
  const service = new MandaliService(repository, undefined as never, socket.io);

  const created = await service.createMandali(OWNER, "Owner", "avatar_1", {
    name: "Delete Test",
    handle: "delete-test",
    description: "A group that will be deleted.",
    visibility: "PUBLIC",
  });
  if (!created.success || !created.mandali) throw new Error("test setup: createMandali failed");
  const mandaliId = created.mandali.id;
  const channelId = (await service.getChannels(mandaliId)).find((c) => c.type === "TEXT")!.channelId;

  for (const [id, name] of [
    [ADMIN, "Admin"],
    [MEMBER, "Member"],
    [LEFT, "Leaver"],
  ] as const) {
    expect((await service.applyToMandali(mandaliId, id, name, "avatar_2")).success).toBe(true);
  }
  await service.sendMessage(mandaliId, channelId, MEMBER, "Member", "avatar_2", "this will be gone");
  repository.saveMember({ ...repository.getMember(mandaliId, ADMIN)!, role: "LEADER" });
  repository.saveMember({ ...repository.getMember(mandaliId, LEFT)!, state: "LEFT" });

  socket.sent.length = 0;
  socket.order.length = 0;
  return { repository, service, socket, mandaliId, channelId };
}

describe("service.deleteMandali", () => {
  it("removes the Mandali, and frees its handle for someone else", async () => {
    const { service, mandaliId } = await buildGroup();

    const res = await service.deleteMandali(mandaliId, OWNER, "delete-test");

    expect(res).toEqual({ success: true });
    expect(await service.getMandaliById(mandaliId)).toBeUndefined();
    expect(await service.getMandaliByHandle("delete-test")).toBeUndefined();
    const reused = await service.createMandali(OUTSIDER, "New", "avatar_1", {
      name: "Reborn",
      handle: "delete-test",
      description: "Same handle again.",
      visibility: "PUBLIC",
    });
    expect(reused.success).toBe(true);
  });

  it("takes the conversation, the members and the channels with it", async () => {
    const { service, repository, mandaliId, channelId } = await buildGroup();

    await service.deleteMandali(mandaliId, OWNER, "delete-test");

    expect(await service.getMessages(channelId, 50)).toEqual([]);
    expect(repository.getMembers(mandaliId)).toEqual([]);
    expect(await service.getChannels(mandaliId)).toEqual([]);
    expect(await service.getMemberJoinedAt(mandaliId, MEMBER)).toBeNull();
    expect(await service.isActiveMember(mandaliId, MEMBER)).toBe(false);
  });

  it("drops it from every member's own list", async () => {
    const { service, mandaliId } = await buildGroup();
    expect((await service.getPlayerMandalis(MEMBER)).map((m) => m.id)).toContain(mandaliId);

    await service.deleteMandali(mandaliId, OWNER, "delete-test");

    expect((await service.getPlayerMandalis(MEMBER)).map((m) => m.id)).not.toContain(mandaliId);
    expect((await service.getPlayerMandalis(OWNER)).map((m) => m.id)).not.toContain(mandaliId);
  });

  describe("who may delete", () => {
    it.each([
      ["an admin", ADMIN],
      ["an ordinary member", MEMBER],
      ["someone who left", LEFT],
      ["a stranger", OUTSIDER],
    ])("refuses %s and leaves everything in place", async (_label, actor) => {
      const { service, mandaliId } = await buildGroup();

      const res = await service.deleteMandali(mandaliId, actor, "delete-test");

      expect(res).toMatchObject({ success: false, code: "FORBIDDEN" });
      expect(await service.getMandaliById(mandaliId)).toBeDefined();
      expect(await service.isActiveMember(mandaliId, MEMBER)).toBe(true);
    });

    it("says nothing to the members about a refused attempt", async () => {
      const { service, socket, mandaliId } = await buildGroup();

      await service.deleteMandali(mandaliId, MEMBER, "delete-test");

      expect(socket.sent).toEqual([]);
      expect(socket.evicted).toEqual([]);
    });
  });

  describe("the confirmation", () => {
    it.each([
      ["missing", ""],
      ["someone else's handle", "another-group"],
      ["only part of the handle", "delete"],
      ["the handle with extra characters", "delete-test-2"],
    ])("refuses when the handle is %s", async (_label, typed) => {
      const { service, mandaliId } = await buildGroup();

      const res = await service.deleteMandali(mandaliId, OWNER, typed);

      expect(res).toMatchObject({ success: false, code: "CONFIRMATION_MISMATCH" });
      expect(await service.getMandaliById(mandaliId)).toBeDefined();
    });

    it("accepts the handle however it was capitalised, spaced or prefixed when typed", async () => {
      const { service, mandaliId } = await buildGroup();

      const res = await service.deleteMandali(mandaliId, OWNER, "  @Delete-Test ");

      expect(res.success).toBe(true);
    });
  });

  it("reports a Mandali that does not exist, including one that was just deleted", async () => {
    const { service, mandaliId } = await buildGroup();
    await service.deleteMandali(mandaliId, OWNER, "delete-test");

    const again = await service.deleteMandali(mandaliId, OWNER, "delete-test");

    expect(again).toMatchObject({ success: false, code: "NOT_FOUND" });
  });

  it("still reports a completed delete as completed when the socket layer fails", async () => {
    const repository = new MandaliRepository();
    const service = new MandaliService(repository, undefined as never, {
      to: () => {
        throw new Error("adapter down");
      },
      in: () => ({ socketsLeave: () => undefined }),
    } as never);
    const created = await service.createMandali(OWNER, "Owner", "avatar_1", {
      name: "Flaky", handle: "flaky-delete", description: "d", visibility: "PUBLIC",
    });

    const res = await service.deleteMandali(created.mandali!.id, OWNER, "flaky-delete");

    expect(res).toEqual({ success: true });
    expect(await service.getMandaliById(created.mandali!.id)).toBeUndefined();
  });

  describe("telling the members", () => {
    it("announces the deletion to the Mandali's room and to every ACTIVE member's own room", async () => {
      const { service, socket, mandaliId } = await buildGroup();

      await service.deleteMandali(mandaliId, OWNER, "delete-test");

      const events = socket.sent.filter((s) => s.event === "mandali:deleted");
      const audience = events.flatMap((e) => e.rooms).sort();
      expect(audience).toEqual(
        [`mandali:${mandaliId}`, `user:${ADMIN}`, `user:${MEMBER}`, `user:${OWNER}`].sort(),
      );
      for (const e of events) expect(e.payload).toEqual({ mandaliId, name: "Delete Test" });
    });

    it("does not tell someone who already left, or a stranger", async () => {
      const { service, socket, mandaliId } = await buildGroup();

      await service.deleteMandali(mandaliId, OWNER, "delete-test");

      const audience = socket.sent.flatMap((s) => s.rooms);
      expect(audience).not.toContain(`user:${LEFT}`);
      expect(audience).not.toContain(`user:${OUTSIDER}`);
    });

    it("empties the Mandali's room only AFTER the announcement has gone out", async () => {
      const { service, socket, mandaliId } = await buildGroup();

      await service.deleteMandali(mandaliId, OWNER, "delete-test");

      expect(socket.evicted).toEqual([`mandali:${mandaliId}->mandali:${mandaliId}`]);
      expect(socket.order.indexOf("leave")).toBeGreaterThan(socket.order.lastIndexOf("emit:mandali:deleted"));
    });
  });
});

describe("DELETE /api/mandali/:id", () => {
  let server: Server;
  let baseUrl: string;
  let viewer: { playerId: string; kind: "member" | "guest" } | null;
  let ctx: Awaited<ReturnType<typeof buildGroup>>;

  beforeEach(async () => {
    ctx = await buildGroup();
    viewer = { playerId: OWNER, kind: "member" };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      if (viewer) (req as unknown as { player: unknown }).player = viewer;
      next();
    });
    app.use("/api/mandali", createMandaliRouter(ctx.service));
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  /** `OMIT` sends no confirmation field at all — `undefined` would just trigger the default. */
  const OMIT = Symbol("omit");
  const remove = (confirmHandle: unknown = "delete-test", id = ctx.mandaliId) =>
    fetch(`${baseUrl}/api/mandali/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(confirmHandle === OMIT ? {} : { confirmHandle }),
    });

  it("lets the owner delete it", async () => {
    const res = await remove();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(await ctx.service.getMandaliById(ctx.mandaliId)).toBeUndefined();
  });

  it("answers 401 when nobody is signed in", async () => {
    viewer = null;

    const res = await remove();

    expect(res.status).toBe(401);
    expect(await ctx.service.getMandaliById(ctx.mandaliId)).toBeDefined();
  });

  it("answers 403 for a signed-in member who is not the owner", async () => {
    viewer = { playerId: MEMBER, kind: "member" };

    const res = await remove();

    expect(res.status).toBe(403);
    expect(await ctx.service.getMandaliById(ctx.mandaliId)).toBeDefined();
  });

  it("answers 403 for a guest, even one carrying the owner's id", async () => {
    viewer = { playerId: OWNER, kind: "guest" };

    const res = await remove();

    expect(res.status).toBe(403);
    expect(await ctx.service.getMandaliById(ctx.mandaliId)).toBeDefined();
  });

  it.each([
    ["no confirmation at all", OMIT],
    ["a number", 42],
    ["an object", { $ne: null }],
    ["the wrong handle", "not-this-one"],
  ])("answers 400 with %s", async (_label, value) => {
    const res = await remove(value);

    expect(res.status).toBe(400);
    expect(await ctx.service.getMandaliById(ctx.mandaliId)).toBeDefined();
  });

  it("answers 404 for a Mandali that is not there", async () => {
    const res = await remove("delete-test", "mandali_does_not_exist");

    expect(res.status).toBe(404);
  });

  it("never takes the actor from the request body", async () => {
    viewer = { playerId: MEMBER, kind: "member" };

    const res = await fetch(`${baseUrl}/api/mandali/${ctx.mandaliId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmHandle: "delete-test", ownerId: OWNER, playerId: OWNER, actorId: OWNER }),
    });

    expect(res.status).toBe(403);
    expect(await ctx.service.getMandaliById(ctx.mandaliId)).toBeDefined();
  });
});

describe("deleting when the Mandali lives in the database", () => {
  const ROW = {
    id: "m_prod", handle: "prod-group", name: "Prod Group", emblem: "pawn_amber", description: "", rules: "",
    banner_gradient: null, language: "English", region: "All India", tags: [], visibility: "PUBLIC",
    member_count: 2, max_members: 50, level: 1, xp: 0, owner_identity_id: "acct_owner",
    edit_permission: "ADMIN", send_permission: "ALL", join_approval: false,
    created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
  };

  function durableService(rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>) {
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const client = {
      select: async (table: string) => (table === "mandalis" ? [ROW] : []),
      rpc: async (fn: string, args: Record<string, unknown>) => {
        rpcCalls.push({ fn, args });
        return rpc(fn, args);
      },
    };
    const socket = fakeIo();
    const service = new MandaliService(new MandaliRepository(client as never), undefined as never, socket.io);
    return { service, rpcCalls, socket };
  }

  const deleted = { mandali_id: "m_prod", name: "Prod Group", member_ids: ["acct_owner", "acct_b"] };

  it("lets the database decide who the owner is, passing only the verified caller", async () => {
    const { service, rpcCalls } = durableService(async () => deleted);

    const res = await service.deleteMandali("m_prod", "acct_owner", "prod-group");

    expect(res).toEqual({ success: true });
    expect(rpcCalls).toEqual([
      { fn: "delete_mandali", args: { p_mandali_id: "m_prod", p_actor_identity_id: "acct_owner" } },
    ]);
  });

  it("tells exactly the members the database says it deleted, not a stale list", async () => {
    const { service, socket } = durableService(async () => deleted);

    await service.deleteMandali("m_prod", "acct_owner", "prod-group");

    const audience = socket.sent.filter((s) => s.event === "mandali:deleted").flatMap((s) => s.rooms).sort();
    expect(audience).toEqual(["mandali:m_prod", "user:acct_b", "user:acct_owner"].sort());
  });

  it("refuses a non-owner before the database is even asked", async () => {
    const { service, rpcCalls, socket } = durableService(async () => deleted);

    const res = await service.deleteMandali("m_prod", "acct_b", "prod-group");

    expect(res).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(rpcCalls).toEqual([]);
    expect(socket.sent).toEqual([]);
  });

  it("still honours the database's own refusal when ownership changed a moment ago", async () => {
    // The service read the owner as acct_owner; by the time the function ran, someone else was.
    const { service, socket } = durableService(async () => {
      throw new Error('PostgREST 400: {"message":"FORBIDDEN: caller is not the current owner"}');
    });

    const res = await service.deleteMandali("m_prod", "acct_owner", "prod-group");

    expect(res).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(socket.sent).toEqual([]);
  });

  it("does not call the database at all when the typed handle is wrong", async () => {
    const { service, rpcCalls } = durableService(async () => ({}));

    const res = await service.deleteMandali("m_prod", "acct_owner", "something-else");

    expect(res).toMatchObject({ success: false, code: "CONFIRMATION_MISMATCH" });
    expect(rpcCalls).toEqual([]);
  });

  it("reports a failure of the database itself without pretending it worked", async () => {
    const { service, socket } = durableService(async () => {
      throw new Error("connection reset");
    });

    const res = await service.deleteMandali("m_prod", "acct_owner", "prod-group");

    expect(res).toMatchObject({ success: false, code: "FAILED" });
    expect(socket.sent).toEqual([]);
  });

  it("treats a Mandali the database no longer has as not found", async () => {
    const { service } = durableService(async () => {
      throw new Error('PostgREST 400: {"message":"MANDALI_NOT_FOUND: m_prod"}');
    });

    const res = await service.deleteMandali("m_prod", "acct_owner", "prod-group");

    expect(res).toMatchObject({ success: false, code: "NOT_FOUND" });
  });
});
