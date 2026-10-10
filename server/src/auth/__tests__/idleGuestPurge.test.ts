import { describe, it, expect, afterEach, vi } from "vitest";
import { idleGuestDays, runIdleGuestPurge, type PurgeRpc } from "../idleGuestPurge.js";

describe("idle guest purge job", () => {
  const saved = process.env.IDLE_GUEST_DAYS;

  afterEach(() => {
    if (saved === undefined) delete process.env.IDLE_GUEST_DAYS;
    else process.env.IDLE_GUEST_DAYS = saved;
    vi.restoreAllMocks();
  });

  it("defaults to 45 days and refuses a setting shorter than a week", () => {
    delete process.env.IDLE_GUEST_DAYS;
    expect(idleGuestDays()).toBe(45);
    process.env.IDLE_GUEST_DAYS = "3";
    expect(idleGuestDays()).toBe(45);
    process.env.IDLE_GUEST_DAYS = "banana";
    expect(idleGuestDays()).toBe(45);
    process.env.IDLE_GUEST_DAYS = "90";
    expect(idleGuestDays()).toBe(90);
  });

  it("passes the retention and a bounded batch to the database and returns what it did", async () => {
    const rpc = vi.fn<Parameters<PurgeRpc>, ReturnType<PurgeRpc>>().mockResolvedValue({ purged: 4, skipped: 1 });

    const outcome = await runIdleGuestPurge(rpc, 60);

    expect(rpc).toHaveBeenCalledWith(60, 500);
    expect(outcome).toEqual({ purged: 4, skipped: 1 });
  });

  it("is a quiet no-op when the migration has not been applied yet", async () => {
    const rpc: PurgeRpc = async () => {
      throw new Error("PGRST202 Could not find the function public.purge_idle_guests");
    };

    await expect(runIdleGuestPurge(rpc, 45)).resolves.toBeNull();
  });

  it("survives any other failure without throwing, so one bad night never stops the server", async () => {
    const rpc: PurgeRpc = async () => {
      throw new Error("connection reset");
    };

    await expect(runIdleGuestPurge(rpc, 45)).resolves.toBeNull();
  });
});
