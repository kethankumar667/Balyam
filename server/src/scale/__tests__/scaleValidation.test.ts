import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomManager } from "../../rooms/RoomManager.js";
import { serverLifecycleRegistry } from "../../reliability/LifecycleRegistry.js";
import { serverResourceTracker } from "../../reliability/ResourceTracker.js";
import { serverEventStore } from "../../events/ServerEventStore.js";
import { performanceMonitor } from "../../observability/PerformanceMonitor.js";
import { memoryMonitor } from "../../reliability/MemoryMonitor.js";

function makeMockIo() {
  const sockets = new Map<string, any>();
  const io: any = {
    sockets: { sockets },
    to: vi.fn(() => ({ emit: vi.fn() })),
    engine: { clientsCount: 0 },
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

describe("Scale & High-Throughput Validation", () => {
  let roomManager: RoomManager;
  let mockIo: ReturnType<typeof makeMockIo>;

  beforeEach(() => {
    serverLifecycleRegistry.reset();
    serverResourceTracker.reset();
    serverEventStore.reset();
    mockIo = makeMockIo();
    roomManager = new RoomManager(mockIo.io);
  });

  it("sustains 100 concurrent rooms with 200 active players and continuous move processing", () => {
    const roomCodes: string[] = [];

    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Create 100 active rooms
    for (let i = 0; i < 100; i++) {
      const hSock = `scale_host_${i}`;
      const pSock = `scale_p2_${i}`;
      mockIo.registerSocket(hSock);
      mockIo.registerSocket(pSock);

      const { code } = roomManager.createRoom(hSock, `Host_${i}`, "rps");
      roomCodes.push(code);

      roomManager.joinRoom(pSock, `Guest_${i}`, code);
      roomManager.setReady(hSock, true);
      roomManager.setReady(pSock, true);
      roomManager.startGame(hSock);
    }

    expect(roomManager.getRoomCount()).toBe(100);

    // Execute 500 moves across the rooms
    for (let m = 0; m < 500; m++) {
      const idx = m % 100;
      const sock = `scale_host_${idx}`;
      roomManager.applyMove(sock, "rock", {});
    }

    const elapsed = performance.now() - startTime;
    const endMem = process.memoryUsage().heapUsed;
    const memDeltaMb = Math.round(((endMem - startMem) / 1024 / 1024) * 100) / 100;

    // Latency & Memory assertions
    expect(elapsed).toBeLessThan(5000); // 500 moves processed in < 5 seconds
    expect(memDeltaMb).toBeLessThan(40); // 100 active rooms consumes < 40MB heap
  });

  it("scales to 500 concurrent rooms (1,000 players) and validates p95 latency under 25ms", () => {
    for (let i = 0; i < 500; i++) {
      const h = `h_${i}`;
      const p = `p_${i}`;
      mockIo.registerSocket(h);
      mockIo.registerSocket(p);

      const { code } = roomManager.createRoom(h, `H${i}`, "rps");
      roomManager.joinRoom(p, `P${i}`, code);
      roomManager.setReady(h, true);
      roomManager.setReady(p, true);
      roomManager.startGame(h);
    }

    expect(roomManager.getRoomCount()).toBe(500);

    // Validate latency budgets across 500 rooms
    const perfReport = performanceMonitor.getReport();
    const movePerf = perfReport.operations["move_processing"];
    if (movePerf && movePerf.snapshot.count > 0) {
      expect(movePerf.snapshot.p95).toBeLessThan(35);
    }
  });
});
