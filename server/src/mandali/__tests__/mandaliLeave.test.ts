import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { createMandaliRouter } from "../MandaliController.js";

/**
 * Leaving a Mandali.
 *
 * Any member may leave whenever they like. The host may not simply walk out —
 * the group would be left with nobody in charge — so they must hand the role to
 * someone first, and only then can they leave like anyone else.
 *
 * Leaving also has to actually END the person's access: someone who has left
 * must stop receiving the live chat, on every tab and device they have open,
 * not only the one they clicked "leave" on.
 */

const OWNER = "p_owner";
const MEMBER = "p_member";
const FRIEND = "p_friend";
const OUTSIDER = "p_outsider";
const HOST_MUST_HAND_OVER = "You are the host. Make someone else the host before you leave.";

interface Sent {
  rooms: string[];
  event: string;
  payload: unknown;
}

function fakeIo() {
  const sent: Sent[] = [];
  const evicted: string[] = [];
  const io = {
    to: (target: string | string[]) => ({
      emit: (event: string, payload: unknown) =>
        sent.push({ rooms: Array.isArray(target) ? target : [target], event, payload }),
    }),
    in: (room: string) => ({ socketsLeave: (leaving: string) => evicted.push(`${room}->${leaving}`) }),
  };
  return { io: io as never, sent, evicted };
}

async function buildGroup() {
  const repository = new MandaliRepository();
  const socket = fakeIo();
  const service = new MandaliService(repository, undefined as never, socket.io);
  const created = await service.createMandali(OWNER, "Owner", "avatar_1", {
    name: "Leave Test", handle: "leave-test", description: "d", visibility: "PUBLIC",
  });
  if (!created.success || !created.mandali) throw new Error("test setup: createMandali failed");
  const mandaliId = created.mandali.id;
  for (const [id, name] of [[MEMBER, "Member"], [FRIEND, "Friend"]] as const) {
    expect((await service.applyToMandali(mandaliId, id, name, "avatar_2")).success).toBe(true);
  }
  socket.sent.length = 0;
  return { repository, service, socket, mandaliId };
}

describe("a member leaves", () => {
  it("stops being an active member, and the group carries on without them", async () => {
    const { service, mandaliId } = await buildGroup();

    const res = await service.leaveMandali(mandaliId, MEMBER);

    expect(res).toEqual({ success: true });
    expect(await service.isActiveMember(mandaliId, MEMBER)).toBe(false);
    expect(await service.isActiveMember(mandaliId, FRIEND)).toBe(true);
    expect(await service.isActiveMember(mandaliId, OWNER)).toBe(true);
    expect((await service.getPlayerMandalis(MEMBER)).map((m) => m.id)).not.toContain(mandaliId);
  });

  it("tells the group so their screens refresh", async () => {
    const { service, socket, mandaliId } = await buildGroup();

    await service.leaveMandali(mandaliId, MEMBER);

    expect(socket.sent).toContainEqual({
      rooms: [`mandali:${mandaliId}`],
      event: "mandali:changed",
      payload: { mandaliId, reason: "member-left" },
    });
  });

  it("is cut off from the live chat on EVERY tab and device, not just the one they clicked on", async () => {
    const { service, socket, mandaliId } = await buildGroup();

    await service.leaveMandali(mandaliId, MEMBER);

    // Every socket this person has authenticated sits in their personal room.
    expect(socket.evicted).toEqual([`user:${MEMBER}->mandali:${mandaliId}`]);
  });

  it("cannot be used to remove somebody else", async () => {
    const { service, mandaliId } = await buildGroup();

    await service.leaveMandali(mandaliId, MEMBER);

    expect(await service.isActiveMember(mandaliId, FRIEND)).toBe(true);
  });

  it("is refused for someone who is not in the Mandali, or has already left", async () => {
    const { service, socket, mandaliId } = await buildGroup();
    await service.leaveMandali(mandaliId, MEMBER);
    socket.sent.length = 0;
    socket.evicted.length = 0;

    const again = await service.leaveMandali(mandaliId, MEMBER);
    const stranger = await service.leaveMandali(mandaliId, OUTSIDER);

    expect(again).toMatchObject({ success: false, error: expect.stringMatching(/not an active member/i) });
    expect(stranger).toMatchObject({ success: false, error: expect.stringMatching(/not an active member/i) });
    expect(socket.sent).toEqual([]);
    expect(socket.evicted).toEqual([]);
  });
});

describe("when the socket layer misbehaves", () => {
  it("still reports a completed leave as completed", async () => {
    const service = new MandaliService(new MandaliRepository(), undefined as never, {
      to: () => ({ emit: () => undefined }),
      in: () => {
        throw new Error("adapter down");
      },
    } as never);
    const created = await service.createMandali(OWNER, "Owner", "avatar_1", {
      name: "Flaky", handle: "flaky-sockets", description: "d", visibility: "PUBLIC",
    });
    const mandaliId = created.mandali!.id;
    await service.applyToMandali(mandaliId, MEMBER, "Member", "avatar_2");

    const res = await service.leaveMandali(mandaliId, MEMBER);

    expect(res).toEqual({ success: true });
    expect(await service.isActiveMember(mandaliId, MEMBER)).toBe(false);
  });
});

