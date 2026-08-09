import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { RoomManager } from "./rooms/RoomManager.js";
import { logger } from "./lib/logger.js";
import { globalRateLimiter } from "./lib/rateLimiter.js";

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const startTime = Date.now();

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Telemetry & Health endpoint
app.get("/health", (_req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
  const activeRooms = roomManager.getRoomCount();
  const socketCount = io.engine.clientsCount;

  res.json({
    status: "healthy",
    uptimeSec,
    activeRooms,
    socketCount,
    memory: {
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
    },
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
  /**
   * Notice dead connections sooner than the defaults allow.
   *
   * socket.io defaults to pingInterval 25s + pingTimeout 20s, so a client
   * whose network vanished could go up to ~45 seconds before the server
   * marked it away — and the client stayed equally convinced it was still
   * connected. On a phone switching from wifi to mobile data that is most of
   * the time the player spends staring at a frozen board.
   *
   * 10s + 10s halves the worst case. The cost is a heartbeat every 10s per
   * socket, which is a few bytes.
   */
  pingInterval: 10_000,
  pingTimeout: 10_000,
});

const roomManager = new RoomManager(io);

io.on("connection", (socket) => {
  logger.info({ message: "Socket client connected", socketId: socket.id, module: "SOCKET" });
  registerSocketHandlers(io, socket, roomManager);

  socket.on("disconnect", () => {
    logger.info({ message: "Socket client disconnected", socketId: socket.id, module: "SOCKET" });
    globalRateLimiter.removeSocket(socket.id);
    roomManager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  logger.info({
    message: `Server listening on http://0.0.0.0:${PORT} (Origin: ${CLIENT_ORIGIN})`,
    module: "SERVER",
  });
});

function shutdown(signal: string): void {
  logger.warn({ message: `Received ${signal}, starting graceful shutdown...`, module: "SERVER" });
  globalRateLimiter.destroy();
  io.close();
  server.close(() => {
    logger.info({ message: "HTTP and Socket servers closed cleanly.", module: "SERVER" });
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
