import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomManager } from "../../rooms/RoomManager.js";
import { healthMonitor } from "../HealthMonitor.js";
import { performanceMonitor } from "../PerformanceMonitor.js";
import { telemetryAggregator } from "../TelemetryAggregator.js";
import { metricsRegistry } from "../MetricsRegistry.js";

function makeMockIo() {
  const sockets = new Map<string, any>();
  const io: any = {
    sockets: { sockets },
    to: vi.fn(() => ({ emit: vi.fn() })),
    engine: { clientsCount: 1 },
  };

  const registerSocket = (id: string) => {
    const socket: any = {
      id,
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
    };
    sockets.set(id, socket);
    return socket;
  };

  return { io, registerSocket };
}

describe("Operational Observability Integration", () => {
  let roomManager: RoomManager;
  let mockIo: ReturnType<typeof makeMockIo>;

  beforeEach(() => {
    metricsRegistry.reset();
    mockIo = makeMockIo();
    roomManager = new RoomManager(mockIo.io);
  });

  it("exposes complete health evaluation, performance budget analysis, and game telemetry", () => {
    mockIo.registerSocket("sock_1");
    mockIo.registerSocket("sock_2");

    // 1. Create Room
    const { code } = roomManager.createRoom("sock_1", "HostAlice", "ludo");
    expect(code).toBeDefined();

    // 2. Join Room
    const joinRes = roomManager.joinRoom("sock_2", "Bob", code);
    expect(joinRes.ok).toBe(true);

    // 3. Start Match
    roomManager.setReady("sock_1", true);
    roomManager.setReady("sock_2", true);
    roomManager.startGame("sock_1");

    // 4. Test GET /api/operational/health response payload
    const health = healthMonitor.evaluate(roomManager);
    expect(health.status).toBe("HEALTHY");
    expect(health.checks.length).toBeGreaterThan(0);

    // 5. Test GET /api/operational/performance response payload
    const perf = performanceMonitor.getReport();
    expect(perf.operations["room_create"]?.snapshot.count).toBeGreaterThan(0);
    expect(perf.operations["room_join"]?.snapshot.count).toBeGreaterThan(0);

    // 6. Test GET /api/operational/metrics response payload
    const metrics = telemetryAggregator.getSnapshot(roomManager);
    expect(metrics.rooms.active).toBe(1);
    expect(metrics.rooms.createdTotal).toBe(1);

    // 7. Test GET /api/operational/games response payload
    const games = telemetryAggregator.getGamesTelemetry();
    const ludo = games.find((g) => g.game === "ludo");
    expect(ludo?.matchesStarted).toBe(1);
  });
});
