import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { reportService } from "../ReportService.js";
import { pruneExpiredReports, startReportRetentionJob } from "../ReportRetention.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import type { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { REPORT_RETENTION_DAYS } from "../limits.js";
import { freshSocialState } from "./socialTestKit.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1);

describe("WP1 — report retention", () => {
  let repo: InMemoryProgressionRepository;

  beforeEach(() => {
    repo = freshSocialState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps reports for a year, so the window is 365 days", () => {
    expect(REPORT_RETENTION_DAYS).toBe(365);
  });

  it("removes reports older than the window and keeps the rest", async () => {
    reportService.submit("reporter_a", "target_x", "SPAM", T0);
    reportService.submit("reporter_a", "target_x", "CHEATING", T0 + 300 * DAY_MS);
    await progressionSync.drain();

    const removed = await pruneExpiredReports(T0 + 366 * DAY_MS);

    expect(removed).toBe(1);
    const left = await repo.listReportsBy("reporter_a");
    expect(left.map((r) => r.reason)).toEqual(["CHEATING"]);
  });

  it("keeps a report that is exactly at the cutoff", async () => {
    reportService.submit("reporter_b", "target_x", "SPAM", T0);
    await progressionSync.drain();

    expect(await pruneExpiredReports(T0 + REPORT_RETENTION_DAYS * DAY_MS)).toBe(0);
    expect(await repo.listReportsBy("reporter_b")).toHaveLength(1);
  });

  it("removes nothing when nothing is old enough", async () => {
    reportService.submit("reporter_c", "target_x", "SPAM", T0);
    await progressionSync.drain();

    expect(await pruneExpiredReports(T0 + DAY_MS)).toBe(0);
  });

  describe("the daily job", () => {
    it("sweeps after its initial delay and on every interval, until stopped", async () => {
      vi.useFakeTimers();
      const prune = vi.spyOn(repo, "pruneReportsBefore");
      const stop = startReportRetentionJob({ initialDelayMs: 100, intervalMs: 1000, now: () => T0 });

      await vi.advanceTimersByTimeAsync(150);
      expect(prune).toHaveBeenCalledTimes(1);
      expect(prune).toHaveBeenLastCalledWith(T0 - REPORT_RETENTION_DAYS * DAY_MS);

      await vi.advanceTimersByTimeAsync(1000);
      expect(prune.mock.calls.length).toBeGreaterThanOrEqual(2);

      stop();
      const callsAtStop = prune.mock.calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(prune).toHaveBeenCalledTimes(callsAtStop);
    });

    it("survives a failed sweep and tries again next time", async () => {
      vi.useFakeTimers();
      const prune = vi
        .spyOn(repo, "pruneReportsBefore")
        .mockRejectedValueOnce(new Error("database unavailable"))
        .mockResolvedValue(0);
      const stop = startReportRetentionJob({ initialDelayMs: 50, intervalMs: 500, now: () => T0 });

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(600);

      expect(prune.mock.calls.length).toBeGreaterThanOrEqual(2);
      stop();
    });
  });
});
