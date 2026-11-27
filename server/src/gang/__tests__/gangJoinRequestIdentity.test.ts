import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { GangRepository } from "../GangRepository.js";
import { createGangRouter } from "../GangController.js";

/**
 * An admin deciding a join request has to see WHO is asking.
 *
 * The request row used to hold only an identity id, so the "Join Requests" list was a column of raw ids, and an
 * approved person then joined as the placeholder "Member". These tests pin the three places that fixed it: the
 * repository carries the name and avatar through, the HTTP door vets the name before storing it, and the
 * migration stores and reuses them.
 */

type Call = { fn: string; args: Record<string, unknown> };

function repositoryOver(answers: { rpc?: (fn: string) => unknown; select?: (table: string) => unknown[] }) {
  const rpcCalls: Call[] = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return answers.rpc ? answers.rpc(fn) : null;
    },
    select: async (table: string) => (answers.select ? answers.select(table) : []),
  };
  return { repository: new GangRepository(client as never), rpcCalls };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: "jr_1", mandali_id: "g1", requester_identity_id: "a82d6ab1-d078-4ac7-9aca-f08fb9a0c111",
  invitation_id: null, status: "PENDING", reviewer_identity_id: null,
  created_at: "2026-10-13T10:00:00Z", decided_at: null, ...over,
});

describe("the pending list the admin reads", () => {
  it("carries each applicant's name and avatar", async () => {
    const { repository } = repositoryOver({
      select: () => [row({ requester_display_name: "Asha K", requester_avatar: "avatar_3" })],
    });

    const [request] = await repository.getJoinRequestsDurable("g1");

    expect(request).toMatchObject({ gangId: "g1", requesterDisplayName: "Asha K", requesterAvatar: "avatar_3" });
  });

  it("says null, not undefined, for a request made before names were stored", async () => {
    const { repository } = repositoryOver({ select: () => [row()] });

    const [request] = await repository.getJoinRequestsDurable("g1");

    expect(request.requesterDisplayName).toBeNull();
    expect(request.requesterAvatar).toBeNull();
  });
});

describe("applying to a Gang that asks for approval", () => {
  it("hands the name and avatar to the database and returns them on the pending request", async () => {
    const { repository, rpcCalls } = repositoryOver({
      rpc: () => ({ autoApproved: false, request: row({ requester_display_name: "Asha K", requester_avatar: "avatar_3" }) }),
    });

    const result = await repository.createJoinRequestDurable({
      requestId: "jr_1", gangId: "g1", requesterIdentityId: "id-1",
      requesterDisplayName: "Asha K", requesterAvatar: "avatar_3",
    });

    expect(rpcCalls[0].fn).toBe("create_join_request");
    expect(rpcCalls[0].args).toMatchObject({ p_requester_display_name: "Asha K", p_requester_avatar: "avatar_3" });
    expect(result.request).toMatchObject({ requesterDisplayName: "Asha K", requesterAvatar: "avatar_3" });
  });
});

describe("the name a client sends when it applies", () => {
  let server: Server;
  let baseUrl: string;
  const applyToGang = vi.fn(async () => ({ success: true, pending: true }));

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { player: unknown }).player = { playerId: "p_applicant", kind: "member" };
      next();
    });
    app.use("/api/gang", createGangRouter({ applyToGang } as never));
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });
  beforeEach(() => applyToGang.mockClear());

  const apply = (body: unknown) =>
    fetch(`${baseUrl}/api/gang/g1/join`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  const nameSent = () => (applyToGang.mock.calls[0] as unknown as string[])[2];

  it("is cleaned before anyone reads it: markup and invisible characters go, length is capped", async () => {
    await apply({ displayName: "  <b>Asha​</b>   K  ", avatar: "avatar_3" });
    expect(nameSent()).toBe("bAsha/b K");

    applyToGang.mockClear();
    await apply({ displayName: "x".repeat(200), avatar: "avatar_3" });
    expect(nameSent()).toHaveLength(20);
  });

  it("keeps an ordinary name as it was typed", async () => {
    await apply({ displayName: "Asha K", avatar: "avatar_3" });
    expect(nameSent()).toBe("Asha K");
  });

  it("falls back to Member when the name is missing, blank or not text", async () => {
    for (const displayName of [undefined, "", "   ", "​​", 42, { a: 1 }]) {
      applyToGang.mockClear();
      await apply({ displayName, avatar: "avatar_3" });
      expect(nameSent()).toBe("Member");
    }
  });
});

describe("the migration that stores the name", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20261116000000_gang_join_request_identity.sql", import.meta.url),
    "utf8",
  );
  const rollback = readFileSync(
    new URL("../../../../supabase/rollbacks/20261116000000_gang_join_request_identity_rollback.sql", import.meta.url),
    "utf8",
  );

  it("adds both columns as nullable, so old requests stay valid", () => {
    expect(migration).toMatch(/add column if not exists requester_display_name text,/);
    expect(migration).toMatch(/add column if not exists requester_avatar text;/);
    expect(migration).not.toMatch(/requester_display_name text not null/i);
  });

  it("stores them when a request is made and gives the approved person that name", () => {
    expect(migration).toMatch(/\(id, mandali_id, requester_identity_id, invitation_id, requester_display_name, requester_avatar\)/);
    expect(migration).toMatch(/coalesce\(v_request\.requester_display_name, 'Member'\)/);
    expect(migration).toMatch(/coalesce\(v_request\.requester_avatar, 'avatar_1'\)/);
  });

  it("keeps both function signatures and service-role-only grants unchanged", () => {
    expect(migration).toContain("revoke all on function public.create_join_request(text, text, text, text, text, text) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.create_join_request(text, text, text, text, text, text) to service_role;");
    expect(migration).toContain("revoke all on function public.decide_join_request(text, text, boolean) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.decide_join_request(text, text, boolean) to service_role;");
  });

  it("has a rollback that restores the placeholders and drops the columns", () => {
    expect(rollback).toMatch(/'Member', 'avatar_1'\)/);
    expect(rollback).toMatch(/drop column if exists requester_display_name/);
    expect(rollback).toMatch(/drop column if exists requester_avatar/);
  });
});