describe("the host tries to leave", () => {
  it("is told to hand over first, and nothing changes", async () => {
    const { service, socket, mandaliId } = await buildGroup();

    const res = await service.leaveMandali(mandaliId, OWNER);

    expect(res).toEqual({ success: false, error: HOST_MUST_HAND_OVER });
    expect(await service.isActiveMember(mandaliId, OWNER)).toBe(true);
    expect((await service.getMandaliById(mandaliId))?.ownerId).toBe(OWNER);
    expect(socket.sent).toEqual([]);
    expect(socket.evicted).toEqual([]);
  });
});

describe("leaving over HTTP", () => {
  let server: Server;
  let baseUrl: string;
  let viewer: { playerId: string; kind: "member" | "guest" } | null;
  let ctx: Awaited<ReturnType<typeof buildGroup>>;

  beforeEach(async () => {
    ctx = await buildGroup();
    viewer = { playerId: MEMBER, kind: "member" };
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

  const leave = (body: unknown = {}) =>
    fetch(`${baseUrl}/api/mandali/${ctx.mandaliId}/leave`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("lets a signed-in member leave", async () => {
    const res = await leave();

    expect(res.status).toBe(200);
    expect(await ctx.service.isActiveMember(ctx.mandaliId, MEMBER)).toBe(false);
  });

  it("answers 401 to nobody", async () => {
    viewer = null;

    expect((await leave()).status).toBe(401);
    expect(await ctx.service.isActiveMember(ctx.mandaliId, MEMBER)).toBe(true);
  });

  it("answers the host with 400 and the reason, and leaves them in charge", async () => {
    viewer = { playerId: OWNER, kind: "member" };

    const res = await leave();

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: HOST_MUST_HAND_OVER });
    expect(await ctx.service.isActiveMember(ctx.mandaliId, OWNER)).toBe(true);
  });

  it("only ever removes the caller, whoever the body names", async () => {
    const res = await leave({ playerId: FRIEND, targetId: FRIEND, memberId: FRIEND });

    expect(res.status).toBe(200);
    expect(await ctx.service.isActiveMember(ctx.mandaliId, MEMBER)).toBe(false);
    expect(await ctx.service.isActiveMember(ctx.mandaliId, FRIEND)).toBe(true);
  });
});

describe("leaving when the Mandali lives in the database", () => {
  const ROW = {
    id: "m_prod", handle: "prod-group", name: "Prod Group", emblem: "pawn_amber", description: "", rules: "",
    banner_gradient: null, language: "English", region: "All India", tags: [], visibility: "PUBLIC",
    member_count: 3, max_members: 50, level: 1, xp: 0, owner_identity_id: "acct_owner",
    edit_permission: "ADMIN", send_permission: "ALL", join_approval: false,
    created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
  };

  function durable(rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>) {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const client = {
      select: async () => [ROW],
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        return rpc(fn, args);
      },
    };
    const socket = fakeIo();
    return { service: new MandaliService(new MandaliRepository(client as never), undefined as never, socket.io), calls, socket };
  }

  it("asks the database to remove the caller, as both actor and target", async () => {
    const { service, calls } = durable(async () => ({}));

    const res = await service.leaveMandali("m_prod", "acct_b");

    expect(res).toEqual({ success: true });
    expect(calls).toEqual([
      { fn: "transition_membership", args: { p_mandali_id: "m_prod", p_actor_identity_id: "acct_b", p_target_identity_id: "acct_b", p_action: "LEAVE" } },
    ]);
  });

  it("cuts the leaver off from the live chat and tells the group", async () => {
    const { service, socket } = durable(async () => ({}));

    await service.leaveMandali("m_prod", "acct_b");

    expect(socket.evicted).toEqual(["user:acct_b->mandali:m_prod"]);
    expect(socket.sent.map((s) => s.event)).toContain("mandali:changed");
  });

  it("gives the host the plain instruction when the database refuses", async () => {
    const { service, socket } = durable(async () => {
      throw new Error('PostgREST 400: {"message":"OWNER_MUST_TRANSFER: transfer ownership before leaving"}');
    });

    const res = await service.leaveMandali("m_prod", "acct_owner");

    expect(res).toEqual({ success: false, error: HOST_MUST_HAND_OVER });
    expect(socket.evicted).toEqual([]);
    expect(socket.sent).toEqual([]);
  });

  it("does not cut anybody off when the database fails for another reason", async () => {
    const { service, socket } = durable(async () => {
      throw new Error("connection reset");
    });

    const res = await service.leaveMandali("m_prod", "acct_b");

    expect(res.success).toBe(false);
    expect(socket.evicted).toEqual([]);
  });

  it("also cuts off a member who is removed or banned, on every device", async () => {
    const { service, socket } = durable(async () => ({}));

    await service.kickMember("m_prod", "acct_owner", "Owner", "acct_b", "spam");
    await service.banMember("m_prod", "acct_owner", "acct_c");

    expect(socket.evicted).toEqual(["user:acct_b->mandali:m_prod", "user:acct_c->mandali:m_prod"]);
  });
});
