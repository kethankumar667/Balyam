import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startMandaliRetentionJob, MANDALI_CHAT_RETENTION_DAYS } from "../MandaliRetentionJob.js";
import type { MandaliRepository } from "../MandaliRepository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const fakeRepository = (prune: () => Promise<number>) => {
  const pruneExpiredMessagesDurable = vi.fn(prune);
  return { repo: { pruneExpiredMessagesDurable } as unknown as MandaliRepository, pruneExpiredMessagesDurable };
};

describe("Mandali chat retention job", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps chat for one year", () => {
    expect(MANDALI_CHAT_RETENTION_DAYS).toBe(365);
  });

  it("does nothing until the initial delay has passed, then sweeps with the one-year window", async () => {
    const { repo, pruneExpiredMessagesDurable } = fakeRepository(async () => 0);
    const stop = startMandaliRetentionJob(repo, { initialDelayMs: 1000 });

    await vi.advanceTimersByTimeAsync(999);
    expect(pruneExpiredMessagesDurable).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(pruneExpiredMessagesDurable).toHaveBeenCalledTimes(1);
    expect(pruneExpiredMessagesDurable).toHaveBeenCalledWith(365);
    stop();
  });

  it("then sweeps once a day", async () => {
    const { repo, pruneExpiredMessagesDurable } = fakeRepository(async () => 0);
    const stop = startMandaliRetentionJob(repo, { initialDelayMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(DAY_MS);
    await vi.advanceTimersByTimeAsync(DAY_MS);

    // The first sweep, plus one per elapsed day.
    expect(pruneExpiredMessagesDurable.mock.calls.length).toBeGreaterThanOrEqual(3);
    stop();
  });

  it("survives a failed sweep and tries again at the next run", async () => {
    let calls = 0;
    const { repo, pruneExpiredMessagesDurable } = fakeRepository(async () => {
      calls += 1;
      if (calls === 1) throw new Error("database unreachable");
      return 3;
    });
    const stop = startMandaliRetentionJob(repo, { initialDelayMs: 100, intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(1000);

    expect(pruneExpiredMessagesDurable).toHaveBeenCalledTimes(2);
    stop();
  });

  it("never runs two sweeps at once", async () => {
    let release: () => void = () => undefined;
    const { repo, pruneExpiredMessagesDurable } = fakeRepository(
      () => new Promise<number>((resolve) => { release = () => resolve(0); })
    );
    const stop = startMandaliRetentionJob(repo, { initialDelayMs: 100, intervalMs: 200 });

    await vi.advanceTimersByTimeAsync(100); // first sweep starts and hangs
    await vi.advanceTimersByTimeAsync(600); // several intervals fire while it is still running
    expect(pruneExpiredMessagesDurable).toHaveBeenCalledTimes(1);

    release();
    stop();
  });

  it("stops when asked", async () => {
    const { repo, pruneExpiredMessagesDurable } = fakeRepository(async () => 0);
    const stop = startMandaliRetentionJob(repo, { initialDelayMs: 100, intervalMs: 200 });
    stop();

    await vi.advanceTimersByTimeAsync(1000);
    expect(pruneExpiredMessagesDurable).not.toHaveBeenCalled();
  });
});
