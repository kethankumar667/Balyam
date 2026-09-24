import { describe, it, expect, vi } from "vitest";
import { leaveMandaliFlow } from "../mandaliLeaveFlow";

/**
 * Leaving a Mandali. An ordinary member just leaves. The host first hands the
 * group to someone, and only if that worked do they leave — because a failed
 * hand-over must never end with the host gone and nobody in charge.
 */

type Result = { success: boolean; error?: string };

function deps(over: { transfer?: Result; leave?: Result } = {}) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      transferOwnership: vi.fn(async (id: string, target: string): Promise<Result> => {
        calls.push(`transfer:${id}:${target}`);
        return over.transfer ?? { success: true };
      }),
      leaveMandali: vi.fn(async (id: string): Promise<Result> => {
        calls.push(`leave:${id}`);
        return over.leave ?? { success: true };
      }),
    },
  };
}

describe("leaveMandaliFlow", () => {
  it("an ordinary member just leaves, and nothing is handed over", async () => {
    const { deps: d, calls } = deps();

    const res = await leaveMandaliFlow(d, "man1");

    expect(res).toEqual({ success: true });
    expect(calls).toEqual(["leave:man1"]);
  });

  it("the host hands the group over FIRST, then leaves", async () => {
    const { deps: d, calls } = deps();

    const res = await leaveMandaliFlow(d, "man1", "p_heir");

    expect(res).toEqual({ success: true });
    expect(calls).toEqual(["transfer:man1:p_heir", "leave:man1"]);
  });

  it("does not leave if the hand-over failed, so the group is never left without a host", async () => {
    const { deps: d, calls } = deps({ transfer: { success: false, error: "new owner must be an active member" } });

    const res = await leaveMandaliFlow(d, "man1", "p_heir");

    expect(res).toEqual({ success: false, error: "new owner must be an active member" });
    expect(calls).toEqual(["transfer:man1:p_heir"]);
  });

  it("gives a plain reason when the hand-over fails without one", async () => {
    const { deps: d } = deps({ transfer: { success: false } });

    const res = await leaveMandaliFlow(d, "man1", "p_heir");

    expect(res).toEqual({ success: false, error: "Could not hand the Mandali over. You are still the host." });
  });

  it("says so, clearly, when the hand-over worked but leaving did not", async () => {
    const { deps: d, calls } = deps({ leave: { success: false, error: "network down" } });

    const res = await leaveMandaliFlow(d, "man1", "p_heir");

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no longer the host/i);
    expect(res.error).toMatch(/network down/);
    expect(res.error).toMatch(/try leaving again/i);
    expect(calls).toEqual(["transfer:man1:p_heir", "leave:man1"]);
  });

  it("passes the server's own reason through when an ordinary member cannot leave", async () => {
    const { deps: d } = deps({ leave: { success: false, error: "You are not an active member of this Mandali." } });

    const res = await leaveMandaliFlow(d, "man1");

    expect(res).toEqual({ success: false, error: "You are not an active member of this Mandali." });
  });

  it("does not treat an empty new-host id as a choice", async () => {
    const { deps: d, calls } = deps();

    await leaveMandaliFlow(d, "man1", "");

    expect(calls).toEqual(["leave:man1"]);
  });
});
