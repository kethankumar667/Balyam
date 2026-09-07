import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminSystemHealthPage from "../system-health";

/**
 * System Health, wired to real operational telemetry.
 *
 * This page used to render fixed constants (`MEMORY_CHART_DATA`,
 * `SUBSYSTEMS`, `API_ENDPOINTS`) while the server's own observability layer
 * — already built, already exposed — had no consumer. These tests stub
 * `fetch` by URL, the same way dashboardDbIntegration.test.tsx does, and
 * assert the page renders what the SERVER said rather than anything
 * hardcoded.
 *
 * No `@testing-library/jest-dom` matchers: they are not registered in this
 * suite's Vitest setup (see mockDataDisclosure.test.tsx's own note).
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

const HEALTH_URL = "/api/operational/health";
const METRICS_URL = "/api/operational/metrics";

function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function healthReport(overrides: Record<string, unknown> = {}) {
  return {
    status: "HEALTHY",
    timestamp: Date.now(),
    uptimeSec: 3720,
    checks: [
      {
        name: "memory_growth",
        status: "HEALTHY",
        message: "Heap stable at 41% of limit",
        metrics: { heapUsedMb: 142, rssMb: 205 },
      },
      {
        name: "stuck_rooms",
        status: "WARNING",
        message: "2 rooms have been IN_PROGRESS beyond the expected window",
        metrics: { stuckRooms: 2 },
      },
    ],
    activeAlerts: [],
    ...overrides,
  };
}

function metricsSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: Date.now(),
    uptimeSec: 3720,
    rooms: { active: 7, byLifecycle: { IN_PROGRESS: 4, LOBBY: 3 } },
    realtime: { connectedSockets: 142, reconnectSuccessRate: 0.98 },
    memory: {
      current: { timestamp: Date.now(), heapUsedMb: 142, heapTotalMb: 256, heapSizeLimitMb: 512, rssMb: 205 },
      deltaMb: 4,
      growthRateMbPerMin: 0.12,
      isLeakingSuspected: false,
      heapUsageRatio: 0.277,
      growthTrend: { trend: "STABLE" },
      samplesCount: 2,
      history: [
        { timestamp: Date.now() - 60_000, heapUsedMb: 138, heapTotalMb: 256, heapSizeLimitMb: 512, rssMb: 198 },
        { timestamp: Date.now(), heapUsedMb: 142, heapTotalMb: 256, heapSizeLimitMb: 512, rssMb: 205 },
      ],
    },
    performance: {
      totalViolations: 1,
      operations: {
        room_create: {
          snapshot: { count: 34, min: 3, max: 61, avg: 12, p50: 9, p95: 28, p99: 55 },
          budget: { targetP95Ms: 25, criticalP95Ms: 60 },
          budgetBreached: true,
          status: "WARN",
        },
        move_processing: {
          snapshot: { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 },
          budget: { targetP95Ms: 20, criticalP95Ms: 50 },
          budgetBreached: false,
          status: "PASS",
        },
      },
    },
    ...overrides,
  };
}

function stubFetch(handlers: {
  health?: () => unknown;
  metrics?: () => unknown;
} = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes(HEALTH_URL)) return handlers.health?.() ?? jsonResponse(200, healthReport());
      if (url.includes(METRICS_URL)) return handlers.metrics?.() ?? jsonResponse(200, metricsSnapshot());
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => "test-ops-key",
    setItem: () => undefined,
    removeItem: () => undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin System Health — real telemetry", () => {
  it("renders the server's own health verdict and check count, not a hardcoded 100%", async () => {
    stubFetch();
    renderRoute(<AdminSystemHealthPage />);

    await waitFor(() => expect(screen.getByText("HEALTHY")).toBeDefined());
    // 1 of the 2 stubbed checks is HEALTHY — a real derived count.
    expect(screen.getByText(/1 of 2 checks passing/i)).toBeDefined();
  });

  it("renders real memory figures from the server sample, including the heap limit ratio", async () => {
    stubFetch();
    renderRoute(<AdminSystemHealthPage />);

    await waitFor(() => expect(screen.getByText("142 MB")).toBeDefined());
    expect(screen.getByText("205 MB")).toBeDefined();
    expect(screen.getByText(/28% of 512 MB limit/i)).toBeDefined();
    expect(screen.getByText(/trend: stable/i)).toBeDefined();
  });

  it("renders the server's real subsystem checks — including a non-healthy one — instead of five always-green cards", async () => {
    stubFetch();
    renderRoute(<AdminSystemHealthPage />);

    await waitFor(() => expect(screen.getByText("Memory Growth")).toBeDefined());
    expect(screen.getByText("Stuck Rooms")).toBeDefined();
    expect(
      screen.getByText(/2 rooms have been IN_PROGRESS beyond the expected window/i),
    ).toBeDefined();
  });

  it("renders measured latency percentiles and shows an em dash where no samples exist", async () => {
    stubFetch();
    renderRoute(<AdminSystemHealthPage />);

    await waitFor(() => expect(screen.getByText("Room Create")).toBeDefined());
    expect(screen.getByText("28ms")).toBeDefined(); // real p95
    expect(screen.getByText(/1 budget violation/i)).toBeDefined();
    // move_processing has count: 0 — never fabricate a latency for it.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("surfaces active alerts returned by the health probe", async () => {
    stubFetch({
      health: () =>
        jsonResponse(200, healthReport({ status: "WARNING", activeAlerts: ["Heap above 80% for 5m"] })),
    });
    renderRoute(<AdminSystemHealthPage />);

    await waitFor(() => expect(screen.getByText(/1 active alert/i)).toBeDefined());
    expect(screen.getByText(/heap above 80% for 5m/i)).toBeDefined();
  });

  it("degrades honestly when telemetry is unreachable — no invented numbers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    renderRoute(<AdminSystemHealthPage />);

    await waitFor(() => expect(screen.getByText(/telemetry unavailable/i)).toBeDefined());
    expect(screen.getByText("UNAVAILABLE")).toBeDefined();
    expect(screen.getAllByText(/metrics unavailable/i).length).toBeGreaterThan(0);
  });

  it("still renders metrics when only the health probe fails (503 CRITICAL is a real state)", async () => {
    stubFetch({ health: () => jsonResponse(503, { error: "critical" }) });
    renderRoute(<AdminSystemHealthPage />);

    await waitFor(() => expect(screen.getByText("142 MB")).toBeDefined());
    expect(screen.getByText("UNAVAILABLE")).toBeDefined();
  });
});
