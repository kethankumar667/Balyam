import { describe, expect, it } from "vitest";
import { GangRepository } from "../GangRepository.js";

/**
 * Where the app meets the live database.
 *
 * The feature was renamed from Mandali to Gang in code, but production was already running with the names it was
 * built with: the table `public.mandalis`, functions such as `get_mandali_digests`, parameters like `p_mandali_id`,
 * and JSON the database builds with the key `mandaliId`. None of that can change from here, and none of it is
 * reached by the in-memory repository or by local development, so a slip would only show up for real players.
 * These tests pin every one of those spellings.
 */

type Call = { fn: string; args: Record<string, unknown> };

function repositoryOver(answers: { rpc?: (fn: string) => unknown; select?: (table: string) => unknown[] }) {
  const rpcCalls: Call[] = [];
  const selects: Array<{ table: string; query: string }> = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return answers.rpc ? answers.rpc(fn) : null;
    },
    select: async (table: string, query: string) => {
      selects.push({ table, query });
      return answers.select ? answers.select(table) : [];
    },
  };
  return { repository: new GangRepository(client as never), rpcCalls, selects };
}

describe("the table the database keeps Gangs in", () => {
  it("is still public.mandalis, whichever way a Gang is looked up", async () => {
    const { repository, selects } = repositoryOver({});

    await repository.getByIdDurable("g1");
    await repository.getByHandleDurable("@nellore");
    await repository.getAllDurable();

    expect(selects.map((s) => s.table)).toEqual(["mandalis", "mandalis", "mandalis"]);
  });
});

describe("JSON the database builds with the key mandaliId", () => {
  const digestRow = {
    mandaliId: "g1", handle: "nellore", name: "Nellore Gang", emblem: "pawn_amber", level: "ALL",
    lastReadAt: null, unreadCount: 3, senderCount: 2, topSenders: [], latest: null, invites: [],
  };

  it("reaches the app as gangId on every digest, with nothing else lost", async () => {
    const { repository, rpcCalls } = repositoryOver({ rpc: () => [digestRow] });

    const digests = await repository.getDigestsDurable("acct_1");

    expect(rpcCalls).toEqual([{ fn: "get_mandali_digests", args: { p_identity_id: "acct_1" } }]);
    expect(digests).toHaveLength(1);
    expect(digests[0].gangId).toBe("g1");
    expect(digests[0]).not.toHaveProperty("mandaliId");
    expect(digests[0]).toMatchObject({ handle: "nellore", name: "Nellore Gang", unreadCount: 3, senderCount: 2 });
  });

  it("does not mutate what the database returned", async () => {
    const returned = [{ ...digestRow }];
    const { repository } = repositoryOver({ rpc: () => returned });

    await repository.getDigestsDurable("acct_1");

    expect(returned[0].mandaliId).toBe("g1");
  });

  it("gives an empty list when the database has nothing to say", async () => {
    const { repository } = repositoryOver({ rpc: () => null });

    expect(await repository.getDigestsDurable("acct_1")).toEqual([]);
  });

  it("reaches the app as gangId when an invite link is looked up", async () => {
    const { repository, rpcCalls } = repositoryOver({
      rpc: () => ({ valid: true, invitationId: "i1", mandaliId: "g1", name: "Nellore Gang", emblem: "pawn_amber", description: "Friends" }),
    });

    const resolved = await repository.resolveInviteLinkDurable("raw-token");

    expect(rpcCalls[0].fn).toBe("resolve_invitation");
    expect(Object.keys(rpcCalls[0].args)).toEqual(["p_token_hash"]);
    expect(resolved).toEqual({ valid: true, invitationId: "i1", gangId: "g1", name: "Nellore Gang", emblem: "pawn_amber", description: "Friends" });
    expect(resolved).not.toHaveProperty("mandaliId");
  });

  it("passes an invalid invite link through as invalid", async () => {
    const { repository } = repositoryOver({ rpc: () => ({ valid: false }) });

    expect(await repository.resolveInviteLinkDurable("nope")).toEqual({ valid: false });
  });
});

describe("the function and parameter names the database defines", () => {
  it("are unchanged for reading, notifications and deleting", async () => {
    const { repository, rpcCalls } = repositoryOver({
      rpc: (fn) => (fn === "delete_mandali" ? { name: "Nellore Gang", member_ids: ["a"] } : { previous: "2026-09-01T00:00:00Z", current: "2026-09-02T00:00:00Z" }),
    });

    await repository.markReadDurable("g1", "acct_1");
    await repository.setNotificationLevelDurable("g1", "acct_1", "MUTED");
    await repository.deleteGangDurable("g1", "acct_1");

    expect(rpcCalls).toEqual([
      { fn: "mark_mandali_read", args: { p_mandali_id: "g1", p_identity_id: "acct_1" } },
      { fn: "set_mandali_notification_level", args: { p_mandali_id: "g1", p_identity_id: "acct_1", p_level: "MUTED" } },
      { fn: "delete_mandali", args: { p_mandali_id: "g1", p_actor_identity_id: "acct_1" } },
    ]);
  });
});
