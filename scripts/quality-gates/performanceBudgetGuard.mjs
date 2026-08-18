#!/usr/bin/env node
/**
 * BHALYAM Performance Budget Guard
 * Validates that realtime operations adhere strictly to p95 latency budgets.
 *
 * ── What was wrong with this gate ─────────────────────────────────────
 * It could not fail. Every run starts a fresh process with an empty metrics
 * registry, so `snap.count` was always 0, and the line that handled that case
 * read:
 *
 *     const p95 = snap.count > 0 ? snap.p95 : Math.round(budget.targetP95Ms * 0.5);
 *
 * Half the budget. It invented a number guaranteed to pass, printed it as a
 * measurement, and reported "All operations within target SLA performance
 * budgets." Wiring that into CI would have added a step that can only ever be
 * green — worse than not running it, because it looks like coverage.
 *
 * ── What it does now ──────────────────────────────────────────────────
 * It DRIVES the real operations before measuring them: it builds a RoomManager
 * with a stub socket layer, creates and joins rooms, and lets the same
 * `performanceMonitor.recordDuration` calls that run in production fill the
 * histogram. Then it evaluates the budgets against those samples.
 *
 * If an operation still has no samples it is reported as NO_DATA and the gate
 * FAILS. "We did not measure this" is not a pass, and the whole point of the
 * rewrite is that the gate is now capable of saying so.
 */

import { performanceMonitor, PERFORMANCE_BUDGETS } from "../../server/dist/server/src/observability/PerformanceMonitor.js";
import { metricsRegistry } from "../../server/dist/server/src/observability/MetricsRegistry.js";
import { RoomManager } from "../../server/dist/server/src/rooms/RoomManager.js";
import { fileURLToPath } from "node:url";

/** How many rooms to exercise. Enough for a stable p95, quick enough for CI. */
const SAMPLE_ROOMS = Number(process.env.PERF_SAMPLE_ROOMS) || 40;

/**
 * Operations this harness actually drives, and therefore judges.
 *
 * The distinction matters more than it looks. An operation this script never
 * performs has no samples, and there are exactly two honest things to say
 * about it: "not measured here". What the gate must never do — and used to do
 * — is invent a passing number for it.
 *
 * `recovery_duration` needs a real disconnect and reconnect over a socket;
 * `voice_join_duration` needs two browsers and a TURN relay. Neither is
 * reachable from a headless script, so neither is claimed. They are reported
 * as NOT_EXERCISED and are covered, if at all, by the chaos and scale suites.
 */
const EXERCISED_BY_THIS_HARNESS = new Set(["room_create", "room_join"]);

/**
 * A socket.io stand-in.
 *
 * RoomManager only needs to emit and address rooms; nothing here asserts on
 * what it emits. Driving the real RoomManager rather than calling
 * `recordDuration` by hand is the point — the numbers come from the same code
 * path that runs in production, including whatever it does that is slow.
 */
function stubIo() {
  const sockets = new Map();
  return {
    sockets: { sockets },
    to: () => ({ emit: () => {} }),
    emit: () => {},
    engine: { clientsCount: 0 },
    _register(id) {
      sockets.set(id, { id, emit: () => {}, join: () => {}, leave: () => {} });
    },
  };
}

/** Exercise the real operations so the histograms hold real measurements. */
export function collectSamples() {
  const io = stubIo();
  const manager = new RoomManager(io);

  for (let i = 0; i < SAMPLE_ROOMS; i += 1) {
    const hostSocket = `perf_host_${i}`;
    const guestSocket = `perf_guest_${i}`;
    io._register(hostSocket);
    io._register(guestSocket);

    const created = manager.createRoom(hostSocket, `PerfHost${i}`, "ludo");
    manager.joinRoom(guestSocket, `PerfGuest${i}`, created.code);
  }

  return manager;
}

export function runPerformanceBudgetValidation() {
  const opKeys = Object.keys(PERFORMANCE_BUDGETS);
  const results = [];
  let totalViolations = 0;

  for (const op of opKeys) {
    const budget = PERFORMANCE_BUDGETS[op];
    const snap = metricsRegistry.getHistogramSnapshot(`perf.${op}`);

    /*
     * No samples is NO_DATA, never a pass.
     *
     * This is where the gate used to invent `targetP95Ms * 0.5` and call it a
     * measurement. An operation nothing exercised is an operation nobody
     * checked, and the honest report of that is a failure with the name of the
     * operation in it.
     */
    if (snap.count === 0) {
      const claimed = EXERCISED_BY_THIS_HARNESS.has(op);
      // Only a FAILURE when this harness was supposed to have driven it. An
      // operation it cannot reach is unmeasured, and saying so is the honest
      // report — inventing a number for it was the bug.
      if (claimed) totalViolations++;
      results.push({
        operation: op,
        p95Ms: null,
        samples: 0,
        targetP95Ms: budget.targetP95Ms,
        criticalP95Ms: budget.criticalP95Ms,
        status: claimed ? "NO_DATA" : "NOT_EXERCISED",
      });
      continue;
    }

    const p95 = snap.p95;
    const breached = p95 > budget.targetP95Ms;
    const critical = p95 > budget.criticalP95Ms;

    if (breached) totalViolations++;

    results.push({
      operation: op,
      p95Ms: p95,
      samples: snap.count,
      targetP95Ms: budget.targetP95Ms,
      criticalP95Ms: budget.criticalP95Ms,
      status: critical ? "CRITICAL" : breached ? "WARN" : "PASS",
    });
  }

  const passed = totalViolations === 0;
  return {
    passed,
    totalViolations,
    operations: results,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("🔍 [PerfBudget] Driving real room operations to collect latency samples...");
  collectSamples();
  console.log("🔍 [PerfBudget] Auditing measured performance against SLA budgets...");
  const result = runPerformanceBudgetValidation();

  console.log(`📊 [PerfBudget] Evaluated ${result.operations.length} critical operations.`);
  for (const op of result.operations) {
    const measured =
      op.p95Ms === null
        ? op.status === "NOT_EXERCISED"
          ? "not measured by this harness — no claim made"
          : "no samples"
        : `p95 = ${op.p95Ms}ms over ${op.samples} sample(s)`;
    console.log(`  - ${op.operation}: ${measured} (Target: <=${op.targetP95Ms}ms, Critical: <=${op.criticalP95Ms}ms) [${op.status}]`);
  }

  if (!result.passed) {
    console.error(`\n❌ [PerfBudget] FAILED: ${result.totalViolations} performance budget violation(s) detected!\n`);
    process.exit(1);
  } else {
    const measuredOps = result.operations.filter((o) => o.p95Ms !== null).length;
    const unmeasuredOps = result.operations.length - measuredOps;
    // Says what was measured, not "all operations". The gate covers what it
    // drove; claiming the rest is how the previous version came to report a
    // fabricated pass.
    console.log(
      `✅ [PerfBudget] PASSED: ${measuredOps} measured operation(s) within budget` +
        (unmeasuredOps > 0
          ? `; ${unmeasuredOps} NOT exercised by this harness and therefore not covered by this gate.`
          : "."),
    );
    process.exit(0);
  }
}
